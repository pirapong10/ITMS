'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../src/components/layout/AppShell';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { Modal } from '../../src/components/ui/Modal';
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  User,
  RefreshCw,
  MoreVertical,
  Calendar,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // New Project Modal
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projCategory, setProjCategory] = useState('Infrastructure');
  const [projBudget, setProjBudget] = useState('100000');
  const [projLoading, setProjLoading] = useState(false);

  // New Task Modal
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState('Todo');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);

  const fetchProjectsAndTasks = async () => {
    setLoading(true);
    const [pRes, tRes] = await Promise.all([
      apiFetch('/api/v1/projects'),
      apiFetch('/api/v1/tasks'),
    ]);

    if (pRes.data?.projects) {
      setProjects(pRes.data.projects);
      if (!selectedProject && pRes.data.projects.length > 0) {
        setSelectedProject(pRes.data.projects[0]);
      }
    }
    if (tRes.data) {
      setTasks(tRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjectsAndTasks();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjLoading(true);

    const res = await apiFetch('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: projName,
        description: projDesc || undefined,
        category: projCategory,
        budget: Number(projBudget),
      }),
    });

    setProjLoading(false);

    if (res.data) {
      setNewProjectOpen(false);
      setProjName('');
      setProjDesc('');
      fetchProjectsAndTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskLoading(true);

    const res = await apiFetch('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: taskTitle,
        description: taskDesc || undefined,
        status: taskStatus,
        assigned_to: taskAssignee || undefined,
        project_id: selectedProject?.id || undefined,
      }),
    });

    setTaskLoading(false);

    if (res.data) {
      setNewTaskOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      fetchProjectsAndTasks();
    }
  };

  const handleMoveTaskStatus = async (taskId: string, newStatus: string) => {
    const res = await apiFetch(`/api/v1/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.data) {
      fetchProjectsAndTasks();
    }
  };

  const kanbanColumns = [
    { id: 'Todo', title: 'To Do (รอดำเนินการ)', color: 'border-slate-300' },
    { id: 'In Progress', title: 'In Progress (กำลังทำ)', color: 'border-blue-400' },
    { id: 'Review', title: 'In Review (ตรวจสอบ)', color: 'border-amber-400' },
    { id: 'Completed', title: 'Completed (เสร็จสิ้น)', color: 'border-emerald-400' },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">Project Management & Kanban Tasks</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามความคืบหน้าโครงการไอที กระดาน Kanban และคำนวณ Progress แบบไดนามิก
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchProjectsAndTasks} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNewProjectOpen(true)}>
              <FolderKanban className="w-3.5 h-3.5" />
              <span>สร้าง Project</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewTaskOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>สร้าง Task ใหม่</span>
            </Button>
          </div>
        </div>

        {/* Project Portfolio Slider / Grid */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active Projects ({projects.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.length > 0 ? (
              projects.map((p) => {
                const isSelected = selectedProject?.id === p.id;
                return (
                  <Card
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-primary border-primary bg-blue-50/20' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="blue" size="sm">
                        {p.category}
                      </Badge>
                      <span className="text-[11px] font-bold text-emerald-600 font-mono">
                        ฿{Number(p.budget).toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-dark mt-2 truncate">{p.name}</h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {p.description || 'ไม่มีรายละเอียดโครงการ'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                        <span>ความคืบหน้า</span>
                        <span className="text-primary font-bold">{p.progress_percent || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${p.progress_percent || 0}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <Card className="md:col-span-3 py-6 text-center text-xs text-slate-400">
                ยังไม่มีโปรเจกต์ในระบบ คลิกสร้าง Project ใหม่
              </Card>
            )}
          </div>
        </div>

        {/* Kanban Board Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              <span>
                Kanban Task Board {selectedProject ? `— ${selectedProject.name}` : ''}
              </span>
            </h3>
            <span className="text-xs text-slate-400">คลิกที่ปุ่มลูกศรเพื่อเลื่อนสถานะงาน</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {kanbanColumns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);

              return (
                <div key={col.id} className="bg-slate-100/70 p-3 rounded-xl border border-border space-y-3">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <span className="text-xs font-bold text-slate-700">{col.title}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white border text-slate-600">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {colTasks.length > 0 ? (
                      colTasks.map((t) => (
                        <Card key={t.id} hover className="p-3 space-y-2 bg-white">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold text-dark leading-snug">{t.title}</span>
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2">{t.description}</p>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1 font-semibold text-slate-600">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{t.assigned_to || 'Unassigned'}</span>
                            </div>

                            {/* Status Shift Buttons */}
                            <div className="flex items-center gap-1">
                              {col.id !== 'Todo' && (
                                <button
                                  onClick={() =>
                                    handleMoveTaskStatus(
                                      t.id,
                                      col.id === 'Completed'
                                        ? 'Review'
                                        : col.id === 'Review'
                                        ? 'In Progress'
                                        : 'Todo'
                                    )
                                  }
                                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
                                  title="ย้ายไปสถานะก่อนหน้า"
                                >
                                  ←
                                </button>
                              )}
                              {col.id !== 'Completed' && (
                                <button
                                  onClick={() =>
                                    handleMoveTaskStatus(
                                      t.id,
                                      col.id === 'Todo'
                                        ? 'In Progress'
                                        : col.id === 'In Progress'
                                        ? 'Review'
                                        : 'Completed'
                                    )
                                  }
                                  className="px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary hover:text-white text-primary font-bold transition-all"
                                  title="ย้ายไปสถานะถัดไป"
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <div className="py-8 text-center text-[11px] text-slate-400">ไม่มีงานในสถานะนี้</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Project Modal */}
        <Modal
          isOpen={newProjectOpen}
          onClose={() => setNewProjectOpen(false)}
          title="สร้างโครงการใหม่ (Create IT Project)"
          description="กำหนดกรอบเวลา งบประมาณ และเป้าหมายโครงการ"
        >
          <form onSubmit={handleCreateProject} className="space-y-4">
            <Input
              label="ชื่อโครงการ (Project Name)"
              value={projName}
              onChange={(e) => setProjName(e.target.value)}
              placeholder="เช่น Core Network Upgrade, CRM Migration"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="หมวดหมู่โครงการ"
                value={projCategory}
                onChange={(e) => setProjCategory(e.target.value)}
                options={[
                  { value: 'Infrastructure', label: 'Infrastructure' },
                  { value: 'Software Development', label: 'Software Development' },
                  { value: 'Security', label: 'Security & Compliance' },
                  { value: 'Operations', label: 'Operations' },
                ]}
              />

              <Input
                label="งบประมาณ (Budget บาท)"
                type="number"
                value={projBudget}
                onChange={(e) => setProjBudget(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">รายละเอียดโครงการ</label>
              <textarea
                rows={3}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ขอบเขตงาน วัตถุประสงค์..."
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewProjectOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={projLoading}>
                สร้างโครงการ
              </Button>
            </div>
          </form>
        </Modal>

        {/* Create Task Modal */}
        <Modal
          isOpen={newTaskOpen}
          onClose={() => setNewTaskOpen(false)}
          title="สร้าง Task งานใหม่"
          description="กำหนดชื่องาน ผู้รับผิดชอบ และเพิ่มลงในกระดาน Kanban"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <Input
              label="ชื่องาน (Task Title)"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="เช่น ติดตั้ง Switch ตัวใหม่, ออกแบบ DB schema"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="สถานะเริ่มต้น"
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value)}
                options={[
                  { value: 'Todo', label: 'To Do (รอดำเนินการ)' },
                  { value: 'In Progress', label: 'In Progress (กำลังทำ)' },
                  { value: 'Review', label: 'In Review (ตรวจสอบ)' },
                  { value: 'Completed', label: 'Completed (เสร็จสิ้น)' },
                ]}
              />

              <Input
                label="ผู้รับผิดชอบ (Assigned To)"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                placeholder="ชื่อช่างเทคนิค"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">รายละเอียดงาน</label>
              <textarea
                rows={3}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ขั้นตอนการทำ..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewTaskOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={taskLoading}>
                สร้าง Task
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
