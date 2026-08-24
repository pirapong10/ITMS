const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // Matrix of rules for alignments
  // 1. Column headers (th)
  // 2. Corresponding body cells (td)

  // Standardize TH alignments
  // Center alignment THs
  const centerThs = ['ความสำคัญ', 'Priority', 'สถานะ & SLA', 'สถานะ', 'สถานะการทำงาน', 'สถานะสำรอง', 'สถานะรายการ', 'Role', 'สิทธิ์', 'ความคืบหน้า (%)', 'โควต้าใช้งาน (Seats)', 'รอดำเนินการ', 'กำลังทำ', 'รอตรวจสอบ', 'เสร็จสิ้น', 'รวมทั้งหมด', 'คะแนน CSAT'];
  
  // Right alignment THs
  const rightThs = ['จัดการ', 'งบประมาณ (บาท)', 'อัตราความสำเร็จ (%)', 'ขนาดไฟล์ (GB)'];

  centerThs.forEach(text => {
    const regex = new RegExp(`(<th[^>]*class="[^"]*)(">[^<]*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
    html = html.replace(regex, (match, p1, p2) => {
      if (!p1.includes('text-center')) {
        p1 = p1.replace(/text-left|text-right/g, '').trim() + ' text-center';
      }
      return `${p1}${p2}`;
    });
  });

  rightThs.forEach(text => {
    const regex = new RegExp(`(<th[^>]*class="[^"]*)(">[^<]*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
    html = html.replace(regex, (match, p1, p2) => {
      if (!p1.includes('text-right')) {
        p1 = p1.replace(/text-left|text-center/g, '').trim() + ' text-right';
      }
      return `${p1}${p2}`;
    });
  });

  // Ensure action cell td (last cell of table rows) is text-right
  // In JS renderers, action cells usually have `class="p-3 text-right space-x-1"` or similar.
  html = html.replace(/<td class="p-3 (?:text-left|text-center)?\s*space-x-1"/g, '<td class="p-3 text-right space-x-1"');
  html = html.replace(/<td class="p-3 space-x-1"/g, '<td class="p-3 text-right space-x-1"');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully re-checked and updated alignments across all tables.');
} catch (e) {
  console.error(e);
}
