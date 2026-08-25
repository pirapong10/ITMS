import { GET as listAssetsHandler, POST as createAssetHandler } from '../../app/api/v1/assets/route';
import { GET as getAssetHandler, PATCH as updateAssetHandler, DELETE as deleteAssetHandler } from '../../app/api/v1/assets/[id]/route';
import { GET as getDepreciationHandler } from '../../app/api/v1/assets/[id]/depreciation/route';
import { GET as getLifecycleHandler } from '../../app/api/v1/assets/[id]/lifecycle/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('IT Asset & Depreciation API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-ast-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Asset Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-ast-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Asset Tenant B', subB]
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

  let createdAssetId: string;
  let createdAssetTag: string;

  it('should create a new asset with automatic running tag and depreciation info', async () => {
    const req = new Request('http://localhost/api/v1/assets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'MacBook Pro M3 14-inch',
        category: 'Hardware',
        model: 'A2992',
        serial_number: 'C02G1234ABCD',
        purchase_cost: 65000,
        salvage_value: 5000,
        depreciation_rate: 20.0,
        warranty_expiry: '2027-12-31T00:00:00.000Z',
        department: 'Engineering',
        assigned_to: 'Somchai Dev',
      }),
    });

    const res = await createAssetHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.asset).toBeDefined();
    expect(data.asset.asset_tag).toMatch(/^AST-\d{4}-\d{4}$/);
    expect(data.asset.name).toBe('MacBook Pro M3 14-inch');
    expect(Number(data.asset.purchase_cost)).toBe(65000);

    createdAssetId = data.asset.id;
    createdAssetTag = data.asset.asset_tag;
  });

  it('should enforce Tenant Isolation: Tenant B cannot see Tenant A assets', async () => {
    const req = new Request('http://localhost/api/v1/assets', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    const res = await listAssetsHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.assets.length).toBe(0);
    expect(data.total).toBe(0);
  });

  it('should retrieve asset detail with warranty and depreciation info', async () => {
    const req = new Request(`http://localhost/api/v1/assets/${createdAssetId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const context = { params: Promise.resolve({ id: createdAssetId }) };
    const res = await getAssetHandler(req, context);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.asset.id).toBe(createdAssetId);
    expect(data.warranty_info.status).toBe('Active');
    expect(data.depreciation_info.currentBookValue).toBeDefined();
    expect(data.depreciation_info.yearlySchedule.length).toBe(5);
  });

  it('should fetch dedicated depreciation schedule', async () => {
    const req = new Request(`http://localhost/api/v1/assets/${createdAssetId}/depreciation`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const context = { params: Promise.resolve({ id: createdAssetId }) };
    const res = await getDepreciationHandler(req, context);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.asset_tag).toBe(createdAssetTag);
    expect(data.depreciation.annualDepreciation).toBe(12000); // (65000 - 5000) * 0.20
  });

  it('should update asset and record lifecycle log', async () => {
    const patchReq = new Request(`http://localhost/api/v1/assets/${createdAssetId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'Under Repair',
        assigned_to: 'IT Workshop',
      }),
    });

    const context = { params: Promise.resolve({ id: createdAssetId }) };
    const patchRes = await updateAssetHandler(patchReq, context);
    expect(patchRes.status).toBe(200);

    // Verify lifecycle logs
    const lifeReq = new Request(`http://localhost/api/v1/assets/${createdAssetId}/lifecycle`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const lifeRes = await getLifecycleHandler(lifeReq, context);
    expect(lifeRes.status).toBe(200);
    const lifeData: any = await lifeRes.json();
    expect(lifeData.timeline.length).toBeGreaterThanOrEqual(2);
    expect(lifeData.timeline.some((l: any) => l.event_type === 'STATUS_CHANGED')).toBe(true);
  });

  it('should delete asset successfully', async () => {
    const req = new Request(`http://localhost/api/v1/assets/${createdAssetId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const context = { params: Promise.resolve({ id: createdAssetId }) };
    const res = await deleteAssetHandler(req, context);
    expect(res.status).toBe(200);

    // Verify deleted
    const getRes = await getAssetHandler(req, context);
    expect(getRes.status).toBe(404);
  });
});
