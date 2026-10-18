/**
 * Apply Lipa store + Kreezby logos to lipa retailer nav bars.
 * Run: node js/patch-lipa-retailer-logos.js
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

const LIPA_DIR = path.join(ROOT, 'retailer', 'lipa');
const BRAND_CSS = '../../../css/pages/retailer/lipa-retailer-brand.css';

const SLUG_ALT = {
  sidcmahabangparang: 'SIDC Mahabang Parang',
  sidcsanjose: 'SIDC San Jose',
  banaybanayeatery: 'Banay-banay Eatery',
  aalomilipa: 'AA Lomi Lipa',
  butchlipa: 'Butch Lipa',
  shellselecttambo: 'Shell Select Tambo',
  shellselectbalintawak: 'Shell Select Balintawak',
  chicha: 'Chicha',
  lipagrilllipa: 'Lipa Grill Lipa',
  kubosahalamananmalarayat: 'Kubo sa Halamanan Malarayat',
  lbnmarawoy: 'LBN Marawoy',
  luciascafelipa: 'Lucias Cafe Lipa',
  kubosahalamananmarawoy: 'Kubo sa Halamanan Marawoy'
};

function patchHtml(filePath, slug) {
  let html = fs.readFileSync(filePath, 'utf8');
  const alt = SLUG_ALT[slug] || slug;
  const logoSrc = '../../../assets/logo/lipa/' + logoFile('lipa', slug, alt) + '';
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

  if (!html.includes('lipa-retailer-brand.css')) {
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
  for (const slug of fs.readdirSync(LIPA_DIR)) {
    const slugDir = path.join(LIPA_DIR, slug);
    if (!fs.statSync(slugDir).isDirectory()) continue;
    for (const file of fs.readdirSync(slugDir)) {
      if (!file.endsWith('.html')) continue;
      if (patchHtml(path.join(slugDir, file), slug)) count += 1;
    }
  }
  console.log('Patched Lipa retailer pages:', count);
}

main();
