import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  recordArticleFeedback,
  FeedbackSchema,
} from '@/src/lib/knowledge';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
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
    const parsed = FeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await recordArticleFeedback(auth.tenantId, id, {
      ...parsed.data,
      user_id: parsed.data.user_id || auth.userId,
    });

    return NextResponse.json(
      {
        message: 'Feedback recorded successfully',
        result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Record KB Feedback Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
