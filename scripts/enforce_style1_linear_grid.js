const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Update CSS for table headers to default to text-align: left
  const oldThCss = /\.m-table thead th, table thead th \{[^}]*\}/;
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
      text-align: left !important;
    }
    
    .m-table tbody td, table tbody td {
      padding: 16px 20px !important;
      text-align: left;
    }`;

  html = html.replace(oldThCss, newThCss);

  // 2. Process all <th class="..."> elements:
  // "จัดการ" -> text-right
  // All other columns -> text-left
  html = html.replace(/<th([^>]*)class="([^"]*)"([^>]*)>/g, (match, before, cls, after) => {
    let newCls = cls.replace(/\btext-center\b|\btext-right\b|\btext-left\b/g, '').trim();
    if (match.includes('>จัดการ<') || match.includes('> Action<')) {
      newCls = (newCls + ' text-right').trim();
    } else {
      newCls = (newCls + ' text-left').trim();
    }
    return `<th${before}class="${newCls}"${after}>`;
  });

  // Also handle <th> without class
  html = html.replace(/<th>/g, '<th class="text-left">');

  // Ensure action cells td (last column) are text-right
  html = html.replace(/<td class="p-3 (?:text-left|text-center)?\s*space-x-1"/g, '<td class="p-3 text-right space-x-1"');
  html = html.replace(/<td class="p-3 space-x-1"/g, '<td class="p-3 text-right space-x-1"');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully enforced Style 1 (Linear/Stripe Clean Natural Grid with text-left everywhere except action column).');
} catch (e) {
  console.error(e);
}
