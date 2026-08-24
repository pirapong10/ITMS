const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // Fix Broken Asset Edit Button
  html = html.replace(/<i class="fa-solid fa-pen-to-square mr-0\.5"><\/i title="แก้ไข"><i class="fa-solid fa-pen-to-square"><\/i>/g, '<i class="fa-solid fa-pen-to-square" title="แก้ไข"></i>');

  // Fix Action buttons that have text but were given m-btn-icon

  // Ticket "ดู" (View)
  html = html.replace(/class="m-btn m-btn-accent m-btn-icon">\s*<i class="fa-solid fa-eye mr-1"><\/i>ดู/g, 'class="m-btn m-btn-accent m-btn-icon" title="ดูรายละเอียด"><i class="fa-solid fa-eye"></i>');

  // Project "Tasks"
  html = html.replace(/class="m-btn m-btn-ghost m-btn-icon">\s*<i class="fa-solid fa-bars-staggered"><\/i> Tasks/g, 'class="m-btn m-btn-ghost m-btn-icon" title="Tasks"><i class="fa-solid fa-bars-staggered"></i>');

  // Asset "Label"
  html = html.replace(/class="m-btn m-btn-accent m-btn-icon">\s*<i class="fa-solid fa-qrcode mr-0\.5"><\/i>Label/g, 'class="m-btn m-btn-accent m-btn-icon" title="Print Label"><i class="fa-solid fa-qrcode"></i>');

  // Asset "แจ้งซ่อม"
  html = html.replace(/class="m-btn m-btn-accent m-btn-icon">\s*<i class="fa-solid fa-plus-circle mr-0\.5"><\/i>แจ้งซ่อม/g, 'class="m-btn m-btn-accent m-btn-icon" title="แจ้งซ่อม"><i class="fa-solid fa-plus-circle"></i>');

  // Asset "ประวัติ"
  html = html.replace(/class="m-btn m-btn-primary m-btn-icon">\s*<i class="fa-solid fa-clock-rotate-left mr-0\.5"><\/i>ประวัติ/g, 'class="m-btn m-btn-primary m-btn-icon" title="ประวัติ"><i class="fa-solid fa-clock-rotate-left"></i>');

  // PM "ทำแล้ว" (Already changed to icon, but let's check for any mr-1 leftovers)
  html = html.replace(/<i class="fa-solid fa-check" title="ทำแล้ว"><\/i>\s*<\/button>/g, '<i class="fa-solid fa-check" title="ทำแล้ว"></i></button>');

  // Missed Buttons (e.g. Users Table Edit, Project Delete, Task Delete)
  
  // Users Edit
  html = html.replace(/class="text-xs text-indigo-600 font-semibold hover:bg-indigo-50 px-2 py-1 rounded-lg">\s*<i class="fa-solid fa-pen-to-square" title="แก้ไข"><\/i>/g, 'class="m-btn m-btn-ghost m-btn-icon" title="แก้ไข"><i class="fa-solid fa-pen-to-square"></i>');
  
  // Project Delete
  html = html.replace(/class="p-1\.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs">\s*<i class="fa-solid fa-trash"><\/i> ลบ/g, 'class="m-btn m-btn-danger m-btn-icon" title="ลบ"><i class="fa-solid fa-trash"></i>');
  
  // Task Delete
  html = html.replace(/class="p-1\.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs">\s*<i class="fa-solid fa-trash"><\/i> ลบ/g, 'class="m-btn m-btn-danger m-btn-icon" title="ลบ"><i class="fa-solid fa-trash"></i>');

  // Make sure ALL m-btn have correct sizes as requested (even smaller)
  // Let's drop them to 5px 8px padding and 10px font size to be TRULY minimal if they want it smaller.
  html = html.replace(/padding: 6px 10px; border-radius:/, 'padding: 5px 8px; border-radius:');
  html = html.replace(/font-size: 11px; font-weight: 500; line-height: 1;/, 'font-size: 10px; font-weight: 600; line-height: 1;');
  html = html.replace(/\.m-btn-icon \{ padding: 6px; width: 26px; height: 26px;/, '.m-btn-icon { padding: 4px; width: 22px; height: 22px;');

  // Make sure inputs and selects are also a bit smaller to match
  html = html.replace(/\.m-input \{\s*width: 100%;\s*padding: 8px 12px;\s*font-size: 12px;/, '.m-input {\n      width: 100%;\n      padding: 6px 10px;\n      font-size: 11px;');

  // Increase padding of filter bar slightly more for spacing
  html = html.replace(/padding: 16px; display: flex; gap: 16px;/, 'padding: 20px; display: flex; gap: 20px;');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Fixed buttons and refined spacing.');
} catch (e) {
  console.error(e);
}
