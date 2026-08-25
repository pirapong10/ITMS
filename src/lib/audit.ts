import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';

// Validation Schema for Audit Entry Input
export const LogAuditEntrySchema = z.object({
  actor_id: z.string().optional(),
  actor_name: z.string().optional(),
  action: z.string().min(2).max(100),
  resource_type: z.string().min(2).max(50),
  resource_id: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

export type LogAuditEntryInput = z.input<typeof LogAuditEntrySchema>;

export interface ImmutableAuditLogRecord {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  prev_hash: string;
  log_hash: string;
  created_at: string;
}

/**
 * Computes deterministic SHA-256 hash for an audit log entry chained to prevHash.
 */
export function computeLogHash(
  prevHash: string,
  entry: {
    tenant_id: string;
    actor_id?: string | null;
    action: string;
    resource_type: string;
    resource_id?: string | null;
    details?: any;
    created_at: string;
  }
): string {
  const payload = [
    prevHash,
    entry.tenant_id,
    entry.actor_id || '',
    entry.action,
    entry.resource_type,
    entry.resource_id || '',
    JSON.stringify(entry.details || {}),
    entry.created_at,
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Appends an immutable audit log entry with cryptographic hash chaining.
 */
export async function logAuditEvent(
  tenantId: string,
  input: LogAuditEntryInput
): Promise<ImmutableAuditLogRecord> {
  const validated = LogAuditEntrySchema.parse(input);
  const now = new Date();
  const id = randomUUID();

  return withTenantTransaction(tenantId, async (client) => {
    // 1. Get the latest log entry to find the previous hash
    const latestRes = await client.query(
      `SELECT log_hash FROM immutable_audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
      [tenantId]
    );

    const prevHash = latestRes.rows.length > 0 ? latestRes.rows[0].log_hash : 'GENESIS';
    const createdAt = now.toISOString();

    const logHash = computeLogHash(prevHash, {
      tenant_id: tenantId,
      actor_id: validated.actor_id,
      action: validated.action,
      resource_type: validated.resource_type,
      resource_id: validated.resource_id,
      details: validated.details,
      created_at: createdAt,
    });

    const res = await client.query(
      `INSERT INTO immutable_audit_logs (
        id, tenant_id, actor_id, actor_name, action, resource_type,
        resource_id, details, ip_address, user_agent, prev_hash, log_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;`,
      [
        id,
        tenantId,
        validated.actor_id || null,
        validated.actor_name || null,
        validated.action,
        validated.resource_type,
        validated.resource_id || null,
        validated.details ? JSON.stringify(validated.details) : null,
        validated.ip_address || null,
        validated.user_agent || null,
        prevHash,
        logHash,
        createdAt,
      ]
    );

    return res.rows[0];
  });
}

/**
 * Queries immutable audit logs with optional filters.
 */
export async function queryAuditLogs(
  tenantId: string,
  filters: {
    resource_type?: string;
    action?: string;
    actor_id?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ logs: ImmutableAuditLogRecord[]; total: number }> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.resource_type) {
      conditions.push(`resource_type = $${paramIndex}`);
      params.push(filters.resource_type);
      paramIndex++;
    }
    if (filters.action) {
      conditions.push(`action = $${paramIndex}`);
      params.push(filters.action);
      paramIndex++;
    }
    if (filters.actor_id) {
      conditions.push(`actor_id = $${paramIndex}`);
      params.push(filters.actor_id);
      paramIndex++;
    }

    const countRes = await client.query(
      `SELECT count(*) as count FROM immutable_audit_logs WHERE ${conditions.join(' AND ')}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const offset = Math.max(0, filters.offset || 0);

    const res = await client.query(
      `SELECT * FROM immutable_audit_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      logs: res.rows,
      total,
    };
  });
}

/**
 * Verifies the cryptographic hash-chain integrity of audit logs for a tenant.
 */
export async function verifyAuditChain(tenantId: string): Promise<{
  verified: boolean;
  totalRecords: number;
  tamperedRecordId?: string;
  error?: string;
}> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM immutable_audit_logs WHERE tenant_id = $1 ORDER BY created_at ASC, id ASC`,
      [tenantId]
    );

    const records: ImmutableAuditLogRecord[] = res.rows;
    if (records.length === 0) {
      return { verified: true, totalRecords: 0 };
    }

    let expectedPrevHash = 'GENESIS';

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 1. Verify prev_hash matches expected
      if (record.prev_hash !== expectedPrevHash) {
        return {
          verified: false,
          totalRecords: records.length,
          tamperedRecordId: record.id,
          error: `Broken hash chain at index ${i}: prev_hash '${record.prev_hash}' does not match expected '${expectedPrevHash}'`,
        };
      }

      // 2. Recompute log_hash and compare
      const recomputedHash = computeLogHash(expectedPrevHash, {
        tenant_id: tenantId,
        actor_id: record.actor_id,
        action: record.action,
        resource_type: record.resource_type,
        resource_id: record.resource_id,
        details: typeof record.details === 'string' ? JSON.parse(record.details) : record.details,
        created_at: new Date(record.created_at).toISOString(),
      });

      if (record.log_hash !== recomputedHash) {
        return {
          verified: false,
          totalRecords: records.length,
          tamperedRecordId: record.id,
          error: `Hash mismatch at record ${record.id}: stored '${record.log_hash}' vs recomputed '${recomputedHash}'`,
        };
      }

      expectedPrevHash = record.log_hash;
    }

    return {
      verified: true,
      totalRecords: records.length,
    };
  });
}
