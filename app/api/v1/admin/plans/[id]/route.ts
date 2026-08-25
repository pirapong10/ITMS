import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  isSuperAdmin,
  updateGlobalPlan,
  deleteGlobalPlan,
  UpdateGlobalPlanSchema,
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
    const parsed = UpdateGlobalPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const plan = await updateGlobalPlan(id, parsed.data);
    return NextResponse.json(
      {
        message: 'Global plan updated successfully',
        plan,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Super Admin Update Plan Error:', error);
    if (error.message === 'Plan not found') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !isSuperAdmin(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const deleted = await deleteGlobalPlan(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Global plan deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Super Admin Delete Plan Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
