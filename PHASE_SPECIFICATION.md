# PHASE SPECIFICATION: PHASE-06A - Problem Management (RCA & KEDB)

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-06A`
- **Parent Epic / Feature:** `Global Standards: ITIL Problem Management, RCA & KEDB`
- **Risk Level:** `MEDIUM`
- **Estimated Scope:** `Medium (10-12 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`, `PHASE-02C`, `PHASE-03A`, `PHASE-03B`, `PHASE-04A`, `PHASE-04B`, `PHASE-05A`, `PHASE-05B`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement ITIL Problem Management module with Root Cause Analysis (RCA), Known Error Database (KEDB) publication, Incident Clustering (linking Helpdesk tickets to problems), and one-click resolution cascade (FR-GL-10).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787650000000_create_problems_and_kedb_tables.js` (Create `problems`, `problem_ticket_links` with RLS)
- [ ] New modules/files created:
  - `src/lib/problems.ts` (Problem lifecycle, running ID `PRB-YYYY-XXXX`, RCA, KEDB search, incident cascade)
  - `app/api/v1/problems/route.ts` (GET & POST problems)
  - `app/api/v1/problems/[id]/route.ts` (GET & PATCH problem)
  - `app/api/v1/problems/[id]/link-tickets/route.ts` (POST link tickets)
  - `app/api/v1/problems/[id]/link-tickets/[ticketId]/route.ts` (DELETE unlink ticket)
  - `app/api/v1/problems/[id]/tickets/route.ts` (GET linked tickets)
  - `app/api/v1/problems/[id]/resolve/route.ts` (POST resolve & cascade)
  - `app/api/v1/kedb/route.ts` (GET search Known Error Database)
- [ ] Unit & integration test files:
  - `tests/unit/problems.test.ts`
  - `tests/integration/problems.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-06A-01` | Problem Lifecycle & Running ID | Unit/Integration Test | Generates `PRB-YYYY-XXXX` and tracks states (`Open`, `Investigating`, `Known Error`, `Resolved`). |
| `AC-06A-02` | Incident Clustering | Integration Test | Links and unlinks multiple helpdesk tickets to a problem record. |
| `AC-06A-03` | Known Error Database (KEDB) | Integration Test | Publishes known errors with workarounds and allows instant full-text search. |
| `AC-06A-04` | Resolution Cascade | Integration Test | Resolving a problem cascades resolution status and notes to all linked incident tickets. |
