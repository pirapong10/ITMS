# PROJECT_STATE.md: ITSM Enterprise

## 1. Project Information
- **Project Name:** IT Service Management System (ITSM Enterprise)
- **Application Type:** Enterprise Helpdesk & IT Operations Management System
- **Current Phase:** Phase 01: Setup & DB Schema
- **Overall Status:** INITIALIZED
- **Version:** v2.0-dev

---

## 2. Dynamic Phase Slicing Table

| Phase | Phase Name | Scope & Key Modules | Complexity | Risk Level | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **01** | **Setup & DB Schema** | Database Migrations (14 Tables), Seeders, Users CRUD, System Configuration & Running Sequence API | High | High | **IN PROGRESS** |
| **02** | **Core Helpdesk & SLA Engine** | Tickets Management, File Attachment, Dynamic Running ID, SLA Timer & Breach Detection, Audit Trail, CSAT Rating | High | High | PENDING |
| **03** | **IT Asset & License Management** | Asset Inventory, Straight-Line Depreciation, Warranty Alerts, QR Label Print, License Seat Allocation & Quota | Medium | Medium | PENDING |
| **04** | **Project & Task Management** | IT Project Portfolio, Milestone Auto-Progress %, Gantt Chart View, Team Workload Summary, Kanban Board (Drag-and-Drop) | Medium | Low | PENDING |
| **05** | **Daily Operations & Routines** | Asset Borrow-Return Workflow, Preventive Maintenance (PM) with Recurrence, Daily CCTV & Backup Checklists + One-Click Repair Ticket | Medium | Low | PENDING |
| **06** | **Dashboard, Global Search & System Polish** | Executive KPI Cards, MTTR/CSAT Tracking, Chart.js Visualizations, Global Search (Ctrl+K), Dark/Light Mode Theme Persistence | Low | Low | PENDING |

---

## 3. Phase Dependency Graph
```
Phase 01 (Setup, DB Schema, Users & Settings)
   │
   ├──► Phase 02 (Helpdesk & SLA Engine)
   │       │
   │       ├──► Phase 03 (Asset & License Management)
   │       │       │
   │       │       └──► Phase 05 (Daily Operations: Borrow, PM, CCTV, Backup)
   │       │
   │       └──► Phase 04 (Project & Task Management, Kanban)
   │
   └───────► Phase 06 (Dashboard Metrics, Charts, Global Search, Theme Polish)
```

---

## 4. Current Blockers & Risks
- **Active Blockers:** None
- **Key Risks:**
  - Foreign key constraints between Assets, Tickets, Borrow Records, and PM Tasks require strict referential integrity handling.
  - Timezone calculations for SLA countdown timers and MTTR metrics require UTC/Asia:Bangkok alignment.