import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  submitChangeForCabApproval,
  SubmitCabSchema,
} from '@/src/lib/changes';

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
    const parsed = SubmitCabSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const change = await submitChangeForCabApproval(auth.tenantId, id, parsed.data);
    return NextResponse.json(
      {
        message: `Change ${id} submitted for CAB approval`,
        change,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Submit CAB Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
