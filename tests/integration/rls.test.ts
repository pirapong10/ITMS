import { query, withTenantTransaction, closePool } from '../../src/lib/db';
import { v4 as uuidv4 } from 'uuid'; // need to install uuid

describe('Row-Level Security (RLS) Isolation', () => {
  let tenantAId: string;
  let tenantBId: string;

  beforeAll(async () => {
    // We assume the DB is clean and migrations are applied
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Company A', 'company-a']
    );
    tenantAId = resA.rows[0].id;

    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Company B', 'company-b']
    );
    tenantBId = resB.rows[0].id;

    // Seed some users for Tenant A using Super Admin (no tenant set) 
    // Actually, as SuperAdmin (postgres), we can insert directly. Wait, if we use query(), it's bypassing RLS if it's superuser, 
    // but itsm_admin might not be superuser or BYPASS RLS. We should test it.
    // Let's insert via withTenantTransaction
    await withTenantTransaction(tenantAId, async (client) => {
      await client.query(
        `INSERT INTO users (tenant_id, name, email, role) VALUES ($1, $2, $3, $4)`,
        [tenantAId, 'User A', 'user_a@company-a.com', 'Admin']
      );
    });

    await withTenantTransaction(tenantBId, async (client) => {
      await client.query(
        `INSERT INTO users (tenant_id, name, email, role) VALUES ($1, $2, $3, $4)`,
        [tenantBId, 'User B', 'user_b@company-b.com', 'Admin']
      );
    });
  });

  afterAll(async () => {
    // Clean up
    await query(`DELETE FROM tenants WHERE id IN ($1, $2)`, [tenantAId, tenantBId]);
    await closePool();
  });

  it('Tenant A should only see Tenant A users', async () => {
    await withTenantTransaction(tenantAId, async (client) => {
      const result = await client.query('SELECT * FROM users');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe('user_a@company-a.com');
      expect(result.rows[0].tenant_id).toBe(tenantAId);
    });
  });

  it('Tenant B should only see Tenant B users', async () => {
    await withTenantTransaction(tenantBId, async (client) => {
      const result = await client.query('SELECT * FROM users');
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe('user_b@company-b.com');
      expect(result.rows[0].tenant_id).toBe(tenantBId);
    });
  });

  it('Cannot insert user for Tenant B while in Tenant A context', async () => {
    await withTenantTransaction(tenantAId, async (client) => {
      await expect(
        client.query(
          `INSERT INTO users (tenant_id, name, email, role) VALUES ($1, $2, $3, $4)`,
          [tenantBId, 'Malicious User', 'hacker@company-b.com', 'Admin']
        )
      ).rejects.toThrow(); // RLS should block this insert due to WITH CHECK policy
    });
  });
});
