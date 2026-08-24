# PHASE SPECIFICATIONS SUITE (PHASE 01 - PHASE 06)
**Project:** IT Service Management System (ITSM Enterprise)  
**Protocol:** Autonomous Web App Development Protocol v1.0  
**Target Quality Framework:** Deterministic Verification & Quality Gates

---

# PHASE_SPECIFICATION.md: Phase 01 - Setup & DB Schema

## 1. Phase Metadata
- **Phase ID:** PHASE-01
- **Phase Name:** Setup & DB Schema
- **Target Completion Quality Gate:** QG-01
- **Complexity:** High
- **Risk Level:** High
- **Prerequisites / Dependencies:** Initial Repository Setup, Clean Environment

---

## 2. Objective & Scope
จัดเตรียมโครงสร้างพื้นฐานของระบบ Data Layer, การทำ Database Schema Migrations ให้ครบถ้วนทั้ง 14 ตาราง, จัดทำ Seed Data เริ่มต้นสำหรับทดสอบ, ระบบจัดการผู้ใช้งาน (Users Management) และระบบจัดการ System Settings พร้อม Running Code Prefix Generator

---

## 3. Detailed Deliverables & Technical Specifications

### A. Database Migrations (14 Tables)
1. `users` — ข้อมูลผู้ใช้ระบบ (`id`, `name`, `department`, `role`, `status`)
2. `system_settings` — คอนฟิกูเรชัน (`key`, `value` JSONB สำหรับเก็บ Prefixes และ Master Categories)
3. `assets` — ข้อมูลทะเบียนคุมทรัพย์สินไอที
4. `tickets` — ตารางใบแจ้งซ่อมและปัญหาไอที
5. `ticket_audit_logs` — บันทึกประวัติและขั้นตอนการแก้ปัญหา (Audit Trail)
6. `projects` — ข้อมูลโครงการไอที
7. `project_tasks` — งานย่อย/Milestones ของโครงการ
8. `tasks` — รายการงานส่วนตัวและงานทีม
9. `licenses` — ทะเบียนซอฟต์แวร์และ Cloud Licenses
10. `license_allocations` — การจัดสรร Seat ให้พนักงาน/อุปกรณ์
11. `borrow_records` — ประวัติและสถานะการยืม-คืนอุปกรณ์
12. `pm_tasks` — แผนบำรุงรักษาเชิงป้องกัน (PM)
13. `cctv_cameras` & `cctv_logs` — ทะเบียนกล้องวงจรปิดและบันทึกผลการตรวจรายวัน
14. `backup_jobs` & `backup_logs` — ทะเบียนงานสำรองข้อมูลเซิร์ฟเวอร์และบันทึกประวัติการ Backup

### B. Seed Data Integration
- บัญชีผู้ใช้เริ่มต้น:
  - `USR-001`: Somchai Administrator (System Admin, IT Department)
  - `USR-002`: Anan Tech (Technician, IT Support)
  - `USR-003`: Nipha Service (User, IT Service Desk)
- Running Code Prefixes เริ่มต้น:
  - Tickets: `TK-2026-`, Projects: `PRJ-2026-`, Assets: `AST-2026-`
- หมวดหมู่เริ่มต้น (Master Categories):
  - Project Categories, Ticket Categories, Asset Categories

### C. Backend API Contracts
- `GET /api/v1/users`, `POST /api/v1/users`, `PUT /api/v1/users/{id}`, `DELETE /api/v1/users/{id}`
- `GET /api/v1/settings`, `PUT /api/v1/settings`
- `GET /api/v1/settings/next-code?type={ticket|project|asset|license|borrow|pm|user|task}`

---

