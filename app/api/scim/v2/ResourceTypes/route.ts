import { NextResponse } from 'next/server';

export async function GET() {
  const resourceTypes = [
    {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
      id: 'User',
      name: 'User',
      endpoint: '/api/scim/v2/Users',
      description: 'User Account',
      schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
    },
    {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
      id: 'Group',
      name: 'Group',
      endpoint: '/api/scim/v2/Groups',
      description: 'Group',
      schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
    },
  ];

  return NextResponse.json(resourceTypes, {
    status: 200,
    headers: { 'Content-Type': 'application/scim+json' },
  });
}
