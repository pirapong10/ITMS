const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // 1. Clean up duplicate CSS in <style>
  const styleCleanupRegex = /\.m-th-content\s*\{[^}]*\}\s*\.m-th-content\s*\{[^}]*\}/g;
  html = html.replace(styleCleanupRegex, '');
  
  // Remove .m-th-content CSS completely if we are doing pure Style 1
  html = html.replace(/\.m-th-content\s*\{[^}]*\}/g, '');

  // 2. Update .m-table thead th CSS
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

  // 3. Unwrap <div class="m-th-content"><span>...</span>...</div> inside <th>
  html = html.replace(/<th([^>]*)>\s*<div class="m-th-content">\s*<span>([\s\S]*?)<\/span>\s*(<i[^>]*><\/i>)?\s*<\/div>\s*<\/th>/g, (match, attrs, text, icon) => {
    const sortIcon = icon ? ` ${icon}` : '';
    const isAction = text.trim() === 'จัดการ' || text.trim() === 'Action';
    const alignClass = isAction ? 'text-right' : 'text-left';
    return `<th class="${alignClass}">${text.trim()}${sortIcon}</th>`;
  });

  // Handle any remaining <th> tags without m-th-content
  html = html.replace(/<th([^>]*)>([\s\S]*?)<\/th>/g, (match, attrs, content) => {
    if (content.includes('m-th-content')) return match;
    const isAction = content.includes('จัดการ') || content.includes('Action');
    const alignClass = isAction ? 'text-right' : 'text-left';
    // ensure text-left or text-right class
    return `<th class="${alignClass}">${content.trim()}</th>`;
  });

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully reverted to pure Style 1 (Clean Natural Grid).');
} catch (e) {
  console.error(e);
}
