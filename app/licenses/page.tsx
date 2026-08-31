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
  Key,
  Plus,
  Search,
  Users,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Selected License Detail & Allocations
  const [selectedLicense, setSelectedLicense] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Allocate Seat Modal
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [allocUserName, setAllocUserName] = useState('');
  const [allocUserEmail, setAllocUserEmail] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [allocLoading, setAllocLoading] = useState(false);
  const [allocError, setAllocError] = useState<string | null>(null);

  // New License Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [softwareName, setSoftwareName] = useState('');
  const [licenseType, setLicenseType] = useState('Subscription');
  const [vendor, setVendor] = useState('');
  const [totalSeats, setTotalSeats] = useState('10');
  const [costPerSeat, setCostPerSeat] = useState('1500');
  const [expiryDate, setExpiryDate] = useState('');

  const fetchLicenses = async () => {
    setLoading(true);
    let url = '/api/v1/licenses?';
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const res = await apiFetch(url);
    if (res.data?.licenses) {
      setLicenses(res.data.licenses);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLicenses();
  }, []);

  const handleSelectLicense = async (licenseId: string) => {
    setDetailLoading(true);
    const res = await apiFetch(`/api/v1/licenses/${licenseId}`);
    if (res.data) {
      setSelectedLicense(res.data);
    }
    setDetailLoading(false);
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const res = await apiFetch('/api/v1/licenses', {
      method: 'POST',
      body: JSON.stringify({
        software_name: softwareName,
        license_type: licenseType,
        vendor: vendor || undefined,
        total_seats: Number(totalSeats),
        cost_per_seat: Number(costPerSeat),
        expiry_date: expiryDate || undefined,
      }),
    });

    setCreateLoading(false);

    if (res.data) {
      setNewModalOpen(false);
      setSoftwareName('');
      setVendor('');
      fetchLicenses();
    }
  };

  const handleAllocateSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;
    setAllocLoading(true);
    setAllocError(null);

    const licenseId = selectedLicense.license?.id || selectedLicense.id;
    const res = await apiFetch(`/api/v1/licenses/${licenseId}/allocations`, {
      method: 'POST',
      body: JSON.stringify({
        user_name: allocUserName,
        user_email: allocUserEmail || undefined,
        notes: allocNotes || undefined,
      }),
    });

    setAllocLoading(false);

    if (res.error) {
      setAllocError(res.error);
      return;
    }

    if (res.data) {
      setAllocModalOpen(false);
      setAllocUserName('');
      setAllocUserEmail('');
      setAllocNotes('');
      handleSelectLicense(licenseId);
      fetchLicenses();
    }
  };

  const handleUnallocateSeat = async (allocId: string) => {
    if (!selectedLicense) return;
    const licenseId = selectedLicense.license?.id || selectedLicense.id;

    const res = await apiFetch(`/api/v1/licenses/${licenseId}/allocations/${allocId}`, {
      method: 'DELETE',
    });

    if (res.data?.success) {
      handleSelectLicense(licenseId);
      fetchLicenses();
    }
  };

  const licObj = selectedLicense?.license || selectedLicense;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">Software License & Seat Quotas</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              บริหารจัดการสิทธิ์การใช้งานซอฟต์แวร์ ตัดโควตาที่นั่งอัตโนมัติ และป้องกันการใช้งานเกินลิขสิทธิ์
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchLicenses} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม License ใหม่</span>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ค้นหาชื่อซอฟต์แวร์, ผู้ผลิต (Vendor), หรือ License Tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLicenses()}
              />
            </div>
            <Button variant="primary" size="sm" onClick={fetchLicenses}>
              ค้นหา
            </Button>
          </div>
        </Card>

        {/* License Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-border font-semibold">
                <tr>
                  <th className="py-2.5 px-4">License Tag</th>
                  <th className="py-2.5 px-4">ชื่อซอฟต์แวร์ (Software)</th>
                  <th className="py-2.5 px-4">ประเภท</th>
                  <th className="py-2.5 px-4">Vendor</th>
                  <th className="py-2.5 px-4">การจัดสรรที่นั่ง (Seats Usage)</th>
                  <th className="py-2.5 px-4">วันหมดอายุ</th>
                  <th className="py-2.5 px-4">สถานะโควตา</th>
                  <th className="py-2.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {licenses.length > 0 ? (
                  licenses.map((lic) => {
                    const total = Number(lic.total_seats);
                    const allocated = Number(lic.allocated_seats);
                    const available = total - allocated;
                    const percent = Math.round((allocated / total) * 100) || 0;

                    return (
                      <tr
                        key={lic.id}
                        onClick={() => handleSelectLicense(lic.id)}
                        className="hover:bg-amber-50/30 cursor-pointer transition-all"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">{lic.license_tag}</td>
                        <td className="py-3 px-4 font-semibold text-dark">{lic.software_name}</td>
                        <td className="py-3 px-4 text-slate-600">{lic.license_type}</td>
                        <td className="py-3 px-4 text-slate-600">{lic.vendor || '-'}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-semibold">
                              <span>
                                {allocated} / {total} ที่นั่ง
                              </span>
                              <span className={available === 0 ? 'text-danger' : 'text-slate-500'}>
                                (ว่าง {available})
                              </span>
                            </div>
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${percent >= 100 ? 'bg-danger' : percent >= 80 ? 'bg-amber-500' : 'bg-primary'}`}
                                style={{ width: `${Math.min(100, percent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {lic.expiry_date ? new Date(lic.expiry_date).toLocaleDateString('th-TH') : 'ถาวร (Perpetual)'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              lic.status_info?.status === 'Active'
                                ? 'green'
                                : lic.status_info?.status === 'Expiring Soon'
                                ? 'amber'
                                : lic.status_info?.status === 'Depleted'
                                ? 'red'
                                : 'slate'
                            }
                          >
                            {lic.status_info?.status || lic.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectLicense(lic.id);
                            }}
                          >
                            ดูผู้ใช้งาน
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูล License ซอฟต์แวร์
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* License Detail Modal with Allocations List */}
        {selectedLicense && (
          <Modal
            isOpen={!!selectedLicense}
            onClose={() => setSelectedLicense(null)}
            title={`License: ${licObj.software_name}`}
            description={`Tag: ${licObj.license_tag} | Vendor: ${licObj.vendor || '-'}`}
            maxWidth="2xl"
          >
            <div className="space-y-5">
              {/* Meta Card */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-border text-center text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">ที่นั่งทั้งหมด</span>
                  <span className="text-sm font-extrabold text-dark">{licObj.total_seats} Seats</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">จัดสรรแล้ว</span>
                  <span className="text-sm font-extrabold text-primary">{licObj.allocated_seats} Seats</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">คงเหลือว่าง</span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {Number(licObj.total_seats) - Number(licObj.allocated_seats)} Seats
                  </span>
                </div>
              </div>

              {/* Allocations Toolbar */}
              <div className="flex items-center justify-between pt-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>รายชื่อผู้ถือครองสิทธิ์ (Allocated Users)</span>
                </h4>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setAllocModalOpen(true)}
                  disabled={Number(licObj.allocated_seats) >= Number(licObj.total_seats)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>จัดสรรที่นั่ง (Allocate Seat)</span>
                </Button>
              </div>

              {/* Allocations List */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                    <tr>
                      <th className="py-2 px-3">ชื่อผู้ใช้งาน</th>
                      <th className="py-2 px-3">อีเมล</th>
                      <th className="py-2 px-3">วันที่ได้รับสิทธิ์</th>
                      <th className="py-2 px-3 text-right">ถอนสิทธิ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedLicense.allocations && selectedLicense.allocations.length > 0 ? (
                      selectedLicense.allocations.map((al: any) => (
                        <tr key={al.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-dark">{al.user_name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{al.user_email || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">
                            {new Date(al.allocated_at).toLocaleDateString('th-TH')}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleUnallocateSeat(al.id)}
                              className="text-danger hover:bg-red-50 p-1 rounded transition-all"
                              title="ยกเลิกการจัดสรรที่นั่ง"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          ยังไม่มีการจัดสรรที่นั่งให้กับผู้ใช้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Modal>
        )}

        {/* Allocate Seat Modal */}
        <Modal
          isOpen={allocModalOpen}
          onClose={() => setAllocModalOpen(false)}
          title="จัดสรรที่นั่งสิทธิ์การใช้งาน (Allocate License Seat)"
          description={`กำหนดสิทธิ์ให้กับผู้ใช้งานสำหรับ ${licObj?.software_name}`}
        >
          <form onSubmit={handleAllocateSeat} className="space-y-4">
            {allocError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-danger flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{allocError}</span>
              </div>
            )}

            <Input
              label="ชื่อผู้ใช้งาน (User Name)"
              value={allocUserName}
              onChange={(e) => setAllocUserName(e.target.value)}
              placeholder="เช่น สมศักดิ์ มั่นคง"
              required
            />

            <Input
              label="อีเมล (User Email)"
              type="email"
              value={allocUserEmail}
              onChange={(e) => setAllocUserEmail(e.target.value)}
              placeholder="somsak@company.com"
            />

            <Input
              label="หมายเหตุ (Notes)"
              value={allocNotes}
              onChange={(e) => setAllocNotes(e.target.value)}
              placeholder="ใช้งานสำหรับโปรเจกต์ Mobile App"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAllocModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={allocLoading}>
                ยืนยันการจัดสรรที่นั่ง
              </Button>
            </div>
          </form>
        </Modal>

        {/* Create License Modal */}
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="เพิ่มสิทธิ์การใช้งานซอฟต์แวร์ใหม่ (New License)"
          description="บันทึกจำนวนที่นั่ง วันหมดอายุสัญญา เพื่อควบคุมโควตา"
        >
          <form onSubmit={handleCreateLicense} className="space-y-4">
            <Input
              label="ชื่อซอฟต์แวร์ (Software Name)"
              value={softwareName}
              onChange={(e) => setSoftwareName(e.target.value)}
              placeholder="เช่น Microsoft 365, Adobe Creative Cloud, Figma"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="ประเภทสิทธิ์ (License Type)"
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                options={[
                  { value: 'Subscription', label: 'Subscription (รายเดือน/ปี)' },
                  { value: 'Perpetual', label: 'Perpetual (ซื้อขาด)' },
                  { value: 'OEM', label: 'OEM (มาพร้อมเครื่อง)' },
                ]}
              />

              <Input
                label="ผู้ผลิต (Vendor)"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Microsoft, Adobe, JetBrains"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="จำนวนที่นั่ง (Total Seats)"
                type="number"
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                required
              />

              <Input
                label="ราคาต่อที่นั่ง (บาท)"
                type="number"
                value={costPerSeat}
                onChange={(e) => setCostPerSeat(e.target.value)}
              />

              <Input
                label="วันหมดอายุสัญญา"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={createLoading}>
                บันทึก License
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
