import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { getAssetById } from '@/src/lib/assets';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const assetData = await getAssetById(auth.tenantId, id);

    if (!assetData) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        asset_id: assetData.asset.id,
        asset_tag: assetData.asset.asset_tag,
        name: assetData.asset.name,
        depreciation: assetData.depreciation_info,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get Asset Depreciation Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
