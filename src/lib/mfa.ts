import { createHmac, randomBytes, randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';
import { encryptData, decryptData } from './encryption';
import { signJwt } from './auth';

// Base32 Character Set (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleanInput[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 TOTP secret.
 */
export function generateTotpSecret(length: number = 20): string {
  const bytes = randomBytes(length);
  return base32Encode(bytes);
}

/**
 * Computes an RFC 6238 6-digit TOTP code for a secret and time step.
 */
export function generateTotpCode(secretBase32: string, timestampMs: number = Date.now()): string {
  const key = base32Decode(secretBase32);
  const timeStep = 30; // 30 seconds
  const counter = Math.floor(timestampMs / 1000 / timeStep);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation (RFC 4226)
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return String(otp).padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP code with time-step drift tolerance window.
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  window: number = 1,
  timestampMs: number = Date.now()
): boolean {
  if (!/^\d{6}$/.test(code)) return false;

  const timeStepMs = 30 * 1000;
  for (let i = -window; i <= window; i++) {
    const checkTime = timestampMs + i * timeStepMs;
    const generated = generateTotpCode(secretBase32, checkTime);
    if (generated === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generates 10 single-use backup recovery codes.
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(4).toString('hex').toUpperCase()); // 8-char hex
  }
  return codes;
}

// Zod Validation Schemas
export const VerifyMfaSchema = z.object({
  code: z.string().min(6).max(8),
});

export const MfaChallengeSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().min(6).max(8),
});

export type VerifyMfaInput = z.input<typeof VerifyMfaSchema>;
export type MfaChallengeInput = z.input<typeof MfaChallengeSchema>;

/**
 * Initializes MFA setup for a user: generates TOTP secret and backup recovery codes.
 */
export async function setupUserMfa(
  tenantId: string,
  userId: string,
  userEmail: string
): Promise<{
  secret: string;
  qrUri: string;
  backupCodes: string[];
}> {
  const secret = generateTotpSecret(20);
  const backupCodes = generateBackupCodes(10);
  const encryptedSecret = encryptData(secret);
  const qrUri = `otpauth://totp/ITSM:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=ITSM%20Enterprise`;

  await withTenantTransaction(tenantId, async (client) => {
    // Clean up any unverified credentials
    await client.query(
      `DELETE FROM user_mfa_credentials WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    const credentialId = randomUUID();
    await client.query(
      `INSERT INTO user_mfa_credentials (
        id, user_id, tenant_id, mfa_type, secret_encrypted,
        is_verified, backup_codes, created_at, updated_at
      ) VALUES ($1, $2, $3, 'TOTP', $4, false, $5, current_timestamp, current_timestamp)`,
      [
        credentialId,
        userId,
        tenantId,
        encryptedSecret,
        JSON.stringify(backupCodes),
      ]
    );
  });

  return { secret, qrUri, backupCodes };
}

/**
 * Verifies and enables MFA with user's first TOTP code.
 */
export async function verifyAndEnableMfa(
  tenantId: string,
  userId: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM user_mfa_credentials WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (res.rows.length === 0) {
      throw new Error('MFA setup has not been initiated for this user');
    }

    const row = res.rows[0];
    const rawSecret = decryptData(row.secret_encrypted);

    const isValid = verifyTotpCode(rawSecret, code);
    if (!isValid) {
      throw new Error('Invalid TOTP verification code');
    }

    await client.query(
      `UPDATE user_mfa_credentials SET is_verified = true, updated_at = current_timestamp WHERE id = $1`,
      [row.id]
    );

    return { success: true, message: 'MFA successfully enabled and verified' };
  });
}

/**
 * Validates MFA Challenge during login (TOTP code or single-use Backup Code).
 */
export async function validateMfaChallenge(
  tenantId: string,
  userId: string,
  code: string
): Promise<{
  success: boolean;
  methodUsed: 'TOTP' | 'BACKUP_CODE';
  token: string;
}> {
  return withTenantTransaction(tenantId, async (client) => {
    const credRes = await client.query(
      `SELECT * FROM user_mfa_credentials WHERE user_id = $1 AND tenant_id = $2 AND is_verified = true`,
      [userId, tenantId]
    );

    if (credRes.rows.length === 0) {
      throw new Error('No verified MFA credential found for this user');
    }

    const cred = credRes.rows[0];
    const rawSecret = decryptData(cred.secret_encrypted);

    // 1. Try TOTP code
    if (verifyTotpCode(rawSecret, code)) {
      const userRes = await client.query(`SELECT * FROM users WHERE id = $1`, [userId]);
      const token = signJwt({
        userId: userId,
        tenantId: tenantId,
        role: userRes.rows[0].role,
      });

      return { success: true, methodUsed: 'TOTP', token };
    }

    // 2. Try Backup Code
    const backupCodes: string[] = Array.isArray(cred.backup_codes) ? cred.backup_codes : JSON.parse(cred.backup_codes || '[]');
    const upperCode = code.trim().toUpperCase();
    const codeIndex = backupCodes.indexOf(upperCode);

    if (codeIndex !== -1) {
      // Consume the backup code
      backupCodes.splice(codeIndex, 1);
      await client.query(
        `UPDATE user_mfa_credentials SET backup_codes = $1, updated_at = current_timestamp WHERE id = $2`,
        [JSON.stringify(backupCodes), cred.id]
      );

      const userRes = await client.query(`SELECT * FROM users WHERE id = $1`, [userId]);
      const token = signJwt({
        userId: userId,
        tenantId: tenantId,
        role: userRes.rows[0].role,
      });

      return { success: true, methodUsed: 'BACKUP_CODE', token };
    }

    throw new Error('Invalid MFA authentication code or backup recovery code');
  });
}

/**
 * Disables MFA for a user.
 */
export async function disableUserMfa(tenantId: string, userId: string): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM user_mfa_credentials WHERE user_id = $1 AND tenant_id = $2 RETURNING id`,
      [userId, tenantId]
    );
    return res.rows.length > 0;
  });
}
