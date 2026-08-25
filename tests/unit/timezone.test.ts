import {
  getTimezoneInfo,
  formatInTimezone,
  calculateBusinessHoursDeadline,
  ConvertTimezoneSchema,
  BusinessHoursSchema,
} from '../../src/lib/timezone';

describe('Multi-Timezone Engine & Business Hours (Unit Tests)', () => {
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
  });

  describe('Timezone Formatting', () => {
    it('should format UTC date into target timezone string', () => {
      const utcDate = '2026-08-25T01:00:00.000Z'; // 08:00 in Bangkok (+7)
      const formatted = formatInTimezone(utcDate, 'Asia/Bangkok');
      expect(formatted).toContain('08:00');
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
