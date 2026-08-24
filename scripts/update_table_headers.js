const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Update CSS for Sticky Headers
  const oldThCss = /\.m-table thead th \{[^}]*\}/;
  const newThCss = `.m-table thead th {
      position: sticky;
      top: 0;
      background: #F8FAFC;
      z-index: 10;
      padding: 10px 14px;
      font-size: 10px;
      font-weight: 600;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
      border-bottom: 1px solid var(--color-border);
    }`;

  html = html.replace(oldThCss, newThCss);

  // 2. Standardize action header to "จัดการ"
  html = html.replace(/<th([^>]*)>\s*ดำเนินการ\s*<\/th>/g, '<th$1 class="text-right">จัดการ</th>');
  html = html.replace(/<th([^>]*)>\s*จัดการ\s*<\/th>/g, '<th$1 class="text-right">จัดการ</th>');

  // 3. Add subtle sort icons to key headers (ID, Date, Status, Priority)
  // Let's define replacements for headers
  const sortIcon = ' <i class="fa-solid fa-sort text-[9px] text-slate-300 ml-0.5"></i>';

  const headerReplacements = [
    ['Ticket ID', `Ticket ID${sortIcon}`],
    ['รหัสโครงการ', `รหัสโครงการ${sortIcon}`],
    ['รหัสงาน', `รหัสงาน${sortIcon}`],
    ['Asset Tag', `Asset Tag${sortIcon}`],
    ['Trans ID', `Trans ID${sortIcon}`],
    ['PM ID', `PM ID${sortIcon}`],
    ['ID กล้อง', `ID กล้อง${sortIcon}`],
    ['Job ID', `Job ID${sortIcon}`],
    ['User ID', `User ID${sortIcon}`],
    ['วันที่เริ่ม', `วันที่เริ่ม${sortIcon}`],
    ['กำหนดส่ง (Deadline)', `กำหนดส่ง (Deadline)${sortIcon}`],
    ['วันที่ยืม', `วันที่ยืม${sortIcon}`],
    ['กำหนดคืน', `กำหนดคืน${sortIcon}`],
    ['วันหมดอายุ', `วันหมดอายุ${sortIcon}`],
    ['กำหนดทำ PM', `กำหนดทำ PM${sortIcon}`],
    ['ความสำคัญ', `ความสำคัญ${sortIcon}`],
    ['Priority', `Priority${sortIcon}`],
    ['สถานะ & SLA', `สถานะ & SLA${sortIcon}`],
    ['สถานะ', `สถานะ${sortIcon}`]
  ];

  headerReplacements.forEach(([target, replacement]) => {
    // Only replace if inside <th ...> ... </th> and doesn't already have icon
    const regex = new RegExp(`(<th[^>]*>)\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(<\/th>)`, 'g');
    html = html.replace(regex, `$1${replacement}$2`);
  });

  // 4. Ensure number headers have text-right / text-center alignment
  html = html.replace(/<th([^>]*)>\s*งบประมาณ \(บาท\)/g, '<th$1 class="text-right">งบประมาณ (บาท)');
  html = html.replace(/<th([^>]*)>\s*ความคืบหน้า \(%\)/g, '<th$1 class="text-center">ความคืบหน้า (%)');
  html = html.replace(/<th([^>]*)>\s*อัตราความสำเร็จ \(%\)/g, '<th$1 class="text-right">อัตราความสำเร็จ (%)');
  html = html.replace(/<th([^>]*)>\s*โควต้าใช้งาน \(Seats\)/g, '<th$1 class="text-center">โควต้าใช้งาน (Seats)');
  html = html.replace(/<th([^>]*)>\s*ขนาดไฟล์ \(GB\)/g, '<th$1 class="text-right">ขนาดไฟล์ (GB)');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Table headers updated successfully.');
} catch (e) {
  console.error(e);
}
