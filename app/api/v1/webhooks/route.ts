import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  listWebhookSubscriptions,
  createWebhookSubscription,
  CreateWebhookSchema,
} from '@/src/lib/webhooks';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const webhooks = await listWebhookSubscriptions(auth.tenantId);
    return NextResponse.json({ webhooks }, { status: 200 });
  } catch (error: any) {
    console.error('List Webhook Subscriptions Error:', error);
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
    const parsed = CreateWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const subscription = await createWebhookSubscription(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Webhook subscription created successfully',
        subscription,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Webhook Subscription Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
