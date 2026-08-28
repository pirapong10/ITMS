import {
  checkLicenseStatus,
  CreateLicenseSchema,
  AllocateSeatSchema,
  createLicense,
  listLicenses,
  getLicenseById,
  updateLicense,
  deleteLicense,
  allocateSeat,
  unallocateSeat,
  generateLicenseTag,
} from '../../src/lib/licenses';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('License Management & Quota Engine (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('License Expiry & Quota Status Checker', () => {
    const asOf = new Date('2026-08-25T00:00:00.000Z');

    it('should report Active when seats are available and expiry is far', () => {
      const res = checkLicenseStatus({
        expiryDate: '2027-08-25T00:00:00.000Z',
        totalSeats: 10,
        allocatedSeats: 4,
        asOfDate: asOf,
      });

      expect(res.status).toBe('Active');
      expect(res.availableSeats).toBe(6);
      expect(res.daysRemaining).toBe(365);
    });

    it('should report Depleted when all seats are allocated', () => {
      const res = checkLicenseStatus({
        expiryDate: '2027-08-25T00:00:00.000Z',
        totalSeats: 5,
        allocatedSeats: 5,
        asOfDate: asOf,
      });

      expect(res.status).toBe('Depleted');
      expect(res.availableSeats).toBe(0);
    });

    it('should report Expiring Soon when expiry <= 30 days', () => {
      const res = checkLicenseStatus({
        expiryDate: '2026-09-15T00:00:00.000Z',
        totalSeats: 10,
        allocatedSeats: 2,
        asOfDate: asOf,
      });

      expect(res.status).toBe('Expiring Soon');
      expect(res.daysRemaining).toBe(21);
    });

    it('should report Expired when expiry date has passed', () => {
      const res = checkLicenseStatus({
        expiryDate: '2026-08-01T00:00:00.000Z',
        totalSeats: 10,
        allocatedSeats: 2,
        asOfDate: asOf,
      });

      expect(res.status).toBe('Expired');
      expect(res.daysRemaining).toBeLessThanOrEqual(0);
    });
  });

  describe('generateLicenseTag', () => {
    it('should generate formatted sequential license tag', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [{ count: '2' }] }),
      };
      const tag = await generateLicenseTag(mockClient, 'tenant-123', 2026);
      expect(tag).toBe('LIC-2026-0003');
    });
  });

  describe('createLicense', () => {
    const tenantId = 'tenant-123';

    it('should create license record with initialized seat counts', async () => {
      const mockLicense = {
        id: 'lic-1',
        tenant_id: tenantId,
        license_tag: 'LIC-2026-0001',
        software_name: 'Figma Enterprise',
        total_seats: '10',
        allocated_seats: '0',
        cost_per_seat: '1500',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [mockLicense] }),
        };
        return cb(client);
      });

      const res = await createLicense(tenantId, {
        software_name: 'Figma Enterprise',
        license_type: 'Subscription',
        total_seats: 10,
        cost_per_seat: 1500,
      });

      expect(res.license_tag).toBe('LIC-2026-0001');
      expect(res.total_seats).toBe(10);
    });
  });

  describe('listLicenses & getLicenseById', () => {
    const tenantId = 'tenant-123';

    it('should list licenses with computed status', async () => {
      const mockLicense = {
        id: 'lic-1',
        software_name: 'Adobe CC',
        total_seats: '5',
        allocated_seats: '2',
        cost_per_seat: '2000',
        expiry_date: '2027-01-01',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ total: '1' }] })
            .mockResolvedValueOnce({ rows: [mockLicense] }),
        };
        return cb(client);
      });

      const res = await listLicenses(tenantId, { license_type: 'Subscription', vendor: 'Adobe', search: 'CC' });
      expect(res.total).toBe(1);
      expect(res.licenses[0].status_info).toBeDefined();
    });

    it('should get license by ID or return null if not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await getLicenseById(tenantId, 'lic-404');
      expect(res).toBeNull();
    });

    it('should get license by ID with allocations', async () => {
      const mockLicense = {
        id: 'lic-1',
        total_seats: '5',
        allocated_seats: '1',
        cost_per_seat: '100',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [mockLicense] })
            .mockResolvedValueOnce({ rows: [{ id: 'alloc-1' }] }),
        };
        return cb(client);
      });

      const res = await getLicenseById(tenantId, 'lic-1');
      expect(res?.allocations.length).toBe(1);
    });
  });

  describe('updateLicense & deleteLicense', () => {
    const tenantId = 'tenant-123';

    it('should update license fields and recalculate status', async () => {
      const currentLicense = {
        id: 'lic-1',
        total_seats: '10',
        allocated_seats: '5',
        expiry_date: '2027-01-01',
      };
      const updatedLicense = {
        ...currentLicense,
        software_name: 'New Name',
        total_seats: '20',
        allocated_seats: '5',
        cost_per_seat: '100',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [currentLicense] })
            .mockResolvedValueOnce({ rows: [updatedLicense] }),
        };
        return cb(client);
      });

      const res = await updateLicense(tenantId, 'lic-1', { total_seats: 20, software_name: 'New Name' });
      expect(res.total_seats).toBe(20);
    });

    it('should delete license and return true', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'lic-1' }] }),
        };
        return cb(client);
      });

      const res = await deleteLicense(tenantId, 'lic-1');
      expect(res).toBe(true);
    });
  });

  describe('allocate & unallocate seats', () => {
    const tenantId = 'tenant-123';

    it('should throw error when license not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      await expect(allocateSeat(tenantId, 'lic-404', { user_name: 'Bob' })).rejects.toThrow(
        'License not found'
      );
    });

    it('should throw error when quota is exceeded', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 'lic-1', total_seats: '5', allocated_seats: '5' }],
          }),
        };
        return cb(client);
      });

      await expect(allocateSeat(tenantId, 'lic-1', { user_name: 'Bob' })).rejects.toThrow(
        'Quota Exceeded'
      );
    });

    it('should allocate seat successfully and increment allocated count', async () => {
      const mockAlloc = { id: 'alloc-1', user_name: 'Bob' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'lic-1', total_seats: '10', allocated_seats: '2' }] }) // select license
            .mockResolvedValueOnce({ rows: [mockAlloc] }) // insert allocation
            .mockResolvedValueOnce({ rows: [] }), // update license
        };
        return cb(client);
      });

      const res = await allocateSeat(tenantId, 'lic-1', { user_name: 'Bob' });
      expect(res.id).toBe('alloc-1');
    });

    it('should unallocate seat and decrement count', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'alloc-1', license_id: 'lic-1', user_name: 'Bob' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'lic-1', allocated_seats: '2', status: 'Active' }] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await unallocateSeat(tenantId, 'lic-1', 'alloc-1');
      expect(res).toBe(true);
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid license payload', () => {
      const payload = {
        software_name: 'Microsoft 365 Business Standard',
        license_type: 'Subscription' as const,
        total_seats: 50,
        cost_per_seat: 450,
      };

      const parsed = CreateLicenseSchema.parse(payload);
      expect(parsed.software_name).toBe('Microsoft 365 Business Standard');
      expect(parsed.total_seats).toBe(50);
      expect(parsed.cost_per_seat).toBe(450);
    });

    it('should validate valid allocation payload', () => {
      const payload = {
        user_name: 'Somchai Prasert',
        user_email: 'somchai@company.com',
      };

      const parsed = AllocateSeatSchema.parse(payload);
      expect(parsed.user_name).toBe('Somchai Prasert');
      expect(parsed.user_email).toBe('somchai@company.com');
    });

    it('should reject invalid total seats or short user name', () => {
      expect(() =>
        CreateLicenseSchema.parse({
          software_name: 'Valid Name',
          total_seats: 0,
        })
      ).toThrow();

      expect(() =>
        AllocateSeatSchema.parse({
          user_name: 's',
        })
      ).toThrow();
    });
  });
});
