import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  allocateSeat,
  AllocateSeatSchema,
} from '@/src/lib/licenses';

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
    const body = await req.json();
    const parsed = AllocateSeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const allocation = await allocateSeat(auth.tenantId, id, parsed.data);

    return NextResponse.json(
      {
        message: 'Seat allocated successfully',
        allocation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Allocate Seat Error:', error);
    if (error.message.includes('Quota Exceeded')) {
      return NextResponse.json(
        { error: 'Quota Exceeded', message: error.message },
        { status: 409 }
      );
    }
    if (error.message === 'License not found') {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
