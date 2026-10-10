'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MANILA_DIR = path.join(ROOT, 'retailer', 'manila');
const BRAND_CSS = '../../../css/pages/retailer/manila-retailer-brand.css';
const ALT = {
  mangmuringtotal: 'Mang Muring Total',
  mangmuringshell: 'Mang Muring Shell'
};

let count = 0;
for (const slug of fs.readdirSync(MANILA_DIR)) {
  const dir = path.join(MANILA_DIR, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.html')) continue;
    let html = fs.readFileSync(path.join(dir, file), 'utf8');
    const alt = ALT[slug] || slug;
    const block =
      '<div class="brand-logo-panel">\n' +
      '        <img class="brand-store-logo" src="../../../assets/logo/manila/' + slug + '.png" alt="' + alt + ' logo">\n' +
      '        <span class="brand-logo-divider" aria-hidden="true"></span>\n' +
      '        <img class="brand-kreezby-logo" src="../../../assets/logo/kreezby-logo.png" alt="Kreezby logo">\n' +
      '    </div>';
    if (!/<div class="brand-logo-panel">/.test(html)) continue;
    html = html.replace(/<div class="brand-logo-panel">[\s\S]*?<\/div>/, block);
    if (!html.includes('manila-retailer-brand.css')) {
      html = html.replace(/(<link rel="stylesheet" href="[^"]+\.css">\s*)/,
        '$1    <link rel="stylesheet" href="' + BRAND_CSS + '">\n');
    }
    fs.writeFileSync(path.join(dir, file), html, 'utf8');
    count++;
  }
}
console.log('Patched Manila pages:', count);
