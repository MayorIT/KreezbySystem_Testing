/**
 * Sales Analysis → Retailer Insights (head admin, admin, staff).
 * Reads every route sheet (GET /api/sales-list) and shows, per area and per shop:
 *   ordered (Cons + COD), pulled out (P.O), expired, collected, how often it is delivered,
 * then marks each shop as Fast / Steady / Slow and explains why stock was pulled out or expired.
 * Shown as three short parts (Areas, Shops, What to do) and a simple shop list.
 * Reasons come from the numbers on the sheets plus any note written on the delivery.
 */
(function () {
    'use strict';

    var CYCLE_DAYS = 14;          // normal delivery cycle (2 weeks)
    var FAST_SELL = 0.9;          // ≥ 90% of what was delivered got sold
    var SLOW_SELL = 0.7;          // < 70% sold → slow
    var state = { rows: [], loaded: false, error: '', limit: 10, open: {} };

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
    function pn(n) { return Math.round(n).toLocaleString('en-PH'); }
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
                            area: ({batangas:'Batangas',bauan:'Bauan',citimart:'Citimart',lipa:'Lipa',lucena:'Lucena',manila:'Manila',rosario:'Rosario',stotomas:'Sto. Tomas',tagaytay:'Tagaytay'})[String(sheet.source||'').toLowerCase()] || String(sheet.areaLabel || sheet.source || '—').split(/\s+[-–]\s+|\s+\d/)[0].trim(),
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
            '.ri-tools select,.ri-tools input{min-width:170px;padding:7px 10px;border:1px solid #d7ccc8;border-radius:8px;font:inherit;font-size:14px;text-transform:none;background:#fff}' +
            '.ri-card{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:6px 18px;margin:0 0 18px}' +
            '.ri-sec{display:grid;grid-template-columns:120px minmax(0,1fr);gap:6px 18px;padding:14px 0;border-bottom:1px solid #f1e7dc}' +
            '.ri-sec:last-child{border-bottom:0}' +
            '.ri-sec h4{margin:0;font-size:14px;font-weight:700;color:#5d4037;line-height:1.5}' +
            '.ri-sec p{margin:0;font-size:14px;line-height:1.55;color:#3e2723}' +
            '.ri-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
            '.ri-chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;background:#fffaf3;border:1px solid #f0e4d2;font-size:12px;color:#5d4037;white-space:nowrap}' +
            '.ri-chip.ok{background:#e8f5e9;border-color:#c8e6c9;color:#2e7d32}.ri-chip.warn{background:#fff3e0;border-color:#ffe0b2;color:#e65100}.ri-chip.bad{background:#ffebee;border-color:#ffcdd2;color:#c62828}.ri-chip.info{background:#e3f2fd;border-color:#bbdefb;color:#1565c0}' +
            '.ri-h{margin:0 0 8px;font-size:14px;font-weight:700;color:#3e2723}' +
            '.ri-list{display:grid;gap:8px}' +
            '.ri-shop{border:1px solid #eadfce;border-radius:10px;background:#fff}' +
            '.ri-shop summary{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:10px 14px;cursor:pointer;list-style:none}' +
            '.ri-shop summary::-webkit-details-marker{display:none}' +
            '.ri-shop summary strong{display:block;font-size:14px;color:#3e2723}' +
            '.ri-shop summary small{display:block;font-size:12px;color:#7a6558;margin-top:1px}' +
            '.ri-rate{font-size:13px;font-weight:700;color:#5d4037;white-space:nowrap}' +
            '.ri-shop[open] summary{border-bottom:1px solid #f1e7dc}' +
            '.ri-shop ul{margin:0;padding:10px 14px 12px 32px;font-size:13px;line-height:1.55;color:#4e342e}' +
            '.ri-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}' +
            '.ri-more{margin-top:10px;padding:7px 14px;border:1px solid #d7ccc8;border-radius:8px;background:#fff;color:#5d4037;font-weight:700;cursor:pointer}' +
            '.ri-empty{text-align:center;padding:22px;color:#8d6e63;margin:0}' +
            '@media(max-width:600px){.ri-card{padding:4px 14px}.ri-sec{grid-template-columns:minmax(0,1fr);gap:4px;padding:12px 0}.ri-chip{white-space:normal}' +
            '.ri-tools label{flex:1 1 100%}.ri-tools select,.ri-tools input{width:100%;min-width:0}' +
            '.ri-shop summary{grid-template-columns:minmax(0,1fr) auto;}.ri-rate{grid-column:1}}';
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

    function chip(label, cls) {
        return '<span class="ri-chip' + (cls ? ' ' + cls : '') + '">' + esc(label) + '</span>';
    }

    function section(label, sentence, chips) {
        return '<section class="ri-sec"><h4>' + label + '</h4><div><p>' + esc(sentence) + '</p>'
            + '<div class="ri-chips">' + chips.filter(Boolean).join('') + '</div></div></section>';
    }

    function names(list, max) {
        var shown = list.slice(0, max).map(function (g) { return g.shop; });
        var extra = list.length - shown.length;
        var text = shown.length <= 1 ? shown.join('') : shown.slice(0, -1).join(', ') + ' and ' + shown[shown.length - 1];
        return text + (extra > 0 ? ' (+' + extra + ' more)' : '');
    }

    // Three short parts, like the dashboard insight: Areas, Shops, What to do.
    function summaryCard(shops, areas) {
        var sold = areas.filter(function (a) { return a.ordered; });
        var best = sold.slice().sort(function (a, b) { return b.sellRate - a.sellRate; })[0];
        var worst = sold.slice().sort(function (a, b) { return b.returned - a.returned; })[0];
        var areaText = !best ? 'No area has deliveries in this period yet.'
            : best.area + ' sells best, with ' + pct(best.sellRate) + ' of deliveries sold.'
              + (worst && worst !== best && worst.returned ? ' ' + worst.area + ' has the most stock coming back (' + pcs(worst.returned) + ' pulled out or expired).' : '');
        var areaChips = sold.map(function (a) {
            return chip(a.area + ' · ' + pct(a.sellRate) + ' sold', a.sellRate >= FAST_SELL ? 'ok' : a.sellRate < SLOW_SELL ? 'bad' : '');
        });

        var fast = shops.filter(function (g) { return g.status === 'fast'; }).sort(function (a, b) { return b.sellRate - a.sellRate || b.sold - a.sold; });
        var slow = shops.filter(function (g) { return g.status === 'slow'; }).sort(function (a, b) { return a.sellRate - b.sellRate; });
        var steady = shops.filter(function (g) { return g.status === 'steady'; });
        var shopText = (fast.length ? names(fast, 3) + (fast.length === 1 ? ' runs' : ' run') + ' out fast. ' : 'No shop runs out fast yet. ')
            + (slow.length ? names(slow, 3) + (slow.length === 1 ? ' has' : ' have') + ' slow sales.' : 'No shop has slow sales.');
        var shopChips = [
            chip(fast.length + ' runs out fast', fast.length ? 'ok' : ''),
            chip(steady.length + ' steady', steady.length ? 'info' : ''),
            chip(slow.length + ' slow', slow.length ? 'bad' : '')
        ];

        var expired = shops.reduce(function (t, g) { return t + g.expired; }, 0);
        var po = shops.reduce(function (t, g) { return t + g.po; }, 0);
        var todo = [];
        if (fast.length) todo.push('Deliver more to ' + names(fast, 2) + '.');
        if (slow.length) todo.push('Order less for ' + names(slow, 2) + (slow.some(function (g) { return g.interval > CYCLE_DAYS; }) ? ', or keep them on the 2-week delivery cycle' : '') + '.');
        if (expired) todo.push('Check shelf stock: ' + pcs(expired) + ' expired in this period.');
        if (!todo.length) todo.push('Keep the current orders. Every shop is selling steadily.');
        var todoChips = [
            po ? chip(pcs(po) + ' pulled out', 'warn') : '',
            expired ? chip(pcs(expired) + ' expired', 'bad') : '',
            (!po && !expired) ? chip('Nothing pulled out or expired', 'ok') : ''
        ];

        return '<div class="ri-card">'
            + section('Areas', areaText, areaChips)
            + section('Shops', shopText, shopChips)
            + section('What to do', todo.join(' '), todoChips)
            + '</div>';
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
        var areas = group(rows, function (r) { return r.area; }).sort(function (a, b) { return b.sellRate - a.sellRate; });
        var order = { fast: 0, slow: 1, steady: 2, none: 3 };
        shops.sort(function (a, b) { return order[a.status] - order[b.status] || (a.status === 'slow' ? a.sellRate - b.sellRate : b.sellRate - a.sellRate); });

        body.innerHTML = summaryCard(shops, areas)
            + '<h4 class="ri-h">Shops</h4><div data-ri-shops></div>';
        state.shops = shops;
        renderShops(host);
    }

    // One line per shop; open it to see why it is fast or slow.
    function renderShops(host) {
        var box = host.querySelector('[data-ri-shops]');
        if (!box) return;
        var q = String((host.querySelector('[data-ri-search]') || {}).value || '').toLowerCase().trim();
        var list = (state.shops || []).filter(function (g) {
            return !q || [g.shop, g.area, (STATUS[g.status] || {}).label].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        if (!list.length) {
            box.innerHTML = '<p class="ri-empty">' + (q ? 'No shops match this search.' : 'No shops to show yet.') + '</p>';
            return;
        }
        var limit = state.limit || 10;
        box.innerHTML = '<div class="ri-list">' + list.slice(0, limit).map(function (g) {
            var key = g.area + '|' + g.shop;
            return '<details class="ri-shop" data-ri-key="' + esc(key) + '"' + (state.open[key] ? ' open' : '') + '><summary>'
                + '<span><strong>' + esc(g.shop) + '</strong><small>' + esc(g.area) + ' · last delivery ' + esc(g.last ? dateLabel(g.last) : '—') + '</small></span>'
                + '<span class="ri-rate">' + (g.ordered ? pct(g.sellRate) + ' sold' : '—') + '</span>'
                + pill(g.status) + '</summary>'
                + '<ul>' + g.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></details>';
        }).join('') + '</div>'
            + (list.length > limit ? '<button type="button" class="ri-more" data-ri-more>Show ' + Math.min(10, list.length - limit) + ' more (' + (list.length - limit) + ' left)</button>' : '');
    }

    function mount(host) {
        if (!host || host.dataset.riBound === '1') return;
        host.dataset.riBound = '1';
        injectStyle();
        host.innerHTML =
            '<div class="ri-tools">' +
                '<label>Period<select data-ri-period><option value="30">Last 30 days</option><option value="60">Last 60 days</option><option value="90">Last 90 days</option><option value="all" selected>All time</option></select></label>' +
                '<label>Area<select data-ri-area><option value="">All areas</option></select></label>' +
                '<label>Search shop<input type="search" data-ri-search placeholder="Shop or area…"></label>' +
            '</div>' +
            '<div data-ri-body></div>';
        function fresh() { state.limit = 10; state.open = {}; render(host); }
        host.querySelector('[data-ri-period]').addEventListener('change', fresh);
        host.querySelector('[data-ri-area]').addEventListener('change', fresh);
        var riTimer = null;
        host.querySelector('[data-ri-search]').addEventListener('input', function () {
            clearTimeout(riTimer);
            riTimer = setTimeout(function () { state.limit = 10; renderShops(host); }, 120);
        });
        host.addEventListener('click', function (e) {
            var more = e.target.closest ? e.target.closest('[data-ri-more]') : null;
            if (!more) return;
            state.limit = (state.limit || 10) + 10;
            renderShops(host);
        });
        // Remember which shops are open, so a re-draw keeps them open.
        host.addEventListener('toggle', function (e) {
            var d = e.target;
            if (d && d.matches && d.matches('details[data-ri-key]')) state.open[d.getAttribute('data-ri-key')] = d.open;
        }, true);
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
