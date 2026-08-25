# PHASE SPECIFICATION: PHASE-03A - Billing Engine & Payment Gateway

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-03A`
- **Parent Epic / Feature:** `Billing Engine & Payment Gateway`
- **Risk Level:** `MEDIUM`
- **Estimated Scope:** `Large (10-14 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement B2B SaaS Multi-Tenant Billing Engine, Tiered Subscription Plans (Starter, Professional, Enterprise), Stripe/PayPal Checkout Integration, Multi-Currency Invoicing (`INV-YYYY-XXXX`) with 7% VAT computation, Proration handling on plan switches, and Webhook Event processing (FR-BL-01).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787600000000_create_billing_and_subscriptions_tables.js` (Create `subscription_plans`, `tenant_subscriptions`, `invoices`, `payment_transactions` with RLS)
- [ ] New modules/files created:
  - `src/lib/billing.ts` (Billing service, plan management, proration calculator, invoice generator, payment processor)
  - `app/api/v1/billing/plans/route.ts` (GET subscription plans)
  - `app/api/v1/billing/subscription/route.ts` (GET current subscription & POST create/upgrade)
  - `app/api/v1/billing/subscription/cancel/route.ts` (POST cancel subscription)
  - `app/api/v1/billing/invoices/route.ts` & `app/api/v1/billing/invoices/[id]/route.ts` (GET invoices)
  - `app/api/v1/billing/checkout/route.ts` (POST create checkout session)
  - `app/api/v1/billing/webhooks/route.ts` (POST webhook listener)
- [ ] Unit & integration test files:
  - `tests/unit/billing.test.ts`
  - `tests/integration/billing.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-03A-01` | Subscription Plan Management | Unit/Integration Test | Returns available tiers (Starter, Pro, Enterprise) with monthly/yearly pricing in USD & THB. |
| `AC-03A-02` | Subscription Lifecycle & Proration | Unit/Integration Test | Subscribes tenant to plan, calculates accurate proration on plan upgrade/downgrade. |
| `AC-03A-03` | Multi-Currency Invoicing | Integration Test | Generates `INV-YYYY-XXXX` with accurate subtotal, 7% VAT, and total in specified currency. |
| `AC-03A-04` | Payment Webhooks | Integration Test | Processes `payment_intent.succeeded` or `PAYMENT.CAPTURE.COMPLETED`, creates paid invoice & transaction log. |
| `AC-03A-05` | Multi-Tenant Isolation | Integration Test | Ensures Tenant A cannot view or access invoices or payment transactions of Tenant B. |
