import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { queryAuditLogs } from '@/src/lib/audit';

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
    const resource_type = searchParams.get('resource_type') || undefined;
    const action = searchParams.get('action') || undefined;
    const actor_id = searchParams.get('actor_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    const result = await queryAuditLogs(auth.tenantId, {
      resource_type,
      action,
      actor_id,
      limit,
      offset,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Query Audit Logs Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
