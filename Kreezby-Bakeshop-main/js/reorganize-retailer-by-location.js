/**
 * Move retailer store folders under location subfolders (e.g. retailer/batangas/sidcmain/)
 * and regenerate retailer-directory.html with location grouping.
 *
 * Run: node js/reorganize-retailer-by-location.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RETAILER_DIR = path.join(ROOT, 'retailer');
const DIRECTORY_FILE = path.join(RETAILER_DIR, 'retailer-directory.html');

const PARENT_FOLDERS = new Set([
  'batangas', 'lipa', 'lucena', 'stotomas', 'tagaytay', 'bauan', 'manila', 'rosario', 'citimart'
]);

/** All Citimart-branded stores live under retailer/citimart/ */
const CITIMART_SLUGS = new Set([
  'citimartcaedo', 'citimartnuciti', 'citimartbaystaybaymall', 'citimartshoponrizalave',
  'citimartbauan', 'citimartlemery', 'citimarttanauan', 'citimartrosario'
]);

function parentFolderForSlug(slug, dataArea) {
  if (CITIMART_SLUGS.has(slug)) return 'citimart';
  return dataArea;
}

const ROOT_HTML_FILES = new Set([
  'retailer-directory.html'
]);

/** Retailer order per Kreezby's Retailer List.pdf */
const PDF_SECTIONS = [
  {
    label: 'Batangas',
    areaTag: 'Batangas',
    slugs: [
      'sidcmain', 'sidcsorosoroilaya', '3m', 'jhorjhanesbalagtas',
      'wanamsabukidbalagtas', 'aalomibalagtas', 'butchalangilan', 'graciaspasalubong',
      'shellselectkumintangibaba', 'sidctulo', 'sidclibjo', 'sidcpallocan',
      'wanamsabukidgulod', 'wanamsabukidpalengke'
    ]
  },
  {
    label: 'Citimart',
    areaTag: 'Citimart',
    slugs: [
      'citimartcaedo', 'citimartnuciti', 'citimartbaystaybaymall', 'citimartshoponrizalave',
      'citimarttanauan', 'citimartbauan', 'citimartlemery', 'citimartrosario'
    ]
  },
  {
    label: 'Lipa',
    areaTag: 'Lipa',
    slugs: [
      'sidcmahabangparang', 'sidcsanjose', 'banaybanayeatery', 'aalomilipa', 'butchlipa',
      'shellselecttambo', 'shellselectbalintawak', 'chicha', 'lipagrilllipa',
      'kubosahalamananmalarayat', 'lbnmarawoy', 'luciascafelipa', 'kubosahalamananmarawoy'
    ]
  },
  {
    label: 'Lucena',
    areaTag: 'Lucena',
    slugs: [
      'sidctiaong', 'mrfieldscoffe', 'bangihan', 'girasoles', 'dagatcusinagubat',
      'shellselectsariaya', 'koperightsariaya', 'koperightlucena', 'shellselectdomoit',
      'sidcsanjuan', 'matteospinagsibaan'
    ]
  },
  {
    label: 'Sto. Tomas',
    areaTag: 'Sto. Tomas',
    slugs: [
      'luciascafestotomas', 'jma', 'rosegrace', 'dvinias', 'titachu',
      'laonglaan', 'rsmbacnotan', 'avilles'
    ]
  },
  {
    label: 'Tagaytay',
    areaTag: 'Tagaytay',
    slugs: [
      'sinangagexpresstagaytay', 'balinsasayawsilang', 'jayteesacienda', 'rsmsilvinas',
      'pamana', 'jayteesmain', 'balinsasayawtagaytay', 'greenats', 'jaytees9th'
    ]
  },
  {
    label: 'Bauan',
    areaTag: 'Bauan',
    slugs: [
      'dyans', 'ofels', 'jorjhanesstarita', 'hmmmuzon', 'sidcbauan', 'sidcstateresita',
      'aalomitaal', 'bulabog'
    ]
  },
  {
    label: 'Manila',
    areaTag: 'Manila',
    slugs: ['mangmuringtotal', 'mangmuringshell']
  },
  {
    label: 'Rosario',
    areaTag: 'Rosario',
    slugs: [
      'bencha', 'sidcibaan', 'balkonahe', 'chicknjrosario',
      'chicknjpadregarcia', 'chicknjibaan', 'matteosliquiwan', 'aalomipadregarcia',
      'lipagrillsanfelipe', 'yummies', 'hangout'
    ]
  }
];

