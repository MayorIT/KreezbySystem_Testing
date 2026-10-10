'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'retailer', 'stotomas', 'jmarosegrace');
const SRC_CSS = path.join(ROOT, 'css', 'pages', 'retailer', 'jmarosegrace');

const PAGE_TYPES = ['retailer', 'po', 'receive', 'bo', 'return', 'saleslist', 'alert'];

function copyRetailer(fromSlug, toSlug, storeName, logoAlt) {
  const destDir = path.join(ROOT, 'retailer', 'stotomas', toSlug);
  const destCss = path.join(ROOT, 'css', 'pages', 'retailer', toSlug);
  fs.mkdirSync(destDir, { recursive: true });
  fs.mkdirSync(destCss, { recursive: true });

  for (const type of PAGE_TYPES) {
    const fromFile = type + '-stotomas_' + fromSlug + '.html';
    const toFile = type + '-stotomas_' + toSlug + '.html';
    let html = fs.readFileSync(path.join(SRC_DIR, fromFile), 'utf8');
    html = html
      .split(fromSlug).join(toSlug)
      .split('jmarosegrace').join(toSlug)
      .replace(/JMA Rose &amp; Grace/g, storeName)
      .replace(/JMA Rose & Grace/g, storeName)
      .replace(
        'alt="' + logoAlt + ' logo"',
        'alt="' + storeName + ' logo"'
      )
      .replace(
        '../../../assets/logo/stotomas/jmarosegrace.png',
        '../../../assets/logo/stotomas/' + toSlug + '.png'
      )
      .replace(
        '../../../css/pages/retailer/jmarosegrace/',
        '../../../css/pages/retailer/' + toSlug + '/'
      );
    fs.writeFileSync(path.join(destDir, toFile), html, 'utf8');

    const fromCss = type + '-stotomas_' + fromSlug + '.css';
    const toCss = type + '-stotomas_' + toSlug + '.css';
    let css = fs.readFileSync(path.join(SRC_CSS, fromCss), 'utf8');
    css = css.split(fromSlug).join(toSlug);
    fs.writeFileSync(path.join(destCss, toCss), css, 'utf8');
  }
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) rmDir(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

copyRetailer('jmarosegrace', 'jma', 'JMA', 'JMA');
copyRetailer('jmarosegrace', 'rosegrace', 'Rose & Grace', 'Rose & Grace');

rmDir(SRC_DIR);
rmDir(SRC_CSS);

const jmaJson = { area: 'stotomas', slug: 'jma', storeName: 'JMA', sales: [] };
const roseJson = { area: 'stotomas', slug: 'rosegrace', storeName: 'Rose & Grace', sales: [] };
fs.writeFileSync(path.join(ROOT, 'data', 'retailers', 'stotomas_jma.json'), JSON.stringify(jmaJson, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'data', 'retailers', 'stotomas_rosegrace.json'), JSON.stringify(roseJson, null, 2) + '\n');
fs.unlinkSync(path.join(ROOT, 'data', 'retailers', 'stotomas_jmarosegrace.json'));

const manifestPath = path.join(ROOT, 'data', 'retailers', '_manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
delete manifest.stotomas_jmarosegrace;
manifest.stotomas_jma = {
  area: 'stotomas', slug: 'jma', storeName: 'JMA', count: 0, lastDate: null,
  json: 'data/retailers/stotomas_jma.json'
};
manifest.stotomas_rosegrace = {
  area: 'stotomas', slug: 'rosegrace', storeName: 'Rose & Grace', count: 0, lastDate: null,
  json: 'data/retailers/stotomas_rosegrace.json'
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const reorganizePath = path.join(ROOT, 'js', 'reorganize-retailer-by-location.js');
let reorganize = fs.readFileSync(reorganizePath, 'utf8');
reorganize = reorganize.replace(
  "'luciascafestotomas', 'jmarosegrace', 'dvinias'",
  "'luciascafestotomas', 'jma', 'rosegrace', 'dvinias'"
);
fs.writeFileSync(reorganizePath, reorganize, 'utf8');

console.log('Split jmarosegrace -> jma + rosegrace');
