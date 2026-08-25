import { GET as getOverviewHandler } from '../../app/api/v1/admin/overview/route';
import { GET as listTenantsHandler } from '../../app/api/v1/admin/tenants/route';
import { PATCH as updateTenantStatusHandler } from '../../app/api/v1/admin/tenants/[id]/status/route';
import { GET as listPlansHandler, POST as createPlanHandler } from '../../app/api/v1/admin/plans/route';
import { PATCH as updatePlanHandler, DELETE as deletePlanHandler } from '../../app/api/v1/admin/plans/[id]/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Super Admin Portal API Integration Tests', () => {
  let superAdminToken: string;
  let regularAdminToken: string;
  let testTenantId: string;

  beforeAll(async () => {
    const sub = 'tenant-adm-test-' + Date.now();
    const res = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Super Admin Managed Tenant', sub]
    );
    testTenantId = res.rows[0].id;

    // Attach Starter subscription
    await query(
      `INSERT INTO tenant_subscriptions (
        id, tenant_id, plan_id, status, billing_cycle,
        currency, current_period_start, current_period_end
      ) VALUES (
        gen_random_uuid(), $1, 'plan_starter', 'Active', 'Monthly',
        'USD', current_timestamp, current_timestamp + interval '1 month'
      )`,
      [testTenantId]
    );

    superAdminToken = signJwt({
      userId: 'root-super-admin',
      tenantId: testTenantId,
      role: 'SUPER_ADMIN',
    });

    regularAdminToken = signJwt({
      userId: 'regular-user',
      tenantId: testTenantId,
      role: 'IT Admin',
    });
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
  });

  it('should block non-super admin users with 403 Forbidden', async () => {
    const req = new Request('http://localhost/api/v1/admin/overview', {
      headers: {
        Authorization: `Bearer ${regularAdminToken}`,
      },
    });

    const res = await getOverviewHandler(req);
    expect(res.status).toBe(403);
    const data: any = await res.json();
    expect(data.error).toContain('Super Admin access required');
  });

  it('should allow Super Admin to fetch platform overview metrics and MRR', async () => {
    const req = new Request('http://localhost/api/v1/admin/overview', {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });

    const res = await getOverviewHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.overview).toBeDefined();
    expect(data.overview.totalTenants).toBeGreaterThanOrEqual(1);
    expect(data.overview.activeSubscriptions).toBeGreaterThanOrEqual(1);
    expect(data.overview.mrrUsd).toBeGreaterThanOrEqual(0);
  });

  it('should list all platform tenants with subscription & usage stats', async () => {
    const req = new Request('http://localhost/api/v1/admin/tenants', {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });

    const res = await listTenantsHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.tenants).toBeDefined();
    expect(data.tenants.length).toBeGreaterThanOrEqual(1);
    const item = data.tenants.find((t: any) => t.id === testTenantId);
    expect(item).toBeDefined();
    expect(item.subscription.plan_name).toBe('Starter');
  });

  it('should update tenant operational status (Suspend & Re-activate)', async () => {
    // Suspend
    const suspendReq = new Request(`http://localhost/api/v1/admin/tenants/${testTenantId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ status: 'Suspended' }),
    });

    const suspendRes = await updateTenantStatusHandler(suspendReq, { params: Promise.resolve({ id: testTenantId }) });
    expect(suspendRes.status).toBe(200);

    // Verify in DB
    const subRes = await query('SELECT status FROM tenant_subscriptions WHERE tenant_id = $1', [testTenantId]);
    expect(subRes.rows[0].status).toBe('Suspended');

    // Re-activate
    const activeReq = new Request(`http://localhost/api/v1/admin/tenants/${testTenantId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ status: 'Active' }),
    });

    const activeRes = await updateTenantStatusHandler(activeReq, { params: Promise.resolve({ id: testTenantId }) });
    expect(activeRes.status).toBe(200);
  });

  it('should create, update and delete a global subscription plan', async () => {
    const planId = 'plan_test_scale_' + Date.now();

    // 1. Create
    const createReq = new Request('http://localhost/api/v1/admin/plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        id: planId,
        name: 'Scale Test Plan',
        description: 'Test Description',
        price_monthly_usd: 89,
        price_yearly_usd: 890,
        price_monthly_thb: 3000,
        price_yearly_thb: 30000,
        max_users: 25,
        max_assets: 300,
        features: ['Custom API', 'SLA 99.9%'],
      }),
    });

    const createRes = await createPlanHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData: any = await createRes.json();
    expect(createData.plan.id).toBe(planId);

    // 2. Update
    const updateReq = new Request(`http://localhost/api/v1/admin/plans/${planId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        price_monthly_usd: 99,
      }),
    });

    const updateRes = await updatePlanHandler(updateReq, { params: Promise.resolve({ id: planId }) });
    expect(updateRes.status).toBe(200);
    const updateData: any = await updateRes.json();
    expect(updateData.plan.price_monthly_usd).toBe(99);

    // 3. Delete
    const delReq = new Request(`http://localhost/api/v1/admin/plans/${planId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });

    const delRes = await deletePlanHandler(delReq, { params: Promise.resolve({ id: planId }) });
    expect(delRes.status).toBe(200);
  });
});
