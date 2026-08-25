import { randomUUID } from 'crypto';
import { z } from 'zod';
import { queryWithTenant, withTenantTransaction } from './db';
import {
  calculateSlaDeadline,
  calculateSlaState,
  getSlaTargetHours,
  handleStatusTransition,
  SlaStateResult,
  TicketPriority,
  TicketStatus,
} from './sla';

// Zod Validation Schemas
export const CreateTicketSchema = z.object({
  title: z.string().min(3, 'Title must have at least 3 characters').max(255),
  description: z.string().optional().default(''),
  category: z.string().optional().default('General'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  assigned_to: z.string().optional().nullable(),
  reporter_name: z.string().optional().nullable(),
  reporter_email: z.string().email().optional().nullable(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
        type: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export const UpdateTicketSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  status: z
    .enum([
      'Open',
      'In Progress',
      'Waiting for User',
      'Waiting for Vendor',
      'Resolved',
      'Closed',
    ])
    .optional(),
  assigned_to: z.string().optional().nullable(),
});

export const ResolutionSchema = z.object({
  resolution_notes: z.string().min(3, 'Resolution notes must have at least 3 characters'),
  assigned_to: z.string().optional().nullable(),
});

export const CsatSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional().nullable(),
});

export const CannedResponseSchema = z.object({
  category: z.string().optional().default('General'),
  title: z.string().min(2).max(255),
  content: z.string().min(2),
  shortcut_code: z.string().optional().nullable(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
export type ResolutionInput = z.infer<typeof ResolutionSchema>;
export type CsatInput = z.infer<typeof CsatSchema>;
export type CreateCannedResponseInput = z.infer<typeof CannedResponseSchema>;

export interface TicketFilters {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  breached?: boolean;
  assigned_to?: string;
  page?: number;
  limit?: number;
}

export interface TicketRecord {
  id: string;
  tenant_id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  sla_target_hours: number;
  sla_deadline: string;
  sla_paused_at: string | null;
  sla_total_paused_seconds: number;
  sla_breached: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  csat_rating: number | null;
  csat_feedback: string | null;
  attachments: any;
  created_at: string;
  updated_at: string;
}

export interface TicketAuditLog {
  id: string;
  tenant_id: string;
  ticket_id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  details: any;
  created_at: string;
}

export interface CannedResponse {
  id: string;
  tenant_id: string;
  category: string;
  title: string;
  content: string;
  shortcut_code: string | null;
  created_at: string;
}

/**
 * Generates an atomic Running Number for a ticket: TK-YYYY-XXXX (e.g. TK-2026-0001)
 */
export async function generateTicketNumber(
  client: any,
  tenantId: string,
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `TK-${currentYear}-`;

  const countRes = await client.query(
    `SELECT count(*) as count FROM tickets WHERE tenant_id = $1 AND ticket_number LIKE $2`,
    [tenantId, `${prefix}%`]
  );

  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  const seqPadded = String(nextSeq).padStart(4, '0');
  return `${prefix}${seqPadded}`;
}

/**
 * Creates a ticket audit log record.
 */
export async function insertAuditLog(
  client: any,
  tenantId: string,
  ticketId: string,
  action: string,
  actor?: { id?: string | null; name?: string | null },
  oldValue?: string | null,
  newValue?: string | null,
  details?: any
) {
  const logId = randomUUID();
  await client.query(
    `INSERT INTO ticket_audit_logs 
      (id, tenant_id, ticket_id, actor_id, actor_name, action, old_value, new_value, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, current_timestamp)`,
    [
      logId,
      tenantId,
      ticketId,
      actor?.id || 'system',
      actor?.name || 'System',
      action,
      oldValue || null,
      newValue || null,
      details ? JSON.stringify(details) : null,
    ]
  );
}

/**
 * Create a new ticket with automatic SLA deadline and running number.
 */
export async function createTicket(
  tenantId: string,
  input: CreateTicketInput,
  actor?: { id?: string | null; name?: string | null }
): Promise<TicketRecord> {
  const validated = CreateTicketSchema.parse(input);
  const ticketId = randomUUID();
  const now = new Date();
  const slaTargetHours = getSlaTargetHours(validated.priority);
  const slaDeadline = calculateSlaDeadline(now, validated.priority);

  return withTenantTransaction(tenantId, async (client) => {
    const ticketNumber = await generateTicketNumber(client, tenantId, now.getFullYear());

    const queryText = `
      INSERT INTO tickets (
        id, tenant_id, ticket_number, title, description, category,
        priority, status, assigned_to, reporter_name, reporter_email,
        sla_target_hours, sla_deadline, sla_paused_at, sla_total_paused_seconds,
        sla_breached, attachments, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19
      ) RETURNING *;
    `;

    const values = [
      ticketId,
      tenantId,
      ticketNumber,
      validated.title,
      validated.description,
      validated.category,
      validated.priority,
      'Open',
      validated.assigned_to || null,
      validated.reporter_name || null,
      validated.reporter_email || null,
      slaTargetHours,
      slaDeadline.toISOString(),
      null,
      0,
      false,
      JSON.stringify(validated.attachments),
      now.toISOString(),
      now.toISOString(),
    ];

    const result = await client.query(queryText, values);
    const created = result.rows[0];

    // Audit log
    await insertAuditLog(
      client,
      tenantId,
      ticketId,
      'TICKET_CREATED',
      actor,
      null,
      'Open',
      { ticket_number: ticketNumber, priority: validated.priority }
    );

    return created;
  });
}

/**
 * List tickets with multiple query filters and pagination.
 */
export async function listTickets(
  tenantId: string,
  filters: TicketFilters = {}
): Promise<{
  tickets: (TicketRecord & { sla_state: SlaStateResult })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;

  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.assigned_to) {
      conditions.push(`assigned_to = $${paramIndex}`);
      params.push(filters.assigned_to);
      paramIndex++;
    }

    if (typeof filters.breached === 'boolean') {
      conditions.push(`sla_breached = $${paramIndex}`);
      params.push(filters.breached);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(
        `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR ticket_number ILIKE $${paramIndex})`
      );
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Total Count
    const countRes = await client.query(
      `SELECT count(*) as total FROM tickets WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    // Tickets Query
    const listParams = [...params, limit, offset];
    const listRes = await client.query(
      `SELECT * FROM tickets WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      listParams
    );

    const now = new Date();
    const tickets = listRes.rows.map((row: TicketRecord) => {
      const slaState = calculateSlaState({
        createdAt: row.created_at,
        priority: row.priority,
        status: row.status,
        slaDeadline: row.sla_deadline,
        slaPausedAt: row.sla_paused_at,
        slaTotalPausedSeconds: row.sla_total_paused_seconds,
        resolvedAt: row.resolved_at,
        now,
      });

      return {
        ...row,
        sla_state: slaState,
      };
    });

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  });
}

/**
 * Get ticket details by ID with audit logs and computed SLA state.
 */
export async function getTicketById(
  tenantId: string,
  ticketId: string
): Promise<{
  ticket: TicketRecord;
  auditLogs: TicketAuditLog[];
  slaState: SlaStateResult;
} | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2`,
      [ticketId, tenantId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const ticket: TicketRecord = res.rows[0];

    const logsRes = await client.query(
      `SELECT * FROM ticket_audit_logs WHERE ticket_id = $1 AND tenant_id = $2 ORDER BY created_at ASC`,
      [ticketId, tenantId]
    );

    const slaState = calculateSlaState({
      createdAt: ticket.created_at,
      priority: ticket.priority,
      status: ticket.status,
      slaDeadline: ticket.sla_deadline,
      slaPausedAt: ticket.sla_paused_at,
      slaTotalPausedSeconds: ticket.sla_total_paused_seconds,
      resolvedAt: ticket.resolved_at,
    });

    return {
      ticket,
      auditLogs: logsRes.rows,
      slaState,
    };
  });
}

/**
 * General update for a ticket (e.g. status transition, assignment, priority).
 */
export async function updateTicket(
  tenantId: string,
  ticketId: string,
  input: UpdateTicketInput,
  actor?: { id?: string | null; name?: string | null }
): Promise<TicketRecord> {
  const validated = UpdateTicketSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2`,
      [ticketId, tenantId]
    );

    if (currentRes.rows.length === 0) {
      throw new Error('Ticket not found');
    }

    const current: TicketRecord = currentRes.rows[0];
    const now = new Date();

    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [now.toISOString()];
    let paramIndex = 2;

    if (validated.title && validated.title !== current.title) {
      updates.push(`title = $${paramIndex}`);
      values.push(validated.title);
      paramIndex++;
      await insertAuditLog(
        client,
        tenantId,
        ticketId,
        'TITLE_UPDATED',
        actor,
        current.title,
        validated.title
      );
    }

    if (validated.description !== undefined && validated.description !== current.description) {
      updates.push(`description = $${paramIndex}`);
      values.push(validated.description);
      paramIndex++;
    }

    if (validated.category && validated.category !== current.category) {
      updates.push(`category = $${paramIndex}`);
      values.push(validated.category);
      paramIndex++;
      await insertAuditLog(
        client,
        tenantId,
        ticketId,
        'CATEGORY_UPDATED',
        actor,
        current.category,
        validated.category
      );
    }

    if (validated.assigned_to !== undefined && validated.assigned_to !== current.assigned_to) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(validated.assigned_to);
      paramIndex++;
      await insertAuditLog(
        client,
        tenantId,
        ticketId,
        'ASSIGNMENT_CHANGED',
        actor,
        current.assigned_to,
        validated.assigned_to
      );
    }

    if (validated.priority && validated.priority !== current.priority) {
      updates.push(`priority = $${paramIndex}`);
      values.push(validated.priority);
      paramIndex++;

      const newTargetHours = getSlaTargetHours(validated.priority);
      const newDeadline = calculateSlaDeadline(current.created_at, validated.priority);

      updates.push(`sla_target_hours = $${paramIndex}`);
      values.push(newTargetHours);
      paramIndex++;

      updates.push(`sla_deadline = $${paramIndex}`);
      values.push(newDeadline.toISOString());
      paramIndex++;

      await insertAuditLog(
        client,
        tenantId,
        ticketId,
        'PRIORITY_CHANGED',
        actor,
        current.priority,
        validated.priority
      );
    }

    if (validated.status && validated.status !== current.status) {
      const transition = handleStatusTransition({
        currentStatus: current.status,
        newStatus: validated.status,
        slaDeadline: current.sla_deadline,
        slaPausedAt: current.sla_paused_at,
        slaTotalPausedSeconds: current.sla_total_paused_seconds,
        now,
      });

      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;

      updates.push(`sla_paused_at = $${paramIndex}`);
      values.push(transition.slaPausedAt ? transition.slaPausedAt.toISOString() : null);
      paramIndex++;

      updates.push(`sla_total_paused_seconds = $${paramIndex}`);
      values.push(transition.slaTotalPausedSeconds);
      paramIndex++;

      updates.push(`sla_breached = $${paramIndex}`);
      values.push(transition.isBreached);
      paramIndex++;

      if (transition.resolvedAt) {
        updates.push(`resolved_at = $${paramIndex}`);
        values.push(transition.resolvedAt.toISOString());
        paramIndex++;
      }

      if (transition.closedAt) {
        updates.push(`closed_at = $${paramIndex}`);
        values.push(transition.closedAt.toISOString());
        paramIndex++;
      }

      await insertAuditLog(
        client,
        tenantId,
        ticketId,
        'STATUS_CHANGED',
        actor,
        current.status,
        validated.status,
        {
          isPaused: !!transition.slaPausedAt,
          sla_breached: transition.isBreached,
        }
      );
    }

    values.push(ticketId);
    values.push(tenantId);

    const updateQuery = `
      UPDATE tickets
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *;
    `;

    const result = await client.query(updateQuery, values);
    return result.rows[0];
  });
}

