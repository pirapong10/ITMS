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
  Laptop,
  Plus,
  Search,
  DollarSign,
  ShieldCheck,
  Clock,
  User,
  History,
  TrendingDown,
  RefreshCw,
  Building,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Asset Detail Modal
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Asset Modal
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('35000');
  const [salvageValue, setSalvageValue] = useState('0');
  const [depreciationRate, setDepreciationRate] = useState('20.0');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [department, setDepartment] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    let url = '/api/v1/assets?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;
    if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;

    const res = await apiFetch(url);
    if (res.data?.assets) {
      setAssets(res.data.assets);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
  }, [statusFilter, categoryFilter]);

  const handleSelectAsset = async (assetId: string) => {
    setDetailLoading(true);
    const [detailRes, lifeRes] = await Promise.all([
      apiFetch(`/api/v1/assets/${assetId}`),
      apiFetch(`/api/v1/assets/${assetId}/lifecycle`),
    ]);

    if (detailRes.data) {
      setSelectedAsset({
        ...detailRes.data,
        lifecycle: lifeRes.data || [],
      });
    }
    setDetailLoading(false);
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    const res = await apiFetch('/api/v1/assets', {
      method: 'POST',
      body: JSON.stringify({
        name,
        category,
        model: model || undefined,
        serial_number: serialNumber || undefined,
        purchase_cost: Number(purchaseCost),
        salvage_value: Number(salvageValue),
        depreciation_rate: Number(depreciationRate),
        warranty_expiry: warrantyExpiry || undefined,
        assigned_to: assignedTo || undefined,
        department: department || undefined,
        status: 'In Use',
      }),
    });

    setCreateLoading(false);

    if (res.data) {
      setNewModalOpen(false);
      setName('');
      setModel('');
      setSerialNumber('');
      fetchAssets();
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-dark tracking-tight">IT Assets Inventory & Depreciation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ทะเบียนสินทรัพย์ไอที การคำนวณค่าเสื่อมราคาแบบเส้นตรง (Straight-Line) และแจ้งเตือนประกัน
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchAssets} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>ลงทะเบียนสินทรัพย์ใหม่</span>
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-border rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="ค้นหา Asset Tag, ชื่อสินทรัพย์, Serial Number หรือผู้ถือครอง..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
              />
            </div>

            <div className="w-40">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'ทุกสถานะสินทรัพย์' },
                  { value: 'In Use', label: 'In Use (ใช้งานอยู่)' },
                  { value: 'In Store', label: 'In Store (อยู่ในคลัง)' },
                  { value: 'Maintenance', label: 'Maintenance (ส่งซ่อม)' },
                  { value: 'Disposed', label: 'Disposed (จำหน่ายออก)' },
                ]}
              />
            </div>

            <div className="w-40">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: '', label: 'ทุกประเภทสินทรัพย์' },
                  { value: 'Hardware', label: 'Hardware (คอมพิวเตอร์/โน้ตบุ๊ก)' },
                  { value: 'Network', label: 'Network (เราเตอร์/สวิตช์)' },
                  { value: 'Server', label: 'Server & Storage' },
                  { value: 'Peripheral', label: 'Peripheral (จอ/เครื่องพิมพ์)' },
                ]}
              />
            </div>

            <Button variant="primary" size="sm" onClick={fetchAssets}>
              ค้นหา
            </Button>
          </div>
        </Card>

        {/* Asset Table */}
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 border-b border-border font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Asset Tag</th>
                  <th className="py-2.5 px-4">ชื่อสินทรัพย์ (Name)</th>
                  <th className="py-2.5 px-4">หมวดหมู่</th>
                  <th className="py-2.5 px-4">ราคาทุน (Cost)</th>
                  <th className="py-2.5 px-4">มูลค่าปัจจุบัน (Book Value)</th>
                  <th className="py-2.5 px-4">สถานะประกัน (Warranty)</th>
                  <th className="py-2.5 px-4">สถานะ</th>
                  <th className="py-2.5 px-4">ผู้ถือครอง</th>
                  <th className="py-2.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.length > 0 ? (
                  assets.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => handleSelectAsset(a.id)}
                      className="hover:bg-emerald-50/30 cursor-pointer transition-all"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">{a.asset_tag}</td>
                      <td className="py-3 px-4 font-semibold text-dark max-w-xs truncate">
                        {a.name}
                        {a.model && <span className="text-[11px] text-slate-400 block font-normal">{a.model}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{a.category}</td>
                      <td className="py-3 px-4 font-mono font-medium">฿{Number(a.purchase_cost).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        ฿
                        {a.depreciation_info
                          ? Math.round(a.depreciation_info.currentBookValue).toLocaleString()
                          : Number(a.purchase_cost).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            a.warranty_info?.status === 'Active'
                              ? 'green'
                              : a.warranty_info?.status === 'Expiring Soon'
                              ? 'amber'
                              : a.warranty_info?.status === 'Expired'
                              ? 'red'
                              : 'slate'
                          }
                        >
                          {a.warranty_info?.status || 'No Warranty'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={a.status === 'In Use' ? 'green' : 'slate'}>{a.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{a.assigned_to || 'คลังส่วนกลาง'}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAsset(a.id);
                          }}
                        >
                          ดูค่าเสื่อม/ประวัติ
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลสินทรัพย์ในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Asset Detail Modal with Depreciation & Lifecycle */}
        {selectedAsset && (
          <Modal
            isOpen={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
            title={`Asset Detail: ${selectedAsset.asset?.asset_tag || selectedAsset.asset_tag}`}
            description={selectedAsset.asset?.name || selectedAsset.name}
            maxWidth="2xl"
          >
            <div className="space-y-5">
              {/* Asset Meta Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-border text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">สถานะ:</span>
                  <Badge variant="green">{selectedAsset.asset?.status || selectedAsset.status}</Badge>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Serial Number:</span>
                  <span className="font-mono font-semibold text-dark">{selectedAsset.asset?.serial_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">ผู้ถือครอง:</span>
                  <span className="font-semibold text-dark">{selectedAsset.asset?.assigned_to || 'คลังกลาง'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">แผนก (Department):</span>
                  <span className="font-semibold text-dark">{selectedAsset.asset?.department || '-'}</span>
                </div>
              </div>

              {/* Depreciation Calculation Panel */}
              {selectedAsset.depreciation_info && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-primary" />
                    <span>การคำนวณค่าเสื่อมราคา (Straight-Line Depreciation 20%/Year)</span>
                  </h4>

                  <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/40 border border-blue-100 rounded-lg text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">ราคาทุนเริ่มแรก</span>
                      <span className="text-sm font-extrabold text-dark">
                        ฿{selectedAsset.depreciation_info.purchaseCost.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">ค่าเสื่อมสะสม</span>
                      <span className="text-sm font-extrabold text-rose-600">
                        -฿{Math.round(selectedAsset.depreciation_info.accumulatedDepreciation).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">มูลค่าคงเหลือตามบัญชี</span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        ฿{Math.round(selectedAsset.depreciation_info.currentBookValue).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Unified Lifecycle Timeline */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-purple-600" />
                  <span>ประวัติวงจรชีวิตสินทรัพย์ (Unified Asset Lifecycle Timeline)</span>
                </h4>

                <div className="p-3 bg-slate-50/70 rounded-lg border border-border max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                  {selectedAsset.lifecycle && selectedAsset.lifecycle.length > 0 ? (
                    selectedAsset.lifecycle.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-2.5 text-xs pb-2 border-b border-border/60 last:border-0 last:pb-0">
                        <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-dark">{log.event_type}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.created_at).toLocaleDateString('th-TH')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{log.details}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-3">ยังไม่มีบันทึกการเปลี่ยนแปลง</p>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Create Asset Modal */}
        <Modal
          isOpen={newModalOpen}
          onClose={() => setNewModalOpen(false)}
          title="ลงทะเบียนสินทรัพย์ใหม่ (Register IT Asset)"
          description="บันทึกข้อมูลอุปกรณ์เพื่อสร้าง Asset Tag อัตโนมัติและเริ่มต้นคิดค่าเสื่อมราคา"
        >
          <form onSubmit={handleCreateAsset} className="space-y-4">
            <Input
              label="ชื่ออุปกรณ์ / สินทรัพย์ (Asset Name)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น MacBook Pro 16 M3 Max, Dell Latitude 5440"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="หมวดหมู่ (Category)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Hardware', label: 'Hardware (คอมพิวเตอร์/โน้ตบุ๊ก)' },
                  { value: 'Network', label: 'Network (เราเตอร์/สวิตช์)' },
                  { value: 'Server', label: 'Server & Storage' },
                  { value: 'Peripheral', label: 'Peripheral (จอ/เครื่องพิมพ์)' },
                ]}
              />

              <Input
                label="รุ่น (Model)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Latitude 5440 / A2991"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Serial Number"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="SN-12345678"
              />

              <Input
                label="วันหมดอายุประกัน (Warranty Expiry)"
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="ราคาทุน (Cost บาท)"
                type="number"
                value={purchaseCost}
                onChange={(e) => setPurchaseCost(e.target.value)}
                required
              />

              <Input
                label="มูลค่าซาก (Salvage)"
                type="number"
                value={salvageValue}
                onChange={(e) => setSalvageValue(e.target.value)}
              />

              <Input
                label="อัตราค่าเสื่อม (%/ปี)"
                type="number"
                value={depreciationRate}
                onChange={(e) => setDepreciationRate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="มอบหมายให้ (Assigned To)"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="ชื่อพนักงาน"
              />

              <Input
                label="แผนก (Department)"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering, IT, HR"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setNewModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={createLoading}>
                ลงทะเบียนสินทรัพย์
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
