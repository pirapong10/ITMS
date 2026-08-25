import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { unallocateSeat } from '@/src/lib/licenses';

interface RouteContext {
  params: Promise<{ id: string; allocId: string }>;
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

    const { id, allocId } = await context.params;
    const success = await unallocateSeat(auth.tenantId, id, allocId);

    return NextResponse.json(
      {
        message: 'Seat unallocated successfully',
        success,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unallocate Seat Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
