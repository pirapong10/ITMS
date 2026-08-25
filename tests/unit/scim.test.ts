import {
  formatScimUser,
  formatScimGroup,
  hashToken,
  ScimUserCreateSchema,
  ScimPatchSchema,
  ScimGroupCreateSchema,
  SCIM_USER_SCHEMA,
  SCIM_GROUP_SCHEMA,
} from '../../src/lib/scim';

describe('SCIM 2.0 Engine (Unit Tests)', () => {
  describe('Resource Formatting', () => {
    it('should format database user record into RFC 7643 SCIM User', () => {
      const mockUser = {
        id: 'usr-12345',
        external_id: 'okta-001',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Technician',
        is_active: true,
        created_at: '2026-08-25T08:00:00.000Z',
      };

      const scimUser = formatScimUser(mockUser);
      expect(scimUser.schemas).toContain(SCIM_USER_SCHEMA);
      expect(scimUser.id).toBe('usr-12345');
      expect(scimUser.externalId).toBe('okta-001');
      expect(scimUser.userName).toBe('jane.smith@example.com');
      expect(scimUser.name.givenName).toBe('Jane');
      expect(scimUser.name.familyName).toBe('Smith');
      expect(scimUser.active).toBe(true);
      expect(scimUser.emails[0].value).toBe('jane.smith@example.com');
    });

    it('should format group record into RFC 7643 SCIM Group', () => {
      const mockGroup = {
        id: 'grp-123',
        display_name: 'IT Support Tier 1',
        created_at: '2026-08-25T08:00:00.000Z',
        updated_at: '2026-08-25T08:00:00.000Z',
      };
      const mockMembers = [{ user_id: 'usr-1', name: 'Bob' }];

      const scimGroup = formatScimGroup(mockGroup, mockMembers);
      expect(scimGroup.schemas).toContain(SCIM_GROUP_SCHEMA);
      expect(scimGroup.displayName).toBe('IT Support Tier 1');
      expect(scimGroup.members.length).toBe(1);
      expect(scimGroup.members[0].value).toBe('usr-1');
    });
  });

  describe('Validation Schemas', () => {
    it('should validate valid SCIM user creation payload', () => {
      const payload = {
        schemas: [SCIM_USER_SCHEMA],
        userName: 'newuser@tenant.com',
        name: { givenName: 'John', familyName: 'Doe' },
        active: true,
        roles: [{ value: 'IT Admin', primary: true }],
      };
      const parsed = ScimUserCreateSchema.parse(payload);
      expect(parsed.userName).toBe('newuser@tenant.com');
      expect(parsed.active).toBe(true);
    });

    it('should validate valid SCIM patch operations payload', () => {
      const payload = {
        Operations: [
          {
            op: 'replace' as const,
            path: 'active',
            value: false,
          },
        ],
      };
      const parsed = ScimPatchSchema.parse(payload);
      expect(parsed.Operations[0].op).toBe('replace');
      expect(parsed.Operations[0].value).toBe(false);
    });

    it('should validate valid SCIM group creation payload', () => {
      const payload = {
        displayName: 'Network Operations',
        members: [{ value: 'usr-99', display: 'Admin User' }],
      };
      const parsed = ScimGroupCreateSchema.parse(payload);
      expect(parsed.displayName).toBe('Network Operations');
      expect(parsed.members?.length).toBe(1);
    });
  });

  describe('Token Security Hashing', () => {
    it('should compute consistent SHA-256 hash', () => {
      const hash1 = hashToken('scim_token_abc');
      const hash2 = hashToken('scim_token_abc');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });
});
