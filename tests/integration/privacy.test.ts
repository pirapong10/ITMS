import { GET as listAuditLogsHandler } from '../../app/api/v1/audit/logs/route';
import { POST as verifyAuditChainHandler } from '../../app/api/v1/audit/verify/route';
import { GET as listDsarHandler, POST as createDsarHandler } from '../../app/api/v1/privacy/dsar/route';
import { GET as getDsarHandler } from '../../app/api/v1/privacy/dsar/[id]/route';
import { POST as processExportHandler } from '../../app/api/v1/privacy/dsar/[id]/process-export/route';
import { POST as processErasureHandler } from '../../app/api/v1/privacy/dsar/[id]/process-erasure/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';
import { logAuditEvent } from '../../src/lib/audit';
import { createTicket } from '../../src/lib/tickets';

describe('SOC 2 Immutable Audit Logs & GDPR/PDPA Privacy API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;
  const gdprSubjectEmail = `gdpr.subject.${Date.now()}@privacy.test`;
  let sampleTicketId: string;

  beforeAll(async () => {
    const subA = 'tenant-audit-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Audit Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-audit-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Audit Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    tokenA = signJwt({
      userId: 'user-admin-a',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    tokenB = signJwt({
      userId: 'user-admin-b',
      tenantId: tenantBId,
      role: 'IT Admin',
    });

    // Create a user in Tenant A
    await query(
      `INSERT INTO users (tenant_id, name, email, role, is_active) VALUES ($1, $2, $3, 'User', true)`,
      [tenantAId, 'GDPR Target Subject', gdprSubjectEmail]
    );

    // Create a ticket for the user
    const t = await createTicket(tenantAId, {
      title: 'Requesting Laptop Battery Replacement',
      description: 'Battery health degraded to 65%',
      category: 'Hardware',
      priority: 'Low',
      reporter_name: 'GDPR Target Subject',
      reporter_email: gdprSubjectEmail,
    });
    sampleTicketId = t.id;
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  it('should create cryptographic append-only audit trail and verify chain integrity', async () => {
    // 1. Log 3 events
    await logAuditEvent(tenantAId, {
      actor_id: 'user-admin-a',
      actor_name: 'Admin User',
      action: 'TENANT_SETTINGS_UPDATED',
      resource_type: 'tenants',
      resource_id: tenantAId,
      details: { field: 'timezone', value: 'Asia/Bangkok' },
    });

    await logAuditEvent(tenantAId, {
      actor_id: 'user-admin-a',
      actor_name: 'Admin User',
      action: 'SECURITY_MFA_ENFORCED',
      resource_type: 'security_policies',
      details: { enforce_all: true },
    });

    // 2. Query logs via API
    const listReq = new Request('http://localhost/api/v1/audit/logs', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listRes = await listAuditLogsHandler(listReq);
    expect(listRes.status).toBe(200);
    const listData: any = await listRes.json();
    expect(listData.total).toBeGreaterThanOrEqual(2);

    // 3. Verify cryptographic hash-chain
    const verifyReq = new Request('http://localhost/api/v1/audit/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const verifyRes = await verifyAuditChainHandler(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData: any = await verifyRes.json();
    expect(verifyData.verified).toBe(true);
    expect(verifyData.totalRecords).toBeGreaterThanOrEqual(2);
  });

  let exportDsarId: string;
  let erasureDsarId: string;

  it('should register and process GDPR Personal Data Export request (DSAR)', async () => {
    // 1. Create Export DSAR Request
    const createReq = new Request('http://localhost/api/v1/privacy/dsar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        request_type: 'Export',
        subject_email: gdprSubjectEmail,
        requester_notes: 'GDPR Article 15 Data Subject Access Request',
      }),
    });

    const createRes = await createDsarHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData: any = await createRes.json();
    expect(createData.request.id).toBeDefined();
    expect(createData.request.status).toBe('Pending');

    exportDsarId = createData.request.id;

    // 2. Execute Data Export
    const execReq = new Request(`http://localhost/api/v1/privacy/dsar/${exportDsarId}/process-export`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const execRes = await processExportHandler(execReq, { params: Promise.resolve({ id: exportDsarId }) });
    expect(execRes.status).toBe(200);
    const execData: any = await execRes.json();
    expect(execData.request.status).toBe('Completed');
    expect(execData.request.exported_data).toBeDefined();
    expect(execData.request.exported_data.subject_email).toBe(gdprSubjectEmail);
    expect(execData.request.exported_data.personal_data.tickets.length).toBeGreaterThanOrEqual(1);
  });

  it('should register and process GDPR Right to be Forgotten / Erasure request', async () => {
    // 1. Create Erasure DSAR Request
    const createReq = new Request('http://localhost/api/v1/privacy/dsar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        request_type: 'Erasure',
        subject_email: gdprSubjectEmail,
        requester_notes: 'GDPR Article 17 Right to be Forgotten',
      }),
    });

    const createRes = await createDsarHandler(createReq);
    expect(createRes.status).toBe(201);
    const createData: any = await createRes.json();
    erasureDsarId = createData.request.id;

    // 2. Execute Erasure & Anonymization
    const execReq = new Request(`http://localhost/api/v1/privacy/dsar/${erasureDsarId}/process-erasure`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const execRes = await processErasureHandler(execReq, { params: Promise.resolve({ id: erasureDsarId }) });
    expect(execRes.status).toBe(200);
    const execData: any = await execRes.json();
    expect(execData.request.status).toBe('Completed');

    // 3. Verify user record is anonymized
    const userRes = await query(`SELECT name, email, is_active FROM users WHERE tenant_id = $1 AND LOWER(email) = $2`, [
      tenantAId,
      gdprSubjectEmail,
    ]);
    expect(userRes.rows.length).toBe(0); // Original email is gone!

    // Verify ticket reporter is anonymized
    const tixRes = await query(`SELECT reporter_name, reporter_email FROM tickets WHERE id = $1 AND tenant_id = $2`, [
      sampleTicketId,
      tenantAId,
    ]);
    expect(tixRes.rows[0].reporter_email).toContain('@deleted.local');
    expect(tixRes.rows[0].reporter_name).toContain('Anonymized User');
  });

  it('should enforce Tenant Isolation: Tenant B cannot access Tenant A audit logs or DSAR', async () => {
    const req = new Request(`http://localhost/api/v1/privacy/dsar/${exportDsarId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const res = await getDsarHandler(req, { params: Promise.resolve({ id: exportDsarId }) });
    expect(res.status).toBe(404);
  });
});
