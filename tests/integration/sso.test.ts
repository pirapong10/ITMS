import { GET as getSsoConfigHandler, POST as saveSsoConfigHandler } from '../../app/api/v1/sso/config/route';
import { POST as ssoCallbackHandler } from '../../app/api/v1/sso/callback/route';
import { POST as setupMfaHandler } from '../../app/api/v1/mfa/setup/route';
import { POST as verifyMfaHandler } from '../../app/api/v1/mfa/verify/route';
import { POST as challengeMfaHandler } from '../../app/api/v1/mfa/challenge/route';
import { POST as disableMfaHandler } from '../../app/api/v1/mfa/disable/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';
import { generateTotpCode } from '../../src/lib/mfa';

describe('Enterprise SSO & MFA API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let userAId: string;

  beforeAll(async () => {
    const subA = 'tenant-sso-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['SSO Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-sso-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['SSO Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    // Create user in Tenant A
    const userRes = await query(
      `INSERT INTO users (tenant_id, name, email, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantAId, 'Alice Admin', 'alice@tenant-a.com', 'IT Admin']
    );
    userAId = userRes.rows[0].id;

    tokenA = signJwt({
      userId: userAId,
      tenantId: tenantAId,
      role: 'IT Admin',
    });
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  let sharedMfaSecret: string;
  let sharedBackupCodes: string[];

  it('should save and retrieve SSO configuration for tenant', async () => {
    const saveReq = new Request('http://localhost/api/v1/sso/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        provider_type: 'Okta',
        is_enabled: true,
        enforce_sso: false,
        issuer_url: 'https://dev-123.okta.com',
        sso_url: 'https://dev-123.okta.com/sso',
        client_id: 'client_okta_001',
        client_secret: 'super_secret_okta_key',
        allow_jit_provisioning: true,
        default_role: 'User',
      }),
    });

    const saveRes = await saveSsoConfigHandler(saveReq);
    expect(saveRes.status).toBe(200);

    const getReq = new Request('http://localhost/api/v1/sso/config', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getRes = await getSsoConfigHandler(getReq);
    expect(getRes.status).toBe(200);
    const getData: any = await getRes.json();
    expect(getData.config.provider_type).toBe('Okta');
    expect(getData.config.is_enabled).toBe(true);
    expect(getData.config.has_client_secret).toBe(true);
  });

  it('should auto-provision new user via JIT upon SSO callback', async () => {
    const callbackReq = new Request(`http://localhost/api/v1/sso/callback?tenantId=${tenantAId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_type: 'Okta',
        email: 'jit.newuser@tenant-a.com',
        name: 'JIT New User',
        idp_user_id: 'okta-user-999',
      }),
    });

    const res = await ssoCallbackHandler(callbackReq);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.user.email).toBe('jit.newuser@tenant-a.com');
    expect(data.user.is_new_provisioned).toBe(true);
    expect(data.user.role).toBe('User');
    expect(data.token).toBeDefined();
  });

  it('should setup TOTP MFA for user and return secret and backup codes', async () => {
    const setupReq = new Request('http://localhost/api/v1/mfa/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await setupMfaHandler(setupReq);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.secret).toBeDefined();
    expect(data.qrUri).toContain('otpauth://totp/');
    expect(data.backupCodes.length).toBe(10);

    sharedMfaSecret = data.secret;
    sharedBackupCodes = data.backupCodes;
  });

  it('should verify and enable MFA using valid TOTP code', async () => {
    const validCode = generateTotpCode(sharedMfaSecret);

    const verifyReq = new Request('http://localhost/api/v1/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ code: validCode }),
    });

    const res = await verifyMfaHandler(verifyReq);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.success).toBe(true);
  });

  it('should validate MFA challenge using TOTP code and issue session token', async () => {
    const validCode = generateTotpCode(sharedMfaSecret);

    const challengeReq = new Request(`http://localhost/api/v1/mfa/challenge?tenantId=${tenantAId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userAId,
        code: validCode,
      }),
    });

    const res = await challengeMfaHandler(challengeReq);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.success).toBe(true);
    expect(data.methodUsed).toBe('TOTP');
    expect(data.token).toBeDefined();
  });

  it('should validate MFA challenge using single-use Backup Code and consume it', async () => {
    const backupCodeToUse = sharedBackupCodes[0];

    // 1. First use should succeed
    const firstReq = new Request(`http://localhost/api/v1/mfa/challenge?tenantId=${tenantAId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userAId,
        code: backupCodeToUse,
      }),
    });

    const firstRes = await challengeMfaHandler(firstReq);
    expect(firstRes.status).toBe(200);
    const firstData: any = await firstRes.json();
    expect(firstData.methodUsed).toBe('BACKUP_CODE');

    // 2. Second use of same backup code should fail (consumed)
    const secondReq = new Request(`http://localhost/api/v1/mfa/challenge?tenantId=${tenantAId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userAId,
        code: backupCodeToUse,
      }),
    });

    const secondRes = await challengeMfaHandler(secondReq);
    expect(secondRes.status).toBe(401);
  });

  it('should disable MFA for user', async () => {
    const disableReq = new Request('http://localhost/api/v1/mfa/disable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await disableMfaHandler(disableReq);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.success).toBe(true);
  });
});
