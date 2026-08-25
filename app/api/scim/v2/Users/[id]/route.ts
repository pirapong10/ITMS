import { NextResponse } from 'next/server';
import {
  authenticateScimRequest,
  scimGetUser,
  scimUpdateUser,
  scimPatchUser,
  scimDeleteUser,
  SCIM_ERROR_SCHEMA,
} from '@/src/lib/scim';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const user = await scimGetUser(tenantId, id);

    if (!user) {
      return NextResponse.json(
        {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '404',
          detail: `User with id ${id} not found`,
        },
        { status: 404, headers: { 'Content-Type': 'application/scim+json' } }
      );
    }

    return NextResponse.json(user, {
      status: 200,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error: any) {
    console.error('SCIM Get User Error:', error);
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

export async function PUT(req: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const body = await req.json();
    const user = await scimUpdateUser(tenantId, id, body);

    return NextResponse.json(user, {
      status: 200,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error: any) {
    console.error('SCIM Put User Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { schemas: [SCIM_ERROR_SCHEMA], status: '404', detail: error.message },
        { status: 404, headers: { 'Content-Type': 'application/scim+json' } }
      );
    }
    return NextResponse.json(
      { schemas: [SCIM_ERROR_SCHEMA], status: '400', detail: error.message },
      { status: 400, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }
}

export async function PATCH(req: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const body = await req.json();
    const user = await scimPatchUser(tenantId, id, body);

    return NextResponse.json(user, {
      status: 200,
      headers: { 'Content-Type': 'application/scim+json' },
    });
  } catch (error: any) {
    console.error('SCIM Patch User Error:', error);
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { schemas: [SCIM_ERROR_SCHEMA], status: '404', detail: error.message },
        { status: 404, headers: { 'Content-Type': 'application/scim+json' } }
      );
    }
    return NextResponse.json(
      { schemas: [SCIM_ERROR_SCHEMA], status: '400', detail: error.message },
      { status: 400, headers: { 'Content-Type': 'application/scim+json' } }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const success = await scimDeleteUser(tenantId, id);

    if (!success) {
      return NextResponse.json(
        {
          schemas: [SCIM_ERROR_SCHEMA],
          status: '404',
          detail: `User with id ${id} not found`,
        },
        { status: 404, headers: { 'Content-Type': 'application/scim+json' } }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('SCIM Delete User Error:', error);
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