## 4. Phase Contract & Acceptance Criteria (Quality Gate 01)
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-01-01` | Database Schema Migrations | Automated Script Execution | สร้าง 14 Tables สำเร็จ 100% ไม่มี Foreign Key/Index Error |
| `AC-01-02` | Seed Data Population | Integration Test | ข้อมูล Master data, Prefixes, และ Users เริ่มต้นถูก Seed ครบถ้วน |
| `AC-01-03` | User CRUD Endpoints | API Contract Test | ผ่านการทดสอบครบทุก HTTP Status (200, 201, 400, 404, 409) |
| `AC-01-04` | Running Code Sequence | Unit/Integration Test | API `next-code` ออกรหัสเรียงลำดับตาม Prefix ที่ระบุถูกต้อง |

---

## 5. Security & Constraint Checklist
- [ ] Database credentials อ่านจาก Environment Variables เท่านั้น (ห้าม Hardcode)
- [ ] Schema รองรับ Soft-delete และ Timestamp (`created_at`, `updated_at`)
- [ ] มีการกำหนด Index บน Foreign Key และ Search Fields สำคัญ

---
---

# PHASE_SPECIFICATION.md: Phase 02 - Core Helpdesk & SLA Engine

## 1. Phase Metadata
- **Phase ID:** PHASE-02
- **Phase Name:** Core Helpdesk & SLA Engine
- **Target Completion Quality Gate:** QG-02
- **Complexity:** High
- **Risk Level:** High
- **Prerequisites / Dependencies:** PHASE-01, Clean Git Checkpoint

---

## 2. Objective & Scope
พัฒนาระบบศูนย์รับแจ้งซ่อมและบริการด้านไอที (Helpdesk Service Desk), ระบบคำนวณและติดตาม SLA แบบ Real-time, ระบบ Audit Trail Timeline, ระบบประเมินความพึงพอใจ CSAT และการพิมพ์ใบแจ้งซ่อม (Print Ticket Sheet)

---

## 3. Detailed Deliverables & Technical Specifications

### A. SLA Matrix Engine
- กำหนดระยะเวลา SLA ตามระดับความสำคัญ:
  - **Critical:** 2 ชั่วโมง
  - **High:** 8 ชั่วโมง
  - **Medium:** 24 ชั่วโมง
  - **Low:** 48 ชั่วโมง
- สถานะข้อยกเว้น SLA:
  - `Waiting for Vendor` และ `Waiting for User` ให้ทำการ Pause การนับเวลา SLA
  - `Resolved` และ `Closed` บันทึกสถานะเป็น SLA Met / SLA Breached ตามเวลาจริง

### B. Features & Endpoints
- `GET /api/v1/tickets`: Query พร้อมตัวกรองค้นหา, สถานะ, ความสำคัญ, หมวดหมู่ และสถานะ Breached
- `POST /api/v1/tickets`: สร้าง Ticket ใหม่ พร้อมรองรับการแนบไฟล์รูปภาพ (`multipart/form-data` / Base64)
- `GET /api/v1/tickets/{id}`: รายละเอียด Ticket พร้อม Audit Trail Log
- `PATCH /api/v1/tickets/{id}/resolution`: บันทึกการแก้ไขปัญหา, เปลี่ยนผู้รับผิดชอบ, อัปเดตสถานะ พร้อมเพิ่มประวัติใน Audit Log
- `POST /api/v1/tickets/{id}/csat`: บันทึกคะแนนความพึงพอใจ (1-5 ดาว) พร้อมข้อคิดเห็น
- **Quick Canned Responses:** ข้อความทางลัดสำหรับงานช่าง (Reset รหัสผ่าน, เปลี่ยนชิ้นส่วน, ตั้งค่า Network)
- **Printable Service Sheet:** เทมเพลตสำหรับพิมพ์ใบรับเรื่องและผลการดำเนินงานซ่อม

---

## 4. Phase Contract & Acceptance Criteria (Quality Gate 02)
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-02-01` | Ticket Dynamic ID Generation | Integration Test | สร้าง Ticket ออกรหัส Running Number อัตโนมัติ (`TK-2026-XXX`) |
| `AC-02-02` | Real-time SLA Tracking | Unit Test | คำนวณเวลาคงเหลือและตรวจจับสถานะ Warning/Breached ได้แม่นยำ |
| `AC-02-03` | SLA Pause Logic | Unit/Integration Test | Pause SLA ทันทีเมื่อตั๋วเปลี่ยนเป็นสถานะ `Waiting for Vendor/User` |
| `AC-02-04` | Audit Trail Immutability | Integration Test | บันทึกประวัติการแก้ปัญหาลง `ticket_audit_logs` ครบทุก Action |
| `AC-02-05` | CSAT Workflow | API Test | บันทึกคะแนน 1-5 ดาว และอัปเดตสถานะการประเมินสำเร็จ |

