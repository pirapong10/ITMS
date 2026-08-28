import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateBackupCodes,
  VerifyMfaSchema,
  MfaChallengeSchema,
  setupUserMfa,
  verifyAndEnableMfa,
  validateMfaChallenge,
  disableUserMfa,
} from '../../src/lib/mfa';
import * as db from '../../src/lib/db';
import { encryptData } from '../../src/lib/encryption';

jest.mock('../../src/lib/db');

describe('Multi-Factor Authentication (MFA) & TOTP (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Base32 Encoding & Decoding', () => {
    it('should encode and decode buffer roundtrip accurately', () => {
      const original = Buffer.from('HelloWorld123');
      const encoded = base32Encode(original);
      const decoded = base32Decode(encoded);
      expect(decoded.toString()).toBe('HelloWorld123');
    });
  });

  describe('RFC 6238 TOTP Engine', () => {
    it('should generate a 32-char Base32 secret', () => {
      const secret = generateTotpSecret(20);
      expect(secret.length).toBe(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('should generate a 6-digit TOTP code', () => {
      const secret = generateTotpSecret(20);
      const code = generateTotpCode(secret);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should verify a valid TOTP code within time-step window', () => {
      const secret = generateTotpSecret(20);
      const now = Date.now();
      const code = generateTotpCode(secret, now);

      const isValid = verifyTotpCode(secret, code, 1, now);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect TOTP code', () => {
      const secret = generateTotpSecret(20);
      const isValid = verifyTotpCode(secret, '000000');
      expect(isValid).toBe(false);
    });
  });

  describe('Backup Recovery Codes', () => {
    it('should generate 10 unique 8-character backup codes', () => {
      const codes = generateBackupCodes(10);
      expect(codes.length).toBe(10);
      const unique = new Set(codes);
      expect(unique.size).toBe(10);
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-F]{8}$/);
      }
    });
  });

  describe('MFA Setup, Verification & Challenge Validation', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-456';

    it('should initiate MFA setup for user', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValue({ rows: [] }),
        };
        return cb(client);
      });

      const res = await setupUserMfa(tenantId, userId, 'user@example.com');
      expect(res.secret).toBeDefined();
      expect(res.qrUri).toContain('user%40example.com');
      expect(res.backupCodes.length).toBe(10);
    });

    it('should verify and enable MFA with valid TOTP code', async () => {
      const secret = generateTotpSecret(20);
      const encryptedSecret = encryptData(secret);
      const validCode = generateTotpCode(secret);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'cred-1', secret_encrypted: encryptedSecret }] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await verifyAndEnableMfa(tenantId, userId, validCode);
      expect(res.success).toBe(true);
    });

    it('should throw error when verifying with invalid code', async () => {
      const secret = generateTotpSecret(20);
      const encryptedSecret = encryptData(secret);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'cred-1', secret_encrypted: encryptedSecret }] }),
        };
        return cb(client);
      });

      await expect(verifyAndEnableMfa(tenantId, userId, '000000')).rejects.toThrow('Invalid TOTP verification code');
    });

    it('should validate MFA challenge via TOTP code during login', async () => {
      const secret = generateTotpSecret(20);
      const encryptedSecret = encryptData(secret);
      const validCode = generateTotpCode(secret);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'cred-1', secret_encrypted: encryptedSecret, backup_codes: '[]' }] })
            .mockResolvedValueOnce({ rows: [{ role: 'Technician' }] }),
        };
        return cb(client);
      });

      const res = await validateMfaChallenge(tenantId, userId, validCode);
      expect(res.success).toBe(true);
      expect(res.methodUsed).toBe('TOTP');
      expect(res.token).toBeDefined();
    });

    it('should validate MFA challenge via single-use Backup Code and consume it', async () => {
      const secret = generateTotpSecret(20);
      const encryptedSecret = encryptData(secret);
      const backupCodes = ['11223344', '55667788'];

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({
              rows: [{ id: 'cred-1', secret_encrypted: encryptedSecret, backup_codes: JSON.stringify(backupCodes) }],
            })
            .mockResolvedValueOnce({ rows: [] }) // update consumed backup codes
            .mockResolvedValueOnce({ rows: [{ role: 'User' }] }), // select user
        };
        return cb(client);
      });

      const res = await validateMfaChallenge(tenantId, userId, '11223344');
      expect(res.success).toBe(true);
      expect(res.methodUsed).toBe('BACKUP_CODE');
    });

    it('should disable MFA for user', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'cred-1' }] }),
        };
        return cb(client);
      });

      const res = await disableUserMfa(tenantId, userId);
      expect(res).toBe(true);
    });
  });

  describe('Validation Schemas', () => {
    it('should validate verify MFA schema', () => {
      const parsed = VerifyMfaSchema.parse({ code: '123456' });
      expect(parsed.code).toBe('123456');
    });

    it('should validate MFA challenge schema', () => {
      const parsed = MfaChallengeSchema.parse({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        code: 'A1B2C3D4',
      });
      expect(parsed.code).toBe('A1B2C3D4');
    });
  });
});
