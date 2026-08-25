import { GET as listKbHandler, POST as createKbHandler } from '../../app/api/v1/kb/route';
import {
  GET as getKbHandler,
  PATCH as updateKbHandler,
  DELETE as deleteKbHandler,
} from '../../app/api/v1/kb/[id]/route';
import { POST as feedbackHandler } from '../../app/api/v1/kb/[id]/feedback/route';
import { POST as fromTicketHandler } from '../../app/api/v1/kb/from-ticket/route';
import { POST as fromProblemHandler } from '../../app/api/v1/kb/from-problem/route';
import { GET as searchPortalHandler } from '../../app/api/v1/kb/portal/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';
import { createTicket } from '../../src/lib/tickets';
import { createProblem } from '../../src/lib/problems';

describe('Knowledge Management (KCS) & Self-Service Portal API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;
  let sampleTicketId: string;
  let sampleProblemId: string;

  beforeAll(async () => {
    const subA = 'tenant-kb-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Knowledge Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-kb-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Knowledge Tenant B', subB]
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

    // Create a sample ticket with resolution
    const t = await createTicket(tenantAId, {
      title: 'Outlook repeatedly prompting for password',
      description: 'Modern auth token expired in Windows Credential Manager',
      category: 'Software',
      priority: 'Medium',
      reporter_name: 'David Mark',
    });
    sampleTicketId = t.id;

    await query(
      `UPDATE tickets
       SET status = 'Resolved',
           resolution_notes = 'Cleared cached Office16 credentials in Windows Credential Manager and restarted Outlook.'
       WHERE id = $1 AND tenant_id = $2`,
      [sampleTicketId, tenantAId]
    );

    // Create a sample problem
    const p = await createProblem(tenantAId, {
      title: 'Wi-Fi 6 AP Roaming Disconnects on 5GHz Band',
      description: 'Laptops disconnect when roaming between AP-01 and AP-02',
      category: 'Network',
      priority: 'High',
      impact: 'High',
      root_cause: '802.11r Fast BSS Transition disabled on SSID controller profile',
      workaround: 'Lock client to 2.4GHz SSID temporarily',
      solution: 'Enabled FT Over-the-DS and updated controller firmware to v8.10',
      is_known_error: true,
    });
    sampleProblemId = p.id;
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  let ticketArticleId: string;
  let problemArticleId: string;

  it('should convert resolved ticket into a draft KB article (KCS)', async () => {
    const req = new Request('http://localhost/api/v1/kb/from-ticket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        ticket_id: sampleTicketId,
        visibility: 'Public',
        author_name: 'IT Support Team',
      }),
    });

    const res = await fromTicketHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.article.id).toMatch(/^KB-\d{4}-\d{4}$/);
    expect(data.article.title).toContain('Outlook repeatedly prompting for password');
    expect(data.article.status).toBe('Draft');
    expect(data.article.source_ticket_id).toBe(sampleTicketId);

    ticketArticleId = data.article.id;
  });

  it('should convert problem RCA into a draft KB article (KCS)', async () => {
    const req = new Request('http://localhost/api/v1/kb/from-problem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        problem_id: sampleProblemId,
        visibility: 'Internal',
        author_name: 'Network Operations',
      }),
    });

    const res = await fromProblemHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.article.id).toMatch(/^KB-\d{4}-\d{4}$/);
    expect(data.article.title).toContain('Wi-Fi 6 AP Roaming');
    expect(data.article.source_problem_id).toBe(sampleProblemId);

    problemArticleId = data.article.id;
  });

  it('should review and publish ticket-derived article to Self-Service portal', async () => {
    const req = new Request(`http://localhost/api/v1/kb/${ticketArticleId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'Published',
        visibility: 'Public',
        tags: ['Outlook', 'Credentials', 'Email'],
      }),
    });

    const res = await updateKbHandler(req, { params: Promise.resolve({ id: ticketArticleId }) });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.article.status).toBe('Published');
    expect(data.article.is_published).toBe(true);
  });

  it('should search published public articles in Self-Service portal', async () => {
    const req = new Request('http://localhost/api/v1/kb/portal?q=Outlook', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await searchPortalHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.articles.length).toBeGreaterThanOrEqual(1);
    const match = data.articles.find((a: any) => a.id === ticketArticleId);
    expect(match).toBeDefined();
  });

  it('should increment view count when viewing article', async () => {
    const req = new Request(`http://localhost/api/v1/kb/${ticketArticleId}?inc_view=true`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await getKbHandler(req, { params: Promise.resolve({ id: ticketArticleId }) });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.article.view_count).toBe(1);
  });

  it('should record helpfulness rating for article', async () => {
    const req = new Request(`http://localhost/api/v1/kb/${ticketArticleId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        is_helpful: true,
        feedback_text: 'Fixed my Outlook error instantly!',
      }),
    });

    const res = await feedbackHandler(req, { params: Promise.resolve({ id: ticketArticleId }) });
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.result.helpful_count).toBe(1);
  });

  it('should enforce Tenant Isolation: Tenant B cannot access Tenant A articles', async () => {
    const req = new Request(`http://localhost/api/v1/kb/${ticketArticleId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    const res = await getKbHandler(req, { params: Promise.resolve({ id: ticketArticleId }) });
    expect(res.status).toBe(404);
  });
});
