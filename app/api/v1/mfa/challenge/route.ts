import { NextResponse } from 'next/server';
import {
  validateMfaChallenge,
  MfaChallengeSchema,
} from '@/src/lib/mfa';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || req.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant identifier required for MFA challenge' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = MfaChallengeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await validateMfaChallenge(tenantId, parsed.data.userId, parsed.data.code);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Validate MFA Challenge Error:', error);
    if (error.message.includes('Invalid MFA') || error.message.includes('No verified MFA')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
