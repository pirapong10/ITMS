import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { cancelSubscription } from '@/src/lib/billing';

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const subscription = await cancelSubscription(auth.tenantId);
    return NextResponse.json(
      {
        message: 'Subscription scheduled for cancellation at period end',
        subscription,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Cancel Subscription Error:', error);
    if (error.message.includes('No active subscription')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
