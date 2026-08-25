import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { deleteWebhookSubscription } from '@/src/lib/webhooks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const success = await deleteWebhookSubscription(auth.tenantId, id);

    if (!success) {
      return NextResponse.json({ error: 'Webhook subscription not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Webhook subscription deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete Webhook Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