---

## 5. Security & Constraint Checklist
- [ ] File Upload ต้องจำกัดนามสกุลไฟล์ (.jpg, .png, .pdf) และขนาดไฟล์ไม่เกิน 5MB
- [ ] คำนวณเวลา SLA อ้างอิงตาม Server Timezone (`Asia/Bangkok` / UTC) ป้องกัน Client Drift
- [ ] ไม่เกิด Regression กับ Phase 01 Endpoints

---
---

# PHASE_SPECIFICATION.md: Phase 03 - IT Asset & License Management

## 1. Phase Metadata
- **Phase ID:** PHASE-03
- **Phase Name:** IT Asset & License Management
- **Target Completion Quality Gate:** QG-03
- **Complexity:** Medium
- **Risk Level:** Medium
- **Prerequisites / Dependencies:** PHASE-01, PHASE-02

---

## 2. Objective & Scope
พัฒนาระบบทะเบียนคุมทรัพย์สินและอุปกรณ์ไอที (Hardware Assets), ระบบคำนวณค่าเสื่อมราคาและเตือนวันหมดประกัน, การพิมพ์ QR Code Label, ประวัติการใช้งานแบบรวมศูนย์ (Lifecycle History) และระบบจัดการ Software/Cloud License Seat Allocations

---

## 3. Detailed Deliverables & Technical Specifications

### A. Asset Register & Depreciation
- ทะเบียนคุม Asset Tag (`AST-2026-XXX`), Serial Number, ผู้ถือครอง, แผนก, สถานที่ตั้ง
- การคำนวณค่าเสื่อมราคาแบบเส้นตรง (Straight-line Depreciation 20% ต่อปี) เพื่อแสดงมูลค่าคงเหลือ
- การแจ้งเตือนวันหมดประกัน (Warranty Expiry Alert: Near Expire <= 60 วัน, Expired <= 0 วัน)
- **Print QR Code Label Modal:** พิมพ์ป้ายสติกเกอร์รหัสทรัพย์สินพร้อม QR Code

### B. Unified Asset Lifecycle History
- ดึงข้อมูลประวัติกิจกรรมย้อนหลังของ Asset แต่ละตัวจาก 3 แหล่งข้อมูล:
  1. ประวัติการแจ้งซ่อม (Helpdesk Tickets)
  2. ประวัติการยืม-คืน (Borrow Records)
  3. ประวัติการบำรุงรักษา (PM Tasks)

### C. Software & Cloud License Management
- ทะเบียน License (`LIC-2026-XXX`): Cloud Seat-based, Subscription, Perpetual
- ระบบจัดการ Seat Allocations: กำหนดผู้ถือครอง Seat, ตรวจสอบโควต้าคงเหลือ (Quota Full Alert)
- แจ้งเตือน License หมดอายุ (Expiry Alert: <= 30 วัน, <= 90 วัน)

---

