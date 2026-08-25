import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateBackupCodes,
  VerifyMfaSchema,
  MfaChallengeSchema,
} from '../../src/lib/mfa';

describe('Multi-Factor Authentication (MFA) & TOTP (Unit Tests)', () => {
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
