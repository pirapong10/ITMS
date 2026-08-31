'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '../../src/components/layout/AppShell';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import {
  CreditCard,
  Check,
  Zap,
  Download,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../../src/lib/api-client';
import { useToast } from '../../src/components/ui/ToastContext';

export default function BillingPage() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [currentSub, setCurrentSub] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [currency, setCurrency] = useState<'THB' | 'USD'>('THB');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const fetchBillingData = async () => {
    setLoading(true);
    const [pRes, sRes, iRes] = await Promise.all([
      apiFetch('/api/v1/billing/plans'),
      apiFetch('/api/v1/billing/subscription'),
      apiFetch('/api/v1/billing/invoices'),
    ]);

    if (pRes.data) setPlans(Array.isArray(pRes.data) ? pRes.data : (pRes.data as any).plans || []);
    if (sRes.data) setCurrentSub(sRes.data);
    if (iRes.data) setInvoices(Array.isArray(iRes.data) ? iRes.data : (iRes.data as any).invoices || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    const res = await apiFetch('/api/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        billing_cycle: isYearly ? 'yearly' : 'monthly',
        currency,
      }),
    });

    setCheckoutLoading(null);

    if (res.data?.session_url || res.data?.session_id) {
      toast.success(`Stripe Checkout Session พร้อมใช้งาน: ${res.data.session_id}`, 'Billing Checkout');
      fetchBillingData();
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
            <h2 className="text-xl font-black text-dark tracking-tight">Billing & SaaS Subscriptions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แพ็กเกจการใช้งาน ใบเสร็จรับเงิน และการคำนวณภาษีมูลค่าเพิ่ม (VAT 7%)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchBillingData} loading={loading}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรช</span>
            </Button>
          </div>
        </div>

        {/* Current Subscription Banner */}
        {currentSub && (
          <Card className="p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white border-0 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="blue" size="sm">
                    {currentSub.status || 'Active'}
                  </Badge>
                  <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    Current Plan
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight">{currentSub.plan_name || 'Enterprise Pro Plan'}</h3>
                <p className="text-xs text-slate-300">
                  ต่ออายุสัญญาครั้งถัดไป: {currentSub.current_period_end ? new Date(currentSub.current_period_end).toLocaleDateString('th-TH') : '31 ธันวาคม 2026'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-black">
                    {currency === 'THB' ? '฿3,500' : '$99'}
                  </span>
                  <span className="text-xs text-slate-400 block">/ เดือน (รวม VAT 7%)</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Billing Cycle & Currency Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>เลือกแพ็กเกจการใช้งาน (Subscription Plans)</span>
          </h3>

          <div className="flex items-center gap-3">
            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  !isYearly ? 'bg-white text-dark shadow-xs' : 'text-slate-500'
                }`}
              >
                รายเดือน (Monthly)
              </button>
              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  isYearly ? 'bg-white text-dark shadow-xs' : 'text-slate-500'
                }`}
              >
                รายปี (Yearly - ประหยัด 20%)
              </button>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => setCurrency('THB')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  currency === 'THB' ? 'bg-primary text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                THB ฿
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  currency === 'USD' ? 'bg-primary text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                USD $
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Plans Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              id: 'plan_starter',
              name: 'Starter Plan',
              desc: 'เหมาะสำหรับธุรกิจขนาดเล็กและทีมไอทีเริ่มต้น',
              priceTHB: isYearly ? 14900 : 1490,
              priceUSD: isYearly ? 420 : 42,
              features: ['ไม่จำกัด Ticket Helpdesk', 'รองรับ IT Assets สูงสุด 50 ชิ้น', 'License Quota 10 ที่นั่ง', 'SLA 24/7 Monitoring'],
              popular: false,
            },
            {
              id: 'plan_pro',
              name: 'Professional Plan',
              desc: 'สำหรับองค์กรขนาดกลางที่ต้องการ ITIL ครบวงจร',
              priceTHB: isYearly ? 34900 : 3490,
              priceUSD: isYearly ? 990 : 99,
              features: [
                'ทุกฟีเจอร์ใน Starter',
                'ไม่จำกัด IT Assets & Licenses',
                'CAB Change Management & Quorum',
                'KEDB Known Error Database',
                'PM Recurrence & Routine Checklists',
              ],
              popular: true,
            },
            {
              id: 'plan_enterprise',
              name: 'Enterprise SaaS',
              desc: 'ระดับองค์กรใหญ่ พร้อม SSO, SCIM และ SOC 2 Audit',
              priceTHB: isYearly ? 79900 : 7990,
              priceUSD: isYearly ? 2290 : 229,
              features: [
                'ทุกฟีเจอร์ใน Professional',
                'Enterprise SSO (Okta, Entra ID)',
                'SCIM 2.0 Real-time Provisioning',
                'GDPR DSAR & Append-Only Logs',
                'Dedicated 99.99% SLA Guarantee',
              ],
              popular: false,
            },
          ].map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col justify-between p-6 space-y-6 ${
                plan.popular ? 'border-2 border-primary shadow-md bg-blue-50/10' : ''
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-black text-dark">{plan.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-dark">
                    {currency === 'THB' ? `฿${plan.priceTHB.toLocaleString()}` : `$${plan.priceUSD.toLocaleString()}`}
                  </span>
                  <span className="text-xs text-slate-400">/{isYearly ? 'ปี' : 'เดือน'}</span>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  {plan.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant={plan.popular ? 'primary' : 'ghost'}
                className="w-full py-2.5"
                onClick={() => handleCheckout(plan.id)}
                loading={checkoutLoading === plan.id}
              >
                <span>เลือกแพ็กเกจนี้ (Subscribe)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>

        {/* Invoices History Table */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-dark flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-primary" />
            <span>ประวัติใบแจ้งหนี้และใบเสร็จ (Invoices History)</span>
          </h3>

          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">เลขที่ใบแจ้งหนี้ (Invoice ID)</th>
                  <th className="py-2.5 px-4">รอบบิล (Period)</th>
                  <th className="py-2.5 px-4">ยอดก่อนภาษี (Subtotal)</th>
                  <th className="py-2.5 px-4">ภาษีมูลค่าเพิ่ม (VAT 7%)</th>
                  <th className="py-2.5 px-4">ยอดสุทธิ (Total)</th>
                  <th className="py-2.5 px-4">สถานะการชำระ</th>
                  <th className="py-2.5 px-4 text-right">ดาวน์โหลด PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{inv.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-600">{inv.period || '2026-08'}</td>
                      <td className="py-3 px-4 font-mono">฿{Number(inv.subtotal || 3500).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        ฿{Number(inv.tax_amount || 245).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-dark">
                        ฿{Number(inv.total_amount || 3745).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={inv.status === 'Paid' ? 'green' : 'amber'}>{inv.status || 'Paid'}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toast.info(`กำลังจัดเตรียมดาวน์โหลดใบเสร็จรับเงิน ${inv.invoice_number}...`, 'Invoice PDF')}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      ยังไม่มีประวัติใบแจ้งหนี้ในระบบ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
