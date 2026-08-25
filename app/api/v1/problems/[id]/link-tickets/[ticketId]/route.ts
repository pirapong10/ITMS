import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { unlinkTicketFromProblem } from '@/src/lib/problems';

interface RouteContext {
  params: Promise<{ id: string; ticketId: string }>;
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

    const { id, ticketId } = await context.params;
    const success = await unlinkTicketFromProblem(auth.tenantId, id, ticketId);

    if (!success) {
      return NextResponse.json(
        { error: 'Link between problem and ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: `Ticket ${ticketId} unlinked from problem ${id}` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unlink Ticket Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