## 4. Phase Contract & Acceptance Criteria (Quality Gate 03)
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-03-01` | Asset CRUD & Depreciation | Unit/Integration Test | คำนวณมูลค่าคงเหลือแบบ Straight-line จากวันซื้อถูกต้อง |
| `AC-03-02` | Unified Lifecycle Timeline | Integration Test | แสดงประวัติ Ticket, Borrow, PM ของ Asset แต่ละชิ้นเรียงตาม Timestamp |
| `AC-03-03` | License Seat Allocation | Unit Test | ป้องกันการจัดสรร Seat เกินจำนวน `seatsTotal` และรองรับ Unassign |
| `AC-03-04` | Label Print Rendering | UI Functional Test | แสดงผล Modal สติกเกอร์ QR Code พร้อมข้อมูล Asset Tag สำหรับการพิมพ์ |

---

## 5. Security & Constraint Checklist
- [ ] Foreign Key Constraints เชื่อมโยงกับ Table Users อย่างถูกต้อง
- [ ] ป้องกันการลบ (Delete) Asset ที่ยังมีประวัติ Ticket ค้างอยู่ (Cascade Rule / Prevent Orphan Records)

---
---

# PHASE_SPECIFICATION.md: Phase 04 - Project & Task Management

## 1. Phase Metadata
- **Phase ID:** PHASE-04
- **Phase Name:** Project & Task Management
- **Target Completion Quality Gate:** QG-04
- **Complexity:** Medium
- **Risk Level:** Low
- **Prerequisites / Dependencies:** PHASE-01, PHASE-02

---

## 2. Objective & Scope
พัฒนาระบบบริหารและติดตามโครงการไอที (IT Project Portfolio), การคำนวณความคืบหน้าอัตโนมัติตาม Milestones, มุมมอง Gantt Chart Timeline และระบบบริหารงานส่วนตัว/งานทีม (Task Management) พร้อมมุมมอง Kanban Board แบบ Drag-and-Drop

---

## 3. Detailed Deliverables & Technical Specifications

### A. IT Project Management
- ทะเบียนโครงการ (`PRJ-2026-XXX`): Budget, Owner, Priority, Status, Timeline (Start/End Date)
- ระบบ Milestones/Tasks ย่อย: ติ๊กสถานะงานเพื่อคำนวณ Progress % ของโครงการแบบอัตโนมัติ
- **Dual View:** สลับมุมมองระหว่าง Table View และ Gantt Chart Timeline (มกราคม - ธันวาคม)

### B. Task Management (Overview & Kanban)
- **Role Selector Mode:**
  - ดูในฐานะหัวหน้างาน (Supervisor Overview): สรุปภาระงานรายบุคคล (Team Workload Table) และตารางงานรวม
  - ดูในฐานะทีมงาน: สลับดูและจัดการงานรายบุคคล
- **Kanban Board View:**
  - 4 คอลัมน์สถานะ: `To Do`, `In Progress`, `Review`, `Done`
  - รองรับ Drag-and-Drop เพื่ออัปเดตสถานะงานทันที
  - การตรวจสอบและไฮไลต์งานที่เลยกำหนดส่ง (Overdue Task Warning)

---

## 4. Phase Contract & Acceptance Criteria (Quality Gate 04)
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-04-01` | Milestone Auto-Progress | Unit Test | ติ๊ก Completed Milestone คำนวณ Progress % ของ Project ได้แม่นยำ |
| `AC-04-02` | Gantt Chart Timeline | UI Verification | เรนเดอร์ Bar Timeline ตามช่วงเดือนของ Start Date และ End Date ถูกต้อง |
| `AC-04-03` | Workload Distribution | Integration Test | แสดงผลจำนวนงานแต่ละสถานะและความสำเร็จรายบุคคลถูกต้อง |
| `AC-04-04` | Kanban State Synchronization | API & E2E Test | การ Drag & Drop ย้ายคอลัมน์อัปเดตสถานะและ Timestamp ลง Database ทันที |

---

## 5. Security & Constraint Checklist
- [ ] Task Assignment ตรวจสอบสิทธิ์เฉพาะผู้ใช้ที่ Active ในระบบ
- [ ] จัดการ Input Sanitization สำหรับรายละเอียดและหมายเหตุของโครงการ

