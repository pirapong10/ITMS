import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  createPmSchedule,
  listPmSchedules,
  CreatePmScheduleSchema,
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

    const schedules = await listPmSchedules(auth.tenantId);
    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error: any) {
    console.error('List PM Schedules Error:', error);
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
    const parsed = CreatePmScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const schedule = await createPmSchedule(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'PM Schedule created successfully',
        schedule,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create PM Schedule Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
