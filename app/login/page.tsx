'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Mail, ArrowRight, Shield, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Modal } from '../../src/components/ui/Modal';
import { apiFetch, setStoredToken, setStoredUser, setStoredTenantId } from '../../src/lib/api-client';

export default function LoginPage() {
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

    if (res.data?.token) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setStoredTenantId(res.data.tenant_id || tenantId);
      router.push('/');
    }
  };

  const handleMfaVerify = async () => {
    setMfaError(null);
    setMfaLoading(true);

    const res = await apiFetch('/api/v1/mfa/challenge', {
      method: 'POST',
      body: JSON.stringify({ userId: mfaUserId, code: mfaCode }),
    });

    setMfaLoading(false);

    if (res.error) {
      setMfaError(res.error);
      return;
    }

    if (res.data?.token) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setStoredTenantId(res.data.tenant_id || tenantId);
      router.push('/');
    }
  };

  const fillDemo = (role: 'admin' | 'tech' | 'user') => {
    setTenantId('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    if (role === 'admin') {
      setEmail('admin@company.com');
      setPassword('Admin@123456');
    } else if (role === 'tech') {
      setEmail('tech@company.com');
      setPassword('Admin@123456');
    } else {
      setEmail('user@company.com');
      setPassword('Admin@123456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-lg p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black mx-auto shadow-md shadow-primary/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-xl font-extrabold text-dark tracking-tight">ITSM Enterprise</h1>
          <p className="text-xs text-slate-500">ลงชื่อเข้าใช้งานระบบบริหารจัดการไอทีและบริการระดับองค์กร</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Tenant ID / องค์กร"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="เช่น tenant-default หรือ acme-corp"
            required
          />

          <Input
            label="อีเมลผู้ใช้งาน (Email)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
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

          <Button type="submit" variant="primary" className="w-full py-2.5" loading={loading}>
            <span>เข้าสู่ระบบ (Sign In)</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        {/* Single Sign-On (SSO) Section */}
        <div className="pt-2">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-border w-full" />
            <span className="bg-surface px-2 text-[10px] uppercase font-bold text-slate-400 absolute">
              หรือเข้าสู่ระบบด้วย Enterprise SSO
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => alert('SSO Okta Redirect Simulator')}
              className="text-[11px]"
            >
              Okta
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => alert('SSO Google Workspace Redirect')}
              className="text-[11px]"
            >
              Google
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => alert('SSO Microsoft Entra ID Redirect')}
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
              onClick={() => fillDemo('admin')}
              className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-primary hover:text-white transition-all"
            >
              👑 IT Admin
            </button>
            <button
              type="button"
              onClick={() => fillDemo('tech')}
              className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-primary hover:text-white transition-all"
            >
              🛠️ Technician
            </button>
            <button
              type="button"
              onClick={() => fillDemo('user')}
              className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-primary hover:text-white transition-all"
            >
              👤 General User
            </button>
          </div>
        </div>

        <div className="text-center">
          <a href="/register" className="text-xs text-primary font-semibold hover:underline">
            ลงทะเบียนองค์กรใหม่ (Register New Tenant) →
          </a>
        </div>
      </div>

      {/* MFA Challenge Modal */}
      <Modal
        isOpen={mfaModalOpen}
        onClose={() => setMfaModalOpen(false)}
        title="การยืนยันตัวตนสองขั้นตอน (MFA Security)"
        description="กรุณากรอกรหัส 6 หลักจาก Google Authenticator หรือรหัส Backup Recovery Code"
      >
        <div className="space-y-4">
          {mfaError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-danger">
              {mfaError}
            </div>
          )}

          <Input
            label="รหัส OTP หรือ Backup Code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder="เช่น 123456 หรือ 8-digit backup code"
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setMfaModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="primary" onClick={handleMfaVerify} loading={mfaLoading}>
              ยืนยันรหัส MFA
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
