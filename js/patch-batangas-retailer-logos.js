/**
 * Apply Batangas store logos to retailer nav bars.
 * Run: node js/patch-batangas-retailer-logos.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BATANGAS_DIR = path.join(ROOT, 'retailer', 'batangas');
const BRAND_CSS = '../../../css/pages/retailer/batangas-retailer-brand.css';

const SLUG_ALT = {
  '3m': '3M',
  aalomibalagtas: 'AA Lomi Balagtas',
  butchalangilan: 'Butch Alangilan',
  graciaspasalubong: 'Gracias Pasalubong',
  jhorjhanesbalagtas: 'Jhorjhanes Balagtas',
  shellselectkumintangibaba: 'Shell Select Kumintang Ibaba',
  sidclibjo: 'SIDC Libjo',
  sidcmain: 'SIDC Main',
  sidcpallocan: 'SIDC Pallocan',
  sidcsorosoroilaya: 'SIDC Soro-Soro Ilaya',
  sidctulo: 'SIDC Tulo',
  wanamsabukidbalagtas: 'Wanam sa Bukid Balagtas',
  wanamsabukidgulod: 'Wanam sa Bukid Gulod',
  wanamsabukidpalengke: 'Wanam sa Bukid Palengke'
};

function patchHtml(filePath, slug) {
  let html = fs.readFileSync(filePath, 'utf8');
  const alt = SLUG_ALT[slug] || slug;
  const logoSrc = '../../../assets/logo/batangas/' + slug + '.png';
  const kreezbySrc = '../../../assets/logo/kreezby-logo.png';
  const brandBlock =
    '<div class="brand-logo-panel">\n' +
    '        <img class="brand-store-logo" src="' + logoSrc + '" alt="' + alt + ' logo">\n' +
    '        <span class="brand-logo-divider" aria-hidden="true"></span>\n' +
    '        <img class="brand-kreezby-logo" src="' + kreezbySrc + '" alt="Kreezby logo">\n' +
    '    </div>';

  const brandRe = /<div class="brand-logo-panel">[\s\S]*?<\/div>/;
  if (!brandRe.test(html)) return false;
  html = html.replace(brandRe, brandBlock);

  if (!html.includes('batangas-retailer-brand.css')) {
    html = html.replace(
      /(<link rel="stylesheet" href="[^"]+\.css">\s*)/,
      '$1    <link rel="stylesheet" href="' + BRAND_CSS + '">\n'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

function main() {
  let count = 0;
  for (const slug of fs.readdirSync(BATANGAS_DIR)) {
    const slugDir = path.join(BATANGAS_DIR, slug);
    if (!fs.statSync(slugDir).isDirectory()) continue;
    for (const file of fs.readdirSync(slugDir)) {
      if (!file.endsWith('.html')) continue;
      if (patchHtml(path.join(slugDir, file), slug)) count += 1;
    }
  }
  console.log('Patched Batangas retailer pages:', count);
}

main();
