import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { dispatchWebhookEvent } from '@/src/lib/webhooks';

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const body: any = await req.json().catch(() => ({}));
    const eventType = body?.event || 'ticket.created';
    const data = body?.data || { test: true, message: 'Test webhook event delivery' };

    const logs = await dispatchWebhookEvent(auth.tenantId, eventType, data);

    return NextResponse.json(
      {
        message: `Dispatched event ${eventType} to ${logs.length} subscriptions`,
        deliveries: logs,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Test Dispatch Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
