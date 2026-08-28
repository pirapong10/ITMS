import {
  isSuperAdmin,
  CreateGlobalPlanSchema,
  UpdateGlobalPlanSchema,
  UpdateTenantStatusSchema,
  getPlatformOverview,
  listAllTenants,
  setTenantStatus,
  createGlobalPlan,
  updateGlobalPlan,
  deleteGlobalPlan,
} from '../../src/lib/super-admin';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Super Admin Portal (Unit Tests)', () => {
  const mockQuery = db.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Super Admin Role Guard', () => {
    it('should grant access to SUPER_ADMIN and Platform Admin', () => {
      expect(isSuperAdmin('SUPER_ADMIN')).toBe(true);
      expect(isSuperAdmin('super_admin')).toBe(true);
      expect(isSuperAdmin('Platform Admin')).toBe(true);
      expect(isSuperAdmin('PLATFORM ADMIN')).toBe(true);
    });

    it('should deny access to regular roles', () => {
      expect(isSuperAdmin('IT Admin')).toBe(false);
      expect(isSuperAdmin('Technician')).toBe(false);
      expect(isSuperAdmin('User')).toBe(false);
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });
  });

  describe('Platform Overview & Tenant Metrics', () => {
    it('should calculate platform overview metrics accurately for USD and THB', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // total tenants
        .mockResolvedValueOnce({
          rows: [
            { currency: 'USD', billing_cycle: 'Monthly', price_monthly_usd: '29' },
            { currency: 'THB', billing_cycle: 'Yearly', price_yearly_thb: '12000' },
          ],
        }) // active subscriptions
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // tickets
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }); // assets

      const overview = await getPlatformOverview();
      expect(overview.totalTenants).toBe(5);
      expect(overview.activeSubscriptions).toBe(2);
      expect(overview.mrrUsd).toBe(29);
      expect(overview.mrrThb).toBe(1000); // 12000 / 12
      expect(overview.totalTickets).toBe(100);
      expect(overview.totalAssets).toBe(50);
    });

    it('should list all platform tenants with metric aggregates', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 't-1',
            company_name: 'Acme',
            subdomain: 'acme',
            created_at: '2026-08-25',
            plan_name: 'Pro',
            sub_status: 'Active',
            billing_cycle: 'Monthly',
            currency: 'USD',
            user_count: '5',
            ticket_count: '10',
            asset_count: '8',
          },
        ],
      });

      const tenants = await listAllTenants({ search: 'Acme' });
      expect(tenants.length).toBe(1);
      expect(tenants[0].company_name).toBe('Acme');
      expect(tenants[0].subscription?.plan_name).toBe('Pro');
      expect(tenants[0].metrics.userCount).toBe(5);
    });

    it('should set tenant status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 't-1' }] });

      const res = await setTenantStatus('t-1', 'Suspended');
      expect(res).toBe(true);
    });
  });

  describe('Global Plans Management', () => {
    it('should create global plan', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'plan-new', name: 'Enterprise Plan' }],
      });

      const plan = await createGlobalPlan({
        id: 'plan_ent',
        name: 'Enterprise Plan',
        price_monthly_usd: 299,
        price_yearly_usd: 2990,
        price_monthly_thb: 9900,
        price_yearly_thb: 99000,
        max_users: 200,
        max_assets: 2000,
      });

      expect(plan.name).toBe('Enterprise Plan');
    });

    it('should update and delete global plan', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'plan_ent', name: 'Updated Enterprise' }],
      });

      const updated = await updateGlobalPlan('plan_ent', { name: 'Updated Enterprise' });
      expect(updated.name).toBe('Updated Enterprise');

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'plan_ent' }] });

      const deleted = await deleteGlobalPlan('plan_ent');
      expect(deleted).toBe(true);
    });
  });

  describe('Validation Schemas', () => {
    it('should validate global plan creation payload', () => {
      const payload = {
        id: 'plan_growth',
        name: 'Growth Scale',
        price_monthly_usd: 129,
        price_yearly_usd: 1290,
        price_monthly_thb: 4500,
        price_yearly_thb: 45000,
        max_users: 50,
        max_assets: 500,
        features: ['Custom SSO', 'Advanced Reports'],
      };
      const parsed = CreateGlobalPlanSchema.parse(payload);
      expect(parsed.id).toBe('plan_growth');
      expect(parsed.name).toBe('Growth Scale');
      expect(parsed.is_active).toBe(true);
    });

    it('should validate tenant status update payload', () => {
      const parsed = UpdateTenantStatusSchema.parse({ status: 'Suspended' });
      expect(parsed.status).toBe('Suspended');
    });

    it('should reject invalid status', () => {
      expect(() => UpdateTenantStatusSchema.parse({ status: 'InvalidStatus' })).toThrow();
    });
  });
});
