const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Update CSS for table headers to default to text-center
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
      text-align: center;
    }`;

  html = html.replace(oldThCss, newThCss);

  // 2. Change all <th class="..."> to text-center for EVERY column
  html = html.replace(/<th([^>]*)class="([^"]*)"([^>]*)>/g, (match, before, cls, after) => {
    let newCls = cls.replace(/\btext-left\b|\btext-right\b|\btext-center\b/g, '').trim();
    newCls = (newCls + ' text-center').trim();
    return `<th${before}class="${newCls}"${after}>`;
  });

  // Handle <th> without class
  html = html.replace(/<th>/g, '<th class="text-center">');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully set all table headers to text-center.');
} catch (e) {
  console.error(e);
}
