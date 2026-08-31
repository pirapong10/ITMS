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
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Plus,
  RefreshCw,
  Ticket,
  Calendar,
  Check,
  X,
  Laptop,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';
import { useToast } from '../../src/components/ui/ToastContext';

export default function OperationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'pm' | 'routines' | 'borrow'>('pm');
  const [loading, setLoading] = useState(true);

  // PM Schedules
  const [pmSchedules, setPmSchedules] = useState<any[]>([]);
  const [newPmOpen, setNewPmOpen] = useState(false);
  const [pmTitle, setPmTitle] = useState('');
  const [pmTargetType, setPmTargetType] = useState('System');
  const [pmRecurrence, setPmRecurrence] = useState('Monthly');
  const [pmNextDue, setPmNextDue] = useState('');
  const [pmTech, setPmTech] = useState('');
  const [pmLoading, setPmLoading] = useState(false);

  // Routine Checklists
  const [routines, setRoutines] = useState<any[]>([]);
  const [newRoutineOpen, setNewRoutineOpen] = useState(false);
  const [routineCategory, setRoutineCategory] = useState('Server Room');
  const [routineItemName, setRoutineItemName] = useState('');
  const [routineStatus, setRoutineStatus] = useState('Pass');
  const [routineRemarks, setRoutineRemarks] = useState('');
  const [routineInspector, setRoutineInspector] = useState('');
  const [routineLoading, setRoutineLoading] = useState(false);

  // Borrow / Return
  const [borrowRecords, setBorrowRecords] = useState<any[]>([]);
  const [newBorrowOpen, setNewBorrowOpen] = useState(false);
  const [borrowAssetId, setBorrowAssetId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerDept, setBorrowerDept] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [borrowLoading, setBorrowLoading] = useState(false);

  const fetchOperationsData = async () => {
    setLoading(true);
    const [pmRes, rRes, bRes] = await Promise.all([
      apiFetch('/api/v1/pm-schedules'),
      apiFetch('/api/v1/routine-checklists'),
      apiFetch('/api/v1/borrow-records'),
    ]);

    if (pmRes.data) setPmSchedules(Array.isArray(pmRes.data) ? pmRes.data : (pmRes.data as any).schedules || []);
    if (rRes.data) setRoutines(Array.isArray(rRes.data) ? rRes.data : (rRes.data as any).checklists || []);
    if (bRes.data) setBorrowRecords(Array.isArray(bRes.data) ? bRes.data : (bRes.data as any).records || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOperationsData();
  }, []);

  const handleExecutePm = async (pmId: string) => {
    const res = await apiFetch(`/api/v1/pm-schedules/${pmId}/execute`, {
      method: 'POST',
    });
    if (res.data) {
      toast.success('บันทึกการทำ PM เรียบร้อยแล้ว! ระบบคำนวณวันกำหนดครั้งถัดไปอัตโนมัติ', 'Preventive Maintenance');
      fetchOperationsData();
    } else if (res.error) {
      toast.error(res.error, 'เกิดข้อผิดพลาด');
    }
  };

  const handleCreatePm = async (e: React.FormEvent) => {
    e.preventDefault();
    setPmLoading(true);

    const res = await apiFetch('/api/v1/pm-schedules', {
      method: 'POST',
      body: JSON.stringify({
        title: pmTitle,
        target_type: pmTargetType,
        recurrence: pmRecurrence,
        next_due_date: pmNextDue || new Date().toISOString(),
        assigned_technician: pmTech || undefined,
      }),
    });

    setPmLoading(false);

    if (res.data) {
      toast.success('สร้างกำหนดการ PM ใหม่สำเร็จ!', 'Preventive Maintenance');
      setNewPmOpen(false);
      setPmTitle('');
      fetchOperationsData();
    } else if (res.error) {
      toast.error(res.error, 'เกิดข้อผิดพลาด');
    }
  };

  const handleCreateTicketFromChecklist = async (checklistId: string) => {
    const res = await apiFetch(`/api/v1/routine-checklists/${checklistId}/create-ticket`, {
      method: 'POST',
    });

    if (res.data) {
      toast.success(`เปิด Helpdesk Ticket สำเร็จ! Ticket ID: ${res.data.id}`, 'Helpdesk Ticket');
      fetchOperationsData();
    } else if (res.error) {
      toast.error(res.error, 'เกิดข้อผิดพลาด');
    }
  };

  const handleCreateRoutineCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoutineLoading(true);

    const res = await apiFetch('/api/v1/routine-checklists', {
      method: 'POST',
      body: JSON.stringify({
        category: routineCategory,
        item_name: routineItemName,
        status: routineStatus,
        remarks: routineRemarks || undefined,
        checked_by: routineInspector || undefined,
      }),
    });

    setRoutineLoading(false);

    if (res.data) {
      setNewRoutineOpen(false);
      setRoutineItemName('');
      setRoutineRemarks('');
      fetchOperationsData();
    }
  };

  const handleCreateBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    setBorrowLoading(true);

    const res = await apiFetch('/api/v1/borrow-records', {
      method: 'POST',
      body: JSON.stringify({
        asset_id: borrowAssetId,
        borrower_name: borrowerName,
        borrower_dept: borrowerDept || undefined,
        expected_return_date: expectedReturn || new Date().toISOString(),
      }),
    });

    setBorrowLoading(false);

    if (res.data) {
      toast.success('บันทึกการยืมอุปกรณ์สำเร็จ!', 'Borrow & Return');
      setNewBorrowOpen(false);
      setBorrowAssetId('');
      setBorrowerName('');
      setBorrowerDept('');
      setExpectedReturn('');
      fetchOperationsData();
    } else if (res.error) {
      toast.error(res.error, 'เกิดข้อผิดพลาด');
    }
  };

  const handleReturnBorrow = async (recordId: string) => {
    const res = await apiFetch(`/api/v1/borrow-records/${recordId}/return`, {
      method: 'POST',
      body: JSON.stringify({ condition_on_return: 'Good Condition' }),
    });

    if (res.data) {
      toast.success('บันทึกการคืนอุปกรณ์เรียบร้อยแล้ว สถานะสินทรัพย์เปลี่ยนเป็น In Stock', 'Borrow & Return');
      fetchOperationsData();
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
            <h2 className="text-xl font-black text-dark tracking-tight">IT Operations, PM & Routine Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              การบำรุงรักษาเชิงป้องกัน (PM) การตรวจเช็กประจำวัน และการยืม-คืนอุปกรณ์
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchOperationsData} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border gap-2">
          <button
            onClick={() => setActiveTab('pm')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'pm'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-dark'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Preventive Maintenance (PM) ({pmSchedules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('routines')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'routines'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-dark'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Daily Routine Checklists ({routines.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('borrow')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'borrow'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-dark'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Asset Borrow & Return ({borrowRecords.length})</span>
          </button>
        </div>

        {/* TAB 1: PM SCHEDULES */}
        {activeTab === 'pm' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">
                ตารางงานบำรุงรักษาเชิงป้องกันตามรอบ (Daily, Weekly, Monthly, Quarterly, Yearly)
              </span>
              <Button variant="primary" size="sm" onClick={() => setNewPmOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มกำหนดการ PM</span>
              </Button>
            </div>

            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">ชื่องาน PM</th>
                    <th className="py-2.5 px-4">เป้าหมาย</th>
                    <th className="py-2.5 px-4">รอบความถี่ (Recurrence)</th>
                    <th className="py-2.5 px-4">ทำล่าสุดเมื่อ</th>
                    <th className="py-2.5 px-4">กำหนดการครั้งถัดไป</th>
                    <th className="py-2.5 px-4">ผู้รับผิดชอบ</th>
                    <th className="py-2.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pmSchedules.length > 0 ? (
                    pmSchedules.map((pm) => (
                      <tr key={pm.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-dark">{pm.title}</td>
                        <td className="py-3 px-4 text-slate-600">{pm.target_type}</td>
                        <td className="py-3 px-4">
                          <Badge variant="purple">{pm.recurrence}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {pm.last_executed_at
                            ? new Date(pm.last_executed_at).toLocaleDateString('th-TH')
                            : 'ยังไม่เคยทำ'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-primary">
                          {new Date(pm.next_due_date).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{pm.assigned_technician || 'ทีม IT'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="primary" onClick={() => handleExecutePm(pm.id)}>
                            <Check className="w-3.5 h-3.5" />
                            <span>บันทึกการทำ PM</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ไม่มีตารางงาน PM ในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* TAB 2: ROUTINE CHECKLISTS */}
        {activeTab === 'routines' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">
                รายการตรวจเช็กประจำวัน (Server Room, CCTV, Power Backup) — กรณีไม่ผ่านสามารถเปิด Ticket ได้ทันที
              </span>
              <Button variant="primary" size="sm" onClick={() => setNewRoutineOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>บันทึกการตรวจเช็กใหม่</span>
              </Button>
            </div>

            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">วันที่ตรวจ</th>
                    <th className="py-2.5 px-4">หมวดหมู่</th>
                    <th className="py-2.5 px-4">รายการตรวจเช็ก (Item)</th>
                    <th className="py-2.5 px-4">ผลการตรวจ</th>
                    <th className="py-2.5 px-4">หมายเหตุ / อาการ</th>
                    <th className="py-2.5 px-4">ผู้ตรวจ</th>
                    <th className="py-2.5 px-4 text-right">Ticket ที่เชื่อมโยง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {routines.length > 0 ? (
                    routines.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-500">{r.check_date}</td>
                        <td className="py-3 px-4 font-semibold text-dark">{r.category}</td>
                        <td className="py-3 px-4">{r.item_name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={r.status === 'Pass' ? 'green' : 'red'}>{r.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{r.remarks || '-'}</td>
                        <td className="py-3 px-4 text-slate-500">{r.checked_by || 'Inspector'}</td>
                        <td className="py-3 px-4 text-right">
                          {r.linked_ticket_id ? (
                            <Badge variant="blue">{r.linked_ticket_id}</Badge>
                          ) : r.status === 'Fail' ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleCreateTicketFromChecklist(r.id)}
                            >
                              <Ticket className="w-3.5 h-3.5" />
                              <span>เปิด Ticket ซ่อม</span>
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ยังไม่มีบันทึกการตรวจเช็กประจำวัน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* TAB 3: BORROW & RETURN */}
        {activeTab === 'borrow' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">
                ระบบบันทึกการยืม-คืนอุปกรณ์ไอที และติดตามสถานะเกินกำหนดส่งคืน (Overdue)
              </span>
              <Button variant="primary" size="sm" onClick={() => setNewBorrowOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>บันทึกการยืมอุปกรณ์</span>
              </Button>
            </div>

            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">รหัสการยืม</th>
                    <th className="py-2.5 px-4">Asset ID / อุปกรณ์</th>
                    <th className="py-2.5 px-4">ผู้ยืม (Borrower)</th>
                    <th className="py-2.5 px-4">แผนก</th>
                    <th className="py-2.5 px-4">กำหนดส่งคืน</th>
                    <th className="py-2.5 px-4">สถานะ</th>
                    <th className="py-2.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {borrowRecords.length > 0 ? (
                    borrowRecords.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-primary">{b.borrow_code}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">{b.asset_id}</td>
                        <td className="py-3 px-4 font-semibold text-dark">{b.borrower_name}</td>
                        <td className="py-3 px-4 text-slate-600">{b.borrower_dept || '-'}</td>
                        <td className="py-3 px-4 font-mono">
                          {new Date(b.expected_return_date).toLocaleDateString('th-TH')}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              b.status === 'Returned'
                                ? 'green'
                                : b.status === 'Overdue'
                                ? 'red'
                                : 'amber'
                            }
                          >
                            {b.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {b.status !== 'Returned' && (
                            <Button size="sm" variant="ghost" onClick={() => handleReturnBorrow(b.id)}>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>บันทึกการคืน</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ไม่มีรายการยืมอุปกรณ์ในขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Modal: New PM */}
        <Modal
          isOpen={newPmOpen}
          onClose={() => setNewPmOpen(false)}
          title="กำหนดตารางงาน PM ใหม่"
          description="ตั้งค่าการบำรุงรักษาเชิงป้องกันตามรอบเวลา"
        >
          <form onSubmit={handleCreatePm} className="space-y-4">
            <Input
              label="ชื่องาน PM"
              value={pmTitle}
              onChange={(e) => setPmTitle(e.target.value)}
              placeholder="เช่น UPS Battery Inspection, Firewall Rule Review"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="เป้าหมาย"
                value={pmTargetType}
                onChange={(e) => setPmTargetType(e.target.value)}
                options={[
                  { value: 'System', label: 'System (ระบบงาน)' },
                  { value: 'Server', label: 'Server Hardware' },
                  { value: 'Network', label: 'Network Infrastructure' },
                ]}
              />

              <Select
                label="รอบความถี่"
                value={pmRecurrence}
                onChange={(e) => setPmRecurrence(e.target.value)}
                options={[
                  { value: 'Daily', label: 'Daily (ทุกวัน)' },
                  { value: 'Weekly', label: 'Weekly (ทุกสัปดาห์)' },
                  { value: 'Monthly', label: 'Monthly (ทุกเดือน)' },
                  { value: 'Quarterly', label: 'Quarterly (ทุก 3 เดือน)' },
                  { value: 'Yearly', label: 'Yearly (ทุกปี)' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="วันครบกำหนดครั้งแรก"
                type="date"
                value={pmNextDue}
                onChange={(e) => setPmNextDue(e.target.value)}
              />

              <Input
                label="ช่างเทคนิคผู้รับผิดชอบ"
                value={pmTech}
                onChange={(e) => setPmTech(e.target.value)}
                placeholder="ชื่อวิศวกร"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewPmOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={pmLoading}>
                บันทึกกำหนดการ
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: New Routine */}
        <Modal
          isOpen={newRoutineOpen}
          onClose={() => setNewRoutineOpen(false)}
          title="บันทึกการตรวจเช็กประจำวัน"
          description="บันทึกผลการตรวจสอบอุปกรณ์หรือพื้นที่ปฏิบัติงาน"
        >
          <form onSubmit={handleCreateRoutineCheck} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="หมวดหมู่"
                value={routineCategory}
                onChange={(e) => setRoutineCategory(e.target.value)}
                options={[
                  { value: 'Server Room', label: 'Server Room (ห้องเซิร์ฟเวอร์)' },
                  { value: 'CCTV', label: 'CCTV (กล้องวงจรปิด)' },
                  { value: 'Backup', label: 'Backup & Storage' },
                  { value: 'Power', label: 'UPS & Generator' },
                ]}
              />

              <Select
                label="ผลการตรวจ"
                value={routineStatus}
                onChange={(e) => setRoutineStatus(e.target.value)}
                options={[
                  { value: 'Pass', label: 'Pass (ปกติ/ผ่าน)' },
                  { value: 'Fail', label: 'Fail (ผิดปกติ/ไม่ผ่าน)' },
                ]}
              />
            </div>

            <Input
              label="รายการที่ตรวจ (Item Name)"
              value={routineItemName}
              onChange={(e) => setRoutineItemName(e.target.value)}
              placeholder="เช่น อุณหภูมิห้องไม่เกิน 22°C, กล้อง CCTV ทางเข้า 1"
              required
            />

            <Input
              label="ผู้ตรวจเช็ก"
              value={routineInspector}
              onChange={(e) => setRoutineInspector(e.target.value)}
              placeholder="ชื่อเจ้าหน้าที่"
            />

            <Input
              label="หมายเหตุ / ความผิดปกติที่พบ"
              value={routineRemarks}
              onChange={(e) => setRoutineRemarks(e.target.value)}
              placeholder="ระบุรายละเอียดกรณีพบปัญหา"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewRoutineOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={routineLoading}>
                บันทึกผล
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: New Borrow */}
        <Modal
          isOpen={newBorrowOpen}
          onClose={() => setNewBorrowOpen(false)}
          title="บันทึกการยืมอุปกรณ์"
          description="ออกรหัสใบยืมและเปลี่ยนสถานะอุปกรณ์เป็น In Use"
        >
          <form onSubmit={handleCreateBorrow} className="space-y-4">
            <Input
              label="รหัสสินทรัพย์ (Asset ID หรือ Tag)"
              value={borrowAssetId}
              onChange={(e) => setBorrowAssetId(e.target.value)}
              placeholder="เช่น AST-2026-0001"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="ชื่อผู้ขอยืม"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="ชื่อพนักงาน"
                required
              />

              <Input
                label="แผนก"
                value={borrowerDept}
                onChange={(e) => setBorrowerDept(e.target.value)}
                placeholder="Marketing, Sales"
              />
            </div>

            <Input
              label="กำหนดส่งคืน (Expected Return Date)"
              type="date"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewBorrowOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={borrowLoading}>
                บันทึกการยืม
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
