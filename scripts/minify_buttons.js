const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Update CSS for .m-btn
  html = html.replace(/padding:\s*7px\s+14px;/, 'padding: 5px 10px;');
  html = html.replace(/font-size:\s*12px;(\s*font-weight:\s*500;\s*line-height:\s*1;)/, 'font-size: 11px;$1');
  html = html.replace(/\.m-btn-icon\s*{\s*padding:\s*7px;/, '.m-btn-icon { padding: 5px; width: 26px; height: 26px; justify-content: center; ');

  // 2. Reduce text in major buttons (e.g., "สร้าง Ticket ใหม่" -> "สร้าง Ticket")
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*สร้าง Ticket ใหม่\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> Ticket</button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*\+\s*สร้างโครงการใหม่\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> โครงการ</button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*เพิ่มงานส่วนตัว\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> งาน</button>');
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*เพิ่มอุปกรณ์ใหม่\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> อุปกรณ์</button>');
  
  html = html.replace(/>\s*<i class="fa-solid fa-plus mr-1"><\/i>\s*เพิ่ม License\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> License</button>');
  html = html.replace(/>\s*\+\s*สั่งยืมอุปกรณ์แรก\s*<\/button>/g, '>+ ยืมอุปกรณ์</button>');
  html = html.replace(/>\s*\+\s*เพิ่มแผน PM แรก\s*<\/button>/g, '>+ เพิ่ม PM</button>');

  // 3. Icon-only for action buttons (แก้ไข, ลบ, ดูรายละเอียด)
  // These usually have `m-btn-icon` or `m-btn`. Let's just remove the text for edit/delete if they have icons.
  
  // Replace แก้ไข (Edit) -> Icon only
  html = html.replace(/<i class="fa-solid fa-pen-to-square(?: mr-1)?"><\/i>\s*แก้ไข/g, '<i class="fa-solid fa-pen-to-square"></i>');
  // Sometimes no icon, just text
  html = html.replace(/>\s*แก้ไข\s*<\/button>/g, ' title="แก้ไข"><i class="fa-solid fa-pen-to-square"></i></button>');
  
  // Replace ลบ (Delete) -> Icon only
  html = html.replace(/<i class="fa-solid fa-trash(?: mr-1)?"><\/i>\s*ลบ/g, '<i class="fa-solid fa-trash"></i>');
  html = html.replace(/>\s*ลบ\s*<\/button>/g, ' title="ลบ"><i class="fa-solid fa-trash"></i></button>');
  
  // Replace ดูรายละเอียด (View)
  html = html.replace(/<i class="fa-solid fa-eye(?: mr-1)?"><\/i>\s*ดูรายละเอียด/g, '<i class="fa-solid fa-eye"></i>');
  
  // Replace ยืม/คืน (Borrow/Return)
  html = html.replace(/<i class="fa-solid fa-hand-holding(?: mr-1)?"><\/i>\s*ยืมอุปกรณ์/g, '<i class="fa-solid fa-hand-holding"></i>');
  html = html.replace(/<i class="fa-solid fa-rotate-left(?: mr-1)?"><\/i>\s*รับคืน/g, '<i class="fa-solid fa-rotate-left"></i>');
  
  // Replace Seats
  html = html.replace(/<i class="fa-solid fa-users-gear(?: mr-1)?"><\/i>\s*Seats/g, '<i class="fa-solid fa-users-gear"></i>');

  // Replace ทำแล้ว (Done) in PM
  html = html.replace(/<i class="fa-solid fa-check(?: mr-1)?"><\/i>\s*ทำแล้ว/g, '<i class="fa-solid fa-check"></i>');

  // Remove `mr-1` from any remaining icons in m-btn-icon since text is gone
  html = html.replace(/mr-1"><\/i><\/button>/g, '"></i></button>');

  // Make sure all these buttons have `title` attributes if we removed the text. 
  // (We'll assume the icon is descriptive enough for an internal ITSM, or they already have titles. 
  // E.g. trash = delete, pen = edit).

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Buttons minimized.');
} catch (e) {
  console.error(e);
}
