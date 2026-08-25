import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { getDsarRequestById } from '@/src/lib/privacy';

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
    const request = await getDsarRequestById(auth.tenantId, id);

    if (!request) {
      return NextResponse.json({ error: 'DSAR request not found' }, { status: 404 });
    }

    return NextResponse.json({ request }, { status: 200 });
  } catch (error: any) {
    console.error('Get DSAR Request Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
