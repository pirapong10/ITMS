import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { processDsarErasure } from '@/src/lib/privacy';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const request = await processDsarErasure(auth.tenantId, id);

    return NextResponse.json(
      {
        message: 'GDPR Right to be Forgotten / Erasure executed successfully',
        request,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Process DSAR Erasure Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
