const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // Fix tables where <thead><tr> opening tags are missing before <th
  // Replace `<table class="m-table w-full text-xs text-left">\n\s*<th` with `<table class="m-table w-full text-xs text-left">\n  <thead>\n    <tr>\n      <th`
  
  html = html.replace(/(<table[^>]*>)\s*(<th)/g, '$1\n  <thead>\n    <tr>\n      $2');

  // Also clean up any lingering bad <thead > or duplicate <thead>
  html = html.replace(/<thead\s*>\s*<thead\s*>/g, '<thead>');
  html = html.replace(/<tr\s*>\s*<tr\s*>/g, '<tr>');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Successfully repaired missing <thead> and <tr> opening tags in HTML tables!');
} catch (e) {
  console.error(e);
}
