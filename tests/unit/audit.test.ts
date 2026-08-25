import { computeLogHash, LogAuditEntrySchema } from '../../src/lib/audit';

describe('Immutable Audit Logging (Unit Tests)', () => {
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
