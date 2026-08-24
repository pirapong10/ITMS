const fs = require('fs');
let data = fs.readFileSync('it_service_management_system.html', 'utf8');

data = data.replace(/class="bg-transparent border-b border-slate-200\/80 text-slate-400 font-semibold text-\[11px\] uppercase tracking-wider"/g, '');
data = data.replace(/<th class="p-3\.5">/g, '<th>');
data = data.replace(/<th class="p-3">/g, '<th>');
data = data.replace(/<th class="p-3\.5 text-right">/g, '<th class="text-right">');
data = data.replace(/<th class="p-3 text-right">/g, '<th class="text-right">');

fs.writeFileSync('it_service_management_system.html', data);
console.log('Done replacing table classes');
