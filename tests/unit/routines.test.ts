import {
  calculateNextPmDueDate,
  CreateBorrowRecordSchema,
  CreatePmScheduleSchema,
  CreateRoutineChecklistSchema,
} from '../../src/lib/routines';

describe('Routines, PM & Borrow Management (Unit Tests)', () => {
  describe('PM Recurrence Calculation Engine', () => {
    const baseDate = new Date('2026-08-01T00:00:00.000Z');

    it('should calculate Daily recurrence (+1 day)', () => {
      const next = calculateNextPmDueDate(baseDate, 'Daily');
      expect(next.toISOString().startsWith('2026-08-02')).toBe(true);
    });

    it('should calculate Weekly recurrence (+7 days)', () => {
      const next = calculateNextPmDueDate(baseDate, 'Weekly');
      expect(next.toISOString().startsWith('2026-08-08')).toBe(true);
    });

    it('should calculate Monthly recurrence (+1 month)', () => {
      const next = calculateNextPmDueDate(baseDate, 'Monthly');
      expect(next.toISOString().startsWith('2026-09-01')).toBe(true);
    });

    it('should calculate Quarterly recurrence (+3 months)', () => {
      const next = calculateNextPmDueDate(baseDate, 'Quarterly');
      expect(next.toISOString().startsWith('2026-11-01')).toBe(true);
    });

    it('should calculate Yearly recurrence (+1 year)', () => {
      const next = calculateNextPmDueDate(baseDate, 'Yearly');
      expect(next.toISOString().startsWith('2027-08-01')).toBe(true);
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid borrow record payload', () => {
      const payload = {
        asset_id: 'ast-12345',
        borrower_name: 'Jane Doe',
        borrower_email: 'jane@company.com',
        expected_return_date: '2026-09-01T00:00:00.000Z',
      };
      const parsed = CreateBorrowRecordSchema.parse(payload);
      expect(parsed.borrower_name).toBe('Jane Doe');
    });

    it('should validate valid PM schedule payload', () => {
      const payload = {
        title: 'Quarterly Datacenter UPS Battery Health Check',
        target_type: 'System' as const,
        recurrence: 'Quarterly' as const,
        next_due_date: '2026-09-15T00:00:00.000Z',
        checklist_items: ['Check voltage', 'Inspect electrolyte levels', 'Clean terminals'],
      };
      const parsed = CreatePmScheduleSchema.parse(payload);
      expect(parsed.title).toContain('UPS Battery');
      expect(parsed.checklist_items.length).toBe(3);
    });

    it('should validate valid Routine Checklist payload', () => {
      const payload = {
        category: 'CCTV' as const,
        item_name: 'Building B - 3rd Floor East Corridor',
        status: 'Pass' as const,
        checked_by: 'Guard Officer',
      };
      const parsed = CreateRoutineChecklistSchema.parse(payload);
      expect(parsed.category).toBe('CCTV');
      expect(parsed.status).toBe('Pass');
    });
  });
});
