/**
 * Create / edit daily route sheets (manual form layout). Persists to localStorage.
 */
(function () {
  'use strict';

  var AREAS = [
    { value: 'lucena', label: 'Lucena' },
    { value: 'batangas', label: 'Batangas' },
    { value: 'stotomas', label: 'Sto. Tomas' },
    { value: 'lipa', label: 'Lipa' },
    { value: 'tagaytay', label: 'Tagaytay' },
    { value: 'citimart', label: 'Citimart' }
  ];

  var editingReportId = null;

  function api() {
    return window.KreezbySales;
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function num(v) {
    if (v === '' || v == null) return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function manualEditorHead() {
    return (
      '<thead><tr class="manual-sheet-group-row">' +
      '<th rowspan="2">#</th><th rowspan="2">Locations</th><th rowspan="2">A/R</th>' +
      '<th colspan="4">Date</th><th colspan="3">Pulled Out &amp; Replaced</th><th rowspan="2">Collected</th><th rowspan="2"></th>' +
      '</tr><tr class="manual-sheet-subhead">' +
      '<th>Cons</th><th>COD</th><th>Staff</th><th>Check</th><th>F</th><th>P.O</th><th>R</th>' +
      '</tr></thead>'
    );
  }

  function editorRowHtml(idx, row) {
    row = row || {};
    return (
      '<tr data-row-idx="' + idx + '">' +
      '<td>' + (idx + 1) + '</td>' +
      '<td><input type="text" class="sheet-inp loc-inp" value="' + esc(row.retailerName || '') + '" placeholder="Location"></td>' +
      '<td><input type="number" class="sheet-inp ar-inp" min="0" step="1" value="' + esc(row.accountReceivable != null ? row.accountReceivable : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp cons-inp" min="0" step="1" value="' + esc(row.cons != null ? row.cons : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp cod-inp" min="0" step="1" value="' + esc(row.cod != null ? row.cod : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp staff-inp" min="0" step="1" value="' + esc(row.staff != null ? row.staff : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp check-inp" min="0" step="1" value="' + esc(row.check != null ? row.check : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp f-inp" min="0" step="1" value="' + esc(row.f != null ? row.f : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp po-inp" min="0" step="1" value="' + esc(row.po != null ? row.po : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp rep-inp" min="0" step="1" value="' + esc(row.replaced != null ? row.replaced : '') + '"></td>' +
      '<td><input type="number" class="sheet-inp col-inp" min="0" step="0.01" value="' + esc(row.collected != null ? row.collected : '') + '"></td>' +
      '<td><button type="button" class="sheet-row-del" title="Remove row">✕</button></td>' +
      '</tr>'
    );
  }

  function readRowsFromEditor() {
    var tbody = document.getElementById('sheet-editor-tbody');
    if (!tbody) return [];
    var rows = [];
    tbody.querySelectorAll('tr[data-row-idx]').forEach(function (tr) {
      var name = (tr.querySelector('.loc-inp') || {}).value || '';
      if (!name.trim()) return;
      rows.push({
        retailerName: name.trim(),
        accountReceivable: num((tr.querySelector('.ar-inp') || {}).value),
        cons: num((tr.querySelector('.cons-inp') || {}).value),
        cod: num((tr.querySelector('.cod-inp') || {}).value),
        staff: num((tr.querySelector('.staff-inp') || {}).value),
        check: num((tr.querySelector('.check-inp') || {}).value),
        f: num((tr.querySelector('.f-inp') || {}).value),
        po: num((tr.querySelector('.po-inp') || {}).value),
        replaced: num((tr.querySelector('.rep-inp') || {}).value),
        collected: num((tr.querySelector('.col-inp') || {}).value)
      });
    });
    return rows;
  }

  function reindexEditorRows() {
    var tbody = document.getElementById('sheet-editor-tbody');
    if (!tbody) return;
    var trs = tbody.querySelectorAll('tr[data-row-idx]');
    trs.forEach(function (tr, i) {
      tr.setAttribute('data-row-idx', String(i));
      tr.cells[0].textContent = String(i + 1);
    });
  }

  function updateEditorTotals() {
    var a = api();
    if (!a) return;
    var entries = readRowsFromEditor();
    var expense = num((document.getElementById('sheet-editor-expense') || {}).value) || 0;
    var fin = a.computeReportFinancials({ entries: entries, totalExpense: expense });

    var cashEl = document.getElementById('sheet-editor-cash');
    var netEl = document.getElementById('sheet-editor-net');
    var sumColEl = document.getElementById('sheet-editor-sum-collected');
    if (cashEl) cashEl.textContent = a.formatMoney(fin.cashCollected);
    if (netEl) netEl.textContent = a.formatMoney(fin.netSales);
    if (sumColEl) sumColEl.textContent = a.formatMoney(fin.sumCollected);

    var tfoot = document.getElementById('sheet-editor-tfoot');
    if (tfoot) {
      var t = { cons: 0, cod: 0, staff: 0, check: 0, f: 0, po: 0, replaced: 0, collected: 0 };
      entries.forEach(function (e) {
        t.cons += e.cons || 0;
        t.cod += e.cod || 0;
        t.staff += e.staff || 0;
        t.check += e.check || 0;
        t.f += e.f || 0;
        t.po += e.po || 0;
        t.replaced += e.replaced || 0;
        t.collected += e.collected || 0;
      });
      tfoot.innerHTML =
        '<tr><td colspan="3" style="text-align:right;font-weight:700;">TOTALS</td>' +
        '<td>' + (t.cons || '—') + '</td><td>' + (t.cod || '—') + '</td><td>' + (t.staff || '—') + '</td>' +
        '<td>' + (t.check || '—') + '</td><td>' + (t.f || '—') + '</td><td>' + (t.po || '—') + '</td>' +
        '<td>' + (t.replaced || '—') + '</td>' +
        '<td class="money-cell" style="font-weight:700;">' + a.formatMoney(t.collected) + '</td><td></td></tr>';
    }
  }

  function wireEditorEvents() {
    var tbody = document.getElementById('sheet-editor-tbody');
    if (!tbody) return;

    tbody.addEventListener('input', updateEditorTotals);
    tbody.addEventListener('click', function (ev) {
      if (ev.target.classList.contains('sheet-row-del')) {
        ev.target.closest('tr').remove();
        reindexEditorRows();
        updateEditorTotals();
      }
    });

    var exp = document.getElementById('sheet-editor-expense');
    if (exp) exp.addEventListener('input', updateEditorTotals);
  }

  function addEditorRow(row) {
    var tbody = document.getElementById('sheet-editor-tbody');
    if (!tbody) return;
    var idx = tbody.querySelectorAll('tr[data-row-idx]').length;
    tbody.insertAdjacentHTML('beforeend', editorRowHtml(idx, row));
    reindexEditorRows();
    updateEditorTotals();
  }

  function fillEditor(report) {
    var sourceEl = document.getElementById('sheet-editor-source');
    var dateEl = document.getElementById('sheet-editor-date');
    var areaLabelEl = document.getElementById('sheet-editor-area-label');
    var expenseEl = document.getElementById('sheet-editor-expense');
    var tbody = document.getElementById('sheet-editor-tbody');
    var titleEl = document.getElementById('sheet-editor-modal-title');

    if (sourceEl && report) sourceEl.value = report.source || '';
    if (dateEl && report) dateEl.value = report.reportDate || '';
    if (areaLabelEl && report) areaLabelEl.value = report.areaLabel || '';
    if (expenseEl && report) expenseEl.value = report.totalExpense != null ? report.totalExpense : '';
    if (titleEl) {
      titleEl.textContent = report
        ? 'Edit Route Sheet — ' + (report.areaLabel || '') + ' · ' + (report.reportDate || '')
        : 'New Route Sheet Entry';
    }

    if (tbody) {
      tbody.innerHTML = '';
      var entries = (report && report.entries) || [];
      if (!entries.length) {
        addEditorRow({});
      } else {
        entries.forEach(function (e) { addEditorRow(e); });
      }
    }
    updateEditorTotals();
  }

  function buildModalIfNeeded() {
    if (document.getElementById('sheet-editor-tbody')) return;

    var overlay = document.getElementById('create-saleslist-modal-overlay');
    if (!overlay) return;

    var areaOpts = AREAS.map(function (a) {
      return '<option value="' + a.value + '">' + esc(a.label) + '</option>';
    }).join('');

    overlay.innerHTML =
      '<div class="form-modal-box sheet-editor-modal-box">' +
      '<div class="modal-form-header">' +
      '<h2 id="sheet-editor-modal-title">Route Sheet Entry</h2>' +
      '<button type="button" style="background:none;border:none;font-size:16px;cursor:pointer;" id="sheet-editor-close">✕</button>' +
      '</div>' +
      '<div class="modal-form-body">' +
      '<div class="form-inputs-row-grid sheet-editor-meta">' +
      '<div class="form-field-unit"><label>Area (route)</label><select id="sheet-editor-source">' + areaOpts + '</select></div>' +
      '<div class="form-field-unit"><label>Date</label><input type="date" id="sheet-editor-date"></div>' +
      '<div class="form-field-unit"><label>Area label (on sheet)</label><input type="text" id="sheet-editor-area-label" placeholder="e.g. Bauan - 210"></div>' +
      '</div>' +
      '<p class="sheet-editor-hint">Same layout as the handwritten log. <strong>Cash Collected</strong> = sum of Collected column. <strong>Net Sales</strong> = Cash Collected − Total Expense.</p>' +
      '<div class="manual-sheet-scroll"><table class="manual-sheet-table sheet-editor-table">' +
      manualEditorHead() +
      '<tbody id="sheet-editor-tbody"></tbody>' +
      '<tfoot id="sheet-editor-tfoot"></tfoot>' +
      '</table></div>' +
      '<button type="button" class="btn-call-to-action" id="sheet-editor-add-row" style="margin:12px 0;background:#00897b;">+ Add location row</button>' +
      '<div class="sheet-editor-financials">' +
      '<div class="form-field-unit"><label>Total Expense (₱)</label><input type="number" id="sheet-editor-expense" min="0" step="0.01" value="0"></div>' +
      '<div class="manual-sheet-summary sheet-editor-live-summary">' +
      '<div class="summary-line"><strong>Sum of Collected column</strong><span id="sheet-editor-sum-collected">₱0.00</span></div>' +
      '<div class="summary-line"><strong>Cash Collected</strong><span id="sheet-editor-cash">₱0.00</span></div>' +
      '<div class="summary-line total"><strong>Net Sales</strong><span id="sheet-editor-net">₱0.00</span></div>' +
      '</div></div>' +
      '</div>' +
      '<div class="modal-action-footer-panel">' +
      '<button type="button" class="btn-modal-cancel" id="sheet-editor-cancel">Cancel</button>' +
      '<button type="button" class="btn-modal-save" id="sheet-editor-save">Save route sheet</button>' +
      '</div></div>';

    document.getElementById('sheet-editor-close').addEventListener('click', closeEditor);
    document.getElementById('sheet-editor-cancel').addEventListener('click', closeEditor);
    document.getElementById('sheet-editor-add-row').addEventListener('click', function () { addEditorRow({}); });
    document.getElementById('sheet-editor-save').addEventListener('click', saveEditor);
    document.getElementById('sheet-editor-source').addEventListener('change', function () {
      var src = document.getElementById('sheet-editor-source').value;
      var a = api();
      if (a && !document.getElementById('sheet-editor-area-label').value) {
        document.getElementById('sheet-editor-area-label').value = a.areaLabel(src);
      }
    });
    wireEditorEvents();
  }

  function openEditor(reportId) {
    buildModalIfNeeded();
    var a = api();
    if (!a) return;

    editingReportId = reportId || null;
    var report = null;
    if (reportId) {
      report = a.getReportById(reportId);
      if (!report) {
        alert('Sheet not found.');
        return;
      }
      report = JSON.parse(JSON.stringify(report));
    } else {
      var src = '';
      var date = new Date().toISOString().slice(0, 10);
      if (window.getCurrentRouteFilters) {
        var f = window.getCurrentRouteFilters();
        src = f.source || 'bauan';
        date = f.reportDate || date;
      }
      report = {
        source: src,
        reportDate: date,
        areaLabel: a.areaLabel(src),
        entries: [{}],
        totalExpense: 0
      };
    }

    fillEditor(report);
    var overlay = document.getElementById('create-saleslist-modal-overlay');
    if (overlay) overlay.classList.add('modal-triggered');
  }

  function closeEditor() {
    var overlay = document.getElementById('create-saleslist-modal-overlay');
    if (overlay) overlay.classList.remove('modal-triggered');
    editingReportId = null;
  }

  function saveEditor() {
    var a = api();
    if (!a) return;

    var source = (document.getElementById('sheet-editor-source') || {}).value;
    var reportDate = (document.getElementById('sheet-editor-date') || {}).value;
    var areaLabel = (document.getElementById('sheet-editor-area-label') || {}).value.trim();
    var entries = readRowsFromEditor();
    var totalExpense = num((document.getElementById('sheet-editor-expense') || {}).value) || 0;

    if (!source || !reportDate) {
      alert('Please select area and date.');
      return;
    }
    if (!entries.length) {
      alert('Add at least one location with a name.');
      return;
    }

    var id = editingReportId || ('custom-' + source + '-' + reportDate.replace(/-/g, '') + '-' + Date.now());
    var report = {
      id: id,
      reportDate: reportDate,
      source: source,
      areaLabel: areaLabel || a.areaLabel(source),
      sourceImage: '',
      entries: entries,
      totalExpense: totalExpense,
      isCustom: !editingReportId || String(editingReportId).indexOf('custom-') === 0
    };

    var fin = a.computeReportFinancials(report);
    report.cashCollected = fin.cashCollected;
    report.netSales = fin.netSales;

    a.saveReport(report).then(function () {
      closeEditor();
      if (window.refreshRouteSheetView) window.refreshRouteSheetView();
      if (window.refreshRouteFilterOptions) window.refreshRouteFilterOptions(report);
      alert('Route sheet saved.');
    });
  }

  window.openRouteSheetEditor = openEditor;
  window.closeRouteSheetEditor = closeEditor;
  window.toggleCreateSaleModalOverlay = function (show) {
    if (show) openEditor(null);
    else closeEditor();
  };

  document.addEventListener('DOMContentLoaded', buildModalIfNeeded);
})();
