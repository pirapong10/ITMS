import { GET as listTicketsHandler, POST as createTicketHandler } from '../../app/api/v1/tickets/route';
import { GET as getTicketHandler, PATCH as updateTicketHandler } from '../../app/api/v1/tickets/[id]/route';
import { PATCH as resolveTicketHandler } from '../../app/api/v1/tickets/[id]/resolution/route';
import { POST as csatHandler } from '../../app/api/v1/tickets/[id]/csat/route';
import { GET as listCannedHandler, POST as createCannedHandler } from '../../app/api/v1/canned-responses/route';
import { query, pool } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Helpdesk & SLA API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Setup test tenants
    const subA = 'tenant-hd-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Helpdesk Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-hd-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Helpdesk Tenant B', subB]
    );
    tenantBId = resB.rows[0].id;

    tokenA = signJwt({
      userId: 'user-admin-a',
      tenantId: tenantAId,
      role: 'Super Admin',
    });

    tokenB = signJwt({
      userId: 'user-admin-b',
      tenantId: tenantBId,
      role: 'Super Admin',
    });
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  let createdTicketId: string;
  let createdTicketNumber: string;

  it('should create a new ticket with automatic running number and SLA deadline', async () => {
    const req = new Request('http://localhost/api/v1/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Core Switch Port Flapping',
        description: 'VLAN 10 port 24 is flapping every 30 seconds.',
        category: 'Network',
        priority: 'Critical',
        reporter_name: 'Somchai User',
        reporter_email: 'somchai@tenanta.com',
      }),
    });

    const res = await createTicketHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.ticket).toBeDefined();
    expect(data.ticket.ticket_number).toMatch(/^TK-\d{4}-\d{4}$/);
    expect(data.ticket.priority).toBe('Critical');
    expect(data.ticket.sla_target_hours).toBe(2);
    expect(data.ticket.status).toBe('Open');

    createdTicketId = data.ticket.id;
    createdTicketNumber = data.ticket.ticket_number;
  });

  it('should generate sequential running numbers for subsequent tickets', async () => {
    const req = new Request('http://localhost/api/v1/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Second Ticket in Tenant A',
        priority: 'High',
      }),
    });

    const res = await createTicketHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.ticket.ticket_number).toBeDefined();
    expect(data.ticket.ticket_number).not.toBe(createdTicketNumber);
  });

  it('should enforce Tenant Isolation: Tenant B cannot view Tenant A tickets', async () => {
    const req = new Request('http://localhost/api/v1/tickets', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    const res = await listTicketsHandler(req);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.tickets.length).toBe(0);
    expect(data.total).toBe(0);
  });

  it('should retrieve ticket detail with SLA countdown and audit logs', async () => {
    const req = new Request(`http://localhost/api/v1/tickets/${createdTicketId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const context = { params: Promise.resolve({ id: createdTicketId }) };
    const res = await getTicketHandler(req, context);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.ticket.id).toBe(createdTicketId);
    expect(data.slaState).toBeDefined();
    expect(data.slaState.isPaused).toBe(false);
    expect(data.auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(data.auditLogs[0].action).toBe('TICKET_CREATED');
  });

  it('should pause SLA timer when status transitions to Waiting for Vendor', async () => {
    const req = new Request(`http://localhost/api/v1/tickets/${createdTicketId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'Waiting for Vendor',
        assigned_to: 'Cisco Support Team',
      }),
    });

    const context = { params: Promise.resolve({ id: createdTicketId }) };
    const res = await updateTicketHandler(req, context);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.ticket.status).toBe('Waiting for Vendor');
    expect(data.ticket.sla_paused_at).not.toBeNull();
  });

  it('should resolve ticket, record resolution notes, and calculate SLA completion', async () => {
    const req = new Request(
      `http://localhost/api/v1/tickets/${createdTicketId}/resolution`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          resolution_notes: 'Replaced faulty SFP+ transceiver module and upgraded firmware.',
          assigned_to: 'Technician Somchai',
        }),
      }
    );

    const context = { params: Promise.resolve({ id: createdTicketId }) };
    const res = await resolveTicketHandler(req, context);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.ticket.status).toBe('Resolved');
    expect(data.ticket.resolution_notes).toContain('Replaced faulty SFP+');
    expect(data.ticket.resolved_at).not.toBeNull();
  });

  it('should record CSAT 1-5 rating and feedback', async () => {
    const req = new Request(
      `http://localhost/api/v1/tickets/${createdTicketId}/csat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify({
          rating: 5,
          feedback: 'Fast response and solved problem completely!',
        }),
      }
    );

    const context = { params: Promise.resolve({ id: createdTicketId }) };
    const res = await csatHandler(req, context);
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.ticket.csat_rating).toBe(5);
    expect(data.ticket.csat_feedback).toBe('Fast response and solved problem completely!');
  });

  it('should manage canned responses per tenant', async () => {
    const postReq = new Request('http://localhost/api/v1/canned-responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        category: 'Network',
        title: 'Router Reboot Instructions',
        content: 'Please power off the router for 30 seconds, then turn it back on.',
        shortcut_code: '#reboot',
      }),
    });

    const postRes = await createCannedHandler(postReq);
    expect(postRes.status).toBe(201);

    const getReq = new Request('http://localhost/api/v1/canned-responses', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const getRes = await listCannedHandler(getReq);
    expect(getRes.status).toBe(200);
    const getData: any = await getRes.json();
    expect(getData.canned_responses.length).toBeGreaterThanOrEqual(1);
    expect(getData.canned_responses[0].title).toBe('Router Reboot Instructions');
  });
});
