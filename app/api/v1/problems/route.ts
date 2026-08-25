import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  listProblems,
  createProblem,
  CreateProblemSchema,
} from '@/src/lib/problems';

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
    const search = searchParams.get('search') || undefined;
    const isKnownError = searchParams.has('is_known_error')
      ? searchParams.get('is_known_error') === 'true'
      : undefined;

    const problems = await listProblems(auth.tenantId, {
      status,
      category,
      search,
      is_known_error: isKnownError,
    });

    return NextResponse.json({ problems }, { status: 200 });
  } catch (error: any) {
    console.error('List Problems Error:', error);
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
    const parsed = CreateProblemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const problem = await createProblem(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Problem record created successfully',
        problem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Problem Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
