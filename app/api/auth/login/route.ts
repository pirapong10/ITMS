import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/src/lib/db';
import { verifyPassword, signJwt } from '@/src/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  subdomain: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    const { email, password, subdomain } = result.data;
    
    // Find tenant by subdomain
    const tenantRes = await pool.query('SELECT id FROM tenants WHERE subdomain = $1', [subdomain]);
    if (tenantRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials or subdomain' }, { status: 401 });
    }
    
    const tenantId = tenantRes.rows[0].id;
    
    // Find user within that tenant
    // Since this is login, we can fetch the user directly without switching roles if we query with tenant_id filter.
    // However, to be safe, we just use standard query since the pool runs as superuser,
    // we explicitly filter by tenant_id.
    const userRes = await pool.query(
      'SELECT id, role, password_hash FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );
    
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials or subdomain' }, { status: 401 });
    }
    
    const user = userRes.rows[0];
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials or subdomain' }, { status: 401 });
    }
    
    // Generate JWT
    const token = signJwt({
      userId: user.id,
      tenantId: tenantId,
      role: user.role
    });
    
    const response = NextResponse.json({ message: 'Login successful' }, { status: 200 });
    
    // Set HttpOnly cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });
    
    return response;
    
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
