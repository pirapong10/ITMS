const fs = require('fs');

try {
  let html = fs.readFileSync('it_service_management_system.html', 'utf8');

  // Remove md:flex-row from body
  html = html.replace(/md:flex-row/g, 'flex-col');
  
  // Clean up old sidebar backdrop
  html = html.replace(/<!-- MOBILE SIDEBAR BACKDROP OVERLAY -->[\s\S]*?<!-- SIDEBAR NAVIGATION — Minimal Light -->/g, '');

  // Increase the padding of the main container slightly for ultra-wide screens
  // change lg:p-8 to lg:p-10 to give more breathing room on the sides now that sidebar is gone
  html = html.replace(/<main class="p-6 lg:p-8 space-y-6 flex-1">/, '<main class="p-6 lg:p-10 space-y-6 flex-1 w-full max-w-[1600px] mx-auto">');
  
  // Ensure the navbar also has a max-width if we are constraining the main content, 
  // or just let it stretch. Let's let the navbar stretch but its content constrain?
  // Actually, for ITSM, 100% width is often fine, but limiting to 1600px max width is very premium.
  html = html.replace(/\.m-navbar \{/, '.m-navbar {\n      width: 100%;\n      max-width: 1600px;\n      margin: 0 auto;\n');

  fs.writeFileSync('it_service_management_system.html', html);
  console.log('Cleaned up layout and improved spacing.');
} catch (e) {
  console.error(e);
}
