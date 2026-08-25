import { GET as getOpenApiHandler } from '../../app/api/v1/openapi.json/route';
import { GET as listApiKeysHandler, POST as createApiKeyHandler } from '../../app/api/v1/api-keys/route';
import { DELETE as revokeApiKeyHandler } from '../../app/api/v1/api-keys/[id]/route';
import { GET as listWebhooksHandler, POST as createWebhookHandler } from '../../app/api/v1/webhooks/route';
import { DELETE as deleteWebhookHandler } from '../../app/api/v1/webhooks/[id]/route';
import { GET as getDeliveriesHandler } from '../../app/api/v1/webhooks/[id]/deliveries/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';
import { authenticateApiKey } from '../../src/lib/api-keys';
import { dispatchWebhookEvent } from '../../src/lib/webhooks';

describe('OpenAPI 3.0, Scoped API Keys & Event Webhooks Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-api-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['API Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-api-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['API Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    tokenA = signJwt({
      userId: 'user-admin-a',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    tokenB = signJwt({
      userId: 'user-admin-b',
      tenantId: tenantBId,
      role: 'IT Admin',
    });
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  it('should return OpenAPI 3.0 specification document', async () => {
    const res = await getOpenApiHandler();
    expect(res.status).toBe(200);
    const spec: any = await res.json();
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toContain('ITSM Enterprise');
    expect(spec.paths['/tickets']).toBeDefined();
    expect(spec.paths['/assets']).toBeDefined();
  });

  let createdApiKeyId: string;
  let rawApiKey: string;

  it('should create and authenticate scoped API Key', async () => {
    // 1. Create API Key with ticket scopes
    const req = new Request('http://localhost/api/v1/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Monitoring Automation Key',
        scopes: ['tickets:read', 'tickets:write'],
        rate_limit: 100,
      }),
    });

    const res = await createApiKeyHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.apiKey.id).toBeDefined();
    expect(data.apiKey.raw_key).toMatch(/^ak_live_[a-f0-9]{48}$/);

    createdApiKeyId = data.apiKey.id;
    rawApiKey = data.apiKey.raw_key;

    // 2. Validate API Key with authorized scope
    const authSuccess = await authenticateApiKey(rawApiKey, 'tickets:read');
    expect(authSuccess.valid).toBe(true);
    expect(authSuccess.tenantId).toBe(tenantAId);

    // 3. Reject API Key with unauthorized scope
    const authForbidden = await authenticateApiKey(rawApiKey, 'assets:write');
    expect(authForbidden.valid).toBe(false);
    expect(authForbidden.error).toContain('Insufficient API key scope');
  });

  it('should revoke API Key', async () => {
    const req = new Request(`http://localhost/api/v1/api-keys/${createdApiKeyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await revokeApiKeyHandler(req, { params: Promise.resolve({ id: createdApiKeyId }) });
    expect(res.status).toBe(200);

    // Verify revoked key fails authentication
    const authRevoked = await authenticateApiKey(rawApiKey);
    expect(authRevoked.valid).toBe(false);
  });

  let createdSubId: string;

  it('should create webhook subscription and dispatch event with signature', async () => {
    // 1. Create Webhook Subscription
    const createReq = new Request('http://localhost/api/v1/webhooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        url: 'https://webhook.site/receiver-test',
        events: ['ticket.created'],
      }),
    });

    const createRes = await createWebhookHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData: any = await createRes.json();
    expect(createData.subscription.id).toBeDefined();
    expect(createData.subscription.secret).toMatch(/^whsec_/);

    createdSubId = createData.subscription.id;

    // 2. Dispatch event with mock HTTP sender
    let receivedHeaders: Record<string, string> = {};
    let receivedBody: string = '';

    const mockSender = async (url: string, headers: Record<string, string>, body: string) => {
      receivedHeaders = headers;
      receivedBody = body;
      return { status: 200, body: '{"success":true}' };
    };

    const deliveries = await dispatchWebhookEvent(
      tenantAId,
      'ticket.created',
      { ticket_id: 'TK-2026-0001', title: 'Network Outage' },
      mockSender
    );

    expect(deliveries.length).toBe(1);
    expect(deliveries[0].status).toBe('Delivered');
    expect(receivedHeaders['X-ITSM-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(receivedHeaders['X-ITSM-Event']).toBe('ticket.created');
    expect(receivedBody).toContain('Network Outage');

    // 3. Get deliveries for subscription
    const delReq = new Request(`http://localhost/api/v1/webhooks/${createdSubId}/deliveries`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const delRes = await getDeliveriesHandler(delReq, { params: Promise.resolve({ id: createdSubId }) });
    expect(delRes.status).toBe(200);
    const delData: any = await delRes.json();
    expect(delData.deliveries.length).toBeGreaterThanOrEqual(1);
  });

  it('should enforce Tenant Isolation: Tenant B cannot access Tenant A webhooks', async () => {
    const req = new Request(`http://localhost/api/v1/webhooks/${createdSubId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const res = await deleteWebhookHandler(req, { params: Promise.resolve({ id: createdSubId }) });
    expect(res.status).toBe(404);
  });
});
