import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  getTenantSsoConfig,
  saveTenantSsoConfig,
  SaveSsoConfigSchema,
} from '@/src/lib/sso';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const config = await getTenantSsoConfig(auth.tenantId);
    return NextResponse.json({ config }, { status: 200 });
  } catch (error: any) {
    console.error('Get SSO Config Error:', error);
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

    const body = await req.json();
    const parsed = SaveSsoConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const config = await saveTenantSsoConfig(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'SSO configuration saved successfully',
        config,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Save SSO Config Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
