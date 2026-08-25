import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  createTicket,
  listTickets,
  CreateTicketSchema,
  TicketFilters,
} from '@/src/lib/tickets';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filters: TicketFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') || undefined,
      assigned_to: searchParams.get('assigned_to') || undefined,
      breached: searchParams.has('breached')
        ? searchParams.get('breached') === 'true'
        : undefined,
      page: searchParams.has('page')
        ? parseInt(searchParams.get('page')!, 10)
        : 1,
      limit: searchParams.has('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 20,
    };

    const result = await listTickets(auth.tenantId, filters);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('List Tickets Error:', error);
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
    const parsed = CreateTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const ticket = await createTicket(
      auth.tenantId,
      parsed.data,
      {
        id: auth.userId || 'system',
        name: parsed.data.reporter_name || 'System',
      }
    );

    return NextResponse.json(
      {
        message: 'Ticket created successfully',
        ticket,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Ticket Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
