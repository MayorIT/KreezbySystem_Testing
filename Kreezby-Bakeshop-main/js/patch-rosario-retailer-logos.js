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

const ROSARIO_DIR = path.join(ROOT, 'retailer', 'rosario');
const BRAND_CSS = '../../../css/pages/retailer/rosario-retailer-brand.css';
const ALT = {
  bencha: 'Ben & Cha',
  sidcibaan: 'SIDC IBAAN',
  balkonahe: 'Balkonahe',
  chicknjrosario: "Chick'N J Rosario",
  chicknjpadregarcia: "Chick'N J Padre Garcia",
  chicknjibaan: "Chick'N J Ibaan",
  matteosliquiwan: 'Matteos Liquiwan',
  aalomipadregarcia: 'AA Lomi Padre Garcia',
  lipagrillsanfelipe: 'Lipa Grill San Felipe',
  yummies: 'Yummies',
  hangout: 'Hang Out'
};

let count = 0;
for (const slug of fs.readdirSync(ROSARIO_DIR)) {
  const dir = path.join(ROSARIO_DIR, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.html')) continue;
    let html = fs.readFileSync(path.join(dir, file), 'utf8');
    const alt = ALT[slug] || slug;
    const block =
      '<div class="brand-logo-panel">\n' +
      '        <img class="brand-store-logo" src="../../../assets/logo/rosario/' + logoFile('rosario', slug, alt) + '" alt="' + alt + ' logo">\n' +
      '        <span class="brand-logo-divider" aria-hidden="true"></span>\n' +
      '        <img class="brand-kreezby-logo" src="../../../assets/logo/kreezby-logo.png" alt="Kreezby logo">\n' +
      '    </div>';
    if (!/<div class="brand-logo-panel">/.test(html)) continue;
    html = html.replace(/<div class="brand-logo-panel">[\s\S]*?<\/div>/, block);
    if (!html.includes('rosario-retailer-brand.css')) {
      html = html.replace(/(<link rel="stylesheet" href="[^"]+\.css">\s*)/,
        '$1    <link rel="stylesheet" href="' + BRAND_CSS + '">\n');
    }
    fs.writeFileSync(path.join(dir, file), html, 'utf8');
    count++;
  }
}
console.log('Patched Rosario pages:', count);
