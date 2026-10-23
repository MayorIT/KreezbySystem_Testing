/**
 * Route-sheet records organised by retailer account.
 *  - Retailer Sales List: shows only the signed-in retailer's own rows (the server checks the
 *    sign-in token and never sends another retailer's rows).
 *  - Admin / staff Sales List: pick a retailer account to see all of its rows.
 * Data: GET /api/retailer-records (see scripts/retailer-records.js on the server).
 */
(function () {
  'use strict';

  if (window.__KreezbyRetailerRecords) return;
  window.__KreezbyRetailerRecords = true;

  var COLUMNS = [
    ['accountReceivable', 'Account Receivable'], ['cons', 'Cons'], ['cod', 'COD'], ['staff', 'Staff'],
    ['check', 'Check'], ['f', 'F'], ['po', 'P.O'], ['replaced', 'R']
  ];
  // A retailer sees only its own delivery: no route/area of the van and no staff column.
  var RETAILER_COLUMNS = [
    ['cons', 'Cons'], ['cod', 'COD'], ['check', 'Check'], ['f', 'F'], ['po', 'P.O'], ['replaced', 'R']
  ];

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(n) {
    var v = Number(n) || 0;
    return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function cell(v) {
    if (v === 0) return '0';
    return v == null || v === '' ? '—' : esc(v);
  }

  function dateLabel(iso) {
    var d = new Date(String(iso || '') + 'T12:00:00');
    if (isNaN(d.getTime())) return esc(iso || '—');
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function session() {
    try { return JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}; } catch (e) { return {}; }
  }

  function request(query) {
    var token = session().token || '';
    if (!token) return Promise.resolve({ ok: false, needLogin: true });
    return fetch('/api/retailer-records' + (query || ''), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'X-Kreezby-Token': token }
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        body = body || {};
        if (res.status === 401) body.needLogin = true;
        if (!res.ok) body.ok = false;
        return body;
      });
    }).catch(function () { return { ok: false, error: 'Could not reach the server.' }; });
  }

  function injectStyle() {
    if (document.getElementById('kz-rr-style')) return;
    var s = document.createElement('style');
    s.id = 'kz-rr-style';
    s.textContent =
      '.kz-rr-wrap { overflow-x: auto; }' +
      '.kz-rr-table { width: 100%; border-collapse: collapse; font-size: 13px; }' +
      '.kz-rr-table th, .kz-rr-table td { padding: 8px 10px; border-bottom: 1px solid #efe6df; text-align: left; vertical-align: top; }' +
      '.kz-rr-table th { background: #fbf6f2; color: #5d4037; font-weight: 600; white-space: nowrap; }' +
      '.kz-rr-table td.num, .kz-rr-table th.num { text-align: right; white-space: nowrap; }' +
      '.kz-rr-table tr.kz-rr-month td { background: #f6eee8; font-weight: 700; color: #5d4037; }' +
      '.kz-rr-note { display: block; color: #8d6e63; font-size: 12px; margin-top: 2px; }' +
      '.kz-rr-stats { display: flex; gap: 12px; flex-wrap: wrap; margin: 0 0 12px; }' +
      '.kz-rr-stat { background: #fbf6f2; border-radius: 10px; padding: 8px 14px; font-size: 13px; color: #5d4037; }' +
      '.kz-rr-stat strong { display: block; font-size: 16px; color: #3e2723; }' +
      '.kz-rr-empty { text-align: center; padding: 24px; color: #8d6e63; }' +
      '.kz-rr-picker { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }' +
      '.kz-rr-picker select { min-width: 260px; padding: 6px 8px; }';
    document.head.appendChild(s);
  }

  function renderRows(host, data, opts) {
    var rows = ((data && data.sales) || []).slice().sort(function (a, b) {
      return String(b.reportDate || '').localeCompare(String(a.reportDate || ''));
    });
    if (!rows.length) {
      host.innerHTML = '<p class="kz-rr-empty">' + esc(opts.empty) + '</p>';
      return;
    }
    var total = rows.reduce(function (sum, r) { return sum + (Number(r.collected) || 0); }, 0);
    var html = '<div class="kz-rr-stats">' +
      '<div class="kz-rr-stat">' + (opts.retailer ? 'Deliveries' : 'Visits') + '<strong>' + rows.length + '</strong></div>' +
      '<div class="kz-rr-stat">' + (opts.retailer ? 'Last delivery' : 'Last visit') + '<strong>' + dateLabel(rows[0].reportDate) + '</strong></div>' +
      '<div class="kz-rr-stat">Total collected<strong>' + money(total) + '</strong></div>' +
      '</div>';
    var cols = opts.retailer ? RETAILER_COLUMNS : COLUMNS;
    if (opts.retailer) cols = cols.filter(function (c) { return rows.some(function (r) { return r[c[0]] != null && r[c[0]] !== ''; }); });
    html += '<div class="kz-rr-wrap"><table class="kz-rr-table"><thead><tr><th>Delivery date</th>' + (opts.retailer ? '' : '<th>Route</th>');
    cols.forEach(function (c) { html += '<th>' + c[1] + '</th>'; });
    html += '<th class="num">Collected</th></tr></thead><tbody>';
    var month = '';
    rows.forEach(function (r) {
      var m = String(r.reportDate || '').slice(0, 7);
      if (m !== month) {
        month = m;
        var d = new Date(m + '-01T12:00:00');
        var label = isNaN(d.getTime()) ? m : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long' });
        html += '<tr class="kz-rr-month"><td colspan="' + (cols.length + (opts.retailer ? 2 : 3)) + '">' + esc(label) + '</td></tr>';
      }
      html += '<tr><td>' + dateLabel(r.reportDate) + '</td>' + (opts.retailer ? '' :
        '<td>' + esc(r.areaLabel || r.source || '') + (opts.showName ? '<span class="kz-rr-note">as written: ' + esc(r.retailerName) + '</span>' : '') + '</td>');
      cols.forEach(function (c) { html += '<td>' + cell(r[c[0]]) + '</td>'; });
      html += '<td class="num">' + (r.collected ? money(r.collected) : '—') +
        (r.notes ? '<span class="kz-rr-note">' + esc(r.notes) + '</span>' : '') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    host.innerHTML = html;
  }

  function card(title, subtitle) {
    var el = document.createElement('div');
    el.className = 'panel-data-card kz-rr-card';
    el.innerHTML =
      '<div class="panel-card-title-bar"><h3>' + esc(title) + '</h3></div>' +
      '<div class="card-body-padded">' +
      (subtitle ? '<p class="sales-count-line kz-rr-sub">' + esc(subtitle) + '</p>' : '') +
      '<div class="kz-rr-body"><p class="kz-rr-empty">Loading…</p></div></div>';
    return el;
  }

  function messageFor(data, fallback) {
    if (data && data.needLogin) return 'Please log out and log in again to load these records.';
    return (data && data.error) || fallback;
  }

  // Retailer: only this retailer's rows.
  function initRetailerView() {
    var stack = document.querySelector('#saleslist-retailer-page .sales-ledger-stack');
    if (!stack || stack.querySelector('.kz-rr-card')) return;
    injectStyle();
    var el = card('Kreezby deliveries', 'Each date Kreezby delivered to your store, and what was collected.');
    stack.insertBefore(el, stack.firstChild);
    var body = el.querySelector('.kz-rr-body');
    var sub = el.querySelector('.kz-rr-sub');
    request('').then(function (data) {
      if (!data.ok) {
        body.innerHTML = '<p class="kz-rr-empty">' + esc(messageFor(data, 'Could not load your records.')) + '</p>';
        return;
      }
      if (sub && data.account) sub.textContent = data.account.name + ' · each date Kreezby delivered to your store, and what was collected.';
      renderRows(body, data, { empty: 'No deliveries recorded for your store yet.', showName: false, retailer: true });
    });
  }

  // Admin / staff: choose a retailer account.
  function initAdminView() {
    var wrap = document.getElementById('bauan-route-sheets-wrap');
    var section = wrap ? wrap.closest('.panel-data-card') : null;
    if (!section || document.querySelector('.kz-rr-card')) return;
    injectStyle();
    var el = card('Records by retailer account', 'Each retailer account sees only its own rows in its Sales List.');
    section.parentNode.insertBefore(el, section.nextSibling);
    var body = el.querySelector('.kz-rr-body');
    var picker = document.createElement('div');
    picker.className = 'kz-rr-picker';
    picker.innerHTML = '<label for="kz-rr-account">Retailer account</label><select id="kz-rr-account"><option value="">Loading accounts…</option></select>';
    body.parentNode.insertBefore(picker, body);
    var select = picker.querySelector('select');
    body.innerHTML = '<p class="kz-rr-empty">Choose a retailer account to see its records.</p>';

    request('').then(function (data) {
      if (!data.ok || !data.accounts) {
        select.innerHTML = '<option value="">—</option>';
        body.innerHTML = '<p class="kz-rr-empty">' + esc(messageFor(data, 'Could not load the retailer accounts.')) + '</p>';
        return;
      }
      select.innerHTML = '<option value="">Choose a retailer account…</option>' + data.accounts.map(function (a) {
        return '<option value="' + esc(a.id) + '">' + esc(a.name) + (a.area ? ' — ' + esc(a.area) : '') + ' (' + a.rows + ')</option>';
      }).join('');
    });

    select.addEventListener('change', function () {
      if (!select.value) {
        body.innerHTML = '<p class="kz-rr-empty">Choose a retailer account to see its records.</p>';
        return;
      }
      body.innerHTML = '<p class="kz-rr-empty">Loading…</p>';
      var chosen = select.value;
      request('?account=' + encodeURIComponent(chosen)).then(function (data) {
        if (select.value !== chosen) return;
        if (!data.ok) {
          body.innerHTML = '<p class="kz-rr-empty">' + esc(messageFor(data, 'Could not load this account.')) + '</p>';
          return;
        }
        renderRows(body, data, { empty: 'No route-sheet rows are linked to this account yet.', showName: true });
      });
    });
  }

  function init() {
    if (document.getElementById('saleslist-retailer-page')) initRetailerView();
    // Head admin, admin and staff use the full route sheets below; this card is for retailers only.
    var old = document.querySelector('#bauan-route-sheets-wrap ~ .kz-rr-card, .kz-rr-card');
    if (old && !document.getElementById('saleslist-retailer-page')) old.remove();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('turbo:load', init);
  document.addEventListener('turbo:frame-load', init);
})();
