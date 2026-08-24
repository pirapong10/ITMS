const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // Standardize the main create buttons to always use m-btn-primary (Dark Slate)
  // And standard text `<i class="fa-solid fa-plus"></i> Entity`
  
  // 1. Header main button
  html = html.replace(/>\s*<i class="fa-solid fa-plus"><\/i>\s*<span class="hidden sm:inline">New Ticket<\/span>\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> <span class="hidden sm:inline">Ticket</span></button>');
  
  // 2. Ticket tab
  html = html.replace(/class="m-btn m-btn-accent"( title="สร้าง Ticket ใหม่")?>\s*<i class="fa-solid fa-plus"><\/i> Ticket\s*<\/button>/g, 'class="m-btn m-btn-primary"><i class="fa-solid fa-plus"></i> Ticket</button>');
  
  // 3. Project tab
  html = html.replace(/class="m-btn m-btn-primary"( title="สร้างโครงการใหม่")?>\s*<i class="fa-solid fa-plus"><\/i> Project\s*<\/button>/g, 'class="m-btn m-btn-primary"><i class="fa-solid fa-plus"></i> Project</button>');
  
  // 4. Task tab
  html = html.replace(/class="m-btn m-btn-primary"( title="เพิ่มงานส่วนตัว")?>\s*<i class="fa-solid fa-plus"><\/i> Task\s*<\/button>/g, 'class="m-btn m-btn-primary"><i class="fa-solid fa-plus"></i> Task</button>');
  
  // 5. Asset tab
  html = html.replace(/class="m-btn m-btn-primary"( title="เพิ่มอุปกรณ์ใหม่")?>\s*<i class="fa-solid fa-plus"><\/i> Asset\s*<\/button>/g, 'class="m-btn m-btn-primary"><i class="fa-solid fa-plus"></i> Asset</button>');
  
  // 6. License tab
  html = html.replace(/class="m-btn m-btn-primary"( title="เพิ่ม License")?>\s*<i class="fa-solid fa-plus"><\/i> License\s*<\/button>/g, 'class="m-btn m-btn-primary"><i class="fa-solid fa-plus"></i> License</button>');

  // Empty State buttons
  html = html.replace(/>\s*\+\s*เพิ่ม Asset แรก\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> Asset</button>');
  html = html.replace(/>\s*\+\s*เพิ่ม License แรก\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> License</button>');
  html = html.replace(/>\s*\+\s*สั่งยืมอุปกรณ์แรก\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> ยืมอุปกรณ์</button>');
  html = html.replace(/>\s*\+\s*เพิ่มแผน PM แรก\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> PM Plan</button>');
  html = html.replace(/>\s*\+\s*เพิ่ม User แรก\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> User</button>');
  html = html.replace(/>\s*\+\s*สร้างโครงการใหม่\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> Project</button>');
  html = html.replace(/>\s*\+\s*เพิ่มงานส่วนตัว\s*<\/button>/g, '><i class="fa-solid fa-plus"></i> Task</button>');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully standardized all create buttons.');
} catch (e) {
  console.error(e);
}
