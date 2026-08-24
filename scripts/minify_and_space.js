const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // === 1. Minify Buttons ===
  // CSS
  html = html.replace(/padding:\s*7px\s+14px;/, 'padding: 6px 10px;');
  html = html.replace(/font-size:\s*12px;(\s*font-weight:\s*500;\s*line-height:\s*1;)/, 'font-size: 11px;$1');
  html = html.replace(/\.m-btn-icon\s*{\s*padding:\s*7px;/, '.m-btn-icon { padding: 6px; width: 26px; height: 26px; justify-content: center; ');

  // Primary Buttons (Top Bar)
  html = html.replace(/>\s*<i class="fa-solid fa-plus"( style="font-size:10px;")?><\/i>\s*<span class="hidden sm:inline">แจ้ซ่อม \/ สั่งงานใหม่<\/span><span class="sm:hidden">แจ้ซ่อม<\/span>\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> <span class="hidden sm:inline">New Ticket</span></button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*สร้าง Ticket ใหม่\s*<\/button>/g, ' title="สร้าง Ticket ใหม่"><i class="fa-solid fa-plus"></i> Ticket</button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*\+\s*สร้างโครงการใหม่\s*<\/button>/g, ' title="สร้างโครงการใหม่"><i class="fa-solid fa-plus"></i> Project</button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*เพิ่มงานส่วนตัว\s*<\/button>/g, ' title="เพิ่มงานส่วนตัว"><i class="fa-solid fa-plus"></i> Task</button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*เพิ่มอุปกรณ์ใหม่\s*<\/button>/g, ' title="เพิ่มอุปกรณ์ใหม่"><i class="fa-solid fa-plus"></i> Asset</button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*เพิ่ม License\s*<\/button>/g, ' title="เพิ่ม License"><i class="fa-solid fa-plus"></i> License</button>');
  
  // Action Buttons
  html = html.replace(/<i class="fa-solid fa-pen-to-square(?: mr-1)?"><\/i>\s*แก้ไข/g, '<i class="fa-solid fa-pen-to-square" title="แก้ไข"></i>');
  html = html.replace(/>\s*แก้ไข\s*<\/button>/g, ' title="แก้ไข"><i class="fa-solid fa-pen-to-square"></i></button>');
  
  html = html.replace(/<i class="fa-solid fa-trash(?: mr-1)?"><\/i>\s*ลบ/g, '<i class="fa-solid fa-trash" title="ลบ"></i>');
  html = html.replace(/>\s*ลบ\s*<\/button>/g, ' title="ลบ"><i class="fa-solid fa-trash"></i></button>');
  
  html = html.replace(/<i class="fa-solid fa-eye(?: mr-1)?"><\/i>\s*ดูรายละเอียด/g, '<i class="fa-solid fa-eye" title="ดูรายละเอียด"></i>');
  html = html.replace(/<i class="fa-solid fa-hand-holding(?: mr-1)?"><\/i>\s*ยืมอุปกรณ์/g, '<i class="fa-solid fa-hand-holding" title="ยืมอุปกรณ์"></i>');
  html = html.replace(/<i class="fa-solid fa-rotate-left(?: mr-1)?"><\/i>\s*รับคืน/g, '<i class="fa-solid fa-rotate-left" title="รับคืน"></i>');
  html = html.replace(/<i class="fa-solid fa-users-gear(?: mr-1)?"><\/i>\s*Seats/g, '<i class="fa-solid fa-users-gear" title="จัดการ Seats"></i>');
  html = html.replace(/<i class="fa-solid fa-check(?: mr-1)?"><\/i>\s*ทำแล้ว/g, '<i class="fa-solid fa-check" title="ทำแล้ว"></i>');

  html = html.replace(/mr-1"><\/i><\/button>/g, '"></i></button>');

  // === 2. Update Spacing ===
  // Macro Spacing
  html = html.replace(/<main class="p-6 space-y-6 flex-1">/, '<main class="p-6 lg:p-8 space-y-6 flex-1">');
  
  // Filter Bar CSS
  html = html.replace(/padding:\s*14px;\s*display:\s*flex;\s*gap:\s*12px;/, 'padding: 16px; display: flex; gap: 16px;');
  // Filter Bar inline gaps (gap-3 -> gap-4)
  html = html.replace(/gap-3 m-filter-bar/g, 'gap-4 m-filter-bar');

  // Component Spacing (space-y-4 -> space-y-6) in tab contents
  html = html.replace(/shadow-sm shadow-slate-900\/5 space-y-4/g, 'shadow-sm shadow-slate-900/5 space-y-6');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully optimized buttons and applied spacing updates.');
} catch (e) {
  console.error(e);
}
