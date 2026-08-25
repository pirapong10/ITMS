import { NextResponse } from 'next/server';
import {
  processPaymentWebhook,
  WebhookEventSchema,
} from '@/src/lib/billing';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = WebhookEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid Webhook Payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await processPaymentWebhook(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Process Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
