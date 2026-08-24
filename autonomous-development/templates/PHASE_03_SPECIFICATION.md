# PHASE_SPECIFICATION.md: Phase 03 - IT Asset & License Management

## 1. Phase Metadata
- **Phase ID:** Phase 03
- **Phase Name:** IT Asset & License Management
- **Target Completion Quality Gate:** QG-03
- **Complexity:** Medium
- **Risk Level:** Medium

---

## 2. Objective & Scope
พัฒนาระบบทะเบียนคุมทรัพย์สินและอุปกรณ์ไอที (Hardware Assets), ระบบคำนวณค่าเสื่อมราคาและเตือนวันหมดประกัน, การพิมพ์ QR Code Label, ประวัติการใช้งานแบบรวมศูนย์ (Lifecycle History) และระบบจัดการ Software/Cloud License Seat Allocations.

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

## 4. Acceptance Criteria & Quality Gate 03 Verification
1. [ ] Asset CRUD ทำงานสมบูรณ์ และคำนวณมูลค่าคงเหลือจากวันที่ซื้อได้อย่างถูกต้อง
2. [ ] Unified History Modal รวบรวมข้อมูล Ticket, Borrow, PM ของ Asset นั้นๆ แสดงผลตามลำดับเวลา
3. [ ] License Seat Allocation ห้ามจัดสรรเกินจำนวน `seatsTotal` และมีระบบปลดสิทธิ์ (Unassign)
4. [ ] ปุ่มพิมพ์ Label แสดงผล QR และข้อมูลทรัพย์สินพร้อมสำหรับการพิมพ์