---
---

# PHASE_SPECIFICATION.md: Phase 05 - Daily Operations & Routines

## 1. Phase Metadata
- **Phase ID:** PHASE-05
- **Phase Name:** Daily Operations & Routines
- **Target Completion Quality Gate:** QG-05
- **Complexity:** Medium
- **Risk Level:** Low
- **Prerequisites / Dependencies:** PHASE-01, PHASE-02, PHASE-03

---

## 2. Objective & Scope
พัฒนาระบบงานปฏิบัติการประจำวัน ได้แก่ ระบบยืม-คืนอุปกรณ์สำรอง (Borrow-Return), แผนบำรุงรักษาเชิงป้องกัน (PM) พร้อมระบบสร้างรอบถัดไปอัตโนมัติ, ระบบตรวจเช็คกล้องวงจรปิด CCTV ประจำวัน และระบบตรวจเช็ค Server Backup ประจำวัน พร้อมฟังก์ชันเปิด Ticket แจ้งซ่อมด่วน

---

## 3. Detailed Deliverables & Technical Specifications

### A. Borrow-Return Management
- ทะเบียนการยืม (`BRW-2026-XXX`) พร้อมข้อตกลงยินยอมรับผิดชอบอุปกรณ์ (Agreement Checkbox)
- **Auto Status Sync:** เมื่อทำการยืม สถานะ Asset ในคลังจะเปลี่ยนเป็น `In Use` และเมื่อรับคืนจะกลับเป็น `In Stock` อัตโนมัติ
- ตรวจจับรายการที่เกินกำหนดส่งคืน (Overdue Borrow Tracking)

### B. Preventive Maintenance (PM)
- แผนงาน PM (`PM-2026-XXX`) กำหนดวันที่และรายการ Checklist ประจำเครื่อง
- เมื่อกด Complete PM Task ระบบจะเสนอสร้างแผน PM รอบถัดไป (+90 วัน) อัตโนมัติ

### C. Daily CCTV & Server Backup Checklists
- ตรวจเช็ครายวันพร้อมเลือกดูประวัติย้อนหลังตาม Date Picker
- ปุ่ม Batch Action: "Mark All as Normal" (CCTV) และ "Mark All as Success" (Backup)
- **One-Click Quick Ticket:** เมื่อกล้อง Offline/Damaged หรือ Backup Failed สามารถกดเปิด Ticket แจ้งซ่อมด่วนโดยดึงข้อมูลเครื่องเข้าแบบฟอร์มอัตโนมัติ

---

