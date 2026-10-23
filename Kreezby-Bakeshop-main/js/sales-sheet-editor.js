/**
 * Create / edit daily route sheets (manual form layout). Persists to localStorage.
 */
(function () {
  'use strict';

  var AREAS = [
    { value: 'batangas', label: 'Batangas' },
    { value: 'bauan', label: 'Bauan' },
    { value: 'citimart', label: 'Citimart' },
    { value: 'lipa', label: 'Lipa' },
    { value: 'lucena', label: 'Lucena' },
    { value: 'manila', label: 'Manila' },
    { value: 'rosario', label: 'Rosario' },
    { value: 'stotomas', label: 'Sto. Tomas' },
    { value: 'tagaytay', label: 'Tagaytay' }
  ];
  var AREA_BY_LABEL = {};
  AREAS.forEach(function (a) { AREA_BY_LABEL[a.label.toLowerCase()] = a.value; });

  var editingReportId = null;
  var editingReport = null;
  var originalEntries = [];
  // Retailer accounts, so each row can be linked to the store that bought it.
  var accounts = [];
  var accountsLoaded = null;

  function sessionToken() {
    try { return (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { return ''; }
  }

  function loadAccounts() {
    if (accountsLoaded) return accountsLoaded;
    var token = sessionToken();
    if (!token || !window.fetch) return (accountsLoaded = Promise.resolve([]));
    accountsLoaded = fetch('/api/retailer-records', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Kreezby-Token': token } })
      .then(function (res) { return res.json(); })
      .then(function (body) {
        accounts = (body && body.accounts) || [];
        accounts.forEach(function (a) { a.source = AREA_BY_LABEL[String(a.area || '').toLowerCase()] || ''; });
        return accounts;
      })
      .catch(function () { accountsLoaded = null; return []; });
    return accountsLoaded;
  }

  function cleanName(v) {
    return String(v || '').toLowerCase().replace(/&/g, ' and ').replace(/'/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function accountByName(name) {
    var key = cleanName(name);
    if (!key) return null;
    for (var i = 0; i < accounts.length; i++) {
      if (cleanName(accounts[i].name) === key) return accounts[i];
    }
    return null;
  }

  function accountById(id) {
    for (var i = 0; i < accounts.length; i++) if (accounts[i].id === id) return accounts[i];
    return null;
  }

  function fillAccountList() {
    var list = document.getElementById('sheet-editor-accounts');
    if (!list) return;
    var src = (document.getElementById('sheet-editor-source') || {}).value || '';
    var inArea = accounts.filter(function (a) { return a.source === src; });
    var others = accounts.filter(function (a) { return a.source !== src; });
    list.innerHTML = inArea.concat(others).map(function (a) {
      return '<option value="' + esc(a.name) + '">' + esc(a.area || '') + '</option>';
    }).join('');
  }

  // Text keeps what was written on the sheet ("1,300 (10)", "GCASH"); plain numbers stay numbers.
  function val(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return null;
    return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s;
  }

  function inputValue(v) {
    return v == null ? '' : String(v);
  }

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

  function linkLabel(accountId) {
    var a = accountId ? accountById(accountId) : null;
    if (a) return '<span class="sheet-acct-link is-linked" title="Linked to this retailer account">✓ ' + esc(a.name) + '</span>';
    if (accountId) return '<span class="sheet-acct-link is-linked">✓ linked</span>';
    return '<span class="sheet-acct-link">Not a retailer account</span>';
  }

  function cellInput(cls, value) {
    return '<td><input type="text" inputmode="decimal" class="sheet-inp ' + cls + '" value="' + esc(inputValue(value)) + '"></td>';
  }

  function editorRowHtml(idx, row, origIdx, prefill) {
    row = row || {};
    return (
      '<tr data-row-idx="' + idx + '" data-orig="' + (origIdx == null ? '' : origIdx) + '"' +
      ' data-account-id="' + esc(row.accountId || '') + '"' + (prefill ? ' data-prefill="1"' : '') + '>' +
      '<td>' + (idx + 1) + '</td>' +
      '<td><input type="text" class="sheet-inp loc-inp" list="sheet-editor-accounts" value="' + esc(row.retailerName || '') + '" placeholder="Store / location">' +
      '<div class="sheet-acct-cell">' + linkLabel(row.accountId) + '</div></td>' +
      cellInput('ar-inp', row.accountReceivable) +
      cellInput('cons-inp', row.cons) +
      cellInput('cod-inp', row.cod) +
      cellInput('staff-inp', row.staff) +
      cellInput('check-inp', row.check) +
      cellInput('f-inp', row.f) +
      cellInput('po-inp', row.po) +
      cellInput('rep-inp', row.replaced) +
      cellInput('col-inp', row.collected) +
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
      var fields = {
        accountReceivable: val((tr.querySelector('.ar-inp') || {}).value),
        cons: val((tr.querySelector('.cons-inp') || {}).value),
        cod: val((tr.querySelector('.cod-inp') || {}).value),
        staff: val((tr.querySelector('.staff-inp') || {}).value),
        check: val((tr.querySelector('.check-inp') || {}).value),
        f: val((tr.querySelector('.f-inp') || {}).value),
        po: val((tr.querySelector('.po-inp') || {}).value),
        replaced: val((tr.querySelector('.rep-inp') || {}).value),
        collected: val((tr.querySelector('.col-inp') || {}).value)
      };
      var hasValue = Object.keys(fields).some(function (k) { return fields[k] != null; });
      // Store rows filled in from the account list are only kept if something was entered.
      if (tr.getAttribute('data-prefill') === '1' && !hasValue) return;
      var orig = originalEntries[Number(tr.getAttribute('data-orig'))] || {};
      var row = { retailerName: name.trim() };
      if (orig.notes) row.notes = orig.notes;
      if (orig.retailerSlug) row.retailerSlug = orig.retailerSlug;
      Object.keys(fields).forEach(function (k) { row[k] = fields[k]; });
      var accountId = tr.getAttribute('data-account-id') || '';
      if (accountId) row.accountId = accountId;
      rows.push(row);
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
        t.cons += Number(e.cons) || 0;
        t.cod += Number(e.cod) || 0;
        t.staff += Number(e.staff) || 0;
        t.check += Number(e.check) || 0;
        t.f += Number(e.f) || 0;
        t.po += Number(e.po) || 0;
        t.replaced += Number(e.replaced) || 0;
        t.collected += Number(e.collected) || 0;
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

    tbody.addEventListener('input', function (ev) {
      if (ev.target && ev.target.classList.contains('loc-inp')) relinkRow(ev.target.closest('tr'));
      updateEditorTotals();
    });
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

  // Typing a retailer account's name links the row to that account.
  function relinkRow(tr) {
    if (!tr) return;
    var name = (tr.querySelector('.loc-inp') || {}).value || '';
    var orig = originalEntries[Number(tr.getAttribute('data-orig'))];
    var match = accountByName(name);
    var id = match ? match.id : '';
    if (!id && orig && orig.accountId && cleanName(orig.retailerName) === cleanName(name)) id = orig.accountId;
    tr.setAttribute('data-account-id', id);
    var cell = tr.querySelector('.sheet-acct-cell');
    if (cell) cell.innerHTML = linkLabel(id);
  }

  function addEditorRow(row, origIdx, prefill) {
    var tbody = document.getElementById('sheet-editor-tbody');
    if (!tbody) return;
    var idx = tbody.querySelectorAll('tr[data-row-idx]').length;
    tbody.insertAdjacentHTML('beforeend', editorRowHtml(idx, row, origIdx, prefill));
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
      titleEl.textContent = editingReportId
        ? 'Edit Route Sheet — ' + (report && report.areaLabel || '') + ' · ' + (report && report.reportDate || '')
        : 'New Route Sheet';
    }

    if (tbody) {
      tbody.innerHTML = '';
      originalEntries = ((report && report.entries) || []).filter(function (e) { return e && e.retailerName; });
      if (!originalEntries.length) {
        addEditorRow({});
      } else {
        originalEntries.forEach(function (e, i) { addEditorRow(e, i); });
      }
    }
    fillAccountList();
    updateEditorTotals();
  }

  function salesNotice(message) {
    if (typeof window.KreezbySalesToast === 'function') window.KreezbySalesToast(message);
    else alert(message);
  }

  function ensureOverlay() {
    var overlay = document.getElementById('create-saleslist-modal-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'create-saleslist-modal-overlay';
    overlay.className = 'system-modal-backdrop';
    document.body.appendChild(overlay);
    return overlay;
  }

  function buildModalIfNeeded() {
    if (document.getElementById('sheet-editor-tbody')) return;

    var overlay = ensureOverlay();
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
      '<p class="sheet-editor-hint">Pick each store from the list so its row shows in that retailer\'s own Sales List. Other retailers never see it.</p>' +
      '<datalist id="sheet-editor-accounts"></datalist>' +
      '<div class="manual-sheet-scroll"><table class="manual-sheet-table sheet-editor-table">' +
      manualEditorHead() +
      '<tbody id="sheet-editor-tbody"></tbody>' +
      '<tfoot id="sheet-editor-tfoot"></tfoot>' +
      '</table></div>' +
      '<button type="button" class="btn-call-to-action" id="sheet-editor-add-row" style="margin:12px 0;background:#00897b;">+ Add location row</button> ' +
      '<button type="button" class="btn-call-to-action" id="sheet-editor-add-area" style="margin:12px 0;background:#6d4c41;">+ Add this area\'s retailer accounts</button>' +
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
    document.getElementById('sheet-editor-add-area').addEventListener('click', function () {
      loadAccounts().then(function () { addAreaAccounts(true); });
    });
    document.getElementById('sheet-editor-save').addEventListener('click', saveEditor);
    document.getElementById('sheet-editor-source').addEventListener('change', function () {
      var src = document.getElementById('sheet-editor-source').value;
      var a = api();
      if (a && !document.getElementById('sheet-editor-area-label').value) {
        document.getElementById('sheet-editor-area-label').value = a.areaLabel(src);
      }
      fillAccountList();
      // Swap the untouched store rows for the new area's retailer accounts.
      var tbody = document.getElementById('sheet-editor-tbody');
      if (tbody && !editingReportId) {
        tbody.querySelectorAll('tr[data-prefill="1"]').forEach(function (tr) {
          var filled = Array.prototype.some.call(tr.querySelectorAll('input:not(.loc-inp)'), function (i) { return i.value.trim(); });
          if (!filled) tr.remove();
        });
        loadAccounts().then(function () { addAreaAccounts(true); });
      }
    });
    injectEditorStyle();
    wireEditorEvents();
  }

  function injectEditorStyle() {
    if (document.getElementById('sheet-editor-acct-style')) return;
    var st = document.createElement('style');
    st.id = 'sheet-editor-acct-style';
    st.textContent = '.sheet-acct-cell{font-size:11px;margin-top:3px;color:#a1887f;white-space:nowrap}' +
      '.sheet-acct-link.is-linked{color:#2e7d32;font-weight:600}' +
      '.sheet-editor-table th:nth-child(2),.sheet-editor-table td:nth-child(2){min-width:210px;width:210px}' +
      '.sheet-editor-table th:nth-child(3),.sheet-editor-table td:nth-child(3){min-width:110px;width:110px}' +
      '.sheet-editor-table td .sheet-inp{width:100%;min-width:0;box-sizing:border-box}';
    document.head.appendChild(st);
  }

  // Adds a row for every retailer account in the chosen area that is not on the sheet yet.
  function addAreaAccounts(force) {
    var tbody = document.getElementById('sheet-editor-tbody');
    var src = (document.getElementById('sheet-editor-source') || {}).value || '';
    if (!tbody) return;
    var present = {};
    tbody.querySelectorAll('tr[data-row-idx]').forEach(function (tr) {
      var id = tr.getAttribute('data-account-id');
      if (id) present[id] = true;
      var name = ((tr.querySelector('.loc-inp') || {}).value || '').trim();
      if (!name && !force) return;
      if (!name) tr.remove();
    });
    accounts.filter(function (a) { return a.source === src && !present[a.id]; }).forEach(function (a) {
      addEditorRow({ retailerName: a.name, accountId: a.id }, null, true);
    });
    if (!tbody.querySelector('tr[data-row-idx]')) addEditorRow({});
    reindexEditorRows();
    updateEditorTotals();
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
      editingReport = report;
    } else {
      editingReport = null;
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
    var isNew = !reportId;
    loadAccounts().then(function () {
      fillAccountList();
      var tbody = document.getElementById('sheet-editor-tbody');
      if (tbody) tbody.querySelectorAll('tr[data-row-idx]').forEach(function (tr) {
        if (!tr.getAttribute('data-account-id')) relinkRow(tr);
        else {
          var cell = tr.querySelector('.sheet-acct-cell');
          if (cell) cell.innerHTML = linkLabel(tr.getAttribute('data-account-id'));
        }
      });
      // A new sheet starts with the area's retailer accounts, ready to fill in.
      if (isNew) addAreaAccounts(true);
    });
  }

  function closeEditor() {
    var overlay = document.getElementById('create-saleslist-modal-overlay');
    if (overlay) overlay.classList.remove('modal-triggered');
    editingReportId = null;
    editingReport = null;
  }

  var saving = false;
  function saveEditor() {
    if (saving) return;
    var a = api();
    if (!a) return;

    var source = (document.getElementById('sheet-editor-source') || {}).value;
    var reportDate = (document.getElementById('sheet-editor-date') || {}).value;
    var areaLabel = (document.getElementById('sheet-editor-area-label') || {}).value.trim();
    var entries = readRowsFromEditor();
    var totalExpense = num((document.getElementById('sheet-editor-expense') || {}).value) || 0;

    if (!source || !reportDate) {
      salesNotice('Select an area and a date.');
      return;
    }
    if (!entries.length) {
      salesNotice('Add at least one location with a name.');
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

    saving = true;
    var saveBtn = document.getElementById('sheet-editor-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }
    a.saveReport(report).then(function () {
      closeEditor();
      if (window.refreshRouteSheetView) window.refreshRouteSheetView();
      if (window.refreshRouteFilterOptions) window.refreshRouteFilterOptions(report);
      salesNotice('Route sheet saved to the database.');
    }).catch(function (err) {
      salesNotice((err && err.message) || 'Could not save the route sheet.');
    }).then(function () {
      saving = false;
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save route sheet'; }
    });
  }

  window.openRouteSheetEditor = openEditor;
  window.closeRouteSheetEditor = closeEditor;
  if (!window.__kreezbySalesEditorLeave) {
    window.__kreezbySalesEditorLeave = true;
    document.addEventListener('turbo:before-frame-render', function (event) {
      if (!event.target || event.target.id !== 'kreezby-main-content') return;
      var incoming = event.detail && event.detail.newFrame;
      if (incoming && incoming.querySelector && incoming.querySelector('#saleslist-master-directory-panel-view')) return;
      closeEditor();
    });
  }
  window.toggleCreateSaleModalOverlay = function (show) {
    if (show) openEditor(null);
    else closeEditor();
  };

  document.addEventListener('DOMContentLoaded', buildModalIfNeeded);
})();
