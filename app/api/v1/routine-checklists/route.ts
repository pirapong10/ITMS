import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  createRoutineChecklist,
  listRoutineChecklists,
  CreateRoutineChecklistSchema,
} from '@/src/lib/routines';

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
    const category = searchParams.get('category') || undefined;

    const checklists = await listRoutineChecklists(auth.tenantId, category);
    return NextResponse.json({ checklists }, { status: 200 });
  } catch (error: any) {
    console.error('List Routine Checklists Error:', error);
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
    const parsed = CreateRoutineChecklistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const checklist = await createRoutineChecklist(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Routine checklist item recorded successfully',
        checklist,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Routine Checklist Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
