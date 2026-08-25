import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { searchSelfServiceKnowledgeBase } from '@/src/lib/knowledge';

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
    const query = searchParams.get('q') || searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;

    const articles = await searchSelfServiceKnowledgeBase(auth.tenantId, {
      query,
      category,
    });

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error: any) {
    console.error('Self-Service KB Search Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
