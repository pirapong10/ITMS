import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  getTenantSubscription,
  subscribeOrUpgradePlan,
  SubscribePlanSchema,
} from '@/src/lib/billing';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const data = await getTenantSubscription(auth.tenantId);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('Get Subscription Error:', error);
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
    const parsed = SubscribePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await subscribeOrUpgradePlan(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Subscription updated and invoice generated successfully',
        ...result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Subscribe Plan Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
