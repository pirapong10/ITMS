const fs = require('fs');

try {
  const html = fs.readFileSync('it_service_management_system.html', 'utf8');
  const matches = html.match(/<button[^>]*>([\s\S]*?)<\/button>/g);
  let report = '# 🔎 การวิเคราะห์ปุ่มกด (Button Analysis Report)\n\n';

  if (matches) {
    let buttonId = 1;
    matches.forEach(m => {
      const clsMatch = m.match(/class="([^"]*)"/);
      const cls = clsMatch ? clsMatch[1] : 'NONE';
      const text = m.replace(/<[^>]+>/g, '').trim();
      const hasIcon = m.includes('<i ');
      const isIconOnly = hasIcon && text.length === 0;

      report += `### Button ${buttonId}\n`;
      report += `- **Text**: \`${text || '[ไม่มีข้อความ / Icon Only]'}\`\n`;
      report += `- **Class**: \`${cls}\`\n`;
      report += `- **Has Icon**: ${hasIcon ? '✅ Yes' : '❌ No'}\n`;
      report += `- **HTML Snippet**: \n\`\`\`html\n${m.replace(/\n/g, ' ')}\n\`\`\`\n`;
      
      // Analysis logic
      if (cls.includes('m-btn-icon') && !isIconOnly) {
         report += `> [!WARNING]\n> **ข้อควรระวัง**: ปุ่มนี้ใช้คลาส \`.m-btn-icon\` (ซึ่งบังคับความกว้าง/ความสูงให้เป็นสี่เหลี่ยมจตุรัส) แต่มีข้อความอยู่ข้างใน อาจทำให้การแสดงผลผิดเพี้ยน\n`;
      } else if (!cls.includes('m-btn') && !cls.includes('hidden') && !cls.includes('close') && !cls.includes('fa-xmark')) {
         report += `> [!NOTE]\n> **ข้อสังเกต**: ปุ่มนี้ไม่ได้ใช้ระบบ \`.m-btn\` อาจมีสไตล์ที่ไม่เข้ากันกับส่วนอื่น\n`;
      } else {
         report += `> [!TIP]\n> **สถานะ**: ปกติ/เป็นไปตามระบบ Design System\n`;
      }
      report += `---\n\n`;
      buttonId++;
    });
  }

  fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\7d65dcf5-aef5-43d1-9de2-f94a9466929a\\button_analysis_report.md', report);
  console.log('Report generated.');
} catch (e) {
  console.error(e);
}
