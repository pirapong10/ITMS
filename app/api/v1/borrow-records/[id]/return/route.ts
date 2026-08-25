import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  returnBorrowRecord,
  ReturnBorrowRecordSchema,
} from '@/src/lib/routines';

interface RouteContext {
  params: Promise<{ id: string }>;
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
    const parsed = ReturnBorrowRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const record = await returnBorrowRecord(auth.tenantId, id, parsed.data);
    return NextResponse.json(
      {
        message: 'Equipment returned successfully',
        record,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Return Borrow Record Error:', error);
    if (error.message === 'Borrow record not found') {
      return NextResponse.json({ error: 'Borrow record not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
