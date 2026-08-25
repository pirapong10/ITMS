import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  isSuperAdmin,
  setTenantStatus,
  UpdateTenantStatusSchema,
} from '@/src/lib/super-admin';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !isSuperAdmin(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = UpdateTenantStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const success = await setTenantStatus(id, parsed.data.status);
    if (!success) {
      return NextResponse.json({ error: 'Tenant subscription not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: `Tenant status updated to ${parsed.data.status}`,
        success,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Super Admin Set Tenant Status Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
