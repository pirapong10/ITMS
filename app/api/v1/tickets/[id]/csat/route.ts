import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  submitCsat,
  CsatSchema,
} from '@/src/lib/tickets';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: Request,
  context: RouteContext
) {
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
    const parsed = CsatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const ticket = await submitCsat(auth.tenantId, id, parsed.data);

    return NextResponse.json(
      {
        message: 'CSAT feedback recorded successfully',
        ticket,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Submit CSAT Error:', error);
    if (error.message === 'Ticket not found') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
