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
  AlertCircle,
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Link as LinkIcon,
  RefreshCw,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';
import { useToast } from '../../src/components/ui/ToastContext';

export default function ProblemsPage() {
  const { toast } = useToast();
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isKedbOnly, setIsKedbOnly] = useState(false);

  // Selected Problem Detail
  const [selectedProblem, setSelectedProblem] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Problem Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Network');
  const [priority, setPriority] = useState('High');
  const [impact, setImpact] = useState('High');
  const [isKnownError, setIsKnownError] = useState(false);
  const [workaround, setWorkaround] = useState('');

  // Resolve & Cascade Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [rootCause, setRootCause] = useState('');
  const [solution, setSolution] = useState('');
  const [cascadeToTickets, setCascadeToTickets] = useState(true);
  const [resolveLoading, setResolveLoading] = useState(false);

  const fetchProblems = async () => {
    setLoading(true);
    let url = isKedbOnly
      ? `/api/v1/kedb?q=${encodeURIComponent(search)}`
      : `/api/v1/problems?search=${encodeURIComponent(search)}`;

    const res = await apiFetch(url);
    if (res.data) setProblems(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProblems();
  }, [isKedbOnly]);

  const handleSelectProblem = async (probId: string) => {
    setDetailLoading(true);
    const [detailRes, ticketsRes] = await Promise.all([
      apiFetch(`/api/v1/problems/${probId}`),
      apiFetch(`/api/v1/problems/${probId}/tickets`),
    ]);

    if (detailRes.data) {
      setSelectedProblem({
        ...detailRes.data,
        linkedTickets: ticketsRes.data || [],
      });
    }
    setDetailLoading(false);
  };

  const handleCreateProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const res = await apiFetch('/api/v1/problems', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        category,
        priority,
        impact,
        is_known_error: isKnownError,
        workaround: workaround || undefined,
      }),
    });

    setCreateLoading(false);

    if (res.data) {
      setNewModalOpen(false);
      setTitle('');
      setDescription('');
      fetchProblems();
    }
  };

  const handleResolveAndCascade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem) return;
    setResolveLoading(true);

    const probId = selectedProblem.id;
    const res = await apiFetch(`/api/v1/problems/${probId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        root_cause: rootCause,
        solution,
        cascade_to_tickets: cascadeToTickets,
      }),
    });

    setResolveLoading(false);

    if (res.data) {
      toast.success(
        `บันทึกการแก้ไขสำเร็จ! ปิดเคส Incident ที่เกี่ยวข้องโดยอัตโนมัติ ${res.data.cascadedTicketsCount} รายการ`,
        'Problem Management'
      );
      setResolveModalOpen(false);
      handleSelectProblem(probId);
      fetchProblems();
    } else if (res.error) {
      toast.error(res.error, 'เกิดข้อผิดพลาด');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">
              Problem Management & Known Error DB (KEDB)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              การวิเคราะห์หาสาเหตุที่แท้จริง (RCA), ฐานข้อมูลข้อผิดพลาดที่ทราบ (KEDB), และการปิดเคสแบบ Cascade
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchProblems} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>เปิด Problem Case</span>
            </Button>
          </div>
        </div>

        {/* Filter & KEDB Toggle Bar */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ค้นหา Problem ID, อาการ, สาเหตุ (Root Cause) หรือ วิธีแก้ขัด (Workaround)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProblems()}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsKedbOnly(!isKedbOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  isKedbOnly
                    ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs'
                    : 'bg-white text-slate-600 border-border hover:bg-slate-50'
                }`}
              >
                🔥 เฉพาะ Known Error Database (KEDB)
              </button>
              <Button variant="primary" size="sm" onClick={fetchProblems}>
                ค้นหา
              </Button>
            </div>
          </div>
        </Card>

        {/* Problems Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Problem ID</th>
                  <th className="py-2.5 px-4">หัวข้อปัญหา (Title)</th>
                  <th className="py-2.5 px-4">หมวดหมู่</th>
                  <th className="py-2.5 px-4">ความสำคัญ</th>
                  <th className="py-2.5 px-4">KEDB</th>
                  <th className="py-2.5 px-4">สถานะ</th>
                  <th className="py-2.5 px-4">Tickets ที่เชื่อมโยง</th>
                  <th className="py-2.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {problems.length > 0 ? (
                  problems.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => handleSelectProblem(p.id)}
                      className="hover:bg-rose-50/30 cursor-pointer transition-all"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-rose-700">{p.id}</td>
                      <td className="py-3 px-4 font-semibold text-dark max-w-xs truncate">{p.title}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4">
                        <Badge variant={p.priority === 'High' ? 'red' : 'amber'}>{p.priority}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {p.is_known_error ? (
                          <Badge variant="red" size="sm">
                            Known Error
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={p.status === 'Resolved' ? 'green' : 'slate'}>{p.status}</Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-primary">
                        {p.linked_tickets_count || 0} Tickets
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProblem(p.id);
                          }}
                        >
                          ดู RCA & Workaround
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบบันทึก Problem Investigation
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Selected Problem Detail Modal */}
        {selectedProblem && (
          <Modal
            isOpen={!!selectedProblem}
            onClose={() => setSelectedProblem(null)}
            title={`Problem Investigation: ${selectedProblem.id}`}
            description={selectedProblem.title}
            maxWidth="2xl"
          >
            <div className="space-y-5">
              {/* Meta Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-border text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">สถานะ:</span>
                  <Badge variant={selectedProblem.status === 'Resolved' ? 'green' : 'red'}>
                    {selectedProblem.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">หมวดหมู่:</span>
                  <span className="font-bold text-dark">{selectedProblem.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">KEDB Status:</span>
                  <span className="font-semibold text-dark">
                    {selectedProblem.is_known_error ? 'บันทึกใน KEDB แล้ว' : 'ยังไม่ได้บันทึก'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Tickets ที่ผูกไว้:</span>
                  <span className="font-bold text-primary">{selectedProblem.linkedTickets?.length || 0} เคส</span>
                </div>
              </div>

              {/* Workaround & Root Cause Panels */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>วิธีแก้ไขขัดตาทัพชั่วคราว (Workaround)</span>
                  </h4>
                  <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs text-amber-900 whitespace-pre-wrap">
                    {selectedProblem.workaround || 'ยังไม่มีวิธีแก้ไขชั่วคราว'}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>สาเหตุที่แท้จริง (Root Cause Analysis - RCA)</span>
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-lg border border-border text-xs text-slate-700 whitespace-pre-wrap">
                    {selectedProblem.root_cause || 'กำลังอยู่ในขั้นตอนสืบค้นและวินิจฉัยสาเหตุ'}
                  </div>
                </div>

                {selectedProblem.solution && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>แนวทางแก้ไขถาวร (Permanent Solution)</span>
                    </h4>
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 text-xs text-emerald-900 whitespace-pre-wrap">
                      {selectedProblem.solution}
                    </div>
                  </div>
                )}
              </div>

              {/* Linked Incident Tickets */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-primary" />
                  <span>Incident Tickets ที่เชื่อมโยง ({selectedProblem.linkedTickets?.length || 0})</span>
                </h4>

                <div className="border border-border rounded-lg overflow-hidden max-h-36 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                      <tr>
                        <th className="py-2 px-3">Ticket ID</th>
                        <th className="py-2 px-3">หัวข้อ Incident</th>
                        <th className="py-2 px-3">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedProblem.linkedTickets && selectedProblem.linkedTickets.length > 0 ? (
                        selectedProblem.linkedTickets.map((t: any) => (
                          <tr key={t.id}>
                            <td className="py-2 px-3 font-mono font-bold text-primary">{t.id}</td>
                            <td className="py-2 px-3 font-medium text-dark truncate max-w-xs">{t.title}</td>
                            <td className="py-2 px-3">
                              <Badge variant={t.status === 'Resolved' ? 'green' : 'slate'} size="sm">
                                {t.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-400">
                            ไม่มี Ticket ที่ผูกไว้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resolve Problem Toolbar */}
              {selectedProblem.status !== 'Resolved' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="primary" onClick={() => setResolveModalOpen(true)}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>สรุปผล RCA และ Cascade ปิด Incident ทั้งหมด</span>
                  </Button>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Modal: Resolve Problem & Cascade */}
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title="สรุปผลการแก้ไขปัญหา และ Cascade Resolution"
          description="บันทึก Root Cause และ Permanent Solution พร้อมปิดเคส Incident ที่เกี่ยวข้องทั้งหมดอัตโนมัติ"
        >
          <form onSubmit={handleResolveAndCascade} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                สาเหตุที่แท้จริง (Root Cause)
              </label>
              <textarea
                rows={3}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ระบุสาเหตุที่ทำให้เกิดปัญหานี้..."
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                แนวทางแก้ไขถาวร (Permanent Solution)
              </label>
              <textarea
                rows={3}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ระบุวิธีการแก้ไขหรือ Patch ที่นำมาใช้..."
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="cascade"
                checked={cascadeToTickets}
                onChange={(e) => setCascadeToTickets(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor="cascade" className="text-xs text-slate-700 font-semibold cursor-pointer">
                Cascade อัปเดตและเปลี่ยนสถานะ Ticket ที่ผูกไว้ทั้งหมดเป็น Resolved อัตโนมัติ
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setResolveModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={resolveLoading}>
                ยืนยันการ Resolve & Cascade
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Create Problem */}
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="เปิด Problem Case ใหม่"
          description="บันทึกการสืบค้นปัญหาเพื่อหาต้นตอและหาวิธี Workaround"
        >
          <form onSubmit={handleCreateProblem} className="space-y-4">
            <Input
              label="หัวข้อปัญหา (Problem Title)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น Core Switch Packet Loss, Database Lock Escalation"
              required
            />

            <div className="grid grid-cols-3 gap-3">
              <Select
                label="หมวดหมู่"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Network', label: 'Network' },
                  { value: 'Database', label: 'Database' },
                  { value: 'Application', label: 'Application' },
                  { value: 'Infrastructure', label: 'Infrastructure' },
                ]}
              />

              <Select
                label="ความสำคัญ"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Critical', label: 'Critical' },
                ]}
              />

              <Select
                label="ผลกระทบ"
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                options={[
                  { value: 'Minor', label: 'Minor' },
                  { value: 'Moderate', label: 'Moderate' },
                  { value: 'High', label: 'High' },
                  { value: 'Critical', label: 'Critical' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">รายละเอียดอาการที่พบ</label>
              <textarea
                rows={3}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ระบุอาการ ผลกระทบต่อผู้ใช้งาน..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                วิธีแก้ไขขัดตาทัพชั่วคราว (Workaround ถ้ามี)
              </label>
              <textarea
                rows={2}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="เช่น สลับ Traffic ไปยัง Secondary Route..."
                value={workaround}
                onChange={(e) => setWorkaround(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="kedb"
                checked={isKnownError}
                onChange={(e) => setIsKnownError(e.target.checked)}
                className="rounded border-slate-300 text-primary"
              />
              <label htmlFor="kedb" className="text-xs text-slate-700 font-semibold cursor-pointer">
                บันทึกเป็น Known Error ในฐานข้อมูล KEDB
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={createLoading}>
                บันทึก Problem Case
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
