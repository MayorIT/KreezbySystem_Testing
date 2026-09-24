/**
 * Build synthetic admin-only daily route sheets for QA.
 * Uses retailer catalog names only — never reads client Excel files.
 *
 * Run: node js/generate-fake-admin-sales.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'data', 'retailers', '_manifest.json');
const OUT_JSON = path.join(ROOT, 'data', 'kreezby-sales-fake-admin.json');
const OUT_JS = path.join(ROOT, 'js', 'kreezby-sales-fake-admin.js');

const AREA_LABELS = {
  bauan: 'Bauan',
  citimart: 'Citimart',
  lucena: 'Lucena',
  rosario: 'Rosario',
  tagaytay: 'Tagaytay',
  manila: 'Manila',
  lipa: 'Lipa',
  stotomas: 'Sto. Tomas',
  batangas: 'Batangas'
};

/** Shared visit dates for every area: 1st + 15th of each month, Jan 2025–Sep 2026, plus 2026-09-20. */
function visitDates() {
  var dates = [];
  var year = 2025;
  var month = 1;
  while (year < 2026 || (year === 2026 && month <= 9)) {
    dates.push(year + '-' + String(month).padStart(2, '0') + '-01');
    dates.push(year + '-' + String(month).padStart(2, '0') + '-15');
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  dates.push('2026-09-20');
  return dates;
}

const SHARED_DATES = visitDates();
const AREA_ORDER = ['batangas', 'bauan', 'citimart', 'lipa', 'lucena', 'manila', 'rosario', 'stotomas', 'tagaytay'];
const VISITS = AREA_ORDER.reduce(function (map, source) {
  map[source] = SHARED_DATES.slice();
  return map;
}, {});

const PACK_PRICE = 100;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function retailersForSource(manifest, source) {
  const rows = Object.values(manifest);
  if (source === 'citimart') {
    return rows.filter(function (r) {
      return String(r.slug || '').indexOf('citimart') === 0;
    }).sort(function (a, b) {
      return a.storeName.localeCompare(b.storeName);
    });
  }
  return rows.filter(function (r) {
    return r.area === source;
  }).sort(function (a, b) {
    return a.storeName.localeCompare(b.storeName);
  });
}

function fakeEntry(rng, source, loc, visitIdx) {
  const mode = Math.floor(rng() * 5);
  const packs = pick(rng, [5, 8, 10, 12, 15, 20]);
  const collected = packs * PACK_PRICE;
  const entry = {
    retailerArea: loc.area,
    retailerSlug: loc.slug,
    retailerName: loc.storeName,
    portalPage: 'retailer-' + loc.area + '_' + loc.slug + '.html',
    accountReceivable: null,
    cons: null,
    cod: null,
    staff: null,
    check: null,
    f: null,
    po: null,
    replaced: null,
    collected: null,
    notes: visitIdx === 0 ? 'QA sample' : ''
  };

  if (mode === 0) {
    entry.cons = packs;
    entry.accountReceivable = collected;
    entry.collected = collected;
  } else if (mode === 1) {
    entry.cod = packs;
    entry.collected = collected;
  } else if (mode === 2) {
    entry.staff = packs;
    entry.check = pick(rng, [1, 2, 3]);
    if (rng() > 0.4) entry.collected = collected;
  } else if (mode === 3) {
    entry.check = pick(rng, [1, 2, 4, 6]);
    entry.f = rng() > 0.5 ? pick(rng, [1, 2]) : null;
    entry.po = rng() > 0.6 ? pick(rng, [1, 2, 3]) : null;
  } else {
    entry.replaced = pick(rng, [1, 2, 3, 5]);
    if (rng() > 0.5) {
      entry.cons = packs;
      entry.collected = collected;
    }
  }

  if (rng() > 0.85) entry.po = pick(rng, [1, 2]);
  if (rng() > 0.9) entry.f = 1;
  return entry;
}

function financials(report) {
  let sumCollected = 0;
  (report.entries || []).forEach(function (e) {
    sumCollected += Number(e.collected) || 0;
  });
  const totalExpense = Number(report.totalExpense) || 0;
  report.cashCollected = sumCollected;
  report.netSales = sumCollected - totalExpense;
  return report;
}

function build() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const dailyReports = [];
  const sources = {};
  let minDate = null;
  let maxDate = null;

  Object.keys(VISITS).forEach(function (source, sourceIdx) {
    const locs = retailersForSource(manifest, source);
    if (!locs.length) return;
    const dates = VISITS[source];
    dates.forEach(function (reportDate, visitIdx) {
      const rng = mulberry32(20260920 + sourceIdx * 97 + visitIdx * 13);
      const entries = locs.map(function (loc) {
        return fakeEntry(rng, source, loc, visitIdx);
      });
      const totalExpense = pick(rng, [850, 1100, 1450, 1725, 1980, 2200]);
      const report = financials({
        id: 'fake-' + source + '-' + reportDate.replace(/-/g, ''),
        reportDate: reportDate,
        source: source,
        areaLabel: AREA_LABELS[source] + ' — QA sample',
        sourceImage: '',
        entries: entries,
        totalExpense: totalExpense,
        isCustom: false,
        isTestData: true
      });
      dailyReports.push(report);
      if (!minDate || reportDate < minDate) minDate = reportDate;
      if (!maxDate || reportDate > maxDate) maxDate = reportDate;
    });
    sources[source] = {
      from: dates[0],
      to: dates[dates.length - 1],
      sheets: dates.length,
      testData: true
    };
  });

  dailyReports.sort(function (a, b) {
    if (a.reportDate === b.reportDate) return a.source.localeCompare(b.source);
    return a.reportDate < b.reportDate ? -1 : 1;
  });

  return {
    importedAt: '2026-09-20T00:00:00.000Z',
    dateRange: { from: minDate, to: maxDate },
    sources: sources,
    note: 'Synthetic admin-only QA data. Not live client daily records.',
    isTestData: true,
    adminOnly: true,
    dailyReports: dailyReports,
    sales: []
  };
}

function main() {
  const payload = build();
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const js =
    '/**\n' +
    ' * Synthetic admin-only QA sales payload.\n' +
    ' * Generated by js/generate-fake-admin-sales.js — not client Excel imports.\n' +
    ' * Include this script only on admin sales pages.\n' +
    ' */\n' +
    'window.KREEZBY_ADMIN_TEST_SALES = ' + JSON.stringify(payload) + ';\n';
  fs.writeFileSync(OUT_JS, js, 'utf8');
  const entryCount = payload.dailyReports.reduce(function (n, r) {
    return n + (r.entries || []).length;
  }, 0);
  console.log('Wrote', path.relative(ROOT, OUT_JSON));
  console.log('Wrote', path.relative(ROOT, OUT_JS));
  console.log('Sheets:', payload.dailyReports.length, 'entries:', entryCount);
  console.log('Range:', payload.dateRange.from, '→', payload.dateRange.to);
}

main();
