# PHASE_SPECIFICATION.md: Phase 04 - Project & Task Management

## 1. Phase Metadata
- **Phase ID:** Phase 04
- **Phase Name:** Project & Task Management
- **Target Completion Quality Gate:** QG-04
- **Complexity:** Medium
- **Risk Level:** Low

---

## 2. Objective & Scope
พัฒนาระบบบริหารและติดตามโครงการไอที (IT Project Portfolio), การคำนวณความคืบหน้าอัตโนมัติตาม Milestones, มุมมอง Gantt Chart Timeline และระบบบริหารงานส่วนตัว/งานทีม (Task Management) พร้อมมุมมอง Kanban Board แบบ Drag-and-Drop.

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

## 4. Acceptance Criteria & Quality Gate 04 Verification
1. [ ] การติ๊ก Milestone ในโครงการจะอัปเดตแถบ Progress Bar % ของโครงการทันที
2. [ ] Gantt Chart เรนเดอร์ Bar Timeline ตามช่วงเดือนของ Start Date และ End Date ได้ถูกต้อง
3. [ ] สรุป Workload Table แสดงจำนวนงานในแต่ละสถานะและเปอร์เซ็นต์ความสำเร็จของทีมงานแต่ละคนถูกต้อง
4. [ ] Kanban Board รองรับการลากย้ายการ์ดระหว่างคอลัมน์ และบันทึกสถานะงานลง Database/State