const HTML_KEY_RE = /^(?:retailer|saleslist|alert|bo|po|receive|return|stocks)-([a-z0-9]+)_([a-z0-9]+)\.html$/i;

function parseDirectorySections(html) {
  const sections = [];
  const sectionRe = /<section class="region-block"><h2>([^<]+)<\/h2><ul>([\s\S]*?)<\/ul><\/section>/g;
  let match;
  while ((match = sectionRe.exec(html)) !== null) {
    const label = match[1].trim();
    const items = [];
    const itemRe = /<li><a href="([^"]+)">([^<]*)<\/a>/g;
    let itemMatch;
    while ((itemMatch = itemRe.exec(match[2])) !== null) {
      const href = itemMatch[1];
      const name = itemMatch[2].trim();
      const parts = href.split('/');
      const file = parts[parts.length - 1];
      const fileMatch = file.match(HTML_KEY_RE);
      if (!fileMatch) continue;
      const area = fileMatch[1].toLowerCase();
      const slug = fileMatch[2].toLowerCase();
      items.push({ area, slug, name, href, file });
    }
    sections.push({ label, items });
  }
  return sections;
}

function slugAreaFromFolder(slugDir) {
  for (const file of fs.readdirSync(slugDir)) {
    const m = file.match(HTML_KEY_RE);
    if (m) return { area: m[1].toLowerCase(), slug: m[2].toLowerCase() };
  }
  return null;
}

