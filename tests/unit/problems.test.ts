import {
  CreateProblemSchema,
  UpdateProblemSchema,
  LinkTicketsSchema,
  ResolveProblemSchema,
  createProblem,
  getProblemById,
  listProblems,
  updateProblem,
  linkTicketsToProblem,
  unlinkTicketFromProblem,
  getProblemLinkedTickets,
  resolveProblemAndCascade,
  searchKnownErrorDatabase,
} from '../../src/lib/problems';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Problem Management & KEDB (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('should validate valid problem creation payload', () => {
      const payload = {
        title: 'Core Switch Intermittent Packet Loss',
        description: 'VLAN 10 and 20 experiencing 15% packet drops',
        category: 'Network',
        priority: 'High' as const,
        impact: 'High' as const,
        is_known_error: true,
        workaround: 'Reroute traffic to Secondary Switch B',
      };
      const parsed = CreateProblemSchema.parse(payload);
      expect(parsed.title).toBe('Core Switch Intermittent Packet Loss');
      expect(parsed.is_known_error).toBe(true);
      expect(parsed.category).toBe('Network');
    });

    it('should validate problem update payload', () => {
      const payload = {
        status: 'Investigating' as const,
        root_cause: 'Faulty SFP+ transceiver port 24',
      };
      const parsed = UpdateProblemSchema.parse(payload);
      expect(parsed.status).toBe('Investigating');
      expect(parsed.root_cause).toBe('Faulty SFP+ transceiver port 24');
    });

    it('should validate ticket linking payload', () => {
      const parsed = LinkTicketsSchema.parse({
        ticket_ids: ['TK-2026-0001', 'TK-2026-0002'],
      });
      expect(parsed.ticket_ids.length).toBe(2);
    });

    it('should validate resolution payload', () => {
      const payload = {
        root_cause: 'Firmware bug in switch OS v12.4',
        solution: 'Upgraded switch firmware to v12.4.2 patch',
        cascade_to_tickets: true,
      };
      const parsed = ResolveProblemSchema.parse(payload);
      expect(parsed.root_cause).toBe('Firmware bug in switch OS v12.4');
      expect(parsed.cascade_to_tickets).toBe(true);
    });

    it('should reject resolution payload missing root cause or solution', () => {
      expect(() =>
        ResolveProblemSchema.parse({
          root_cause: '',
          solution: 'Fixed',
        })
      ).toThrow();
    });
  });

  describe('Problem CRUD Operations', () => {
    const tenantId = 'tenant-123';

    it('should create problem and link initial tickets', async () => {
      const mockProblem = {
        id: 'PRB-2026-0001',
        title: 'DB Connection Timeout',
        status: 'Open',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // generate ID
            .mockResolvedValueOnce({ rows: [mockProblem] }) // insert problem
            .mockResolvedValueOnce({ rows: [] }), // link initial ticket
        };
        return cb(client);
      });

      const res = await createProblem(tenantId, {
        title: 'DB Connection Timeout',
        description: 'Database connections timing out under heavy load',
        category: 'Database',
        priority: 'High',
        impact: 'High',
        ticket_ids: ['TK-1'],
      });

      expect(res.id).toBe('PRB-2026-0001');
      expect(res.linked_tickets_count).toBe(1);
    });

    it('should get and list problems with category and is_known_error filters', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 'PRB-1', title: 'DB Timeout', linked_tickets_count: '2' }],
          }),
        };
        return cb(client);
      });

      const prob = await getProblemById(tenantId, 'PRB-1');
      expect(prob?.id).toBe('PRB-1');
      expect(prob?.linked_tickets_count).toBe(2);

      const list = await listProblems(tenantId, {
        status: 'Open',
        category: 'Database',
        is_known_error: false,
        search: 'DB',
      });
      expect(list.length).toBe(1);
    });

    it('should update all problem attributes', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 'PRB-1', status: 'Investigating', root_cause: 'Deadlock' }],
          }),
        };
        return cb(client);
      });

      const updated = await updateProblem(tenantId, 'PRB-1', {
        title: 'New Title',
        description: 'New Desc',
        category: 'Database',
        priority: 'Critical',
        impact: 'Critical',
        status: 'Investigating',
        assigned_to: 'tech-1',
        root_cause: 'Deadlock',
        workaround: 'Restart',
        solution: 'Patch',
        is_known_error: true,
      });
      expect(updated.status).toBe('Investigating');
    });
  });

  describe('Ticket Linking & Cascade Resolution', () => {
    const tenantId = 'tenant-123';

    it('should link and unlink tickets to problem', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ ticket_id: 'TK-1' }] }),
        };
        return cb(client);
      });

      const linkedCount = await linkTicketsToProblem(tenantId, 'PRB-1', ['TK-1']);
      expect(linkedCount).toBe(1);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ ticket_id: 'TK-1' }] }),
        };
        return cb(client);
      });

      const unlinked = await unlinkTicketFromProblem(tenantId, 'PRB-1', 'TK-1');
      expect(unlinked).toBe(true);
    });

    it('should get problem linked tickets list', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'TK-1', title: 'Crash' }] }),
        };
        return cb(client);
      });

      const tickets = await getProblemLinkedTickets(tenantId, 'PRB-1');
      expect(tickets.length).toBe(1);
    });

    it('should resolve problem and cascade resolution to open tickets', async () => {
      const resolvedProblem = { id: 'PRB-1', status: 'Resolved' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [resolvedProblem] }) // update problem
            .mockResolvedValueOnce({ rows: [{ ticket_id: 'TK-1' }] }) // select links
            .mockResolvedValueOnce({ rows: [{ id: 'TK-1' }] }), // update ticket
        };
        return cb(client);
      });

      const res = await resolveProblemAndCascade(tenantId, 'PRB-1', {
        root_cause: 'Memory leak in pool',
        solution: 'Restarted service and patched memory management',
        cascade_to_tickets: true,
      });

      expect(res.problem.status).toBe('Resolved');
      expect(res.cascadedTicketsCount).toBe(1);
    });

    it('should search Known Error Database (KEDB)', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 'PRB-1', is_known_error: true, workaround: 'Use fallback route' }],
          }),
        };
        return cb(client);
      });

      const kedb = await searchKnownErrorDatabase(tenantId, 'fallback');
      expect(kedb.length).toBe(1);
      expect(kedb[0].workaround).toBe('Use fallback route');
    });
  });
});
