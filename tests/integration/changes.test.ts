import { GET as listChangesHandler, POST as createChangeHandler } from '../../app/api/v1/changes/route';
import { GET as getChangeHandler, PATCH as updateChangeHandler } from '../../app/api/v1/changes/[id]/route';
import { POST as submitCabHandler } from '../../app/api/v1/changes/[id]/submit-cab/route';
import { POST as approveChangeHandler } from '../../app/api/v1/changes/[id]/approve/route';
import { POST as executeChangeHandler } from '../../app/api/v1/changes/[id]/execute/route';
import { GET as getApprovalsHandler } from '../../app/api/v1/changes/[id]/approvals/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('ITIL Change Enablement & CAB API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenRequesterA: string;
  let tokenCab1: string;
  let tokenCab2: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-change-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Change Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-change-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Change Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    tokenRequesterA = signJwt({
      userId: 'user-requester-a',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    tokenCab1 = signJwt({
      userId: 'cab-member-1',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    tokenCab2 = signJwt({
      userId: 'cab-member-2',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    tokenB = signJwt({
      userId: 'user-admin-b',
      tenantId: tenantBId,
      role: 'IT Admin',
    });
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  it('should create Standard Change as pre-approved', async () => {
    const req = new Request('http://localhost/api/v1/changes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRequesterA}`,
      },
      body: JSON.stringify({
        title: 'Weekly Routine Security Patching',
        description: 'Apply routine security patches to staging environment',
        change_type: 'Standard',
        risk_level: 'Low',
        impact_level: 'Low',
        implementation_plan: 'Execute standard ansible playbook: patch_staging.yml',
        rollback_plan: 'Restore VM snapshot created prior to ansible execution',
      }),
    });

    const res = await createChangeHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.change.id).toMatch(/^CR-\d{4}-\d{4}$/);
    expect(data.change.status).toBe('Approved');
    expect(data.change.change_type).toBe('Standard');
  });

  let normalChangeId: string;

  it('should create Normal Change in Draft state', async () => {
    const req = new Request('http://localhost/api/v1/changes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRequesterA}`,
      },
      body: JSON.stringify({
        title: 'Core Firewall Firmware Major Upgrade',
        description: 'Upgrade HA FortiGate cluster to FortiOS v7.4',
        change_type: 'Normal',
        risk_level: 'High',
        impact_level: 'Critical',
        implementation_plan: '1. Backup config. 2. Upgrade standby node. 3. Failover. 4. Upgrade primary.',
        rollback_plan: 'Rollback firmware via TFTP and restore backup config.',
        test_plan: 'Verify IPsec VPN tunnels, BGP peering, and VIP inspection.',
      }),
    });

    const res = await createChangeHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.change.id).toMatch(/^CR-\d{4}-\d{4}$/);
    expect(data.change.status).toBe('Draft');

    normalChangeId = data.change.id;
  });

  it('should submit Normal Change to CAB and distribute to approvers', async () => {
    const req = new Request(`http://localhost/api/v1/changes/${normalChangeId}/submit-cab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRequesterA}`,
      },
      body: JSON.stringify({
        approvers: [
          { approver_id: 'cab-member-1', approver_name: 'Chief Security Officer' },
          { approver_id: 'cab-member-2', approver_name: 'VP of Infrastructure' },
        ],
      }),
    });

    const res = await submitCabHandler(req, { params: Promise.resolve({ id: normalChangeId }) });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.change.status).toBe('Pending CAB');
    expect(data.change.approvals.length).toBe(2);
  });

  it('should require all CAB approvers to vote before status becomes Approved', async () => {
    // 1. Approver 1 votes Approved
    const req1 = new Request(`http://localhost/api/v1/changes/${normalChangeId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCab1}`,
      },
      body: JSON.stringify({
        decision: 'Approved',
        comments: 'Security review passed. Rollback plan is adequate.',
      }),
    });

    const res1 = await approveChangeHandler(req1, { params: Promise.resolve({ id: normalChangeId }) });
    expect(res1.status).toBe(200);
    const data1: any = await res1.json();
    expect(data1.change.status).toBe('Pending CAB'); // Still pending member 2

    // 2. Approver 2 votes Approved
    const req2 = new Request(`http://localhost/api/v1/changes/${normalChangeId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCab2}`,
      },
      body: JSON.stringify({
        decision: 'Approved',
        comments: 'Approved for Saturday 02:00 AM window.',
      }),
    });

    const res2 = await approveChangeHandler(req2, { params: Promise.resolve({ id: normalChangeId }) });
    expect(res2.status).toBe(200);
    const data2: any = await res2.json();
    expect(data2.change.status).toBe('Approved'); // All approved!
  });

  it('should execute change through Implementing and Completed with PIR review notes', async () => {
    // 1. Transition to Implementing
    const impReq = new Request(`http://localhost/api/v1/changes/${normalChangeId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRequesterA}`,
      },
      body: JSON.stringify({
        status: 'Implementing',
      }),
    });
    const impRes = await executeChangeHandler(impReq, { params: Promise.resolve({ id: normalChangeId }) });
    expect(impRes.status).toBe(200);
    const impData: any = await impRes.json();
    expect(impData.change.status).toBe('Implementing');
    expect(impData.change.actual_start).toBeDefined();

    // 2. Transition to Completed with Post-Implementation Review (PIR)
    const compReq = new Request(`http://localhost/api/v1/changes/${normalChangeId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRequesterA}`,
      },
      body: JSON.stringify({
        status: 'Completed',
        review_notes: 'PIR Review: Upgrade completed in 45 mins. Failover was seamless with 0 dropped sessions.',
      }),
    });
    const compRes = await executeChangeHandler(compReq, { params: Promise.resolve({ id: normalChangeId }) });
    expect(compRes.status).toBe(200);
    const compData: any = await compRes.json();
    expect(compData.change.status).toBe('Completed');
    expect(compData.change.actual_end).toBeDefined();
    expect(compData.change.review_notes).toContain('PIR Review:');
  });

  it('should transition change to Rejected if any CAB member rejects', async () => {
    // 1. Create another change
    const createReq = new Request('http://localhost/api/v1/changes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRequesterA}`,
      },
      body: JSON.stringify({
        title: 'Direct Production Schema Migration without Backup',
        description: 'Drop unused tables directly in production',
        change_type: 'Normal',
        risk_level: 'Critical',
        impact_level: 'Critical',
        implementation_plan: 'Run DROP TABLE statements on master',
        rollback_plan: 'No rollback possible once tables dropped',
      }),
    });
    const createRes = await createChangeHandler(createReq);
    const change2Id = (await createRes.json() as any).change.id;

    // 2. Submit to CAB
    const subReq = new Request(`http://localhost/api/v1/changes/${change2Id}/submit-cab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRequesterA}`,
      },
      body: JSON.stringify({
        approvers: [{ approver_id: 'cab-member-1', approver_name: 'Chief Security Officer' }],
      }),
    });
    await submitCabHandler(subReq, { params: Promise.resolve({ id: change2Id }) });

    // 3. CAB Member Rejects
    const rejReq = new Request(`http://localhost/api/v1/changes/${change2Id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenCab1}`,
      },
      body: JSON.stringify({
        decision: 'Rejected',
        comments: 'Rejected: No rollback plan provided. High risk of permanent data loss.',
      }),
    });
    const rejRes = await approveChangeHandler(rejReq, { params: Promise.resolve({ id: change2Id }) });
    expect(rejRes.status).toBe(200);
    const rejData: any = await rejRes.json();
    expect(rejData.change.status).toBe('Rejected');
  });

  it('should enforce Tenant Isolation: Tenant B cannot view Tenant A change requests', async () => {
    const req = new Request(`http://localhost/api/v1/changes/${normalChangeId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const res = await getChangeHandler(req, { params: Promise.resolve({ id: normalChangeId }) });
    expect(res.status).toBe(404);
  });
});