## 4. Phase Contract & Acceptance Criteria (Quality Gate 05)
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-05-01` | Borrow Asset State Transition | Integration Test | อนุญาตให้ยืมเฉพาะ Asset `In Stock` และเปลี่ยนสถานะเป็น `In Use` ทันที |
| `AC-05-02` | Return Asset Recovery | Integration Test | เมื่อรับคืน Asset สถานะเปลี่ยนกลับเป็น `In Stock` พร้อมบันทึก Return Date |
| `AC-05-03` | Recurring PM Generation | Unit/Integration Test | Complete PM สามารถ Trigger สร้างรอบถัดไป +90 วันได้อย่างถูกต้อง |
| `AC-05-04` | Daily Log Persistence | Integration Test | บันทึกผล CCTV และ Backup แยกประวัติตามปฏิทินรายวันถูกต้อง |
| `AC-05-05` | Quick Ticket Integration | Integration Test | ส่ง Payload จาก CCTV/Backup Error ไปเปิด Ticket พร้อมใส่ข้อมูลอัตโนมัติ |

---

## 5. Security & Constraint Checklist
- [ ] มี Transaction Lock ป้องกันการกดกู้ยืม Asset ซ้ำซ้อนพร้อมกัน (Race Condition)
- [ ] ตรวจสอบว่าไม่เกิดผลกระทบข้างเคียงกับตาราง `assets` และ `tickets`

---
---

# PHASE_SPECIFICATION.md: Phase 06 - Dashboard, Global Search & System Polish

## 1. Phase Metadata
- **Phase ID:** PHASE-06
- **Phase Name:** Dashboard, Global Search & System Polish
- **Target Completion Quality Gate:** QG-06
- **Complexity:** Low
- **Risk Level:** Low
- **Prerequisites / Dependencies:** PHASE-01 ถึง PHASE-05 (All Preceding Phases)

---

## 2. Objective & Scope
พัฒนาระบบหน้าภาพรวม Dashboard รายงานสถิติผู้บริหาร, ตัวชี้วัด MTTR และ CSAT, กราฟสถิติด้วย Chart.js, ระบบค้นหาด่วนแบบรวมศูนย์ (Global Search `Ctrl+K`), การจัดการธีม Dark/Light Mode และการตรวจสอบระบบทั้งหมดก่อนส่งมอบ

---

## 3. Detailed Deliverables & Technical Specifications

### A. Executive Dashboard & Metrics
- 6 KPI Metric Cards พร้อมความสามารถ Quick Filter Jump ไปยังโมดูลต่างๆ:
  - Total Tickets, In Progress Tickets, Active Projects, SLA Breached, MTTR (Mean Time to Resolve), CSAT Average
- **Chart.js Visualizations:**
  - Bar Chart: สถิติการแจ้งซ่อมตามหมวดหมู่ (Tickets by Category)
  - Doughnut Chart: สัดส่วนสถานะโครงการไอที (Project Status Breakdown)

### B. Global Search (Ctrl + K)
- Modal ค้นหาด่วนทั่วทั้งระบบ แสดงผลลัพธ์แยกตามหมวดหมู่:
  - Tickets, Assets, Projects, Tasks, Users
- รองรับการกดคลิกเพื่อข้ามไปยังหน้ารายละเอียดของรายการนั้นๆ ทันที

### C. Theme & Accessibility Polish
- Dark / Light Mode Toggle พร้อมบันทึกลง LocalStorage และรองรับ OS Preference (`prefers-color-scheme`)
- Accessibility & UX: Focus Trap ใน Modal, Escape Key to Close, Backdrop Blur และ Custom Alert/Confirm Modals

---

## 4. Phase Contract & Acceptance Criteria (Quality Gate 06)
| ID | Requirement | Verification Method | Pass Criteria |
|---|---|---|---|
| `AC-06-01` | Executive Metric Accuracy | Integration Test | MTTR, CSAT, และนับจำนวนสถานะคำนวณถูกต้องตรงตามฐานข้อมูลจริง |
| `AC-06-02` | Chart Visual Reactivity | UI Test | Chart.js ทั้งสองตัวเรนเดอร์ข้อมูลถูกต้อง และปรับสีตามธีมทันที |
| `AC-06-03` | Global Search Multi-Entity | UI / API Test | กด `Ctrl+K` ค้นหาข้อมูลครอบคลุมทั้ง 5 Modules และลิงก์ไปยังหน้ารายละเอียดได้ |
| `AC-06-04` | Theme & UI Consistency | UI / E2E Test | บันทึกสถานะ Dark/Light Mode และไม่มีปัญหา Contrast/Style แตกหัก |
| `AC-06-05` | Final Project Gate Sign-off | Full Regression Suite | Regression Test 100% Pass, Build Success, 0 Security Defect |

---

## 5. Security & Constraint Checklist
- [ ] Global Search ป้องกัน SQL Injection / Query Bypass
- [ ] Bundle Size Optimization สำหรับ Chart.js และ Asset ไฟล์
- [ ] สรุปผลการตรวจรับระบบผ่าน `PROJECT_COMPLETION_REPORT.md`