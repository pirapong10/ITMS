import { GET as listLicensesHandler, POST as createLicenseHandler } from '../../app/api/v1/licenses/route';
import { GET as getLicenseHandler, PATCH as updateLicenseHandler, DELETE as deleteLicenseHandler } from '../../app/api/v1/licenses/[id]/route';
import { POST as allocateSeatHandler } from '../../app/api/v1/licenses/[id]/allocations/route';
import { DELETE as unallocateSeatHandler } from '../../app/api/v1/licenses/[id]/allocations/[allocId]/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Software & Cloud License API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-lic-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['License Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-lic-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['License Tenant B', subB]
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

  let createdLicenseId: string;
  let allocatedSeatId1: string;

  it('should create a new license with total seats quota', async () => {
    const req = new Request('http://localhost/api/v1/licenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        software_name: 'JetBrains All Products Pack',
        license_key: 'JB-2026-XYZ-SECRET',
        license_type: 'Subscription',
        total_seats: 2, // Quota of 2 seats
        cost_per_seat: 8900,
        vendor: 'JetBrains s.r.o.',
        expiry_date: '2027-08-01T00:00:00.000Z',
      }),
    });

    const res = await createLicenseHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.license).toBeDefined();
    expect(data.license.software_name).toBe('JetBrains All Products Pack');
    expect(data.license.total_seats).toBe(2);
    expect(data.license.allocated_seats).toBe(0);
    expect(data.license.status).toBe('Active');

    createdLicenseId = data.license.id;
  });

  it('should allocate first seat successfully', async () => {
    const req = new Request(`http://localhost/api/v1/licenses/${createdLicenseId}/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        user_name: 'Developer Alice',
        user_email: 'alice@company.com',
        notes: 'Primary backend dev',
      }),
    });

    const context = { params: Promise.resolve({ id: createdLicenseId }) };
    const res = await allocateSeatHandler(req, context);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.allocation).toBeDefined();
    expect(data.allocation.user_name).toBe('Developer Alice');

    allocatedSeatId1 = data.allocation.id;

    // Check license allocated count
    const licRes = await getLicenseHandler(new Request(`http://localhost/api/v1/licenses/${createdLicenseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }), context);
    const licData: any = await licRes.json();
    expect(licData.license.allocated_seats).toBe(1);
    expect(licData.status_info.availableSeats).toBe(1);
    expect(licData.license.status).toBe('Active');
  });

  it('should allocate second seat and mark status as Depleted', async () => {
    const req = new Request(`http://localhost/api/v1/licenses/${createdLicenseId}/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        user_name: 'Developer Bob',
        user_email: 'bob@company.com',
      }),
    });

    const context = { params: Promise.resolve({ id: createdLicenseId }) };
    const res = await allocateSeatHandler(req, context);
    expect(res.status).toBe(201);

    const licRes = await getLicenseHandler(new Request(`http://localhost/api/v1/licenses/${createdLicenseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }), context);
    const licData: any = await licRes.json();
    expect(licData.license.allocated_seats).toBe(2);
    expect(licData.status_info.availableSeats).toBe(0);
    expect(licData.license.status).toBe('Depleted');
  });

  it('should reject third seat allocation with 409 Quota Exceeded', async () => {
    const req = new Request(`http://localhost/api/v1/licenses/${createdLicenseId}/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        user_name: 'Developer Charlie',
        user_email: 'charlie@company.com',
      }),
    });

    const context = { params: Promise.resolve({ id: createdLicenseId }) };
    const res = await allocateSeatHandler(req, context);
    expect(res.status).toBe(409);

    const data: any = await res.json();
    expect(data.error).toBe('Quota Exceeded');
  });

  it('should unallocate a seat and restore license availability to Active', async () => {
    const req = new Request(
      `http://localhost/api/v1/licenses/${createdLicenseId}/allocations/${allocatedSeatId1}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      }
    );

    const context = { params: Promise.resolve({ id: createdLicenseId, allocId: allocatedSeatId1 }) };
    const res = await unallocateSeatHandler(req, context);
    expect(res.status).toBe(200);

    const licRes = await getLicenseHandler(new Request(`http://localhost/api/v1/licenses/${createdLicenseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }), { params: Promise.resolve({ id: createdLicenseId }) });
    const licData: any = await licRes.json();
    expect(licData.license.allocated_seats).toBe(1);
    expect(licData.status_info.availableSeats).toBe(1);
    expect(licData.license.status).toBe('Active');
  });

  it('should enforce Tenant Isolation: Tenant B cannot view Tenant A licenses', async () => {
    const req = new Request('http://localhost/api/v1/licenses', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    const res = await listLicensesHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.licenses.length).toBe(0);
    expect(data.total).toBe(0);
  });
});
