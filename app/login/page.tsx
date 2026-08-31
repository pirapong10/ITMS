'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Mail, ArrowRight, Shield, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Modal } from '../../src/components/ui/Modal';
import { apiFetch, setStoredToken, setStoredUser, setStoredTenantId } from '../../src/lib/api-client';
import { ToastProvider, useToast } from '../../src/components/ui/ToastContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA Challenge State
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaUserId, setMfaUserId] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenant_id: tenantId }),
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.data?.mfa_required) {
      setMfaUserId(res.data.user_id);
      setMfaModalOpen(true);
      return;
    }

    if (res.data?.token && res.data?.user) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setStoredTenantId(res.data.tenant_id || tenantId);
      toast.success('เข้าสู่ระบบสำเร็จ กำลังนำท่านเข้าสู่ Dashboard...', 'ยินดีต้อนรับ');
      router.push('/');
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    setMfaLoading(true);

    const res = await apiFetch('/api/v1/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify({ user_id: mfaUserId, code: mfaCode }),
    });

    setMfaLoading(false);

    if (res.error) {
      setMfaError(res.error);
      return;
    }

    if (res.data?.token && res.data?.user) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setStoredTenantId(res.data.tenant_id || tenantId);
      setMfaModalOpen(false);
      toast.success('ยืนยันตัวตน MFA สำเร็จ!', 'ปลอดภัย');
      router.push('/');
    }
  };

  const fillDemo = (demoEmail: string, demoRole: string) => {
    setTenantId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    setEmail(demoEmail);
    setPassword('Admin@123456');
    setError(null);
    toast.info(`กรอกข้อมูลบัญชีทดสอบ ${demoRole} เรียบร้อยแล้ว`, 'Quick Demo');
  };

  const handleSsoClick = (provider: string) => {
    toast.info(`กำลังจำลองการเชื่อมต่อ ${provider} SSO Provider...`, 'Enterprise SSO');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface border border-border rounded-2xl shadow-xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-primary text-white items-center justify-center shadow-lg shadow-primary/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-xl font-black text-dark tracking-tight">ITSM Enterprise</h1>
          <p className="text-xs text-slate-500">
            ระบบบริหารจัดการงานบริการและสินทรัพย์ไอทีระดับองค์กร (SaaS)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-danger animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Tenant ID / องค์กร"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
            required
          />

          <Input
            label="อีเมลผู้ใช้งาน (Email)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@company.com"
            required
          />

          <Input
            label="รหัสผ่าน (Password)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" variant="primary" className="w-full h-10 mt-2" loading={loading}>
            <span>เข้าสู่ระบบ (Sign In)</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* SSO Providers */}
        <div className="relative pt-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-3 text-[11px] font-semibold text-slate-400">
              หรือเข้าสู่ระบบด้วย Enterprise SSO
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSsoClick('Okta')}
              className="text-[11px]"
            >
              Okta
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSsoClick('Google Workspace')}
              className="text-[11px]"
            >
              Google
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSsoClick('Microsoft Entra ID')}
              className="text-[11px]"
            >
              MS Entra
            </Button>
          </div>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div className="pt-3 border-t border-border/80 text-center">
          <p className="text-[11px] font-semibold text-slate-400 mb-2">ทดลองเข้าสู่ระบบด่วน (Quick Demo):</p>
          <div className="flex justify-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => fillDemo('admin@company.com', 'IT Admin')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              IT Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('tech@company.com', 'Technician')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              Technician
            </button>
            <button
              type="button"
              onClick={() => fillDemo('user@company.com', 'General User')}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              General User
            </button>
          </div>
        </div>

        {/* Register Organization Link */}
        <div className="pt-2 text-center text-xs text-slate-500">
          ยังไม่มีบัญชีองค์กร?{' '}
          <a href="/register" className="font-bold text-primary hover:underline">
            ลงทะเบียนองค์กรใหม่
          </a>
        </div>
      </div>

      {/* MFA Challenge Modal */}
      <Modal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
        title="การยืนยันตัวตนแบบหลายขั้นตอน (MFA)"
        description="กรุณากรอกรหัส OTP 6 หลักจากแอปพลิเคชัน Authenticator ของท่าน"
      >
        <form onSubmit={handleVerifyMfa} className="space-y-4">
          {mfaError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-danger">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mfaError}</span>
            </div>
          )}

          <Input
            label="รหัส OTP 6 หลัก (Authenticator Code)"
            type="text"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setMfaModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" loading={mfaLoading}>
              ยืนยันรหัส OTP
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
}
