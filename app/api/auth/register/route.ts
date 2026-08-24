import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/src/lib/db';
import { hashPassword } from '@/src/lib/auth';

const registerSchema = z.object({
  companyName: z.string().min(2),
  subdomain: z.string().min(3).max(63).regex(/^[a-z0-9-]+$/),
  userName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error }, { status: 400 });
    }
    
    const { companyName, subdomain, userName, email, password } = result.data;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // We don't use withTenantTransaction here because the tenant doesn't exist yet,
      // and this is an administrative action bypassing RLS to create the tenant.
      
      // 1. Create Tenant
      const tenantRes = await client.query(
        'INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id',
        [companyName, subdomain]
      );
      
      const tenantId = tenantRes.rows[0].id;
      
      // 2. Hash Password and Create Super Admin User
      const hashed = await hashPassword(password);
      const userRes = await client.query(
        'INSERT INTO users (tenant_id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [tenantId, userName, email, 'Super Admin', hashed]
      );
      
      const userId = userRes.rows[0].id;
      
      await client.query('COMMIT');
      
      return NextResponse.json({
        message: 'Tenant and admin user created successfully',
        tenantId,
        userId
      }, { status: 201 });
      
    } catch (e: any) {
      await client.query('ROLLBACK');
      if (e.code === '23505') { // unique violation
        return NextResponse.json({ error: 'Subdomain already exists' }, { status: 409 });
      }
      throw e;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
