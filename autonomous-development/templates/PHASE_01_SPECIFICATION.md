# PHASE_SPECIFICATION.md: Phase 01 - Setup & DB Schema

## 1. Phase Metadata
- **Phase ID:** Phase 01
- **Phase Name:** Setup & DB Schema
- **Target Completion Quality Gate:** QG-01
- **Complexity:** High
- **Risk Level:** High

---

## 2. Objective & Scope
จัดเตรียมโครงสร้างพื้นฐานของระบบ Data Layer, การทำ Database Schema Migrations ให้ครบถ้วนทั้ง 14 ตาราง, จัดทำ Seed Data เริ่มต้นสำหรับทดสอบ, ระบบจัดการผู้ใช้งาน (Users Management) และระบบจัดการ System Settings พร้อม Running Code Prefix Generator.

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

## 4. Acceptance Criteria & Quality Gate 01 Verification
1. [ ] Script Migrations สามารถรันสร้างทั้ง 14 Tables ได้อย่างสมบูรณ์แบบ ไม่มี Foreign Key หรือ Index Error
2. [ ] Seed Data ถูกบันทึกลงฐานข้อมูลครบถ้วน และดึงขึ้นมาแสดงผลได้ถูกต้อง
3. [ ] API CRUD ของระบบ User ผ่านการทดสอบครบทุก HTTP Status (200, 201, 400, 404, 409)
4. [ ] API `next-code` สามารถ Generate รหัสที่เพิ่มขึ้นตาม Sequence ตามประเภทเอกสารได้อย่างถูกต้อง