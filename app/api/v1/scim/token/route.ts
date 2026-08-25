import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { createTenantScimToken } from '@/src/lib/scim';
import { query } from '@/src/lib/db';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const res = await query(
      `SELECT id, name, is_active, created_at, expires_at 
       FROM tenant_scim_tokens 
       WHERE tenant_id = $1 AND is_active = true 
       ORDER BY created_at DESC`,
      [auth.tenantId]
    );

    return NextResponse.json({ tokens: res.rows }, { status: 200 });
  } catch (error: any) {
    console.error('List SCIM Tokens Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const body: any = await req.json().catch(() => ({}));
    const name = body?.name || 'SCIM 2.0 Integration Token';

    const token = await createTenantScimToken(auth.tenantId, name);
    return NextResponse.json(
      {
        message: 'SCIM Bearer Token created successfully. Please copy and store securely.',
        token,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create SCIM Token Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
