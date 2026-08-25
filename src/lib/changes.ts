import { z } from 'zod';
import { withTenantTransaction } from './db';

// Zod Validation Schemas
export const CreateChangeSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(3),
  change_type: z.enum(['Standard', 'Normal', 'Emergency']).default('Normal'),
  risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  impact_level: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  requested_by: z.string().optional(),
  assigned_to: z.string().optional(),
  implementation_plan: z.string().min(5, 'Implementation plan is required for change enablement'),
  rollback_plan: z.string().min(5, 'Rollback plan is mandatory for safety review'),
  test_plan: z.string().optional(),
  scheduled_start: z.string().datetime({ offset: true }).optional().nullable(),
  scheduled_end: z.string().datetime({ offset: true }).optional().nullable(),
});

export const UpdateChangeSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(3).optional(),
  change_type: z.enum(['Standard', 'Normal', 'Emergency']).optional(),
  risk_level: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  impact_level: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z
    .enum(['Draft', 'Pending CAB', 'Approved', 'Rejected', 'Scheduled', 'Implementing', 'Completed', 'Rolled Back', 'Closed'])
    .optional(),
  assigned_to: z.string().optional(),
  implementation_plan: z.string().optional(),
  rollback_plan: z.string().optional(),
  test_plan: z.string().optional(),
  scheduled_start: z.string().datetime({ offset: true }).optional().nullable(),
  scheduled_end: z.string().datetime({ offset: true }).optional().nullable(),
  review_notes: z.string().optional(),
});

export const SubmitCabSchema = z.object({
  approvers: z
    .array(
      z.object({
        approver_id: z.string().min(1),
        approver_name: z.string().optional(),
      })
    )
    .min(1, 'At least one CAB approver is required'),
});

export const CabDecisionSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
  comments: z.string().optional(),
});

export const ExecuteChangeSchema = z.object({
  status: z.enum(['Implementing', 'Completed', 'Rolled Back', 'Closed']),
  actual_start: z.string().datetime({ offset: true }).optional().nullable(),
  actual_end: z.string().datetime({ offset: true }).optional().nullable(),
  review_notes: z.string().optional(),
});

export type CreateChangeInput = z.input<typeof CreateChangeSchema>;
export type UpdateChangeInput = z.input<typeof UpdateChangeSchema>;
export type SubmitCabInput = z.input<typeof SubmitCabSchema>;
export type CabDecisionInput = z.input<typeof CabDecisionSchema>;
export type ExecuteChangeInput = z.input<typeof ExecuteChangeSchema>;

export interface ChangeRequestRecord {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  change_type: string;
  risk_level: string;
  impact_level: string;
  status: string;
  requested_by: string | null;
  assigned_to: string | null;
  implementation_plan: string | null;
  rollback_plan: string | null;
  test_plan: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  approvals?: CabApprovalRecord[];
}

export interface CabApprovalRecord {
  id: string;
  change_id: string;
  tenant_id: string;
  approver_id: string;
  approver_name: string | null;
  decision: 'Pending' | 'Approved' | 'Rejected';
  comments: string | null;
  decided_at: string | null;
  created_at: string;
}

/**
 * Generates an atomic Change Request ID: CR-YYYY-XXXX (e.g. CR-2026-0001)
 */
