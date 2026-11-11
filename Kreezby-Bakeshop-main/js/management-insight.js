/**
 * Management Insight (head admin, admin and staff · Insights > Management Insight).
 * Summarizes notable sales, inventory and demand conditions in simple language for the owner.
 * Four parts, all worked out from the shop's own records (sales, stock, batches, alerts):
 *   1. Summary of sales performance
 *   2. Inventory conditions
 *   3. Identified business situations
 *   4. Interpretation of the generated insights
 * Refresh recalculates everything from the latest records.
 */
(function () {
    'use strict';

    var STYLE_ID = 'management-insight-style';
    var DAY = 86400000;

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''
            + '.mi-wrap{display:grid;gap:14px;}'
            + '.mi-card{background:#fff;border:1px solid #eadfce;border-radius:14px;padding:16px 18px;}'
            + '.mi-card h4{margin:0 0 4px;font-size:15px;color:#3e2723;display:flex;align-items:center;gap:8px;}'
            + '.mi-card h4 span.mi-num{display:inline-flex;width:22px;height:22px;border-radius:50%;background:#5d4037;color:#fff;font-size:12px;align-items:center;justify-content:center;}'
            + '.mi-lead{margin:0 0 12px;font-size:12px;color:#7a6558;}'
            + '.mi-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 12px;}'
            + '.mi-stat{background:#fffaf3;border:1px solid #f0e4d2;border-radius:10px;padding:10px 12px;}'
            + '.mi-stat small{display:block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8d6e63;}'
            + '.mi-stat strong{display:block;font-size:20px;color:#3e2723;margin-top:2px;}'
            + '.mi-stat em{display:block;font-style:normal;font-size:12px;color:#7a6558;margin-top:2px;}'
            + '.mi-up{color:#2e7d32 !important;}.mi-down{color:#c62828 !important;}'
            + '.mi-table{width:100%;border-collapse:collapse;font-size:13px;}'
            + '.mi-table th,.mi-table td{padding:8px 10px;border-bottom:1px solid #f2e9dc;text-align:left;}'
            + '.mi-table th{background:#fbf6f2;color:#5d4037;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}'
            + '.mi-table td.n,.mi-table th.n{text-align:right;white-space:nowrap;}'
            + '.mi-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}'
            + '.mi-tag.ok{background:#e8f5e9;color:#2e7d32;}.mi-tag.warn{background:#fff3e0;color:#e65100;}.mi-tag.bad{background:#ffebee;color:#c62828;}.mi-tag.info{background:#e3f2fd;color:#1565c0;}'
            + '.mi-list{margin:0;padding:0;list-style:none;display:grid;gap:8px;}'
            + '.mi-list li{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start;padding:10px 12px;border-radius:10px;background:#fffaf3;border:1px solid #f0e4d2;font-size:13px;line-height:1.45;color:#3e2723;}'
            + '.mi-list li b{display:block;}'
            + '.mi-text p{margin:0 0 8px;font-size:13.5px;line-height:1.55;color:#3e2723;}'
            + '.mi-text ol{margin:6px 0 0;padding-left:20px;font-size:13.5px;line-height:1.55;color:#3e2723;}'
            + '.mi-empty{font-size:13px;color:#7a6558;margin:0;}'
            + '#management-insight-status{margin-left:10px;font-size:13px;font-weight:700;color:#5d4037;}'
            + '.mi-compact{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}'
            + '.mi-compact .mi-card{padding:12px 14px;}'
            + '.mi-compact .mi-card h4{margin:0 0 8px;font-size:14px;}'
            + '.mi-compact .mi-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 8px;}'
            + '.mi-compact .mi-stat{padding:7px 10px;}'
            + '.mi-compact .mi-stat strong{font-size:17px;}'
            + '.mi-compact .mi-stat em{font-size:11px;}'
            + '.mi-line{margin:0;font-size:12.5px;color:#3e2723;line-height:1.4;}'
            + '.mi-muted{color:#8d6e63;margin-top:6px;}'
            + '.mi-chips{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 6px;}'
            + '.mi-compact .mi-list{gap:5px;}'
            + '.mi-compact .mi-list li{padding:6px 10px;font-size:12.5px;align-items:center;}'
            + '.mi-compact.mi-wrap .mi-text p{font-size:12.5px;line-height:1.45;margin:0 0 6px;}'
            + '.mi-compact.mi-wrap .mi-text ol{font-size:12.5px;line-height:1.45;margin:0;}'
            + '@media (max-width:900px){.mi-compact{grid-template-columns:minmax(0,1fr);}}'
            + '@media (max-width:600px){.mi-card{padding:12px;}.mi-compact .mi-stats{grid-template-columns:repeat(3,minmax(0,1fr));}}';
        document.head.appendChild(style);
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function n(value) {
        var x = Number(value);
        return isFinite(x) ? x : 0;
    }

    function count(value) {
        return Math.round(n(value)).toLocaleString('en-PH');
    }

    function peso(value) {
        return '₱' + n(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function isoDay(date) {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function dayIndex(iso) {
        var t = String(iso || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
        var p = t.split('-');
        return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY);
    }

    function pct(now, before) {
        if (!before) return now ? null : 0;
        return Math.round(((now - before) / before) * 100);
    }

    function plural(x, one, many) {
        return count(x) + ' ' + (Math.round(x) === 1 ? one : (many || one + 's'));
    }

    // ---------- the numbers ----------
    function gather() {
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.productCatalog !== 'function') return null;
        var now = new Date();
        var today = dayIndex(isoDay(now));
        var catalog = dict.productCatalog();
        var byId = {};
        catalog.forEach(function (p) {
            var stock = typeof dict.productStock === 'function' ? n(dict.productStock(p.name)) : 0;
            var price = typeof dict.productPrice === 'function' ? n(dict.productPrice(p.name)) : n(p.price);
            byId[p.id] = { id: p.id, name: p.name, price: price || n(p.price), stock: stock, sold7: 0, sold30: 0, soldPrev30: 0, lastSold: null };
        });

        // Only sales that really happened (the old sample week before the system went live is skipped).
        var sales = typeof dict.salesTransactions === 'function' ? dict.salesTransactions() : [];
        var dailyUnits = {};
        sales.forEach(function (row) {
            var qty = n(row && row.quantity_sold);
            var d = dayIndex(row && row.sales_date);
            var item = row && byId[row.product_id];
            if (!qty || d == null || !item) return;
            var age = today - d;
            if (age < 0) return;
            if (age < 7) item.sold7 += qty;
            if (age < 30) { item.sold30 += qty; dailyUnits[d] = (dailyUnits[d] || 0) + qty; }
            else if (age < 60) item.soldPrev30 += qty;
            if (item.lastSold == null || d > item.lastSold) item.lastSold = d;
        });

        var items = Object.keys(byId).map(function (id) { return byId[id]; });
        items.forEach(function (item) {
            item.revenue30 = item.sold30 * item.price;
            item.perDay = item.sold30 / 30;
            item.daysCover = item.perDay > 0 ? item.stock / item.perDay : null;
            item.daysSinceSale = item.lastSold == null ? null : today - item.lastSold;
        });

        var alerts = typeof dict.alerts === 'function' ? dict.alerts().filter(function (a) { return a && a.status === 'pending'; }) : [];
        var expired = alerts.filter(function (a) { return a.alert_type === 'expired'; });
        var nearExpiry = alerts.filter(function (a) { return a.alert_type === 'near_expiry'; });
        var lowStock = alerts.filter(function (a) { return a.alert_type === 'low_stock'; });
        var lowMaterials = lowStock.filter(function (a) { return /^(RM|PKG)-/.test(String(a.reference_id)); });

        var busiest = null;
        Object.keys(dailyUnits).forEach(function (d) {
            if (!busiest || dailyUnits[d] > busiest.units) busiest = { day: +d, units: dailyUnits[d] };
        });

        return {
            items: items,
            totals: {
                sold7: items.reduce(function (s, i) { return s + i.sold7; }, 0),
                sold30: items.reduce(function (s, i) { return s + i.sold30; }, 0),
                soldPrev30: items.reduce(function (s, i) { return s + i.soldPrev30; }, 0),
                revenue30: items.reduce(function (s, i) { return s + i.revenue30; }, 0),
                stock: items.reduce(function (s, i) { return s + i.stock; }, 0),
                activeDays: Object.keys(dailyUnits).length
            },
            busiest: busiest,
            expired: expired,
            nearExpiry: nearExpiry,
            lowMaterials: lowMaterials,
            asOf: now
        };
    }

    function dayLabel(index) {
        var d = new Date(index * DAY);
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }

    // Where a flavor stands: Out of stock / Low (≤ 7 days) / Healthy / Overstocked (> 30 days) / No recent sales.
    function stockState(item) {
        if (item.stock <= 0) return { cls: 'bad', label: 'Out of stock' };
        if (item.daysCover == null) return { cls: 'info', label: 'No recent sales' };
        if (item.daysCover <= 7) return { cls: 'warn', label: 'Low (' + Math.max(1, Math.round(item.daysCover)) + ' days left)' };
        if (item.daysCover > 30) return { cls: 'info', label: 'Overstocked (' + Math.round(item.daysCover) + ' days)' };
        return { cls: 'ok', label: 'Healthy (' + Math.round(item.daysCover) + ' days)' };
    }

    // ---------- 3. situations found by simple, stated rules ----------
    function situations(data) {
        var list = [];
        var t = data.totals;
        var change = pct(t.sold30, t.soldPrev30);
        if (t.sold30 && change != null && change >= 15) list.push({ cls: 'ok', title: 'Sales are growing', text: 'Pouches sold in the last 30 days are up ' + change + '% compared with the 30 days before (' + count(t.sold30) + ' vs ' + count(t.soldPrev30) + ').' });
        if (t.soldPrev30 && change != null && change <= -15) list.push({ cls: 'bad', title: 'Sales are slowing down', text: 'Pouches sold in the last 30 days are down ' + Math.abs(change) + '% compared with the 30 days before (' + count(t.sold30) + ' vs ' + count(t.soldPrev30) + ').' });

        data.items.filter(function (i) { return i.stock <= 0 && i.sold30 > 0; }).forEach(function (i) {
            list.push({ cls: 'bad', title: 'Lost sales risk: ' + i.name, text: 'It sold ' + plural(i.sold30, 'pouch', 'pouches') + ' in the last 30 days but is now out of stock. Customers asking for it cannot be served.' });
        });
        data.items.filter(function (i) { return i.stock > 0 && i.daysCover != null && i.daysCover <= 7; }).forEach(function (i) {
            list.push({ cls: 'warn', title: 'Running out soon: ' + i.name, text: 'At about ' + i.perDay.toFixed(1) + ' pouches a day, the ' + plural(i.stock, 'pouch', 'pouches') + ' on hand last about ' + Math.max(1, Math.round(i.daysCover)) + ' days.' });
        });
        data.items.filter(function (i) { return i.stock > 0 && i.sold30 === 0; }).forEach(function (i) {
            list.push({ cls: 'info', title: 'Not moving: ' + i.name, text: plural(i.stock, 'pouch is', 'pouches are') + ' on hand but none sold in the last 30 days.' });
        });
        data.items.filter(function (i) { return i.daysCover != null && i.daysCover > 30 && i.sold30 > 0; }).forEach(function (i) {
            list.push({ cls: 'info', title: 'More stock than needed: ' + i.name, text: 'The ' + plural(i.stock, 'pouch', 'pouches') + ' on hand cover about ' + Math.round(i.daysCover) + ' days of sales. Check expiry dates before baking more.' });
        });
        if (data.expired.length) list.push({ cls: 'bad', title: plural(data.expired.length, 'expired batch', 'expired batches') + ' on hand', text: data.expired.map(function (a) { return a.message; }).join(' ') });
        if (data.nearExpiry.length) list.push({ cls: 'warn', title: plural(data.nearExpiry.length, 'batch', 'batches') + ' close to expiry', text: data.nearExpiry.map(function (a) { return a.message; }).join(' ') });
        if (data.lowMaterials.length) list.push({ cls: 'warn', title: plural(data.lowMaterials.length, 'material') + ' at or below the alert line', text: 'Production may stop if these run out: ' + data.lowMaterials.map(function (a) { return String(a.message).split(' is at ')[0]; }).join(', ') + '.' });
        var shifts = demandShifts(data);
        shifts.rising.slice(0, 2).forEach(function (i) {
            list.push({ cls: 'ok', title: 'Demand rising: ' + i.name, text: 'Sold ' + count(i.sold30) + ' in the last 30 days vs ' + count(i.soldPrev30) + ' the 30 days before.' });
        });
        shifts.falling.slice(0, 2).forEach(function (i) {
            list.push({ cls: 'warn', title: 'Demand falling: ' + i.name, text: 'Sold ' + count(i.sold30) + ' in the last 30 days vs ' + count(i.soldPrev30) + ' the 30 days before.' });
        });
        var best = data.items.slice().sort(function (a, b) { return b.sold30 - a.sold30; })[0];
        if (best && best.sold30 > 0 && data.totals.sold30 > 0) {
            var share = Math.round(best.sold30 / data.totals.sold30 * 100);
            if (share >= 40) list.push({ cls: 'info', title: 'Sales depend on one flavor', text: best.name + ' makes up ' + share + '% of pouches sold in the last 30 days.' });
        }
        return list;
    }

    // ---------- 4. interpretation ----------
    // Which flavors customers are asking for more or less (last 30 days vs the 30 days before).
    function demandShifts(data) {
        var rising = [];
        var falling = [];
        data.items.forEach(function (i) {
            var diff = i.sold30 - i.soldPrev30;
            if (diff >= 3 && (!i.soldPrev30 || diff / i.soldPrev30 >= 0.25)) rising.push(i);
            else if (diff <= -3 && i.soldPrev30 && -diff / i.soldPrev30 >= 0.25) falling.push(i);
        });
        rising.sort(function (a, b) { return (b.sold30 - b.soldPrev30) - (a.sold30 - a.soldPrev30); });
        falling.sort(function (a, b) { return (a.sold30 - a.soldPrev30) - (b.sold30 - b.soldPrev30); });
        return { rising: rising, falling: falling };
    }

    function short(name) {
        return String(name || '').replace(/\s*Crinkles$/i, '');
    }

    function joinNames(list) {
        var names = list.map(function (i) { return short(i.name); });
        if (names.length <= 1) return names.join('');
        return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    }

    // Owner summary in simple words: Sales, Inventory, Demand, then what to do first.
    function interpretation(data, found) {
        var t = data.totals;
        var lines = [];
        var actions = [];
        var change = pct(t.sold30, t.soldPrev30);

        // Sales
        if (!t.sold30) {
            lines.push({ label: 'Sales', text: 'No sales were recorded in the last 30 days.' });
        } else {
            var trend = change == null ? 'This is the first month with sales.'
                : change > 0 ? 'That is more than last month (up ' + change + '%).'
                : change < 0 ? 'That is less than last month (down ' + Math.abs(change) + '%).'
                : 'That is the same as last month.';
            lines.push({ label: 'Sales', text: 'You sold ' + plural(t.sold30, 'pouch', 'pouches') + ' worth about ' + peso(t.revenue30) + ' in the last 30 days. ' + trend });
        }

        // Inventory
        var out = data.items.filter(function (i) { return i.stock <= 0 && i.sold30 > 0; });
        var low = data.items.filter(function (i) { return i.stock > 0 && i.daysCover != null && i.daysCover <= 7; });
        var invParts = ['You have ' + plural(t.stock, 'pouch', 'pouches') + ' in stock.'];
        if (out.length) invParts.push(joinNames(out) + (out.length === 1 ? ' is' : ' are') + ' out of stock.');
        if (low.length) invParts.push(joinNames(low) + (low.length === 1 ? ' is' : ' are') + ' running low.');
        if (data.expired.length) invParts.push(plural(data.expired.length, 'batch has', 'batches have') + ' expired.');
        if (data.nearExpiry.length) invParts.push(plural(data.nearExpiry.length, 'batch expires', 'batches expire') + ' soon.');
        if (!out.length && !low.length && !data.expired.length && !data.nearExpiry.length) invParts.push('Stock levels are fine.');
        lines.push({ label: 'Inventory', text: invParts.join(' ') });

        // Demand
        var shifts = demandShifts(data);
        var best = data.items.slice().sort(function (a, b) { return b.sold30 - a.sold30; })[0];
        var demParts = [];
        if (best && best.sold30 > 0) {
            var share = t.sold30 ? Math.round(best.sold30 / t.sold30 * 100) : 0;
            demParts.push('Customers buy ' + short(best.name) + ' the most (' + share + '% of pouches sold).');
        }
        if (shifts.rising.length) demParts.push('More people are buying ' + joinNames(shifts.rising.slice(0, 2)) + '.');
        if (shifts.falling.length) demParts.push('Fewer people are buying ' + joinNames(shifts.falling.slice(0, 2)) + '.');
        var idle = data.items.filter(function (i) { return i.stock > 0 && i.sold30 === 0; });
        if (idle.length) demParts.push(joinNames(idle.slice(0, 2)) + (idle.length === 1 ? ' has' : ' have') + ' stock but no buyers this month.');
        if (!demParts.length) demParts.push('There are not enough sales yet to see what customers prefer.');
        lines.push({ label: 'Demand', text: demParts.join(' ') });

        // What to do first
        out.sort(function (a, b) { return b.sold30 - a.sold30; })
            .forEach(function (i) { actions.push('Bake ' + short(i.name) + ' first — customers want it but it is out of stock.'); });
        low.forEach(function (i) { actions.push('Bake more ' + short(i.name) + ' within ' + Math.max(1, Math.round(i.daysCover)) + ' days.'); });
        if (data.expired.length) actions.push('Take the expired batches off the shelf.');
        if (data.nearExpiry.length) actions.push('Sell the batches that expire soon first.');
        shifts.rising.filter(function (i) { return out.indexOf(i) < 0 && low.indexOf(i) < 0; }).slice(0, 1)
            .forEach(function (i) { actions.push('Make a little more ' + short(i.name) + ' — demand is going up.'); });
        if (data.lowMaterials.length) actions.push('Buy the raw and packaging materials that are running low.');
        idle.slice(0, 1).forEach(function (i) { actions.push('Bake less ' + short(i.name) + ' until it starts selling.'); });
        return { lines: lines, actions: actions.slice(0, 3) };
    }

    // ---------- render ----------
    function render() {
        var panel = document.querySelector('[data-insights-panel="management-insight"]');
        if (!panel) return false;
        var data = gather();
        if (!data) return false;
        ensureStyle();
        var body = panel.querySelector('.card-body-padded') || panel;
        // Search / Show belonged to the old table.
        panel.querySelectorAll('.po-list-toolbar .po-page-size, .po-list-toolbar .search-field-wrap').forEach(function (el) { el.style.display = 'none'; });
        var countEl = panel.querySelector('.insights-count');
        if (countEl) countEl.textContent = '';

        var t = data.totals;
        var change = pct(t.sold30, t.soldPrev30);
        var ranked = data.items.slice().sort(function (a, b) { return b.sold30 - a.sold30 || a.name.localeCompare(b.name); });
        var sellers = ranked.filter(function (i) { return i.sold30 > 0; });
        var found = situations(data);
        var reading = interpretation(data, found);

        var html = '<div class="mi-wrap mi-compact">';
        var trendTxt = change == null ? 'no earlier month' : '<span class="' + (change >= 0 ? 'mi-up' : 'mi-down') + '">' + (change >= 0 ? '▲ ' : '▼ ') + Math.abs(change) + '%</span> vs prev. 30 days';
        var stocked = ranked.filter(function (i) { return i.stock > 0 || i.sold30 > 0; });
        var states = { bad: 0, warn: 0, ok: 0, info: 0 };
        stocked.forEach(function (i) { states[stockState(i).cls] += 1; });
        var priority = { bad: 0, warn: 1, ok: 2, info: 3 };
        var topFound = found.slice().sort(function (a, b) { return priority[a.cls] - priority[b.cls]; });

        // 1. Summary of sales performance
        html += '<section class="mi-card"><h4><span class="mi-num">1</span>Summary of sales performance</h4>'
            + '<div class="mi-stats">'
            + '<div class="mi-stat"><small>7 days</small><strong>' + count(t.sold7) + '</strong><em>pouches</em></div>'
            + '<div class="mi-stat"><small>30 days</small><strong>' + count(t.sold30) + '</strong><em>' + trendTxt + '</em></div>'
            + '<div class="mi-stat"><small>Sales value</small><strong>' + peso(t.revenue30) + '</strong><em>last 30 days</em></div>'
            + '</div>'
            + '<p class="mi-line"><b>Top sellers:</b> ' + (sellers.length
                ? sellers.slice(0, 3).map(function (i) { return esc(i.name) + ' (' + count(i.sold30) + ')'; }).join(' · ')
                : 'no sales in the last 30 days') + '</p>'
            + '</section>';

        // 2. Inventory conditions
        html += '<section class="mi-card"><h4><span class="mi-num">2</span>Inventory conditions</h4>'
            + '<div class="mi-stats">'
            + '<div class="mi-stat"><small>On hand</small><strong>' + count(t.stock) + '</strong><em>pouches</em></div>'
            + '<div class="mi-stat"><small>Out / low</small><strong>' + states.bad + ' / ' + states.warn + '</strong><em>flavors</em></div>'
            + '<div class="mi-stat"><small>Expired / near</small><strong>' + data.expired.length + ' / ' + data.nearExpiry.length + '</strong><em>batches</em></div>'
            + '</div>'
            + '<div class="mi-chips">' + (stocked.length ? stocked.slice(0, 8).map(function (i) {
                var st = stockState(i);
                return '<span class="mi-tag ' + st.cls + '" title="' + esc(i.name + ': ' + count(i.stock) + ' on hand · ' + st.label) + '">' + esc(i.name.replace(/\s*Crinkles$/i, '')) + ' · ' + esc(st.label.replace(/\s*\(.*\)$/, '')) + '</span>';
            }).join('') : '<span class="mi-empty">No finished stock or recent sales yet.</span>') + '</div>'
            + (data.lowMaterials.length ? '<p class="mi-line"><b>' + data.lowMaterials.length + '</b> raw/packaging materials at their alert line.</p>' : '')
            + '</section>';

        // 3. Identified business situations (most urgent first)
        html += '<section class="mi-card"><h4><span class="mi-num">3</span>Identified business situations</h4>';
        html += topFound.length
            ? '<ul class="mi-list">' + topFound.slice(0, 4).map(function (s) {
                var tag = s.cls === 'bad' ? 'Urgent' : s.cls === 'warn' ? 'Watch' : s.cls === 'ok' ? 'Good' : 'Note';
                return '<li title="' + esc(s.text) + '"><span class="mi-tag ' + s.cls + '">' + tag + '</span><span>' + esc(s.title) + '</span></li>';
            }).join('') + '</ul>'
                + (topFound.length > 4 ? '<p class="mi-line mi-muted">+' + (topFound.length - 4) + ' more (hover a line for details)</p>' : '')
            : '<p class="mi-empty">Nothing needs attention right now.</p>';
        html += '</section>';

        // 4. Interpretation
        html += '<section class="mi-card mi-text"><h4><span class="mi-num">4</span>Interpretation for the owner</h4>'
            + reading.lines.map(function (l) { return '<p><b>' + esc(l.label) + ':</b> ' + esc(l.text) + '</p>'; }).join('')
            + (reading.actions.length ? '<p><b>Do first:</b></p><ol>' + reading.actions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>' : '')
            + '</section>';
        html += '</div>';
        body.innerHTML = html;
        return true;
    }

    function setStatus(text) {
        var button = document.getElementById('management-insight-refresh');
        if (!button) return;
        var note = document.getElementById('management-insight-status');
        if (!note) {
            note = document.createElement('span');
            note.id = 'management-insight-status';
            button.insertAdjacentElement('afterend', note);
        }
        note.textContent = text || '';
    }

    function refresh() {
        if (render()) setStatus('Updated ' + new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }));
        else setStatus('Shop records are still loading. Try again in a moment.');
    }

    function whenReady(done) {
        var tries = 0;
        (function tick() {
            if (window.KreezbyDictionary && typeof window.KreezbyDictionary.productCatalog === 'function') { done(); return; }
            if (tries++ > 60) return;
            setTimeout(tick, 100);
        })();
    }

    function boot() {
        if (!document.querySelector('[data-insights-panel="management-insight"]')) return;
        var button = document.getElementById('management-insight-refresh');
        if (button && button.getAttribute('data-bound') !== '1') {
            button.setAttribute('data-bound', '1');
            button.addEventListener('click', refresh);
        }
        whenReady(render);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
    document.addEventListener('content:replaced', boot);
    // New sales or stock from any account update the insight without a reload.
    document.addEventListener('kreezby:remote-state', function () { whenReady(render); });
    document.addEventListener('kreezby:stocks-sync', function () { whenReady(render); });
})();
