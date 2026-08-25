import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  getArticleById,
  updateArticle,
  deleteArticle,
  UpdateArticleSchema,
} from '@/src/lib/knowledge';

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
    const { searchParams } = new URL(req.url);
    const incView = searchParams.get('inc_view') === 'true';

    const article = await getArticleById(auth.tenantId, id, incView);

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ article }, { status: 200 });
  } catch (error: any) {
    console.error('Get KB Article Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = UpdateArticleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const article = await updateArticle(auth.tenantId, id, parsed.data);
    return NextResponse.json(
      {
        message: 'Article updated successfully',
        article,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update KB Article Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
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
    const success = await deleteArticle(auth.tenantId, id);

    if (!success) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Article deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete KB Article Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
