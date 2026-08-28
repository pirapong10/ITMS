import {
  formatScimUser,
  formatScimGroup,
  hashToken,
  ScimUserCreateSchema,
  ScimPatchSchema,
  ScimGroupCreateSchema,
  SCIM_USER_SCHEMA,
  SCIM_GROUP_SCHEMA,
  createTenantScimToken,
  authenticateScimRequest,
  scimListUsers,
  scimGetUser,
  scimCreateUser,
  scimUpdateUser,
  scimPatchUser,
  scimDeleteUser,
  scimListGroups,
  scimCreateGroup,
} from '../../src/lib/scim';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('SCIM 2.0 Engine (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;
  const mockQuery = db.query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('Authentication & Token Generation', () => {
    it('should generate scim token and store hash', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await createTenantScimToken('tenant-123', 'Okta');
      expect(res.rawToken).toMatch(/^scim_/);
    });

    it('should authenticate SCIM request with valid bearer token', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ tenant_id: 'tenant-123' }] });

      const req = new Request('http://localhost/api/scim/v2/Users', {
        headers: { Authorization: 'Bearer scim_valid_token_here' },
      });

      const tenantId = await authenticateScimRequest(req);
      expect(tenantId).toBe('tenant-123');
    });

    it('should reject request without bearer authorization header', async () => {
      const req = new Request('http://localhost/api/scim/v2/Users');
      const tenantId = await authenticateScimRequest(req);
      expect(tenantId).toBeNull();
    });
  });

  describe('SCIM User Operations', () => {
    const tenantId = 'tenant-123';

    it('should list SCIM users with filter and pagination', async () => {
      const mockUser = {
        id: 'u1',
        name: 'Bob',
        email: 'bob@example.com',
        role: 'User',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '1' }] })
            .mockResolvedValueOnce({ rows: [mockUser] }),
        };
        return cb(client);
      });

      const res = await scimListUsers(tenantId, { filter: 'userName eq "bob@example.com"' });
      expect(res.totalResults).toBe(1);
      expect(res.Resources.length).toBe(1);
    });

    it('should get SCIM user by ID or return null if not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const user = await scimGetUser(tenantId, 'u-404');
      expect(user).toBeNull();
    });

    it('should create SCIM user', async () => {
      const mockUser = {
        id: 'u1',
        name: 'Alice Cooper',
        email: 'alice@example.com',
        role: 'Technician',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [] }) // check uniqueness -> no duplicate
            .mockResolvedValueOnce({ rows: [mockUser] }), // insert user
        };
        return cb(client);
      });

      const res = await scimCreateUser(tenantId, {
        schemas: [SCIM_USER_SCHEMA],
        userName: 'alice@example.com',
        name: { givenName: 'Alice', familyName: 'Cooper' },
        active: true,
        roles: [{ value: 'Technician', primary: true }],
      });

      expect(res.userName).toBe('alice@example.com');
    });

    it('should update and patch SCIM user', async () => {
      const mockUser = {
        id: 'u1',
        name: 'Alice Cooper',
        email: 'alice@example.com',
        role: 'Admin',
        is_active: true,
        created_at: new Date().toISOString(),
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [mockUser] }),
        };
        return cb(client);
      });

      const updated = await scimUpdateUser(tenantId, 'u1', {
        schemas: [SCIM_USER_SCHEMA],
        userName: 'alice@example.com',
        name: { formatted: 'Alice Cooper' },
        roles: [{ value: 'Admin' }],
      });
      expect(updated.roles[0].value).toBe('Admin');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [mockUser] }) // select existing
            .mockResolvedValueOnce({ rows: [{ ...mockUser, is_active: false }] }), // update
        };
        return cb(client);
      });

      const patched = await scimPatchUser(tenantId, 'u1', {
        Operations: [{ op: 'replace', path: 'active', value: false }],
      });
      expect(patched.active).toBe(false);
    });

    it('should delete SCIM user', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'u1' }] }),
        };
        return cb(client);
      });

      const res = await scimDeleteUser(tenantId, 'u1');
      expect(res).toBe(true);
    });
  });

  describe('SCIM Group Operations', () => {
    const tenantId = 'tenant-123';

    it('should list SCIM groups and create SCIM group', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'grp-1', display_name: 'Engineers' }] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const groups = await scimListGroups(tenantId);
      expect(groups.totalResults).toBe(1);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'grp-2', display_name: 'DevOps' }] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const newGrp = await scimCreateGroup(tenantId, {
        displayName: 'DevOps',
        members: [{ value: 'usr-1' }],
      });
      expect(newGrp.displayName).toBe('DevOps');
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
