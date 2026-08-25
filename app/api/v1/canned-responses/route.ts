import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  listCannedResponses,
  createCannedResponse,
  CannedResponseSchema,
} from '@/src/lib/tickets';

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

    const responses = await listCannedResponses(auth.tenantId, category);
    return NextResponse.json({ canned_responses: responses }, { status: 200 });
  } catch (error: any) {
    console.error('List Canned Responses Error:', error);
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
    const parsed = CannedResponseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const response = await createCannedResponse(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Canned response created successfully',
        canned_response: response,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Canned Response Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
