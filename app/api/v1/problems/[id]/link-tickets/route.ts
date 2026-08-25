import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  linkTicketsToProblem,
  LinkTicketsSchema,
} from '@/src/lib/problems';

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
    const parsed = LinkTicketsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const linkedCount = await linkTicketsToProblem(auth.tenantId, id, parsed.data.ticket_ids);
    return NextResponse.json(
      {
        message: `Successfully linked ${linkedCount} tickets to problem ${id}`,
        linkedCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Link Tickets Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
