import {
  calculateDepreciation,
  checkWarrantyStatus,
  CreateAssetSchema,
  UpdateAssetSchema,
  createAsset,
  getAssetById,
  listAssets,
  updateAsset,
  deleteAsset,
  getAssetLifecycle,
  generateAssetTag,
} from '../../src/lib/assets';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Asset Management & Operations (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Straight-Line Depreciation Engine', () => {
    it('should calculate 20%/yr straight-line depreciation correctly with 0 salvage value', () => {
      const purchaseDate = '2025-01-01T00:00:00.000Z';
      const asOfDate = '2026-01-01T00:00:00.000Z'; // 12 months

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
      expect(res.accumulatedDepreciation).toBe(20000.04);
      expect(res.currentBookValue).toBe(79999.96);
      expect(res.depreciationPercentage).toBe(20);
      expect(res.yearlySchedule.length).toBe(5);
      expect(res.yearlySchedule[0].endingValue).toBe(80000);
      expect(res.yearlySchedule[4].endingValue).toBe(0);
    });

    it('should respect salvage value floor in depreciation', () => {
      const purchaseDate = '2024-01-01T00:00:00.000Z';
      const asOfDate = '2026-01-01T00:00:00.000Z'; // 24 months

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
      const asOfDate = '2026-01-01T00:00:00.000Z';

      const res = calculateDepreciation({
        purchaseCost: 50000,
        salvageValue: 5000,
        depreciationRate: 20.0,
        purchaseDate,
        asOfDate,
      });

      expect(res.currentBookValue).toBe(5000);
      expect(res.depreciationPercentage).toBe(100);
    });
  });

  describe('Warranty Expiry Alerts', () => {
    const asOf = new Date('2026-08-25T00:00:00.000Z');

    it('should flag Active for warranty > 60 days', () => {
      const expiry = '2026-12-31T00:00:00.000Z';
      const res = checkWarrantyStatus(expiry, asOf);
      expect(res.status).toBe('Active');
      expect(res.daysRemaining).toBeGreaterThan(60);
    });

    it('should flag Expiring Soon for warranty <= 60 days and > 0 days', () => {
      const expiry = '2026-09-25T00:00:00.000Z';
      const res = checkWarrantyStatus(expiry, asOf);
      expect(res.status).toBe('Expiring Soon');
      expect(res.daysRemaining).toBe(31);
    });

    it('should flag Expired for warranty <= 0 days', () => {
      const expiry = '2026-08-01T00:00:00.000Z';
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

  describe('generateAssetTag', () => {
    it('should generate sequential running asset tag', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [{ count: '10' }] }),
      };
      const tag = await generateAssetTag(mockClient, 'tenant-123', 2026);
      expect(tag).toBe('AST-2026-0011');
    });
  });

  describe('createAsset', () => {
    const tenantId = 'tenant-123';

    it('should create asset record and log lifecycle event', async () => {
      const mockAsset = {
        id: 'ast-1',
        tenant_id: tenantId,
        asset_tag: 'AST-2026-0001',
        name: 'Dell Monitor',
        status: 'In Store',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // tag
            .mockResolvedValueOnce({ rows: [mockAsset] }) // insert asset
            .mockResolvedValueOnce({ rows: [] }), // lifecycle log
        };
        return cb(client);
      });

      const res = await createAsset(tenantId, { name: 'Dell Monitor', purchase_cost: 8000 });
      expect(res.asset_tag).toBe('AST-2026-0001');
    });
  });

  describe('listAssets & getAssetById', () => {
    const tenantId = 'tenant-123';

    it('should list assets with filters and pagination', async () => {
      const mockAsset = {
        id: 'ast-1',
        tenant_id: tenantId,
        name: 'MacBook Pro',
        purchase_cost: '60000',
        purchase_date: '2025-01-01',
        warranty_expiry: '2027-01-01',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ total: '1' }] })
            .mockResolvedValueOnce({ rows: [mockAsset] }),
        };
        return cb(client);
      });

      const res = await listAssets(tenantId, { status: 'In Use', search: 'MacBook' });
      expect(res.total).toBe(1);
      expect(res.assets[0].warranty_info).toBeDefined();
    });

    it('should get asset by ID or return null if not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await getAssetById(tenantId, 'ast-404');
      expect(res).toBeNull();
    });

    it('should get asset by ID with lifecycle and depreciation info', async () => {
      const mockAsset = {
        id: 'ast-1',
        name: 'MacBook Pro',
        purchase_cost: '50000',
        purchase_date: '2025-01-01',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [mockAsset] })
            .mockResolvedValueOnce({ rows: [{ id: 'log-1' }] }),
        };
        return cb(client);
      });

      const res = await getAssetById(tenantId, 'ast-1');
      expect(res?.asset.id).toBe('ast-1');
      expect(res?.warranty_info).toBeDefined();
      expect(res?.depreciation_info).toBeDefined();
    });
  });

  describe('updateAsset & deleteAsset', () => {
    const tenantId = 'tenant-123';

    it('should update asset and log changes', async () => {
      const currentAsset = {
        id: 'ast-1',
        tenant_id: tenantId,
        name: 'Old Name',
        status: 'In Store',
        assigned_to: null,
      };

      const updatedAsset = {
        ...currentAsset,
        name: 'New Name',
        status: 'In Use',
        assigned_to: 'user-1',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM assets')) {
              return { rows: [currentAsset] };
            }
            if (sql.includes('UPDATE assets')) {
              return { rows: [updatedAsset] };
            }
            return { rows: [] };
          }),
        };
        return cb(client);
      });

      const res = await updateAsset(tenantId, 'ast-1', {
        name: 'New Name',
        status: 'In Use',
        assigned_to: 'user-1',
      });

      expect(res.name).toBe('New Name');
    });

    it('should delete asset and return true', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'ast-1', name: 'To Delete' }] }),
        };
        return cb(client);
      });

      const res = await deleteAsset(tenantId, 'ast-1');
      expect(res).toBe(true);
    });
  });

  describe('getAssetLifecycle', () => {
    const tenantId = 'tenant-123';

    it('should return lifecycle logs for asset', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'log-1', event_type: 'REGISTERED' }] }),
        };
        return cb(client);
      });

      const res = await getAssetLifecycle(tenantId, 'ast-1');
      expect(res.length).toBe(1);
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
