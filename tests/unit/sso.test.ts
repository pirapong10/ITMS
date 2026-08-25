import {
  SaveSsoConfigSchema,
  SsoCallbackSchema,
} from '../../src/lib/sso';

describe('Enterprise SSO (Unit Tests)', () => {
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
});
