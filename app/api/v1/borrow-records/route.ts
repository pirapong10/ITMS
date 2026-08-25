import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  createBorrowRecord,
  listBorrowRecords,
  CreateBorrowRecordSchema,
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
    const filters = {
      status: searchParams.get('status') || undefined,
      asset_id: searchParams.get('asset_id') || undefined,
    };

    const records = await listBorrowRecords(auth.tenantId, filters);
    return NextResponse.json({ records }, { status: 200 });
  } catch (error: any) {
    console.error('List Borrow Records Error:', error);
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
    const parsed = CreateBorrowRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const record = await createBorrowRecord(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Borrow record created successfully',
        record,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Borrow Record Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
