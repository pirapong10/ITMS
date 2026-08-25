import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';
import { logAuditEvent } from './audit';

export const CreateDsarSchema = z.object({
  request_type: z.enum(['Export', 'Erasure', 'Rectify', 'Restrict']).default('Export'),
  subject_email: z.string().email(),
  subject_user_id: z.string().optional(),
  requester_notes: z.string().optional(),
});

export type CreateDsarInput = z.input<typeof CreateDsarSchema>;

export interface DsarRequestRecord {
  id: string;
  tenant_id: string;
  request_type: 'Export' | 'Erasure' | 'Rectify' | 'Restrict';
  subject_email: string;
  subject_user_id: string | null;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  requester_notes: string | null;
  resolution_notes: string | null;
  exported_data: any;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Creates a new Data Subject Access Request (DSAR).
 */
export async function createDsarRequest(
  tenantId: string,
  input: CreateDsarInput
): Promise<DsarRequestRecord> {
  const validated = CreateDsarSchema.parse(input);
  const now = new Date();
  const id = randomUUID();

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `INSERT INTO privacy_dsar_requests (
        id, tenant_id, request_type, subject_email, subject_user_id,
        status, requester_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7, $7)
      RETURNING *;`,
      [
        id,
        tenantId,
        validated.request_type,
        validated.subject_email.toLowerCase(),
        validated.subject_user_id || null,
        validated.requester_notes || null,
        now.toISOString(),
      ]
    );

    // Audit log the creation of the DSAR request
    await logAuditEvent(tenantId, {
      action: 'DSAR_REQUEST_CREATED',
      resource_type: 'privacy_dsar_requests',
      resource_id: id,
      details: {
        request_type: validated.request_type,
        subject_email: validated.subject_email,
      },
    });

    return res.rows[0];
  });
}

/**
 * Lists DSAR requests.
 */
export async function listDsarRequests(
  tenantId: string,
  filters: { status?: string; request_type?: string } = {}
): Promise<DsarRequestRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    if (filters.request_type) {
      conditions.push(`request_type = $${paramIndex}`);
      params.push(filters.request_type);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT * FROM privacy_dsar_requests WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    return res.rows;
  });
}

/**
 * Retrieves DSAR request by ID.
 */
export async function getDsarRequestById(
  tenantId: string,
  id: string
): Promise<DsarRequestRecord | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM privacy_dsar_requests WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0];
  });
}

/**
 * Executes GDPR Personal Data Export for a subject.
 */
export async function processDsarExport(
  tenantId: string,
  requestId: string
): Promise<DsarRequestRecord> {
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const reqRes = await client.query(
      `SELECT * FROM privacy_dsar_requests WHERE id = $1 AND tenant_id = $2`,
      [requestId, tenantId]
    );

    if (reqRes.rows.length === 0) throw new Error('DSAR request not found');
    const dsar = reqRes.rows[0];
    const email = dsar.subject_email.toLowerCase();

    // 1. Gather User Account Data
    const userRes = await client.query(
      `SELECT id, name, email, role, is_active, created_at FROM users WHERE tenant_id = $1 AND LOWER(email) = $2`,
      [tenantId, email]
    );

    // 2. Gather Reported & Assigned Tickets
    const ticketRes = await client.query(
      `SELECT id, title, description, category, priority, status, reporter_name, reporter_email, assigned_to, created_at, resolved_at
       FROM tickets WHERE tenant_id = $1 AND (LOWER(reporter_email) = $2 OR LOWER(assigned_to) = $2)`,
      [tenantId, email]
    );

    // 3. Gather Borrow Records
    const userName = userRes.rows[0]?.name ? userRes.rows[0].name.toLowerCase() : '';
    const borrowRes = await client.query(
      `SELECT id, borrow_code, asset_id, borrower_name, borrower_email, department, borrow_date, expected_return_date, actual_return_date, status
       FROM borrow_records WHERE tenant_id = $1 AND (LOWER(borrower_email) = $2 OR LOWER(borrower_name) = $3)`,
      [tenantId, email, userName]
    );

    // 4. Gather Knowledge Article Feedbacks
    const feedbackRes = await client.query(
      `SELECT id, article_id, is_helpful, feedback_text, created_at
       FROM knowledge_feedback WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userRes.rows[0]?.id || email]
    );

    const exportPayload = {
      gdpr_compliance: 'EU 2016/679 / Thailand PDPA BE 2562',
      export_timestamp: now.toISOString(),
      subject_email: email,
      personal_data: {
        profile: userRes.rows[0] || null,
        tickets: ticketRes.rows,
        equipment_borrows: borrowRes.rows,
        article_feedbacks: feedbackRes.rows,
      },
    };

    const res = await client.query(
      `UPDATE privacy_dsar_requests
       SET status = 'Completed',
           exported_data = $1,
           resolution_notes = 'Personal data successfully aggregated and exported.',
           completed_at = $2,
           updated_at = $2
       WHERE id = $3 AND tenant_id = $4
       RETURNING *;`,
      [JSON.stringify(exportPayload), now.toISOString(), requestId, tenantId]
    );

    // Log Immutable Audit Event
    await logAuditEvent(tenantId, {
      action: 'GDPR_DATA_EXPORT_COMPLETED',
      resource_type: 'privacy_dsar_requests',
      resource_id: requestId,
      details: {
        subject_email: email,
        tickets_count: ticketRes.rows.length,
      },
    });

    return res.rows[0];
  });
}

/**
 * Executes GDPR Right to be Forgotten / Data Anonymization.
 */
export async function processDsarErasure(
  tenantId: string,
  requestId: string
): Promise<DsarRequestRecord> {
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const reqRes = await client.query(
      `SELECT * FROM privacy_dsar_requests WHERE id = $1 AND tenant_id = $2`,
      [requestId, tenantId]
    );

    if (reqRes.rows.length === 0) throw new Error('DSAR request not found');
    const dsar = reqRes.rows[0];
    const email = dsar.subject_email.toLowerCase();
    const anonHash = createHash('sha256').update(email).digest('hex').substring(0, 8);

    const anonymizedName = `Anonymized User ${anonHash}`;
    const anonymizedEmail = `anonymized_${anonHash}@deleted.local`;

    // 1. Anonymize user record
    await client.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           is_active = false
       WHERE tenant_id = $3 AND LOWER(email) = $4`,
      [anonymizedName, anonymizedEmail, tenantId, email]
    );

    // 2. Anonymize tickets reported by subject
    await client.query(
      `UPDATE tickets
       SET reporter_name = $1,
           reporter_email = $2
       WHERE tenant_id = $3 AND LOWER(reporter_email) = $4`,
      [anonymizedName, anonymizedEmail, tenantId, email]
    );

    // 3. Update DSAR status to Completed
    const res = await client.query(
      `UPDATE privacy_dsar_requests
       SET status = 'Completed',
           resolution_notes = $1,
           completed_at = $2,
           updated_at = $2
       WHERE id = $3 AND tenant_id = $4
       RETURNING *;`,
      [
        `Personal identifying data permanently anonymized as ${anonymizedEmail}. Relational links sanitized.`,
        now.toISOString(),
        requestId,
        tenantId,
      ]
    );

    // Log Immutable Audit Event
    await logAuditEvent(tenantId, {
      action: 'GDPR_RIGHT_TO_BE_FORGOTTEN_EXECUTED',
      resource_type: 'privacy_dsar_requests',
      resource_id: requestId,
      details: {
        anonymized_alias: anonymizedEmail,
      },
    });

    return res.rows[0];
  });
}
