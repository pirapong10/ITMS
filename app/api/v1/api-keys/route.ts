import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  listApiKeys,
  createApiKey,
  CreateApiKeySchema,
} from '@/src/lib/api-keys';

export async function GET(req: Request) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const apiKeys = await listApiKeys(auth.tenantId);
    return NextResponse.json({ apiKeys }, { status: 200 });
  } catch (error: any) {
    console.error('List API Keys Error:', error);
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
    const parsed = CreateApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await createApiKey(auth.tenantId, parsed.data);
    return NextResponse.json(
      {
        message: 'API Key created successfully. Copy and store raw_key securely.',
        apiKey: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create API Key Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
