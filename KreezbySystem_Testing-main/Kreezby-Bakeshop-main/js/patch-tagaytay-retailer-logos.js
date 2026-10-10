'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const TAGAYTAY_DIR = path.join(ROOT, 'retailer', 'tagaytay');
const BRAND_CSS = '../../../css/pages/retailer/tagaytay-retailer-brand.css';
const ALT = {
  sinangagexpresstagaytay: 'Sinangag Express Tagaytay',
  balinsasayawsilang: 'Balinsasayaw Silang',
  jayteesacienda: 'Jaytees Acienda',
  rsmsilvinas: 'RSM Silvinas',
  pamana: 'Pamana',
  jayteesmain: 'Jaytees Main',
  balinsasayawtagaytay: 'Balinsasayaw Tagaytay',
  greenats: 'Green Ats',
  jaytees9th: 'Jaytees 9th'
};
const WIDE_SLUGS = new Set(['sinangagexpresstagaytay']);

let count = 0;
for (const slug of fs.readdirSync(TAGAYTAY_DIR)) {
  const dir = path.join(TAGAYTAY_DIR, slug);
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
      '        <img class="' + logoClass + '" src="../../../assets/logo/tagaytay/' + slug + '.png" alt="' + alt + ' logo">\n' +
      '        <span class="brand-logo-divider" aria-hidden="true"></span>\n' +
      '        <img class="brand-kreezby-logo" src="../../../assets/logo/kreezby-logo.png" alt="Kreezby logo">\n' +
      '    </div>';
    if (!/<div class="brand-logo-panel">/.test(html)) continue;
    html = html.replace(/<div class="brand-logo-panel">[\s\S]*?<\/div>/, block);
    if (!html.includes('tagaytay-retailer-brand.css')) {
      html = html.replace(/(<link rel="stylesheet" href="[^"]+\.css">\s*)/,
        '$1    <link rel="stylesheet" href="' + BRAND_CSS + '">\n');
    }
    fs.writeFileSync(path.join(dir, file), html, 'utf8');
    count++;
  }
}
console.log('Patched Tagaytay pages:', count);
