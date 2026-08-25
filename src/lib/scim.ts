import { createHash, randomBytes, randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction, query } from './db';

// SCIM Schemas
export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
export const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';
export const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';
export const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error';

// Zod Validation Schemas
export const ScimUserCreateSchema = z.object({
  schemas: z.array(z.string()).optional(),
  userName: z.string().email(),
  name: z
    .object({
      formatted: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
  displayName: z.string().optional(),
  emails: z
    .array(
      z.object({
        value: z.string().email(),
        type: z.string().optional(),
        primary: z.boolean().optional(),
      })
    )
    .optional(),
  active: z.boolean().optional().default(true),
  roles: z
    .array(
      z.object({
        value: z.string(),
        primary: z.boolean().optional(),
      })
    )
    .optional(),
  externalId: z.string().optional(),
});

export const ScimPatchSchema = z.object({
  schemas: z.array(z.string()).optional(),
  Operations: z.array(
    z.object({
      op: z.enum(['add', 'replace', 'remove', 'Add', 'Replace', 'Remove']),
      path: z.string().optional(),
      value: z.any(),
    })
  ),
});

export const ScimGroupCreateSchema = z.object({
  schemas: z.array(z.string()).optional(),
  displayName: z.string().min(1),
  members: z
    .array(
      z.object({
        value: z.string(),
        display: z.string().optional(),
      })
    )
    .optional(),
});

export type ScimUserCreateInput = z.infer<typeof ScimUserCreateSchema>;
export type ScimPatchInput = z.infer<typeof ScimPatchSchema>;
export type ScimGroupCreateInput = z.infer<typeof ScimGroupCreateSchema>;

/**
 * Hashes a token with SHA-256 for secure storage.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a SCIM Bearer Token for a tenant.
 */
export async function createTenantScimToken(tenantId: string, name: string = 'SCIM Bearer Token') {
  const rawToken = `scim_${randomBytes(24).toString('hex')}`;
  const tokenHash = hashToken(rawToken);
  const id = randomUUID();

  await withTenantTransaction(tenantId, async (client) => {
    await client.query(
      `INSERT INTO tenant_scim_tokens (id, tenant_id, token_hash, name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, current_timestamp, current_timestamp)`,
      [id, tenantId, tokenHash, name]
    );
  });

  return {
    id,
    name,
    rawToken,
  };
}

/**
 * Authenticates SCIM Bearer token from HTTP Authorization header.
 */
export async function authenticateScimRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  const tokenHash = hashToken(token);

  const res = await query(
    `SELECT tenant_id FROM tenant_scim_tokens WHERE token_hash = $1 AND is_active = true`,
    [tokenHash]
  );

  if (res.rows.length === 0) return null;
  return res.rows[0].tenant_id;
}

/**
 * Formats database user record into SCIM 2.0 User resource.
 */
export function formatScimUser(user: any) {
  const given = user.name ? user.name.split(' ')[0] : '';
  const family = user.name ? user.name.split(' ').slice(1).join(' ') : '';

  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    externalId: user.external_id || undefined,
    userName: user.email,
    name: {
      formatted: user.name,
      givenName: given,
      familyName: family,
    },
    displayName: user.name,
    emails: [
      {
        value: user.email,
        type: 'work',
        primary: true,
      },
    ],
    roles: [
      {
        value: user.role || 'User',
        primary: true,
      },
    ],
    active: user.is_active !== false,
    meta: {
      resourceType: 'User',
      created: user.created_at,
      lastModified: user.created_at,
      location: `/api/scim/v2/Users/${user.id}`,
    },
  };
}

/**
 * Formats database group record into SCIM 2.0 Group resource.
 */
export function formatScimGroup(group: any, members: any[] = []) {
  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: group.id,
    displayName: group.display_name,
    members: members.map((m) => ({
      value: m.user_id,
      display: m.name || m.email,
    })),
    meta: {
      resourceType: 'Group',
      created: group.created_at,
      lastModified: group.updated_at,
      location: `/api/scim/v2/Groups/${group.id}`,
    },
  };
}

/**
 * SCIM List Users with filter & pagination.
 */
