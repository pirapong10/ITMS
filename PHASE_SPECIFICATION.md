# PHASE SPECIFICATION: PHASE-06B - Change Enablement & CAB Workflow

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-06B`
- **Parent Epic / Feature:** `Global Standards: ITIL Change Enablement & CAB Approval Workflow`
- **Risk Level:** `HIGH`
- **Estimated Scope:** `Medium (10-12 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`, `PHASE-04A`, `PHASE-04B`, `PHASE-05A`, `PHASE-05B`, `PHASE-06A`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement ITIL Change Enablement with Change Request lifecycle (`CR-YYYY-XXXX`), Risk and Impact assessment, Implementation & Rollback plan documentation, Multi-stage CAB (Change Advisory Board) approval voting, and Post-Implementation Review (PIR) recording (FR-GL-11).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787660000000_create_change_requests_and_cab_tables.js` (Extend `change_requests`, create `cab_approvals` with RLS)
- [ ] New modules/files created:
  - `src/lib/changes.ts` (Change request lifecycle, running ID `CR-YYYY-XXXX`, CAB quorum calculator, execution & rollback tracker)
  - `app/api/v1/changes/route.ts` (GET & POST change requests)
  - `app/api/v1/changes/[id]/route.ts` (GET & PATCH change request)
  - `app/api/v1/changes/[id]/submit-cab/route.ts` (POST submit for CAB review)
  - `app/api/v1/changes/[id]/approve/route.ts` (POST record CAB decision)
  - `app/api/v1/changes/[id]/execute/route.ts` (POST update execution state / PIR)
  - `app/api/v1/changes/[id]/approvals/route.ts` (GET CAB approval list)
- [ ] Unit & integration test files:
  - `tests/unit/changes.test.ts`
  - `tests/integration/changes.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-06B-01` | Change Request Running ID | Unit/Integration Test | Generates `CR-YYYY-XXXX` and enforces implementation & rollback plan validations. |
| `AC-06B-02` | CAB Multi-Stage Approval | Integration Test | Distributes CAB reviews; aggregates multi-member decisions to approve or reject change. |
| `AC-06B-03` | Change Execution & Rollback | Integration Test | Tracks implementation transitions (`Implementing` -> `Completed` / `Rolled Back`) with PIR notes. |
| `AC-06B-04` | Tenant Isolation | Integration Test | Enforces strict multi-tenant boundary on change requests and CAB approval decisions. |
