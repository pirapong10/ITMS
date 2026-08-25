import { GET as searchHandler } from '../../app/api/v1/search/route';
import { GET as contrastHandler } from '../../app/api/v1/a11y/theme-contrast/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';
import { createTicket } from '../../src/lib/tickets';
import { createAsset } from '../../src/lib/assets';
import { createProblem } from '../../src/lib/problems';
import { createArticle } from '../../src/lib/knowledge';

describe('Unified Global Search & WCAG 2.1 Accessibility Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-search-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Search Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-search-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Search Tenant B', subB]
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

    // Seed resources in Tenant A
    await createTicket(tenantAId, {
      title: 'MacBook Pro M3 Pro Kernel Panic on Sleep',
      description: 'System reboots unexpectedly when entering sleep mode with external display connected',
      category: 'Hardware',
      priority: 'High',
      reporter_name: 'Sarah Connor',
    });

    await createAsset(tenantAId, {
      name: 'MacBook Pro 16 M3 Max',
      model: 'AST-MBP-9901',
      category: 'Laptop',
      purchase_cost: 3499,
      purchase_date: '2026-01-10',
    });

    await createProblem(tenantAId, {
      title: 'macOS Sonoma Sleep Wake Crash Issue',
      description: 'DisplayLink dock kernel extension instability during sleep state',
      category: 'Hardware',
      priority: 'High',
      impact: 'Medium',
      root_cause: 'Outdated DisplayLink kext driver v1.8',
    });

    await createArticle(tenantAId, {
      title: 'How to Resolve macOS Sonoma Kernel Panics',
      summary: 'Updating DisplayLink driver to v1.10 fixes sleep crash issues',
      content: '1. Uninstall old DisplayLink driver. 2. Install v1.10. 3. Reboot.',
      category: 'Hardware',
      visibility: 'Public',
      status: 'Published',
    });
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  it('should perform unified cross-module global search in Tenant A', async () => {
    const req = new Request('http://localhost/api/v1/search?q=macOS', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await searchHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.results.length).toBeGreaterThanOrEqual(2);

    const types = data.results.map((r: any) => r.type);
    expect(types).toContain('problem');
    expect(types).toContain('kb');
  });

  it('should find tickets and assets when searching for MacBook', async () => {
    const req = new Request('http://localhost/api/v1/search?q=MacBook', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await searchHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.results.length).toBeGreaterThanOrEqual(2);

    const types = data.results.map((r: any) => r.type);
    expect(types).toContain('ticket');
    expect(types).toContain('asset');
  });

  it('should enforce Tenant Isolation: Tenant B finds zero results for Tenant A keywords', async () => {
    const req = new Request('http://localhost/api/v1/search?q=MacBook', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const res = await searchHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.results.length).toBe(0);
  });

  it('should calculate color contrast via API for theme accessibility auditing', async () => {
    const req = new Request('http://localhost/api/v1/a11y/theme-contrast?fg=%23ffffff&bg=%230f172a');
    const res = await contrastHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.ratio).toBeGreaterThan(10);
    expect(data.isNormalTextAA).toBe(true);
    expect(data.isLargeTextAA).toBe(true);
  });
});
