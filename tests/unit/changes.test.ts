import {
  CreateChangeSchema,
  UpdateChangeSchema,
  SubmitCabSchema,
  CabDecisionSchema,
  ExecuteChangeSchema,
} from '../../src/lib/changes';

describe('Change Enablement & CAB (Unit Tests)', () => {
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
        rollback_plan: 'None', // too short (< 5 chars)
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
});
