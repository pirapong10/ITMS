import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  createAsset,
  listAssets,
  CreateAssetSchema,
  AssetFilters,
} from '@/src/lib/assets';

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
    const filters: AssetFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      department: searchParams.get('department') || undefined,
      warranty_status: (searchParams.get('warranty_status') as any) || undefined,
      page: searchParams.has('page')
        ? parseInt(searchParams.get('page')!, 10)
        : 1,
      limit: searchParams.has('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : 20,
    };

    const result = await listAssets(auth.tenantId, filters);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('List Assets Error:', error);
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
    const parsed = CreateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const asset = await createAsset(auth.tenantId, parsed.data, {
      id: auth.userId,
      name: auth.role ? `${auth.role} User` : 'Staff',
    });

    return NextResponse.json(
      {
        message: 'Asset created successfully',
        asset,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Asset Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
