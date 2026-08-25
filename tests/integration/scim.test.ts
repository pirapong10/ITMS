import { GET as getServiceProviderConfigHandler } from '../../app/api/scim/v2/ServiceProviderConfig/route';
import { GET as getResourceTypesHandler } from '../../app/api/scim/v2/ResourceTypes/route';
import { GET as getSchemasHandler } from '../../app/api/scim/v2/Schemas/route';
import { GET as listUsersHandler, POST as createUserHandler } from '../../app/api/scim/v2/Users/route';
import {
  GET as getUserHandler,
  PUT as updateUserHandler,
  PATCH as patchUserHandler,
  DELETE as deleteUserHandler,
} from '../../app/api/scim/v2/Users/[id]/route';
import { GET as listGroupsHandler, POST as createGroupHandler } from '../../app/api/scim/v2/Groups/route';
import { POST as createTokenHandler } from '../../app/api/v1/scim/token/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('SCIM 2.0 User Lifecycle Provisioning API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let adminTokenA: string;
  let scimBearerTokenA: string;
  let scimBearerTokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-scim-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['SCIM Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-scim-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['SCIM Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    adminTokenA = signJwt({
      userId: 'admin-a',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    const tokenReqA = new Request('http://localhost/api/v1/scim/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminTokenA}` },
    });
    const tokenResA = await createTokenHandler(tokenReqA);
    const tokenDataA: any = await tokenResA.json();
    scimBearerTokenA = tokenDataA.token.rawToken;

    const adminTokenB = signJwt({
      userId: 'admin-b',
      tenantId: tenantBId,
      role: 'IT Admin',
    });
    const tokenReqB = new Request('http://localhost/api/v1/scim/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminTokenB}` },
    });
    const tokenResB = await createTokenHandler(tokenReqB);
    const tokenDataB: any = await tokenResB.json();
    scimBearerTokenB = tokenDataB.token.rawToken;
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  let createdScimUserId: string;

  it('should return SCIM 2.0 metadata endpoints', async () => {
    // 1. ServiceProviderConfig
    const spcRes = await getServiceProviderConfigHandler();
    expect(spcRes.status).toBe(200);
    const spcData: any = await spcRes.json();
    expect(spcData.patch.supported).toBe(true);

    // 2. ResourceTypes
    const rtRes = await getResourceTypesHandler();
    expect(rtRes.status).toBe(200);
    const rtData: any = await rtRes.json();
    expect(rtData.length).toBe(2);

    // 3. Schemas
    const schRes = await getSchemasHandler();
    expect(schRes.status).toBe(200);
  });

  it('should provision a new user via SCIM POST /api/scim/v2/Users', async () => {
    const req = new Request('http://localhost/api/scim/v2/Users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/scim+json',
        Authorization: `Bearer ${scimBearerTokenA}`,
      },
      body: JSON.stringify({
        userName: 'scim.provisioned@company.com',
        name: {
          givenName: 'Okta',
          familyName: 'Provisioned',
        },
        displayName: 'Okta Provisioned',
        active: true,
        roles: [{ value: 'Technician', primary: true }],
        externalId: 'okta-ext-12345',
      }),
    });

    const res = await createUserHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.id).toBeDefined();
    expect(data.userName).toBe('scim.provisioned@company.com');
    expect(data.name.givenName).toBe('Okta');
    expect(data.active).toBe(true);

    createdScimUserId = data.id;
  });

  it('should fetch and filter users via SCIM GET /api/scim/v2/Users', async () => {
    // 1. Filter by exact userName
    const req = new Request(
      'http://localhost/api/scim/v2/Users?filter=userName eq "scim.provisioned@company.com"',
      {
        headers: { Authorization: `Bearer ${scimBearerTokenA}` },
      }
    );

    const res = await listUsersHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.totalResults).toBe(1);
    expect(data.Resources[0].id).toBe(createdScimUserId);

    // 2. Get Single User by ID
    const getReq = new Request(`http://localhost/api/scim/v2/Users/${createdScimUserId}`, {
      headers: { Authorization: `Bearer ${scimBearerTokenA}` },
    });
    const getRes = await getUserHandler(getReq, { params: Promise.resolve({ id: createdScimUserId }) });
    expect(getRes.status).toBe(200);
    const getData: any = await getRes.json();
    expect(getData.id).toBe(createdScimUserId);
  });

  it('should deprovision user via SCIM PATCH (active: false)', async () => {
    const req = new Request(`http://localhost/api/scim/v2/Users/${createdScimUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/scim+json',
        Authorization: `Bearer ${scimBearerTokenA}`,
      },
      body: JSON.stringify({
        Operations: [
          {
            op: 'replace',
            path: 'active',
            value: false,
          },
        ],
      }),
    });

    const res = await patchUserHandler(req, { params: Promise.resolve({ id: createdScimUserId }) });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.active).toBe(false);
  });

  it('should update user via SCIM PUT', async () => {
    const req = new Request(`http://localhost/api/scim/v2/Users/${createdScimUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/scim+json',
        Authorization: `Bearer ${scimBearerTokenA}`,
      },
      body: JSON.stringify({
        userName: 'scim.provisioned@company.com',
        name: {
          givenName: 'Okta',
          familyName: 'Updated',
        },
        displayName: 'Okta Updated',
        active: true,
        roles: [{ value: 'IT Admin', primary: true }],
      }),
    });

    const res = await updateUserHandler(req, { params: Promise.resolve({ id: createdScimUserId }) });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.name.familyName).toBe('Updated');
    expect(data.roles[0].value).toBe('IT Admin');
  });

  it('should create and list SCIM groups', async () => {
    const createReq = new Request('http://localhost/api/scim/v2/Groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/scim+json',
        Authorization: `Bearer ${scimBearerTokenA}`,
      },
      body: JSON.stringify({
        displayName: 'Engineering Support',
        members: [{ value: createdScimUserId, display: 'Okta User' }],
      }),
    });

    const createRes = await createGroupHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData: any = await createRes.json();
    expect(createData.displayName).toBe('Engineering Support');
    expect(createData.members.length).toBe(1);

    const listReq = new Request('http://localhost/api/scim/v2/Groups', {
      headers: { Authorization: `Bearer ${scimBearerTokenA}` },
    });
    const listRes = await listGroupsHandler(listReq);
    expect(listRes.status).toBe(200);
    const listData: any = await listRes.json();
    expect(listData.totalResults).toBeGreaterThanOrEqual(1);
  });

  it('should enforce Tenant Isolation: Tenant B SCIM token cannot access Tenant A user', async () => {
    const req = new Request(`http://localhost/api/scim/v2/Users/${createdScimUserId}`, {
      headers: { Authorization: `Bearer ${scimBearerTokenB}` },
    });

    const res = await getUserHandler(req, { params: Promise.resolve({ id: createdScimUserId }) });
    expect(res.status).toBe(404);
  });

  it('should delete user via SCIM DELETE /api/scim/v2/Users/[id]', async () => {
    const req = new Request(`http://localhost/api/scim/v2/Users/${createdScimUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${scimBearerTokenA}` },
    });

    const res = await deleteUserHandler(req, { params: Promise.resolve({ id: createdScimUserId }) });
    expect(res.status).toBe(204);
  });
});
