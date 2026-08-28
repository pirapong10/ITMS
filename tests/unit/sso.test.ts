import {
  SaveSsoConfigSchema,
  SsoCallbackSchema,
  getTenantSsoConfig,
  saveTenantSsoConfig,
  processSsoCallback,
} from '../../src/lib/sso';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Enterprise SSO (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('should validate valid Okta SSO configuration', () => {
      const payload = {
        provider_type: 'Okta' as const,
        is_enabled: true,
        enforce_sso: false,
        issuer_url: 'https://dev-12345.okta.com/oauth2/default',
        sso_url: 'https://dev-12345.okta.com/app/itsm/sso/saml',
        client_id: 'okta_client_123',
        client_secret: 'okta_secret_xyz',
        allow_jit_provisioning: true,
        default_role: 'User' as const,
      };
      const parsed = SaveSsoConfigSchema.parse(payload);
      expect(parsed.provider_type).toBe('Okta');
      expect(parsed.allow_jit_provisioning).toBe(true);
    });

    it('should validate valid SSO callback payload', () => {
      const payload = {
        provider_type: 'Google' as const,
        email: 'employee@company.com',
        name: 'John Doe',
        idp_user_id: 'google-sub-98765',
      };
      const parsed = SsoCallbackSchema.parse(payload);
      expect(parsed.email).toBe('employee@company.com');
      expect(parsed.name).toBe('John Doe');
    });

    it('should reject invalid URLs in SSO configuration', () => {
      expect(() =>
        SaveSsoConfigSchema.parse({
          provider_type: 'OIDC',
          issuer_url: 'not-a-valid-url',
          sso_url: 'also-invalid',
        })
      ).toThrow();
    });
  });

  describe('SSO Configuration CRUD', () => {
    const tenantId = 'tenant-123';

    it('should get tenant SSO config or return null if none', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await getTenantSsoConfig(tenantId);
      expect(res).toBeNull();
    });

    it('should save new SSO configuration with encrypted client secret', async () => {
      const mockRecord = {
        id: 'sso-1',
        tenant_id: tenantId,
        provider_type: 'OIDC',
        is_enabled: true,
        client_secret_encrypted: 'encrypted_val',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // select existing
            .mockResolvedValueOnce({ rows: [mockRecord] }), // insert
        };
        return cb(client);
      });

      const res = await saveTenantSsoConfig(tenantId, {
        provider_type: 'OIDC',
        is_enabled: true,
        issuer_url: 'https://auth.example.com',
        sso_url: 'https://auth.example.com/sso',
        client_secret: 'plain_secret',
      });

      expect(res.has_client_secret).toBe(true);
      expect(res.id).toBe('sso-1');
    });

    it('should update existing SSO configuration', async () => {
      const mockRecord = {
        id: 'sso-1',
        tenant_id: tenantId,
        provider_type: 'Okta',
        is_enabled: true,
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'sso-1', client_secret_encrypted: 'old_secret' }] })
            .mockResolvedValueOnce({ rows: [mockRecord] }),
        };
        return cb(client);
      });

      const res = await saveTenantSsoConfig(tenantId, {
        provider_type: 'Okta',
        is_enabled: true,
        issuer_url: 'https://okta.example.com',
        sso_url: 'https://okta.example.com/sso',
      });

      expect(res.provider_type).toBe('Okta');
    });
  });

  describe('SSO Callback & JIT Provisioning', () => {
    const tenantId = 'tenant-123';

    it('should throw error when SSO is not enabled', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      await expect(
        processSsoCallback(tenantId, {
          provider_type: 'Google',
          email: 'user@example.com',
          name: 'User',
        })
      ).rejects.toThrow('SSO is not enabled');
    });

    it('should authenticate existing user and update name', async () => {
      const ssoConfig = { is_enabled: true };
      const existingUser = { id: 'u-1', email: 'user@example.com', name: 'Old Name', role: 'User' };
      const updatedUser = { ...existingUser, name: 'New Name' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [ssoConfig] })
            .mockResolvedValueOnce({ rows: [existingUser] })
            .mockResolvedValueOnce({ rows: [updatedUser] }),
        };
        return cb(client);
      });

      const res = await processSsoCallback(tenantId, {
        provider_type: 'Google',
        email: 'user@example.com',
        name: 'New Name',
      });

      expect(res.user.name).toBe('New Name');
      expect(res.user.is_new_provisioned).toBe(false);
      expect(res.token).toBeDefined();
    });

    it('should JIT provision new user when user does not exist', async () => {
      const ssoConfig = { is_enabled: true, allow_jit_provisioning: true, default_role: 'User' };
      const newUser = { id: 'u-2', email: 'new@example.com', name: 'New Guy', role: 'User' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [ssoConfig] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [newUser] }),
        };
        return cb(client);
      });

      const res = await processSsoCallback(tenantId, {
        provider_type: 'Google',
        email: 'new@example.com',
        name: 'New Guy',
      });

      expect(res.user.is_new_provisioned).toBe(true);
      expect(res.token).toBeDefined();
    });
  });
});
