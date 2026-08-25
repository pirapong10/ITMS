import { GET as listTimezonesHandler } from '../../app/api/v1/timezones/route';
import { POST as convertTimezoneHandler } from '../../app/api/v1/timezones/convert/route';
import { GET as getBusinessHoursHandler, PATCH as updateBusinessHoursHandler } from '../../app/api/v1/timezones/business-hours/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Multi-Timezone Engine & Business Hours API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-tz-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Timezone Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-tz-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Timezone Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    // Seed tenant_i18n_settings for both tenants
    await query(
      `INSERT INTO tenant_i18n_settings (tenant_id, timezone, business_hours) 
       VALUES ($1, 'Asia/Bangkok', '{"start": "08:30", "end": "17:30", "work_days": [1, 2, 3, 4, 5]}'::jsonb)`,
      [tenantAId]
    );
    await query(
      `INSERT INTO tenant_i18n_settings (tenant_id, timezone, business_hours) 
       VALUES ($1, 'America/New_York', '{"start": "09:00", "end": "18:00", "work_days": [1, 2, 3, 4, 5]}'::jsonb)`,
      [tenantBId]
    );

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

  it('should list all supported timezones with current UTC offsets', async () => {
    const res = await listTimezonesHandler();
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.timezones).toBeDefined();
    expect(data.timezones.length).toBeGreaterThanOrEqual(10);
    const bkk = data.timezones.find((t: any) => t.code === 'Asia/Bangkok');
    expect(bkk).toBeDefined();
    expect(bkk.offset).toBe('+07:00');
  });

  it('should convert a UTC timestamp to target timezone', async () => {
    const req = new Request('http://localhost/api/v1/timezones/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: '2026-08-25T01:30:00.000Z',
        target_timezone: 'Asia/Tokyo',
      }),
    });

    const res = await convertTimezoneHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.utcIso).toBe('2026-08-25T01:30:00.000Z');
    expect(data.targetTimezone).toBe('Asia/Tokyo');
    expect(data.offset).toBe('+09:00');
    expect(data.targetFormatted).toContain('10:30');
  });

  it('should manage tenant business hours schedule with tenant isolation', async () => {
    // 1. Get Tenant A initial config
    const getReqA = new Request('http://localhost/api/v1/timezones/business-hours', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getResA = await getBusinessHoursHandler(getReqA);
    expect(getResA.status).toBe(200);
    const getDataA: any = await getResA.json();
    expect(getDataA.settings.timezone).toBe('Asia/Bangkok');

    // 2. Update Tenant A config to Tokyo timezone & 09:00-18:00
    const patchReqA = new Request('http://localhost/api/v1/timezones/business-hours', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        timezone: 'Asia/Tokyo',
        business_hours: {
          start: '09:00',
          end: '18:00',
          work_days: [1, 2, 3, 4, 5],
          holidays: ['2026-01-01'],
        },
      }),
    });

    const patchResA = await updateBusinessHoursHandler(patchReqA);
    expect(patchResA.status).toBe(200);
    const patchDataA: any = await patchResA.json();
    expect(patchDataA.settings.timezone).toBe('Asia/Tokyo');

    // 3. Verify Tenant B config remains America/New_York
    const getReqB = new Request('http://localhost/api/v1/timezones/business-hours', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const getResB = await getBusinessHoursHandler(getReqB);
    expect(getResB.status).toBe(200);
    const getDataB: any = await getResB.json();
    expect(getDataB.settings.timezone).toBe('America/New_York');
  });
});
