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
            '.kz-rt-wrap{overflow-x:auto;border:1px solid #e3d9d2;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(62,39,35,.12)}' +
            '.kz-rt{width:100%;border-collapse:collapse;font-size:14px;color:#3e2723}' +
            '.kz-rt thead th{background:#5d4037;color:#fff;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:13px 12px;text-align:center;border-bottom:4px solid #f2b52d;border-right:1px solid #d9cfc8;white-space:nowrap}' +
            '.kz-rt thead th:last-child{border-right:0}' +
            '.kz-rt tbody td{padding:11px 12px;border-bottom:1px solid #efe6df;vertical-align:middle;background:#fff}' +
            '.kz-rt .c{text-align:center;white-space:nowrap}' +
            '.kz-rt .kz-rt-empty{text-align:center;padding:16px;color:#4e342e}' +
            '.kz-rt-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}' +
            '.kz-rt-pill.done{background:#e8f5e9;color:#2e7d32}.kz-rt-pill.part{background:#fff3e0;color:#e65100}.kz-rt-pill.open{background:#ffebee;color:#c62828}.kz-rt-pill.only{background:#e3f2fd;color:#1565c0}' +
            '.kz-rt-view{padding:5px 14px;border:1px solid #5d4037;border-radius:6px;background:#fff;color:#5d4037;font-weight:700;font-size:12px;cursor:pointer}' +
            '.kz-rt-view:hover{background:#5d4037;color:#fff}' +
            '.kz-rt tr.kz-rt-detail td{background:#fbf6f2;color:#5d4037;font-size:13px;line-height:1.6}' +
            '.kz-rt-foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin-top:10px;font-size:13px;color:#6d4c41}' +
            '.kz-rt-foot button{padding:5px 12px;border:1px solid #d7ccc8;border-radius:6px;background:#fff;color:#5d4037;font-weight:700;cursor:pointer}' +
            '.kz-rt-foot button[disabled]{opacity:.45;cursor:default}' +
            '.kz-oe-empty{text-align:center;padding:22px;color:#8d6e63}';
        document.head.appendChild(s);
    }

    var AREA_NAMES = { batangas: 'Batangas', bauan: 'Bauan', citimart: 'Citimart', lipa: 'Lipa', lucena: 'Lucena', manila: 'Manila', rosario: 'Rosario', stotomas: 'Sto. Tomas', tagaytay: 'Tagaytay' };
    function areaName(v) {
        var k = String(v || '').toLowerCase().replace(/[^a-z]/g, '');
        if (AREA_NAMES[k]) return AREA_NAMES[k];
        var m = String(v || '').split(/\s+[-–]\s+|\s+\d/)[0].trim();
        var mk = m.toLowerCase().replace(/[^a-z]/g, '');
        return AREA_NAMES[mk] || m;
    }

    /* Rows with any P.O / R: { date, retailer, area, po, r, notes } */
    function retailerRows(sales, account) {
        return (sales || []).map(function (r) {
            return {
                date: String(r.reportDate || '').slice(0, 10),
                retailer: (account && account.name) || '',
                area: areaName(r.area || (account && account.area) || r.areaLabel),
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
                    area: areaName(sheet.source || sheet.areaLabel),
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
        return { month: val('[data-oe-month]'), from: val('[data-oe-from]'), to: val('[data-oe-to]'), q: val('[data-oe-search]').toLowerCase().trim(),
            retailer: val('[data-oe-retailer]'), area: val('[data-oe-area]'), state: val('[data-oe-state]') };
    }

    function filterRows(rows, f) {
        return rows.filter(function (row) {
            if (f.month && row.date.slice(0, 7) !== f.month) return false;
            if (f.from && row.date < f.from) return false;
            if (f.to && row.date > f.to) return false;
            if (f.retailer && row.retailer !== f.retailer) return false;
            if (f.area && row.area !== f.area) return false;
            if (f.state === 'open' && !(row.po > row.r)) return false;
            if (f.state === 'done' && !(row.po > 0 && row.r >= row.po)) return false;
            if (f.state === 'replaced' && !row.r) return false;
            if (!f.q) return true;
            return [row.retailer, row.nameOnSheet, row.area, row.date, dateLabel(row.date), row.notes].join(' ').toLowerCase().indexOf(f.q) >= 0;
        });
    }

    function emptyText(f, who) {
        var parts = [];
        if (f.month) parts.push('in ' + monthLabel(f.month));
        if (f.from || f.to) parts.push('between ' + (f.from || 'the start') + ' and ' + (f.to || 'today'));
        if (f.retailer) parts.push('for ' + f.retailer);
        if (f.area) parts.push('on route ' + f.area);
        if (f.state) parts.push('(' + { open: 'not yet replaced', done: 'fully replaced', replaced: 'with replacements' }[f.state] + ')');
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

    function statusOf(row) {
        if (row.po > 0 && row.r >= row.po) return { cls: 'done', label: 'Fully replaced' };
        if (row.po > 0 && row.r > 0) return { cls: 'part', label: 'Partly replaced' };
        if (row.po > 0) return { cls: 'open', label: 'Not yet replaced' };
        return { cls: 'only', label: 'Replacement only' };
    }

    function itemsText(row) {
        var out = [];
        if (row.po) out.push('P.O ' + pcs(row.po) + ' pcs');
        if (row.r) out.push('R ' + pcs(row.r) + ' pcs');
        return out.join(' · ') || '—';
    }

    function renderRecords(host, state, mode, keepPage) {
        var f = readFilters(host);
        var rows = filterRows(state.rows, f).sort(function (a, b) {
            return b.date.localeCompare(a.date) || String(a.retailer).localeCompare(String(b.retailer));
        });
        var body = host.querySelector('[data-oe-body]');
        var sizeEl = host.querySelector('[data-oe-size]');
        var size = parseInt(sizeEl && sizeEl.value, 10) || 10;
        var pages = Math.max(1, Math.ceil(rows.length / size));
        if (!keepPage) state.page = 1;
        state.page = Math.min(Math.max(state.page || 1, 1), pages);
        var start = (state.page - 1) * size;
        var slice = rows.slice(start, start + size);
        var who = mode === 'admin' ? '' : 'your store';
        var head = '<thead><tr><th>#</th><th>Date</th><th>Route</th><th>Retailer</th><th>Items</th><th>Status</th><th>Action</th></tr></thead>';
        var tbody;
        if (!slice.length) {
            tbody = '<tr><td class="kz-rt-empty" colspan="7">' + esc(emptyText(f, who)) + '</td></tr>';
        } else {
            tbody = slice.map(function (row, i) {
                var n = start + i + 1;
                var st = statusOf(row);
                var shop = esc(row.retailer || (mode === 'admin' ? '—' : 'Your store'));
                var open = state.open[n] ? ' data-open="1"' : '';
                var main = '<tr data-oe-row="' + n + '"' + open + '><td class="c">' + n + '</td><td class="c">' + dateLabel(row.date) + '</td><td>' + esc(row.area || '—') +
                    '</td><td><strong>' + shop + '</strong></td><td>' + esc(itemsText(row)) +
                    '</td><td class="c"><span class="kz-rt-pill ' + st.cls + '">' + st.label + '</span></td>' +
                    '<td class="c"><button type="button" class="kz-rt-view" data-oe-view="' + n + '">' + (state.open[n] ? 'Hide' : 'View') + '</button></td></tr>';
                if (!state.open[n]) return main;
                var asWritten = row.nameOnSheet && row.nameOnSheet !== row.retailer ? '<br>Written on the sheet as: ' + esc(row.nameOnSheet) : '';
                return main + '<tr class="kz-rt-detail"><td colspan="7"><strong>' + shop + '</strong> · ' + esc(row.area || '—') + ' · ' + dateLabel(row.date) +
                    '<br>Pulled out (P.O): ' + pcs(row.po) + ' pcs · Replaced (R): ' + pcs(row.r) + ' pcs · Not yet replaced: ' + pcs(Math.max(row.po - row.r, 0)) + ' pcs' +
                    '<br>Notes: ' + esc(row.notes || '—') + asWritten + '</td></tr>';
            }).join('');
        }
        var shown = rows.length ? (start + 1) + '–' + (start + slice.length) : '0';
        body.innerHTML = statsHtml(rows, rows.length ? '<div class="kz-oe-stat">' + (mode === 'admin' ? 'Records' : 'Delivery dates') + '<strong>' + rows.length + '</strong></div>' : '') +
            '<div class="kz-rt-wrap"><table class="kz-rt">' + head + '<tbody>' + tbody + '</tbody></table></div>' +
            '<div class="kz-rt-foot"><span>Showing ' + shown + ' of ' + rows.length + '</span><span>' +
            '<button type="button" data-oe-page="prev"' + (state.page <= 1 ? ' disabled' : '') + '>Prev</button> Page ' + state.page + ' of ' + pages + ' ' +
            '<button type="button" data-oe-page="next"' + (state.page >= pages ? ' disabled' : '') + '>Next</button></span></div>';
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
                (mode === 'admin' ? '<label>Retailer<select data-oe-retailer><option value="">All retailers</option></select></label>' : '') +
                '<label>Route / area<select data-oe-area><option value="">All routes</option></select></label>' +
                '<label>Entries<select data-oe-size><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>' +
                '<label>Show<select data-oe-state><option value="">Everything</option><option value="open">Not yet replaced</option><option value="done">Fully replaced</option><option value="replaced">With replacements</option></select></label>' +
                '<label class="kz-oe-grow">Search<input type="search" data-oe-search placeholder="' + (mode === 'admin' ? 'Retailer, route, date, notes…' : 'Date, area, notes…') + '"></label>' +
                '<button type="button" data-oe-clear style="padding:8px 14px;border:1px solid #d7ccc8;border-radius:8px;background:#fff;color:#5d4037;font-weight:700;cursor:pointer">Clear filters</button>' +
            '</div>' +
            '<div data-oe-body><p class="kz-oe-empty">Loading pull-outs and replacements…</p></div>';
        var state = { rows: [], page: 1, open: {} };
        var monthSel = host.querySelector('[data-oe-month]');
        var render = function (keepPage) { state.open = {}; renderRecords(host, state, mode, keepPage === true); };
        host.addEventListener('click', function (e) {
            var t = e.target.closest ? e.target.closest('[data-oe-view],[data-oe-page]') : null;
            if (!t) return;
            if (t.hasAttribute('data-oe-view')) {
                var n = t.getAttribute('data-oe-view');
                state.open[n] = !state.open[n];
                renderRecords(host, state, mode, true);
            } else {
                state.page += t.getAttribute('data-oe-page') === 'next' ? 1 : -1;
                state.open = {};
                renderRecords(host, state, mode, true);
            }
        });
        monthSel.addEventListener('change', function () { render(); });
        var searchTimer = null;
        host.querySelector('[data-oe-search]').addEventListener('input', function () {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () { render(); }, 120);
        });
        host.querySelector('[data-oe-from]').addEventListener('change', function () { render(); });
        host.querySelector('[data-oe-to]').addEventListener('change', function () { render(); });
        ['[data-oe-retailer]', '[data-oe-area]', '[data-oe-state]', '[data-oe-size]'].forEach(function (sel) {
            var el = host.querySelector(sel);
            if (el) el.addEventListener('change', function () { render(); });
        });
        host.querySelector('[data-oe-clear]').addEventListener('click', function () {
            host.querySelectorAll('.kz-oe-tools select, .kz-oe-tools input').forEach(function (el) { el.value = el.hasAttribute('data-oe-size') ? '10' : ''; });
            render();
        });

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
            function fill(sel, key, all) {
                var el = host.querySelector(sel);
                if (!el) return;
                var seen = {};
                state.rows.forEach(function (row) { if (row[key]) seen[row[key]] = true; });
                el.innerHTML = '<option value="">' + all + '</option>' + Object.keys(seen).sort().map(function (v) {
                    return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
                }).join('');
            }
            fill('[data-oe-retailer]', 'retailer', 'All retailers');
            fill('[data-oe-area]', 'area', 'All routes');
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
