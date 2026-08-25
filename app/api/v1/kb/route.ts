import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  listArticles,
  createArticle,
  CreateArticleSchema,
} from '@/src/lib/knowledge';

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
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const visibility = searchParams.get('visibility') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const search = searchParams.get('search') || undefined;

    const articles = await listArticles(auth.tenantId, {
      status,
      category,
      visibility,
      tag,
      search,
    });

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error: any) {
    console.error('List KB Articles Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = CreateArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const article = await createArticle(auth.tenantId, {
      ...parsed.data,
      author_id: parsed.data.author_id || auth.userId,
    });

    return NextResponse.json(
      {
        message: 'Knowledge article created successfully',
        article,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create KB Article Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
