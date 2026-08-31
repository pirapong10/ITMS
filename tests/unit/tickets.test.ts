import {
  CreateTicketSchema,
  UpdateTicketSchema,
  ResolutionSchema,
  CsatSchema,
  CannedResponseSchema,
  createTicket,
  listTickets,
  getTicketById,
  updateTicket,
  resolveTicket,
  submitCsat,
  listCannedResponses,
  createCannedResponse,
  generateTicketNumber,
} from '../../src/lib/tickets';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Ticket Validation & Operations (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('should validate valid ticket payload with defaults', () => {
      const valid = { title: 'Network printer not responding' };
      const parsed = CreateTicketSchema.parse(valid);
      expect(parsed.title).toBe('Network printer not responding');
      expect(parsed.priority).toBe('Medium');
      expect(parsed.category).toBe('General');
      expect(parsed.description).toBe('');
      expect(parsed.attachments).toEqual([]);
    });

    it('should validate full ticket payload', () => {
      const full = {
        title: 'Core Switch failure',
        description: 'Server room switch down',
        category: 'Network',
        priority: 'Critical',
        assigned_to: 'tech-01',
        reporter_name: 'John Doe',
        reporter_email: 'john@example.com',
        attachments: [{ name: 'log.txt', url: 'https://cdn.example.com/log.txt' }],
      };
      const parsed = CreateTicketSchema.parse(full);
      expect(parsed.priority).toBe('Critical');
      expect(parsed.reporter_email).toBe('john@example.com');
      expect(parsed.attachments.length).toBe(1);
    });

    it('should reject invalid title or email', () => {
      expect(() => CreateTicketSchema.parse({ title: 'ab' })).toThrow();
      expect(() => CreateTicketSchema.parse({ title: 'Valid Title', reporter_email: 'not-an-email' })).toThrow();
      expect(() => CreateTicketSchema.parse({ title: 'Valid Title', priority: 'SuperUrgent' as any })).toThrow();
    });

    it('should validate partial update payload', () => {
      const update = { status: 'In Progress', assigned_to: 'tech-02' };
      const parsed = UpdateTicketSchema.parse(update);
      expect(parsed.status).toBe('In Progress');
      expect(parsed.assigned_to).toBe('tech-02');
    });

    it('should reject invalid status value', () => {
      expect(() => UpdateTicketSchema.parse({ status: 'UnknownStatus' })).toThrow();
    });

    it('should validate valid resolution payload', () => {
      const res = { resolution_notes: 'Replaced power supply unit and verified voltages.' };
      const parsed = ResolutionSchema.parse(res);
      expect(parsed.resolution_notes).toContain('Replaced power supply');
    });

    it('should reject empty resolution notes', () => {
      expect(() => ResolutionSchema.parse({ resolution_notes: 'no' })).toThrow();
    });

    it('should accept valid 1-5 CSAT rating', () => {
      expect(CsatSchema.parse({ rating: 1 }).rating).toBe(1);
      expect(CsatSchema.parse({ rating: 5, feedback: 'Great service' }).rating).toBe(5);
    });

    it('should reject out-of-range CSAT rating', () => {
      expect(() => CsatSchema.parse({ rating: 0 })).toThrow();
      expect(() => CsatSchema.parse({ rating: 6 })).toThrow();
    });

    it('should validate canned response payload', () => {
      const res = {
        title: 'Password Reset Steps',
        content: 'Please visit the self-service portal to reset your password.',
        shortcut_code: '#pwd-reset',
      };
      const parsed = CannedResponseSchema.parse(res);
      expect(parsed.title).toBe('Password Reset Steps');
      expect(parsed.category).toBe('General');
    });
  });

  describe('generateTicketNumber', () => {
    it('should generate formatted sequential running number', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [{ count: '5' }] }),
      };

      const ticketNum = await generateTicketNumber(mockClient, 'tenant-123', 2026);
      expect(ticketNum).toBe('TK-2026-0006');
    });
  });

  describe('createTicket', () => {
    const tenantId = 'tenant-123';

    it('should create ticket and return record', async () => {
      const mockTicket = {
        id: 'tk-1',
        tenant_id: tenantId,
        ticket_number: 'TK-2026-0001',
        title: 'Printer Broken',
        priority: 'Medium',
        status: 'Open',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generateTicketNumber
            .mockResolvedValueOnce({ rows: [mockTicket] }) // insert ticket
            .mockResolvedValueOnce({ rows: [] }), // audit log
        };
        return cb(client);
      });

      const res = await createTicket(tenantId, { title: 'Printer Broken' }, { id: 'u1', name: 'Admin' });
      expect(res.ticket_number).toBe('TK-2026-0001');
    });
  });

  describe('listTickets', () => {
    const tenantId = 'tenant-123';

    it('should list tickets with filters, search, and calculate SLA state', async () => {
      const mockTicket = {
        id: 'tk-1',
        tenant_id: tenantId,
        title: 'Server Down',
        priority: 'Critical',
        status: 'In Progress',
        created_at: new Date().toISOString(),
        sla_deadline: new Date(Date.now() + 3600000).toISOString(),
        sla_total_paused_seconds: 0,
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count
            .mockResolvedValueOnce({ rows: [mockTicket] }), // list
        };
        return cb(client);
      });

      const res = await listTickets(tenantId, {
        status: 'In Progress',
        priority: 'Critical',
        category: 'Hardware',
        assigned_to: 'tech-1',
        breached: false,
        search: 'Server',
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.tickets[0].sla_state).toBeDefined();
    });
  });

  describe('getTicketById', () => {
    const tenantId = 'tenant-123';

    it('should return null if ticket not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await getTicketById(tenantId, 'nonexistent');
      expect(res).toBeNull();
    });

    it('should return ticket with audit logs and slaState', async () => {
      const mockTicket = {
        id: 'tk-1',
        tenant_id: tenantId,
        title: 'App Crash',
        priority: 'High',
        status: 'Open',
        created_at: new Date().toISOString(),
        sla_deadline: new Date(Date.now() + 7200000).toISOString(),
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [mockTicket] }) // select ticket
            .mockResolvedValueOnce({ rows: [{ id: 'log-1', action: 'TICKET_CREATED' }] }), // logs
        };
        return cb(client);
      });

      const res = await getTicketById(tenantId, 'tk-1');
      expect(res?.ticket.id).toBe('tk-1');
      expect(res?.auditLogs.length).toBe(1);
      expect(res?.slaState).toBeDefined();
    });
  });

  describe('updateTicket', () => {
    const tenantId = 'tenant-123';

    it('should throw error if ticket not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      await expect(updateTicket(tenantId, 'tk-404', { title: 'New Title' })).rejects.toThrow('Ticket not found');
    });

    it('should update ticket attributes (title, desc, category, assigned_to, priority, status)', async () => {
      const currentTicket = {
        id: 'tk-1',
        tenant_id: tenantId,
        title: 'Old Title',
        description: 'Old Desc',
        category: 'General',
        assigned_to: 'tech-1',
        priority: 'Low',
        status: 'Open',
        created_at: new Date().toISOString(),
        sla_deadline: new Date().toISOString(),
        sla_paused_at: null,
        sla_total_paused_seconds: 0,
      };

      const updatedTicket = {
        ...currentTicket,
        title: 'New Title',
        priority: 'High',
        status: 'In Progress',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM tickets')) {
              return { rows: [currentTicket] };
            }
            if (sql.includes('UPDATE tickets')) {
              return { rows: [updatedTicket] };
            }
            return { rows: [] };
          }),
        };
        return cb(client);
      });

      const res = await updateTicket(tenantId, 'tk-1', {
        title: 'New Title',
        description: 'New Desc',
        category: 'Network',
        assigned_to: 'tech-2',
        priority: 'High',
        status: 'In Progress',
      });

      expect(res.title).toBe('New Title');
    });
  });

  describe('resolveTicket & submitCsat', () => {
    const tenantId = 'tenant-123';

    it('should resolve ticket and update resolution notes', async () => {
      const currentTicket = {
        id: 'tk-1',
        tenant_id: tenantId,
        status: 'In Progress',
        sla_deadline: new Date().toISOString(),
        sla_paused_at: null,
        sla_total_paused_seconds: 0,
      };

      const resolvedTicket = {
        ...currentTicket,
        status: 'Resolved',
        resolution_notes: 'Fixed by rebooting server',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [currentTicket] })
            .mockResolvedValueOnce({ rows: [resolvedTicket] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await resolveTicket(tenantId, 'tk-1', {
        resolution_notes: 'Fixed by rebooting server',
      });

      expect(res.status).toBe('Resolved');
    });

    it('should submit CSAT rating and feedback', async () => {
      const currentTicket = { id: 'tk-1', reporter_name: 'Alice' };
      const updatedTicket = { ...currentTicket, csat_rating: 5, csat_feedback: 'Great!' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [currentTicket] })
            .mockResolvedValueOnce({ rows: [updatedTicket] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await submitCsat(tenantId, 'tk-1', { rating: 5, feedback: 'Great!' });
      expect(res.csat_rating).toBe(5);
    });
  });

  describe('canned responses', () => {
    const tenantId = 'tenant-123';

    it('should list canned responses with optional category', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'canned-1' }] }),
        };
        return cb(client);
      });

      const res = await listCannedResponses(tenantId, 'General');
      expect(res.length).toBe(1);
    });

    it('should create canned response', async () => {
      const mockCanned = { id: 'canned-1', title: 'Welcome', category: 'General' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [mockCanned] }),
        };
        return cb(client);
      });

      const res = await createCannedResponse(tenantId, {
        category: 'General',
        title: 'Welcome',
        content: 'Hello, how can I help you?',
      });

      expect(res.title).toBe('Welcome');
    });
  });
});
