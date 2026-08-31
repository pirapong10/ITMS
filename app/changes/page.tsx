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
  GitPullRequest,
  Plus,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  Play,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';

export default function ChangesPage() {
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Change Detail & CAB review
  const [selectedChange, setSelectedChange] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Change Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [changeType, setChangeType] = useState('Normal');
  const [riskLevel, setRiskLevel] = useState('High');
  const [impactLevel, setImpactLevel] = useState('Critical');
  const [implPlan, setImplPlan] = useState('');
  const [rollbackPlan, setRollbackPlan] = useState('');
  const [testPlan, setTestPlan] = useState('');

  // Submit to CAB Modal
  const [cabModalOpen, setCabModalOpen] = useState(false);
  const [approverId, setApproverId] = useState('usr-cab-1');
  const [approverName, setApproverName] = useState('Security Officer');

  // Review / Decision
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Execution / PIR
  const [pirNotes, setPirNotes] = useState('');

  const fetchChanges = async () => {
    setLoading(true);
    let url = '/api/v1/changes?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

    const res = await apiFetch(url);
    if (res.data) setChanges(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchChanges();
  }, [statusFilter]);

  const handleSelectChange = async (changeId: string) => {
    setDetailLoading(true);
    const res = await apiFetch(`/api/v1/changes/${changeId}`);
    if (res.data) setSelectedChange(res.data);
    setDetailLoading(false);
  };

  const handleCreateChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const res = await apiFetch('/api/v1/changes', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        change_type: changeType,
        risk_level: riskLevel,
        impact_level: impactLevel,
        implementation_plan: implPlan,
        rollback_plan: rollbackPlan,
        test_plan: testPlan || undefined,
      }),
    });

    setCreateLoading(false);

    if (res.data) {
      setNewModalOpen(false);
      setTitle('');
      setDescription('');
      setImplPlan('');
      setRollbackPlan('');
      fetchChanges();
    }
  };

  const handleSubmitToCab = async () => {
    if (!selectedChange) return;
    const changeId = selectedChange.id;

    const res = await apiFetch(`/api/v1/changes/${changeId}/submit-cab`, {
      method: 'POST',
      body: JSON.stringify({
        approvers: [{ approver_id: approverId, approver_name: approverName }],
      }),
    });

    if (res.data) {
      setCabModalOpen(false);
      handleSelectChange(changeId);
      fetchChanges();
    }
  };

  const handleCabDecision = async (decision: 'Approved' | 'Rejected') => {
    if (!selectedChange) return;
    const changeId = selectedChange.id;
    setDecisionLoading(true);

    const res = await apiFetch(`/api/v1/changes/${changeId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        approver_id: approverId,
        decision,
        comments: decisionNotes || `Decision: ${decision}`,
      }),
    });

    setDecisionLoading(false);

    if (res.data) {
      setDecisionNotes('');
      handleSelectChange(changeId);
      fetchChanges();
    }
  };

  const handleExecuteChange = async (status: 'Implementing' | 'Completed' | 'Rolled Back') => {
    if (!selectedChange) return;
    const changeId = selectedChange.id;

    const res = await apiFetch(`/api/v1/changes/${changeId}/execute`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        review_notes: pirNotes || undefined,
      }),
    });

    if (res.data) {
      handleSelectChange(changeId);
      fetchChanges();
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">Change Enablement & CAB Approvals</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              การบริหารจัดการการเปลี่ยนแปลง (Change Management), คณะกรรมการ CAB, และการทบทวนหลังปฏิบัติงาน (PIR)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchChanges} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>ยื่นคำขอ Change (CR)</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ค้นหาชื่อการเปลี่ยนแปลง, Change ID หรือรายละเอียด..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchChanges()}
              />
            </div>

            <div className="w-44">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'ทุกสถานะ Change' },
                  { value: 'Draft', label: 'Draft (ร่าง)' },
                  { value: 'Pending CAB', label: 'Pending CAB (รออนุมัติ)' },
                  { value: 'Approved', label: 'Approved (อนุมัติแล้ว)' },
                  { value: 'Implementing', label: 'Implementing (กำลังทำ)' },
                  { value: 'Completed', label: 'Completed (สำเร็จ)' },
                  { value: 'Rejected', label: 'Rejected (ปฏิเสธ)' },
                  { value: 'Rolled Back', label: 'Rolled Back (ย้อนคืน)' },
                ]}
              />
            </div>

            <Button variant="primary" size="sm" onClick={fetchChanges}>
              ค้นหา
            </Button>
          </div>
        </Card>

        {/* Changes Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Change ID</th>
                  <th className="py-2.5 px-4">หัวข้อการเปลี่ยนแปลง (Title)</th>
                  <th className="py-2.5 px-4">ประเภท (Type)</th>
                  <th className="py-2.5 px-4">ความเสี่ยง (Risk)</th>
                  <th className="py-2.5 px-4">ผลกระทบ (Impact)</th>
                  <th className="py-2.5 px-4">สถานะ</th>
                  <th className="py-2.5 px-4">วันที่สร้าง</th>
                  <th className="py-2.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {changes.length > 0 ? (
                  changes.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectChange(c.id)}
                      className="hover:bg-purple-50/30 cursor-pointer transition-all"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">{c.id}</td>
                      <td className="py-3 px-4 font-semibold text-dark max-w-xs truncate">{c.title}</td>
                      <td className="py-3 px-4">
                        <Badge variant={c.change_type === 'Standard' ? 'green' : c.change_type === 'Emergency' ? 'red' : 'blue'}>
                          {c.change_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={c.risk_level === 'High' ? 'red' : c.risk_level === 'Medium' ? 'amber' : 'green'}>
                          {c.risk_level}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.impact_level}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            c.status === 'Approved' || c.status === 'Completed'
                              ? 'green'
                              : c.status === 'Pending CAB'
                              ? 'purple'
                              : c.status === 'Rejected' || c.status === 'Rolled Back'
                              ? 'red'
                              : 'slate'
                          }
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(c.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectChange(c.id);
                          }}
                        >
                          ดู CAB & แผนงาน
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบคำขอ Change Request ในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Selected Change Modal & CAB Workflow */}
        {selectedChange && (
          <Modal
            isOpen={!!selectedChange}
            onClose={() => setSelectedChange(null)}
            title={`Change Request: ${selectedChange.id}`}
            description={selectedChange.title}
            maxWidth="2xl"
          >
            <div className="space-y-5">
              {/* Meta Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-border text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">สถานะ:</span>
                  <Badge variant={selectedChange.status === 'Approved' ? 'green' : 'purple'}>
                    {selectedChange.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ประเภท:</span>
                  <span className="font-bold text-dark">{selectedChange.change_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ความเสี่ยง / ผลกระทบ:</span>
                  <span className="font-bold text-rose-600">
                    {selectedChange.risk_level} / {selectedChange.impact_level}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ผู้ยื่นคำขอ:</span>
                  <span className="font-semibold text-dark">{selectedChange.requested_by || 'Lead Engineer'}</span>
                </div>
              </div>

              {/* Plans Section */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    1. แผนการปฏิบัติงาน (Implementation Plan)
                  </h4>
                  <div className="p-3 bg-slate-50 rounded-lg border border-border text-xs text-slate-700 whitespace-pre-wrap">
                    {selectedChange.implementation_plan}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    2. แผนการย้อนคืนกรณีเกิดปัญหา (Rollback Plan)
                  </h4>
                  <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-200 text-xs text-slate-700 whitespace-pre-wrap">
                    {selectedChange.rollback_plan}
                  </div>
                </div>
              </div>

              {/* CAB Approvals Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>การพิจารณาของคณะกรรมการ CAB (Advisory Board)</span>
                  </h4>
                  {selectedChange.status === 'Draft' && (
                    <Button size="sm" variant="primary" onClick={() => setCabModalOpen(true)}>
                      ส่งให้ CAB พิจารณา
                    </Button>
                  )}
                </div>

                {selectedChange.approvals && selectedChange.approvals.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                        <tr>
                          <th className="py-2 px-3">กรรมการ CAB</th>
                          <th className="py-2 px-3">ผลการตัดสิน</th>
                          <th className="py-2 px-3">ความเห็น (Comments)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedChange.approvals.map((app: any) => (
                          <tr key={app.id}>
                            <td className="py-2 px-3 font-semibold text-dark">
                              {app.approver_name || app.approver_id}
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant={
                                  app.decision === 'Approved'
                                    ? 'green'
                                    : app.decision === 'Rejected'
                                    ? 'red'
                                    : 'slate'
                                }
                              >
                                {app.decision}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{app.comments || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-2">ยังไม่ได้ส่งเข้าคณะกรรมการ CAB</p>
                )}

                {/* CAB Decision Buttons (If Pending CAB) */}
                {selectedChange.status === 'Pending CAB' && (
                  <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg space-y-3 mt-2">
                    <span className="text-xs font-bold text-purple-900 block">ลงมติคณะกรรมการ CAB:</span>
                    <Input
                      placeholder="ระบุข้อสังเกตหรือเงื่อนไขการอนุมัติ..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleCabDecision('Rejected')}
                        loading={decisionLoading}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>ปฏิเสธ (Reject)</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleCabDecision('Approved')}
                        loading={decisionLoading}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>อนุมัติการเปลี่ยนแปลง (Approve)</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Execution & PIR Toolbar (If Approved or Implementing) */}
              {(selectedChange.status === 'Approved' || selectedChange.status === 'Implementing') && (
                <div className="p-3 bg-slate-50 border border-border rounded-lg space-y-2 pt-3">
                  <span className="text-xs font-bold text-dark block">การปฏิบัติงานจริง (Execution & PIR):</span>
                  <Input
                    placeholder="บันทึกผลการประเมินหลังเสร็จสิ้น (Post-Implementation Review Notes)..."
                    value={pirNotes}
                    onChange={(e) => setPirNotes(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    {selectedChange.status === 'Approved' && (
                      <Button size="sm" variant="primary" onClick={() => handleExecuteChange('Implementing')}>
                        <Play className="w-3.5 h-3.5" />
                        <span>เริ่มดำเนินการ (Start Implementing)</span>
                      </Button>
                    )}
                    <Button size="sm" variant="danger" onClick={() => handleExecuteChange('Rolled Back')}>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ย้อนคืนระบบ (Roll Back)</span>
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => handleExecuteChange('Completed')}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>เสร็จสิ้นสมบูรณ์ (Complete Change)</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Modal: Submit to CAB */}
        <Modal
          isOpen={cabModalOpen}
          onClose={() => setCabModalOpen(false)}
          title="ส่งคำขอให้คณะกรรมการ CAB พิจารณา"
          description="กำหนดรายชื่อผู้มีอำนาจอนุมัติการเปลี่ยนแปลง"
        >
          <div className="space-y-4">
            <Input
              label="ผู้แทนคณะกรรมการ CAB (Approver Name)"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCabModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="primary" onClick={handleSubmitToCab}>
                ยืนยันส่ง CAB
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Create Change Request */}
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="ยื่นคำขอ Change Request (CR) ใหม่"
          description="กรอกข้อมูลแผนการปฏิบัติงาน แผนการย้อนคืน และการทดสอบ"
          maxWidth="xl"
        >
          <form onSubmit={handleCreateChange} className="space-y-4">
            <Input
              label="หัวข้อการเปลี่ยนแปลง (Change Title)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น Upgrade Kubernetes Cluster to v1.30, Firewall Patch"
              required
            />

            <div className="grid grid-cols-3 gap-3">
              <Select
                label="ประเภท Change"
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                options={[
                  { value: 'Normal', label: 'Normal (ปกติ/ต้องผ่าน CAB)' },
                  { value: 'Standard', label: 'Standard (งานประจำ/อนุมัติล่วงหน้า)' },
                  { value: 'Emergency', label: 'Emergency (ฉุกเฉิน)' },
                ]}
              />

              <Select
                label="ระดับความเสี่ยง"
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                options={[
                  { value: 'Low', label: 'Low (ต่ำ)' },
                  { value: 'Medium', label: 'Medium (ปานกลาง)' },
                  { value: 'High', label: 'High (สูง)' },
                ]}
              />

              <Select
                label="ระดับผลกระทบ"
                value={impactLevel}
                onChange={(e) => setImpactLevel(e.target.value)}
                options={[
                  { value: 'Minor', label: 'Minor' },
                  { value: 'Significant', label: 'Significant' },
                  { value: 'Critical', label: 'Critical' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">วัตถุประสงค์ (Description)</label>
              <textarea
                rows={2}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="เหตุผลความจำเป็นในการเปลี่ยนแปลง..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                1. แผนการปฏิบัติงาน (Implementation Plan)
              </label>
              <textarea
                rows={3}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ระบุขั้นตอนการทำงานโดยละเอียด..."
                value={implPlan}
                onChange={(e) => setImplPlan(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                2. แผนการย้อนคืนระบบ (Rollback Plan)
              </label>
              <textarea
                rows={2}
                className="w-full text-xs p-3 bg-white border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ขั้นตอนการกู้คืนระบบกรณีพบความผิดปกติ..."
                value={rollbackPlan}
                onChange={(e) => setRollbackPlan(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={createLoading}>
                ยื่นคำขอ Change Request
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
