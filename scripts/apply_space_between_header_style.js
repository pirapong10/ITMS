const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Add CSS for .m-th-content
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
    }
    .m-th-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 8px;
    }`;

  html = html.replace(oldThCss, newThCss);

  // 2. Transform all <th> containing sort icons to use <div class="m-th-content">
  // Match <th ...>Text <i class="fa-solid fa-sort ..."></i></th>
  // Replace with <th ...><div class="m-th-content"><span>Text</span><i class="fa-solid fa-sort ..."></i></div></th>

  html = html.replace(/<th([^>]*)>\s*([\s\S]*?)\s*<i class="fa-solid fa-sort([^"]*)"[^>]*><\/i>\s*<\/th>/g, (match, attrs, text, iconAttrs) => {
    // Trim text
    const cleanText = text.trim();
    return `<th${attrs}><div class="m-th-content"><span>${cleanText}</span><i class="fa-solid fa-sort${iconAttrs}"></i></div></th>`;
  });

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully applied Style 3 (Space-Between Header).');
} catch (e) {
  console.error(e);
}
