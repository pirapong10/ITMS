import { GET as getTranslationsHandler } from '../../app/api/v1/i18n/translations/route';
import { GET as getI18nSettingsHandler, PATCH as updateI18nSettingsHandler } from '../../app/api/v1/i18n/settings/route';
import { GET as getRatesHandler } from '../../app/api/v1/currencies/rates/route';
import { POST as convertCurrencyHandler } from '../../app/api/v1/currencies/convert/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Internationalization (i18n) & Multi-Currency API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-i18n-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['i18n Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-i18n-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['i18n Tenant B', subB]
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

  it('should fetch Thai translations dictionary via ?lang=th', async () => {
    const req = new Request('http://localhost/api/v1/i18n/translations?lang=th');
    const res = await getTranslationsHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.locale).toBe('th');
    expect(data.supportedLocales).toContain('en');
    expect(data.supportedLocales).toContain('th');
    expect(data.translations.common.save).toBe('บันทึก');
    expect(data.translations.nav.helpdesk).toBe('ระบบแจ้งซ่อมและ SLA');
  });

  it('should manage tenant i18n settings and enforce tenant isolation', async () => {
    // 1. Get default settings for Tenant A
    const getReqA = new Request('http://localhost/api/v1/i18n/settings', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getResA = await getI18nSettingsHandler(getReqA);
    expect(getResA.status).toBe(200);
    const getDataA: any = await getResA.json();
    expect(getDataA.settings.default_language).toBe('en');

    // 2. Update Tenant A settings to Thai & THB
    const patchReqA = new Request('http://localhost/api/v1/i18n/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        default_language: 'th',
        default_currency: 'THB',
      }),
    });

    const patchResA = await updateI18nSettingsHandler(patchReqA);
    expect(patchResA.status).toBe(200);
    const patchDataA: any = await patchResA.json();
    expect(patchDataA.settings.default_language).toBe('th');
    expect(patchDataA.settings.default_currency).toBe('THB');

    // 3. Verify Tenant B still has default settings (en / USD)
    const getReqB = new Request('http://localhost/api/v1/i18n/settings', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const getResB = await getI18nSettingsHandler(getReqB);
    expect(getResB.status).toBe(200);
    const getDataB: any = await getResB.json();
    expect(getDataB.settings.default_language).toBe('en');
    expect(getDataB.settings.default_currency).toBe('USD');
  });

  it('should list system exchange rates', async () => {
    const res = await getRatesHandler();
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.rates).toBeDefined();
    expect(data.rates.length).toBeGreaterThanOrEqual(5);
    const usdThb = data.rates.find((r: any) => r.id === 'USD_THB');
    expect(usdThb).toBeDefined();
    expect(usdThb.rate).toBe(35.5);
  });

  it('should convert 100 USD to THB accurately', async () => {
    const req = new Request('http://localhost/api/v1/currencies/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 100,
        from_currency: 'USD',
        to_currency: 'THB',
      }),
    });

    const res = await convertCurrencyHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.fromAmount).toBe(100);
    expect(data.fromCurrency).toBe('USD');
    expect(data.toAmount).toBe(3550);
    expect(data.toCurrency).toBe('THB');
    expect(data.rate).toBe(35.5);
  });
});
