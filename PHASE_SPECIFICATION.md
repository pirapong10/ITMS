# PHASE SPECIFICATION: PHASE-03B - Super Admin Portal

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-03B`
- **Parent Epic / Feature:** `Super Admin Portal & Platform Governance`
- **Risk Level:** `LOW`
- **Estimated Scope:** `Medium (8-10 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement Platform Super Admin Portal capabilities for Cross-Region Tenant Management, Global Subscription Plan Configuration, Tenant Lifecycle Suspension/Activation, and Platform-wide Usage & MRR/ARR Revenue Monitoring.

### 2.2 Expected Deliverables
- [ ] New modules/files created:
  - `src/lib/super-admin.ts` (Super Admin service, cross-tenant aggregator, MRR calculation, plan governance)
  - `app/api/v1/admin/overview/route.ts` (Platform metrics, active tenants, MRR/ARR)
  - `app/api/v1/admin/tenants/route.ts` (List all tenants with usage)
  - `app/api/v1/admin/tenants/[id]/status/route.ts` (Suspend/Activate tenant)
  - `app/api/v1/admin/plans/route.ts` & `app/api/v1/admin/plans/[id]/route.ts` (Global plans CRUD)
- [ ] Unit & integration test files:
  - `tests/unit/super-admin.test.ts`
  - `tests/integration/super-admin.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-03B-01` | Role-Based Super Admin Guard | Unit/Integration Test | Rejects non-super admin callers with 403 Forbidden. |
| `AC-03B-02` | Platform MRR & Analytics | Unit/Integration Test | Aggregates total tenants, active subscriptions, tickets, assets, and computed MRR/ARR. |
| `AC-03B-03` | Cross-Tenant Management | Integration Test | Super Admin lists all tenants and toggles tenant operational status (`Active` / `Suspended`). |
| `AC-03B-04` | Global Plan Governance | Integration Test | Creates, updates, and archives subscription plans dynamically. |