/**
 * Resolves a ticket, records resolution notes, updates MTTR/SLA status and logs audit entry.
 */
export async function resolveTicket(
  tenantId: string,
  ticketId: string,
  input: ResolutionInput,
  actor?: { id?: string | null; name?: string | null }
): Promise<TicketRecord> {
  const validated = ResolutionSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2`,
      [ticketId, tenantId]
    );

    if (currentRes.rows.length === 0) {
      throw new Error('Ticket not found');
    }

    const current: TicketRecord = currentRes.rows[0];
    const now = new Date();

    const transition = handleStatusTransition({
      currentStatus: current.status,
      newStatus: 'Resolved',
      slaDeadline: current.sla_deadline,
      slaPausedAt: current.sla_paused_at,
      slaTotalPausedSeconds: current.sla_total_paused_seconds,
      now,
    });

    const assignedTo = validated.assigned_to || current.assigned_to;

    const updateQuery = `
      UPDATE tickets
      SET status = 'Resolved',
          resolution_notes = $1,
          assigned_to = $2,
          resolved_at = $3,
          sla_paused_at = null,
          sla_total_paused_seconds = $4,
          sla_breached = $5,
          updated_at = $3
      WHERE id = $6 AND tenant_id = $7
      RETURNING *;
    `;

    const values = [
      validated.resolution_notes,
      assignedTo,
      now.toISOString(),
      transition.slaTotalPausedSeconds,
      transition.isBreached,
      ticketId,
      tenantId,
    ];

    const result = await client.query(updateQuery, values);
    const resolvedTicket = result.rows[0];

    await insertAuditLog(
      client,
      tenantId,
      ticketId,
      'TICKET_RESOLVED',
      actor,
      current.status,
      'Resolved',
      {
        resolution_notes: validated.resolution_notes,
        sla_breached: transition.isBreached,
      }
    );

    return resolvedTicket;
  });
}

/**
 * Records customer satisfaction (CSAT) rating and feedback.
 */
export async function submitCsat(
  tenantId: string,
  ticketId: string,
  input: CsatInput
): Promise<TicketRecord> {
  const validated = CsatSchema.parse(input);

  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2`,
      [ticketId, tenantId]
    );

    if (currentRes.rows.length === 0) {
      throw new Error('Ticket not found');
    }

    const updateQuery = `
      UPDATE tickets
      SET csat_rating = $1,
          csat_feedback = $2,
          updated_at = current_timestamp
      WHERE id = $3 AND tenant_id = $4
      RETURNING *;
    `;

    const values = [
      validated.rating,
      validated.feedback || null,
      ticketId,
      tenantId,
    ];

    const result = await client.query(updateQuery, values);
    const ticket = result.rows[0];

    await insertAuditLog(
      client,
      tenantId,
      ticketId,
      'CSAT_SUBMITTED',
      { id: 'requester', name: ticket.reporter_name || 'Requester' },
      null,
      `${validated.rating} Stars`,
      { feedback: validated.feedback }
    );

    return ticket;
  });
}

/**
 * List canned responses for quick replies.
 */
export async function listCannedResponses(
  tenantId: string,
  category?: string
): Promise<CannedResponse[]> {
  return withTenantTransaction(tenantId, async (client) => {
    let queryText = `SELECT * FROM canned_responses WHERE tenant_id = $1`;
    const params: any[] = [tenantId];

    if (category) {
      queryText += ` AND category = $2`;
      params.push(category);
    }

    queryText += ` ORDER BY title ASC`;

    const res = await client.query(queryText, params);
    return res.rows;
  });
}

/**
 * Create a new canned response template.
 */
export async function createCannedResponse(
  tenantId: string,
  input: CreateCannedResponseInput
): Promise<CannedResponse> {
  const validated = CannedResponseSchema.parse(input);
  const id = randomUUID();

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `INSERT INTO canned_responses (id, tenant_id, category, title, content, shortcut_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        tenantId,
        validated.category,
        validated.title,
        validated.content,
        validated.shortcut_code || null,
      ]
    );
    return res.rows[0];
  });
}
