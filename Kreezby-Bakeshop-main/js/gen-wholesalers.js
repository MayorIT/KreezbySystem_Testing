/**
 * Wholesaler accounts use the shared retailer portal.
 * This script only keeps account manifest homes pointed at that portal.
 * Run: node js/gen-wholesalers.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOME = 'retailer/wholesaler/retailer-portal.html';

['wholesaler', path.join('css', 'pages', 'wholesaler')].forEach(function (rel) {
    var target = path.join(ROOT, rel);
    if (!fs.existsSync(target)) return;
    fs.rmSync(target, { recursive: true, force: true });
    console.log('removed', rel);
});

var manifestPath = path.join(ROOT, 'data', 'wholesalers', '_manifest.json');
if (fs.existsSync(manifestPath)) {
    var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    Object.keys(manifest).forEach(function (key) {
        if (manifest[key] && typeof manifest[key] === 'object') manifest[key].home = HOME;
    });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    console.log('updated data/wholesalers/_manifest.json');
}
