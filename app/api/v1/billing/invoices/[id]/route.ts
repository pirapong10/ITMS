import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { getInvoiceById } from '@/src/lib/billing';

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
    const invoice = await getInvoiceById(auth.tenantId, id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error: any) {
    console.error('Get Invoice Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
