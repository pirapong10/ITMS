const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');
  let originalHtml = html;

  // 1. Modals Backgrounds
  html = html.replace(/bg-white\s+w-full\s+max-w-[a-z0-9]+\s+rounded-2xl\s+shadow-xl\s+overflow-hidden/g, (match) => {
    const maxWidth = match.match(/max-w-[a-z0-9]+/)[0];
    return `m-modal w-full ${maxWidth}`;
  });
  
  html = html.replace(/bg-white\s+w-full\s+max-w-[a-z0-9]+\s+rounded-2xl\s+shadow-2xl\s+overflow-hidden/g, (match) => {
    const maxWidth = match.match(/max-w-[a-z0-9]+/)[0];
    return `m-modal w-full ${maxWidth}`;
  });

  // 2. Modal Headers
  html = html.replace(/px-6\s+py-4\s+border-b\s+flex\s+justify-between\s+items-center\s+bg-slate-50/g, 'm-modal-header');
  html = html.replace(/px-6\s+py-4\s+border-b\s+flex\s+justify-between\s+items-start/g, 'm-modal-header');
  html = html.replace(/px-[0-9]\s+py-[0-9]\s+border-b\s+flex\s+justify-between\s+items-center/g, 'm-modal-header');
  html = html.replace(/px-[0-9]\s+py-[0-9]\s+border-b\s+border-slate-[0-9]+\s+flex\s+justify-between\s+items-center\s+bg-slate-[0-9]+/g, 'm-modal-header');

  // 3. Modal Footers
  html = html.replace(/px-6\s+py-4\s+border-t\s+bg-slate-50\s+flex\s+justify-end\s+gap-2/g, 'm-modal-footer flex justify-end gap-2');
  html = html.replace(/px-6\s+py-4\s+border-t\s+flex\s+justify-end\s+gap-2/g, 'm-modal-footer flex justify-end gap-2');
  html = html.replace(/px-[0-9]\s+py-[0-9]\s+border-t\s+border-slate-[0-9]+\s+bg-slate-[0-9]+\s+flex\s+justify-end\s+gap-2/g, 'm-modal-footer flex justify-end gap-2');

  // 4. Inputs
  html = html.replace(/w-full\s+border\s+rounded-lg\s+px-3\s+py-2\s+text-xs\s+bg-white\s+focus:outline-none\s+focus:ring-2\s+focus:ring-[a-z]+-[0-9]+/g, 'm-input');
  html = html.replace(/w-full\s+border\s+rounded-lg\s+px-3\s+py-2\s+text-xs\s+bg-slate-50\s+focus:outline-none\s+focus:ring-2\s+focus:ring-[a-z]+-[0-9]+/g, 'm-input');
  html = html.replace(/w-full\s+border\s+rounded-xl\s+px-3\s+py-2\s+text-xs\s+bg-white\s+border-slate-[0-9]+\/?[0-9]*\s+focus:outline-none\s+focus:ring-2\s+focus:ring-slate-[0-9]+\/?[0-9]*/g, 'm-input');
  html = html.replace(/w-full\s+px-3\s+py-2\s+text-xs\s+border\s+rounded-xl\s+bg-white\s+border-slate-200\/80\s+focus:outline-none\s+focus:ring-2\s+focus:ring-slate-900\/10/g, 'm-input');
  html = html.replace(/w-full\s+border\s+rounded-xl\s+px-3\s+py-2\s+text-xs\s+bg-white\s+border-slate-200\/80\s+font-medium\s+focus:outline-none\s+focus:ring-2\s+focus:ring-slate-900\/10/g, 'm-input');
  html = html.replace(/w-full\s+border\s+rounded-lg\s+px-2\s+py-1\s+text-xs\s+bg-slate-50/g, 'm-input');
  html = html.replace(/border\s+rounded-lg\s+px-2\s+py-1\s+text-xs\s+font-semibold\s+bg-white/g, 'm-input');
  
  // 5. Buttons
  html = html.replace(/bg-indigo-600\s+hover:bg-indigo-700\s+text-white\s+text-xs\s+px-4\s+py-2\s+rounded-lg\s+font-bold/g, 'm-btn m-btn-accent');
  html = html.replace(/bg-indigo-600\s+hover:bg-indigo-700\s+text-white\s+text-xs\s+px-4\s+py-2\.5\s+rounded-xl\s+font-medium\s+flex\s+items-center\s+gap-2\s+shadow-sm\s+transition/g, 'm-btn m-btn-accent');
  html = html.replace(/bg-amber-600\s+hover:bg-amber-700\s+text-white\s+text-xs\s+px-4\s+py-2\.5\s+rounded-xl\s+font-semibold\s+flex\s+items-center\s+gap-2\s+shadow-sm\s+transition/g, 'm-btn m-btn-primary');
  html = html.replace(/bg-white\s+border\s+border-slate-300\s+hover:bg-slate-50\s+text-slate-700\s+text-xs\s+px-4\s+py-2\s+rounded-lg\s+font-bold/g, 'm-btn m-btn-ghost');
  html = html.replace(/px-4\s+py-2\s+bg-slate-100\s+hover:bg-slate-200\s+text-slate-700\s+rounded-lg\s+text-xs\s+font-bold/g, 'm-btn m-btn-ghost');
  html = html.replace(/p-1\.5\s+bg-rose-50\s+hover:bg-rose-100\s+text-rose-600\s+rounded-lg\s+text-xs\s+font-semibold/g, 'm-btn m-btn-danger m-btn-icon');
  html = html.replace(/p-1\.5\s+bg-indigo-50\s+hover:bg-indigo-100\s+text-indigo-600\s+rounded-lg\s+text-xs\s+font-semibold/g, 'm-btn m-btn-accent m-btn-icon');
  html = html.replace(/p-1\.5\s+bg-slate-100\s+hover:bg-slate-200\s+text-slate-700\s+rounded-lg\s+text-xs/g, 'm-btn m-btn-ghost m-btn-icon');
  html = html.replace(/px-2\s+py-1\s+bg-rose-50\s+hover:bg-rose-100\s+text-rose-600\s+font-semibold\s+rounded-lg\s+text-xs/g, 'm-btn m-btn-danger m-btn-icon');
  html = html.replace(/px-2\s+py-1\s+bg-emerald-50\s+hover:bg-emerald-100\s+text-emerald-700\s+font-bold\s+rounded-lg\s+text-xs\s+mr-1/g, 'm-btn m-btn-primary m-btn-icon mr-1');
  html = html.replace(/px-2\s+py-1\s+bg-slate-100\s+hover:bg-slate-200\s+text-slate-700\s+font-semibold\s+rounded-lg\s+text-xs\s+mr-1/g, 'm-btn m-btn-ghost m-btn-icon mr-1');
  
  html = html.replace(/text-xs\s+text-indigo-600\s+font-semibold\s+hover:bg-indigo-50\s+px-1\.5\s+py-1\s+rounded-lg/g, 'm-btn m-btn-accent m-btn-icon');
  html = html.replace(/text-xs\s+text-amber-600\s+font-semibold\s+hover:bg-amber-50\s+px-1\.5\s+py-1\s+rounded-lg/g, 'm-btn m-btn-primary m-btn-icon');
  html = html.replace(/text-xs\s+text-slate-600\s+font-semibold\s+hover:bg-slate-100\s+px-1\.5\s+py-1\s+rounded-lg/g, 'm-btn m-btn-ghost m-btn-icon');
  html = html.replace(/text-xs\s+text-rose-600\s+font-semibold\s+hover:bg-rose-50\s+px-1\.5\s+py-1\s+rounded-lg/g, 'm-btn m-btn-danger m-btn-icon');
  html = html.replace(/text-xs\s+text-purple-600\s+font-semibold\s+hover:bg-purple-50\s+px-2\s+py-1\s+rounded-lg/g, 'm-btn m-btn-primary m-btn-icon');
  html = html.replace(/text-xs\s+text-slate-600\s+font-semibold\s+hover:bg-slate-100\s+px-2\s+py-1\s+rounded-lg/g, 'm-btn m-btn-ghost m-btn-icon');
  html = html.replace(/text-xs\s+text-rose-600\s+font-semibold\s+hover:bg-rose-50\s+px-2\s+py-1\s+rounded-lg/g, 'm-btn m-btn-danger m-btn-icon');
  
  html = html.replace(/ml-2\s+px-3\s+py-1\s+bg-[a-z]+-600\s+hover:bg-[a-z]+-700\s+text-white\s+rounded-lg\s+font-medium\s+text-xs\s+shadow-sm/g, 'm-btn m-btn-primary ml-2');
  html = html.replace(/px-2\.5\s+py-1\s+bg-emerald-50\s+hover:bg-emerald-100\s+text-emerald-700\s+font-bold\s+rounded-lg\s+text-xs\s+transition/g, 'm-btn m-btn-primary');

  // Add the minimal filter bar
  html = html.replace(/bg-slate-50\/70\s+p-3\.5\s+rounded-2xl\s+border\s+border-slate-200\/60/g, 'm-filter-bar');

  if (html !== originalHtml) {
    fs.writeFileSync('it_service_management_system.html', html);
    console.log('UI elements successfully refactored to Minimal system.');
  } else {
    console.log('No matches found for refactoring.');
  }
} catch (e) {
  console.error(e);
}
