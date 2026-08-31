'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Building2, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { apiFetch, setStoredToken, setStoredUser, setStoredTenantId } from '../../src/lib/api-client';

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        company_name: companyName,
        subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      }),
    });

    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.data?.token) {
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setStoredTenantId(res.data.tenant.id);
      router.push('/');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-lg p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black mx-auto shadow-md shadow-primary/20">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-xl font-extrabold text-dark tracking-tight">สร้างองค์กรใหม่ (Create Tenant)</h1>
          <p className="text-xs text-slate-500">เริ่มต้นใช้งานระบบ ITSM Enterprise สำหรับทีมและองค์กรของคุณ</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ชื่อองค์กร / บริษัท (Company Name)"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (!subdomain) {
                  setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                }
              }}
              placeholder="Acme Corporation"
              required
            />

            <Input
              label="Subdomain ระบบ"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="acme"
              helperText=".itsm.enterprise"
              required
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-bold text-slate-700 mb-3">ข้อมูลผู้ดูแลระบบหลัก (Super Administrator)</p>
            
            <div className="space-y-3">
              <Input
                label="ชื่อ-นามสกุล (Admin Name)"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="สมชาย ใจดี"
                required
              />

              <Input
                label="อีเมล (Admin Email)"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@acme.com"
                required
              />

              <Input
                label="รหัสผ่าน (Password)"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                required
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5 mt-2" loading={loading}>
            <span>สร้างองค์กรและเริ่มต้นใช้งาน (Get Started)</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="text-center pt-2">
          <a href="/login" className="text-xs text-primary font-semibold hover:underline">
            ← มีบัญชีอยู่แล้ว? เข้าสู่ระบบที่นี่ (Sign In)
          </a>
        </div>
      </div>
    </div>
  );
}
