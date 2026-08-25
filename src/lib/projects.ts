import { randomUUID } from 'crypto';
import { z } from 'zod';
import { withTenantTransaction } from './db';

// Zod Validation Schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must have at least 2 characters').max(255),
  description: z.string().optional().default(''),
  category: z.string().optional().default('Infrastructure'),
  status: z
    .enum(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'])
    .default('Planning'),
  start_date: z.string().optional().nullable(),
  target_end_date: z.string().optional().nullable(),
  budget: z.number().min(0).default(0),
  project_manager: z.string().optional().nullable(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z
    .enum(['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'])
    .optional(),
  start_date: z.string().optional().nullable(),
  target_end_date: z.string().optional().nullable(),
  actual_end_date: z.string().optional().nullable(),
  budget: z.number().min(0).optional(),
  project_manager: z.string().optional().nullable(),
});

export const CreateProjectTaskSchema = z.object({
  title: z.string().min(2, 'Task title must have at least 2 characters').max(255),
  description: z.string().optional().default(''),
  status: z.enum(['Todo', 'In Progress', 'Completed', 'Blocked']).default('Todo'),
  assigned_to: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
  is_milestone: z.boolean().default(false),
});

export const UpdateProjectTaskSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['Todo', 'In Progress', 'Completed', 'Blocked']).optional(),
  assigned_to: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  order_index: z.number().int().min(0).optional(),
  is_milestone: z.boolean().optional(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(2, 'Task title must have at least 2 characters').max(255),
  description: z.string().optional().default(''),
  status: z
    .enum(['Backlog', 'Todo', 'In Progress', 'Review', 'Done'])
    .default('Todo'),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']).default('Medium'),
  assigned_to: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum(['Backlog', 'Todo', 'In Progress', 'Review', 'Done'])
    .optional(),
  priority: z.enum(['Urgent', 'High', 'Medium', 'Low']).optional(),
  assigned_to: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  order_index: z.number().int().min(0).optional(),
});

export type CreateProjectInput = z.input<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.input<typeof UpdateProjectSchema>;
export type CreateProjectTaskInput = z.input<typeof CreateProjectTaskSchema>;
export type UpdateProjectTaskInput = z.input<typeof UpdateProjectTaskSchema>;
export type CreateTaskInput = z.input<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.input<typeof UpdateTaskSchema>;

