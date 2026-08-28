import { hashPassword, verifyPassword, signJwt, verifyJwt } from '../../src/lib/auth';

describe('Auth Utility (Unit Tests)', () => {
  it('should hash and verify password correctly', async () => {
    const password = 'mySecretPassword123!';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword('wrongpassword', hash);
    expect(isWrong).toBe(false);
  });

  it('should sign and verify JWT tokens correctly', () => {
    const payload = {
      userId: 'user-123',
      tenantId: 'tenant-456',
      role: 'Admin',
    };

    const token = signJwt(payload, '1h');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyJwt(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.tenantId).toBe(payload.tenantId);
    expect(decoded.role).toBe(payload.role);
  });

  it('should throw error when verifying invalid or expired token', () => {
    expect(() => verifyJwt('invalid.token.here')).toThrow();
  });
});
