import { NextResponse } from 'next/server';

export async function GET() {
  const schemas = [
    {
      id: 'urn:ietf:params:scim:schemas:core:2.0:User',
      name: 'User',
      description: 'Core User Schema',
      attributes: [
        { name: 'userName', type: 'string', multiValued: false, required: true },
        { name: 'name', type: 'complex', multiValued: false, required: false },
        { name: 'emails', type: 'complex', multiValued: true, required: true },
        { name: 'active', type: 'boolean', multiValued: false, required: false },
      ],
    },
    {
      id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
      name: 'Group',
      description: 'Core Group Schema',
      attributes: [
        { name: 'displayName', type: 'string', multiValued: false, required: true },
        { name: 'members', type: 'complex', multiValued: true, required: false },
      ],
    },
  ];

  return NextResponse.json(schemas, {
    status: 200,
    headers: { 'Content-Type': 'application/scim+json' },
  });
}
