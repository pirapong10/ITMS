import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  getTenantBusinessHoursSettings,
  updateTenantBusinessHoursSettings,
  UpdateBusinessHoursSettingsSchema,
} from '@/src/lib/timezone';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const settings = await getTenantBusinessHoursSettings(auth.tenantId);
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    console.error('Get Business Hours Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = UpdateBusinessHoursSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const settings = await updateTenantBusinessHoursSettings(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Business hours and timezone updated successfully',
        settings,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update Business Hours Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
