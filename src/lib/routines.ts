import { randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';
import { createTicket } from './tickets';

// Zod Validation Schemas
export const CreateBorrowRecordSchema = z.object({
  asset_id: z.string().min(1, 'Asset ID is required'),
  borrower_name: z.string().min(2, 'Borrower name must have at least 2 characters'),
  borrower_email: z.string().email().optional().nullable(),
  department: z.string().optional().nullable(),
  expected_return_date: z.string().min(1, 'Expected return date is required'),
  condition_on_borrow: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const ReturnBorrowRecordSchema = z.object({
  actual_return_date: z.string().optional(),
  condition_on_return: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const CreatePmScheduleSchema = z.object({
  title: z.string().min(2, 'Title must have at least 2 characters').max(255),
  target_type: z.enum(['Asset', 'Location', 'System']).default('Asset'),
  target_id: z.string().optional().nullable(),
  recurrence: z.enum(['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']).default('Monthly'),
  next_due_date: z.string().min(1, 'Next due date is required'),
  assigned_technician: z.string().optional().nullable(),
  checklist_items: z.array(z.string()).default([]),
});

export const CreateRoutineChecklistSchema = z.object({
  category: z.enum(['CCTV', 'Backup', 'ServerRoom']),
  item_name: z.string().min(2, 'Item name must have at least 2 characters'),
  status: z.enum(['Pass', 'Fail', 'Warning', 'Pending']).default('Pending'),
  checked_by: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  check_date: z.string().optional(),
});

export type CreateBorrowRecordInput = z.input<typeof CreateBorrowRecordSchema>;
export type ReturnBorrowRecordInput = z.input<typeof ReturnBorrowRecordSchema>;
export type CreatePmScheduleInput = z.input<typeof CreatePmScheduleSchema>;
export type CreateRoutineChecklistInput = z.input<typeof CreateRoutineChecklistSchema>;

export interface BorrowRecord {
  id: string;
  tenant_id: string;
  borrow_code: string;
  asset_id: string;
  borrower_name: string;
  borrower_email: string | null;
  department: string | null;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  status: string;
  condition_on_borrow: string | null;
  condition_on_return: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PmScheduleRecord {
  id: string;
  tenant_id: string;
  pm_code: string;
  title: string;
  target_type: string;
  target_id: string | null;
  recurrence: string;
  next_due_date: string;
  last_executed_at: string | null;
  assigned_technician: string | null;
  checklist_items: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RoutineChecklistRecord {
  id: string;
  tenant_id: string;
  check_date: string;
  category: string;
  item_name: string;
  status: string;
  checked_by: string | null;
  remarks: string | null;
  linked_ticket_id: string | null;
  created_at: string;
}

/**
 * Calculates the next PM due date based on recurrence interval.
 */
export function calculateNextPmDueDate(
  baseDate: Date | string,
  recurrence: string
): Date {
  const next = new Date(baseDate);
  switch (recurrence) {
    case 'Daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'Monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'Quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'Yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function generateBorrowCode(client: any, tenantId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `BRW-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM borrow_records WHERE tenant_id = $1 AND borrow_code LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export async function generatePmCode(client: any, tenantId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `PM-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM pm_schedules WHERE tenant_id = $1 AND pm_code LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// Borrow Operations
export async function createBorrowRecord(tenantId: string, input: CreateBorrowRecordInput): Promise<BorrowRecord> {
  const validated = CreateBorrowRecordSchema.parse(input);
  const id = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const code = await generateBorrowCode(client, tenantId, now.getFullYear());
    const res = await client.query(
      `INSERT INTO borrow_records (
        id, tenant_id, borrow_code, asset_id, borrower_name,
        borrower_email, department, borrow_date, expected_return_date,
        status, condition_on_borrow, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Borrowed', $10, $11, $8, $8)
      RETURNING *;`,
      [
        id,
        tenantId,
        code,
        validated.asset_id,
        validated.borrower_name,
        validated.borrower_email || null,
        validated.department || null,
        now.toISOString(),
        new Date(validated.expected_return_date).toISOString(),
        validated.condition_on_borrow || null,
        validated.notes || null,
      ]
    );

    // Update asset status to In Use
    await client.query(
      `UPDATE assets SET status = 'In Use', updated_at = current_timestamp WHERE id = $1 AND tenant_id = $2`,
      [validated.asset_id, tenantId]
    );

    return res.rows[0];
  });
}

export async function listBorrowRecords(tenantId: string, filters: { status?: string; asset_id?: string } = {}): Promise<BorrowRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    if (filters.asset_id) {
      conditions.push(`asset_id = $${paramIndex}`);
      params.push(filters.asset_id);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT * FROM borrow_records WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );

    // Check overdue dynamically
    const now = new Date();
    return res.rows.map((row: BorrowRecord) => {
      let status = row.status;
      if (status === 'Borrowed' && new Date(row.expected_return_date) < now) {
        status = 'Overdue';
      }
      return { ...row, status };
    });
  });
}

export async function returnBorrowRecord(tenantId: string, borrowId: string, input: ReturnBorrowRecordInput): Promise<BorrowRecord> {
  const validated = ReturnBorrowRecordSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM borrow_records WHERE id = $1 AND tenant_id = $2`,
      [borrowId, tenantId]
    );
    if (currentRes.rows.length === 0) throw new Error('Borrow record not found');

    const borrow = currentRes.rows[0];
    const returnDate = validated.actual_return_date ? new Date(validated.actual_return_date).toISOString() : now.toISOString();

    const res = await client.query(
      `UPDATE borrow_records 
       SET status = 'Returned',
           actual_return_date = $1,
           condition_on_return = $2,
           notes = COALESCE($3, notes),
           updated_at = $1
       WHERE id = $4 AND tenant_id = $5
       RETURNING *;`,
      [returnDate, validated.condition_on_return || null, validated.notes || null, borrowId, tenantId]
    );

    // Update asset status to In Stock
    await client.query(
      `UPDATE assets SET status = 'In Stock', updated_at = current_timestamp WHERE id = $1 AND tenant_id = $2`,
      [borrow.asset_id, tenantId]
    );

    return res.rows[0];
  });
}

// PM Operations
export async function createPmSchedule(tenantId: string, input: CreatePmScheduleInput): Promise<PmScheduleRecord> {
  const validated = CreatePmScheduleSchema.parse(input);
  const id = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const code = await generatePmCode(client, tenantId, now.getFullYear());
    const res = await client.query(
      `INSERT INTO pm_schedules (
        id, tenant_id, pm_code, title, target_type, target_id,
        recurrence, next_due_date, assigned_technician, checklist_items,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Active', $11, $11)
      RETURNING *;`,
      [
        id,
        tenantId,
        code,
        validated.title,
        validated.target_type,
        validated.target_id || null,
        validated.recurrence,
        new Date(validated.next_due_date).toISOString(),
        validated.assigned_technician || null,
        JSON.stringify(validated.checklist_items),
        now.toISOString(),
      ]
    );
    return res.rows[0];
  });
}

export async function listPmSchedules(tenantId: string): Promise<PmScheduleRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM pm_schedules WHERE tenant_id = $1 ORDER BY next_due_date ASC`,
      [tenantId]
    );
    return res.rows;
  });
}

export async function executePmSchedule(tenantId: string, pmId: string): Promise<PmScheduleRecord> {
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM pm_schedules WHERE id = $1 AND tenant_id = $2`,
      [pmId, tenantId]
    );
    if (currentRes.rows.length === 0) throw new Error('PM Schedule not found');

    const schedule = currentRes.rows[0];
    const nextDue = calculateNextPmDueDate(now, schedule.recurrence);

    const res = await client.query(
      `UPDATE pm_schedules
       SET last_executed_at = $1,
           next_due_date = $2,
           updated_at = $1
       WHERE id = $3 AND tenant_id = $4
       RETURNING *;`,
      [now.toISOString(), nextDue.toISOString(), pmId, tenantId]
    );
    return res.rows[0];
  });
}

// Routine Checklists Operations
export async function createRoutineChecklist(tenantId: string, input: CreateRoutineChecklistInput): Promise<RoutineChecklistRecord> {
  const validated = CreateRoutineChecklistSchema.parse(input);
  const id = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `INSERT INTO routine_checklists (
        id, tenant_id, check_date, category, item_name,
        status, checked_by, remarks, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;`,
      [
        id,
        tenantId,
        validated.check_date || now.toISOString().split('T')[0],
        validated.category,
        validated.item_name,
        validated.status,
        validated.checked_by || null,
        validated.remarks || null,
        now.toISOString(),
      ]
    );
    return res.rows[0];
  });
}

export async function listRoutineChecklists(tenantId: string, category?: string): Promise<RoutineChecklistRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    let queryText = `SELECT * FROM routine_checklists WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (category) {
      queryText += ` AND category = $2`;
      params.push(category);
    }
    queryText += ` ORDER BY created_at DESC`;
    const res = await client.query(queryText, params);
    return res.rows;
  });
}

/**
 * Converts a failed routine checklist item into a Helpdesk repair ticket.
 */
export async function createTicketFromFailedChecklist(
  tenantId: string,
  checklistId: string,
  actor?: { id?: string | null; name?: string | null }
) {
  return withTenantTransaction(tenantId, async (client) => {
    const checkRes = await client.query(
      `SELECT * FROM routine_checklists WHERE id = $1 AND tenant_id = $2`,
      [checklistId, tenantId]
    );
    if (checkRes.rows.length === 0) throw new Error('Checklist item not found');

    const item = checkRes.rows[0];
    if (item.linked_ticket_id) {
      throw new Error(`A repair ticket has already been created for this item (${item.linked_ticket_id})`);
    }

    const createdTicket = await createTicket(
      tenantId,
      {
        title: `[Routine Failure] ${item.category}: ${item.item_name}`,
        description: `Routine inspection failed on ${item.check_date}. Remarks: ${item.remarks || 'No remarks provided.'}`,
        category: item.category,
        priority: 'High',
        reporter_name: item.checked_by || 'Routine Inspector',
      },
      actor
    );

    // Link ticket back to checklist
    await client.query(
      `UPDATE routine_checklists SET linked_ticket_id = $1 WHERE id = $2 AND tenant_id = $3`,
      [createdTicket.id, checklistId, tenantId]
    );

    return createdTicket;
  });
}
