import {
  CreateApiKeySchema,
  hashApiKey,
  checkRateLimit,
  createApiKey,
  authenticateApiKey,
  listApiKeys,
  revokeApiKey,
} from '../../src/lib/api-keys';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('API Keys & Rate Limiting (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;
  const mockQuery = db.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('should validate API key creation payload', () => {
      const payload = {
        name: 'Zapier Integration Key',
        scopes: ['tickets:read', 'tickets:write'],
        rate_limit: 250,
        expires_in_days: 90,
      };
      const parsed = CreateApiKeySchema.parse(payload);
      expect(parsed.name).toBe('Zapier Integration Key');
      expect(parsed.rate_limit).toBe(250);
      expect(parsed.scopes.length).toBe(2);
    });
  });

  describe('Key Hashing', () => {
    it('should compute consistent SHA-256 hash', () => {
      const hash1 = hashApiKey('ak_live_sample123');
      const hash2 = hashApiKey('ak_live_sample123');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  describe('Sliding Window Rate Limiter', () => {
    it('should allow requests within rate limit and reject when exceeded', () => {
      const testKeyHash = 'test_hash_' + Math.random();
      const limit = 3;

      const r1 = checkRateLimit(testKeyHash, limit);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = checkRateLimit(testKeyHash, limit);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = checkRateLimit(testKeyHash, limit);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      const r4 = checkRateLimit(testKeyHash, limit);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
    });
  });

  describe('createApiKey', () => {
    it('should generate raw key and persist record in DB', async () => {
      const tenantId = 'tenant-123';
      const mockRecord = {
        id: 'key-1',
        tenant_id: tenantId,
        name: 'Test Key',
        scopes: ['*.*'],
        rate_limit: 100,
        is_active: true,
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [mockRecord] }),
        };
        return cb(client);
      });

      const res = await createApiKey(tenantId, {
        name: 'Test Key',
        expires_in_days: 30,
      });

      expect(res.name).toBe('Test Key');
      expect(res.raw_key).toMatch(/^ak_live_/);
    });
  });

  describe('authenticateApiKey', () => {
    it('should reject invalid raw key format', async () => {
      const res = await authenticateApiKey('invalid_prefix_key');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid API Key format');
    });

    it('should reject if key record is not found or inactive', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await authenticateApiKey('ak_live_abcdef1234567890abcdef');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Invalid or revoked API Key');
    });

    it('should reject expired key', async () => {
      const expiredDate = new Date(Date.now() - 100000).toISOString();
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tenant_id: 'tenant-1',
            scopes: ['*.*'],
            rate_limit: 100,
            expires_at: expiredDate,
          },
        ],
      });

      const res = await authenticateApiKey('ak_live_abcdef1234567890abcdef');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('API Key has expired');
    });

    it('should authenticate valid key with wildcard scope', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tenant_id: 'tenant-1',
            scopes: ['*.*'],
            rate_limit: 100,
            expires_at: null,
          },
        ],
      });

      const res = await authenticateApiKey('ak_live_abcdef1234567890abcdef', 'tickets:read');
      expect(res.valid).toBe(true);
      expect(res.tenantId).toBe('tenant-1');
    });

    it('should authenticate valid key with domain wildcard scope', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tenant_id: 'tenant-1',
            scopes: ['tickets:*'],
            rate_limit: 100,
            expires_at: null,
          },
        ],
      });

      const res = await authenticateApiKey('ak_live_abcdef1234567890abcdef', 'tickets:read');
      expect(res.valid).toBe(true);
    });

    it('should reject when scope is insufficient', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tenant_id: 'tenant-1',
            scopes: ['assets:read'],
            rate_limit: 100,
            expires_at: null,
          },
        ],
      });

      const res = await authenticateApiKey('ak_live_abcdef1234567890abcdef', 'tickets:write');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Insufficient API key scope');
    });
  });

  describe('listApiKeys & revokeApiKey', () => {
    const tenantId = 'tenant-123';

    it('should list tenant API keys', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 'key-1', name: 'Key 1' }],
          }),
        };
        return cb(client);
      });

      const res = await listApiKeys(tenantId);
      expect(res.length).toBe(1);
    });

    it('should revoke API key and return status', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 'key-1' }],
          }),
        };
        return cb(client);
      });

      const res = await revokeApiKey(tenantId, 'key-1');
      expect(res).toBe(true);
    });
  });
});
