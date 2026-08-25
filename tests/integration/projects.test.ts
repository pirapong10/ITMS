import { GET as listProjectsHandler, POST as createProjectHandler } from '../../app/api/v1/projects/route';
import { GET as getProjectHandler, PATCH as updateProjectHandler, DELETE as deleteProjectHandler } from '../../app/api/v1/projects/[id]/route';
import { POST as createProjectTaskHandler } from '../../app/api/v1/projects/[id]/tasks/route';
import { PATCH as updateProjectTaskHandler } from '../../app/api/v1/projects/[id]/tasks/[taskId]/route';
import { GET as listTasksHandler, POST as createTaskHandler } from '../../app/api/v1/tasks/route';
import { PATCH as updateTaskHandler, DELETE as deleteTaskHandler } from '../../app/api/v1/tasks/[id]/route';
import { query } from '../../src/lib/db';
import { signJwt } from '../../src/lib/auth';

describe('Project, Task & Kanban API Integration Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const subA = 'tenant-prj-a-' + Date.now();
    const resA = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Project Tenant A', subA]
    );
    tenantAId = resA.rows[0].id;

    const subB = 'tenant-prj-b-' + Date.now();
    const resB = await query(
      `INSERT INTO tenants (company_name, subdomain) VALUES ($1, $2) RETURNING id`,
      ['Project Tenant B', subB]
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
  });

  afterAll(async () => {
    await query('DELETE FROM tenants WHERE id IN ($1, $2)', [tenantAId, tenantBId]);
  });

  let createdProjectId: string;
  let taskId1: string;
  let taskId2: string;
  let kanbanTaskId: string;

  it('should create a project with automatic project code PRJ-YYYY-XXXX', async () => {
    const req = new Request('http://localhost/api/v1/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Enterprise Cloud Migration',
        category: 'Cloud',
        budget: 500000,
        status: 'In Progress',
        project_manager: 'Nattawut PM',
      }),
    });

    const res = await createProjectHandler(req);
    expect(res.status).toBe(201);

    const data: any = await res.json();
    expect(data.project).toBeDefined();
    expect(data.project.project_code).toMatch(/^PRJ-\d{4}-\d{4}$/);
    expect(data.project.progress_percent).toBe(0);

    createdProjectId = data.project.id;
  });

  it('should add project tasks and dynamically recalculate progress_percent', async () => {
    // 1. Create Task 1
    const task1Req = new Request(`http://localhost/api/v1/projects/${createdProjectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Design VPC Architecture',
        status: 'Todo',
        is_milestone: true,
      }),
    });

    const task1Res = await createProjectTaskHandler(task1Req, { params: Promise.resolve({ id: createdProjectId }) });
    expect(task1Res.status).toBe(201);
    const task1Data: any = await task1Res.json();
    taskId1 = task1Data.task.id;

    // 2. Create Task 2
    const task2Req = new Request(`http://localhost/api/v1/projects/${createdProjectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Deploy Kubernetes Cluster',
        status: 'Todo',
      }),
    });

    const task2Res = await createProjectTaskHandler(task2Req, { params: Promise.resolve({ id: createdProjectId }) });
    expect(task2Res.status).toBe(201);
    const task2Data: any = await task2Res.json();
    taskId2 = task2Data.task.id;

    // 3. Mark Task 1 as Completed -> Project progress should become 50%
    const update1Req = new Request(`http://localhost/api/v1/projects/${createdProjectId}/tasks/${taskId1}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'Completed',
      }),
    });

    const update1Res = await updateProjectTaskHandler(update1Req, {
      params: Promise.resolve({ id: createdProjectId, taskId: taskId1 }),
    });
    expect(update1Res.status).toBe(200);

    // Verify project progress is now 50%
    const getProjRes = await getProjectHandler(new Request(`http://localhost/api/v1/projects/${createdProjectId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }), { params: Promise.resolve({ id: createdProjectId }) });
    const getProjData: any = await getProjRes.json();
    expect(getProjData.project.progress_percent).toBe(50);
    expect(getProjData.tasks.length).toBe(2);

    // 4. Mark Task 2 as Completed -> Project progress should become 100%
    const update2Req = new Request(`http://localhost/api/v1/projects/${createdProjectId}/tasks/${taskId2}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'Completed',
      }),
    });

    await updateProjectTaskHandler(update2Req, {
      params: Promise.resolve({ id: createdProjectId, taskId: taskId2 }),
    });

    const getProjRes2 = await getProjectHandler(new Request(`http://localhost/api/v1/projects/${createdProjectId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    }), { params: Promise.resolve({ id: createdProjectId }) });
    const getProjData2: any = await getProjRes2.json();
    expect(getProjData2.project.progress_percent).toBe(100);
  });

  it('should manage Kanban Tasks with TSK-YYYY-XXXX and column movement', async () => {
    // 1. Create Kanban Task
    const req = new Request('http://localhost/api/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Upgrade Firewall Firmware',
        priority: 'High',
        status: 'Todo',
      }),
    });

    const res = await createTaskHandler(req);
    expect(res.status).toBe(201);
    const data: any = await res.json();
    expect(data.task.task_code).toMatch(/^TSK-\d{4}-\d{4}$/);
    kanbanTaskId = data.task.id;

    // 2. Move to In Progress
    const patchReq = new Request(`http://localhost/api/v1/tasks/${kanbanTaskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        status: 'In Progress',
        assigned_to: 'Somchai Admin',
      }),
    });

    const patchRes = await updateTaskHandler(patchReq, { params: Promise.resolve({ id: kanbanTaskId }) });
    expect(patchRes.status).toBe(200);
    const patchData: any = await patchRes.json();
    expect(patchData.task.status).toBe('In Progress');
    expect(patchData.task.assigned_to).toBe('Somchai Admin');

    // 3. Delete Task
    const delReq = new Request(`http://localhost/api/v1/tasks/${kanbanTaskId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const delRes = await deleteTaskHandler(delReq, { params: Promise.resolve({ id: kanbanTaskId }) });
    expect(delRes.status).toBe(200);
  });

  it('should enforce Tenant Isolation: Tenant B cannot access Tenant A projects', async () => {
    const req = new Request('http://localhost/api/v1/projects', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenB}`,
      },
    });

    const res = await listProjectsHandler(req);
    expect(res.status).toBe(200);
    const data: any = await res.json();
    expect(data.projects.length).toBe(0);
  });
});
