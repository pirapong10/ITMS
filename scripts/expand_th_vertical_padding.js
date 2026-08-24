const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Update CSS for .m-table thead th vertical padding to 26px
  const oldThCss = /\.m-table thead th \{[^}]*\}/;
  const newThCss = `.m-table thead th {
      position: sticky;
      top: 0;
      background: #F8FAFC;
      z-index: 10;
      padding: 26px 24px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.07em;
      white-space: nowrap;
      border-bottom: 1px solid var(--color-border);
      text-align: center;
    }`;

  html = html.replace(oldThCss, newThCss);

  // 2. Strip conflicting Tailwind padding classes (p-*, py-*, px-*) from all <th> elements
  html = html.replace(/<th([^>]*)class="([^"]*)"([^>]*)>/g, (match, before, cls, after) => {
    let newCls = cls.replace(/\b(p|py|px)-[0-9.]+\b/g, '').replace(/\s+/g, ' ').trim();
    return `<th${before}class="${newCls}"${after}>`;
  });

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully expanded vertical padding (top-bottom) for all table headers.');
} catch (e) {
  console.error(e);
}
