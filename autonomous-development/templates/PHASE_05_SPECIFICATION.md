# PHASE_SPECIFICATION.md: Phase 05 - Daily Operations & Routines

## 1. Phase Metadata
- **Phase ID:** Phase 05
- **Phase Name:** Daily Operations & Routines
- **Target Completion Quality Gate:** QG-05
- **Complexity:** Medium
- **Risk Level:** Low

---

## 2. Objective & Scope
พัฒนาระบบงานปฏิบัติการประจำวัน ได้แก่ ระบบยืม-คืนอุปกรณ์สำรอง (Borrow-Return), แผนบำรุงรักษาเชิงป้องกัน (PM) พร้อมระบบสร้างรอบถัดไปอัตโนมัติ, ระบบตรวจเช็คกล้องวงจรปิด CCTV ประจำวัน และระบบตรวจเช็ค Server Backup ประจำวัน พร้อมฟังก์ชันเปิด Ticket แจ้งซ่อมด่วน.

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

## 4. Acceptance Criteria & Quality Gate 05 Verification
1. [ ] การยืมอุปกรณ์กรองเฉพาะเครื่องที่เป็น `In Stock` และเปลี่ยนสถานะเครื่องเป็น `In Use` ทันทีหลังยืนยัน
2. [ ] การรับคืนอุปกรณ์เปลี่ยนสถานะเครื่องกลับเป็น `In Stock` และบันทึกวันที่คืนสำเร็จ
3. [ ] การกด Complete PM สามารถสร้าง Recurring PM Task สำหรับรอบ 90 วันถัดไปได้
4. [ ] การบันทึกผล CCTV และ Server Backup แยกเก็บประวัติตามวันที่ (Daily Log History) ได้อย่างถูกต้อง
5. [ ] ปุ่มแจ้งซ่อมด่วนจาก CCTV/Backup ส่งค่าไปยัง Ticket Form ได้อย่างครบถ้วน