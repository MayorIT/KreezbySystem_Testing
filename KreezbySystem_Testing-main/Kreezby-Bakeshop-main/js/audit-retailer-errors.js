const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const retailerDir = path.join(ROOT, 'retailer');
const cssBase = path.join(ROOT, 'css', 'pages', 'retailer');

const issues = { missingCss: [], missingHtmlRefs: [], orphanCss: [], brokenSidebar: [], emptyDirs: [] };

function walk(dir, cb) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) cb(p, ent.name, true);
        else if (ent.name.endsWith('.html')) cb(p, ent.name, false);
    }
}

// orphan CSS (stocks pages removed?)
const cssSlugs = fs.readdirSync(cssBase);
cssSlugs.forEach(slug => {
    const slugDir = path.join(cssBase, slug);
    if (!fs.statSync(slugDir).isDirectory()) return;
    let htmlDir = null;
    for (const area of fs.readdirSync(retailerDir)) {
        const candidate = path.join(retailerDir, area, slug);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
            htmlDir = candidate;
            break;
        }
    }
    if (!htmlDir) {
        const flat = path.join(retailerDir, slug);
        if (fs.existsSync(flat) && fs.statSync(flat).isDirectory()) htmlDir = flat;
    }
    if (!htmlDir) {
        issues.orphanCss.push('css/pages/retailer/' + slug + ' (no matching retailer folder)');
        return;
    }
    for (const f of fs.readdirSync(slugDir)) {
        if (f.startsWith('stocks-') && !fs.existsSync(path.join(htmlDir, f.replace('.css', '.html')))) {
            issues.orphanCss.push('css/pages/retailer/' + slug + '/' + f);
        }
    }
});

walk(retailerDir, (filePath, name, isDir) => {
    if (isDir) {
        const files = fs.readdirSync(filePath);
        if (files.length === 0) issues.emptyDirs.push(filePath.replace(ROOT + path.sep, ''));
        return;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const rel = filePath.replace(ROOT + path.sep, '');

    // CSS href check
    const cssMatch = html.match(/href="([^"]+\.css)"/);
    if (cssMatch) {
        const cssRel = cssMatch[1].replace(/\//g, path.sep);
        const cssAbs = path.normalize(path.join(path.dirname(filePath), cssRel));
        if (!fs.existsSync(cssAbs)) {
            issues.missingCss.push(rel + ' -> ' + cssMatch[1]);
        }
    }

    // internal html hrefs in same folder
    const hrefs = [...html.matchAll(/href="([^"#][^"]*\.html)"/g)].map(m => m[1]);
    hrefs.forEach(href => {
        if (href.startsWith('http') || href.startsWith('../')) return;
        const target = path.join(path.dirname(filePath), href);
        if (!fs.existsSync(target)) {
            issues.missingHtmlRefs.push(rel + ' -> ' + href);
        }
    });

    if (html.includes('stocks-') && html.includes('tree-node')) {
        issues.brokenSidebar.push(rel + ' (still references stocks in sidebar?)');
    }
});

console.log('=== Retailer audit ===');
console.log('Missing CSS:', issues.missingCss.length);
issues.missingCss.slice(0, 15).forEach(x => console.log('  ', x));
if (issues.missingCss.length > 15) console.log('  ... and', issues.missingCss.length - 15, 'more');

console.log('\nMissing HTML refs:', issues.missingHtmlRefs.length);
issues.missingHtmlRefs.slice(0, 15).forEach(x => console.log('  ', x));
if (issues.missingHtmlRefs.length > 15) console.log('  ... and', issues.missingHtmlRefs.length - 15, 'more');

console.log('\nOrphan stocks CSS files:', issues.orphanCss.length);
issues.orphanCss.slice(0, 10).forEach(x => console.log('  ', x));
if (issues.orphanCss.length > 10) console.log('  ... and', issues.orphanCss.length - 10, 'more');

console.log('\nBroken sidebar (stocks):', issues.brokenSidebar.length);
issues.brokenSidebar.slice(0, 5).forEach(x => console.log('  ', x));

console.log('\nEmpty dirs:', issues.emptyDirs.length);

let noCss = [];
let unclosed = [];
walk(retailerDir, (filePath, name, isDir) => {
    if (isDir) return;
    const html = fs.readFileSync(filePath, 'utf8');
    const rel = filePath.replace(ROOT + path.sep, '');
    if (!html.includes('stylesheet') && !html.includes('<style')) noCss.push(rel);
    if (!html.includes('</html>')) unclosed.push(rel);
});

console.log('\nHTML without any CSS:', noCss.length);
noCss.forEach(x => console.log('  ', x));
console.log('\nMissing </html>:', unclosed.length);
unclosed.slice(0, 10).forEach(x => console.log('  ', x));

// directory broken links
const dirPath = path.join(retailerDir, 'retailer-directory.html');
if (fs.existsSync(dirPath)) {
    const dirHtml = fs.readFileSync(dirPath, 'utf8');
    const brokenDir = [];
    [...dirHtml.matchAll(/href="([^"]+\.html)"/g)].forEach(m => {
        const href = m[1];
        const target = path.join(retailerDir, href.replace(/\//g, path.sep));
        if (!fs.existsSync(target)) brokenDir.push(href);
    });
    console.log('\nretailer-directory broken links:', brokenDir.length);
    brokenDir.slice(0, 15).forEach(x => console.log('  ', x));
}

let brokenTotal = 0;
const brokenByFile = {};
walk(retailerDir, (filePath, name, isDir) => {
    if (isDir) return;
    const html = fs.readFileSync(filePath, 'utf8');
    const dir = path.dirname(filePath);
    const rel = filePath.replace(ROOT + path.sep, '');
    const re = /href="([^"#][^"]*\.html)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const href = m[1];
        if (href.startsWith('http') || href.startsWith('../')) continue;
        const target = path.join(dir, href.replace(/\//g, path.sep));
        if (!fs.existsSync(target)) {
            brokenTotal++;
            brokenByFile[rel] = (brokenByFile[rel] || 0) + 1;
        }
    }
});
console.log('\nTotal broken local .html hrefs:', brokenTotal);
console.log('Files affected:', Object.keys(brokenByFile).length);
Object.entries(brokenByFile).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(function (pair) {
    console.log('  ', pair[1], pair[0]);
});
