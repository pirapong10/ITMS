const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // Let's completely wipe out the old switchTab function and replace it with a clean one
  // We can locate it by `function switchTab(tabName) {` down to `const titles = {`
  const startIndex = html.indexOf('function switchTab(tabName) {');
  const endIndex = html.indexOf('const titles = {');

  if (startIndex !== -1 && endIndex !== -1) {
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex);

    const newSwitchTab = `function switchTab(tabName) {
      // 1. Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
        tab.classList.remove('opacity-100');
        tab.classList.add('opacity-0');
      });

      // 2. Parse ID. In top nav, data-tab="tab-dashboard", but tab container id is just "tab-dashboard".
      // Let's normalize it. If tabName is 'dashboard', target is 'tab-dashboard'.
      // If tabName is 'tab-dashboard', target is 'tab-dashboard'.
      let targetId = tabName.startsWith('tab-') ? tabName : 'tab-' + tabName;
      let targetTab = document.getElementById(targetId);

      // 3. Show target tab
      if (targetTab) {
        targetTab.classList.remove('hidden');
        setTimeout(() => {
          targetTab.classList.remove('opacity-0');
          targetTab.classList.add('opacity-100');
        }, 10);
      }

      // 4. Update Top Navbar Active State
      document.querySelectorAll('.m-nav-item, .m-dropdown-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('data-tab') === targetId) {
          el.classList.add('active');
          // Highlight parent group if inside a dropdown
          const group = el.closest('.m-nav-group');
          if (group) {
            const parentItem = group.querySelector('.m-nav-item');
            if (parentItem) parentItem.classList.add('active');
          }
        }
      });
      
      // We pass the normalized name to titles
      let rawName = targetId.replace('tab-', '');
      tabName = rawName; // for the rest of the function below

      `;
      
      html = before + newSwitchTab + after;
      
      // Also we need to fix the closing brace for switchTab! 
      // The old code had `renderPmCompletionGraph(); }` at the end of switchTab.
      // Since we just replaced the top half, the bottom half is still there and valid.
      
      fs.writeFileSync('it_service_management_system.html', html);
      console.log('Successfully fixed switchTab!');
  } else {
      console.log('Could not find switchTab boundaries');
  }

} catch (e) {
  console.error(e);
}
