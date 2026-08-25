import { z } from 'zod';
import { withTenantTransaction } from './db';

// Zod Validation Schemas
export const CreateProblemSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(3),
  category: z.string().min(2).max(50).default('Infrastructure'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  impact: z.enum(['Critical', 'High', 'Medium', 'Low']).default('Medium'),
  assigned_to: z.string().optional(),
  root_cause: z.string().optional(),
  workaround: z.string().optional(),
  solution: z.string().optional(),
  is_known_error: z.boolean().default(false),
  ticket_ids: z.array(z.string()).optional().default([]),
});

export const UpdateProblemSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(3).optional(),
  category: z.string().min(2).max(50).optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  impact: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  status: z.enum(['Open', 'Investigating', 'Identified', 'Known Error', 'Resolved', 'Closed']).optional(),
  assigned_to: z.string().optional(),
  root_cause: z.string().optional(),
  workaround: z.string().optional(),
  solution: z.string().optional(),
  is_known_error: z.boolean().optional(),
});

export const LinkTicketsSchema = z.object({
  ticket_ids: z.array(z.string()).min(1),
});

export const ResolveProblemSchema = z.object({
  root_cause: z.string().min(3, 'Root cause summary is required to resolve a problem'),
  solution: z.string().min(3, 'Solution description is required'),
  workaround: z.string().optional(),
  cascade_to_tickets: z.boolean().default(true),
});

export type CreateProblemInput = z.input<typeof CreateProblemSchema>;
export type UpdateProblemInput = z.input<typeof UpdateProblemSchema>;
export type LinkTicketsInput = z.input<typeof LinkTicketsSchema>;
export type ResolveProblemInput = z.input<typeof ResolveProblemSchema>;

