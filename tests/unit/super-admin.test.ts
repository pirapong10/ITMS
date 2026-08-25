import {
  isSuperAdmin,
  CreateGlobalPlanSchema,
  UpdateGlobalPlanSchema,
  UpdateTenantStatusSchema,
} from '../../src/lib/super-admin';

describe('Super Admin Portal (Unit Tests)', () => {
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
