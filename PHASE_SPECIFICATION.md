# PHASE SPECIFICATION: PHASE-02B - IT Asset & License Management

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-02B`
- **Parent Epic / Feature:** `IT Asset & License Management`
- **Risk Level:** `MEDIUM`
- **Estimated Scope:** `Large (8-12 files)`
- **Prerequisites / Dependencies:** `PHASE-01A (Database Schema & RLS)`, `PHASE-01B (Tenant Onboarding & Identity)`, `PHASE-02A (Helpdesk & SLA Engine)`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement IT Asset Management (Hardware Asset Inventory, Straight-Line Depreciation 20%/yr, Warranty Expiry Alerts, QR Code Label data), Unified Asset Lifecycle Timeline, and Software/Cloud License Seat Allocation with Quota Enforcement (FR-AS-01, FR-LC-01).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787580000000_create_assets_and_licenses_tables.js` (Create `assets`, `asset_lifecycle_logs`, `licenses`, `license_allocations` with RLS policies)
- [ ] New modules/files created:
  - `src/lib/assets.ts` (Asset service, straight-line depreciation engine, warranty checker, lifecycle aggregator)
  - `src/lib/licenses.ts` (License service, atomic seat allocation, quota enforcement, expiry alerts)
  - `app/api/v1/assets/route.ts` (GET list & POST create asset)
  - `app/api/v1/assets/[id]/route.ts` (GET detail, PATCH update, DELETE asset)
  - `app/api/v1/assets/[id]/depreciation/route.ts` (GET current book value and depreciation schedule)
  - `app/api/v1/assets/[id]/lifecycle/route.ts` (GET unified lifecycle history)
  - `app/api/v1/licenses/route.ts` (GET list & POST create license)
  - `app/api/v1/licenses/[id]/route.ts` (GET detail, PATCH update, DELETE license)
  - `app/api/v1/licenses/[id]/allocations/route.ts` (POST allocate seat)
  - `app/api/v1/licenses/[id]/allocations/[allocId]/route.ts` (DELETE unallocate seat)
- [ ] Unit & integration test files:
  - `tests/unit/assets.test.ts` (Depreciation, warranty alerts, asset validations)
  - `tests/unit/licenses.test.ts` (Seat quota limit, license expiry alerts)
  - `tests/integration/assets.test.ts` (Asset CRUD, depreciation API, lifecycle API, tenant isolation)
  - `tests/integration/licenses.test.ts` (License CRUD, seat allocation, quota block, unassignment)
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Implementation Task Breakdown
1. **Task 1: Database Migration:** Create tables `assets`, `asset_lifecycle_logs`, `licenses`, `license_allocations` with foreign keys, RLS enabled, and app_user permissions.
2. **Task 2: Asset & Depreciation Logic:** Implement straight-line depreciation (20%/yr), monthly schedule, warranty alert thresholds (Near Expire <= 60 days, Expired <= 0 days), running tag generator (`AST-YYYY-XXXX`).
3. **Task 3: License & Seat Allocation Logic:** Implement atomic seat allocation preventing over-subscription (`allocated_seats < total_seats`), quota alerts, and license expiry checks.
4. **Task 4: Next.js API Routes:** Build App Router routes for Assets, Depreciation, Lifecycle, Licenses, and Seat Allocations.
5. **Task 5: Automated Tests:** Write unit tests and integration tests verifying multi-tenant RLS, calculations, and error handling.
6. **Task 6: Quality Gate & Checkpoint:** Execute Quality Gate pipeline, commit git checkpoint, write `PHASE_REPORT.md`, update `PROJECT_STATE.md`.

---

## 4. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-02B-01` | Asset Tag & Depreciation | Unit/Integration Test | Automatically assigns `AST-YYYY-XXXX`; computes accurate straight-line book value from purchase date. |
| `AC-02B-02` | Warranty Expiry Alerts | Unit Test | Flags assets as `Expiring Soon` when warranty <= 60 days and `Expired` when <= 0 days. |
| `AC-02B-03` | Unified Lifecycle Timeline | Integration Test | Retrieves chronologically aggregated event history for each asset. |
| `AC-02B-04` | License Quota Enforcement | Unit/Integration Test | Allows seat allocation up to `total_seats`; rejects with 409 Conflict if quota full; decrements on unassign. |
| `AC-02B-05` | Multi-Tenant RLS | Integration Test | Ensures Assets and Licenses belonging to Tenant A cannot be accessed or modified by Tenant B. |

---

## 5. Security & Constraint Checklist
- [x] RLS policies applied to `assets`, `asset_lifecycle_logs`, `licenses`, `license_allocations`.
- [x] Input validation applied at API boundary with Zod.
- [x] Foreign keys configured with CASCADE on tenant deletion.
