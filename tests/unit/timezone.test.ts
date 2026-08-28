import {
  getTimezoneInfo,
  formatInTimezone,
  convertTimestamp,
  calculateBusinessHoursDeadline,
  getTenantBusinessHoursSettings,
  updateTenantBusinessHoursSettings,
  ConvertTimezoneSchema,
  BusinessHoursSchema,
} from '../../src/lib/timezone';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Multi-Timezone Engine & Business Hours (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Timezone Offsets & Info', () => {
    it('should return +07:00 for Asia/Bangkok', () => {
      const info = getTimezoneInfo('Asia/Bangkok');
      expect(info.offset).toBe('+07:00');
      expect(info.offsetMinutes).toBe(420);
      expect(info.isDst).toBe(false);
    });

    it('should return +00:00 for UTC', () => {
      const info = getTimezoneInfo('UTC');
      expect(info.offset).toBe('+00:00');
      expect(info.offsetMinutes).toBe(0);
    });

    it('should calculate offset for western negative timezone and DST', () => {
      const summerDate = new Date('2026-07-01T12:00:00Z');
      const winterDate = new Date('2026-01-01T12:00:00Z');
      const summerInfo = getTimezoneInfo('America/New_York', summerDate);
      const winterInfo = getTimezoneInfo('America/New_York', winterDate);
      expect(summerInfo.offsetMinutes).toBe(-240); // -04:00 (EDT)
      expect(winterInfo.offsetMinutes).toBe(-300); // -05:00 (EST)
    });
  });

  describe('Timezone Formatting & Conversion', () => {
    it('should format UTC date into target timezone string', () => {
      const utcDate = '2026-08-25T01:00:00.000Z'; // 08:00 in Bangkok (+7)
      const formatted = formatInTimezone(utcDate, 'Asia/Bangkok');
      expect(formatted).toContain('08:00');
    });

    it('should convert timestamp to target timezone payload', () => {
      const res = convertTimestamp({
        timestamp: '2026-08-25T01:00:00.000Z',
        target_timezone: 'Asia/Bangkok',
      });
      expect(res.utcIso).toBe('2026-08-25T01:00:00.000Z');
      expect(res.targetTimezone).toBe('Asia/Bangkok');
      expect(res.offset).toBe('+07:00');
    });
  });

  describe('Business Hours SLA Deadline Engine', () => {
    const config = {
      start: '08:30',
      end: '17:30', // 9 hours per day
      work_days: [1, 2, 3, 4, 5], // Mon-Fri
      holidays: ['2026-08-26'], // Wednesday holiday
    };

    it('should calculate deadline within same day business hours', () => {
      // Monday 2026-08-24 09:00 + 4 hours -> Monday 2026-08-24 13:00
      const start = new Date('2026-08-24T09:00:00.000Z');
      const deadline = calculateBusinessHoursDeadline(start, 4, config);
      expect(deadline.getUTCHours()).toBe(13);
      expect(deadline.getUTCMinutes()).toBe(0);
      expect(deadline.getUTCDate()).toBe(24);
    });

    it('should rollover after-hours start to next business day start', () => {
      // Monday 2026-08-24 18:00 (after 17:30) + 2 hours -> Tuesday 2026-08-25 10:30
      const start = new Date('2026-08-24T18:00:00.000Z');
      const deadline = calculateBusinessHoursDeadline(start, 2, config);
      expect(deadline.getUTCDate()).toBe(25);
      expect(deadline.getUTCHours()).toBe(10);
      expect(deadline.getUTCMinutes()).toBe(30);
    });

    it('should rollover before-hours start to today business start', () => {
      // Monday 2026-08-24 06:00 (before 08:30) + 2 hours -> Monday 2026-08-24 10:30
      const start = new Date('2026-08-24T06:00:00.000Z');
      const deadline = calculateBusinessHoursDeadline(start, 2, config);
      expect(deadline.getUTCDate()).toBe(24);
      expect(deadline.getUTCHours()).toBe(10);
      expect(deadline.getUTCMinutes()).toBe(30);
    });

    it('should skip weekends when advancing deadline', () => {
      // Friday 2026-08-28 16:30 + 2 hours -> Monday 2026-08-31 09:30
      const start = new Date('2026-08-28T16:30:00.000Z');
      const deadline = calculateBusinessHoursDeadline(start, 2, config);
      expect(deadline.getUTCDate()).toBe(31); // Monday
      expect(deadline.getUTCHours()).toBe(9);
      expect(deadline.getUTCMinutes()).toBe(30);
    });

    it('should skip configured holidays', () => {
      // Tuesday 2026-08-25 16:30 + 2 hours with Wednesday 2026-08-26 holiday -> Thursday 2026-08-27 09:30
      const start = new Date('2026-08-25T16:30:00.000Z');
      const deadline = calculateBusinessHoursDeadline(start, 2, config);
      expect(deadline.getUTCDate()).toBe(27); // Thursday
      expect(deadline.getUTCHours()).toBe(9);
      expect(deadline.getUTCMinutes()).toBe(30);
    });

    it('should fallback to 24/7 continuous if config is invalid (end <= start)', () => {
      const invalidConfig = {
        start: '18:00',
        end: '08:00',
        work_days: [1, 2, 3],
      };
      const start = new Date('2026-08-24T10:00:00.000Z');
      const deadline = calculateBusinessHoursDeadline(start, 5, invalidConfig);
      expect(deadline.getUTCHours()).toBe(15);
    });
  });

  describe('Tenant Timezone Settings', () => {
    const tenantId = 'tenant-123';

    it('should return default settings if row not found in DB', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await getTenantBusinessHoursSettings(tenantId);
      expect(res.timezone).toBe('Asia/Bangkok');
      expect(res.business_hours.start).toBe('08:30');
    });

    it('should return custom settings from DB', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ timezone: 'Europe/London', business_hours: { start: '09:00', end: '17:00' } }],
          }),
        };
        return cb(client);
      });

      const res = await getTenantBusinessHoursSettings(tenantId);
      expect(res.timezone).toBe('Europe/London');
    });

    it('should update tenant business hours and timezone settings', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ timezone: 'Asia/Tokyo', business_hours: { start: '09:00', end: '18:00' } }],
          }),
        };
        return cb(client);
      });

      const res = await updateTenantBusinessHoursSettings(tenantId, {
        timezone: 'Asia/Tokyo',
        business_hours: {
          start: '09:00',
          end: '18:00',
          work_days: [1, 2, 3, 4, 5],
        },
      });

      expect(res.timezone).toBe('Asia/Tokyo');
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid conversion payload', () => {
      const payload = {
        timestamp: '2026-08-25T08:00:00.000Z',
        target_timezone: 'America/New_York',
      };
      const parsed = ConvertTimezoneSchema.parse(payload);
      expect(parsed.target_timezone).toBe('America/New_York');
    });

    it('should validate valid business hours config', () => {
      const payload = {
        start: '09:00',
        end: '18:00',
        work_days: [1, 2, 3, 4, 5],
      };
      const parsed = BusinessHoursSchema.parse(payload);
      expect(parsed.start).toBe('09:00');
      expect(parsed.end).toBe('18:00');
    });
  });
});
