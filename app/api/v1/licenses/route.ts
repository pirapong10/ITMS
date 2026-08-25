import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  createLicense,
  listLicenses,
  CreateLicenseSchema,
  LicenseFilters,
} from '@/src/lib/licenses';

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
    const filters: LicenseFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      license_type: searchParams.get('license_type') || undefined,
      vendor: searchParams.get('vendor') || undefined,
      page: searchParams.has('page')
        ? parseInt(searchParams.get('page')!, 10)
        : 1,
      limit: searchParams.has('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 20,
    };

    const result = await listLicenses(auth.tenantId, filters);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('List Licenses Error:', error);
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
    const parsed = CreateLicenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const license = await createLicense(auth.tenantId, parsed.data);

    return NextResponse.json(
      {
        message: 'License created successfully',
        license,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create License Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