export async function generateChangeId(client: any, tenantId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `CR-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM change_requests WHERE tenant_id = $1 AND id LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Creates a new Change Request.
 */
export async function createChangeRequest(
  tenantId: string,
  input: CreateChangeInput
): Promise<ChangeRequestRecord> {
  const validated = CreateChangeSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const id = await generateChangeId(client, tenantId, now.getFullYear());
    // Pre-approved for standard changes
    const initialStatus = validated.change_type === 'Standard' ? 'Approved' : 'Draft';

    const res = await client.query(
      `INSERT INTO change_requests (
        id, tenant_id, title, description, change_type, risk_level, impact_level,
        status, requested_by, assigned_to, implementation_plan, rollback_plan, test_plan,
        scheduled_start, scheduled_end, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
      RETURNING *;`,
      [
        id,
        tenantId,
        validated.title,
        validated.description,
        validated.change_type,
        validated.risk_level,
        validated.impact_level,
        initialStatus,
        validated.requested_by || null,
        validated.assigned_to || null,
        validated.implementation_plan,
        validated.rollback_plan,
        validated.test_plan || null,
        validated.scheduled_start || null,
        validated.scheduled_end || null,
        now.toISOString(),
      ]
    );

    return res.rows[0];
  });
}

/**
 * Retrieves Change Request by ID with its CAB approvals.
 */
export async function getChangeRequestById(
  tenantId: string,
  id: string
): Promise<ChangeRequestRecord | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM change_requests WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (res.rows.length === 0) return null;
    const change = res.rows[0];

    const appRes = await client.query(
      `SELECT * FROM cab_approvals WHERE change_id = $1 AND tenant_id = $2 ORDER BY created_at ASC`,
      [id, tenantId]
    );

    return {
      ...change,
      approvals: appRes.rows,
    };
  });
}

/**
 * Lists Change Requests with filters.
 */
export async function listChangeRequests(
  tenantId: string,
  filters: {
    status?: string;
    change_type?: string;
    risk_level?: string;
    search?: string;
  } = {}
): Promise<ChangeRequestRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    if (filters.change_type) {
      conditions.push(`change_type = $${paramIndex}`);
      params.push(filters.change_type);
      paramIndex++;
    }
    if (filters.risk_level) {
      conditions.push(`risk_level = $${paramIndex}`);
      params.push(filters.risk_level);
      paramIndex++;
    }
    if (filters.search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT * FROM change_requests WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    return res.rows;
  });
}

/**
 * Updates Change Request attributes.
 */
export async function updateChangeRequest(
  tenantId: string,
  id: string,
  input: UpdateChangeInput
): Promise<ChangeRequestRecord> {
  const validated = UpdateChangeSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [now.toISOString()];
    let paramIndex = 2;

    if (validated.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(validated.title);
      paramIndex++;
    }
    if (validated.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(validated.description);
      paramIndex++;
    }
    if (validated.change_type !== undefined) {
      updates.push(`change_type = $${paramIndex}`);
      values.push(validated.change_type);
      paramIndex++;
    }
    if (validated.risk_level !== undefined) {
      updates.push(`risk_level = $${paramIndex}`);
      values.push(validated.risk_level);
      paramIndex++;
    }
    if (validated.impact_level !== undefined) {
      updates.push(`impact_level = $${paramIndex}`);
      values.push(validated.impact_level);
      paramIndex++;
    }
    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;
    }
    if (validated.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(validated.assigned_to);
      paramIndex++;
    }
    if (validated.implementation_plan !== undefined) {
      updates.push(`implementation_plan = $${paramIndex}`);
      values.push(validated.implementation_plan);
      paramIndex++;
    }
    if (validated.rollback_plan !== undefined) {
      updates.push(`rollback_plan = $${paramIndex}`);
      values.push(validated.rollback_plan);
      paramIndex++;
    }
    if (validated.test_plan !== undefined) {
      updates.push(`test_plan = $${paramIndex}`);
      values.push(validated.test_plan);
      paramIndex++;
    }
    if (validated.scheduled_start !== undefined) {
      updates.push(`scheduled_start = $${paramIndex}`);
      values.push(validated.scheduled_start);
      paramIndex++;
    }
    if (validated.scheduled_end !== undefined) {
      updates.push(`scheduled_end = $${paramIndex}`);
      values.push(validated.scheduled_end);
      paramIndex++;
    }
    if (validated.review_notes !== undefined) {
      updates.push(`review_notes = $${paramIndex}`);
      values.push(validated.review_notes);
      paramIndex++;
    }

    values.push(id, tenantId);

    const res = await client.query(
      `UPDATE change_requests SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *;`,
      values
    );

    if (res.rows.length === 0) throw new Error('Change request not found');
    return res.rows[0];
  });
}

/**
 * Submits Change Request to CAB (Change Advisory Board) for Multi-stage approval.
 */
export async function submitChangeForCabApproval(
  tenantId: string,
  changeId: string,
  input: SubmitCabInput
): Promise<ChangeRequestRecord> {
  const validated = SubmitCabSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const changeRes = await client.query(
      `SELECT status FROM change_requests WHERE id = $1 AND tenant_id = $2`,
      [changeId, tenantId]
    );

    if (changeRes.rows.length === 0) throw new Error('Change request not found');
    const currentStatus = changeRes.rows[0].status;

    if (currentStatus !== 'Draft' && currentStatus !== 'Rejected') {
      throw new Error(`Cannot submit change with status ${currentStatus} for CAB approval`);
    }

    // Clear previous approvals if any (e.g. resubmitting after rejection)
    await client.query(`DELETE FROM cab_approvals WHERE change_id = $1 AND tenant_id = $2`, [changeId, tenantId]);

    // Insert new CAB approval records
    for (const app of validated.approvers) {
      await client.query(
        `INSERT INTO cab_approvals (
          change_id, tenant_id, approver_id, approver_name, decision, created_at
        ) VALUES ($1, $2, $3, $4, 'Pending', $5);`,
        [changeId, tenantId, app.approver_id, app.approver_name || null, now.toISOString()]
      );
    }

    // Update status to Pending CAB
    const res = await client.query(
      `UPDATE change_requests
       SET status = 'Pending CAB', updated_at = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING *;`,
      [now.toISOString(), changeId, tenantId]
    );

    const approvals = await client.query(
      `SELECT * FROM cab_approvals WHERE change_id = $1 AND tenant_id = $2`,
      [changeId, tenantId]
    );

    return {
      ...res.rows[0],
      approvals: approvals.rows,
    };
  });
}

/**
 * Records a CAB member decision (Approved / Rejected) and automatically updates change status.
 */
export async function recordCabDecision(
  tenantId: string,
  changeId: string,
  approverId: string,
  input: CabDecisionInput
): Promise<ChangeRequestRecord> {
  const validated = CabDecisionSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const appRes = await client.query(
      `UPDATE cab_approvals
       SET decision = $1, comments = $2, decided_at = $3
       WHERE change_id = $4 AND approver_id = $5 AND tenant_id = $6
       RETURNING *;`,
      [validated.decision, validated.comments || null, now.toISOString(), changeId, approverId, tenantId]
    );

    if (appRes.rows.length === 0) {
      throw new Error(`Approver ${approverId} is not assigned to review change ${changeId}`);
    }

    // Check all approvals for this change
    const allApps = await client.query(
      `SELECT decision FROM cab_approvals WHERE change_id = $1 AND tenant_id = $2`,
      [changeId, tenantId]
    );

    const decisions = allApps.rows.map((r: any) => r.decision);
    let newStatus = 'Pending CAB';

    if (decisions.includes('Rejected')) {
      newStatus = 'Rejected';
    } else if (decisions.every((d: string) => d === 'Approved')) {
      newStatus = 'Approved';
    }

    const res = await client.query(
      `UPDATE change_requests SET status = $1, updated_at = $2 WHERE id = $3 AND tenant_id = $4 RETURNING *;`,
      [newStatus, now.toISOString(), changeId, tenantId]
    );

    const approvals = await client.query(
      `SELECT * FROM cab_approvals WHERE change_id = $1 AND tenant_id = $2`,
      [changeId, tenantId]
    );

    return {
      ...res.rows[0],
      approvals: approvals.rows,
    };
  });
}

/**
 * Updates Change Execution State (Implementing, Completed, Rolled Back, Closed) and PIR notes.
 */
export async function executeChange(
  tenantId: string,
  changeId: string,
  input: ExecuteChangeInput
): Promise<ChangeRequestRecord> {
  const validated = ExecuteChangeSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const changeRes = await client.query(
      `SELECT status, actual_start FROM change_requests WHERE id = $1 AND tenant_id = $2`,
      [changeId, tenantId]
    );

    if (changeRes.rows.length === 0) throw new Error('Change request not found');
    const change = changeRes.rows[0];

    const actualStart =
      validated.actual_start ||
      (validated.status === 'Implementing' && !change.actual_start ? now.toISOString() : undefined);

    const actualEnd =
      validated.actual_end ||
      (validated.status === 'Completed' || validated.status === 'Rolled Back' ? now.toISOString() : undefined);

    const updates: string[] = ['status = $1', 'updated_at = $2'];
    const values: any[] = [validated.status, now.toISOString()];
    let paramIndex = 3;

    if (actualStart) {
      updates.push(`actual_start = $${paramIndex}`);
      values.push(actualStart);
      paramIndex++;
    }
    if (actualEnd) {
      updates.push(`actual_end = $${paramIndex}`);
      values.push(actualEnd);
      paramIndex++;
    }
    if (validated.review_notes) {
      updates.push(`review_notes = $${paramIndex}`);
      values.push(validated.review_notes);
      paramIndex++;
    }

    values.push(changeId, tenantId);

    const res = await client.query(
      `UPDATE change_requests SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *;`,
      values
    );

    const approvals = await client.query(
      `SELECT * FROM cab_approvals WHERE change_id = $1 AND tenant_id = $2`,
      [changeId, tenantId]
    );

    return {
      ...res.rows[0],
      approvals: approvals.rows,
    };
  });
}

/**
 * Retrieves CAB approvals for a change request.
 */
export async function getCabApprovals(tenantId: string, changeId: string): Promise<CabApprovalRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM cab_approvals WHERE change_id = $1 AND tenant_id = $2 ORDER BY created_at ASC`,
      [changeId, tenantId]
    );
    return res.rows;
  });
}
