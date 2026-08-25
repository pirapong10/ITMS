# PHASE SPECIFICATION: PHASE-02C - Project, Task & Routine Management

---

## 1. Phase Metadata
- **Phase ID:** `PHASE-02C`
- **Parent Epic / Feature:** `Project, Task & Routine Management`
- **Risk Level:** `MEDIUM`
- **Estimated Scope:** `Large (12-16 files)`
- **Prerequisites / Dependencies:** `PHASE-01A`, `PHASE-01B`, `PHASE-02A`, `PHASE-02B`

---

## 2. Objective & Deliverables
### 2.1 Core Goal
Implement IT Project Portfolio with Milestone & Task Progress Auto-Calculation, Team Kanban Board (Drag-and-Drop Order Tracking), Equipment Borrow-Return Workflow with Overdue Alerts, Recurring Preventive Maintenance (PM Engine), and Daily Operations Checklists (CCTV/Backup) with One-Click Repair Ticket Integration (FR-PJ-01, FR-TS-01).

### 2.2 Expected Deliverables
- [ ] Database Migrations:
  - `migrations/1787590000000_create_projects_tasks_and_routines_tables.js` (Create `projects`, `project_tasks`, `tasks`, `borrow_records`, `pm_schedules`, `routine_checklists` with RLS)
- [ ] New modules/files created:
  - `src/lib/projects.ts` (Project service, task progress % auto-calculation, Kanban order)
  - `src/lib/routines.ts` (Borrow-return workflow, PM recurrence engine, checklist to ticket generator)
  - `app/api/v1/projects/route.ts` & `app/api/v1/projects/[id]/route.ts`
  - `app/api/v1/projects/[id]/tasks/route.ts` & `app/api/v1/projects/[id]/tasks/[taskId]/route.ts`
  - `app/api/v1/tasks/route.ts` & `app/api/v1/tasks/[id]/route.ts`
  - `app/api/v1/borrow-records/route.ts` & `app/api/v1/borrow-records/[id]/return/route.ts`
  - `app/api/v1/pm-schedules/route.ts` & `app/api/v1/pm-schedules/[id]/execute/route.ts`
  - `app/api/v1/routine-checklists/route.ts` & `app/api/v1/routine-checklists/[id]/create-ticket/route.ts`
- [ ] Unit & integration test files:
  - `tests/unit/projects.test.ts`
  - `tests/unit/routines.test.ts`
  - `tests/integration/projects.test.ts`
  - `tests/integration/routines.test.ts`
- [ ] Documentation updates: `PHASE_REPORT.md`

---

## 3. Phase Contract & Acceptance Criteria
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-02C-01` | Project Auto-Progress % | Unit/Integration Test | Completing project tasks dynamically updates parent project `progress_percent` (0-100%). |
| `AC-02C-02` | Kanban Task Status & Order | Unit/Integration Test | Moves tasks across columns (Backlog, Todo, In Progress, Review, Done) preserving order index. |
| `AC-02C-03` | Borrow-Return Workflow | Integration Test | Records borrowed equipment; calculates overdue status; updates asset state upon return. |
| `AC-02C-04` | PM Recurrence Engine | Unit/Integration Test | Accurately calculates next due date for Daily, Weekly, Monthly, Quarterly, Yearly intervals. |
| `AC-02C-05` | Routine Fail to Ticket | Integration Test | Failed checklist item can trigger creation of linked repair ticket (`TK-YYYY-XXXX`). |
| `AC-02C-06` | Multi-Tenant RLS | Integration Test | Strict RLS isolation across all project, task, borrow, PM, and checklist records. |
