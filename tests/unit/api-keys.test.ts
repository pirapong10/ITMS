import {
  CreateApiKeySchema,
  hashApiKey,
  checkRateLimit,
} from '../../src/lib/api-keys';

describe('API Keys & Rate Limiting (Unit Tests)', () => {
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
      const testKeyHash = 'test_hash_' + Date.now();
      const limit = 3;

      // 1st request -> allowed
      const r1 = checkRateLimit(testKeyHash, limit);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      // 2nd request -> allowed
      const r2 = checkRateLimit(testKeyHash, limit);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      // 3rd request -> allowed
      const r3 = checkRateLimit(testKeyHash, limit);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request -> rejected!
      const r4 = checkRateLimit(testKeyHash, limit);
      expect(r4.allowed).toBe(false);
      expect(r4.remaining).toBe(0);
    });
  });
});
