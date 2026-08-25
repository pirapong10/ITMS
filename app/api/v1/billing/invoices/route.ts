import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { listInvoices } from '@/src/lib/billing';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const invoices = await listInvoices(auth.tenantId);
    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error: any) {
    console.error('List Invoices Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
