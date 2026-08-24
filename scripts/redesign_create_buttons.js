const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Add CSS for .m-btn-cta system
  const ctaCss = `
    /* ── Redesigned Modern CTA Buttons ── */
    .m-btn-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      background: var(--color-accent);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .m-btn-cta:hover {
      background: #4338CA;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
      transform: translateY(-1px);
    }
    .m-btn-cta:active {
      transform: translateY(0);
    }
    
    .m-btn-cta-dark {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      background: #0F172A;
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(15, 23, 42, 0.15);
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .m-btn-cta-dark:hover {
      background: #1E293B;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.25);
      transform: translateY(-1px);
    }
    .m-btn-cta-dark:active {
      transform: translateY(0);
    }
  </style>`;

  html = html.replace(/<\/style>/, ctaCss);

  // 2. Redesign Ticket Button (Indigo Accent with crisp icon)
  // Navbar Quick Create
  html = html.replace(/<button onclick="openTicketModal\(\)" class="m-btn m-btn-primary"[^>]*>[\s\S]*?<\/button>/, '<button onclick="openTicketModal()" class="m-btn-cta" title="สร้าง Ticket ใหม่"><i class="fa-solid fa-plus text-[10px]"></i> New Ticket</button>');

  // Ticket Tab Section Header
  html = html.replace(/<button onclick="openTicketModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openTicketModal()" class="m-btn-cta"><i class="fa-solid fa-plus text-[10px]"></i> สร้าง Ticket ใหม่</button>');

  // 3. Redesign Project Button (Dark Slate Premium with icon)
  html = html.replace(/<button onclick="openProjectModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openProjectModal()" class="m-btn-cta-dark"><i class="fa-solid fa-plus text-[10px]"></i> สร้างโครงการใหม่</button>');

  // 4. Redesign other module CTA buttons for consistency
  html = html.replace(/<button onclick="openTaskModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openTaskModal()" class="m-btn-cta-dark"><i class="fa-solid fa-plus text-[10px]"></i> สร้าง Task ใหม่</button>');
  html = html.replace(/<button onclick="openAssetModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openAssetModal()" class="m-btn-cta-dark"><i class="fa-solid fa-plus text-[10px]"></i> เพิ่ม Asset ใหม่</button>');
  html = html.replace(/<button onclick="openLicenseModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openLicenseModal()" class="m-btn-cta-dark"><i class="fa-solid fa-plus text-[10px]"></i> เพิ่ม License ใหม่</button>');
  html = html.replace(/<button onclick="openBorrowModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openBorrowModal()" class="m-btn-cta-dark"><i class="fa-solid fa-plus text-[10px]"></i> ทำรายการยืมใหม่</button>');
  html = html.replace(/<button onclick="openPmModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openPmModal()" class="m-btn-cta-dark"><i class="fa-solid fa-plus text-[10px]"></i> เพิ่มแผน PM ใหม่</button>');
  html = html.replace(/<button onclick="openUserModal\(\)" class="m-btn m-btn-primary">[\s\S]*?<\/button>/, '<button onclick="openUserModal()" class="m-btn-cta-dark"><i class="fa-solid fa-plus text-[10px]"></i> เพิ่มผู้ใช้ใหม่</button>');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully redesigned Ticket and Project CTA buttons.');
} catch (e) {
  console.error(e);
}
