# PHASE_SPECIFICATION.md: Phase 02 - Core Helpdesk & SLA Engine

## 1. Phase Metadata
- **Phase ID:** Phase 02
- **Phase Name:** Core Helpdesk & SLA Engine
- **Target Completion Quality Gate:** QG-02
- **Complexity:** High
- **Risk Level:** High

---

## 2. Objective & Scope
พัฒนาระบบศูนย์รับแจ้งซ่อมและบริการด้านไอที (Helpdesk Service Desk), ระบบคำนวณและติดตาม SLA แบบ Real-time, ระบบ Audit Trail Timeline, ระบบประเมินความพึงพอใจ CSAT และการพิมพ์ใบแจ้งซ่อม (Print Ticket Sheet).

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

## 4. Acceptance Criteria & Quality Gate 02 Verification
1. [ ] การสร้าง Ticket สามารถออก Running Number อัตโนมัติ (`TK-2026-XXX`)
2. [ ] SLA Countdown และ Progress Bar คำนวณเวลาคงเหลือและแจ้งเตือน Warning/Breached ได้แม่นยำ
3. [ ] เมื่อเปลี่ยนสถานะเป็น `Waiting for Vendor` หรือ `Waiting for User` ระบบต้อง Pause SLA ทันที
4. [ ] การอัปเดต Resolution ต้องบันทึกประวัติลง `ticket_audit_logs` ทุกครั้ง
5. [ ] ระบบประเมิน CSAT บันทึกคะแนน 1-5 ดาว และอัปเดตสถานะตั๋วได้อย่างถูกต้อง