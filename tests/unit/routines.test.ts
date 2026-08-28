import {
  calculateNextPmDueDate,
  CreateBorrowRecordSchema,
  CreatePmScheduleSchema,
  CreateRoutineChecklistSchema,
  createBorrowRecord,
  listBorrowRecords,
  returnBorrowRecord,
  createPmSchedule,
  listPmSchedules,
  executePmSchedule,
  createRoutineChecklist,
  listRoutineChecklists,
  createTicketFromFailedChecklist,
} from '../../src/lib/routines';
import * as db from '../../src/lib/db';
import * as tickets from '../../src/lib/tickets';

jest.mock('../../src/lib/db');
jest.mock('../../src/lib/tickets');

describe('Routines, PM & Borrow Management (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;
  const mockCreateTicket = tickets.createTicket as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('Borrow Operations', () => {
    const tenantId = 'tenant-123';

    it('should create borrow record and update asset status to In Use', async () => {
      const mockBorrow = {
        id: 'bw-1',
        borrow_code: 'BW-2026-0001',
        asset_id: 'ast-1',
        borrower_name: 'Jane Doe',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [mockBorrow] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await createBorrowRecord(tenantId, {
        asset_id: 'ast-1',
        borrower_name: 'Jane Doe',
        expected_return_date: '2026-09-01T00:00:00.000Z',
      });

      expect(res.borrow_code).toBe('BW-2026-0001');
    });

    it('should list borrow records and dynamically compute Overdue status', async () => {
      const mockRecords = [
        {
          id: 'bw-1',
          status: 'Borrowed',
          expected_return_date: '2020-01-01T00:00:00.000Z',
        },
        {
          id: 'bw-2',
          status: 'Borrowed',
          expected_return_date: '2099-01-01T00:00:00.000Z',
        },
      ];

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: mockRecords }),
        };
        return cb(client);
      });

      const res = await listBorrowRecords(tenantId, { status: 'Borrowed' });
      expect(res[0].status).toBe('Overdue');
      expect(res[1].status).toBe('Borrowed');
    });

    it('should return borrow record and update asset status to In Stock', async () => {
      const currentRecord = { id: 'bw-1', asset_id: 'ast-1' };
      const returnedRecord = { ...currentRecord, status: 'Returned' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [currentRecord] })
            .mockResolvedValueOnce({ rows: [returnedRecord] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await returnBorrowRecord(tenantId, 'bw-1', {
        condition_on_return: 'Good condition',
      });
      expect(res.status).toBe('Returned');
    });

    it('should throw error when returning nonexistent borrow record', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      await expect(returnBorrowRecord(tenantId, 'bw-404', {})).rejects.toThrow('Borrow record not found');
    });
  });

  describe('PM Schedules & Checklists', () => {
    const tenantId = 'tenant-123';

    it('should create and list PM schedules', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'pm-1', title: 'UPS Check' }] }),
        };
        return cb(client);
      });

      const pm = await createPmSchedule(tenantId, {
        title: 'UPS Check',
        target_type: 'System',
        recurrence: 'Monthly',
        next_due_date: '2026-09-01T00:00:00.000Z',
      });
      expect(pm.id).toBe('pm-1');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'pm-1' }] }),
        };
        return cb(client);
      });

      const list = await listPmSchedules(tenantId);
      expect(list.length).toBe(1);
    });

    it('should execute PM schedule and calculate next due date', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'pm-1', recurrence: 'Monthly' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'pm-1', next_due_date: '2026-09-28' }] }),
        };
        return cb(client);
      });

      const res = await executePmSchedule(tenantId, 'pm-1');
      expect(res.id).toBe('pm-1');
    });

    it('should create, list routine checklists, and create ticket from failed checklist', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'chk-1', item_name: 'CCTV 1' }] }),
        };
        return cb(client);
      });

      const chk = await createRoutineChecklist(tenantId, {
        category: 'CCTV',
        item_name: 'CCTV 1',
        status: 'Fail',
        remarks: 'Camera broken',
      });
      expect(chk.id).toBe('chk-1');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'chk-1' }] }),
        };
        return cb(client);
      });

      const list = await listRoutineChecklists(tenantId, 'CCTV');
      expect(list.length).toBe(1);

      mockCreateTicket.mockResolvedValueOnce({ id: 'tk-repair-1' });

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rows: [{ id: 'chk-1', category: 'CCTV', item_name: 'CCTV 1', check_date: '2026-08-25' }],
            })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const ticket = await createTicketFromFailedChecklist(tenantId, 'chk-1');
      expect(ticket.id).toBe('tk-repair-1');
    });
  });
});
