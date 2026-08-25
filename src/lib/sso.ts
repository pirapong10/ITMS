import { randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';
import { signJwt } from './auth';
import { encryptData, decryptData } from './encryption';

export const SupportedSsoProviders = [
  'SAML',
  'OIDC',
  'Google',
  'Microsoft_Entra',
  'Okta',
] as const;

export const SaveSsoConfigSchema = z.object({
  provider_type: z.enum(['SAML', 'OIDC', 'Google', 'Microsoft_Entra', 'Okta']).default('OIDC'),
  is_enabled: z.boolean().default(false),
  enforce_sso: z.boolean().default(false),
  issuer_url: z.string().url(),
  sso_url: z.string().url(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  x509_cert: z.string().optional(),
  allow_jit_provisioning: z.boolean().default(true),
  default_role: z.enum(['Admin', 'IT Admin', 'Technician', 'User']).default('User'),
});

export const SsoCallbackSchema = z.object({
  provider_type: z.enum(['SAML', 'OIDC', 'Google', 'Microsoft_Entra', 'Okta']),
  email: z.string().email(),
  name: z.string().min(1),
  idp_user_id: z.string().optional(),
  attributes: z.record(z.string(), z.any()).optional().default({}),
});

export type SaveSsoConfigInput = z.input<typeof SaveSsoConfigSchema>;
export type SsoCallbackInput = z.input<typeof SsoCallbackSchema>;

export interface SsoConfigRecord {
  id: string;
  tenant_id: string;
  provider_type: string;
  is_enabled: boolean;
  enforce_sso: boolean;
  issuer_url: string;
  sso_url: string;
  client_id: string | null;
  has_client_secret: boolean;
  x509_cert: string | null;
  allow_jit_provisioning: boolean;
  default_role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves the SSO configuration for a tenant.
 */
export async function getTenantSsoConfig(tenantId: string): Promise<SsoConfigRecord | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM tenant_sso_configs WHERE tenant_id = $1`,
      [tenantId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      has_client_secret: !!row.client_secret_encrypted,
      client_secret_encrypted: undefined, // Never expose raw secret
    };
  });
}

/**
 * Saves or updates the SSO configuration for a tenant.
 */
export async function saveTenantSsoConfig(
  tenantId: string,
  input: SaveSsoConfigInput
): Promise<SsoConfigRecord> {
  const validated = SaveSsoConfigSchema.parse(input);
  const encryptedSecret = validated.client_secret
    ? encryptData(validated.client_secret)
    : null;

  return withTenantTransaction(tenantId, async (client) => {
    const existing = await client.query(
      `SELECT id, client_secret_encrypted FROM tenant_sso_configs WHERE tenant_id = $1`,
      [tenantId]
    );

    const secretToSave = encryptedSecret || (existing.rows[0] ? existing.rows[0].client_secret_encrypted : null);

    if (existing.rows.length > 0) {
      const res = await client.query(
        `UPDATE tenant_sso_configs
         SET provider_type = $1,
             is_enabled = $2,
             enforce_sso = $3,
             issuer_url = $4,
             sso_url = $5,
             client_id = $6,
             client_secret_encrypted = $7,
             x509_cert = $8,
             allow_jit_provisioning = $9,
             default_role = $10,
             updated_at = current_timestamp
         WHERE tenant_id = $11
         RETURNING *;`,
        [
          validated.provider_type,
          validated.is_enabled,
          validated.enforce_sso,
          validated.issuer_url,
          validated.sso_url,
          validated.client_id || null,
          secretToSave,
          validated.x509_cert || null,
          validated.allow_jit_provisioning,
          validated.default_role,
          tenantId,
        ]
      );

      return {
        ...res.rows[0],
        has_client_secret: !!res.rows[0].client_secret_encrypted,
        client_secret_encrypted: undefined,
      };
    } else {
      const newId = randomUUID();
      const res = await client.query(
        `INSERT INTO tenant_sso_configs (
          id, tenant_id, provider_type, is_enabled, enforce_sso,
          issuer_url, sso_url, client_id, client_secret_encrypted,
          x509_cert, allow_jit_provisioning, default_role, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, current_timestamp, current_timestamp)
        RETURNING *;`,
        [
          newId,
          tenantId,
          validated.provider_type,
          validated.is_enabled,
          validated.enforce_sso,
          validated.issuer_url,
          validated.sso_url,
          validated.client_id || null,
          secretToSave,
          validated.x509_cert || null,
          validated.allow_jit_provisioning,
          validated.default_role,
        ]
      );

      return {
        ...res.rows[0],
        has_client_secret: !!res.rows[0].client_secret_encrypted,
        client_secret_encrypted: undefined,
      };
    }
  });
}

/**
 * Handles SSO Callback and Just-In-Time (JIT) user auto-provisioning.
 */
export async function processSsoCallback(
  tenantId: string,
  input: SsoCallbackInput
): Promise<{
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    is_new_provisioned: boolean;
  };
  token: string;
}> {
  const validated = SsoCallbackSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    // 1. Verify SSO Config
    const ssoRes = await client.query(
      `SELECT * FROM tenant_sso_configs WHERE tenant_id = $1`,
      [tenantId]
    );

    if (ssoRes.rows.length === 0 || !ssoRes.rows[0].is_enabled) {
      throw new Error('SSO is not enabled or configured for this organization');
    }

    const ssoConfig = ssoRes.rows[0];

    // 2. Check if user already exists
    const userRes = await client.query(
      `SELECT * FROM users WHERE tenant_id = $1 AND email = $2`,
      [tenantId, validated.email.toLowerCase()]
    );

    let userRow: any;
    let isNewProvisioned = false;

    if (userRes.rows.length > 0) {
      userRow = userRes.rows[0];
      // Update name if changed
      if (userRow.name !== validated.name) {
        const updateRes = await client.query(
          `UPDATE users SET name = $1 WHERE id = $2 RETURNING *`,
          [validated.name, userRow.id]
        );
        userRow = updateRes.rows[0];
      }
    } else {
      // User doesn't exist -> Check JIT Provisioning
      if (!ssoConfig.allow_jit_provisioning) {
        throw new Error('Access Denied: User is not provisioned and JIT provisioning is disabled');
      }

      // JIT Auto-provisioning
      const newUserId = randomUUID();
      const insertUserRes = await client.query(
        `INSERT INTO users (id, tenant_id, name, email, role, created_at)
         VALUES ($1, $2, $3, $4, $5, current_timestamp)
         RETURNING *;`,
        [
          newUserId,
          tenantId,
          validated.name,
          validated.email.toLowerCase(),
          ssoConfig.default_role || 'User',
        ]
      );

      userRow = insertUserRes.rows[0];
      isNewProvisioned = true;
    }

    // 3. Issue authenticated JWT
    const token = signJwt({
      userId: userRow.id,
      tenantId: tenantId,
      role: userRow.role,
    });

    return {
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        role: userRow.role,
        is_new_provisioned: isNewProvisioned,
      },
      token,
    };
  });
}
