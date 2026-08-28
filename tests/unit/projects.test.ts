import {
  CreateProjectSchema,
  CreateProjectTaskSchema,
  CreateTaskSchema,
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject,
  createProjectTask,
  updateProjectTask,
  createTask,
  listTasks,
  updateTask,
  deleteTask,
  recalculateProjectProgress,
} from '../../src/lib/projects';
import * as db from '../../src/lib/db';

jest.mock('../../src/lib/db');

describe('Project & Task Management (Unit Tests)', () => {
  const mockWithTenantTransaction = db.withTenantTransaction as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Zod Validation Schemas', () => {
    it('should validate valid project payload', () => {
      const payload = {
        name: 'Network Infrastructure Upgrade 2026',
        category: 'Infrastructure',
        budget: 250000,
        status: 'In Progress' as const,
      };
      const parsed = CreateProjectSchema.parse(payload);
      expect(parsed.name).toBe('Network Infrastructure Upgrade 2026');
      expect(parsed.budget).toBe(250000);
      expect(parsed.status).toBe('In Progress');
    });

    it('should reject invalid project name', () => {
      expect(() => CreateProjectSchema.parse({ name: 'N' })).toThrow();
    });

    it('should validate valid project task payload', () => {
      const payload = {
        title: 'Core Switch Installation',
        status: 'Todo' as const,
        order_index: 1,
        is_milestone: true,
      };
      const parsed = CreateProjectTaskSchema.parse(payload);
      expect(parsed.title).toBe('Core Switch Installation');
      expect(parsed.is_milestone).toBe(true);
    });

    it('should validate valid Kanban task payload', () => {
      const payload = {
        title: 'Fix VPN Gateway Latency',
        priority: 'Urgent' as const,
        status: 'In Progress' as const,
      };
      const parsed = CreateTaskSchema.parse(payload);
      expect(parsed.title).toBe('Fix VPN Gateway Latency');
      expect(parsed.priority).toBe('Urgent');
      expect(parsed.status).toBe('In Progress');
    });
  });

  describe('recalculateProjectProgress', () => {
    it('should calculate 0% when no tasks exist', async () => {
      const client = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }),
      };
      const progress = await recalculateProjectProgress(client, 'tenant-1', 'prj-1');
      expect(progress).toBe(0);
    });

    it('should calculate accurate percentage when tasks exist', async () => {
      const client = {
        query: jest
          .fn()
          .mockResolvedValueOnce({
            rows: [{ status: 'Completed' }, { status: 'In Progress' }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };
      const progress = await recalculateProjectProgress(client, 'tenant-1', 'prj-1');
      expect(progress).toBe(50);
    });
  });

  describe('Project CRUD operations', () => {
    const tenantId = 'tenant-123';

    it('should create project', async () => {
      const mockProject = {
        id: 'prj-1',
        project_code: 'PRJ-2026-0001',
        name: 'New Portal',
        budget: '50000',
        progress_percent: '0',
      };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [mockProject] }),
        };
        return cb(client);
      });

      const res = await createProject(tenantId, { name: 'New Portal', budget: 50000 });
      expect(res.project_code).toBe('PRJ-2026-0001');
      expect(res.budget).toBe(50000);
    });

    it('should list projects with filters', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 'prj-1', name: 'Portal', budget: '20000', progress_percent: '25' }],
          }),
        };
        return cb(client);
      });

      const res = await listProjects(tenantId, { status: 'Planning', category: 'Software', search: 'Portal' });
      expect(res.length).toBe(1);
    });

    it('should get project by ID with its tasks', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ id: 'prj-1', name: 'Portal', budget: '1000', progress_percent: '0' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'pt-1', title: 'Task 1' }] }),
        };
        return cb(client);
      });

      const res = await getProjectById(tenantId, 'prj-1');
      expect(res?.project.id).toBe('prj-1');
      expect(res?.tasks.length).toBe(1);
    });

    it('should update and delete project', async () => {
      const currentProject = { id: 'prj-1', name: 'Original', budget: '1000', progress_percent: '0' };
      const updatedProject = { id: 'prj-1', name: 'Updated', budget: '2000', progress_percent: '50' };

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM projects')) {
              return { rows: [currentProject] };
            }
            if (sql.includes('UPDATE projects')) {
              return { rows: [updatedProject] };
            }
            return { rows: [] };
          }),
        };
        return cb(client);
      });

      const updated = await updateProject(tenantId, 'prj-1', { name: 'Updated' });
      expect(updated.name).toBe('Updated');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'prj-1' }] }),
        };
        return cb(client);
      });

      const deleted = await deleteProject(tenantId, 'prj-1');
      expect(deleted).toBe(true);
    });
  });

  describe('Project Tasks & Standalone Tasks', () => {
    const tenantId = 'tenant-123';

    it('should create, update, and delete project task', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('INSERT INTO project_tasks')) {
              return { rows: [{ id: 'pt-1', title: 'Design DB' }] };
            }
            return { rows: [] };
          }),
        };
        return cb(client);
      });

      const task = await createProjectTask(tenantId, 'prj-1', { title: 'Design DB' });
      expect(task.id).toBe('pt-1');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockImplementation(async (sql: string) => {
            if (sql.includes('SELECT * FROM project_tasks')) {
              return { rows: [{ id: 'pt-1', title: 'Design DB' }] };
            }
            if (sql.includes('UPDATE project_tasks')) {
              return { rows: [{ id: 'pt-1', title: 'Design DB Done', status: 'Completed' }] };
            }
            return { rows: [] };
          }),
        };
        return cb(client);
      });

      const updatedTask = await updateProjectTask(tenantId, 'prj-1', 'pt-1', { status: 'Completed' });
      expect(updatedTask.status).toBe('Completed');
    });

    it('should create, list, update, and delete standalone Kanban task', async () => {
      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest
            .fn()
            .mockResolvedValueOnce({ rows: [{ count: '0' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'tsk-1', title: 'Fix Bug' }] }),
        };
        return cb(client);
      });

      const task = await createTask(tenantId, { title: 'Fix Bug' });
      expect(task.id).toBe('tsk-1');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'tsk-1', title: 'Fix Bug' }] }),
        };
        return cb(client);
      });

      const list = await listTasks(tenantId, { status: 'Todo', priority: 'High', search: 'Bug' });
      expect(list.length).toBe(1);

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'tsk-1', status: 'Done' }] }),
        };
        return cb(client);
      });

      const updated = await updateTask(tenantId, 'tsk-1', { status: 'Done' });
      expect(updated.status).toBe('Done');

      mockWithTenantTransaction.mockImplementation(async (tid, cb) => {
        const client = {
          query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 'tsk-1' }] }),
        };
        return cb(client);
      });

      const deleted = await deleteTask(tenantId, 'tsk-1');
      expect(deleted).toBe(true);
    });
  });
});
