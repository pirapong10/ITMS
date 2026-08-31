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
  Ticket,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Star,
  BookOpen,
  MessageSquare,
  RefreshCw,
  Send,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected Ticket Drawer / Modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Ticket Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Hardware');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newReporter, setNewReporter] = useState('');

  // Resolution & Canned Response
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingLoading, setResolvingLoading] = useState(false);

  // CSAT Rating Modal
  const [csatModalOpen, setCsatModalOpen] = useState(false);
  const [csatRating, setCsatRating] = useState(5);
  const [csatFeedback, setCsatFeedback] = useState('');
  const [csatLoading, setCsatLoading] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    let url = '/api/v1/tickets?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
    if (priorityFilter) url += `priority=${encodeURIComponent(priorityFilter)}&`;
    if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;

    const res = await apiFetch(url);
    if (res.data?.tickets) {
      setTickets(res.data.tickets);
    }
    setLoading(false);
  };

  const fetchCannedResponses = async () => {
    const res = await apiFetch('/api/v1/canned-responses');
    if (res.data) setCannedResponses(res.data);
  };

  useEffect(() => {
    fetchTickets();
    fetchCannedResponses();
  }, [statusFilter, priorityFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const res = await apiFetch('/api/v1/tickets', {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        reporter_name: newReporter || 'General User',
      }),
    });

    setCreateLoading(false);

    if (res.data) {
      setNewModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchTickets();
    }
  };

  const handleSelectTicket = async (ticketId: string) => {
    setDetailLoading(true);
    const res = await apiFetch(`/api/v1/tickets/${ticketId}`);
    if (res.data) {
      setSelectedTicket(res.data);
    }
    setDetailLoading(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    const res = await apiFetch(`/api/v1/tickets/${selectedTicket.ticket?.id || selectedTicket.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.data) {
      handleSelectTicket(selectedTicket.ticket?.id || selectedTicket.id);
      fetchTickets();
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolutionNotes) return;
    setResolvingLoading(true);

    const ticketId = selectedTicket.ticket?.id || selectedTicket.id;
    const res = await apiFetch(`/api/v1/tickets/${ticketId}/resolution`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes: resolutionNotes }),
    });

    setResolvingLoading(false);

    if (res.data) {
      setResolutionNotes('');
      handleSelectTicket(ticketId);
      fetchTickets();
    }
  };

  const handleSubmitCsat = async () => {
    if (!selectedTicket) return;
    setCsatLoading(true);

    const ticketId = selectedTicket.ticket?.id || selectedTicket.id;
    await apiFetch(`/api/v1/tickets/${ticketId}/csat`, {
      method: 'POST',
      body: JSON.stringify({ rating: csatRating, feedback: csatFeedback }),
    });

    setCsatLoading(false);
    setCsatModalOpen(false);
    handleSelectTicket(ticketId);
  };

  const handleConvertToKb = async () => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.ticket?.id || selectedTicket.id;
    const res = await apiFetch('/api/v1/kb/from-ticket', {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId, visibility: 'Public' }),
    });

    if (res.data) {
      alert(`แปลงเป็นบทความ Knowledge Base สำเร็จ! (ID: ${res.data.id})`);
    }
  };

  const ticketObj = selectedTicket?.ticket || selectedTicket;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">Helpdesk Support Tickets</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบรับแจ้งปัญหา ติดตามสถานะ SLA และบันทึกประวัติการแก้ไขตามมาตรฐาน ITIL
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchTickets} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>เปิด Ticket ใหม่</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ค้นหาตามรหัส Ticket, หัวข้อ, หรือผู้แจ้ง..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'ทุกสถานะ (All Status)' },
                  { value: 'Open', label: 'Open (เปิด)' },
                  { value: 'In Progress', label: 'In Progress (กำลังทำ)' },
                  { value: 'Pending', label: 'Pending (รอดำเนินการ)' },
                  { value: 'Resolved', label: 'Resolved (แก้ไขแล้ว)' },
                  { value: 'Closed', label: 'Closed (ปิดเคส)' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[
                  { value: '', label: 'ทุกระดับความสำคัญ' },
                  { value: 'Low', label: 'Low' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'High', label: 'High' },
                  { value: 'Critical', label: 'Critical' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: '', label: 'ทุกหมวดหมู่ (Category)' },
                  { value: 'Hardware', label: 'Hardware' },
                  { value: 'Software', label: 'Software' },
                  { value: 'Network', label: 'Network' },
                  { value: 'Access', label: 'Access' },
                  { value: 'General', label: 'General' },
                ]}
              />
            </div>

            <Button type="submit" variant="primary" size="sm">
              กรองข้อมูล
            </Button>
          </form>
        </Card>

        {/* Tickets Data Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-border font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Ticket ID</th>
                  <th className="py-2.5 px-4">หัวข้อ (Subject)</th>
                  <th className="py-2.5 px-4">หมวดหมู่</th>
                  <th className="py-2.5 px-4">ความสำคัญ</th>
                  <th className="py-2.5 px-4">สถานะ</th>
                  <th className="py-2.5 px-4">ผู้แจ้ง (Reporter)</th>
                  <th className="py-2.5 px-4">ผู้รับผิดชอบ</th>
                  <th className="py-2.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.length > 0 ? (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => handleSelectTicket(t.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-all"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">{t.id}</td>
                      <td className="py-3 px-4 font-semibold text-dark max-w-xs truncate">{t.title}</td>
                      <td className="py-3 px-4 text-slate-600">{t.category || 'General'}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            t.priority === 'Critical'
                              ? 'red'
                              : t.priority === 'High'
                              ? 'amber'
                              : t.priority === 'Medium'
                              ? 'blue'
                              : 'slate'
                          }
                        >
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            t.status === 'Resolved' || t.status === 'Closed'
                              ? 'green'
                              : t.status === 'In Progress'
                              ? 'blue'
                              : 'slate'
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.reporter_name || 'User'}</td>
                      <td className="py-3 px-4 text-slate-500">{t.assigned_to || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTicket(t.id);
                          }}
                        >
                          ดูรายละเอียด
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูล Ticket ที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Ticket Detail Modal / Drawer */}
        {selectedTicket && (
          <Modal
            isOpen={!!selectedTicket}
            onClose={() => setSelectedTicket(null)}
            title={`Ticket Detail: ${ticketObj.id}`}
            description={ticketObj.title}
            maxWidth="2xl"
          >
            <div className="space-y-5">
              {/* Top Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-border text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">สถานะปัจจุบัน:</span>
                  <Badge variant={ticketObj.status === 'Resolved' ? 'green' : 'blue'}>{ticketObj.status}</Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ระดับความสำคัญ:</span>
                  <Badge variant={ticketObj.priority === 'Critical' ? 'red' : 'amber'}>{ticketObj.priority}</Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ผู้แจ้งปัญหา:</span>
                  <span className="font-semibold text-dark">{ticketObj.reporter_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ผู้รับผิดชอบ:</span>
                  <span className="font-semibold text-dark">{ticketObj.assigned_to || 'ยังไม่ได้มอบหมาย'}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  รายละเอียดปัญหา (Description)
                </h4>
                <div className="p-3.5 bg-slate-50/70 rounded-lg border border-border text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {ticketObj.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                </div>
              </div>

              {/* Status Transition Toolbar */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                <span className="text-xs font-bold text-slate-600">เปลี่ยนสถานะ:</span>
                {['In Progress', 'Pending', 'Resolved', 'Closed'].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={ticketObj.status === st ? 'primary' : 'ghost'}
                    onClick={() => handleUpdateStatus(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>

              {/* Resolution & Canned Responses Box */}
              {ticketObj.status !== 'Closed' && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      บันทึกการแก้ไขปัญหา (Resolution Notes)
                    </h4>
                    {/* Canned responses dropdown */}
                    {cannedResponses.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>ข้อความตอบกลับสำเร็จรูป:</span>
                        <select
                          className="text-xs bg-slate-50 border border-border rounded px-2 py-1"
                          onChange={(e) => {
                            const found = cannedResponses.find((c) => c.id === e.target.value);
                            if (found) setResolutionNotes(found.content);
                          }}
                        >
                          <option value="">เลือกข้อความ Template...</option>
                          {cannedResponses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="ระบุสาเหตุ ขั้นตอนการแก้ไข และข้อแนะนำสำหรับผู้ใช้งาน..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />

                  <div className="flex justify-between items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleConvertToKb}
                      title="นำข้อความแก้ไขไปสร้างเป็นบทความ KCS ใน Knowledge Base"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Convert to KB Article</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleResolveTicket}
                      loading={resolvingLoading}
                      disabled={!resolutionNotes.trim()}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>บันทึกการแก้ไข (Resolve Ticket)</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* CSAT Rating Button (If Resolved) */}
              {ticketObj.status === 'Resolved' && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-semibold text-amber-900">
                      {ticketObj.csat_rating
                        ? `ได้รับคะแนนประเมินความพึงพอใจ: ${ticketObj.csat_rating} ดาว`
                        : 'ผู้ใช้งานยังไม่ได้ทำแบบประเมินความพึงพอใจ (CSAT)'}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setCsatModalOpen(true)}>
                    ประเมินคะแนน CSAT
                  </Button>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Create Ticket Modal */}
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="เปิด Ticket แจ้งปัญหาใหม่ (New Support Ticket)"
          description="กรอกรายละเอียดปัญหาเพื่อส่งต่อให้ทีม IT Operations ดำเนินการแก้ไข"
        >
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <Input
              label="หัวข้อปัญหา (Subject / Title)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="เช่น เข้าใช้งานระบบ VPN ไม่ได้, หน้าจอแสดงผลมีปัญหา"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="หมวดหมู่ (Category)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                options={[
                  { value: 'Hardware', label: 'Hardware (ฮาร์ดแวร์)' },
                  { value: 'Software', label: 'Software (ซอฟต์แวร์)' },
                  { value: 'Network', label: 'Network (เครือข่าย)' },
                  { value: 'Access', label: 'Access (สิทธิ์การใช้งาน)' },
                  { value: 'General', label: 'General (ทั่วไป)' },
                ]}
              />

              <Select
                label="ความสำคัญ (Priority)"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                options={[
                  { value: 'Low', label: 'Low (ปกติ)' },
                  { value: 'Medium', label: 'Medium (ปานกลาง)' },
                  { value: 'High', label: 'High (สูง)' },
                  { value: 'Critical', label: 'Critical (วิกฤต/ระบบหยุดชะงัก)' },
                ]}
              />
            </div>

            <Input
              label="ชื่อผู้แจ้ง (Reporter Name)"
              value={newReporter}
              onChange={(e) => setNewReporter(e.target.value)}
              placeholder="ชื่อ-นามสกุล หรือ แผนกที่แจ้ง"
            />

            <div className="space-y-1.5">
              <label htmlFor="ticket-new-desc" className="block text-xs font-semibold text-slate-700">
                รายละเอียดเพิ่มเติม (Description)
              </label>
              <textarea
                id="ticket-new-desc"
                rows={4}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ระบุรายละเอียดของปัญหา พฤติกรรมที่พบ ข้อความ Error code..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={createLoading}>
                สร้าง Ticket
              </Button>
            </div>
          </form>
        </Modal>

        {/* CSAT Modal */}
        <Modal
          isOpen={csatModalOpen}
          onClose={() => setCsatModalOpen(false)}
          title="แบบประเมินความพึงพอใจ (CSAT Rating)"
          description="กรุณาให้คะแนนความพึงพอใจในการให้บริการของทีม IT"
        >
          <div className="space-y-4 text-center">
            <div className="flex justify-center gap-2 py-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setCsatRating(star)}
                  className="p-1 hover:scale-110 transition-all cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= csatRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>

            <Input
              label="ข้อเสนอแนะเพิ่มเติม (Optional Feedback)"
              value={csatFeedback}
              onChange={(e) => setCsatFeedback(e.target.value)}
              placeholder="ความรวดเร็ว สุภาพ หรือข้อควรปรับปรุง..."
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCsatModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="primary" onClick={handleSubmitCsat} loading={csatLoading}>
                ส่งคะแนนประเมิน
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
