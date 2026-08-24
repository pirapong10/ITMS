import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  console.log('Seeding database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create a Master Tenant
    const masterTenantRes = await client.query(`
      INSERT INTO tenants (company_name, subdomain) 
      VALUES ($1, $2) 
      ON CONFLICT (subdomain) DO NOTHING
      RETURNING id
    `, ['Master SaaS Admin', 'master']);
    
    let masterTenantId = masterTenantRes.rows[0]?.id;

    if (!masterTenantId) {
       const res = await client.query(`SELECT id FROM tenants WHERE subdomain = 'master'`);
       masterTenantId = res.rows[0].id;
    }

    // 2. Create Super Admin User (bypassing RLS by not setting app.current_tenant_id)
    await client.query(`
      INSERT INTO users (tenant_id, name, email, role) 
      VALUES ($1, $2, $3, $4)
    `, [masterTenantId, 'Super Admin', 'admin@saas-platform.com', 'SuperAdmin']);

    // 3. Create Sample Customer Tenant
    const sampleTenantRes = await client.query(`
      INSERT INTO tenants (company_name, subdomain) 
      VALUES ($1, $2) 
      ON CONFLICT (subdomain) DO NOTHING
      RETURNING id
    `, ['Acme Corp', 'acme']);
    
    let sampleTenantId = sampleTenantRes.rows[0]?.id;

    if (!sampleTenantId) {
       const res = await client.query(`SELECT id FROM tenants WHERE subdomain = 'acme'`);
       sampleTenantId = res.rows[0].id;
    }

    // Insert user into Acme Corp
    await client.query(`
      INSERT INTO users (tenant_id, name, email, role) 
      VALUES ($1, $2, $3, $4)
    `, [sampleTenantId, 'John Doe', 'john.doe@acme.com', 'Admin']);

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
