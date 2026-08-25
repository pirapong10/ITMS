import { createHash, randomBytes, randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction, query } from './db';

// In-memory rate limiting sliding-window buffer: keyHash -> timestamp[]
const rateLimitWindowMap = new Map<string, number[]>();

export const CreateApiKeySchema = z.object({
  name: z.string().min(2).max(100),
  scopes: z.array(z.string()).default(['*.*']),
  rate_limit: z.number().int().min(10).max(5000).default(100),
  expires_in_days: z.number().int().positive().optional(),
});

export type CreateApiKeyInput = z.input<typeof CreateApiKeySchema>;

export interface ApiKeyRecord {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  raw_key?: string;
}

/**
 * Hashes an API key with SHA-256.
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Creates a new Tenant Scoped API Key.
 */
export async function createApiKey(
  tenantId: string,
  input: CreateApiKeyInput
): Promise<ApiKeyRecord & { raw_key: string }> {
  const validated = CreateApiKeySchema.parse(input);
  const now = new Date();
  const id = randomUUID();

  const rawKey = `ak_live_${randomBytes(24).toString('hex')}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = hashApiKey(rawKey);

  let expiresAt: string | null = null;
  if (validated.expires_in_days) {
    const expDate = new Date(now.getTime() + validated.expires_in_days * 24 * 60 * 60 * 1000);
    expiresAt = expDate.toISOString();
  }

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `INSERT INTO tenant_api_keys (
        id, tenant_id, name, key_hash, key_prefix, scopes, rate_limit,
        is_active, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $9)
      RETURNING *;`,
      [
        id,
        tenantId,
        validated.name,
        keyHash,
        keyPrefix,
        validated.scopes,
        validated.rate_limit,
        expiresAt,
        now.toISOString(),
      ]
    );

    return {
      ...res.rows[0],
      raw_key: rawKey,
    };
  });
}

/**
 * Checks sliding window rate limit for an API key.
 */
export function checkRateLimit(
  keyHash: string,
  rateLimit: number
): { allowed: boolean; limit: number; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const cutoff = now - windowMs;

  const timestamps = (rateLimitWindowMap.get(keyHash) || []).filter((ts) => ts > cutoff);

  if (timestamps.length >= rateLimit) {
    const oldest = timestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    rateLimitWindowMap.set(keyHash, timestamps);
    return {
      allowed: false,
      limit: rateLimit,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  timestamps.push(now);
  rateLimitWindowMap.set(keyHash, timestamps);

  return {
    allowed: true,
    limit: rateLimit,
    remaining: rateLimit - timestamps.length,
    resetSeconds: 60,
  };
}

/**
 * Validates API key and checks requested scope.
 */
export async function authenticateApiKey(
  rawKey: string,
  requiredScope?: string
): Promise<{
  valid: boolean;
  tenantId?: string;
  scopes?: string[];
  rateLimit?: { limit: number; remaining: number; resetSeconds: number };
  error?: string;
}> {
  if (!rawKey || !rawKey.startsWith('ak_live_')) {
    return { valid: false, error: 'Invalid API Key format' };
  }

  const keyHash = hashApiKey(rawKey);

  const res = await query(
    `SELECT * FROM tenant_api_keys WHERE key_hash = $1 AND is_active = true`,
    [keyHash]
  );

  if (res.rows.length === 0) {
    return { valid: false, error: 'Invalid or revoked API Key' };
  }

  const keyRecord = res.rows[0];

  // Check expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at).getTime() < Date.now()) {
    return { valid: false, error: 'API Key has expired' };
  }

  // Check rate limit
  const rateLimitStatus = checkRateLimit(keyHash, keyRecord.rate_limit);
  if (!rateLimitStatus.allowed) {
    return {
      valid: false,
      error: 'Rate limit exceeded',
      rateLimit: rateLimitStatus,
    };
  }

  // Check scopes
  const scopes: string[] = keyRecord.scopes || [];
  if (requiredScope && !scopes.includes('*.*') && !scopes.includes(requiredScope)) {
    const [reqDomain] = requiredScope.split(':');
    if (!scopes.includes(`${reqDomain}:*`)) {
      return {
        valid: false,
        error: `Insufficient API key scope. Required: '${requiredScope}'`,
        rateLimit: rateLimitStatus,
      };
    }
  }

  return {
    valid: true,
    tenantId: keyRecord.tenant_id,
    scopes,
    rateLimit: rateLimitStatus,
  };
}

/**
 * Lists tenant API keys (masked).
 */
export async function listApiKeys(tenantId: string): Promise<ApiKeyRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT id, tenant_id, name, key_prefix, scopes, rate_limit, is_active, expires_at, created_at, updated_at
       FROM tenant_api_keys
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  });
}

/**
 * Revokes / deletes an API key.
 */
export async function revokeApiKey(tenantId: string, id: string): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM tenant_api_keys WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId]
    );
    return res.rows.length > 0;
  });
}
