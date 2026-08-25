import {
  calculateDepreciation,
  checkWarrantyStatus,
  CreateAssetSchema,
  UpdateAssetSchema,
} from '../../src/lib/assets';

describe('Asset Management & Depreciation Engine (Unit Tests)', () => {
  describe('Straight-Line Depreciation Engine', () => {
    it('should calculate 20%/yr straight-line depreciation correctly with 0 salvage value', () => {
      const purchaseDate = '2025-01-01T00:00:00.000Z';
      const asOfDate = '2026-01-01T00:00:00.000Z'; // Exactly 12 months (1 year)

      const res = calculateDepreciation({
        purchaseCost: 100000,
        salvageValue: 0,
        depreciationRate: 20.0,
        purchaseDate,
        asOfDate,
      });

      expect(res.purchaseCost).toBe(100000);
      expect(res.salvageValue).toBe(0);
      expect(res.depreciableAmount).toBe(100000);
      expect(res.annualDepreciation).toBe(20000);
      expect(res.elapsedMonths).toBe(12);
      expect(res.accumulatedDepreciation).toBe(20000.04); // 1666.67 * 12
      expect(res.currentBookValue).toBe(79999.96);
      expect(res.depreciationPercentage).toBe(20);
      expect(res.yearlySchedule.length).toBe(5);
      expect(res.yearlySchedule[0].endingValue).toBe(80000);
      expect(res.yearlySchedule[4].endingValue).toBe(0);
    });

    it('should respect salvage value floor in depreciation', () => {
      const purchaseDate = '2024-01-01T00:00:00.000Z';
      const asOfDate = '2026-01-01T00:00:00.000Z'; // 24 months (2 years)

      const res = calculateDepreciation({
        purchaseCost: 120000,
        salvageValue: 20000,
        depreciationRate: 20.0,
        purchaseDate,
        asOfDate,
      });

      expect(res.depreciableAmount).toBe(100000);
      expect(res.annualDepreciation).toBe(20000);
      expect(res.elapsedMonths).toBe(24);
      expect(res.depreciationPercentage).toBe(40);
    });

    it('should never depreciate below salvage value even after long periods', () => {
      const purchaseDate = '2015-01-01T00:00:00.000Z';
      const asOfDate = '2026-01-01T00:00:00.000Z'; // 11 years later

      const res = calculateDepreciation({
        purchaseCost: 50000,
        salvageValue: 5000,
        depreciationRate: 20.0,
        purchaseDate,
        asOfDate,
      });

      expect(res.currentBookValue).toBe(5000); // Salvage floor
      expect(res.depreciationPercentage).toBe(100);
    });
  });

  describe('Warranty Expiry Alerts', () => {
    const asOf = new Date('2026-08-25T00:00:00.000Z');

    it('should flag Active for warranty > 60 days', () => {
      const expiry = '2026-12-31T00:00:00.000Z'; // ~128 days
      const res = checkWarrantyStatus(expiry, asOf);
      expect(res.status).toBe('Active');
      expect(res.daysRemaining).toBeGreaterThan(60);
    });

    it('should flag Expiring Soon for warranty <= 60 days and > 0 days', () => {
      const expiry = '2026-09-25T00:00:00.000Z'; // 31 days
      const res = checkWarrantyStatus(expiry, asOf);
      expect(res.status).toBe('Expiring Soon');
      expect(res.daysRemaining).toBe(31);
    });

    it('should flag Expired for warranty <= 0 days', () => {
      const expiry = '2026-08-01T00:00:00.000Z'; // -24 days
      const res = checkWarrantyStatus(expiry, asOf);
      expect(res.status).toBe('Expired');
      expect(res.daysRemaining).toBeLessThanOrEqual(0);
    });

    it('should handle No Warranty when expiry is null', () => {
      const res = checkWarrantyStatus(null, asOf);
      expect(res.status).toBe('No Warranty');
      expect(res.daysRemaining).toBeNull();
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid asset payload with defaults', () => {
      const payload = {
        name: 'Dell Latitude 5440',
        purchase_cost: 35000,
      };
      const parsed = CreateAssetSchema.parse(payload);
      expect(parsed.name).toBe('Dell Latitude 5440');
      expect(parsed.category).toBe('Hardware');
      expect(parsed.depreciation_rate).toBe(20.0);
      expect(parsed.status).toBe('In Use');
    });

    it('should reject invalid asset name or negative cost', () => {
      expect(() => CreateAssetSchema.parse({ name: 'a' })).toThrow();
      expect(() =>
        CreateAssetSchema.parse({
          name: 'Valid Name',
          purchase_cost: -500,
        })
      ).toThrow();
    });
  });
});
