import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { createTicketFromFailedChecklist } from '@/src/lib/routines';

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
    const ticket = await createTicketFromFailedChecklist(auth.tenantId, id, {
      id: auth.userId,
      name: auth.role ? `${auth.role} User` : 'Staff',
    });

    return NextResponse.json(
      {
        message: 'Repair ticket created from failed checklist item successfully',
        ticket,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Ticket From Checklist Error:', error);
    if (error.message.includes('already been created')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.message === 'Checklist item not found') {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
