import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const isRemoteDb =
  process.env.DATABASE_URL?.includes('supabase') ||
  process.env.DATABASE_URL?.includes('neon') ||
  process.env.DATABASE_URL?.includes('aws') ||
  process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
});

async function seed() {
  console.log('🌱 Seeding initial Enterprise ITSM data to database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Password Hash for demo users (Admin@123456)
    const defaultPasswordHash = await bcrypt.hash('Admin@123456', 10);

    // 2. Demo Tenant
    const demoTenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    await client.query(`
      INSERT INTO tenants (id, company_name, subdomain, status, default_currency, default_language, default_timezone)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE 
      SET company_name = EXCLUDED.company_name, status = EXCLUDED.status
    `, [demoTenantId, 'Enterprise Demo Corp', 'demo', 'Active', 'THB', 'th-TH', 'Asia/Bangkok']);

    // 3. Demo Users
    const users = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'IT Director Admin', email: 'admin@company.com', role: 'SuperAdmin' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Somchai Helpdesk', email: 'tech@company.com', role: 'Technician' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Kanya General User', email: 'user@company.com', role: 'User' },
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, tenant_id, name, email, role, password_hash)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE
        SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
      `, [u.id, demoTenantId, u.name, u.email, u.role, defaultPasswordHash]);
    }

    // 4. Initial IT Assets
    await client.query(`
      INSERT INTO assets (id, tenant_id, asset_tag, name, category, model, serial_number, purchase_cost, salvage_value, depreciation_rate, status, warranty_expiry)
      VALUES 
        ('AST-2026-0001', $1, 'AST-2026-0001', 'MacBook Pro 16 M3 Max', 'Hardware', 'Apple M3 Max 64GB', 'C02XYZ123456', 95000, 9500, 20.0, 'In Use', NOW() + INTERVAL '180 days'),
        ('AST-2026-0002', $1, 'AST-2026-0002', 'Dell PowerEdge R750 Server', 'Server', 'Dell R750 Rack', 'DELL-SRV-9876', 240000, 24000, 20.0, 'In Use', NOW() + INTERVAL '30 days'),
        ('AST-2026-0003', $1, 'AST-2026-0003', 'Cisco Catalyst 9300 Switch', 'Network', 'C9300-48P', 'FOC2432U19A', 120000, 12000, 20.0, 'In Use', NOW() + INTERVAL '365 days')
      ON CONFLICT (id) DO NOTHING
    `, [demoTenantId]);

    // 5. Initial Software Licenses
    await client.query(`
      INSERT INTO licenses (id, tenant_id, software_name, license_key, total_seats, allocated_seats, expiry_date)
      VALUES 
        ('LIC-2026-0001', $1, 'Microsoft 365 E5 Enterprise', 'M365-XXXX-YYYY-ZZZZ', 50, 45, NOW() + INTERVAL '300 days'),
        ('LIC-2026-0002', $1, 'Adobe Creative Cloud All Apps', 'ADOBE-XXXX-AAAA-BBBB', 20, 18, NOW() + INTERVAL '90 days'),
        ('LIC-2026-0003', $1, 'JetBrains All Products Pack', 'JB-XXXX-1234-5678', 15, 12, NOW() + INTERVAL '150 days')
      ON CONFLICT (id) DO NOTHING
    `, [demoTenantId]);

    // 6. Initial Routine PM Checklists
    await client.query(`
      INSERT INTO routine_checklists (tenant_id, category, item_name, status, remarks, checked_by)
      VALUES 
        ($1, 'Facility', 'Server Room HVAC & Temperature Daily Check', 'Pass', 'Room temp at optimal 20.5°C', 'Somchai Helpdesk'),
        ($1, 'Security', 'HQ CCTV Cameras & NVR Storage Health', 'Pass', 'All 32 cameras online and recording', 'Somchai Helpdesk')
    `, [demoTenantId]);

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully on Supabase!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
