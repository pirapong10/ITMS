# PHASE SPECIFICATION: PHASE-02A - Helpdesk & SLA Engine

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-02A`
- **Parent Epic / Feature:** `Helpdesk & SLA Engine`
- **Risk Level:** `HIGH`
- **Estimated Scope:** `Large (8-12 files)`
- **Prerequisites / Dependencies:** `PHASE-01A (Database Schema & RLS)`, `PHASE-01B (Tenant Onboarding & Identity)`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement the core IT Service Desk / Helpdesk management engine, multi-tenant ticket CRUD, automated running number generator (`TK-YYYY-XXXX`), real-time SLA calculation matrix with UTC normalization, automatic SLA pause/resume handling (`Waiting for Vendor` / `Waiting for User`), MTTR calculation, ticket audit trail timeline, canned quick responses, and customer satisfaction (CSAT) rating (FR-TK-01, FR-GL-03).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787570000000_create_helpdesk_and_sla_tables.js` (Expand `tickets`, create `ticket_audit_logs`, create `canned_responses`, enable RLS policies)
- [ ] New modules/files created:
  - `src/lib/sla.ts` (SLA matrix, countdown, auto-pause/resume, breach calculation, MTTR)
  - `src/lib/tickets.ts` (Ticket service, running number generator, audit log recorder, CSAT)
  - `app/api/v1/tickets/route.ts` (GET list with filters & POST create ticket)
  - `app/api/v1/tickets/[id]/route.ts` (GET detail & PATCH general update)
  - `app/api/v1/tickets/[id]/resolution/route.ts` (PATCH resolve ticket & record resolution)
  - `app/api/v1/tickets/[id]/csat/route.ts` (POST submit CSAT 1-5 rating & feedback)
  - `app/api/v1/canned-responses/route.ts` (GET canned responses for technicians)
- [ ] Unit & integration test files:
  - `tests/unit/sla.test.ts` (Unit tests for SLA matrix, pause, countdown, breach, MTTR)
  - `tests/unit/tickets.test.ts` (Unit tests for running number, validation, canned responses)
  - `tests/integration/tickets.test.ts` (Integration tests for full ticket lifecycle)
- [ ] Documentation updates: N/A

---

## 3. Implementation Task Breakdown
1. **Task 1: Database Migration:** Create migration adding comprehensive ticket columns (`ticket_number`, `category`, `description`, `sla_target_hours`, `sla_deadline`, `sla_paused_at`, `sla_total_paused_seconds`, `sla_breached`, `resolved_at`, `closed_at`, `resolution_notes`, `csat_rating`, `csat_feedback`), creating `ticket_audit_logs` and `canned_responses` with RLS policies enabled.
2. **Task 2: SLA Engine:** Implement SLA Matrix (`Critical`: 2h, `High`: 8h, `Medium`: 24h, `Low`: 48h), UTC deadline normalization, auto-pause/resume calculations, remaining timer, and MTTR in `src/lib/sla.ts`.
3. **Task 3: Ticket Domain Service:** Implement running number generation (`TK-2026-XXXX`), validation schemas, CRUD queries, audit log creation, and canned responses in `src/lib/tickets.ts`.
4. **Task 4: Next.js API Routes:** Implement App Router endpoints for listing, creating, detail retrieval, resolution, and CSAT rating.
5. **Task 5: Automated Tests:** Write unit tests for SLA calculation and ticket logic, and integration tests verifying multi-tenant RLS isolation and full API contract compliance.

---

## 4. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-02-01` | Running Number Generator | Automated Unit/Integration Test | Automatically assigns formatted sequence `TK-YYYY-XXXX` per tenant atomically. |
| `AC-02-02` | SLA Matrix & Deadlines | Automated Unit Test | Calculates exact UTC deadlines for Critical (2h), High (8h), Medium (24h), Low (48h). |
| `AC-02-03` | SLA Auto-Pause & Resume | Automated Unit Test | Accurately freezes SLA elapsed time during `Waiting for Vendor` and `Waiting for User` statuses. |
| `AC-02-04` | Audit Trail Logging | Integration Test | Every ticket creation, status update, assignment, and resolution records an entry in `ticket_audit_logs`. |
| `AC-02-05` | Resolution & CSAT | Integration Test | Resolving ticket computes MTTR/SLA status; CSAT endpoint records 1–5 star ratings and feedback. |

---

## 5. Security & Constraint Checklist
- [x] Multi-tenant isolation verified with Row-Level Security (RLS) on all ticket tables.
- [x] Input validation applied at API boundary (Zod).
- [x] UTC timestamp normalization for all SLA calculations.
- [x] Zero plain SQL injections (parameterized queries used).
