import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { disableUserMfa } from '@/src/lib/mfa';

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const success = await disableUserMfa(auth.tenantId, auth.userId);
    return NextResponse.json(
      {
        message: 'MFA has been disabled for this user',
        success,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Disable MFA Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
