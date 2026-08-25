import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  getChangeRequestById,
  updateChangeRequest,
  UpdateChangeSchema,
} from '@/src/lib/changes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const change = await getChangeRequestById(auth.tenantId, id);

    if (!change) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    return NextResponse.json({ change }, { status: 200 });
  } catch (error: any) {
    console.error('Get Change Request Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = UpdateChangeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const change = await updateChangeRequest(auth.tenantId, id, parsed.data);
    return NextResponse.json(
      {
        message: 'Change request updated successfully',
        change,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update Change Request Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
