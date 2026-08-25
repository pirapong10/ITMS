import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import { searchKnownErrorDatabase } from '@/src/lib/problems';

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
    const q = searchParams.get('q') || searchParams.get('search') || undefined;

    const knownErrors = await searchKnownErrorDatabase(auth.tenantId, q);
    return NextResponse.json({ knownErrors }, { status: 200 });
  } catch (error: any) {
    console.error('KEDB Search Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
