import { NextResponse } from 'next/server';
import { extractAuthContext } from '@/src/lib/api-auth';
import {
  updateProjectTask,
  UpdateProjectTaskSchema,
} from '@/src/lib/projects';

interface RouteContext {
  params: Promise<{ id: string; taskId: string }>;
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const auth = extractAuthContext(req);
    if (!auth || !auth.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Tenant authentication required' },
        { status: 401 }
      );
    }

    const { id, taskId } = await context.params;
    const body = await req.json();
    const parsed = UpdateProjectTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const task = await updateProjectTask(auth.tenantId, id, taskId, parsed.data);
    return NextResponse.json(
      {
        message: 'Project task updated successfully',
        task,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update Project Task Error:', error);
    if (error.message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
