import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  listChangeRequests,
  createChangeRequest,
  CreateChangeSchema,
} from '@/src/lib/changes';

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
    const change_type = searchParams.get('change_type') || undefined;
    const risk_level = searchParams.get('risk_level') || undefined;
    const search = searchParams.get('search') || undefined;

    const changes = await listChangeRequests(auth.tenantId, {
      status,
      change_type,
      risk_level,
      search,
    });

    return NextResponse.json({ changes }, { status: 200 });
  } catch (error: any) {
    console.error('List Change Requests Error:', error);
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
    const parsed = CreateChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const change = await createChangeRequest(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Change request created successfully',
        change,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Change Request Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
