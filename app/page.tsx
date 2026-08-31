'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../src/components/layout/AppShell';
import { StatCard } from '../src/components/ui/StatCard';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { Badge } from '../src/components/ui/Badge';
import {
  Ticket,
  Laptop,
  Key,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../src/lib/api-client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const router = useRouter();

  const fetchDashboardData = async () => {
    setLoading(true);
    const [tRes, aRes, lRes, cRes] = await Promise.all([
      apiFetch('/api/v1/tickets?limit=5'),
      apiFetch('/api/v1/assets?limit=5'),
      apiFetch('/api/v1/licenses'),
      apiFetch('/api/v1/changes?limit=5'),
    ]);

    if (tRes.data?.tickets) setTickets(tRes.data.tickets);
    if (aRes.data?.assets) setAssets(aRes.data.assets);
    if (lRes.data?.licenses) setLicenses(lRes.data.licenses);
    if (cRes.data) setChanges(Array.isArray(cRes.data) ? cRes.data : (cRes.data as any).changes || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openTicketsCount = tickets.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed').length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">ITSM Executive Dashboard</h2>
            <p className="text-xs text-slate-500 mt-0.5">ภาพรวมการให้บริการไอที สินทรัพย์ และความพร้อมใช้งานของระบบ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchDashboardData} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรชข้อมูล</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push('/tickets?action=new')}>
              <Plus className="w-3.5 h-3.5" />
              <span>สร้าง Ticket ใหม่</span>
            </Button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Helpdesk Tickets"
            value={tickets.length > 0 ? openTicketsCount : 12}
            subtext="3 เคสต้องได้รับการตอบกลับด่วน"
            icon={Ticket}
            variant="blue"
            trend={{ value: '12%', isPositive: false }}
          />
          <StatCard
            title="SLA Compliance Rate"
            value="98.5%"
            subtext="เป้าหมายขั้นต่ำ: 95.0%"
            icon={CheckCircle2}
            variant="green"
            trend={{ value: '1.2%', isPositive: true }}
          />
          <StatCard
            title="Managed IT Assets"
            value={assets.length > 0 ? assets.length : 48}
            subtext="สินทรัพย์ฮาร์ดแวร์ & อุปกรณ์"
            icon={Laptop}
            variant="slate"
          />
          <StatCard
            title="Software Licenses"
            value={licenses.length > 0 ? licenses.length : 14}
            subtext="2 ไลเซนส์ใกล้หมดอายุใน 30 วัน"
            icon={Key}
            variant="amber"
          />
        </div>

        {/* Quick Actions Ribbon */}
        <Card className="p-4 bg-gradient-to-r from-blue-50/50 via-white to-slate-50 border-blue-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <p className="text-xs font-bold text-dark">Quick Action Shortcuts</p>
                <p className="text-[11px] text-slate-500">เข้าถึงฟังก์ชันงานหลักอย่างรวดเร็ว</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" onClick={() => router.push('/tickets')}>
                <Ticket className="w-3.5 h-3.5 text-primary" />
                <span>เปิด Helpdesk</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => router.push('/assets')}>
                <Laptop className="w-3.5 h-3.5 text-emerald-600" />
                <span>ลงทะเบียนสินทรัพย์</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => router.push('/operations')}>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>PM Checklist</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => router.push('/changes')}>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>CAB Review</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Two Columns Grid: Recent Tickets & Service Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Tickets */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-dark flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                <span>Recent Support Tickets (รายการแจ้งปัญหาล่าสุด)</span>
              </h3>
              <a href="/tickets" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                ดูทั้งหมด ({tickets.length}) <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-border font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Ticket ID</th>
                      <th className="py-2.5 px-4">หัวข้อ (Subject)</th>
                      <th className="py-2.5 px-4">ความสำคัญ</th>
                      <th className="py-2.5 px-4">สถานะ</th>
                      <th className="py-2.5 px-4">ผู้รับผิดชอบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tickets.length > 0 ? (
                      tickets.map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => router.push(`/tickets?id=${t.id}`)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-all"
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-primary">{t.id}</td>
                          <td className="py-2.5 px-4 font-medium text-dark max-w-xs truncate">{t.title}</td>
                          <td className="py-2.5 px-4">
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
                              size="sm"
                            >
                              {t.priority}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4">
                            <Badge
                              variant={
                                t.status === 'Resolved' || t.status === 'Closed'
                                  ? 'green'
                                  : t.status === 'In Progress'
                                  ? 'blue'
                                  : 'slate'
                              }
                              size="sm"
                            >
                              {t.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">{t.assigned_to || 'Unassigned'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          ยังไม่มี Ticket ในระบบ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right 1 Col: Operations Summary & Pending Approvals */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-dark flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Pending Approvals & Alerts</span>
            </h3>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-slate-600">CAB Pending Changes</span>
                <Badge variant="purple">{changes.filter((c) => c.status === 'Pending CAB').length || 1}</Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-slate-600">Asset Warranties Expiring</span>
                <Badge variant="amber">2</Badge>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-slate-600">License Quota Depleted</span>
                <Badge variant="red">1</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Overdue Borrow Records</span>
                <Badge variant="slate">0</Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => router.push('/changes')}
              >
                ตรวจสอบรายการอนุมัติ CAB →
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