export interface ProblemRecord {
  id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  impact: string;
  status: string;
  assigned_to: string | null;
  root_cause: string | null;
  workaround: string | null;
  solution: string | null;
  is_known_error: boolean;
  linked_tickets_count?: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

/**
 * Generates an atomic Problem ID: PRB-YYYY-XXXX (e.g. PRB-2026-0001)
 */
export async function generateProblemId(client: any, tenantId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `PRB-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM problems WHERE tenant_id = $1 AND id LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Creates a new ITIL Problem Record with optional initial ticket links.
 */
export async function createProblem(tenantId: string, input: CreateProblemInput): Promise<ProblemRecord> {
  const validated = CreateProblemSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const id = await generateProblemId(client, tenantId, now.getFullYear());
    const initialStatus = validated.is_known_error ? 'Known Error' : 'Open';

    const res = await client.query(
      `INSERT INTO problems (
        id, tenant_id, title, description, category, priority, impact,
        status, assigned_to, root_cause, workaround, solution, is_known_error,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      RETURNING *;`,
      [
        id,
        tenantId,
        validated.title,
        validated.description,
        validated.category,
        validated.priority,
        validated.impact,
        initialStatus,
        validated.assigned_to || null,
        validated.root_cause || null,
        validated.workaround || null,
        validated.solution || null,
        validated.is_known_error,
        now.toISOString(),
      ]
    );

    // Link initial tickets if provided
    if (validated.ticket_ids && validated.ticket_ids.length > 0) {
      for (const ticketId of validated.ticket_ids) {
        await client.query(
          `INSERT INTO problem_ticket_links (problem_id, ticket_id, tenant_id, linked_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING;`,
          [id, ticketId, tenantId, now.toISOString()]
        );
      }
    }

    return {
      ...res.rows[0],
      linked_tickets_count: validated.ticket_ids?.length || 0,
    };
  });
}

/**
 * Retrieves problem by ID including linked tickets count.
 */
export async function getProblemById(tenantId: string, id: string): Promise<ProblemRecord | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT p.*,
        (SELECT count(*) FROM problem_ticket_links ptl WHERE ptl.problem_id = p.id) as linked_tickets_count
       FROM problems p
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [id, tenantId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...row,
      linked_tickets_count: parseInt(row.linked_tickets_count, 10) || 0,
    };
  });
}

/**
 * Lists problem records with filtering.
 */
export async function listProblems(
  tenantId: string,
  filters: {
    status?: string;
    category?: string;
    is_known_error?: boolean;
    search?: string;
  } = {}
): Promise<ProblemRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['p.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`p.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    if (filters.category) {
      conditions.push(`p.category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }
    if (filters.is_known_error !== undefined) {
      conditions.push(`p.is_known_error = $${paramIndex}`);
      params.push(filters.is_known_error);
      paramIndex++;
    }
    if (filters.search) {
      conditions.push(`(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.id ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT p.*,
        (SELECT count(*) FROM problem_ticket_links ptl WHERE ptl.problem_id = p.id) as linked_tickets_count
       FROM problems p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.created_at DESC`,
      params
    );

    return res.rows.map((row: any) => ({
      ...row,
      linked_tickets_count: parseInt(row.linked_tickets_count, 10) || 0,
    }));
  });
}

/**
 * Updates problem attributes.
 */
export async function updateProblem(
  tenantId: string,
  id: string,
  input: UpdateProblemInput
): Promise<ProblemRecord> {
  const validated = UpdateProblemSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [now.toISOString()];
    let paramIndex = 2;

    if (validated.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(validated.title);
      paramIndex++;
    }
    if (validated.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(validated.description);
      paramIndex++;
    }
    if (validated.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(validated.category);
      paramIndex++;
    }
    if (validated.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(validated.priority);
      paramIndex++;
    }
    if (validated.impact !== undefined) {
      updates.push(`impact = $${paramIndex}`);
      values.push(validated.impact);
      paramIndex++;
    }
    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;
    }
    if (validated.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(validated.assigned_to);
      paramIndex++;
    }
    if (validated.root_cause !== undefined) {
      updates.push(`root_cause = $${paramIndex}`);
      values.push(validated.root_cause);
      paramIndex++;
    }
    if (validated.workaround !== undefined) {
      updates.push(`workaround = $${paramIndex}`);
      values.push(validated.workaround);
      paramIndex++;
    }
    if (validated.solution !== undefined) {
      updates.push(`solution = $${paramIndex}`);
      values.push(validated.solution);
      paramIndex++;
    }
    if (validated.is_known_error !== undefined) {
      updates.push(`is_known_error = $${paramIndex}`);
      values.push(validated.is_known_error);
      paramIndex++;
    }

    values.push(id, tenantId);

    const res = await client.query(
      `UPDATE problems SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *;`,
      values
    );

    if (res.rows.length === 0) throw new Error('Problem not found');
    return res.rows[0];
  });
}

/**
 * Links multiple incident tickets to a problem.
 */
export async function linkTicketsToProblem(
  tenantId: string,
  problemId: string,
  ticketIds: string[]
): Promise<number> {
  const validated = LinkTicketsSchema.parse({ ticket_ids: ticketIds });

  return withTenantTransaction(tenantId, async (client) => {
    let linkedCount = 0;
    for (const tid of validated.ticket_ids) {
      const res = await client.query(
        `INSERT INTO problem_ticket_links (problem_id, ticket_id, tenant_id, linked_at)
         VALUES ($1, $2, $3, current_timestamp)
         ON CONFLICT DO NOTHING
         RETURNING ticket_id;`,
        [problemId, tid, tenantId]
      );
      if (res.rows.length > 0) linkedCount++;
    }
    return linkedCount;
  });
}

/**
 * Unlinks an incident ticket from a problem.
 */
export async function unlinkTicketFromProblem(
  tenantId: string,
  problemId: string,
  ticketId: string
): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM problem_ticket_links WHERE problem_id = $1 AND ticket_id = $2 AND tenant_id = $3 RETURNING ticket_id;`,
      [problemId, ticketId, tenantId]
    );
    return res.rows.length > 0;
  });
}

/**
 * Retrieves all linked incident tickets for a problem.
 */
export async function getProblemLinkedTickets(tenantId: string, problemId: string) {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT t.id, t.title, t.priority, t.status, t.assigned_to, t.reporter_name, t.created_at, ptl.linked_at
       FROM problem_ticket_links ptl
       JOIN tickets t ON ptl.ticket_id = t.id
       WHERE ptl.problem_id = $1 AND ptl.tenant_id = $2
       ORDER BY ptl.linked_at DESC`,
      [problemId, tenantId]
    );
    return res.rows;
  });
}

/**
 * Resolves a problem and cascades resolution to all linked open incident tickets.
 */
export async function resolveProblemAndCascade(
  tenantId: string,
  problemId: string,
  input: ResolveProblemInput
): Promise<{
  problem: ProblemRecord;
  cascadedTicketsCount: number;
}> {
  const validated = ResolveProblemSchema.parse(input);
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    // 1. Update Problem Record
    const probRes = await client.query(
      `UPDATE problems
       SET status = 'Resolved',
           root_cause = $1,
           solution = $2,
           workaround = COALESCE($3, workaround),
           resolved_at = $4,
           updated_at = $4
       WHERE id = $5 AND tenant_id = $6
       RETURNING *;`,
      [
        validated.root_cause,
        validated.solution,
        validated.workaround || null,
        now.toISOString(),
        problemId,
        tenantId,
      ]
    );

    if (probRes.rows.length === 0) throw new Error('Problem not found');

    let cascadedTicketsCount = 0;

    // 2. Cascade to linked tickets
    if (validated.cascade_to_tickets) {
      const linksRes = await client.query(
        `SELECT ticket_id FROM problem_ticket_links WHERE problem_id = $1 AND tenant_id = $2`,
        [problemId, tenantId]
      );

      const resolutionNotes = `Resolved via Problem Investigation [${problemId}]: ${validated.solution}`;

      for (const link of linksRes.rows) {
        const updateTicketRes = await client.query(
          `UPDATE tickets
           SET status = 'Resolved',
               resolution_notes = $1,
               resolved_at = $2,
               updated_at = $2
           WHERE id = $3 AND tenant_id = $4 AND status NOT IN ('Resolved', 'Closed')
           RETURNING id;`,
          [resolutionNotes, now.toISOString(), link.ticket_id, tenantId]
        );
        if (updateTicketRes.rows.length > 0) cascadedTicketsCount++;
      }
    }

    return {
      problem: probRes.rows[0],
      cascadedTicketsCount,
    };
  });
}

/**
 * Full-Text search in Known Error Database (KEDB).
 */
export async function searchKnownErrorDatabase(
  tenantId: string,
  searchQuery?: string
): Promise<ProblemRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['p.tenant_id = $1', 'p.is_known_error = true'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (searchQuery) {
      conditions.push(
        `(p.title ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.root_cause ILIKE $${paramIndex} OR p.workaround ILIKE $${paramIndex})`
      );
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT p.*,
        (SELECT count(*) FROM problem_ticket_links ptl WHERE ptl.problem_id = p.id) as linked_tickets_count
       FROM problems p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.updated_at DESC`,
      params
    );

    return res.rows.map((row: any) => ({
      ...row,
      linked_tickets_count: parseInt(row.linked_tickets_count, 10) || 0,
    }));
  });
}
