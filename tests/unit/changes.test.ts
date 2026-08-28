import {
  CreateChangeSchema,
  UpdateChangeSchema,
  SubmitCabSchema,
  CabDecisionSchema,
  ExecuteChangeSchema,
  createChangeRequest,
  getChangeRequestById,
  listChangeRequests,
  updateChangeRequest,
  submitChangeForCabApproval,
  recordCabDecision,
  executeChange,
  getCabApprovals,
} from '../../src/lib/changes';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Change Enablement & CAB (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    it('should validate valid Change Request payload', () => {
      const payload = {
        title: 'Kubernetes Cluster Upgrade to v1.30',
        description: 'Upgrade control plane and worker nodes with zero downtime',
        change_type: 'Normal' as const,
        risk_level: 'High' as const,
        impact_level: 'Critical' as const,
        implementation_plan: '1. Cordon and drain node. 2. Upgrade kubelet. 3. Uncordon.',
        rollback_plan: 'Restore cluster etcd snapshot from S3 backup.',
        test_plan: 'Run synthetic traffic check and verify health endpoints.',
      };
      const parsed = CreateChangeSchema.parse(payload);
      expect(parsed.title).toBe('Kubernetes Cluster Upgrade to v1.30');
      expect(parsed.change_type).toBe('Normal');
      expect(parsed.risk_level).toBe('High');
    });

    it('should reject Change Request with missing or short rollback plan', () => {
      const payload = {
        title: 'Upgrade DB',
        description: 'Upgrade database server',
        implementation_plan: 'Step 1: apt upgrade',
        rollback_plan: 'None',
      };
      expect(() => CreateChangeSchema.parse(payload)).toThrow();
    });

    it('should validate CAB submission schema', () => {
      const payload = {
        approvers: [
          { approver_id: 'usr-cab-1', approver_name: 'Security Officer' },
          { approver_id: 'usr-cab-2', approver_name: 'Infrastructure Lead' },
        ],
      };
      const parsed = SubmitCabSchema.parse(payload);
      expect(parsed.approvers.length).toBe(2);
    });

    it('should validate CAB decision payload', () => {
      const payload = {
        decision: 'Approved' as const,
        comments: 'Risk mitigation verified. Change approved for Sunday maintenance window.',
      };
      const parsed = CabDecisionSchema.parse(payload);
      expect(parsed.decision).toBe('Approved');
    });

    it('should validate Execution state transition', () => {
      const payload = {
        status: 'Completed' as const,
        review_notes: 'PIR: All nodes upgraded successfully without dropped requests.',
      };
      const parsed = ExecuteChangeSchema.parse(payload);
      expect(parsed.status).toBe('Completed');
      expect(parsed.review_notes).toContain('PIR:');
    });
  });

  describe('Change Request Operations', () => {
    const tenantId = 'tenant-123';

    it('should create Standard change as Auto-Approved', async () => {
      const mockChange = {
        id: 'chg-1',
        change_type: 'Standard',
        status: 'Approved',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [mockChange] }),
        };
        return cb(client);
      });

      const res = await createChangeRequest(tenantId, {
        title: 'Standard Patch',
        description: 'Routine patch',
        change_type: 'Standard',
        implementation_plan: 'apply patch',
        rollback_plan: 'revert patch',
      });

      expect(res.status).toBe('Approved');
    });

    it('should list and get change request with approvals', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'chg-1' }] }),
        };
        return cb(client);
      });

      const list = await listChangeRequests(tenantId, { status: 'Draft', search: 'Patch' });
      expect(list.length).toBe(1);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'chg-1', title: 'Patch' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'app-1', decision: 'Pending' }] }),
        };
        return cb(client);
      });

      const change = await getChangeRequestById(tenantId, 'chg-1');
      expect(change?.approvals.length).toBe(1);
    });

    it('should update change request', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'chg-1', title: 'Updated Title' }] }),
        };
        return cb(client);
      });

      const updated = await updateChangeRequest(tenantId, 'chg-1', { title: 'Updated Title' });
      expect(updated.title).toBe('Updated Title');
    });
  });

  describe('CAB Workflow & Decisions', () => {
    const tenantId = 'tenant-123';

    it('should submit Draft change for CAB approval', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ status: 'Draft' }] }) // select status
            .mockResolvedValueOnce({ rows: [] }) // delete old
            .mockResolvedValueOnce({ rows: [] }) // insert approver
            .mockResolvedValueOnce({ rows: [{ id: 'chg-1', status: 'Pending CAB' }] }) // update change
            .mockResolvedValueOnce({ rows: [{ id: 'app-1', decision: 'Pending' }] }), // select approvals
        };
        return cb(client);
      });

      const res = await submitChangeForCabApproval(tenantId, 'chg-1', {
        approvers: [{ approver_id: 'cab-1' }],
      });

      expect(res.status).toBe('Pending CAB');
      expect(res.approvals.length).toBe(1);
    });

    it('should record CAB approval decision and transition to Approved when all agree', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'app-1', decision: 'Approved' }] }) // update approval
            .mockResolvedValueOnce({ rows: [{ decision: 'Approved' }] }) // select decisions
            .mockResolvedValueOnce({ rows: [{ id: 'chg-1', status: 'Approved' }] }) // update change
            .mockResolvedValueOnce({ rows: [{ id: 'app-1', decision: 'Approved' }] }), // select approvals
        };
        return cb(client);
      });

      const res = await recordCabDecision(tenantId, 'chg-1', 'cab-1', { decision: 'Approved' });
      expect(res.status).toBe('Approved');
    });

    it('should record CAB rejection and transition change to Rejected', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'app-1', decision: 'Rejected' }] })
            .mockResolvedValueOnce({ rows: [{ decision: 'Rejected' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'chg-1', status: 'Rejected' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'app-1', decision: 'Rejected' }] }),
        };
        return cb(client);
      });

      const res = await recordCabDecision(tenantId, 'chg-1', 'cab-1', { decision: 'Rejected' });
      expect(res.status).toBe('Rejected');
    });

    it('should execute change and record PIR notes', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ status: 'Approved' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'chg-1', status: 'Completed', review_notes: 'PIR done' }] })
            .mockResolvedValueOnce({ rows: [] }),
        };
        return cb(client);
      });

      const res = await executeChange(tenantId, 'chg-1', {
        status: 'Completed',
        review_notes: 'PIR done',
      });

      expect(res.status).toBe('Completed');
    });

    it('should get CAB approvals list', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'app-1', decision: 'Pending' }] }),
        };
        return cb(client);
      });

      const list = await getCabApprovals(tenantId, 'chg-1');
      expect(list.length).toBe(1);
    });
  });
});
