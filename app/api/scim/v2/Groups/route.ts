import { NextResponse } from 'next/server';
import {
  authenticateScimRequest,
  scimListGroups,
  scimCreateGroup,
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

    const list = await scimListGroups(tenantId);
    return NextResponse.json(list, {
      status: 200,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error: any) {
    console.error('SCIM List Groups Error:', error);
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
    const group = await scimCreateGroup(tenantId, body);

    return NextResponse.json(group, {
      status: 201,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error: any) {
    console.error('SCIM Create Group Error:', error);
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
