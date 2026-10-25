/**
 * Sales Analysis → Retailer Insights (head admin, admin, staff).
 * Reads every route sheet (GET /api/sales-list) and shows, per area and per shop:
 *   ordered (Cons + COD), pulled out (P.O), expired, collected, how often it is delivered,
 * then marks each shop as Fast / Steady / Slow and explains why stock was pulled out or expired.
 * Reasons come from the numbers on the sheets plus any note written on the delivery.
 */
(function () {
    'use strict';

    var CYCLE_DAYS = 14;          // normal delivery cycle (2 weeks)
    var FAST_SELL = 0.9;          // ≥ 90% of what was delivered got sold
    var SLOW_SELL = 0.7;          // < 70% sold → slow
    var state = { rows: [], loaded: false, error: '' };

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function num(v) {
        var n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function pcs(n) { return Math.round(n).toLocaleString('en-PH') + ' pcs'; }
    function pct(r) { return Math.round(r * 100) + '%'; }
    function peso(n) { return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    function iso(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function daysBetween(a, b) {
        return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
    }

    function dateLabel(day) {
        var d = new Date(day + 'T12:00:00');
        return isNaN(d.getTime()) ? day : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function token() {
        try { return (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { return ''; }
    }

    function load() {
        var t = token();
        if (!t) {
            state.loaded = true;
            state.error = 'Please log out and log in again to load the route sheets.';
            return Promise.resolve();
        }
        return fetch('/api/sales-list', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Kreezby-Token': t } })
            .then(function (res) { return res.json().catch(function () { return {}; }); })
            .then(function (data) {
                state.loaded = true;
                if (!data || !data.dailyReports) {
                    state.error = (data && data.error) || 'Could not load the route sheets.';
                    return;
                }
                state.error = '';
                var rows = [];
                data.dailyReports.forEach(function (sheet) {
                    if (sheet.isTestData) return;
                    var day = String(sheet.reportDate || '').slice(0, 10);
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
                    (sheet.entries || []).forEach(function (e) {
                        var name = String(e.accountName || e.retailerName || '').trim();
                        if (!name) return;
                        rows.push({
                            date: day,
                            area: sheet.areaLabel || sheet.source || '—',
                            shop: name,
                            ordered: num(e.cons) + num(e.cod),
                            po: num(e.po),
                            expired: num(e.expired),
                            collected: num(e.collected),
                            notes: String(e.notes || '').trim()
                        });
                    });
                });
                state.rows = rows;
            })
            .catch(function () {
                state.loaded = true;
                state.error = 'Could not reach the server.';
            });
    }

    /* ---------- analysis ---------- */

    function group(rows, keyFn) {
        var map = {};
        rows.forEach(function (r) {
            var key = keyFn(r);
            var g = map[key] || (map[key] = { key: key, shop: r.shop, area: r.area, ordered: 0, po: 0, expired: 0, collected: 0, dates: {}, notes: [] });
            g.ordered += r.ordered;
            g.po += r.po;
            g.expired += r.expired;
            g.collected += r.collected;
            if (r.ordered || r.po || r.expired || r.collected) g.dates[r.date] = true;
            if (r.notes && (r.po || r.expired)) g.notes.push(r.notes.replace(/(^|;\s*)Expired: \d+(\.\d+)? pcs/, '').replace(/^;\s*/, '').trim());
        });
        return Object.keys(map).map(function (k) { return finish(map[k]); });
    }

    function finish(g) {
        var dates = Object.keys(g.dates).sort();
        g.visits = dates.length;
        g.last = dates[dates.length - 1] || '';
        var gaps = [];
        for (var i = 1; i < dates.length; i++) gaps.push(daysBetween(dates[i - 1], dates[i]));
        g.interval = gaps.length ? Math.round(gaps.reduce(function (s, x) { return s + x; }, 0) / gaps.length) : 0;
        g.returned = g.po + g.expired;
        g.sold = Math.max(g.ordered - g.returned, 0);
        g.sellRate = g.ordered ? g.sold / g.ordered : 0;
        g.soldPerVisit = g.visits ? g.sold / g.visits : 0;
        g.orderPerVisit = g.visits ? g.ordered / g.visits : 0;
        g.notes = g.notes.filter(Boolean).filter(function (n, i, all) { return all.indexOf(n) === i; });
        g.status = classify(g);
        g.reasons = reasons(g);
        return g;
    }

    function classify(g) {
        if (!g.ordered) return g.returned ? 'slow' : 'none';
        if (g.sellRate >= FAST_SELL && (!g.interval || g.interval <= CYCLE_DAYS)) return 'fast';
        if (g.sellRate < SLOW_SELL || g.expired > 0 && g.expired >= g.po) return 'slow';
        return 'steady';
    }

    function reasons(g) {
        var out = [];
        var suggest = Math.max(Math.round(g.soldPerVisit), 0);
        if (g.status === 'fast') {
            out.push('Sold ' + pct(g.sellRate) + ' of what was delivered' + (g.returned ? '' : ' with nothing pulled out or expired') + ' — stock runs out before the next delivery.');
            if (g.interval) out.push('Delivered about every ' + g.interval + ' days.');
            if (suggest) out.push('Suggest raising the order to about ' + pcs(Math.ceil(g.soldPerVisit * 1.2)) + ' per delivery (now ' + pcs(g.orderPerVisit) + ').');
            return out;
        }
        if (g.expired) {
            var why = 'Expired ' + pcs(g.expired) + ': stock stayed on the shelf past its shelf life';
            if (g.interval > CYCLE_DAYS) why += ' — deliveries are about ' + g.interval + ' days apart, longer than the 2-week cycle';
            else if (g.orderPerVisit > g.soldPerVisit * 1.15) why += ' — each delivery (' + pcs(g.orderPerVisit) + ') is more than the shop sells (' + pcs(g.soldPerVisit) + ')';
            out.push(why + '.');
        }
        if (g.po) {
            out.push('Pulled out ' + pcs(g.po) + (g.notes.length ? ': ' + g.notes.join('; ') + '.' : ': unsold stock taken back — demand is lower than what was delivered.'));
        }
        if (g.status === 'slow' && suggest) {
            out.push('Suggest lowering the order to about ' + pcs(suggest) + ' per delivery' + (g.interval > CYCLE_DAYS ? ' or delivering every 2 weeks' : '') + '.');
        } else if (g.status === 'slow' && g.ordered) {
            out.push('Almost nothing sold — check the shop\'s display and whether to keep supplying it.');
        }
        if (!out.length) out.push('Sold ' + pct(g.sellRate) + ' of what was delivered. Keep the current order.');
        return out;
    }

    /* ---------- drawing ---------- */

    var STATUS = {
        fast: { label: 'Runs out fast', color: '#2e7d32', bg: '#e8f5e9' },
        steady: { label: 'Steady', color: '#1565c0', bg: '#e3f2fd' },
        slow: { label: 'Slow sales', color: '#c62828', bg: '#ffebee' },
        none: { label: 'No orders', color: '#8a817c', bg: '#f1eeeb' }
    };

    function pill(status) {
        var s = STATUS[status] || STATUS.none;
        return '<span class="ri-pill" style="color:' + s.color + ';background:' + s.bg + '">' + s.label + '</span>';
    }

    function injectStyle() {
        if (document.getElementById('kz-ri-style')) return;
        var s = document.createElement('style');
        s.id = 'kz-ri-style';
        s.textContent =
            '.ri-tools{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:0 0 14px}' +
            '.ri-tools label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#5d4037;text-transform:uppercase;letter-spacing:.03em}' +
            '.ri-tools select{min-width:180px;padding:7px 10px;border:1px solid #d7ccc8;border-radius:8px;font:inherit;font-size:14px;text-transform:none}' +
            '.ri-summary{background:linear-gradient(135deg,#fffaf0 0%,#fff 60%);border:1px solid #f3e3c3;border-left:5px solid #ffca28;border-radius:12px;padding:14px 16px;margin:0 0 16px;color:#3d2c2a;font-size:14px;line-height:1.55}' +
            '.ri-summary strong{display:block;font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}' +
            '.ri-areas{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:0 0 18px}' +
            '.ri-area{border:1px solid #efe6df;border-radius:12px;padding:12px 14px;background:#fff}' +
            '.ri-area h5{margin:0 0 6px;font-size:15px;color:#3d2c2a;display:flex;justify-content:space-between;gap:8px;align-items:center}' +
            '.ri-area p{margin:2px 0;font-size:12.5px;color:#6d625c}' +
            '.ri-area b{color:#3d2c2a}' +
            '.ri-h{margin:16px 0 8px;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#3e2723}' +
            '.ri-table{width:100%;border-collapse:collapse;font-size:13.5px}' +
            '.ri-table th,.ri-table td{padding:9px 10px;border-bottom:1px solid #efe6df;text-align:left;vertical-align:top}' +
            '.ri-table th{background:#fbf6f2;color:#5d4037;font-size:12px;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}' +
            '.ri-table .n{text-align:right;white-space:nowrap}' +
            '.ri-table ul{margin:0;padding-left:16px}.ri-table li{margin:0 0 3px}' +
            '.ri-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}' +
            '.ri-empty{text-align:center;padding:22px;color:#8d6e63}';
        document.head.appendChild(s);
    }

    function filtered(host) {
        var days = host.querySelector('[data-ri-period]').value;
        var area = host.querySelector('[data-ri-area]').value;
        var from = '';
        if (days !== 'all') {
            var d = new Date();
            d.setDate(d.getDate() - Number(days));
            from = iso(d);
        }
        return state.rows.filter(function (r) {
            return (!from || r.date >= from) && (!area || r.area === area);
        });
    }

    function summaryText(shops, areas) {
        var fast = shops.filter(function (g) { return g.status === 'fast'; }).sort(function (a, b) { return b.sellRate - a.sellRate || b.sold - a.sold; });
        var slow = shops.filter(function (g) { return g.status === 'slow'; }).sort(function (a, b) { return a.sellRate - b.sellRate; });
        var parts = [];
        var bestArea = areas.slice().filter(function (a) { return a.ordered; }).sort(function (a, b) { return b.sellRate - a.sellRate; })[0];
        var worstArea = areas.slice().filter(function (a) { return a.ordered; }).sort(function (a, b) { return a.sellRate - b.sellRate; })[0];
        if (bestArea) parts.push(bestArea.area + ' sells best (' + pct(bestArea.sellRate) + ' of deliveries sold).');
        if (worstArea && worstArea !== bestArea) parts.push(worstArea.area + ' has the most stock coming back (' + pcs(worstArea.returned) + ' pulled out or expired).');
        if (fast.length) parts.push('Runs out fast: ' + fast.slice(0, 3).map(function (g) { return g.shop + ' (' + g.area + ')'; }).join(', ') + ' — deliver more to these shops.');
        if (slow.length) parts.push('Slow sales: ' + slow.slice(0, 3).map(function (g) { return g.shop + ' (' + g.area + ')'; }).join(', ') + ' — ' + (slow[0].expired ? 'stock is expiring on the shelf' : 'stock is being pulled out') + ', so order less or deliver on a 2-week cycle.');
        var expired = shops.reduce(function (s, g) { return s + g.expired; }, 0);
        if (expired) parts.push(pcs(expired) + ' expired in this period.');
        return parts.join(' ') || 'Not enough deliveries recorded yet to compare shops.';
    }

    function render(host) {
        var body = host.querySelector('[data-ri-body]');
        if (!state.loaded) {
            body.innerHTML = '<p class="ri-empty">Reading the route sheets…</p>';
            return;
        }
        if (state.error && !state.rows.length) {
            body.innerHTML = '<p class="ri-empty">' + esc(state.error) + '</p>';
            return;
        }
        var rows = filtered(host);
        if (!rows.length) {
            body.innerHTML = '<p class="ri-empty">No deliveries in this period.</p>';
            return;
        }
        var shops = group(rows, function (r) { return r.area + '|' + r.shop.toLowerCase(); }).filter(function (g) { return g.status !== 'none' || g.collected; });
        var areas = group(rows, function (r) { return r.area; }).map(function (a) {
            a.fastShops = shops.filter(function (g) { return g.area === a.area && g.status === 'fast'; }).length;
            a.slowShops = shops.filter(function (g) { return g.area === a.area && g.status === 'slow'; }).length;
            return a;
        }).sort(function (a, b) { return b.sellRate - a.sellRate; });
        var order = { fast: 0, slow: 1, steady: 2, none: 3 };
        shops.sort(function (a, b) { return order[a.status] - order[b.status] || (a.status === 'slow' ? a.sellRate - b.sellRate : b.sellRate - a.sellRate); });

        body.innerHTML =
            '<div class="ri-summary"><strong>✦ AI Insight</strong>' + esc(summaryText(shops, areas)) + '</div>' +
            '<h4 class="ri-h">By area</h4>' +
            '<div class="ri-areas">' + areas.map(function (a) {
                return '<div class="ri-area"><h5>' + esc(a.area) + pill(a.status) + '</h5>' +
                    '<p>Sold <b>' + pct(a.sellRate) + '</b> of <b>' + pcs(a.ordered) + '</b> ordered</p>' +
                    '<p>Pulled out <b>' + pcs(a.po) + '</b> · Expired <b>' + pcs(a.expired) + '</b></p>' +
                    '<p>Collected <b>' + peso(a.collected) + '</b></p>' +
                    '<p><b>' + a.fastShops + '</b> fast · <b>' + a.slowShops + '</b> slow shops</p></div>';
            }).join('') + '</div>' +
            '<h4 class="ri-h">By shop</h4>' +
            '<div style="overflow-x:auto"><table class="ri-table"><thead><tr><th>Shop</th><th>Area</th><th class="n">Ordered</th><th class="n">Pulled out</th><th class="n">Expired</th><th class="n">Sold</th><th class="n">Every</th><th>Status</th><th>Why / what to do</th></tr></thead><tbody>' +
            shops.map(function (g) {
                return '<tr><td><strong>' + esc(g.shop) + '</strong><br><small style="color:#8a817c">Last: ' + esc(g.last ? dateLabel(g.last) : '—') + '</small></td>' +
                    '<td>' + esc(g.area) + '</td><td class="n">' + pcs(g.ordered) + '</td><td class="n">' + pcs(g.po) + '</td><td class="n">' + pcs(g.expired) +
                    '</td><td class="n">' + (g.ordered ? pct(g.sellRate) : '—') + '</td><td class="n">' + (g.interval ? g.interval + ' days' : '—') +
                    '</td><td>' + pill(g.status) + '</td><td><ul>' + g.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></td></tr>';
            }).join('') + '</tbody></table></div>';
    }

    function mount(host) {
        if (!host || host.dataset.riBound === '1') return;
        host.dataset.riBound = '1';
        injectStyle();
        host.innerHTML =
            '<div class="ri-tools">' +
                '<label>Period<select data-ri-period><option value="30">Last 30 days</option><option value="60">Last 60 days</option><option value="90" selected>Last 90 days</option><option value="all">All time</option></select></label>' +
                '<label>Area<select data-ri-area><option value="">All areas</option></select></label>' +
            '</div>' +
            '<div data-ri-body></div>';
        host.querySelector('[data-ri-period]').addEventListener('change', function () { render(host); });
        host.querySelector('[data-ri-area]').addEventListener('change', function () { render(host); });
        render(host);
        // The route sheets are only fetched once the Retailer Insights tab is actually shown.
        var panel = host.closest('.insights-panel');
        if (panel && panel.hidden) {
            var onTab = function (e) {
                if (!e.detail || e.detail.key !== 'retailer-insight') return;
                document.removeEventListener('kreezby:insights-tab', onTab);
                start();
            };
            document.addEventListener('kreezby:insights-tab', onTab);
            return;
        }
        start();

        function start() {
        load().then(function () {
            var areas = [];
            state.rows.forEach(function (r) { if (areas.indexOf(r.area) < 0) areas.push(r.area); });
            areas.sort();
            host.querySelector('[data-ri-area]').innerHTML = '<option value="">All areas</option>' + areas.map(function (a) {
                return '<option value="' + esc(a) + '">' + esc(a) + '</option>';
            }).join('');
            render(host);
        });
        }
    }

    function boot() {
        document.querySelectorAll('[data-retailer-insights]').forEach(mount);
    }

    window.KreezbyRetailerInsights = { boot: boot, analyse: function (rows) { return group(rows, function (r) { return r.area + '|' + r.shop; }); } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
    document.addEventListener('turbo:frame-load', boot);
})();
