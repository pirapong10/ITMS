import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { getAssetLifecycle, getAssetById } from '@/src/lib/assets';

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
    const asset = await getAssetById(auth.tenantId, id);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const timeline = await getAssetLifecycle(auth.tenantId, id);

    return NextResponse.json(
      {
        asset_id: asset.asset.id,
        asset_tag: asset.asset.asset_tag,
        timeline,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get Asset Lifecycle Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
