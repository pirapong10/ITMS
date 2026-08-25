import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  getTenantI18nSettings,
  updateTenantI18nSettings,
  UpdateI18nSettingsSchema,
} from '@/src/lib/i18n';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const settings = await getTenantI18nSettings(auth.tenantId);
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    console.error('Get i18n Settings Error:', error);
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
    const parsed = UpdateI18nSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const settings = await updateTenantI18nSettings(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'Localization settings updated successfully',
        settings,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update i18n Settings Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
