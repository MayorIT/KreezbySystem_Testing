/**
 * Lightweight sales loader for retailer portal / saleslist pages (~few KB per store).
 */
(function () {
  'use strict';

  var CACHE = null;
  var loadPromise = null;

  var AREA_LABELS = {
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

  function formatMoney(n) {
    var v = Number(n) || 0;
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  function areaLabel(source) {
    return AREA_LABELS[source] || (source ? source.charAt(0).toUpperCase() + source.slice(1) : 'Unknown');
  }

  function applyChunk(data) {
    CACHE = data || { sales: [] };
    if (!CACHE.sales) CACHE.sales = [];
    return CACHE;
  }

  function load() {
    if (CACHE) return Promise.resolve(CACHE);
    if (loadPromise) return loadPromise;

    var ctx = getRetailerSlugFromPage();
    if (!ctx) {
      CACHE = { sales: [], _loadError: true };
      return Promise.resolve(CACHE);
    }

    var chunkKey = ctx.area + '_' + ctx.slug;
    if (window.KREEZBY_RETAILER_CHUNK) {
      return Promise.resolve(applyChunk(window.KREEZBY_RETAILER_CHUNK));
    }
    if (window.KREEZBY_RETAILER_CHUNKS && window.KREEZBY_RETAILER_CHUNKS[chunkKey]) {
      return Promise.resolve(applyChunk(window.KREEZBY_RETAILER_CHUNKS[chunkKey]));
    }

    loadPromise = Promise.resolve(applyChunk({
      area: ctx.area,
      slug: ctx.slug,
      sales: []
    }));
    return loadPromise;
  }

  function getRetailerSales(ctx) {
    var sales = (CACHE && CACHE.sales) || [];
    if (!sales.length) return [];
    ctx = ctx || getRetailerSlugFromPage();
    if (!ctx) return sales.slice();
    var portal = 'retailer-' + ctx.area + '_' + ctx.slug + '.html';
    var filtered = sales.filter(function (row) {
      if (row.retailerSlug === ctx.slug) return true;
      if (row.portalPage === portal) return true;
      return row.retailerArea === ctx.area && row.retailerSlug === ctx.slug;
    });
    return filtered.length ? filtered : sales.slice();
  }

  function getSales() {
    return (CACHE && CACHE.sales) || [];
  }

  function getDailyReports() {
    return [];
  }

  var api = {
    _lastLoadError: false,
    load: function () {
      return load().then(function (data) {
        api._lastLoadError = !!(data && data._loadError);
        return data;
      });
    },
    getSales: getSales,
    getRetailerSales: getRetailerSales,
    getDailyReports: getDailyReports,
    getRetailerSlugFromPage: getRetailerSlugFromPage,
    formatMoney: formatMoney,
    formatDateLabel: formatDateLabel,
    formatMonthLabel: formatMonthLabel,
    areaLabel: areaLabel,
    countForRetailer: function (area, slug) {
      return getRetailerSales({ area: area, slug: slug }).length;
    }
  };

  window.KreezbySales = api;
})();
