import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  listDsarRequests,
  createDsarRequest,
  CreateDsarSchema,
} from '@/src/lib/privacy';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const request_type = searchParams.get('request_type') || undefined;

    const requests = await listDsarRequests(auth.tenantId, {
      status,
      request_type,
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error: any) {
    console.error('List DSAR Requests Error:', error);
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
    const parsed = CreateDsarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const request = await createDsarRequest(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'DSAR request registered successfully',
        request,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create DSAR Request Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
