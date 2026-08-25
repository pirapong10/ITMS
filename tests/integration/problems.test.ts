import { GET as listProblemsHandler, POST as createProblemHandler } from '../../app/api/v1/problems/route';
import { GET as getProblemHandler, PATCH as updateProblemHandler } from '../../app/api/v1/problems/[id]/route';
import { POST as linkTicketsHandler } from '../../app/api/v1/problems/[id]/link-tickets/route';
import { DELETE as unlinkTicketHandler } from '../../app/api/v1/problems/[id]/link-tickets/[ticketId]/route';
import { GET as getTicketsHandler } from '../../app/api/v1/problems/[id]/tickets/route';
import { POST as resolveProblemHandler } from '../../app/api/v1/problems/[id]/resolve/route';
import { GET as searchKedbHandler } from '../../app/api/v1/kedb/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';
import { createTicket } from '../../src/lib/tickets';

describe('ITIL Problem Management & KEDB API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;
  let ticket1Id: string;
  let ticket2Id: string;

  beforeAll(async () => {
    const subA = 'tenant-prb-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Problem Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-prb-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Problem Tenant B', subB]
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

    // Create 2 Helpdesk tickets in Tenant A
    const t1 = await createTicket(tenantAId, {
      title: 'Database connection timeouts in ERP',
      description: 'Users experiencing SQL connection dropouts',
      category: 'Database',
      priority: 'High',
      reporter_name: 'John Finance',
    });
    ticket1Id = t1.id;

    const t2 = await createTicket(tenantAId, {
      title: 'Slow queries during month-end reports',
      description: 'Reporting service hanging on query lock',
      category: 'Database',
      priority: 'High',
      reporter_name: 'Mary Accounting',
    });
    ticket2Id = t2.id;
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  let createdProblemId: string;

  it('should create an ITIL problem with running ID PRB-YYYY-XXXX and link tickets', async () => {
    const req = new Request('http://localhost/api/v1/problems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'PostgreSQL Connection Pool Exhaustion on Month-End',
        description: 'Connection pooler reaches max 500 connections causing drops',
        category: 'Database',
        priority: 'High',
        impact: 'High',
        is_known_error: true,
        workaround: 'Restart connection pooler daemon to flush idle sockets',
        ticket_ids: [ticket1Id],
      }),
    });

    const res = await createProblemHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.problem).toBeDefined();
    expect(data.problem.id).toMatch(/^PRB-\d{4}-\d{4}$/);
    expect(data.problem.status).toBe('Known Error');
    expect(data.problem.is_known_error).toBe(true);

    createdProblemId = data.problem.id;
  });

  it('should link additional incident ticket to problem', async () => {
    const req = new Request(`http://localhost/api/v1/problems/${createdProblemId}/link-tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        ticket_ids: [ticket2Id],
      }),
    });

    const res = await linkTicketsHandler(req, { params: Promise.resolve({ id: createdProblemId }) });
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.linkedCount).toBe(1);
  });

  it('should get problem details and list all linked incident tickets', async () => {
    // 1. Get Problem
    const getReq = new Request(`http://localhost/api/v1/problems/${createdProblemId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const getRes = await getProblemHandler(getReq, { params: Promise.resolve({ id: createdProblemId }) });
    expect(getRes.status).toBe(200);
    const getData: any = await getRes.json();
    expect(getData.problem.linked_tickets_count).toBe(2);

    // 2. Get Linked Tickets
    const listTixReq = new Request(`http://localhost/api/v1/problems/${createdProblemId}/tickets`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listTixRes = await getTicketsHandler(listTixReq, { params: Promise.resolve({ id: createdProblemId }) });
    expect(listTixRes.status).toBe(200);
    const listTixData: any = await listTixRes.json();
    expect(listTixData.tickets.length).toBe(2);
    expect(listTixData.tickets.some((t: any) => t.id === ticket1Id)).toBe(true);
    expect(listTixData.tickets.some((t: any) => t.id === ticket2Id)).toBe(true);
  });

  it('should search Known Error Database (KEDB)', async () => {
    const req = new Request('http://localhost/api/v1/kedb?q=Connection+Pool', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await searchKedbHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.knownErrors.length).toBeGreaterThanOrEqual(1);
    const match = data.knownErrors.find((k: any) => k.id === createdProblemId);
    expect(match).toBeDefined();
    expect(match.workaround).toContain('Restart connection pooler');
  });

  it('should resolve problem and cascade resolution to all linked incident tickets', async () => {
    const resolveReq = new Request(`http://localhost/api/v1/problems/${createdProblemId}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        root_cause: 'Unindexed reporting query causing long-running transactions and holding connection locks',
        solution: 'Added composite index on report_items (tenant_id, created_at) and optimized pooling max_connections to 1500',
        cascade_to_tickets: true,
      }),
    });

    const resolveRes = await resolveProblemHandler(resolveReq, { params: Promise.resolve({ id: createdProblemId }) });
    expect(resolveRes.status).toBe(200);

    const resolveData: any = await resolveRes.json();
    expect(resolveData.problem.status).toBe('Resolved');
    expect(resolveData.cascadedTicketsCount).toBe(2);

    // Verify linked tickets are now Resolved
    const tixRes = await query(`SELECT id, status, resolution_notes FROM tickets WHERE id IN ($1, $2)`, [
      ticket1Id,
      ticket2Id,
    ]);
    for (const row of tixRes.rows) {
      expect(row.status).toBe('Resolved');
      expect(row.resolution_notes).toContain(`Resolved via Problem Investigation [${createdProblemId}]`);
    }
  });

  it('should enforce Tenant Isolation: Tenant B cannot access Tenant A problems', async () => {
    const req = new Request(`http://localhost/api/v1/problems/${createdProblemId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const res = await getProblemHandler(req, { params: Promise.resolve({ id: createdProblemId }) });
    expect(res.status).toBe(404);
  });
});
