/**
 * Kreezby sales imports — multi-area daily collection logs (2026).
 */
(function () {
  'use strict';

  var CACHE = null;
  var BASE_CACHE = null;
  var RANGE = null;
  var STORAGE_KEY = 'kreezby-sales-overrides';
  var INDEX = { byRetailer: {}, routeOptions: null, importSummary: null };
  var loadPromise = null;
  var LITE_URL = 'data/kreezby-sales-lite.json';
  var FULL_URL = 'data/kreezby-sales-2026.json';
  var SESSION_CACHE_KEY = 'kreezby-sales-lite-v2';
  var FAKE_ADMIN_URL = '../data/kreezby-sales-fake-admin.json';

  function zeroPayload() {
    return {
      importedAt: null,
      dateRange: null,
      sources: {},
      note: 'No sales data loaded (zero-data mode).',
      dailyReports: [],
      sales: [],
      _salesBuilt: true
    };
  }

  function isAdminContext() {
    try {
      var path = (location.pathname || '').replace(/\\/g, '/');
      if (/\/admin\//i.test(path)) return true;
      var file = path.split('/').pop() || '';
      return /admin\.html$/i.test(file) || /-admin\.html$/i.test(file);
    } catch (e) {
      return false;
    }
  }

  function clonePayload(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function adminTestPayload() {
    if (!isAdminContext()) return null;
    if (window.KREEZBY_ADMIN_TEST_SALES && window.KREEZBY_ADMIN_TEST_SALES.dailyReports) {
      return clonePayload(window.KREEZBY_ADMIN_TEST_SALES);
    }
    return null;
  }

  var SOURCE_PREFIX = {
    bauan: 'BAUAN',
    citimart: 'CITIMART',
    lucena: 'LUCENA',
    rosario: 'ROSARIO',
    tagaytay: 'TAGAYTAY',
    manila: 'MANILA',
    lipa: 'LIPA',
    stotomas: 'STOTOMAS',
    batangas: 'BATANGAS'
  };

  function applyBasePayload(data) {
    BASE_CACHE = data;
    CACHE = applyCache(mergeOverrides(BASE_CACHE));
    ensureSalesBuilt();
    return CACHE;
  }

  function loadFakeAdminJson() {
    return fetch(FAKE_ADMIN_URL, { credentials: 'same-origin', cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('admin test sales ' + res.status);
      return res.json();
    });
  }

  function resetLoadState() {
    CACHE = null;
    BASE_CACHE = null;
    loadPromise = null;
    RANGE = null;
    invalidateIndexes();
  }

  function load() {
    if (CACHE && isAdminContext()) {
      var waiting = adminTestPayload();
      if (waiting && waiting.dailyReports && waiting.dailyReports.length) {
        var cacheRange = CACHE.dateRange || {};
        var waitRange = waiting.dateRange || {};
        var empty = !(CACHE.dailyReports && CACHE.dailyReports.length);
        var rangeChanged = cacheRange.from !== waitRange.from || cacheRange.to !== waitRange.to;
        if (empty || rangeChanged) resetLoadState();
      }
    }
    if (CACHE) return Promise.resolve(CACHE);
    if (loadPromise) return loadPromise;

    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    } catch (e) { /* ignore */ }

    if (!isAdminContext()) {
      BASE_CACHE = zeroPayload();
      CACHE = applyCache(mergeOverrides(BASE_CACHE));
      loadPromise = Promise.resolve(CACHE);
      return loadPromise;
    }

    var embedded = adminTestPayload();
    if (embedded) {
      loadPromise = Promise.resolve(applyBasePayload(embedded));
      return loadPromise;
    }

    loadPromise = loadFakeAdminJson().then(function (data) {
      return applyBasePayload(data);
    }).catch(function () {
      return applyBasePayload(zeroPayload());
    });
    return loadPromise;
  }

  function readSessionCache() {
    try {
      var raw = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeSessionCache(data) {
    try {
      var lite = {
        importedAt: data.importedAt,
        dateRange: data.dateRange,
        sources: data.sources,
        note: data.note,
        dailyReports: data.dailyReports
      };
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(lite));
    } catch (e) { /* quota */ }
  }

  function ensureSalesBuilt() {
    if (!CACHE) return;
    if (CACHE._salesBuilt && CACHE.sales) return;
    var all = [];
    var seq = 1;
    (CACHE.dailyReports || []).forEach(function (r) {
      var flat = flattenReportToSales(r, seq);
      all = all.concat(flat.sales);
      seq = flat.nextSeq;
    });
    CACHE.sales = all;
    CACHE._salesBuilt = true;
    buildRetailerIndex(CACHE);
    INDEX.routeOptions = null;
    INDEX.importSummary = null;
  }

  function applyCache(data) {
    CACHE = data;
    return CACHE;
  }

  function invalidateIndexes() {
    INDEX.byRetailer = {};
    INDEX.routeOptions = null;
    INDEX.importSummary = null;
  }

  function buildRetailerIndex(cache) {
    var byRetailer = {};
    (cache.sales || []).forEach(function (row) {
      if (!inRange(row.reportDate)) return;
      var key = (row.retailerArea || row.source || '') + '\0' + (row.retailerSlug || '');
      if (!byRetailer[key]) byRetailer[key] = [];
      byRetailer[key].push(row);
      if (row.portalPage) {
        var pk = 'portal:' + row.portalPage;
        if (!byRetailer[pk]) byRetailer[pk] = [];
        byRetailer[pk].push(row);
      }
    });
    Object.keys(byRetailer).forEach(function (k) {
      byRetailer[k].sort(function (a, b) {
        if (a.reportDate === b.reportDate) return b.seq - a.seq;
        return a.reportDate < b.reportDate ? 1 : -1;
      });
    });
    INDEX.byRetailer = byRetailer;
  }

  function loadOverrides() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return parsed.reports || [];
    } catch (e) {
      return [];
    }
  }

  function saveOverridesToStorage(reports) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      reports: reports,
      updatedAt: new Date().toISOString()
    }));
  }

  function flattenReportToSales(report, seqStart) {
    var sales = [];
    var seq = seqStart || 1;
    var d = report.reportDate.replace(/-/g, '');
    var prefix = SOURCE_PREFIX[report.source] || String(report.source || '').toUpperCase();
    (report.entries || []).forEach(function (e, i) {
      var collected = e.collected || 0;
      sales.push({
        retailerArea: e.retailerArea || report.source,
        retailerSlug: e.retailerSlug || '',
        retailerName: e.retailerName || 'Unknown',
        portalPage: e.portalPage || '',
        accountReceivable: e.accountReceivable,
        cons: e.cons,
        cod: e.cod,
        staff: e.staff,
        check: e.check,
        f: e.f,
        po: e.po,
        replaced: e.replaced,
        collected: collected,
        notes: e.notes,
        source: report.source,
        id: 'SALE-' + prefix + '-' + d + '-' + ('0' + (i + 1)).slice(-2),
        reportId: report.id,
        reportDate: report.reportDate,
        areaLabel: report.areaLabel,
        invoiceCode: 'SALE-' + prefix + '-' + d + '-' + ('0' + (i + 1)).slice(-2),
        totalPaid: collected,
        displayDate: report.reportDate + ' 12:00',
        seq: seq++
      });
    });
    return { sales: sales, nextSeq: seq };
  }

  function applyFinancialsToReport(report) {
    var fin = computeReportFinancials(report);
    report.cashCollected = fin.cashCollected;
    report.netSales = fin.netSales;
    report.totalExpense = fin.totalExpense;
    return report;
  }

  function rebuildMergedPayload(base) {
    var overrides = loadOverrides();
    var map = {};
    (base.dailyReports || []).forEach(function (r) {
      map[r.id] = r;
    });
    overrides.forEach(function (r) {
      map[r.id] = applyFinancialsToReport(JSON.parse(JSON.stringify(r)));
    });
    var dailyReports = Object.values(map).sort(function (a, b) {
      return a.reportDate < b.reportDate ? -1 : a.reportDate > b.reportDate ? 1 : 0;
    });
    var seq = 1;
    var allSales = [];
    dailyReports.forEach(function (r) {
      var flat = flattenReportToSales(r, seq);
      allSales = allSales.concat(flat.sales);
      seq = flat.nextSeq;
    });
    return {
      importedAt: base.importedAt,
      dateRange: base.dateRange,
      sources: base.sources,
      note: base.note,
      isTestData: !!base.isTestData,
      adminOnly: !!base.adminOnly,
      dailyReports: dailyReports,
      sales: allSales
    };
  }

  function mergeOverrides(base) {
    var overrides = loadOverrides();
    if (!overrides.length) {
      if (base.dateRange) RANGE = base.dateRange;
      invalidateIndexes();
      if (base._salesBuilt && base.sales && base.sales.length) {
        buildRetailerIndex(base);
      }
      if (!base.sales) base.sales = [];
      return base;
    }
    var merged = rebuildMergedPayload(base);
    merged._salesBuilt = true;
    if (merged.dateRange) RANGE = merged.dateRange;
    invalidateIndexes();
    buildRetailerIndex(merged);
    return merged;
  }

  function computeReportFinancials(report) {
    var entries = report.entries || [];
    var sumCollected = 0;
    entries.forEach(function (e) {
      sumCollected += Number(e.collected) || 0;
    });
    var totalExpense = Number(report.totalExpense) || 0;
    var cashCollected = sumCollected;
    var netSales = cashCollected - totalExpense;
    return {
      sumCollected: sumCollected,
      cashCollected: cashCollected,
      totalExpense: totalExpense,
      netSales: netSales
    };
  }

  function saveReport(report) {
    return load().then(function () {
      var overrides = loadOverrides();
      var idx = overrides.findIndex(function (r) { return r.id === report.id; });
      var copy = applyFinancialsToReport(JSON.parse(JSON.stringify(report)));
      if (idx >= 0) overrides[idx] = copy;
      else overrides.push(copy);
      saveOverridesToStorage(overrides);
      loadPromise = null;
      try { sessionStorage.removeItem(SESSION_CACHE_KEY); } catch (e) { /* ignore */ }
      return applyCache(mergeOverrides(BASE_CACHE || CACHE));
    });
  }

  function getReportById(id) {
    var list = (CACHE && CACHE.dailyReports) || [];
    return list.find(function (r) { return r.id === id; }) || null;
  }

  function getSalesForReport(report) {
    if (!report) return [];
    return flattenReportToSales(report, 1).sales;
  }

  function findSaleById(saleId) {
    if (!saleId || !CACHE) return null;
    if (CACHE._salesBuilt && CACHE.sales) {
      return CACHE.sales.find(function (s) { return s.id === saleId; }) || null;
    }
    var reports = CACHE.dailyReports || [];
    for (var i = 0; i < reports.length; i++) {
      var rows = getSalesForReport(reports[i]);
      var hit = rows.find(function (s) { return s.id === saleId; });
      if (hit) return hit;
    }
    return null;
  }

  function inRange(dateStr) {
    if (!RANGE || !RANGE.from || !RANGE.to) return true;
    return dateStr >= RANGE.from && dateStr <= RANGE.to;
  }

  function formatMoney(n) {
    var v = Number(n) || 0;
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getSales(filters) {
    ensureSalesBuilt();
    filters = filters || {};
    var list = (CACHE && CACHE.sales) || [];
    return list.filter(function (row) {
      if (!inRange(row.reportDate)) return false;
      if (filters.source && row.source !== filters.source) return false;
      if (filters.retailerSlug && row.retailerSlug !== filters.retailerSlug) return false;
      if (filters.retailerArea && row.retailerArea !== filters.retailerArea) return false;
      if (filters.search) {
        var q = filters.search.toLowerCase();
        if (row.retailerName.toLowerCase().indexOf(q) < 0 &&
            row.invoiceCode.toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      if (a.reportDate === b.reportDate) return b.seq - a.seq;
      return a.reportDate < b.reportDate ? 1 : -1;
    });
  }

  function getDailyReports(filters) {
    filters = filters || {};
    return ((CACHE && CACHE.dailyReports) || []).filter(function (r) {
      if (!inRange(r.reportDate)) return false;
      if (filters.source && r.source !== filters.source) return false;
      if (filters.reportDate && r.reportDate !== filters.reportDate) return false;
      if (filters.month && r.reportDate.slice(0, 7) !== filters.month) return false;
      return true;
    });
  }

  var AREA_LABELS = {
    batangas: 'Batangas',
    bauan: 'Bauan',
    citimart: 'Citimart',
    lipa: 'Lipa',
    lucena: 'Lucena',
    manila: 'Manila',
    rosario: 'Rosario',
    stotomas: 'Sto. Tomas',
    tagaytay: 'Tagaytay'
  };

  var AREA_ORDER = ['batangas', 'bauan', 'citimart', 'lipa', 'lucena', 'manila', 'rosario', 'stotomas', 'tagaytay'];

  function areaLabel(source) {
    return AREA_LABELS[source] || (source ? source.charAt(0).toUpperCase() + source.slice(1) : 'Unknown');
  }

  function formatMonthLabel(ym) {
    var parts = ym.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
    return d.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
  }

  function formatDateLabel(iso) {
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function sortAreas(list) {
    return list.slice().sort(function (a, b) {
      var ia = AREA_ORDER.indexOf(a.value);
      var ib = AREA_ORDER.indexOf(b.value);
      if (ia < 0 && ib < 0) return a.label.localeCompare(b.label);
      if (ia < 0) return 1;
      if (ib < 0) return -1;
      return ia - ib;
    });
  }

  /** Options for admin/staff route sheet filters (month + area stay independent of date). */
  function getRouteFilterOptions() {
    if (INDEX.routeOptions) return INDEX.routeOptions;
    var reports = getDailyReports().slice().sort(function (a, b) {
      return a.reportDate < b.reportDate ? -1 : a.reportDate > b.reportDate ? 1 : 0;
    });
    var monthSet = {};
    var areaMap = {};
    var byMonth = {};

    reports.forEach(function (r) {
      var ym = r.reportDate.slice(0, 7);
      monthSet[ym] = true;
      areaMap[r.source] = areaLabel(r.source);
      if (!byMonth[ym]) byMonth[ym] = { dateSet: {} };
      byMonth[ym].dateSet[r.reportDate] = true;
    });

    Object.keys(AREA_LABELS).forEach(function (src) {
      if (!areaMap[src]) areaMap[src] = AREA_LABELS[src];
    });

    var months = Object.keys(monthSet).sort().reverse();
    months.forEach(function (ym) {
      var dateKeys = Object.keys(byMonth[ym].dateSet).sort().reverse();
      byMonth[ym].dateList = dateKeys.map(function (d) {
        return { value: d, label: formatDateLabel(d) };
      });
    });

    INDEX.routeOptions = {
      months: months.map(function (ym) {
        return { value: ym, label: formatMonthLabel(ym) };
      }),
      areas: sortAreas(Object.keys(areaMap).map(function (src) {
        return { value: src, label: areaMap[src] };
      })),
      byMonth: byMonth
    };
    return INDEX.routeOptions;
  }

  function getDefaultRouteFilters() {
    var opt = getRouteFilterOptions();
    if (!opt.months.length) return { month: '', source: '', reportDate: '' };
    var month = opt.months[0].value;
    var source = opt.areas.length ? opt.areas[0].value : '';
    var bucket = opt.byMonth[month];
    var reportDate = bucket && bucket.dateList.length ? bucket.dateList[0].value : '';
    return { month: month, source: source, reportDate: reportDate };
  }

  function countForRetailer(area, slug) {
    return getRetailerSales({ area: area, slug: slug }).length;
  }

  function getRetailerSales(ctx) {
    if (!ctx || !ctx.slug) return [];
    ensureSalesBuilt();
    if (!INDEX.byRetailer || !Object.keys(INDEX.byRetailer).length) {
      if (CACHE) buildRetailerIndex(CACHE);
    }
    var portal = 'retailer-' + ctx.area + '_' + ctx.slug + '.html';
    var key = (ctx.area || '') + '\0' + ctx.slug;
    var seen = {};
    var out = [];

    function addRows(rows) {
      (rows || []).forEach(function (row) {
        if (seen[row.id]) return;
        seen[row.id] = true;
        out.push(row);
      });
    }

    addRows(INDEX.byRetailer[key]);
    addRows(INDEX.byRetailer['portal:' + portal]);
    return out;
  }

  function getRetailerSlugFromPage() {
    var page = document.getElementById('saleslist-retailer-page');
    if (page) {
      var area = page.getAttribute('data-area');
      var slug = page.getAttribute('data-slug');
      if (area && slug) return { area: area, slug: slug };
    }
    var file = (location.pathname || '').split('/').pop() || '';
    var m = file.match(/^retailer-([a-z0-9]+)_([a-z0-9]+)\.html$/i) ||
      file.match(/^saleslist-([a-z0-9]+)_([a-z0-9]+)\.html$/i);
    if (!m) return null;
    return { area: m[1].toLowerCase(), slug: m[2].toLowerCase() };
  }

  function getImportSummary() {
    if (INDEX.importSummary) return INDEX.importSummary;
    var sources = (CACHE && CACHE.sources) || {};
    var counts = {
      total: 0,
      bauan: 0,
      citimart: 0,
      lucena: 0,
      rosario: 0,
      tagaytay: 0,
      manila: 0,
      lipa: 0,
      stotomas: 0,
      batangas: 0
    };
    (CACHE && CACHE.dailyReports || []).forEach(function (report) {
      if (!inRange(report.reportDate)) return;
      var n = (report.entries || []).length;
      counts.total += n;
      if (counts[report.source] != null) counts[report.source] += n;
    });
    INDEX.importSummary = {
      total: counts.total,
      bauan: counts.bauan,
      citimart: counts.citimart,
      lucena: counts.lucena,
      rosario: counts.rosario,
      tagaytay: counts.tagaytay,
      manila: counts.manila,
      lipa: counts.lipa,
      stotomas: counts.stotomas,
      batangas: counts.batangas,
      citimartRange: sources.citimart || null,
      bauanRange: sources.bauan || null,
      lucenaRange: sources.lucena || null,
      rosarioRange: sources.rosario || null,
      tagaytayRange: sources.tagaytay || null,
      manilaRange: sources.manila || null,
      lipaRange: sources.lipa || null,
      stotomasRange: sources.stotomas || null,
      batangasRange: sources.batangas || null,
      isTestData: !!(CACHE && CACHE.isTestData),
      note: (CACHE && CACHE.note) || ''
    };
    return INDEX.importSummary;
  }

  var api = {
    load: load,
    getSales: getSales,
    getRetailerSales: getRetailerSales,
    getDailyReports: getDailyReports,
    countForRetailer: countForRetailer,
    getRetailerSlugFromPage: getRetailerSlugFromPage,
    formatMoney: formatMoney,
    dateRange: RANGE,
    getImportSummary: getImportSummary,
    getRouteFilterOptions: getRouteFilterOptions,
    getDefaultRouteFilters: getDefaultRouteFilters,
    areaLabel: areaLabel,
    formatDateLabel: formatDateLabel,
    computeReportFinancials: computeReportFinancials,
    saveReport: saveReport,
    getReportById: getReportById,
    getSalesForReport: getSalesForReport,
    isTestData: function () {
      return !!(CACHE && CACHE.isTestData && isAdminContext());
    },
    reload: function () {
      resetLoadState();
      return load();
    },
    reloadMerged: function () {
      if (BASE_CACHE) return Promise.resolve(mergeOverrides(BASE_CACHE));
      return load();
    }
  };

  window.KreezbySales = api;
})();
