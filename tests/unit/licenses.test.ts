import {
  checkLicenseStatus,
  CreateLicenseSchema,
  AllocateSeatSchema,
} from '../../src/lib/licenses';

describe('License Management & Quota Engine (Unit Tests)', () => {
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
        expiryDate: '2026-09-15T00:00:00.000Z', // 21 days
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
