const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Add CSS classes for Top Navbar
  const newCss = `
    /* ── Top Navbar ── */
    .m-navbar {
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      height: 60px;
      position: sticky;
      top: 0;
      z-index: 50;
      gap: 24px;
    }
    .m-nav-brand {
      display: flex; align-items: center; gap: 10px;
    }
    .m-nav-menu {
      display: flex; align-items: center; height: 100%; flex: 1; gap: 4px;
    }
    .m-nav-item {
      display: inline-flex; align-items: center; gap: 8px;
      height: 100%; padding: 0 16px;
      color: var(--color-text-secondary);
      font-size: 13px; font-weight: 500;
      cursor: pointer; position: relative;
      transition: color 0.2s;
    }
    .m-nav-item:hover, .m-nav-item.active {
      color: var(--color-accent);
    }
    .m-nav-item.active::bottom {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 2px; background: var(--color-accent);
    }
    
    /* ── Dropdown ── */
    .m-nav-group { position: relative; height: 100%; display: flex; align-items: center; }
    .m-dropdown {
      position: absolute; top: 60px; left: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      min-width: 200px;
      padding: 8px;
      display: none;
      flex-direction: column;
      gap: 4px;
    }
    .m-nav-group:hover .m-dropdown {
      display: flex;
    }
    .m-dropdown-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: var(--radius-sm);
      color: var(--color-text-secondary);
      font-size: 13px; cursor: pointer;
    }
    .m-dropdown-item:hover, .m-dropdown-item.active {
      background: var(--color-bg);
      color: var(--color-accent);
    }
  </style>`;
  
  html = html.replace(/<\/style>/, newCss);

  // 2. Change body flex direction
  html = html.replace(/<body class="([^"]*) flex ([^"]*)">/, '<body class="$1 flex flex-col $2">');

  // 3. Remove Aside (Sidebar)
  // Careful regex to remove the entire aside block
  html = html.replace(/<aside id="main-sidebar"[\s\S]*?<\/aside>/, '');

  // 4. Replace Header and its wrapper
  // Currently the layout is `<div class="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar h-screen"> <header ...> ... </header> <main>`
  // We want to pull the header OUT of the scrollable container OR just replace the header with the new navbar.
  // Actually, replacing the old header and the old sidebar with a unified navbar is best.
  
  const oldHeaderRegex = /<!-- TOP HEADER BAR — Minimal Flat -->[\s\S]*?<\/header>/;
  
  const newNavbarHTML = `
  <!-- TOP NAVBAR -->
  <header class="m-navbar">
    <div class="m-nav-brand">
      <div style="width:32px;height:32px;background:var(--color-accent);border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <i class="fa-solid fa-server" style="color:#fff;font-size:13px;"></i>
      </div>
      <div>
        <h1 style="font-size:14px;font-weight:700;color:var(--color-text-primary);letter-spacing:-0.01em;margin:0;line-height:1.2;">ITSM Enterprise</h1>
        <p style="font-size:10px;color:var(--color-text-tertiary);margin:0;">Minimal Edition</p>
      </div>
    </div>
    
    <nav class="m-nav-menu">
      <div class="m-nav-item active" onclick="switchTab('tab-dashboard')" data-tab="tab-dashboard">
        <i class="fa-solid fa-chart-pie"></i> ภาพรวม
      </div>
      
      <div class="m-nav-group">
        <div class="m-nav-item"><i class="fa-solid fa-headset"></i> Helpdesk <i class="fa-solid fa-chevron-down ml-1" style="font-size:10px;"></i></div>
        <div class="m-dropdown">
          <div class="m-dropdown-item" onclick="switchTab('tab-tickets')" data-tab="tab-tickets"><i class="fa-solid fa-ticket w-4"></i> แจ้งซ่อม (Tickets)</div>
          <div class="m-dropdown-item" onclick="switchTab('tab-projects')" data-tab="tab-projects"><i class="fa-solid fa-diagram-project w-4"></i> โครงการ (Projects)</div>
          <div class="m-dropdown-item" onclick="switchTab('tab-tasks')" data-tab="tab-tasks"><i class="fa-solid fa-list-check w-4"></i> งานส่วนตัว (Tasks)</div>
        </div>
      </div>

      <div class="m-nav-group">
        <div class="m-nav-item"><i class="fa-solid fa-laptop-code"></i> คลังอุปกรณ์ <i class="fa-solid fa-chevron-down ml-1" style="font-size:10px;"></i></div>
        <div class="m-dropdown">
          <div class="m-dropdown-item" onclick="switchTab('tab-assets')" data-tab="tab-assets"><i class="fa-solid fa-boxes-stacked w-4"></i> ทรัพย์สิน IT (Assets)</div>
          <div class="m-dropdown-item" onclick="switchTab('tab-borrow')" data-tab="tab-borrow"><i class="fa-solid fa-handshake w-4"></i> ยืม-คืน (Borrow)</div>
          <div class="m-dropdown-item" onclick="switchTab('tab-licenses')" data-tab="tab-licenses"><i class="fa-solid fa-key w-4"></i> ซอฟต์แวร์ (Licenses)</div>
        </div>
      </div>

      <div class="m-nav-group">
        <div class="m-nav-item"><i class="fa-solid fa-screwdriver-wrench"></i> งานประจำวัน <i class="fa-solid fa-chevron-down ml-1" style="font-size:10px;"></i></div>
        <div class="m-dropdown">
          <div class="m-dropdown-item" onclick="switchTab('tab-pm')" data-tab="tab-pm"><i class="fa-solid fa-clipboard-check w-4"></i> แผนซ่อมบำรุง (PM)</div>
          <div class="m-dropdown-item" onclick="switchTab('tab-cctv')" data-tab="tab-cctv"><i class="fa-solid fa-video w-4"></i> ตรวจสอบ CCTV</div>
          <div class="m-dropdown-item" onclick="switchTab('tab-backup')" data-tab="tab-backup"><i class="fa-solid fa-database w-4"></i> Server Backup</div>
        </div>
      </div>

      <div class="m-nav-item" onclick="switchTab('tab-users')" data-tab="tab-users">
        <i class="fa-solid fa-users"></i> ผู้ใช้งาน
      </div>
    </nav>

    <div style="display:flex;align-items:center;gap:12px;">
      <button onclick="openGlobalSearchModal()" title="ค้นหาด่วนทั่วทั้งระบบ (Ctrl + K)" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:8px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-secondary);font-size:12px;cursor:pointer;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
        <i class="fa-solid fa-magnifying-glass" style="font-size:11px;"></i> <span class="hidden md:inline">ค้นหา</span>
      </button>
      <button onclick="resetDataToDefault()" title="คืนค่าข้อมูลเริ่มต้น" style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid var(--color-border);background:transparent;color:var(--color-text-secondary);cursor:pointer;" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
        <i class="fa-solid fa-rotate" style="font-size:11px;"></i>
      </button>
      <!-- Quick Create Button -->
      <button onclick="openTicketModal()" class="m-btn m-btn-primary" title="สร้าง Ticket ใหม่">
        <i class="fa-solid fa-plus"></i> Ticket
      </button>
    </div>
  </header>
  `;

  html = html.replace(oldHeaderRegex, newNavbarHTML);

  // Remove `<!-- MAIN CONTENT CONTAINER -->` and the `<div class="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar h-screen">` wrapper because we want <main> to handle scrolling now, or just keep it since we made the body flex-col.
  // Actually, keeping the wrapper is fine. `flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar` will just fill the rest of the body under the header.
  
  // 5. Update switchTab function logic in JS
  // We need to change how active class is applied.
  // Replace:
  // document.querySelectorAll('#main-sidebar a, #main-sidebar div[onclick]').forEach(el => ...
  // With logic to update `.m-dropdown-item` and `.m-nav-item`.
  
  const oldSwitchTabRegex = /function switchTab\(tabName\) \{[\s\S]*?document\.getElementById\(tabName\)\.classList\.remove\('hidden'\);\s*\}/;
  
  const newSwitchTabStr = `function switchTab(tabName) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
      });

      // Show requested tab
      if(document.getElementById(tabName)) {
        document.getElementById(tabName).classList.remove('hidden');
      }

      // Update active states on Top Navbar
      document.querySelectorAll('.m-nav-item, .m-dropdown-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('data-tab') === tabName) {
          el.classList.add('active');
          // If it's inside a dropdown, also highlight the parent nav-group
          const group = el.closest('.m-nav-group');
          if (group) {
            const parentItem = group.querySelector('.m-nav-item');
            if (parentItem) parentItem.classList.add('active');
          }
        }
      });
  }`;

  html = html.replace(oldSwitchTabRegex, newSwitchTabStr);

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully migrated to Top Navbar layout.');
} catch (e) {
  console.error(e);
}
