/**
 * Generate data/retailers/{area}_{slug}.json for every retailer location.
 * Run: node js/build-retailer-data.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RETAILER_JSON_DIR = path.join(ROOT, 'data', 'retailers');
const DATA_DIR = path.join(ROOT, 'data');
const RETAILER_HTML_DIR = path.join(ROOT, 'retailer');
const SALES_JSON = path.join(ROOT, 'data', 'kreezby-sales-2026.json');

const HTML_KEY_RE = /^(?:retailer|saleslist|alert|bo|po|receive|return|stocks)-([a-z0-9]+)_([a-z0-9]+)\.html$/i;

const AREAS = [
  { id: 'bauan', label: 'Bauan / Citimart', sources: ['bauan', 'citimart'] },
  { id: 'batangas', label: 'Batangas', sources: ['batangas'] },
  { id: 'lipa', label: 'Lipa', sources: ['lipa'] },
  { id: 'lucena', label: 'Lucena', sources: ['lucena'] },
  { id: 'rosario', label: 'Rosario', sources: ['rosario'] },
  { id: 'tagaytay', label: 'Tagaytay', sources: ['tagaytay'] },
  { id: 'manila', label: 'Manila', sources: ['manila'] },
  { id: 'stotomas', label: 'Sto. Tomas', sources: ['stotomas'] },
  { id: 'citimart', label: 'Citimart', sources: ['citimart'] }
];

function sortSales(sales) {
  return sales.slice().sort(function (a, b) {
    if (a.reportDate === b.reportDate) return (b.seq || 0) - (a.seq || 0);
    return a.reportDate < b.reportDate ? 1 : -1;
  });
}

function writeRetailerChunkJson(key, data) {
  fs.writeFileSync(
    path.join(RETAILER_JSON_DIR, key + '.json'),
    JSON.stringify(data, null, 2) + '\n',
    'utf8'
  );
}

function listRetailerHtmlFiles() {
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && ent.name.endsWith('.html')) files.push(full);
    }
  }
  walk(RETAILER_HTML_DIR);
  return files;
}

function retailerPortalPath(area, slug) {
  const folder = /^citimart/.test(slug) ? 'citimart' : area;
  return path.join(RETAILER_HTML_DIR, folder, slug, 'retailer-' + area + '_' + slug + '.html');
}

function storeNameFromPortalHtml(area, slug) {
  const portal = retailerPortalPath(area, slug);
  if (!fs.existsSync(portal)) return slug;
  const html = fs.readFileSync(portal, 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/i);
  if (title) {
    const m = title[1].match(/-\s*(.+?)\s*\(/);
    if (m) return m[1].trim().replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
  }
  const pill = html.match(/user-dropdown-pill[^>]*>([^<]+)</i);
  if (pill) return pill[1].replace(/\s*▾\s*$/, '').trim();
  return slug;
}

function collectLocationsFromHtml() {
  const keys = new Map();
  for (const filePath of listRetailerHtmlFiles()) {
    const file = path.basename(filePath);
    const m = file.match(HTML_KEY_RE);
    if (!m) continue;
    const area = m[1].toLowerCase();
    const slug = m[2].toLowerCase();
    const key = area + '_' + slug;
    if (!keys.has(key)) {
      keys.set(key, { area: area, slug: slug, storeName: storeNameFromPortalHtml(area, slug) });
    }
  }
  return keys;
}

function buildChunksFromSalesJson() {
  const full = JSON.parse(fs.readFileSync(SALES_JSON, 'utf8'));
  const chunks = {};
  for (const s of full.sales || []) {
    const area = (s.retailerArea || s.source || '').toLowerCase();
    const slug = (s.retailerSlug || '').toLowerCase();
    if (!area || !slug) continue;
    const key = area + '_' + slug;
    if (!chunks[key]) {
      chunks[key] = {
        area: area,
        slug: slug,
        storeName: s.retailerName || slug,
        sales: []
      };
    }
    chunks[key].sales.push(s);
    if (s.retailerName) chunks[key].storeName = s.retailerName;
  }
  Object.keys(chunks).forEach(function (key) {
    chunks[key].sales = sortSales(chunks[key].sales);
  });
  return chunks;
}

function loadExistingJsonChunks() {
  const chunks = {};
  for (const file of fs.readdirSync(RETAILER_JSON_DIR)) {
    if (!file.endsWith('.json') || file === '_manifest.json') continue;
    const key = file.replace(/\.json$/, '');
    chunks[key] = JSON.parse(fs.readFileSync(path.join(RETAILER_JSON_DIR, file), 'utf8'));
  }
  return chunks;
}

function mergeAllRetailerChunks() {
  const merged = {};
  const htmlLocs = collectLocationsFromHtml();

  htmlLocs.forEach(function (meta, key) {
    merged[key] = {
      area: meta.area,
      slug: meta.slug,
      storeName: meta.storeName,
      sales: []
    };
  });

  return merged;
}

function writeManifest(chunks) {
  const manifest = {};
  Object.keys(chunks).sort().forEach(function (key) {
    const c = chunks[key];
    const sales = c.sales || [];
    manifest[key] = {
      area: c.area,
      slug: c.slug,
      storeName: c.storeName,
      count: sales.length,
      lastDate: sales.length ? sales[0].reportDate : null,
      json: 'data/retailers/' + key + '.json'
    };
  });
  fs.writeFileSync(
    path.join(RETAILER_JSON_DIR, '_manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
  return Object.keys(manifest).length;
}

function generateAllRetailerLocationFiles() {
  fs.mkdirSync(RETAILER_JSON_DIR, { recursive: true });
  const chunks = mergeAllRetailerChunks();
  const keys = Object.keys(chunks).sort();
  keys.forEach(function (key) {
    const data = chunks[key];
    if (!data.area) data.area = key.split('_')[0];
    if (!data.slug) data.slug = key.split('_').slice(1).join('_');
    if (!data.storeName) data.storeName = storeNameFromPortalHtml(data.area, data.slug);
    if (!data.sales) data.sales = [];
    data.sales = sortSales(data.sales);
    writeRetailerChunkJson(key, data);
  });
  const manifestCount = writeManifest(chunks);
  return { locations: keys.length, manifestCount: manifestCount };
}

function filterSalesPayload(full, sources) {
  const set = new Set(sources);
  const sales = (full.sales || []).filter(function (r) {
    return set.has(r.source) || set.has(r.retailerArea);
  });
  const dailyReports = (full.dailyReports || []).filter(function (r) {
    return set.has(r.source);
  });
  let from = full.dateRange && full.dateRange.from;
  let to = full.dateRange && full.dateRange.to;
  sales.forEach(function (r) {
    if (!from || r.reportDate < from) from = r.reportDate;
    if (!to || r.reportDate > to) to = r.reportDate;
  });
  dailyReports.forEach(function (r) {
    if (!from || r.reportDate < from) from = r.reportDate;
    if (!to || r.reportDate > to) to = r.reportDate;
  });
  return {
    sales: sales,
    dailyReports: dailyReports,
    dateRange: from && to ? { from: from, to: to } : full.dateRange || null
  };
}

function zeroSalesFull() {
  return {
    importedAt: null,
    dateRange: null,
    sources: {},
    note: 'No imported sales data yet (base build).',
    dailyReports: [],
    sales: []
  };
}

function generateAreaModules() {
  return { embedded: 0, dataJs: 0 };
}

function stripRetailerDataScripts() {
  const dataScriptRe = /<script[^>]+src=["']\.\.\/data\/retailers\/[^"']+["'][^>]*>\s*<\/script>\s*/gi;
  const inlineRe = /<script>window\.KREEZBY_RETAILER_CHUNK=[\s\S]*?<\/script>\s*/gi;
  let stripped = 0;

  for (const filePath of listRetailerHtmlFiles()) {
    const file = path.basename(filePath);
    if (!HTML_KEY_RE.test(file)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    const next = html.replace(dataScriptRe, '').replace(inlineRe, '');
    if (next !== html) {
      fs.writeFileSync(filePath, next, 'utf8');
      stripped++;
    }
  }
  return stripped;
}

function main() {
  const retailers = generateAllRetailerLocationFiles();
  const areas = generateAreaModules();
  const stripped = stripRetailerDataScripts();
  console.log('Retailer locations (json):', retailers.locations);
  console.log('Manifest entries:', retailers.manifestCount);
  console.log('Area embedded files:', areas.embedded);
  console.log('HTML stripped data/retailers scripts:', stripped);
}

main();
