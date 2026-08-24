const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Ensure CSS for .m-th-content exists
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
      text-align: left;
    }
    .m-th-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 12px;
    }`;

  html = html.replace(oldThCss, newThCss);

  // 2. Clean up any corrupted tags from previous run
  html = html.replace(/<thead ><div class="m-th-content"><span><tr>/g, '<thead>\n              <tr>');
  html = html.replace(/<\/span><i class="fa-solid fa-sort text-\[9px\] text-slate-300 ml-0\.5"><\/i><\/div><\/th>/g, '</th>');
  html = html.replace(/<div class="m-th-content"><span>/g, '');
  html = html.replace(/<\/span><i class="fa-solid fa-sort[^"]*"><\/i><\/div>/g, '');

  // 3. Process every <th> individually inside <thead>
  html = html.replace(/<th([^>]*)>([\s\S]*?)<\/th>/g, (match, attrs, content) => {
    // Strip existing HTML inside content to get plain text
    let plainText = content.replace(/<[^>]+>/g, '').trim();

    if (!plainText) return match;

    if (plainText === 'จัดการ' || plainText === 'Action') {
      return `<th class="text-right">จัดการ</th>`;
    }

    // List of columns that get sort icons
    const sortableCols = ['Ticket ID', 'รหัสโครงการ', 'รหัสงาน', 'Asset Tag', 'Trans ID', 'PM ID', 'ID กล้อง', 'Job ID', 'User ID', 'วันที่เริ่ม', 'กำหนดส่ง (Deadline)', 'วันที่ยืม', 'กำหนดคืน', 'วันหมดอายุ', 'กำหนดทำ PM', 'ความสำคัญ', 'Priority', 'สถานะ & SLA', 'สถานะ', 'ความคืบหน้า (%)', 'ขนาดไฟล์ (GB)', 'งบประมาณ (บาท)'];

    const hasSort = sortableCols.some(col => plainText.includes(col));

    if (hasSort) {
      return `<th class="text-left"><div class="m-th-content"><span>${plainText}</span><i class="fa-solid fa-sort text-[9px] text-slate-300"></i></div></th>`;
    } else {
      return `<th class="text-left">${plainText}</th>`;
    }
  });

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully applied Style 3 (Space-Between Header) with clean HTML.');
} catch (e) {
  console.error(e);
}
