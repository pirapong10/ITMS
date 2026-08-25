import { NextResponse } from 'next/server';
import {
  processSsoCallback,
  SsoCallbackSchema,
} from '@/src/lib/sso';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || req.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant identifier required for SSO callback' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = SsoCallbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await processSsoCallback(tenantId, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('SSO Callback Error:', error);
    if (error.message.includes('not enabled') || error.message.includes('disabled')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
