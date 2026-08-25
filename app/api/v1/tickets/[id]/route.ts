import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  getTicketById,
  updateTicket,
  UpdateTicketSchema,
} from '@/src/lib/tickets';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
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
    const ticketData = await getTicketById(auth.tenantId, id);

    if (!ticketData) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ticketData, { status: 200 });
  } catch (error: any) {
    console.error('Get Ticket Detail Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const parsed = UpdateTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updatedTicket = await updateTicket(
      auth.tenantId,
      id,
      parsed.data,
      {
        id: auth.userId || 'system',
        name: auth.role ? `${auth.role} User` : 'Staff',
      }
    );

    return NextResponse.json(
      {
        message: 'Ticket updated successfully',
        ticket: updatedTicket,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update Ticket Error:', error);
    if (error.message === 'Ticket not found') {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
