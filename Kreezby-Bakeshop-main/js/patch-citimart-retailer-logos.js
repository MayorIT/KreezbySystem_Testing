/**
 * Apply Citimart + Kreezby logos to citimart branch nav bars.
 * Run: node js/patch-citimart-retailer-logos.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function logoFile(area, slug, alt) {
  const dir = path.join(ROOT, 'assets', 'logo', area);
  const named = String(alt || '')
    .toLowerCase()
    .replace(/mr\.fields/g, 'mr-fields')
    .replace(/chick'n j/g, 'chick-nj')
    .replace(/d'vinias/g, 'd-vinias')
    .replace(/&/g, ' ')
    .replace(/['’+.]/g, '')
    .replace(/coffe\b/g, 'coffee')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const options = [];
  if (named) options.push(named + '.png');
  options.push(slug + '.png');
  for (let i = 0; i < options.length; i++) {
    if (fs.existsSync(path.join(dir, options[i]))) return options[i];
  }
  return options[0] || (slug + '.png');
}

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
  const logoSrc = '../../../assets/logo/citimart/' + logoFile('citimart', slug, alt) + '';
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
