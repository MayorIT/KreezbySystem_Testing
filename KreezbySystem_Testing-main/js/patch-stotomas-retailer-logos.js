'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const STOTOMAS_DIR = path.join(ROOT, 'retailer', 'stotomas');
const BRAND_CSS = '../../../css/pages/retailer/stotomas-retailer-brand.css';
const ALT = {
  luciascafestotomas: "Lucia's Cafe Sto Tomas",
  jma: 'JMA',
  rosegrace: 'Rose & Grace',
  dvinias: "D'Vinias",
  titachu: 'Tita Chu',
  laonglaan: 'Laong Laan',
  rsmbacnotan: 'RSM Bacnotan',
  avilles: 'Avilles'
};

let count = 0;
for (const slug of fs.readdirSync(STOTOMAS_DIR)) {
  const dir = path.join(STOTOMAS_DIR, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.html')) continue;
    let html = fs.readFileSync(path.join(dir, file), 'utf8');
    const alt = ALT[slug] || slug;
    const logoClass = slug === 'rosegrace' ? 'brand-store-logo brand-store-logo--wide' : 'brand-store-logo';
    const block =
      '<div class="brand-logo-panel">\n' +
      '        <img class="' + logoClass + '" src="../../../assets/logo/stotomas/' + slug + '.png" alt="' + alt + ' logo">\n' +
      '        <span class="brand-logo-divider" aria-hidden="true"></span>\n' +
      '        <img class="brand-kreezby-logo" src="../../../assets/logo/kreezby-logo.png" alt="Kreezby logo">\n' +
      '    </div>';
    if (!/<div class="brand-logo-panel">/.test(html)) continue;
    html = html.replace(/<div class="brand-logo-panel">[\s\S]*?<\/div>/, block);
    if (!html.includes('stotomas-retailer-brand.css')) {
      html = html.replace(/(<link rel="stylesheet" href="[^"]+\.css">\s*)/,
        '$1    <link rel="stylesheet" href="' + BRAND_CSS + '">\n');
    }
    fs.writeFileSync(path.join(dir, file), html, 'utf8');
    count++;
  }
}
console.log('Patched Sto. Tomas pages:', count);
