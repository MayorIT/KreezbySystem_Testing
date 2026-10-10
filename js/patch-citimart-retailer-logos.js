/**
 * Apply Citimart + Kreezby logos to citimart branch nav bars.
 * Run: node js/patch-citimart-retailer-logos.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CITIMART_DIR = path.join(ROOT, 'retailer', 'citimart');
const BRAND_CSS = '../../../css/pages/retailer/citimart-retailer-brand.css';

const SLUG_ALT = {
  citimartcaedo: 'Citimart Caedo',
  citimartnuciti: 'Citimart Nuciti',
  citimartbaystaybaymall: 'Citimart Baystay/Baymall',
  citimartshoponrizalave: 'Citimart Shop on/ Rizal Ave',
  citimarttanauan: 'Citimart Tanauan',
  citimartbauan: 'Citimart Bauan',
  citimartlemery: 'Citimart Lemery',
  citimartrosario: 'Citimart Rosario'
};

function patchHtml(filePath, slug) {
  let html = fs.readFileSync(filePath, 'utf8');
  const alt = SLUG_ALT[slug] || 'Citimart';
  const logoSrc = '../../../assets/logo/citimart/' + slug + '.png';
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

  if (!html.includes('citimart-retailer-brand.css')) {
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
  for (const slug of fs.readdirSync(CITIMART_DIR)) {
    const slugDir = path.join(CITIMART_DIR, slug);
    if (!fs.statSync(slugDir).isDirectory()) continue;
    for (const file of fs.readdirSync(slugDir)) {
      if (!file.endsWith('.html')) continue;
      if (patchHtml(path.join(slugDir, file), slug)) count += 1;
    }
  }
  console.log('Patched Citimart retailer pages:', count);
}

main();
