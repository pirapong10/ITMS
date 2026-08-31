'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../src/components/layout/AppShell';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { Modal } from '../../src/components/ui/Modal';
import { StatCard } from '../../src/components/ui/StatCard';
import {
  ShieldCheck,
  Building2,
  DollarSign,
  Key,
  Lock,
  RefreshCw,
  Plus,
  Power,
  Copy,
  Check,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';
import { useToast } from '../../src/components/ui/ToastContext';

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [overview, setOverview] = useState<any | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // SCIM Token Generator State
  const [scimModalOpen, setScimModalOpen] = useState(false);
  const [scimTenantId, setScimTenantId] = useState('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  const [scimToken, setScimToken] = useState<string | null>(null);
  const [scimCopied, setScimCopied] = useState(false);
  const [scimLoading, setScimLoading] = useState(false);

  // SSO Config State
  const [ssoModalOpen, setSsoModalOpen] = useState(false);
  const [ssoIssuer, setSsoIssuer] = useState('https://login.microsoftonline.com/tenant-id/v2.0');
  const [ssoClientId, setSsoClientId] = useState('client-app-id-12345');
  const [ssoClientSecret, setSsoClientSecret] = useState('secret-super-key');
  const [ssoLoading, setSsoLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    const [oRes, tRes] = await Promise.all([
      apiFetch('/api/v1/admin/overview'),
      apiFetch('/api/v1/admin/tenants'),
    ]);

    if (oRes.data) setOverview(oRes.data);
    if (tRes.data?.tenants) setTenants(tRes.data.tenants);
    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    const res = await apiFetch(`/api/v1/admin/tenants/${tenantId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus }),
    });

    if (res.data) {
      toast.success(`เปลี่ยนสถานะ Tenant เป็น ${nextStatus} เรียบร้อยแล้ว`, 'Tenant Status');
      fetchAdminData();
    } else if (res.error) {
      toast.error(res.error, 'เกิดข้อผิดพลาด');
    }
  };

  const handleGenerateScimToken = async () => {
    setScimLoading(true);
    const res = await apiFetch('/api/v1/scim/token', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: scimTenantId }),
    });

    setScimLoading(false);

    if (res.data?.raw_token) {
      setScimToken(res.data.raw_token);
      toast.success('สร้าง SCIM Token ใหม่สำเร็จ!', 'SCIM Token');
    } else if (res.error) {
      toast.error(res.error, 'เกิดข้อผิดพลาด');
    }
  };

  const handleSaveSsoConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSsoLoading(true);

    const res = await apiFetch('/api/v1/sso/config', {
      method: 'POST',
      body: JSON.stringify({
        provider_type: 'OIDC',
        issuer: ssoIssuer,
        client_id: ssoClientId,
        client_secret: ssoClientSecret,
      }),
    });

    setSsoLoading(false);
    setSsoModalOpen(false);

    if (res.data) {
      toast.success('บันทึกการตั้งค่า Enterprise SSO (OIDC/SAML) เรียบร้อยแล้ว!', 'SSO Config');
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
            <h2 className="text-xl font-black text-dark tracking-tight">Super Administrator Platform Control</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์กลางควบคุมระบบ Multi-Tenant SaaS, การเงินภาพรวม (MRR/ARR), และการเชื่อมต่อ IdP (SSO / SCIM)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchAdminData} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSsoModalOpen(true)}>
              <Lock className="w-3.5 h-3.5" />
              <span>SSO Config</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setScimModalOpen(true)}>
              <Key className="w-3.5 h-3.5" />
              <span>สร้าง SCIM Token</span>
            </Button>
          </div>
        </div>

        {/* Global Platform KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Active Tenants"
            value={overview?.total_tenants || (tenants.length > 0 ? tenants.length : 8)}
            subtext="องค์กรที่ใช้งานระบบทั้งหมด"
            icon={Building2}
            variant="blue"
          />
          <StatCard
            title="Monthly Recurring Revenue"
            value={`฿${(overview?.mrr_thb || 128500).toLocaleString()}`}
            subtext={`เทียบเท่า $${(overview?.mrr_usd || 3670).toLocaleString()} USD`}
            icon={DollarSign}
            variant="green"
            trend={{ value: '18.4%', isPositive: true }}
          />
          <StatCard
            title="Annual Recurring Revenue"
            value={`฿${(overview?.arr_thb || 1542000).toLocaleString()}`}
            subtext="ประมาณการรายได้ประจำปี (ARR)"
            icon={DollarSign}
            variant="slate"
          />
          <StatCard
            title="Global Security Guard"
            value="SOC 2 Type II"
            subtext="Append-Only Audit Logs Enforced"
            icon={ShieldCheck}
            variant="green"
          />
        </div>

        {/* Multi-Tenant Management Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary" />
              <span>รายชื่อองค์กรทั้งหมด (Tenant Management Registry)</span>
            </h3>
            <span className="text-xs text-slate-500">จัดการสิทธิ์ระงับการใช้งาน หรือเปิดใช้งาน Tenant</span>
          </div>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Tenant ID</th>
                  <th className="py-2.5 px-4">ชื่อองค์กร (Organization Name)</th>
                  <th className="py-2.5 px-4">Subdomain</th>
                  <th className="py-2.5 px-4">แพ็กเกจ (Plan)</th>
                  <th className="py-2.5 px-4">สถานะองค์กร</th>
                  <th className="py-2.5 px-4">วันที่สร้าง</th>
                  <th className="py-2.5 px-4 text-right">การจัดการสถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.length > 0 ? (
                  tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{t.id}</td>
                      <td className="py-3 px-4 font-bold text-dark">{t.company_name || t.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {t.subdomain ? `${t.subdomain}.itsm.enterprise` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="purple" size="sm">
                          {t.plan_name || 'Enterprise Pro'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={t.status === 'Active' ? 'green' : 'red'}>{t.status || 'Active'}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(t.created_at || Date.now()).toLocaleDateString('th-TH')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant={t.status === 'Active' ? 'ghost-danger' : 'outline'}
                          onClick={() => handleToggleTenantStatus(t.id, t.status || 'Active')}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{t.status === 'Active' ? 'ระงับ (Suspend)' : 'เปิดใช้งาน (Activate)'}</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูล Tenant ในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Modal: SCIM Token Generator */}
        <Modal
          isOpen={scimModalOpen}
          onClose={() => {
            setScimModalOpen(false);
            setScimToken(null);
            setScimCopied(false);
          }}
          title="สร้าง SCIM 2.0 Bearer Token"
          description="สำหรับนำไปใส่ใน Okta หรือ Azure AD เพื่อทำ Real-time User Provisioning"
        >
          <div className="space-y-4">
            <Input
              label="Tenant ID ที่ต้องการสร้าง Token"
              value={scimTenantId}
              onChange={(e) => setScimTenantId(e.target.value)}
              required
            />

            {scimToken ? (
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-xs break-all relative">
                <p className="text-[10px] text-slate-400 mb-1">SCIM Bearer Token (กรุณาคัดลอกและเก็บรักษาเป็นความลับ):</p>
                <span>{scimToken}</span>
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-white/10 text-white hover:bg-white/20"
                    onClick={() => {
                      navigator.clipboard.writeText(scimToken);
                      setScimCopied(true);
                      toast.info('คัดลอก SCIM Bearer Token เรียบร้อยแล้ว', 'Clipboard');
                      setTimeout(() => setScimCopied(false), 2000);
                    }}
                  >
                    {scimCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{scimCopied ? 'คัดลอกแล้ว' : 'คัดลอก Token'}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="primary" className="w-full" onClick={handleGenerateScimToken} loading={scimLoading}>
                Generate SCIM 2.0 Token
              </Button>
            )}
          </div>
        </Modal>

        {/* Modal: SSO IdP Config */}
        <Modal
          isOpen={ssoModalOpen}
          onClose={() => setSsoModalOpen(false)}
          title="ตั้งค่าเชื่อมต่อ Enterprise SSO (SAML 2.0 / OIDC)"
          description="กำหนดค่า Identity Provider (Okta, Google, Microsoft Entra ID)"
        >
          <form onSubmit={handleSaveSsoConfig} className="space-y-4">
            <Input
              label="OIDC Issuer URL"
              value={ssoIssuer}
              onChange={(e) => setSsoIssuer(e.target.value)}
              placeholder="https://login.microsoftonline.com/{tenant-id}/v2.0"
              required
            />

            <Input
              label="Client ID / Application ID"
              value={ssoClientId}
              onChange={(e) => setSsoClientId(e.target.value)}
              required
            />

            <Input
              label="Client Secret Key"
              type="password"
              value={ssoClientSecret}
              onChange={(e) => setSsoClientSecret(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setSsoModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" loading={ssoLoading}>
                บันทึกการตั้งค่า SSO
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
