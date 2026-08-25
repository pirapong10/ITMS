import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  convertProblemToArticle,
  ConvertProblemSchema,
} from '@/src/lib/knowledge';

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
    const parsed = ConvertProblemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const article = await convertProblemToArticle(auth.tenantId, {
      ...parsed.data,
      author_id: parsed.data.author_id || auth.userId,
    });

    return NextResponse.json(
      {
        message: 'Draft KB article generated from problem RCA',
        article,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Convert Problem to KB Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