export interface ProjectRecord {
  id: string;
  tenant_id: string;
  project_code: string;
  name: string;
  description: string;
  category: string;
  status: string;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  budget: number;
  project_manager: string | null;
  progress_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTaskRecord {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string | null;
  order_index: number;
  is_milestone: boolean;
  created_at: string;
  updated_at: string;
}

export interface KanbanTaskRecord {
  id: string;
  tenant_id: string;
  task_code: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export async function generateProjectCode(client: any, tenantId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `PRJ-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM projects WHERE tenant_id = $1 AND project_code LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export async function generateTaskCode(client: any, tenantId: string, year?: number): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = `TSK-${currentYear}-`;
  const countRes = await client.query(
    `SELECT count(*) as count FROM tasks WHERE tenant_id = $1 AND task_code LIKE $2`,
    [tenantId, `${prefix}%`]
  );
  const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Recalculates and updates progress_percent for a project based on its tasks.
 */
export async function recalculateProjectProgress(client: any, tenantId: string, projectId: string): Promise<number> {
  const tasksRes = await client.query(
    `SELECT status FROM project_tasks WHERE project_id = $1 AND tenant_id = $2`,
    [projectId, tenantId]
  );
  const total = tasksRes.rows.length;
  if (total === 0) {
    await client.query(
      `UPDATE projects SET progress_percent = 0, updated_at = current_timestamp WHERE id = $1 AND tenant_id = $2`,
      [projectId, tenantId]
    );
    return 0;
  }
  const completed = tasksRes.rows.filter((r: any) => r.status === 'Completed').length;
  const progress = Math.round((completed / total) * 100);

  await client.query(
    `UPDATE projects SET progress_percent = $1, updated_at = current_timestamp WHERE id = $2 AND tenant_id = $3`,
    [progress, projectId, tenantId]
  );
  return progress;
}

// Project Operations
export async function createProject(tenantId: string, input: CreateProjectInput): Promise<ProjectRecord> {
  const validated = CreateProjectSchema.parse(input);
  const id = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const code = await generateProjectCode(client, tenantId, now.getFullYear());
    const res = await client.query(
      `INSERT INTO projects (
        id, tenant_id, project_code, name, description, category,
        status, start_date, target_end_date, budget, project_manager,
        progress_percent, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12, $13)
      RETURNING *;`,
      [
        id,
        tenantId,
        code,
        validated.name,
        validated.description,
        validated.category,
        validated.status,
        validated.start_date ? new Date(validated.start_date).toISOString() : null,
        validated.target_end_date ? new Date(validated.target_end_date).toISOString() : null,
        validated.budget,
        validated.project_manager || null,
        now.toISOString(),
        now.toISOString(),
      ]
    );
    return {
      ...res.rows[0],
      budget: Number(res.rows[0].budget),
      progress_percent: Number(res.rows[0].progress_percent),
    };
  });
}

export async function listProjects(tenantId: string, filters: { status?: string; category?: string; search?: string } = {}): Promise<ProjectRecord[]> {
  return withTenantTransaction(tenantId, async (client) => {
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }
    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIndex} OR project_code ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT * FROM projects WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    return res.rows.map((r: any) => ({
      ...r,
      budget: Number(r.budget),
      progress_percent: Number(r.progress_percent),
    }));
  });
}

export async function getProjectById(tenantId: string, projectId: string): Promise<{ project: ProjectRecord; tasks: ProjectTaskRecord[] } | null> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `SELECT * FROM projects WHERE id = $1 AND tenant_id = $2`,
      [projectId, tenantId]
    );
    if (res.rows.length === 0) return null;

    const tasksRes = await client.query(
      `SELECT * FROM project_tasks WHERE project_id = $1 AND tenant_id = $2 ORDER BY order_index ASC, created_at ASC`,
      [projectId, tenantId]
    );

    return {
      project: {
        ...res.rows[0],
        budget: Number(res.rows[0].budget),
        progress_percent: Number(res.rows[0].progress_percent),
      },
      tasks: tasksRes.rows,
    };
  });
}

export async function updateProject(tenantId: string, projectId: string, input: UpdateProjectInput): Promise<ProjectRecord> {
  const validated = UpdateProjectSchema.parse(input);
  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM projects WHERE id = $1 AND tenant_id = $2`,
      [projectId, tenantId]
    );
    if (currentRes.rows.length === 0) throw new Error('Project not found');

    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [new Date().toISOString()];
    let paramIndex = 2;

    if (validated.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(validated.name);
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
    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;
    }
    if (validated.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex}`);
      values.push(validated.start_date ? new Date(validated.start_date).toISOString() : null);
      paramIndex++;
    }
    if (validated.target_end_date !== undefined) {
      updates.push(`target_end_date = $${paramIndex}`);
      values.push(validated.target_end_date ? new Date(validated.target_end_date).toISOString() : null);
      paramIndex++;
    }
    if (validated.actual_end_date !== undefined) {
      updates.push(`actual_end_date = $${paramIndex}`);
      values.push(validated.actual_end_date ? new Date(validated.actual_end_date).toISOString() : null);
      paramIndex++;
    }
    if (validated.budget !== undefined) {
      updates.push(`budget = $${paramIndex}`);
      values.push(validated.budget);
      paramIndex++;
    }
    if (validated.project_manager !== undefined) {
      updates.push(`project_manager = $${paramIndex}`);
      values.push(validated.project_manager);
      paramIndex++;
    }

    values.push(projectId);
    values.push(tenantId);

    const res = await client.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *;`,
      values
    );
    return {
      ...res.rows[0],
      budget: Number(res.rows[0].budget),
      progress_percent: Number(res.rows[0].progress_percent),
    };
  });
}

export async function deleteProject(tenantId: string, projectId: string): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM projects WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [projectId, tenantId]
    );
    return res.rows.length > 0;
  });
}

// Project Task Operations
export async function createProjectTask(tenantId: string, projectId: string, input: CreateProjectTaskInput): Promise<ProjectTaskRecord> {
  const validated = CreateProjectTaskSchema.parse(input);
  const id = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `INSERT INTO project_tasks (
        id, tenant_id, project_id, title, description, status,
        assigned_to, start_date, due_date, order_index, is_milestone,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;`,
      [
        id,
        tenantId,
        projectId,
        validated.title,
        validated.description,
        validated.status,
        validated.assigned_to || null,
        validated.start_date ? new Date(validated.start_date).toISOString() : null,
        validated.due_date ? new Date(validated.due_date).toISOString() : null,
        validated.order_index,
        validated.is_milestone,
        now.toISOString(),
        now.toISOString(),
      ]
    );
    await recalculateProjectProgress(client, tenantId, projectId);
    return res.rows[0];
  });
}

