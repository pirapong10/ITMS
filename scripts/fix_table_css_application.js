const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Add m-table class to all 12 <table> elements
  html = html.replace(/<table class="w-full text-xs text-left">/g, '<table class="m-table w-full text-xs text-left">');

  // 2. Update CSS to target `table thead th` globally AND `.m-table thead th`
  const newThCss = `.m-table thead th, table thead th {
      position: sticky;
      top: 0;
      background: #F8FAFC !important;
      z-index: 10;
      padding: 24px 20px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: var(--color-text-tertiary) !important;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      white-space: nowrap;
      border-bottom: 1px solid var(--color-border);
      text-align: center;
    }
    
    .m-table tbody td, table tbody td {
      padding: 16px 20px !important;
    }`;

  const oldThCss = /\.m-table thead th \{[^}]*\}/;
  html = html.replace(oldThCss, newThCss);

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully applied m-table class and global <thead> <th> CSS to all 12 tables.');
} catch (e) {
  console.error(e);
}
