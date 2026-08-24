const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Update CSS for table headers to default to text-left
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
    }`;

  html = html.replace(oldThCss, newThCss);

  // 2. Change all <th class="..."> alignment to text-left, EXCEPT "จัดการ" which is text-right
  // First, strip existing text-center / text-right / text-left from <th> tags
  html = html.replace(/<th([^>]*)class="([^"]*)"([^>]*)>/g, (match, before, cls, after) => {
    let newCls = cls.replace(/\btext-center\b|\btext-right\b|\btext-left\b/g, '').trim();
    if (match.includes('>จัดการ<') || match.includes('> Action<')) {
      newCls = (newCls + ' text-right').trim();
    } else {
      newCls = (newCls + ' text-left').trim();
    }
    return `<th${before}class="${newCls}"${after}>`;
  });

  // Also handle <th> without class attribute
  html = html.replace(/<th>/g, '<th class="text-left">');

  // 3. Fix action column <th> to be text-right
  html = html.replace(/<th class="text-left">\s*จัดการ\s*<\/th>/g, '<th class="text-right">จัดการ</th>');

  // 4. Update <td> in JS render functions / static HTML
  // Ensure table body cells match left alignment, except action button cell (last td) which is text-right
  html = html.replace(/<td class="p-3 text-center space-x-1"/g, '<td class="p-3 text-right space-x-1"');
  html = html.replace(/<td class="p-3 text-left space-x-1"/g, '<td class="p-3 text-right space-x-1"');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully applied Style 1 (Linear/Stripe Clean Natural Grid).');
} catch (e) {
  console.error(e);
}
