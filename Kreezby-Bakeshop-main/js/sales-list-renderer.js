/**
 * Renders imported route sales into admin, staff, and retailer views.
 * Layout matches handwritten daily sheets: retailer route logs on top, customers below.
 */
(function () {
  'use strict';

  function salesApi() {
    return window.KreezbySales;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function cell(v) {
    if (v === 0) return '0';
    if (v == null || v === '') return '—';
    return esc(v);
  }

  function moneyCell(n, api) {
    if (!n) return '—';
    return '<span class="money-cell">' + esc(api.formatMoney(n)) + '</span>';
  }

  function manualTableHead() {
    return (
      '<thead>' +
      '<tr class="manual-sheet-group-row">' +
      '<th rowspan="2">#</th>' +
      '<th rowspan="2">Locations</th>' +
      '<th rowspan="2">Account<br>Receivable</th>' +
      '<th colspan="4">Date</th>' +
      '<th colspan="3">Pulled Out &amp; Replaced</th>' +
      '<th rowspan="2">Collected</th>' +
      '</tr>' +
      '<tr class="manual-sheet-subhead">' +
      '<th>Cons</th><th>COD</th><th>Staff</th><th>Check</th>' +
      '<th>F</th><th>P.O</th><th>R</th>' +
      '</tr>' +
      '</thead>'
    );
  }

  function manualRowCellsData(entry, api) {
    return (
      '<td>' + cell(entry.accountReceivable) + '</td>' +
      '<td>' + cell(entry.cons) + '</td>' +
      '<td>' + cell(entry.cod) + '</td>' +
      '<td>' + cell(entry.staff) + '</td>' +
      '<td>' + cell(entry.check) + '</td>' +
      '<td>' + cell(entry.f) + '</td>' +
      '<td>' + cell(entry.po) + '</td>' +
      '<td>' + cell(entry.replaced) + '</td>' +
      '<td class="money-cell">' + (entry.collected ? moneyCell(entry.collected, api) : '—') + '</td>'
    );
  }

  function manualRowCells(entry, api) {
    return (
      '<td class="loc-cell">' + esc(entry.retailerName) + '</td>' +
      '<td>' + cell(entry.accountReceivable) + '</td>' +
      '<td>' + cell(entry.cons) + '</td>' +
      '<td>' + cell(entry.cod) + '</td>' +
      '<td>' + cell(entry.staff) + '</td>' +
      '<td>' + cell(entry.check) + '</td>' +
      '<td>' + cell(entry.f) + '</td>' +
      '<td>' + cell(entry.po) + '</td>' +
      '<td>' + cell(entry.replaced) + '</td>' +
      '<td class="money-cell">' + (entry.collected ? moneyCell(entry.collected, api) : '—') + '</td>'
    );
  }

  function reportMatchesSearch(report, sales, q) {
    if (!q) return true;
    var lower = q.toLowerCase();
    if (report.areaLabel && report.areaLabel.toLowerCase().indexOf(lower) >= 0) return true;
    if (report.reportDate && report.reportDate.indexOf(lower) >= 0) return true;
    if (report.source && report.source.toLowerCase().indexOf(lower) >= 0) return true;
    return sales.some(function (s) {
      return s.retailerName.toLowerCase().indexOf(lower) >= 0 ||
        s.invoiceCode.toLowerCase().indexOf(lower) >= 0;
    });
  }

  function buildSheetTotals(entries) {
    var t = { cons: 0, cod: 0, staff: 0, check: 0, f: 0, po: 0, replaced: 0, collected: 0 };
    entries.forEach(function (e) {
      t.cons += Number(e.cons) || 0;
      t.cod += Number(e.cod) || 0;
      t.staff += Number(e.staff) || 0;
      t.check += Number(e.check) || 0;
      t.f += Number(e.f) || 0;
      t.po += Number(e.po) || 0;
      t.replaced += Number(e.replaced) || 0;
      t.collected += Number(e.collected) || 0;
    });
    return t;
  }

  function sheetSummaryHtml(report, api) {
    var fin = api.computeReportFinancials ? api.computeReportFinancials(report) : {
      cashCollected: report.cashCollected,
      totalExpense: report.totalExpense,
      netSales: report.netSales
    };
    var cash = fin.cashCollected;
    var expense = fin.totalExpense;
    var net = fin.netSales;
    return (
      '<div class="manual-sheet-summary">' +
      '<div class="summary-line"><strong>Cash Collected</strong><span>' +
      (cash != null ? esc(api.formatMoney(cash)) : '—') + '</span></div>' +
      '<div class="summary-line"><strong>Total Expense</strong><span>' +
      (expense != null ? esc(api.formatMoney(expense)) : '—') + '</span></div>' +
      '<div class="summary-line total"><strong>Net Sales</strong><span>' +
      (net != null ? esc(api.formatMoney(net)) : '—') + '</span></div>' +
      '</div>'
    );
  }

  function renderRouteSheets(container, reports, allSales, searchQ, onRowClick) {
    if (!container) return;
    var api = salesApi();
    var q = (searchQ || '').trim();

    if (!reports.length) {
      container.innerHTML =
        '<p style="text-align:center;color:#666;padding:24px;">No imported route sheets for this period.</p>';
      return;
    }

    var html = '';
    reports.forEach(function (report) {
      var sales = allSales.filter(function (s) { return s.reportId === report.id; });
      if (!reportMatchesSearch(report, sales, q)) return;

      var entries = report.entries || [];
      var totals = buildSheetTotals(entries);
      var rows = '';

      var reportSales = sales
        .filter(function (s) { return s.reportId === report.id; })
        .sort(function (a, b) { return a.seq - b.seq; });

      entries.forEach(function (entry, idx) {
        var sale = reportSales[idx];
        var saleId = sale ? sale.id : '';
        var click = saleId && onRowClick
          ? ' class="sheet-row-clickable" data-sale-id="' + esc(saleId) + '"'
          : '';

        rows +=
          '<tr' + click + '>' +
          '<td>' + (idx + 1) + '</td>' +
          manualRowCells(entry, api) +
          '</tr>';
      });

      if (!rows) {
        rows = '<tr><td colspan="11" style="text-align:center;color:#888;">No line items</td></tr>';
      }

      html +=
        '<article class="manual-route-sheet-card" data-report-id="' + esc(report.id) + '">' +
        '<div class="manual-sheet-header">' +
        '<span class="sheet-brand">Kreezby Philippines</span>' +
        '<span class="sheet-meta"><strong>AREA:</strong> ' + esc(report.areaLabel) + '</span>' +
        '<span class="sheet-meta"><strong>DATE:</strong> ' + esc(report.reportDate) + '</span>' +
        '<button type="button" class="btn-call-to-action sheet-edit-btn" data-edit-report="' + esc(report.id) + '" style="margin-left:auto;font-size:11px;">Edit sheet</button>' +
        '</div>' +
        '<div class="manual-sheet-scroll">' +
        '<table class="manual-sheet-table">' +
        manualTableHead() +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr>' +
        '<td colspan="3" style="text-align:right;">TOTALS</td>' +
        '<td>' + cell(totals.cons || null) + '</td>' +
        '<td>' + cell(totals.cod || null) + '</td>' +
        '<td>' + cell(totals.staff || null) + '</td>' +
        '<td>' + cell(totals.check || null) + '</td>' +
        '<td>' + cell(totals.f || null) + '</td>' +
        '<td>' + cell(totals.po || null) + '</td>' +
        '<td>' + cell(totals.replaced || null) + '</td>' +
        '<td class="money-cell">' + (totals.collected ? moneyCell(totals.collected, api) : '—') + '</td>' +
        '</tr></tfoot>' +
        '</table></div>' +
        '<div class="manual-sheet-footer">' +
        sheetSummaryHtml(report, api) +
        '</div></article>';
    });

    if (!html) {
      container.innerHTML =
        '<p style="text-align:center;color:#666;padding:24px;">No route sheets match your search.</p>';
      return;
    }

    container.innerHTML = html;

    if (onRowClick) {
      container.querySelectorAll('.sheet-row-clickable').forEach(function (tr) {
        tr.addEventListener('click', function () {
          var id = tr.getAttribute('data-sale-id');
          if (id) window.showBauanSaleDetail(id);
        });
      });
    }

    container.querySelectorAll('.sheet-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var rid = btn.getAttribute('data-edit-report');
        if (rid && window.openRouteSheetEditor) window.openRouteSheetEditor(rid);
      });
    });
  }

  function deliveryDetailSummary(row) {
    var parts = [];
    if (row.cons) parts.push('Cons ' + row.cons);
    if (row.cod) parts.push('COD ' + row.cod);
    if (row.staff) parts.push('Staff ' + row.staff);
    if (row.check) parts.push('Check ' + row.check);
    if (row.f) parts.push('F ' + row.f);
    if (row.po) parts.push('P.O ' + row.po);
    if (row.replaced) parts.push('R ' + row.replaced);
    if (row.accountReceivable) parts.push('A/R ' + row.accountReceivable);
    return parts.length ? parts.join(' · ') : 'Route visit logged';
  }

  function retailerDeliveryRowHtml(row, idx, api, clickable) {
    var clickAttr = clickable && row.id
      ? ' class="retailer-delivery-row sheet-row-clickable" data-sale-id="' + esc(row.id) + '"'
      : ' class="retailer-delivery-row"';
    return (
      '<tr' + clickAttr + '>' +
      '<td>' + idx + '</td>' +
      '<td><span class="delivery-date">' + esc(api.formatDateLabel(row.reportDate)) + '</span>' +
      '<span class="delivery-date-iso">' + esc(row.reportDate) + '</span></td>' +
      '<td><strong class="delivery-invoice">' + esc(row.invoiceCode) + '</strong></td>' +
      '<td>' + esc(row.areaLabel || api.areaLabel(row.source)) + '</td>' +
      '<td class="delivery-detail-cell">' + esc(deliveryDetailSummary(row)) + '</td>' +
      manualRowCellsData(row, api) +
      '</tr>'
    );
  }

  function renderRetailerDeliverySection(tbody, sales, startIdx, clickable) {
    if (!tbody) return startIdx;
    var api = salesApi();
    if (!sales.length) {
      tbody.innerHTML =
        '<tr><td colspan="14" class="retailer-empty-row">No entries in this period.</td></tr>';
      return startIdx;
    }
    tbody.innerHTML = sales.map(function (row, i) {
      return retailerDeliveryRowHtml(row, startIdx + i + 1, api, clickable);
    }).join('');
    if (clickable) {
      tbody.querySelectorAll('.sheet-row-clickable').forEach(function (tr) {
        tr.addEventListener('click', function () {
          var id = tr.getAttribute('data-sale-id');
          if (id && window.showBauanSaleDetail) window.showBauanSaleDetail(id);
        });
      });
    }
    return startIdx + sales.length;
  }

  function retailerLoadFailed() {
    try {
      return !!(window.KreezbySales && window.KreezbySales._lastLoadError);
    } catch (e) {
      return false;
    }
  }

  function splitRecentAndPrevious(sales, recentDays) {
    recentDays = recentDays || 60;
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - recentDays);
    var recent = [];
    var previous = [];
    sales.forEach(function (row) {
      var d = new Date(row.reportDate + 'T12:00:00');
      if (d >= cutoff) recent.push(row);
      else previous.push(row);
    });
    return { recent: recent, previous: previous };
  }

  function renderRetailerDeliveryLog(panel, sales, ctx, options) {
    options = options || {};
    var clickable = !!options.clickable;
    if (!panel) return;
    var api = salesApi();
    var titleEl = document.querySelector('.page-title');
    var storeName = titleEl
      ? titleEl.textContent.split('—')[0].trim()
      : (sales[0] && sales[0].retailerName) || 'Your store';

    var totalCollected = 0;
    sales.forEach(function (r) { totalCollected += Number(r.collected) || 0; });
    var lastDate = sales.length ? sales[0].reportDate : null;
    var split = splitRecentAndPrevious(sales);

    var host = document.getElementById('retailer-delivery-log-host');
    if (!host) {
      panel.innerHTML =
        '<div class="retailer-delivery-header">' +
        '<div><h3 id="retailer-delivery-title">Kreezby delivery &amp; collection logs</h3>' +
        '<p id="retailer-delivery-subtitle" class="retailer-delivery-subtitle"></p></div>' +
        '<div class="retailer-delivery-stats" id="retailer-delivery-stats"></div>' +
        '</div>' +
        '<div id="retailer-delivery-log-host"></div>';
      host = document.getElementById('retailer-delivery-log-host');
    }

    var title = document.getElementById('retailer-delivery-title');
    var subtitle = document.getElementById('retailer-delivery-subtitle');
    var stats = document.getElementById('retailer-delivery-stats');
    if (title) title.textContent = storeName + ' — Delivery history';
    if (subtitle) {
      subtitle.textContent = sales.length
        ? 'Imported route logs from Kreezby Bakeshop (newest first). Recent visits are from the last 60 days.'
        : 'No imported delivery logs yet for this location in the 2026 route sheets.';
    }
    if (stats) {
      stats.innerHTML =
        '<div class="retailer-stat-pill"><span class="lbl">Total visits</span><strong>' + sales.length + '</strong></div>' +
        '<div class="retailer-stat-pill"><span class="lbl">Last delivery</span><strong>' +
        (lastDate ? esc(api.formatDateLabel(lastDate)) : '—') + '</strong></div>' +
        '<div class="retailer-stat-pill"><span class="lbl">Total collected</span><strong>' +
        esc(api.formatMoney(totalCollected)) + '</strong></div>';
    }

    if (!sales.length) {
      if (!host) {
        panel.innerHTML =
          '<p class="retailer-delivery-empty">' +
          (retailerLoadFailed()
            ? 'Could not load delivery data. Refresh the page (Ctrl+F5).'
            : 'No delivery records found for this store yet.') +
          '</p>';
        return;
      }
      host.innerHTML =
        '<p class="retailer-delivery-empty">' +
        (retailerLoadFailed()
          ? 'Could not load delivery data. Refresh the page (Ctrl+F5).'
          : 'No delivery records found for this store yet. Logs appear here when your location is on a daily Kreezby collection sheet.') +
        '</p>';
      return;
    }

    function sectionHtml(label, desc, sectionSales, sectionId) {
      return (
        '<section class="retailer-delivery-section" aria-labelledby="' + sectionId + '-heading">' +
        '<div class="retailer-delivery-section-head">' +
        '<h4 id="' + sectionId + '-heading">' + esc(label) + ' <span class="count">(' + sectionSales.length + ')</span></h4>' +
        '<p class="section-desc">' + esc(desc) + '</p></div>' +
        '<div class="retailer-delivery-table-wrap">' +
        '<table class="data-display-table manual-sheet-table retailer-delivery-table">' +
        '<thead>' +
        '<tr class="manual-sheet-group-row">' +
        '<th rowspan="2">#</th><th rowspan="2">Date</th><th rowspan="2">Log ref</th><th rowspan="2">Route</th>' +
        '<th rowspan="2">Visit summary</th><th rowspan="2">A/R</th>' +
        '<th colspan="4">Delivery / collection</th><th colspan="3">Pulled out &amp; replaced</th>' +
        '<th rowspan="2">Collected</th></tr>' +
        '<tr class="manual-sheet-subhead">' +
        '<th>Cons</th><th>COD</th><th>Staff</th><th>Check</th><th>F</th><th>P.O</th><th>R</th>' +
        '</tr></thead>' +
        '<tbody id="' + sectionId + '-tbody"></tbody></table></div></section>'
      );
    }

    var recentDesc = split.recent.length
      ? 'Last 60 days — latest Kreezby route visits'
      : 'No route visits logged in the last 60 days';
    host.innerHTML =
      sectionHtml('Recent deliveries', recentDesc, split.recent, 'retailer-recent') +
      (split.previous.length
        ? sectionHtml('Previous deliveries', 'Older route visits from earlier Kreezby sheets', split.previous, 'retailer-previous')
        : '');

    var idx = 0;
    idx = renderRetailerDeliverySection(
      document.getElementById('retailer-recent-tbody'),
      split.recent,
      idx,
      clickable
    );
    if (split.previous.length) {
      renderRetailerDeliverySection(
        document.getElementById('retailer-previous-tbody'),
        split.previous,
        idx,
        clickable
      );
    }
  }

  function buildRetailerMonthOptions(sales, api) {
    var months = {};
    sales.forEach(function (row) {
      var ym = row.reportDate.slice(0, 7);
      months[ym] = api.formatMonthLabel(ym);
    });
    return Object.keys(months).sort().reverse().map(function (ym) {
      return { value: ym, label: months[ym] };
    });
  }

  function filterSalesByMonth(sales, month) {
    if (!month) return sales;
    return sales.filter(function (row) {
      return row.reportDate.slice(0, 7) === month;
    });
  }

  function initRetailerSalesListPage() {
    var api = salesApi();
    if (!api) return;
    var ctx = api.getRetailerSlugFromPage();
    if (!ctx) return;

    var panel = document.getElementById('retailer-sales-panel');
    var monthEl = document.getElementById('retailer-sales-filter-month');
    var badge = document.getElementById('retailer-sales-import-badge');
    var allSales = [];

    function refreshView() {
      var month = monthEl ? monthEl.value : '';
      var sales = filterSalesByMonth(allSales, month);
      renderRetailerDeliveryLog(panel, sales, ctx, { clickable: true });
      if (badge) {
        badge.textContent = sales.length
          ? sales.length + ' delivery log' + (sales.length === 1 ? '' : 's') +
            (month ? ' in ' + api.formatMonthLabel(month) : ' on record')
          : 'No delivery logs' + (month ? ' for ' + api.formatMonthLabel(month) : ' yet');
      }
    }

    api.load().then(function () {
      allSales = api.getRetailerSales
        ? api.getRetailerSales(ctx)
        : api.getSales({ retailerArea: ctx.area, retailerSlug: ctx.slug });

      if (monthEl) {
        var opts = buildRetailerMonthOptions(allSales, api);
        monthEl.innerHTML = '<option value="">All months</option>' +
          opts.map(function (o) {
            return '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>';
          }).join('');
        monthEl.addEventListener('change', refreshView);
      }

      refreshView();
    });
  }

  function renderAdminStaffTable(tbody, sales, onRowClick) {
    if (!tbody) return;
    var api = salesApi();
    if (!sales.length) {
      tbody.innerHTML =
        '<tr><td colspan="11" style="text-align:center;color:#666;padding:24px;">No imported sales for this period.</td></tr>';
      return;
    }
    tbody.innerHTML = sales.map(function (row, idx) {
      var click = onRowClick ? ' class="sheet-row-clickable" data-sale-id="' + esc(row.id) + '"' : '';
      return (
        '<tr' + click + '>' +
        '<td>' + (idx + 1) + '</td>' +
        '<td>' + esc(row.reportDate) + '</td>' +
        '<td><strong style="color:#0288d1;">' + esc(row.invoiceCode) + '</strong></td>' +
        manualRowCells(row, api) +
        '</tr>'
      );
    }).join('');

    if (onRowClick) {
      tbody.querySelectorAll('.sheet-row-clickable').forEach(function (tr) {
        tr.addEventListener('click', function () {
          var id = tr.getAttribute('data-sale-id');
          if (id) window.showBauanSaleDetail(id);
        });
      });
    }
  }

  function wireSearch(input, rerender) {
    if (!input) return;
    input.addEventListener('input', function () {
      rerender(input.value.trim());
    });
  }

  function initRetailerPage() {
    var api = salesApi();
    if (!api) return;
    var ctx = api.getRetailerSlugFromPage();
    if (!ctx) return;

    api.load().then(function () {
      var sales = api.getRetailerSales
        ? api.getRetailerSales(ctx)
        : api.getSales({ retailerArea: ctx.area, retailerSlug: ctx.slug });
      var panel = document.getElementById('retailer-sales-panel');
      if (panel) panel.style.display = 'block';
      renderRetailerDeliveryLog(panel, sales, ctx);

      var syncBar = document.querySelector('.sync-status-bar');
      if (syncBar && sales.length) {
        var last = sales[0];
        var spans = syncBar.querySelectorAll('span');
        if (spans.length > 1) {
          spans[1].textContent = 'Last Kreezby delivery: ' + api.formatDateLabel(last.reportDate);
        }
      }

      document.querySelectorAll('.stat-card').forEach(function (card) {
        var title = card.querySelector('.stat-title');
        if (title && title.textContent.indexOf('Sales Records') >= 0) {
          var val = card.querySelector('.stat-value');
          if (val) val.textContent = String(sales.length);
        }
      });
    });
  }

  function fillSelect(el, options, placeholder) {
    if (!el) return;
    var html = '';
    if (placeholder) {
      html += '<option value="">' + esc(placeholder) + '</option>';
    }
    options.forEach(function (o) {
      html += '<option value="' + esc(o.value) + '">' + esc(o.label) + '</option>';
    });
    el.innerHTML = html;
  }

  function initAdminStaffPage() {
    var wrap = document.getElementById('bauan-route-sheets-wrap');
    var flatTbody = document.getElementById('bauan-retailer-sales-tbody');
    if (!wrap && !flatTbody) return;

    var api = salesApi();
    if (!api) return;
    var alreadyBound = !!(wrap && wrap.getAttribute('data-route-sheet-booted') === '1');

    var monthEl = document.getElementById('route-filter-month');
    var areaEl = document.getElementById('route-filter-area');
    var dateEl = document.getElementById('route-filter-date');
    var filterMeta = null;

    function currentFilters() {
      return {
        month: monthEl ? monthEl.value : '',
        source: areaEl ? areaEl.value : '',
        reportDate: dateEl ? dateEl.value : ''
      };
    }

    function refreshDateOptions() {
      if (!dateEl || !filterMeta) return;
      var month = monthEl ? monthEl.value : '';
      var dates = (filterMeta.byMonth[month] && filterMeta.byMonth[month].dateList) || [];
      var prev = dateEl.value;
      fillSelect(dateEl, dates, dates.length ? null : 'No dates this month');
      if (prev && dates.some(function (d) { return d.value === prev; })) {
        dateEl.value = prev;
      } else if (dates.length) {
        dateEl.value = dates[0].value;
      }
    }

    function refreshAreaOptions() {
      if (!areaEl || !filterMeta) return;
      var areas = filterMeta.areas || [];
      var prev = areaEl.value;
      fillSelect(areaEl, areas, areas.length ? null : 'No areas');
      if (prev && areas.some(function (a) { return a.value === prev; })) {
        areaEl.value = prev;
      } else if (areas.length) {
        areaEl.value = areas[0].value;
      }
    }

    function rerender() {
      var f = currentFilters();
      if (!wrap) {
        if (flatTbody) renderAdminStaffTable(flatTbody, api.getSales(), true);
        return;
      }

      if (!f.month || !f.source || !f.reportDate) {
        wrap.innerHTML =
          '<p class="route-sheet-empty-hint">Choose a <strong>month</strong>, <strong>area</strong>, and <strong>date</strong> to view one route sheet.</p>';
        return;
      }

      var reports = api.getDailyReports({
        month: f.month,
        source: f.source,
        reportDate: f.reportDate
      });
      var sales = reports.length && api.getSalesForReport
        ? api.getSalesForReport(reports[0])
        : api.getSales().filter(function (s) {
          return s.reportDate === f.reportDate && s.source === f.source;
        });

      if (!reports.length) {
        wrap.innerHTML =
          '<p class="route-sheet-empty-hint">No route sheet for ' +
          esc(api.areaLabel(f.source)) + ' on ' + esc(api.formatDateLabel(f.reportDate)) + '.</p>';
        return;
      }

      renderRouteSheets(wrap, reports, sales, '', true);
    }

    function onMonthChange() {
      refreshDateOptions();
      rerender();
    }

    function onDateChange() {
      rerender();
    }

    function onAreaChange() {
      rerender();
    }

    function boot() {
      filterMeta = api.getRouteFilterOptions();
      var defaults = api.getDefaultRouteFilters();

      if (monthEl) {
        fillSelect(monthEl, filterMeta.months, filterMeta.months.length ? null : 'No data');
        if (defaults.month) monthEl.value = defaults.month;
      }
      refreshAreaOptions();
      if (areaEl && defaults.source) areaEl.value = defaults.source;
      refreshDateOptions();
      if (dateEl && defaults.reportDate) dateEl.value = defaults.reportDate;

      if (!alreadyBound) {
        if (monthEl) monthEl.addEventListener('change', onMonthChange);
        if (dateEl) dateEl.addEventListener('change', onDateChange);
        if (areaEl) areaEl.addEventListener('change', onAreaChange);
        if (wrap) wrap.setAttribute('data-route-sheet-booted', '1');
      }

      window.getCurrentRouteFilters = currentFilters;
      window.refreshRouteSheetView = function () {
        filterMeta = api.getRouteFilterOptions();
        rerender();
      };
      window.refreshRouteFilterOptions = function (report) {
        filterMeta = api.getRouteFilterOptions();
        if (report && monthEl && dateEl && areaEl) {
          monthEl.value = report.reportDate.slice(0, 7);
          refreshDateOptions();
          dateEl.value = report.reportDate;
          refreshAreaOptions();
          areaEl.value = report.source;
        }
        rerender();
      };

      rerender();

      var editBtn = document.getElementById('btn-edit-route-sheet');
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          var f = currentFilters();
          if (!f.month || !f.source || !f.reportDate) {
            alert('Select month, date, and area first.');
            return;
          }
          var reports = api.getDailyReports(f);
          if (reports.length && window.openRouteSheetEditor) {
            window.openRouteSheetEditor(reports[0].id);
          }
        });
      }

      var badge = document.getElementById('bauan-import-badge');
      if (badge && api.getImportSummary) {
        var s = api.getImportSummary();
        var base =
          s.total + ' location entries · ' + filterMeta.months.length + ' months · ' +
          api.getDailyReports().length + ' route sheets (use filters to view one at a time)';
        badge.textContent = s.isTestData
          ? base + ' · synthetic test data (admin only)'
          : base;
      }
    }

    api.load().then(boot);
  }

  function setDetailText(id, label, value) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<strong>' + label + '</strong> ' + esc(value == null || value === '' ? '—' : value);
  }

  window.showBauanSaleDetail = function (saleId) {
    var api = salesApi();
    if (!api) return;
    var row = api.findSaleById ? api.findSaleById(saleId) : api.getSales().find(function (s) { return s.id === saleId; });
    if (!row) return;

    var report = api.getDailyReports().find(function (r) { return r.id === row.reportId; });
    var title = document.querySelector('#saleslist-detailed-inspector-panel-view h3');
    if (title) {
      title.textContent = 'Route Sheet — ' + (report ? report.areaLabel : row.areaLabel) + ' · ' + row.reportDate;
    }

    setDetailText('bauan-detail-invoice', 'Invoice:', row.invoiceCode);
    setDetailText('bauan-detail-route', 'Area / Date:', row.areaLabel + ' · ' + row.reportDate);
    setDetailText('bauan-detail-client', 'Location:', row.retailerName);
    setDetailText('bauan-detail-cons', 'Cons / COD / Staff:',
      [row.cons && 'Cons ' + row.cons, row.cod && 'COD ' + row.cod, row.staff && 'Staff ' + row.staff].filter(Boolean).join(' · ') || '—');
    setDetailText('bauan-detail-po', 'P.O / Replaced:', (row.po || '—') + ' / ' + (row.replaced || '—'));
    setDetailText('bauan-detail-ar', 'Account Receivable:', row.accountReceivable ? api.formatMoney(row.accountReceivable) : '—');
    setDetailText('bauan-detail-total', 'Collected (this row):', api.formatMoney(row.totalPaid));

    var sheetHost = document.getElementById('bauan-detail-sheet-host');
    if (sheetHost && report) {
      var sales = api.getSales()
        .filter(function (s) { return s.reportId === report.id; })
        .sort(function (a, b) { return a.seq - b.seq; });
      var rows = '';
      (report.entries || []).forEach(function (entry, idx) {
        var sale = sales[idx];
        var selected = sale && sale.id === saleId ? ' sheet-row-selected' : '';
        rows +=
          '<tr class="' + (sale ? 'sheet-row-clickable' + selected : '') + '"' +
          (sale ? ' data-sale-id="' + esc(sale.id) + '"' : '') + '>' +
          '<td>' + (idx + 1) + '</td>' +
          manualRowCells(entry, api) +
          '</tr>';
      });
      var totals = buildSheetTotals(report.entries || []);
      sheetHost.innerHTML =
        '<div class="manual-detail-layout">' +
        '<div><p class="manual-detail-route-title">Daily collection sheet (manual layout)</p>' +
        '<div class="manual-sheet-scroll"><table class="manual-sheet-table">' +
        manualTableHead() + '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr><td colspan="3" style="text-align:right;">TOTALS</td>' +
        '<td>' + cell(totals.cons || null) + '</td>' +
        '<td>' + cell(totals.cod || null) + '</td>' +
        '<td>' + cell(totals.staff || null) + '</td>' +
        '<td>' + cell(totals.check || null) + '</td>' +
        '<td>' + cell(totals.f || null) + '</td>' +
        '<td>' + cell(totals.po || null) + '</td>' +
        '<td>' + cell(totals.replaced || null) + '</td>' +
        '<td class="money-cell">' + (totals.collected ? moneyCell(totals.collected, api) : '—') + '</td>' +
        '</tr></tfoot></table></div></div>' +
        sheetSummaryHtml(report, api) +
        '</div>';

      sheetHost.querySelectorAll('.sheet-row-clickable').forEach(function (tr) {
        tr.addEventListener('click', function () {
          var id = tr.getAttribute('data-sale-id');
          if (id) window.showBauanSaleDetail(id);
        });
      });
    }

    var legacyTbody = document.getElementById('bauan-sale-detail-tbody');
    if (legacyTbody) {
      legacyTbody.innerHTML =
        '<tr><td>' + cell(row.cons) + '</td><td>Cons</td><td>' + esc(row.retailerName) + '</td>' +
        '<td style="text-align:right">—</td><td style="text-align:right">' + cell(row.collected) + '</td></tr>' +
        '<tr><td>' + cell(row.cod) + '</td><td>COD</td><td>—</td><td style="text-align:right">—</td><td style="text-align:right">—</td></tr>' +
        '<tr><td>' + cell(row.staff) + '</td><td>Staff</td><td>—</td><td style="text-align:right">—</td><td style="text-align:right">—</td></tr>';
    }
    var grand = document.getElementById('bauan-detail-grand-total');
    if (grand) grand.textContent = api.formatMoney(row.totalPaid).replace('₱', '');

    if (typeof window.switchToDetailedSalesTransactionInspector === 'function') {
      window.switchToDetailedSalesTransactionInspector();
    }
  };

  window.KreezbySalesListRenderer = {
    renderRetailerDeliveryLog: renderRetailerDeliveryLog,
    renderAdminStaffTable: renderAdminStaffTable,
    renderRouteSheets: renderRouteSheets,
    initRetailerPage: initRetailerPage,
    initRetailerSalesListPage: initRetailerSalesListPage,
    initAdminStaffPage: initAdminStaffPage,
    showBauanSaleDetail: window.showBauanSaleDetail
  };

  function showBootError(err) {
    var panel = document.getElementById('retailer-sales-panel');
    var msg = 'Sales list could not start: ' + (err && err.message ? err.message : String(err)) +
      '. Press Ctrl+F5 to reload.';
    if (panel) {
      panel.innerHTML = '<p class="retailer-delivery-empty" style="padding:24px;text-align:center;color:#c62828;">' +
        esc(msg) + '</p>';
    }
    console.error('[KreezbySalesList]', err);
  }

  function renderCustomerSales() {
    var tbody = document.getElementById('customer-sales-tbody');
    if (!tbody) return;
    if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
      window.KreezbyPortalSeed.apply();
    }
    var orders = [];
    try { orders = JSON.parse(localStorage.getItem('kreezbyOrders') || '[]'); } catch (e) { orders = []; }
    if (!Array.isArray(orders) || !orders.length) return;
    var sorted = orders.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    tbody.innerHTML = sorted.map(function (order, i) {
      var ship = order.shippingInfo || {};
      var names = Object.keys(order.items || {}).map(function (k) {
        var it = order.items[k];
        return (it.qty || 1) + '× ' + (it.name || 'Item');
      }).join(', ');
      var statusClass = (order.status || '').toLowerCase() === 'completed' ? 'received'
        : (order.status || '').toLowerCase() === 'shipped' ? 'partial' : 'pending';
      var dateLabel = '';
      try {
        dateLabel = new Date(order.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (err) { dateLabel = order.date || ''; }
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + esc(dateLabel) + '</td>' +
        '<td>' + esc(order.receiptNumber || order.orderNumber) + '</td>' +
        '<td><strong>' + esc(ship.fullName || order.poEntity || 'Customer') + '</strong><br><small>' + esc(names) + '</small></td>' +
        '<td>' + esc(order.total || '') + '</td>' +
        '<td><span class="status-pill-badge ' + statusClass + '">' + esc(order.status || 'Processing') + '</span></td>' +
        '</tr>';
    }).join('');
  }

  function bootSalesList() {
    try {
      if (document.getElementById('saleslist-retailer-page')) {
        initRetailerSalesListPage();
      } else if (document.getElementById('retailer-sales-panel')) {
        initRetailerPage();
      }
      if (document.getElementById('bauan-route-sheets-wrap') || document.getElementById('bauan-retailer-sales-tbody')) {
        initAdminStaffPage();
      }
      renderCustomerSales();
    } catch (err) {
      showBootError(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootSalesList);
  } else {
    bootSalesList();
  }
})();
