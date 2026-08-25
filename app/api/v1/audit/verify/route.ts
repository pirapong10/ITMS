import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { verifyAuditChain } from '@/src/lib/audit';

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const verification = await verifyAuditChain(auth.tenantId);
    return NextResponse.json(verification, { status: 200 });
  } catch (error: any) {
    console.error('Verify Audit Chain Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
