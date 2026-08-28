import {
  computeLogHash,
  LogAuditEntrySchema,
  logAuditEvent,
  queryAuditLogs,
  verifyAuditChain,
} from '../../src/lib/audit';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Immutable Audit Logging (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hash Computation & Chaining', () => {
    it('should compute deterministic SHA-256 hash', () => {
      const entry = {
        tenant_id: 'tenant-123',
        actor_id: 'user-456',
        action: 'UPDATE_PASSWORD',
        resource_type: 'users',
        resource_id: 'user-456',
        details: { ip: '127.0.0.1' },
        created_at: '2026-08-25T08:00:00.000Z',
      };

      const hash1 = computeLogHash('GENESIS', entry);
      const hash2 = computeLogHash('GENESIS', entry);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('should produce different hashes for different prevHash values', () => {
      const entry = {
        tenant_id: 'tenant-123',
        action: 'LOGIN',
        resource_type: 'session',
        created_at: '2026-08-25T08:00:00.000Z',
      };

      const hash1 = computeLogHash('HASH_A', entry);
      const hash2 = computeLogHash('HASH_B', entry);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('logAuditEvent', () => {
    const tenantId = 'tenant-123';

    it('should log audit event with GENESIS prev_hash for initial entry', async () => {
      const mockInserted = {
        id: 'log-1',
        tenant_id: tenantId,
        prev_hash: 'GENESIS',
        log_hash: 'computed_hash',
        action: 'CREATE_USER',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // SELECT latest
            .mockResolvedValueOnce({ rows: [mockInserted] }), // INSERT RETURNING
        };
        return cb(client);
      });

      const res = await logAuditEvent(tenantId, {
        action: 'CREATE_USER',
        resource_type: 'users',
      });

      expect(res.action).toBe('CREATE_USER');
      expect(res.prev_hash).toBe('GENESIS');
    });

    it('should chain to latest log_hash when prior logs exist', async () => {
      const prevLogHash = 'previous_valid_hash_123';
      const mockInserted = {
        id: 'log-2',
        tenant_id: tenantId,
        prev_hash: prevLogHash,
        action: 'UPDATE_USER',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ log_hash: prevLogHash }] })
            .mockResolvedValueOnce({ rows: [mockInserted] }),
        };
        return cb(client);
      });

      const res = await logAuditEvent(tenantId, {
        action: 'UPDATE_USER',
        resource_type: 'users',
      });

      expect(res.prev_hash).toBe(prevLogHash);
    });
  });

  describe('queryAuditLogs', () => {
    const tenantId = 'tenant-123';

    it('should query logs with filters and pagination', async () => {
      const mockLogs = [{ id: 'log-1', action: 'TICKET_CREATE' }];

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count query
            .mockResolvedValueOnce({ rows: mockLogs }), // data query
        };
        return cb(client);
      });

      const res = await queryAuditLogs(tenantId, {
        action: 'TICKET_CREATE',
        resource_type: 'tickets',
        actor_id: 'user-1',
        limit: 10,
        offset: 0,
      });

      expect(res.total).toBe(1);
      expect(res.logs.length).toBe(1);
    });
  });

  describe('verifyAuditChain', () => {
    const tenantId = 'tenant-123';

    it('should return verified true if no logs exist', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await verifyAuditChain(tenantId);
      expect(res.verified).toBe(true);
      expect(res.totalRecords).toBe(0);
    });

    it('should verify valid chain of records', async () => {
      const time1 = '2026-08-25T08:00:00.000Z';
      const hash1 = computeLogHash('GENESIS', {
        tenant_id: tenantId,
        actor_id: 'user-1',
        action: 'A1',
        resource_type: 'res',
        resource_id: 'r1',
        details: {},
        created_at: time1,
      });

      const time2 = '2026-08-25T08:05:00.000Z';
      const hash2 = computeLogHash(hash1, {
        tenant_id: tenantId,
        actor_id: 'user-1',
        action: 'A2',
        resource_type: 'res',
        resource_id: 'r2',
        details: {},
        created_at: time2,
      });

      const records = [
        {
          id: '1',
          tenant_id: tenantId,
          actor_id: 'user-1',
          action: 'A1',
          resource_type: 'res',
          resource_id: 'r1',
          details: {},
          prev_hash: 'GENESIS',
          log_hash: hash1,
          created_at: time1,
        },
        {
          id: '2',
          tenant_id: tenantId,
          actor_id: 'user-1',
          action: 'A2',
          resource_type: 'res',
          resource_id: 'r2',
          details: {},
          prev_hash: hash1,
          log_hash: hash2,
          created_at: time2,
        },
      ];

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: records }),
        };
        return cb(client);
      });

      const res = await verifyAuditChain(tenantId);
      expect(res.verified).toBe(true);
      expect(res.totalRecords).toBe(2);
    });

    it('should detect broken prev_hash in chain', async () => {
      const records = [
        {
          id: '1',
          tenant_id: tenantId,
          prev_hash: 'WRONG_GENESIS',
          log_hash: 'some_hash',
          created_at: '2026-08-25T08:00:00.000Z',
        },
      ];

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: records }),
        };
        return cb(client);
      });

      const res = await verifyAuditChain(tenantId);
      expect(res.verified).toBe(false);
      expect(res.error).toContain('Broken hash chain');
    });

    it('should detect payload tampering when log_hash does not match recomputed hash', async () => {
      const time1 = '2026-08-25T08:00:00.000Z';
      const records = [
        {
          id: '1',
          tenant_id: tenantId,
          actor_id: 'user-1',
          action: 'A1_TAMPERED',
          resource_type: 'res',
          resource_id: 'r1',
          details: {},
          prev_hash: 'GENESIS',
          log_hash: 'invalid_original_hash',
          created_at: time1,
        },
      ];

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: records }),
        };
        return cb(client);
      });

      const res = await verifyAuditChain(tenantId);
      expect(res.verified).toBe(false);
      expect(res.error).toContain('Hash mismatch');
    });
  });

  describe('Validation Schemas', () => {
    it('should validate audit log entry', () => {
      const parsed = LogAuditEntrySchema.parse({
        action: 'TICKET_RESOLVED',
        resource_type: 'tickets',
        resource_id: 'TK-2026-0001',
        details: { resolved_by: 'Tech Jane' },
      });
      expect(parsed.action).toBe('TICKET_RESOLVED');
      expect(parsed.resource_type).toBe('tickets');
    });
  });
});
