import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { isSuperAdmin, listAllTenants } from '@/src/lib/super-admin';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !isSuperAdmin(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;

    const tenants = await listAllTenants({ search });
    return NextResponse.json({ tenants }, { status: 200 });
  } catch (error: any) {
    console.error('Super Admin List Tenants Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
