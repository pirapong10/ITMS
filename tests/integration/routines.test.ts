import { GET as listBorrowHandler, POST as createBorrowHandler } from '../../app/api/v1/borrow-records/route';
import { PATCH as returnBorrowHandler } from '../../app/api/v1/borrow-records/[id]/return/route';
import { GET as listPmHandler, POST as createPmHandler } from '../../app/api/v1/pm-schedules/route';
import { POST as executePmHandler } from '../../app/api/v1/pm-schedules/[id]/execute/route';
import { GET as listChecklistsHandler, POST as createChecklistHandler } from '../../app/api/v1/routine-checklists/route';
import { POST as createTicketFromChecklistHandler } from '../../app/api/v1/routine-checklists/[id]/create-ticket/route';
import { createAsset } from '../../src/lib/assets';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Routines, PM & Borrow Workflow API Integration Tests', () => {
  let tenantAId: string;
  let tokenA: string;
  let assetId: string;

  beforeAll(async () => {
    const subA = 'tenant-rtn-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Routine Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    tokenA = signJwt({
      userId: 'user-admin-a',
      tenantId: tenantAId,
      role: 'IT Admin',
    });

    const asset = await createAsset(tenantAId, {
      name: 'Projector Epson EB-X51',
      category: 'Hardware',
      purchase_cost: 18000,
      status: 'In Stock',
    });
    assetId = asset.id;
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id = $1', [tenantAId]);
  });

  let borrowId: string;
  let pmId: string;
  let failedChecklistId: string;

  it('should create a borrow record and update asset status to In Use', async () => {
    const req = new Request('http://localhost/api/v1/borrow-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        asset_id: assetId,
        borrower_name: 'Somsak Sales',
        borrower_email: 'somsak@company.com',
        department: 'Sales',
        expected_return_date: '2026-09-01T00:00:00.000Z',
        notes: 'Client presentation pitch',
      }),
    });

    const res = await createBorrowHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.record.borrow_code).toMatch(/^BRW-\d{4}-\d{4}$/);
    expect(data.record.status).toBe('Borrowed');

    borrowId = data.record.id;

    // Verify asset is now In Use
    const assetRes = await query('SELECT status FROM assets WHERE id = $1', [assetId]);
    expect(assetRes.rows[0].status).toBe('In Use');
  });

  it('should return borrowed equipment and restore asset status to In Stock', async () => {
    const req = new Request(`http://localhost/api/v1/borrow-records/${borrowId}/return`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        condition_on_return: 'Good, cable and bag included',
      }),
    });

    const res = await returnBorrowHandler(req, { params: Promise.resolve({ id: borrowId }) });
    expect(res.status).toBe(200);

    const data: any = await res.json();
    expect(data.record.status).toBe('Returned');
    expect(data.record.actual_return_date).toBeDefined();

    // Verify asset is now In Stock
    const assetRes = await query('SELECT status FROM assets WHERE id = $1', [assetId]);
    expect(assetRes.rows[0].status).toBe('In Stock');
  });

  it('should create and execute a Preventive Maintenance (PM) schedule', async () => {
    const initialDue = '2026-09-01T00:00:00.000Z';
    const req = new Request('http://localhost/api/v1/pm-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Monthly Server Air Conditioner Filter Cleaning',
        target_type: 'Location',
        target_id: 'Server Room 1',
        recurrence: 'Monthly',
        next_due_date: initialDue,
        assigned_technician: 'Thawatchai Tech',
        checklist_items: ['Wash mesh filter', 'Check refrigerant pressure'],
      }),
    });

    const res = await createPmHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.schedule.pm_code).toMatch(/^PM-\d{4}-\d{4}$/);
    pmId = data.schedule.id;

    // Execute PM Schedule
    const execReq = new Request(`http://localhost/api/v1/pm-schedules/${pmId}/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const execRes = await executePmHandler(execReq, { params: Promise.resolve({ id: pmId }) });
    expect(execRes.status).toBe(200);
    const execData: any = await execRes.json();
    expect(execData.schedule.last_executed_at).toBeDefined();
    expect(execData.schedule.next_due_date).not.toBe(initialDue);
  });

  it('should record a routine checklist and trigger one-click repair ticket on failure', async () => {
    // 1. Create failed checklist item
    const checkReq = new Request('http://localhost/api/v1/routine-checklists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        category: 'CCTV',
        item_name: 'Camera 04 - Server Room Entrance',
        status: 'Fail',
        checked_by: 'Inspector Chai',
        remarks: 'No video signal detected, black screen on DVR',
      }),
    });

    const checkRes = await createChecklistHandler(checkReq);
    expect(checkRes.status).toBe(201);
    const checkData: any = await checkRes.json();
    failedChecklistId = checkData.checklist.id;

    // 2. Trigger One-Click Ticket creation
    const ticketReq = new Request(
      `http://localhost/api/v1/routine-checklists/${failedChecklistId}/create-ticket`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      }
    );

    const ticketRes = await createTicketFromChecklistHandler(ticketReq, {
      params: Promise.resolve({ id: failedChecklistId }),
    });
    expect(ticketRes.status).toBe(201);
    const ticketData: any = await ticketRes.json();
    expect(ticketData.ticket.ticket_number).toMatch(/^TK-\d{4}-\d{4}$/);
    expect(ticketData.ticket.title).toContain('[Routine Failure] CCTV: Camera 04');
    expect(ticketData.ticket.priority).toBe('High');

    // Verify linked_ticket_id in checklist
    const checkListRes = await listChecklistsHandler(new Request('http://localhost/api/v1/routine-checklists', {
      headers: { Authorization: `Bearer ${tokenA}` },
    }));
    const checkListData: any = await checkListRes.json();
    const item = checkListData.checklists.find((c: any) => c.id === failedChecklistId);
    expect(item.linked_ticket_id).toBe(ticketData.ticket.id);
  });
});
