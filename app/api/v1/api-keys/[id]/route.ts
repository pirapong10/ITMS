import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { revokeApiKey } from '@/src/lib/api-keys';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const success = await revokeApiKey(auth.tenantId, id);

    if (!success) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API Key revoked successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Revoke API Key Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
