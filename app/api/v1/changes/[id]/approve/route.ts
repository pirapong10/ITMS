import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  recordCabDecision,
  CabDecisionSchema,
} from '@/src/lib/changes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId || !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const parsed = CabDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const change = await recordCabDecision(
      auth.tenantId,
      id,
      auth.userId,
      parsed.data
    );

    return NextResponse.json(
      {
        message: `Decision recorded for change ${id}`,
        change,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Record CAB Decision Error:', error);
    if (error.message.includes('not assigned')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
