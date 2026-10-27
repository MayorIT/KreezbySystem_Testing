/**
 * Order Error — summary of Pull Out (P.O) and Replace (R) from the route sheets.
 *  - Retailer:  [data-order-error="retailer"]  its own deliveries (GET /api/retailer-records)
 *  - Head admin / admin / staff: [data-order-error="admin"]  every retailer (GET /api/sales-list)
 * Only delivery rows that have a P.O or R quantity are counted.
 */
(function () {
    'use strict';

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function num(v) {
        var n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function pcs(n) { return Math.round(n).toLocaleString('en-PH'); }

    function dateLabel(iso) {
        var d = new Date(String(iso || '') + 'T12:00:00');
        return isNaN(d.getTime()) ? esc(iso || '—') : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function monthLabel(ym) {
        var d = new Date(ym + '-01T12:00:00');
        return isNaN(d.getTime()) ? ym : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    function token() {
        try { return (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { return ''; }
    }

    function getJson(url) {
        var t = token();
        if (!t) return Promise.resolve({ ok: false, error: 'Please log out and log in again to load these records.' });
        return fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Kreezby-Token': t } })
            .then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (body) {
                    body = body || {};
                    if (!res.ok) {
                        body.ok = false;
                        if (res.status === 401) body.error = 'Please log out and log in again to load these records.';
                    }
                    return body;
                });
            })
            .catch(function () { return { ok: false, error: 'Could not reach the server.' }; });
    }

    function injectStyle() {
        if (document.getElementById('kz-oe-style')) return;
        var s = document.createElement('style');
        s.id = 'kz-oe-style';
        s.textContent =
            '.kz-oe-stats{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 14px}' +
            '.kz-oe-stat{flex:1 1 160px;background:#fbf6f2;border:1px solid #efe6df;border-radius:12px;padding:10px 14px;color:#5d4037;font-size:13px}' +
            '.kz-oe-stat strong{display:block;font-size:20px;color:#3e2723;margin-top:2px}' +
            '.kz-oe-tools{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:0 0 16px;padding:12px 14px;background:#fff;border:1px solid #efe6df;border-radius:12px}' +
            '.kz-oe-tools .kz-oe-grow{flex:1 1 220px}.kz-oe-tools .kz-oe-grow input{width:100%;box-sizing:border-box}' +
            '.kz-oe-tools label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#5d4037;text-transform:uppercase;letter-spacing:.03em}' +
            '.kz-oe-tools select,.kz-oe-tools input{min-width:150px;padding:7px 10px;border:1px solid #d7ccc8;border-radius:8px;font:inherit;font-size:14px;text-transform:none;letter-spacing:0}' +
            '.kz-oe-h{margin:18px 0 8px;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#3e2723}' +
            '.kz-oe-wrap{overflow-x:auto;max-width:100%;-webkit-overflow-scrolling:touch}' +
            'main.workspace-canvas,main.workspace-view-canvas{overflow-y:auto!important;min-height:0}' +
            '.kz-oe-table{width:100%;border-collapse:collapse;font-size:14px}' +
            '.kz-oe-table th,.kz-oe-table td{padding:9px 12px;border-bottom:1px solid #efe6df;text-align:left;vertical-align:top}' +
            '.kz-oe-table th{background:#fbf6f2;color:#5d4037;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}' +
            '.kz-oe-table .n{text-align:right;white-space:nowrap}' +
            '.kz-oe-table tfoot td{font-weight:800;background:#faf6f3}' +
            '.kz-oe-note{display:block;color:#8d6e63;font-size:12px;margin-top:2px}' +
            '.kz-oe-empty{text-align:center;padding:22px;color:#8d6e63}';
        document.head.appendChild(s);
    }

    /* Rows with any P.O / R: { date, retailer, area, po, r, notes } */
    function retailerRows(sales, account) {
        return (sales || []).map(function (r) {
            return {
                date: String(r.reportDate || '').slice(0, 10),
                retailer: (account && account.name) || '',
                area: r.area || r.areaLabel || (account && account.area) || '',
                po: num(r.po),
                r: num(r.replaced),
                notes: r.notes || ''
            };
        }).filter(function (row) { return row.date && (row.po || row.r); });
    }

    function adminRows(data) {
        var rows = [];
        ((data && data.dailyReports) || []).forEach(function (sheet) {
            if (sheet.isTestData) return;
            (sheet.entries || []).forEach(function (e) {
                var po = num(e.po);
                var r = num(e.replaced);
                if (!po && !r) return;
                rows.push({
                    date: String(sheet.reportDate || '').slice(0, 10),
                    retailer: e.accountName || e.retailerName || '—',
                    nameOnSheet: e.retailerName || '',
                    area: sheet.areaLabel || sheet.source || '',
                    po: po,
                    r: r,
                    notes: e.notes || ''
                });
            });
        });
        return rows.filter(function (row) { return row.date; });
    }

    /* Month, From/To dates and free-text search, shared by both views. */
    function readFilters(host) {
        function val(sel) { var el = host.querySelector(sel); return el ? String(el.value || '') : ''; }
        return { month: val('[data-oe-month]'), from: val('[data-oe-from]'), to: val('[data-oe-to]'), q: val('[data-oe-search]').toLowerCase().trim() };
    }

    function filterRows(rows, f) {
        return rows.filter(function (row) {
            if (f.month && row.date.slice(0, 7) !== f.month) return false;
            if (f.from && row.date < f.from) return false;
            if (f.to && row.date > f.to) return false;
            if (!f.q) return true;
            return [row.retailer, row.nameOnSheet, row.area, row.date, dateLabel(row.date), row.notes].join(' ').toLowerCase().indexOf(f.q) >= 0;
        });
    }

    function emptyText(f, who) {
        var parts = [];
        if (f.month) parts.push('in ' + monthLabel(f.month));
        if (f.from || f.to) parts.push('between ' + (f.from || 'the start') + ' and ' + (f.to || 'today'));
        if (f.q) parts.push('matching "' + f.q + '"');
        return 'No pull-outs or replacements recorded' + (who ? ' for ' + who : '') + (parts.length ? ' ' + parts.join(' ') : '') + '.';
    }

    function months(rows) {
        var list = [];
        rows.forEach(function (row) {
            var m = row.date.slice(0, 7);
            if (list.indexOf(m) < 0) list.push(m);
        });
        return list.sort().reverse();
    }

    function totals(rows) {
        return rows.reduce(function (t, row) {
            t.po += row.po;
            t.r += row.r;
            return t;
        }, { po: 0, r: 0 });
    }

    function statsHtml(rows, extra) {
        var t = totals(rows);
        return '<div class="kz-oe-stats">' +
            '<div class="kz-oe-stat">Pulled Out (P.O)<strong>' + pcs(t.po) + ' pcs</strong></div>' +
            '<div class="kz-oe-stat">Replaced (R)<strong>' + pcs(t.r) + ' pcs</strong></div>' +
            '<div class="kz-oe-stat">Not yet replaced<strong>' + pcs(Math.max(t.po - t.r, 0)) + ' pcs</strong></div>' +
            (extra || '') + '</div>';
    }

    function renderRetailer(host, state) {
        var f = readFilters(host);
        var rows = filterRows(state.rows, f).sort(function (a, b) { return b.date.localeCompare(a.date); });
        var body = host.querySelector('[data-oe-body]');
        if (!rows.length) {
            body.innerHTML = '<p class="kz-oe-empty">' + esc(emptyText(f, 'your store')) + '</p>';
            return;
        }
        var t = totals(rows);
        body.innerHTML = statsHtml(rows, '<div class="kz-oe-stat">Delivery dates<strong>' + rows.length + '</strong></div>') +
            '<div class="kz-oe-wrap"><table class="kz-oe-table"><thead><tr><th>Delivery Date</th><th>Area</th><th class="n">Pulled Out (P.O)</th><th class="n">Replaced (R)</th><th>Notes</th></tr></thead><tbody>' +
            rows.map(function (row) {
                return '<tr><td>' + dateLabel(row.date) + '</td><td>' + esc(row.area || '—') + '</td><td class="n">' + pcs(row.po) + '</td><td class="n">' + pcs(row.r) + '</td><td>' + esc(row.notes || '—') + '</td></tr>';
            }).join('') +
            '</tbody><tfoot><tr><td colspan="2">Total</td><td class="n">' + pcs(t.po) + '</td><td class="n">' + pcs(t.r) + '</td><td></td></tr></tfoot></table></div>';
    }

    function renderAdmin(host, state) {
        var f = readFilters(host);
        var rows = filterRows(state.rows, f);
        var body = host.querySelector('[data-oe-body]');
        if (!rows.length) {
            body.innerHTML = '<p class="kz-oe-empty">' + esc(emptyText(f, '')) + '</p>';
            return;
        }
        var byRetailer = {};
        rows.forEach(function (row) {
            var key = row.retailer + '|' + row.area;
            var g = byRetailer[key] || (byRetailer[key] = { retailer: row.retailer, area: row.area, po: 0, r: 0, dates: {}, last: '' });
            g.po += row.po;
            g.r += row.r;
            g.dates[row.date] = true;
            if (row.date > g.last) g.last = row.date;
        });
        var groups = Object.keys(byRetailer).map(function (k) { return byRetailer[k]; })
            .sort(function (a, b) { return (b.po + b.r) - (a.po + a.r) || a.retailer.localeCompare(b.retailer); });
        var t = totals(rows);
        var detail = rows.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || a.retailer.localeCompare(b.retailer); });
        body.innerHTML = statsHtml(rows, '<div class="kz-oe-stat">Retailers<strong>' + groups.length + '</strong></div>') +
            '<h4 class="kz-oe-h">By retailer</h4>' +
            '<div class="kz-oe-wrap"><table class="kz-oe-table"><thead><tr><th>#</th><th>Retailer</th><th>Route</th><th class="n">Pulled Out (P.O)</th><th class="n">Replaced (R)</th><th class="n">Not yet replaced</th><th class="n">Dates</th><th>Last</th></tr></thead><tbody>' +
            groups.map(function (g, i) {
                return '<tr><td>' + (i + 1) + '</td><td>' + esc(g.retailer) + '</td><td>' + esc(g.area || '—') + '</td><td class="n">' + pcs(g.po) +
                    '</td><td class="n">' + pcs(g.r) + '</td><td class="n">' + pcs(Math.max(g.po - g.r, 0)) + '</td><td class="n">' + Object.keys(g.dates).length +
                    '</td><td>' + dateLabel(g.last) + '</td></tr>';
            }).join('') +
            '</tbody><tfoot><tr><td></td><td colspan="2">Total</td><td class="n">' + pcs(t.po) + '</td><td class="n">' + pcs(t.r) + '</td><td class="n">' + pcs(Math.max(t.po - t.r, 0)) + '</td><td colspan="2"></td></tr></tfoot></table></div>' +
            '<h4 class="kz-oe-h">By delivery date</h4>' +
            '<div class="kz-oe-wrap"><table class="kz-oe-table"><thead><tr><th>Delivery Date</th><th>Retailer</th><th>Route</th><th class="n">P.O</th><th class="n">R</th><th>Notes</th></tr></thead><tbody>' +
            detail.map(function (row) {
                var asWritten = row.nameOnSheet && row.nameOnSheet !== row.retailer ? '<span class="kz-oe-note">as written: ' + esc(row.nameOnSheet) + '</span>' : '';
                return '<tr><td>' + dateLabel(row.date) + '</td><td>' + esc(row.retailer) + asWritten + '</td><td>' + esc(row.area || '—') + '</td><td class="n">' + pcs(row.po) +
                    '</td><td class="n">' + pcs(row.r) + '</td><td>' + esc(row.notes || '—') + '</td></tr>';
            }).join('') + '</tbody></table></div>';
    }

    function mount(host) {
        if (!host || host.dataset.oeBound === '1') return;
        host.dataset.oeBound = '1';
        injectStyle();
        var mode = host.getAttribute('data-order-error');
        host.innerHTML =
            '<div class="kz-oe-tools">' +
                '<label>Month<select data-oe-month><option value="">All months</option></select></label>' +
                '<label>From<input type="date" data-oe-from></label>' +
                '<label>To<input type="date" data-oe-to></label>' +
                '<label class="kz-oe-grow">Search<input type="search" data-oe-search placeholder="' + (mode === 'admin' ? 'Retailer, route, date, notes…' : 'Date, area, notes…') + '"></label>' +
            '</div>' +
            '<div data-oe-body><p class="kz-oe-empty">Loading pull-outs and replacements…</p></div>';
        var state = { rows: [] };
        var monthSel = host.querySelector('[data-oe-month]');
        var render = function () { (mode === 'admin' ? renderAdmin : renderRetailer)(host, state); };
        monthSel.addEventListener('change', render);
        var searchTimer = null;
        host.querySelector('[data-oe-search]').addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(render, 120);
        });
        host.querySelector('[data-oe-from]').addEventListener('change', render);
        host.querySelector('[data-oe-to]').addEventListener('change', render);

        var req = mode === 'admin' ? getJson('/api/sales-list') : getJson('/api/retailer-records');
        req.then(function (data) {
            if (data.ok === false || (mode === 'admin' && !data.dailyReports)) {
                host.querySelector('[data-oe-body]').innerHTML = '<p class="kz-oe-empty">' + esc(data.error || 'Could not load the route sheets.') + '</p>';
                return;
            }
            state.rows = mode === 'admin' ? adminRows(data) : retailerRows(data.sales, data.account);
            var list = months(state.rows);
            monthSel.innerHTML = '<option value="">All months</option>' + list.map(function (m) {
                return '<option value="' + esc(m) + '">' + esc(monthLabel(m)) + '</option>';
            }).join('');
            render();
        });
    }

    function boot() {
        document.querySelectorAll('[data-order-error]').forEach(mount);
    }

    window.__KreezbyOrderErrorBooted = true;
    window.KreezbyOrderErrors = { boot: boot, retailerRows: retailerRows, num: num };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
    document.addEventListener('turbo:frame-load', boot);
})();
