import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { executePmSchedule } from '@/src/lib/routines';

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
    const schedule = await executePmSchedule(auth.tenantId, id);

    return NextResponse.json(
      {
        message: 'PM Schedule executed successfully',
        schedule,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Execute PM Schedule Error:', error);
    if (error.message === 'PM Schedule not found') {
      return NextResponse.json({ error: 'PM Schedule not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
