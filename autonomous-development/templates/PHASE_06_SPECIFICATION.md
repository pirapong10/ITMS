# PHASE_SPECIFICATION.md: Phase 06 - Dashboard, Global Search & System Polish

## 1. Phase Metadata
- **Phase ID:** Phase 06
- **Phase Name:** Dashboard, Global Search & System Polish
- **Target Completion Quality Gate:** QG-06
- **Complexity:** Low
- **Risk Level:** Low

---

## 2. Objective & Scope
พัฒนาระบบหน้าภาพรวม Dashboard รายงานสถิติผู้บริหาร, ตัวชี้วัด MTTR และ CSAT, กราฟสถิติด้วย Chart.js, ระบบค้นหาด่วนแบบรวมศูนย์ (Global Search `Ctrl+K`), การจัดการธีม Dark/Light Mode และการตรวจสอบระบบทั้งหมดก่อนส่งมอบ.

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

## 4. Acceptance Criteria & Quality Gate 06 Verification
1. [ ] Metric Cards บน Dashboard คำนวณค่า MTTR และ CSAT จากข้อมูลจริงได้อย่างถูกต้อง
2. [ ] Chart.js ทั้งสองกราฟตอบสนองต่อการเปลี่ยนแปลงข้อมูลและการสลับ Dark/Light Mode
3. [ ] กด `Ctrl + K` หรือปุ่มค้นหา เรียกใช้งาน Global Search และแสดงผลลัพธ์ครอบคลุมทุก Entity
4. [ ] การสลับ Dark/Light Mode ปรับเปลี่ยนชุดสีตัวอักษร, Card, Table และ Input อย่างกลมกลืน ไม่มีข้อบกพร่อง