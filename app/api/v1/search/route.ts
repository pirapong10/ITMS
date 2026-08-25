import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { globalTenantSearch } from '@/src/lib/search';

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
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const typesParam = searchParams.get('types');
    const types = typesParam ? typesParam.split(',').map((t) => t.trim()) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const result = await globalTenantSearch(auth.tenantId, query, {
      types,
      limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Global Search Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
