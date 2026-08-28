import {
  CreateDsarSchema,
  createDsarRequest,
  listDsarRequests,
  getDsarRequestById,
  processDsarExport,
  processDsarErasure,
} from '../../src/lib/privacy';
import * as db from '../../src/lib/db';
import * as audit from '../../src/lib/audit';

jest.mock('../../src/lib/db');
jest.mock('../../src/lib/audit');

describe('Data Privacy & DSAR (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;
  const mockLogAuditEvent = audit.logAuditEvent as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('should validate DSAR export request payload', () => {
      const payload = {
        request_type: 'Export' as const,
        subject_email: 'user.gdpr@company.com',
        requester_notes: 'Employee requesting personal data under GDPR Article 15',
      };
      const parsed = CreateDsarSchema.parse(payload);
      expect(parsed.request_type).toBe('Export');
      expect(parsed.subject_email).toBe('user.gdpr@company.com');
    });

    it('should validate DSAR erasure request payload', () => {
      const payload = {
        request_type: 'Erasure' as const,
        subject_email: 'former.employee@company.com',
      };
      const parsed = CreateDsarSchema.parse(payload);
      expect(parsed.request_type).toBe('Erasure');
    });

    it('should reject invalid email format', () => {
      expect(() =>
        CreateDsarSchema.parse({
          subject_email: 'not-an-email',
        })
      ).toThrow();
    });
  });

  describe('createDsarRequest', () => {
    const tenantId = 'tenant-123';

    it('should create DSAR request and trigger audit log', async () => {
      const mockRecord = {
        id: 'dsar-1',
        tenant_id: tenantId,
        request_type: 'Export',
        subject_email: 'user@example.com',
        status: 'Pending',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [mockRecord] }),
        };
        return cb(client);
      });

      const res = await createDsarRequest(tenantId, {
        request_type: 'Export',
        subject_email: 'USER@EXAMPLE.COM',
      });

      expect(res.id).toBe('dsar-1');
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ action: 'DSAR_REQUEST_CREATED' })
      );
    });
  });

  describe('listDsarRequests & getDsarRequestById', () => {
    const tenantId = 'tenant-123';

    it('should list DSAR requests with optional status and type filter', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'dsar-1' }] }),
        };
        return cb(client);
      });

      const res = await listDsarRequests(tenantId, {
        status: 'Pending',
        request_type: 'Export',
      });
      expect(res.length).toBe(1);
    });

    it('should get DSAR request by ID or return null if not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await getDsarRequestById(tenantId, 'nonexistent');
      expect(res).toBeNull();
    });
  });

  describe('processDsarExport', () => {
    const tenantId = 'tenant-123';

    it('should throw error if request not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      await expect(processDsarExport(tenantId, 'dsar-404')).rejects.toThrow('DSAR request not found');
    });

    it('should process export and aggregate user, ticket, borrow and feedback data', async () => {
      const dsarRecord = {
        id: 'dsar-1',
        subject_email: 'test@example.com',
      };
      const userRecord = { id: 'u1', name: 'John Doe', email: 'test@example.com' };
      const updatedRecord = { id: 'dsar-1', status: 'Completed' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [dsarRecord] }) // select dsar
            .mockResolvedValueOnce({ rows: [userRecord] }) // select user
            .mockResolvedValueOnce({ rows: [{ id: 'tk1', title: 'Ticket 1' }] }) // tickets
            .mockResolvedValueOnce({ rows: [{ id: 'br1', borrow_code: 'BR01' }] }) // borrow_records
            .mockResolvedValueOnce({ rows: [{ id: 'fb1', is_helpful: true }] }) // knowledge_feedback
            .mockResolvedValueOnce({ rows: [updatedRecord] }), // update dsar
        };
        return cb(client);
      });

      const res = await processDsarExport(tenantId, 'dsar-1');
      expect(res.status).toBe('Completed');
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ action: 'GDPR_DATA_EXPORT_COMPLETED' })
      );
    });
  });

  describe('processDsarErasure', () => {
    const tenantId = 'tenant-123';

    it('should throw error if request not found', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      await expect(processDsarErasure(tenantId, 'dsar-404')).rejects.toThrow('DSAR request not found');
    });

    it('should anonymize user, tickets and mark request completed', async () => {
      const dsarRecord = {
        id: 'dsar-2',
        subject_email: 'erase.me@example.com',
      };
      const updatedRecord = { id: 'dsar-2', status: 'Completed' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [dsarRecord] }) // select dsar
            .mockResolvedValueOnce({ rows: [] }) // update users
            .mockResolvedValueOnce({ rows: [] }) // update tickets
            .mockResolvedValueOnce({ rows: [updatedRecord] }), // update dsar
        };
        return cb(client);
      });

      const res = await processDsarErasure(tenantId, 'dsar-2');
      expect(res.status).toBe('Completed');
      expect(mockLogAuditEvent).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ action: 'GDPR_RIGHT_TO_BE_FORGOTTEN_EXECUTED' })
      );
    });
  });
});