export async function scimListUsers(
  tenantId: string,
  options: { filter?: string; startIndex?: number; count?: number } = {}
) {
  const startIndex = Math.max(1, options.startIndex || 1);
  const count = Math.min(100, Math.max(1, options.count || 50));
  const offset = startIndex - 1;

  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIdx = 2;

    if (options.filter) {
      // Basic SCIM filter parser: userName eq "email" or emails.value eq "email"
      const match = options.filter.match(/(?:userName|emails\[type eq "work"\]\.value|emails\.value)\s+eq\s+["']([^"']+)["']/i);
      if (match) {
        conditions.push(`email = $${paramIdx}`);
        params.push(match[1].toLowerCase());
        paramIdx++;
      }
    }

    const countRes = await client.query(
      `SELECT count(*) as count FROM users WHERE ${conditions.join(' AND ')}`,
      params
    );
    const totalResults = parseInt(countRes.rows[0].count, 10);

    const listRes = await client.query(
      `SELECT * FROM users WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, count, offset]
    );

    return {
      schemas: [SCIM_LIST_SCHEMA],
      totalResults,
      startIndex,
      itemsPerPage: listRes.rows.length,
      Resources: listRes.rows.map(formatScimUser),
    };
  });
}

/**
 * SCIM Create User.
 */
export async function scimCreateUser(tenantId: string, payload: any) {
  const validated = ScimUserCreateSchema.parse(payload);
  const userId = randomUUID();
  const email = validated.userName.toLowerCase();

  const name =
    validated.name?.formatted ||
    (validated.name?.givenName ? `${validated.name.givenName} ${validated.name.familyName || ''}`.trim() : '') ||
    validated.displayName ||
    email.split('@')[0];

  const role = validated.roles && validated.roles[0] ? validated.roles[0].value : 'User';
  const isActive = validated.active !== false;
  const externalId = validated.externalId || null;

  return withTenantTransaction(tenantId, async (client) => {
    // Check uniqueness
    const existing = await client.query(`SELECT id FROM users WHERE tenant_id = $1 AND email = $2`, [tenantId, email]);
    if (existing.rows.length > 0) {
      throw new Error(`Conflict: User with email ${email} already exists`);
    }

    const res = await client.query(
      `INSERT INTO users (id, tenant_id, name, email, role, is_active, external_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, current_timestamp)
       RETURNING *;`,
      [userId, tenantId, name, email, role, isActive, externalId]
    );

    return formatScimUser(res.rows[0]);
  });
}

/**
 * SCIM Get Single User.
 */
export async function scimGetUser(tenantId: string, userId: string) {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(`SELECT * FROM users WHERE id = $1 AND tenant_id = $2`, [userId, tenantId]);
    if (res.rows.length === 0) return null;
    return formatScimUser(res.rows[0]);
  });
}

/**
 * SCIM Update User (PUT).
 */
export async function scimUpdateUser(tenantId: string, userId: string, payload: any) {
  const validated = ScimUserCreateSchema.parse(payload);
  const email = validated.userName.toLowerCase();
  const name =
    validated.name?.formatted ||
    (validated.name?.givenName ? `${validated.name.givenName} ${validated.name.familyName || ''}`.trim() : '') ||
    validated.displayName ||
    email.split('@')[0];
  const role = validated.roles && validated.roles[0] ? validated.roles[0].value : 'User';
  const isActive = validated.active !== false;
  const externalId = validated.externalId || null;

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, is_active = $4, external_id = $5
       WHERE id = $6 AND tenant_id = $7
       RETURNING *;`,
      [name, email, role, isActive, externalId, userId, tenantId]
    );

    if (res.rows.length === 0) throw new Error('User not found');
    return formatScimUser(res.rows[0]);
  });
}

/**
 * SCIM Patch User (e.g. deprovisioning or attribute update).
 */
export async function scimPatchUser(tenantId: string, userId: string, payload: any) {
  const validated = ScimPatchSchema.parse(payload);

  return withTenantTransaction(tenantId, async (client) => {
    const getRes = await client.query(`SELECT * FROM users WHERE id = $1 AND tenant_id = $2`, [userId, tenantId]);
    if (getRes.rows.length === 0) throw new Error('User not found');
    const user = getRes.rows[0];

    let newActive = user.is_active;
    let newName = user.name;
    let newEmail = user.email;

    for (const op of validated.Operations) {
      const path = (op.path || '').toLowerCase();

      if (path === 'active' || op.value?.active !== undefined) {
        newActive = path === 'active' ? Boolean(op.value) : Boolean(op.value.active);
      } else if (path === 'name.formatted' || op.value?.formatted) {
        newName = path === 'name.formatted' ? String(op.value) : String(op.value.formatted);
      } else if (path === 'username' || op.value?.userName) {
        newEmail = (path === 'username' ? String(op.value) : String(op.value.userName)).toLowerCase();
      }
    }

    const res = await client.query(
      `UPDATE users SET is_active = $1, name = $2, email = $3 WHERE id = $4 AND tenant_id = $5 RETURNING *;`,
      [newActive, newName, newEmail, userId, tenantId]
    );

    return formatScimUser(res.rows[0]);
  });
}

/**
 * SCIM Delete / Deprovision User.
 */
export async function scimDeleteUser(tenantId: string, userId: string): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(`DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id`, [userId, tenantId]);
    return res.rows.length > 0;
  });
}

/**
 * SCIM List Groups.
 */
export async function scimListGroups(tenantId: string) {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(`SELECT * FROM groups WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
    const groups = [];

    for (const g of res.rows) {
      const memRes = await client.query(
        `SELECT gm.user_id, u.name, u.email FROM group_memberships gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = $1`,
        [g.id]
      );
      groups.push(formatScimGroup(g, memRes.rows));
    }

    return {
      schemas: [SCIM_LIST_SCHEMA],
      totalResults: groups.length,
      startIndex: 1,
      itemsPerPage: groups.length,
      Resources: groups,
    };
  });
}

/**
 * SCIM Create Group.
 */
export async function scimCreateGroup(tenantId: string, payload: any) {
  const validated = ScimGroupCreateSchema.parse(payload);
  const groupId = randomUUID();

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `INSERT INTO groups (id, tenant_id, display_name, created_at, updated_at)
       VALUES ($1, $2, $3, current_timestamp, current_timestamp)
       RETURNING *;`,
      [groupId, tenantId, validated.displayName]
    );

    const members: any[] = [];
    if (validated.members && validated.members.length > 0) {
      for (const m of validated.members) {
        await client.query(
          `INSERT INTO group_memberships (group_id, user_id, tenant_id, created_at)
           VALUES ($1, $2, $3, current_timestamp)
           ON CONFLICT DO NOTHING;`,
          [groupId, m.value, tenantId]
        );
        members.push({ user_id: m.value, name: m.display || '' });
      }
    }

    return formatScimGroup(res.rows[0], members);
  });
}
