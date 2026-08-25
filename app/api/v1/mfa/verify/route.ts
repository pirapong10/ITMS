import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  verifyAndEnableMfa,
  VerifyMfaSchema,
} from '@/src/lib/mfa';

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = VerifyMfaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await verifyAndEnableMfa(auth.tenantId, auth.userId, parsed.data.code);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Verify MFA Error:', error);
    if (error.message.includes('Invalid TOTP')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
