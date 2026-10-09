'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BAUAN_DIR = path.join(ROOT, 'retailer', 'bauan');
const BRAND_CSS = '../../../css/pages/retailer/bauan-retailer-brand.css';
const ALT = {
  dyans: "Dyan's",
  ofels: 'Ofels',
  jorjhanesstarita: 'Jorjhanes Sta. Rita',
  hmmmuzon: 'HMM Muzon',
  sidcbauan: 'SIDC Bauan',
  sidcstateresita: 'SIDC Sta. Teresita',
  aalomitaal: 'AA Lomi Taal',
  bulabog: 'Bulabog'
};
const WIDE_SLUGS = new Set(['hmmmuzon']);

let count = 0;
for (const slug of fs.readdirSync(BAUAN_DIR)) {
  const dir = path.join(BAUAN_DIR, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.html')) continue;
    let html = fs.readFileSync(path.join(dir, file), 'utf8');
    const alt = ALT[slug] || slug;
    const logoClass = WIDE_SLUGS.has(slug)
      ? 'brand-store-logo brand-store-logo--wide'
      : 'brand-store-logo';
    const block =
      '<div class="brand-logo-panel">\n' +
      '        <img class="' + logoClass + '" src="../../../assets/logo/bauan/' + slug + '.png" alt="' + alt + ' logo">\n' +
      '        <span class="brand-logo-divider" aria-hidden="true"></span>\n' +
      '        <img class="brand-kreezby-logo" src="../../../assets/logo/kreezby-logo.png" alt="Kreezby logo">\n' +
      '    </div>';
    if (!/<div class="brand-logo-panel">/.test(html)) continue;
    html = html.replace(/<div class="brand-logo-panel">[\s\S]*?<\/div>/, block);
    if (!html.includes('bauan-retailer-brand.css')) {
      html = html.replace(/(<link rel="stylesheet" href="[^"]+\.css">\s*)/,
        '$1    <link rel="stylesheet" href="' + BRAND_CSS + '">\n');
    }
    fs.writeFileSync(path.join(dir, file), html, 'utf8');
    count++;
  }
}
console.log('Patched Bauan pages:', count);
