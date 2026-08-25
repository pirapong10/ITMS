import { NextResponse } from 'next/server';
import {
  authenticateScimRequest,
  scimListUsers,
  scimCreateUser,
  SCIM_ERROR_SCHEMA,
} from '@/src/lib/scim';

export async function GET(req: Request) {
  try {
    const tenantId = await authenticateScimRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '401',
          detail: 'Unauthorized: Valid SCIM Bearer token required',
        },
        { status: 401, headers: { 'Content-Type': 'application/scim+json' } }
      );
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || undefined;
    const startIndex = searchParams.get('startIndex') ? parseInt(searchParams.get('startIndex')!, 10) : undefined;
    const count = searchParams.get('count') ? parseInt(searchParams.get('count')!, 10) : undefined;

    const list = await scimListUsers(tenantId, { filter, startIndex, count });
    return NextResponse.json(list, {
      status: 200,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error: any) {
    console.error('SCIM List Users Error:', error);
    return NextResponse.json(
      {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '500',
        detail: error.message || 'Internal Server Error',
      },
      { status: 500, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = await authenticateScimRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '401',
          detail: 'Unauthorized: Valid SCIM Bearer token required',
        },
        { status: 401, headers: { 'Content-Type': 'application/scim+json' } }
      );
    }

    const body = await req.json();
    const user = await scimCreateUser(tenantId, body);

    return NextResponse.json(user, {
      status: 201,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error: any) {
    console.error('SCIM Create User Error:', error);
    if (error.message.includes('Conflict:')) {
      return NextResponse.json(
        {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '409',
          detail: error.message,
        },
        { status: 409, headers: { 'Content-Type': 'application/scim+json' } }
      );
    }

    return NextResponse.json(
      {
        schemas: [SCIM_ERROR_SCHEMA],
        status: '400',
        detail: error.message || 'Bad Request',
      },
      { status: 400, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }
}
