const fs = require('fs');

try {
  const html = fs.readFileSync('it_service_management_system.html', 'utf8');
  const matches = html.match(/<thead[\s\S]*?<\/thead>/g);
  let summary = 'Table Headers Analysis\n\n';
  
  if (matches) {
    matches.forEach((m, i) => {
      const text = m.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      summary += `Table ${i+1}:\n${text}\n-------------------\n`;
    });
  }
  
  fs.writeFileSync('table_headers_summary.txt', summary);
  console.log('Summary generated.');
} catch (e) {
  console.error(e);
}