function patchHtmlPaths(html) {
  return html
    .replace(/href="\.\.\/\.\.\/(css|assets|auth|js|data)\//g, 'href="../../../$1/')
    .replace(/src="\.\.\/\.\.\/(css|assets|auth|js|data)\//g, 'src="../../../$1/')
    .replace(/href="\.\.\/report_issue-retailer\.html"/g, 'href="report_issue.html"')
    .replace(/href="\.\.\/inbox-retailer\.html"/g, 'href="inbox.html"')
    .replace(/href="\.\.\/retailer-directory\.html"/g, 'href="../../retailer-directory.html"');
}

function patchFolderHtmlPaths(dir) {
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (!file.endsWith('.html')) continue;
    const before = fs.readFileSync(full, 'utf8');
    const after = patchHtmlPaths(before);
    if (after !== before) {
      fs.writeFileSync(full, after, 'utf8');
      count++;
    }
  }
  return count;
}

function moveStoreFolders(sections) {
  const slugToMeta = new Map();
  sections.forEach(function (section) {
    section.items.forEach(function (item) {
      slugToMeta.set(item.slug, {
        area: item.area,
        label: section.label,
        name: item.name
      });
    });
  });

  const moved = [];
  const skipped = [];

  for (const ent of fs.readdirSync(RETAILER_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const name = ent.name.toLowerCase();
    if (PARENT_FOLDERS.has(name)) continue;

    const src = path.join(RETAILER_DIR, ent.name);
    let meta = slugToMeta.get(name.toLowerCase());
    if (!meta) {
      const detected = slugAreaFromFolder(src);
      if (!detected) {
        skipped.push(ent.name);
        continue;
      }
      meta = { area: detected.area, label: detected.area, name: ent.name };
    }

    const destFolder = parentFolderForSlug(ent.name.toLowerCase(), meta.area);
    const dest = path.join(RETAILER_DIR, destFolder, ent.name);
    if (path.normalize(src) === path.normalize(dest)) continue;
    if (fs.existsSync(dest)) {
      skipped.push(ent.name + ' (dest exists)');
      continue;
    }

    fs.mkdirSync(path.join(RETAILER_DIR, destFolder), { recursive: true });
    fs.renameSync(src, dest);
    const patched = patchFolderHtmlPaths(dest);
    moved.push({ slug: ent.name, area: meta.area, patched });
  }

  return { moved, skipped };
}

function portalFileInDir(slugDir) {
  for (const file of fs.readdirSync(slugDir)) {
    const m = file.match(/^retailer-([a-z0-9]+)_([a-z0-9]+)\.html$/i);
    if (m) return { file: file, area: m[1].toLowerCase(), slug: m[2].toLowerCase() };
  }
  return null;
}

function collectAllRetailersFromDisk() {
  const retailers = new Map();
  for (const parent of fs.readdirSync(RETAILER_DIR)) {
    const parentPath = path.join(RETAILER_DIR, parent);
    if (!fs.statSync(parentPath).isDirectory() || !PARENT_FOLDERS.has(parent)) continue;
    for (const slug of fs.readdirSync(parentPath)) {
      const slugPath = path.join(parentPath, slug);
      if (!fs.statSync(slugPath).isDirectory()) continue;
      const portal = portalFileInDir(slugPath);
      if (!portal) continue;
      const html = fs.readFileSync(path.join(slugPath, portal.file), 'utf8');
      let name = slug;
      const title = html.match(/<title>([^<]+)<\/title>/i);
      if (title) {
        const m = title[1].match(/-\s*(.+?)\s*\(/);
        if (m) name = m[1].trim().replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
      }
      retailers.set(slug, {
        area: portal.area,
        slug: portal.slug,
        folder: parent,
        name: name,
        file: portal.file
      });
    }
  }
  return retailers;
}

function moveCitimartToOwnFolder() {
  const moved = [];
  fs.mkdirSync(path.join(RETAILER_DIR, 'citimart'), { recursive: true });

  for (const parent of PARENT_FOLDERS) {
    if (parent === 'citimart') continue;
    const parentPath = path.join(RETAILER_DIR, parent);
    if (!fs.existsSync(parentPath)) continue;
    for (const ent of fs.readdirSync(parentPath, { withFileTypes: true })) {
      if (!ent.isDirectory() || !CITIMART_SLUGS.has(ent.name.toLowerCase())) continue;
      const src = path.join(parentPath, ent.name);
      const dest = path.join(RETAILER_DIR, 'citimart', ent.name);
      if (path.normalize(src) === path.normalize(dest)) continue;
      if (fs.existsSync(dest)) continue;
      fs.renameSync(src, dest);
      moved.push({ from: parent + '/' + ent.name, to: 'citimart/' + ent.name });
    }
  }
  return moved;
}

function buildDirectoryHtmlFromPdf(retailers) {
  const sectionHtml = PDF_SECTIONS.map(function (section) {
    const lis = section.slugs.map(function (slug) {
      const item = retailers.get(slug);
      if (!item) return '<li class="missing"><!-- missing: ' + slug + ' --></li>';
      const href = item.folder + '/' + item.slug + '/' + item.file;
      let displayName = item.name;
      if (slug === 'sidcibaan') displayName = 'SIDC IBAAN';
      return '<li><a href="' + href + '">' + displayName + '</a> <span class="area-tag">(' + section.areaTag + ')</span></li>';
    }).filter(function (li) { return !li.includes('missing'); }).join('');

    return '<section class="region-block"><h2>' + section.label + '</h2><ul>' + lis + '</ul></section>';
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kreezby — Select Your Retailer</title>
    <link rel="stylesheet" href="../css/pages/retailer/sidcmain/retailer-batangas_sidcmain.css">
</head>
<body>
    <h1>Retailer Portal</h1>
    <p class="intro">Select your store to open your dashboard.</p>
    ${sectionHtml}
    <a class="back-login" href="../auth/log_in.html">← Back to Log In</a>
    <script src="../js/retailer-nav.js"></script>
</body>
</html>
`;
}

function updateBuildRetailerDataJs() {
  const file = path.join(ROOT, 'js', 'build-retailer-data.js');
  let src = fs.readFileSync(file, 'utf8');
  const portalLine = "function retailerPortalPath(area, slug) {\n" +
    "  const folder = /^citimart/.test(slug) ? 'citimart' : area;\n" +
    "  return path.join(RETAILER_HTML_DIR, folder, slug, 'retailer-' + area + '_' + slug + '.html');\n" +
    "}\n\nfunction storeNameFromPortalHtml(area, slug) {\n" +
    "  const portal = retailerPortalPath(area, slug);";
  if (src.includes('function retailerPortalPath')) return false;
  src = src.replace(
    "function storeNameFromPortalHtml(area, slug) {\n  const portal = path.join(RETAILER_HTML_DIR, area, slug, 'retailer-' + area + '_' + slug + '.html');",
    portalLine
  );
  if (!src.includes('function retailerPortalPath')) return false;
  fs.writeFileSync(file, src, 'utf8');
  return true;
}

function updateAuditRetailerErrorsJs() {
  const file = path.join(ROOT, 'js', 'audit-retailer-errors.js');
  let src = fs.readFileSync(file, 'utf8');
  const before = `    const htmlDir = path.join(retailerDir, slug);
    if (!fs.existsSync(htmlDir)) {
        issues.orphanCss.push('css/pages/retailer/' + slug + ' (no matching retailer/' + slug + ')');`;
  const after = `    let htmlDir = null;
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
        issues.orphanCss.push('css/pages/retailer/' + slug + ' (no matching retailer folder)');`;
  if (src.includes(before)) {
    src = src.replace(before, after);
    fs.writeFileSync(file, src, 'utf8');
    return true;
  }
  return false;
}

function regenerateDirectoryOnly() {
  moveCitimartToOwnFolder();
  const retailers = collectAllRetailersFromDisk();
  const expected = new Set();
  PDF_SECTIONS.forEach(function (s) { s.slugs.forEach(function (slug) { expected.add(slug); }); });

  const missing = [];
  expected.forEach(function (slug) {
    if (!retailers.has(slug)) missing.push(slug);
  });

  const extra = [];
  retailers.forEach(function (_item, slug) {
    if (!expected.has(slug)) extra.push(slug);
  });

  fs.writeFileSync(DIRECTORY_FILE, buildDirectoryHtmlFromPdf(retailers), 'utf8');
  return { retailers: retailers.size, missing, extra };
}

function main() {
  const directoryOnly = process.argv.includes('--directory-only');

  if (directoryOnly) {
    const result = regenerateDirectoryOnly();
    console.log('Regenerated retailer-directory.html from PDF order');
    console.log('Retailers on disk:', result.retailers);
    if (result.missing.length) console.log('Missing from disk:', result.missing.join(', '));
    if (result.extra.length) console.log('Extra on disk (not in PDF):', result.extra.join(', '));
    return;
  }

  const dirHtml = fs.readFileSync(DIRECTORY_FILE, 'utf8');
  const sections = parseDirectorySections(dirHtml);
  if (!sections.length) {
    console.error('Could not parse retailer-directory.html');
    process.exit(1);
  }

  const { moved, skipped } = moveStoreFolders(sections);
  const result = regenerateDirectoryOnly();

  const buildPatched = updateBuildRetailerDataJs();
  const auditPatched = updateAuditRetailerErrorsJs();

  console.log('Moved store folders:', moved.length);
  moved.forEach(function (m) {
    console.log('  ', m.area + '/' + m.slug, '(' + m.patched + ' html files patched)');
  });
  if (skipped.length) console.log('Skipped:', skipped.join(', '));
  console.log('Regenerated retailer-directory.html');
  console.log('Retailers:', result.retailers, '| Missing:', result.missing.length, '| Extra:', result.extra.length);
  console.log('Updated build-retailer-data.js:', buildPatched);
  console.log('Updated audit-retailer-errors.js:', auditPatched);
}

main();