export async function updateProjectTask(tenantId: string, projectId: string, taskId: string, input: UpdateProjectTaskInput): Promise<ProjectTaskRecord> {
  const validated = UpdateProjectTaskSchema.parse(input);
  return withTenantTransaction(tenantId, async (client) => {
    const currentRes = await client.query(
      `SELECT * FROM project_tasks WHERE id = $1 AND project_id = $2 AND tenant_id = $3`,
      [taskId, projectId, tenantId]
    );
    if (currentRes.rows.length === 0) throw new Error('Task not found');

    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [new Date().toISOString()];
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
    if (validated.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex}`);
      values.push(validated.start_date ? new Date(validated.start_date).toISOString() : null);
      paramIndex++;
    }
    if (validated.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(validated.due_date ? new Date(validated.due_date).toISOString() : null);
      paramIndex++;
    }
    if (validated.order_index !== undefined) {
      updates.push(`order_index = $${paramIndex}`);
      values.push(validated.order_index);
      paramIndex++;
    }
    if (validated.is_milestone !== undefined) {
      updates.push(`is_milestone = $${paramIndex}`);
      values.push(validated.is_milestone);
      paramIndex++;
    }

    values.push(taskId);
    values.push(projectId);
    values.push(tenantId);

    const res = await client.query(
      `UPDATE project_tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2} RETURNING *;`,
      values
    );
    await recalculateProjectProgress(client, tenantId, projectId);
    return res.rows[0];
  });
}

// Kanban Task Operations
export async function createTask(tenantId: string, input: CreateTaskInput): Promise<KanbanTaskRecord> {
  const validated = CreateTaskSchema.parse(input);
  const id = randomUUID();
  const now = new Date();

  return withTenantTransaction(tenantId, async (client) => {
    const code = await generateTaskCode(client, tenantId, now.getFullYear());
    const res = await client.query(
      `INSERT INTO tasks (
        id, tenant_id, task_code, title, description, status,
        priority, assigned_to, due_date, order_index,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;`,
      [
        id,
        tenantId,
        code,
        validated.title,
        validated.description,
        validated.status,
        validated.priority,
        validated.assigned_to || null,
        validated.due_date ? new Date(validated.due_date).toISOString() : null,
        validated.order_index,
        now.toISOString(),
        now.toISOString(),
      ]
    );
    return res.rows[0];
  });
}

export async function listTasks(tenantId: string, filters: { status?: string; priority?: string; search?: string } = {}): Promise<KanbanTaskRecord[]> {
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
    if (filters.search) {
      conditions.push(`(title ILIKE $${paramIndex} OR task_code ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const res = await client.query(
      `SELECT * FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY order_index ASC, created_at DESC`,
      params
    );
    return res.rows;
  });
}

export async function updateTask(tenantId: string, taskId: string, input: UpdateTaskInput): Promise<KanbanTaskRecord> {
  const validated = UpdateTaskSchema.parse(input);
  return withTenantTransaction(tenantId, async (client) => {
    const updates: string[] = ['updated_at = $1'];
    const values: any[] = [new Date().toISOString()];
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
    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;
    }
    if (validated.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(validated.priority);
      paramIndex++;
    }
    if (validated.assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramIndex}`);
      values.push(validated.assigned_to);
      paramIndex++;
    }
    if (validated.due_date !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(validated.due_date ? new Date(validated.due_date).toISOString() : null);
      paramIndex++;
    }
    if (validated.order_index !== undefined) {
      updates.push(`order_index = $${paramIndex}`);
      values.push(validated.order_index);
      paramIndex++;
    }

    values.push(taskId);
    values.push(tenantId);

    const res = await client.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} RETURNING *;`,
      values
    );
    if (res.rows.length === 0) throw new Error('Task not found');
    return res.rows[0];
  });
}

export async function deleteTask(tenantId: string, taskId: string): Promise<boolean> {
  return withTenantTransaction(tenantId, async (client) => {
    const res = await client.query(
      `DELETE FROM tasks WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [taskId, tenantId]
    );
    return res.rows.length > 0;
  });
}
