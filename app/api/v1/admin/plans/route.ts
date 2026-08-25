import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  isSuperAdmin,
  createGlobalPlan,
  CreateGlobalPlanSchema,
} from '@/src/lib/super-admin';
import { getSubscriptionPlans } from '@/src/lib/billing';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !isSuperAdmin(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const plans = await getSubscriptionPlans();
    return NextResponse.json({ plans }, { status: 200 });
  } catch (error: any) {
    console.error('Super Admin List Plans Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !isSuperAdmin(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateGlobalPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const plan = await createGlobalPlan(parsed.data);
    return NextResponse.json(
      {
        message: 'Global plan created successfully',
        plan,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Super Admin Create Plan Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
