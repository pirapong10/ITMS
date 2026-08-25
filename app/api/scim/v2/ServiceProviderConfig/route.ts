import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'https://docs.itsm.antigravity.ai/scim',
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        name: 'OAuth Bearer Token',
        description: 'Authentication Scheme using the OAuth Bearer Token Standard',
        specUri: 'http://www.rfc-editor.org/info/rfc6750',
        type: 'oauthbearertoken',
        primary: true,
      },
    ],
  };

  return NextResponse.json(config, {
    status: 200,
    headers: { 'Content-Type': 'application/scim+json' },
  });
}
