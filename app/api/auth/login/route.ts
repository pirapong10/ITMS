import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/src/lib/db';
import { verifyPassword, signJwt } from '@/src/lib/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenant_id: z.string().optional(),
  tenantId: z.string().optional(),
  subdomain: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'ข้อมูลสำหรับเข้าสู่ระบบไม่ถูกต้อง (Invalid input format)' }, { status: 400 });
    }
    
    const { email, password } = result.data;
    const tenantIdentifier = result.data.tenant_id || result.data.tenantId || result.data.subdomain;

    let tenantId: string | null = null;

    if (tenantIdentifier) {
      // Check if identifier is a UUID or a subdomain
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdentifier);
      
      let tenantRes;
      if (isUuid) {
        tenantRes = await pool.query('SELECT id FROM tenants WHERE id = $1 OR subdomain = $2', [tenantIdentifier, tenantIdentifier]);
      } else {
        tenantRes = await pool.query('SELECT id FROM tenants WHERE subdomain = $1', [tenantIdentifier]);
      }

      if (tenantRes.rows.length > 0) {
        tenantId = tenantRes.rows[0].id;
      }
    }

    // Find user
    let userQuery = 'SELECT id, tenant_id, name, email, role, password_hash, mfa_enabled FROM users WHERE email = $1';
    const queryParams: any[] = [email];

    if (tenantId) {
      userQuery += ' AND tenant_id = $2';
      queryParams.push(tenantId);
    }

    const userRes = await pool.query(userQuery, queryParams);
    
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (Invalid email or password)' }, { status: 401 });
    }
    
    const user = userRes.rows[0];
    tenantId = user.tenant_id;
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (Invalid email or password)' }, { status: 401 });
    }

    // Check if MFA is enabled
    if (user.mfa_enabled) {
      return NextResponse.json({
        mfa_required: true,
        user_id: user.id,
        message: 'กรุณากรอกรหัสยืนยัน MFA 6 หลัก (MFA OTP required)'
      }, { status: 200 });
    }
    
    // Generate JWT
    const token = signJwt({
      userId: user.id,
      tenantId: tenantId as string,
      role: user.role
    });
    
    const response = NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      tenant_id: tenantId
    }, { status: 200 });
    
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
