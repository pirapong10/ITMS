import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { setupUserMfa } from '@/src/lib/mfa';
import { query } from '@/src/lib/db';

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const userRes = await query(`SELECT email FROM users WHERE id = $1`, [auth.userId]);
    const email = userRes.rows[0]?.email || 'user@example.com';

    const result = await setupUserMfa(auth.tenantId, auth.userId, email);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Setup MFA Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
