const fs = require('fs');

try {
  const html = fs.readFileSync('it_service_management_system.html', 'utf8');
  const tables = html.match(/<table[^>]*m-table[^>]*>[\s\S]*?<\/table>/g);
  let totalTh = 0;
  
  if (tables) {
    tables.forEach((t, i) => {
      const ths = t.match(/<th[^>]*>[\s\S]*?<\/th>/g);
      if (ths) {
        totalTh += ths.length;
        console.log(`Table ${i+1}: ${ths.length} th elements`);
      }
    });
    console.log(`Total TH count in .m-table: ${totalTh}`);
  } else {
    console.log('No m-table found.');
  }

} catch (e) {
  console.error(e);
}
