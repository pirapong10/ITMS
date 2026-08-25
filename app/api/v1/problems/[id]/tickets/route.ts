import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { getProblemLinkedTickets } from '@/src/lib/problems';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const tickets = await getProblemLinkedTickets(auth.tenantId, id);

    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error: any) {
    console.error('Get Problem Tickets Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
