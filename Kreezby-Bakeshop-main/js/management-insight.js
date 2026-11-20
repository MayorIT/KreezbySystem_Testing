/**
 * Management Insight (head admin, admin and staff · Insights > Management Insight).
 * Summarizes notable sales, inventory and production conditions in simple language for the owner.
 * Four parts, all worked out from the shop's own records (sales, stock, batches, alerts):
 *   1. Summary of sales performance
 *   2. Inventory conditions
 *   3. Identified business situations
 *   4. Interpretation of the generated insights (written by GPT-4o mini on the server)
 *
 * Opening the page does NOT write a new interpretation. The last saved one is shown.
 * A new one is written only when:
 *   - the Refresh button is clicked, or
 *   - a new sale was recorded (by head admin, admin, staff, or a completed order) since the saved one.
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
            + '.mi-wrap{display:grid;gap:12px;}'
            + '.mi-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 12px;border-radius:10px;background:#fbf6f2;border:1px solid #f0e4d2;font-size:12px;color:#6d5a4e;}'
            + '.mi-meta b{color:#3e2723;}'
            + '.mi-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;}'
            + '.mi-pill.ok{background:#e8f5e9;color:#2e7d32;}.mi-pill.busy{background:#fff3e0;color:#e65100;}.mi-pill.bad{background:#ffebee;color:#c62828;}'
            + '.mi-card{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:6px 18px;}'
            + '.mi-sec{display:grid;grid-template-columns:120px minmax(0,1fr);gap:6px 18px;padding:14px 0;border-bottom:1px solid #f1e7dc;}'
            + '.mi-sec:last-child{border-bottom:0;}'
            + '.mi-sec h4{margin:0;font-size:14px;font-weight:700;color:#5d4037;line-height:1.5;}'
            + '.mi-sec p{margin:0;font-size:14px;line-height:1.55;color:#3e2723;}'
            + '.mi-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}'
            + '.mi-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;background:#fffaf3;border:1px solid #f0e4d2;font-size:12px;color:#5d4037;white-space:nowrap;}'
            + '.mi-chip b{color:#3e2723;}'
            + '.mi-chip.ok{background:#e8f5e9;border-color:#c8e6c9;color:#2e7d32;}.mi-chip.warn{background:#fff3e0;border-color:#ffe0b2;color:#e65100;}.mi-chip.bad{background:#ffebee;border-color:#ffcdd2;color:#c62828;}'
            + '.mi-chip.ok b,.mi-chip.warn b,.mi-chip.bad b{color:inherit;}'
            + '.mi-note{margin:0 2px;font-size:12px;line-height:1.5;color:#7a6558;}'
            + '.mi-empty{font-size:13px;color:#7a6558;margin:0;}'
            + '.mi-loading{opacity:.55;}'
            + '@media (max-width:600px){.mi-card{padding:4px 14px;}.mi-sec{grid-template-columns:minmax(0,1fr);gap:4px;padding:12px 0;}.mi-chip{white-space:normal;}}';
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

    // Which flavors to bake first (out of stock or running low, best sellers first) and which can wait.
    function productionPlan(data) {
        var bakeFirst = data.items.filter(function (i) {
            return (i.stock <= 0 && i.sold30 > 0) || (i.stock > 0 && i.daysCover != null && i.daysCover <= 7);
        }).sort(function (a, b) { return b.sold30 - a.sold30 || a.name.localeCompare(b.name); });
        var holdOff = data.items.filter(function (i) {
            return i.stock > 0 && (i.sold30 === 0 || (i.daysCover != null && i.daysCover > 30));
        }).sort(function (a, b) { return b.stock - a.stock; });
        return { bakeFirst: bakeFirst, holdOff: holdOff };
    }

    // Owner summary in simple words: Sales, Inventory, Production.
    function interpretation(data, found) {
        var t = data.totals;
        var lines = [];
        var change = pct(t.sold30, t.soldPrev30);

        // Sales
        if (!t.sold30) {
            lines.push({ label: 'Sales', text: 'No sales were recorded in the last 30 days.' });
        } else {
            var trend = change == null ? 'This is the first month with sales.'
                : change > 0 ? 'That is more than last month (up ' + change + '%).'
                : change < 0 ? 'That is less than last month (down ' + Math.abs(change) + '%).'
                : 'That is the same as last month.';
            var topSeller = data.items.slice().sort(function (a, b) { return b.sold30 - a.sold30; })[0];
            lines.push({ label: 'Sales', text: 'You sold ' + plural(t.sold30, 'pouch', 'pouches') + ' worth about ' + peso(t.revenue30) + ' in the last 30 days. ' + trend
                + (topSeller && topSeller.sold30 > 0 ? ' ' + short(topSeller.name) + ' sold the most.' : '') });
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

        // Production
        var plan = productionPlan(data);
        var prodParts = [];
        if (!t.sold30 && !t.stock) {
            prodParts.push('Record more sales before changing the production plan.');
        } else {
            if (plan.bakeFirst.length) prodParts.push('Bake ' + joinNames(plan.bakeFirst.slice(0, 3)) + ' first, since ' + (plan.bakeFirst.length === 1 ? 'it is' : 'they are') + ' out of stock or running low.');
            if (plan.holdOff.length) prodParts.push('No need to bake ' + joinNames(plan.holdOff.slice(0, 3)) + ' for now; ' + (plan.holdOff.length === 1 ? 'it has' : 'they have') + ' enough stock.');
            if (!plan.bakeFirst.length && !plan.holdOff.length) prodParts.push('No extra baking is needed right now; every flavor has enough stock.');
            if (data.lowMaterials.length) prodParts.push('Restock the low raw or packaging materials before the next batch.');
        }
        lines.push({ label: 'Production', text: prodParts.join(' ') });

        return { lines: lines };
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
        var found = situations(data);
        var reading = interpretation(data, found);
        var stocked = ranked.filter(function (i) { return i.stock > 0 || i.sold30 > 0; });
        var states = { bad: 0, warn: 0, ok: 0, info: 0 };
        stocked.forEach(function (i) { states[stockState(i).cls] += 1; });
        var priority = { bad: 0, warn: 1, ok: 2, info: 3 };
        var topFound = found.slice().sort(function (a, b) { return priority[a.cls] - priority[b.cls]; });
        var best = ranked[0] && ranked[0].sold30 > 0 ? ranked[0] : null;

        var plan = productionPlan(data);
        var text = currentReading(reading);
        var loading = ai.status === 'loading' && ai.result ? ' class="mi-loading"' : '';
        var outFlavors = ranked.filter(function (i) { return i.stock <= 0 && i.sold30 > 0; }).length;

        var salesChips = [
            chip(count(t.sold30) + ' pouches sold'),
            chip(peso(t.revenue30)),
            change == null ? '' : chip((change >= 0 ? '▲ ' : '▼ ') + Math.abs(change) + '% vs last month', change >= 0 ? 'ok' : 'bad'),
            best ? chip('Top: ' + esc(short(best.name))) : ''
        ];
        var invChips = [
            chip(count(t.stock) + ' pouches in stock'),
            outFlavors ? chip(plural(outFlavors, 'flavor') + ' out of stock', 'bad') : '',
            states.warn ? chip(plural(states.warn, 'flavor') + ' running low', 'warn') : '',
            data.expired.length ? chip(plural(data.expired.length, 'batch', 'batches') + ' expired', 'bad') : '',
            data.nearExpiry.length ? chip(plural(data.nearExpiry.length, 'batch', 'batches') + ' near expiry', 'warn') : '',
            (!outFlavors && !states.warn && !data.expired.length && !data.nearExpiry.length) ? chip('Stock levels are fine', 'ok') : ''
        ];
        var prodChips = plan.bakeFirst.slice(0, 4).map(function (i) { return chip('Bake: ' + esc(short(i.name)), 'warn'); })
            .concat(plan.holdOff.slice(0, 3).map(function (i) { return chip('Wait: ' + esc(short(i.name))); }));
        if (data.lowMaterials.length) prodChips.push(chip(plural(data.lowMaterials.length, 'material') + ' low', 'warn'));
        if (!prodChips.length) prodChips.push(chip('Nothing extra to bake', 'ok'));

        var html = '<div class="mi-wrap">' + metaHtml();
        html += '<div class="mi-card"' + loading + '>'
            + section('Sales', text ? text.sales : null, salesChips)
            + section('Inventory', text ? text.inventory : null, invChips)
            + section('Production', text ? text.production : null, prodChips)
            + '</div>';
        if (ai.error && text) html += '<p class="mi-note">' + esc(ai.error) + ' The system\'s own summary is shown.</p>';
        else if (ai.usedFallback && ai.result) html += '<p class="mi-note">GPT-4o mini\'s reply used figures that are not in the shop records, so the system\'s own summary is shown. Both are kept in View History.</p>';
        html += '<p class="mi-note">Figures are calculated by the system from the shop\'s records (last 30 days). The sentences are written by GPT-4o mini from those figures and checked against them. The AI cannot change any record.</p>';
        html += '</div>';

        body.innerHTML = html;
        lastInput = aiInput(data, ranked, states, topFound, change);
        lastReading = reading;
        setButton();
        return true;
    }

    function chip(label, cls) {
        return '<span class="mi-chip' + (cls ? ' ' + cls : '') + '">' + label + '</span>';
    }

    function section(label, sentence, chips) {
        var body = sentence
            ? '<p>' + esc(sentence) + '</p>'
            : '<p class="mi-empty">' + (ai.status === 'loading' ? 'GPT-4o mini is writing this part…' : 'Loading the saved insight…') + '</p>';
        return '<section class="mi-sec"><h4>' + label + '</h4><div>' + body
            + '<div class="mi-chips">' + chips.filter(Boolean).join('') + '</div></div></section>';
    }

    // ---------- 4. interpretation by GPT-4o mini ----------
    // Parts 1-3 are worked out here from the shop's records. Those figures go to the server, where
    // GPT-4o mini writes the owner's interpretation. Each reply is saved in the output history.

    function aiInput(data, ranked, states, found, change) {
        var t = data.totals;
        return {
            asOf: isoDay(data.asOf),
            periods: { shortDays: 7, longDays: 30, previousDays: 30 },
            totals: {
                sold7: t.sold7,
                sold30: t.sold30,
                soldPrev30: t.soldPrev30,
                changePct: change,
                revenue30: Math.round(t.revenue30 * 100) / 100,
                stock: t.stock
            },
            flavors: ranked.map(function (i) {
                return {
                    name: i.name,
                    price: i.price,
                    stock: i.stock,
                    sold7: i.sold7,
                    sold30: i.sold30,
                    soldPrev30: i.soldPrev30,
                    sharePct: t.sold30 ? Math.round(i.sold30 / t.sold30 * 100) : 0,
                    perDay: Math.round(i.perDay * 10) / 10,
                    daysLeft: i.daysCover == null ? null : Math.max(1, Math.round(i.daysCover)),
                    stockState: stockState(i).label
                };
            }),
            flavorStates: { outOfStock: states.bad, low: states.warn, healthy: states.ok, other: states.info },
            alerts: {
                expired: data.expired.map(function (a) { return a.message; }),
                nearExpiry: data.nearExpiry.map(function (a) { return a.message; }),
                lowMaterials: data.lowMaterials.map(function (a) { return a.message; })
            },
            production: (function () {
                var plan = productionPlan(data);
                return {
                    bakeFirst: plan.bakeFirst.map(function (i) { return i.name; }),
                    holdOff: plan.holdOff.map(function (i) { return i.name; }),
                    lowMaterials: data.lowMaterials.length
                };
            })(),
            situations: found.map(function (s) {
                var tag = s.cls === 'bad' ? 'Urgent' : s.cls === 'warn' ? 'Watch' : s.cls === 'ok' ? 'Good' : 'Note';
                return { level: tag, title: s.title, detail: s.text };
            })
        };
    }

    function stamp(date) {
        if (!date) return '';
        var d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function byLabel(who) {
        if (!who || !who.name) return '';
        return who.name + (who.role ? ' (' + who.role + ')' : '');
    }

    // One line above the insight: when the interpretation was written, by whom, and whether
    // it still matches the shop's sales.
    function metaHtml() {
        var parts = [];
        if (ai.status === 'loading') {
            parts.push('<span class="mi-pill busy">' + (ai.trigger === 'new-sales' ? 'New sales recorded · updating' : 'Writing') + '…</span>');
        } else if (ai.result) {
            var stale = ai.salesKey && currentSalesKey() !== ai.salesKey;
            parts.push(stale ? '<span class="mi-pill busy">New sales recorded</span>' : '<span class="mi-pill ok">Up to date with sales</span>');
        } else if (ai.status === 'error') {
            parts.push('<span class="mi-pill bad">Not written</span>');
        } else {
            parts.push('<span class="mi-pill busy">Loading saved insight…</span>');
        }
        if (ai.at) parts.push('Written <b>' + esc(stamp(ai.at)) + '</b>' + (byLabel(ai.by) ? ' by <b>' + esc(byLabel(ai.by)) + '</b>' : ''));
        parts.push('Figures cover the last 30 days');
        return '<div class="mi-meta">' + parts.join('<span aria-hidden="true">·</span>') + '</div>';
    }

    // The system's own reading, used when GPT-4o mini cannot answer or its reply does not match the figures.
    function systemReading(reading) {
        var pick = function (label) {
            var line = reading.lines.filter(function (l) { return l.label === label; })[0];
            return line ? line.text : '';
        };
        return { sales: pick('Sales'), inventory: pick('Inventory'), production: pick('Production') };
    }

    // The sentences to show: GPT-4o mini's when written, otherwise the system's own.
    // An older saved insight (before Production was added) gets the system's Production line.
    function currentReading(reading) {
        var own = systemReading(reading);
        if (ai.result) {
            return {
                sales: ai.result.sales || own.sales,
                inventory: ai.result.inventory || own.inventory,
                production: ai.result.production || own.production
            };
        }
        if (ai.status === 'error') return own;
        return null;
    }

    function sessionToken() {
        try { return (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { return ''; }
    }

    function authHeaders() {
        var headers = { 'Content-Type': 'application/json' };
        var token = sessionToken();
        if (token) headers['X-Kreezby-Token'] = token;
        return headers;
    }

    function panelVisible() {
        var panel = document.querySelector('[data-insights-panel="management-insight"]');
        return !!panel && !panel.hidden;
    }

    // A short code for "which sales exist". It changes only when a sale is added, changed or removed,
    // so stock moves, page opens and tab switches do not ask GPT-4o mini for a new interpretation.
    function currentSalesKey() {
        var dict = window.KreezbyDictionary;
        var rows = dict && typeof dict.salesTransactions === 'function' ? dict.salesTransactions() : [];
        var text = rows.map(function (r) {
            return [r.product_id, String(r.sales_date || '').slice(0, 19), n(r.quantity_sold), r.transaction_id || r.sales_id || r.order_id || r.id || ''].join('|');
        }).sort().join('\n');
        var h = 5381;
        for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
        return 's' + rows.length + '-' + (h >>> 0).toString(36);
    }

    function setButton() {
        var button = document.getElementById('management-insight-refresh');
        if (!button) return;
        var busy = ai.status === 'loading';
        button.disabled = busy;
        button.textContent = busy ? 'Refreshing…' : 'Refresh';
        button.title = 'Write a new interpretation from the latest figures';
        var old = document.getElementById('management-insight-status');
        if (old) old.remove();
    }

    // ---------- saved interpretation ----------
    var lastInput = null;
    var lastReading = null;
    var ai = { status: 'idle', result: null, at: null, by: null, usedFallback: false, model: '', error: '', salesKey: '', trigger: '' };
    var savedLoaded = false;      // the last saved interpretation was fetched from the server
    var savedLoading = null;
    var aiRequestId = 0;
    var checkTimer = null;

    function adopt(record) {
        ai.result = record.shown || record.interpretation || null;
        ai.at = record.createdAt ? new Date(record.createdAt) : new Date();
        ai.by = record.generatedBy || null;
        ai.usedFallback = !!record.usedFallback;
        ai.model = record.model || '';
        ai.salesKey = record.salesKey || '';
    }

    function loadSaved() {
        if (savedLoaded) return Promise.resolve();
        if (savedLoading) return savedLoading;
        savedLoading = fetch('/api/ai-latest?module=management-insight', { headers: authHeaders() })
            .then(function (res) { return res.json().catch(function () { return {}; }); })
            .then(function (data) {
                if (data && data.ok && data.record && data.record.shown && !ai.result) {
                    adopt(data.record);
                    ai.status = 'done';
                }
            })
            .catch(function () { /* nothing saved can be read; a new one is written below */ })
            .then(function () { savedLoaded = true; savedLoading = null; render(); });
        return savedLoading;
    }

    // Writes a new interpretation. trigger: "manual" (Refresh), "new-sales" or "first".
    function generate(trigger) {
        var id = ++aiRequestId;
        ai.status = 'loading';
        ai.trigger = trigger;
        ai.error = '';
        if (!render() || !lastInput || !lastReading) {
            ai.status = ai.result ? 'done' : 'error';
            ai.error = 'Shop records are still loading. Try Refresh in a moment.';
            render();
            return;
        }
        var key = currentSalesKey();
        var fetchOpts = {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ data: lastInput, fallback: systemReading(lastReading), salesKey: key, trigger: trigger })
        };
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) fetchOpts.signal = AbortSignal.timeout(22000);
        fetch('/api/management-insight', fetchOpts).then(function (res) {
            return res.json().catch(function () { return {}; });
        }).then(function (data) {
            if (id !== aiRequestId) return;
            if (data && data.ok && data.interpretation) {
                adopt({
                    interpretation: data.interpretation,
                    createdAt: data.createdAt,
                    generatedBy: data.generatedBy,
                    usedFallback: data.usedFallback,
                    model: data.model,
                    salesKey: data.salesKey || key
                });
                ai.status = 'done';
                ai.error = data.error || '';
                if (data.historyId && !data.reused) document.dispatchEvent(new CustomEvent('kreezby:ai-history-changed', { detail: { module: 'management-insight' } }));
            } else {
                ai.status = ai.result ? 'done' : 'error';
                ai.error = (data && data.error) || 'The management insight could not be written just now.';
            }
            render();
        }).catch(function () {
            if (id !== aiRequestId) return;
            ai.status = ai.result ? 'done' : 'error';
            ai.error = 'The management insight could not be written just now.';
            render();
        });
    }

    // Only writes a new interpretation when there is none yet, or the sales changed since the saved one.
    function checkForNewSales() {
        if (!panelVisible() || !savedLoaded || ai.status === 'loading') return;
        if (!ai.result) {
            if (ai.status !== 'error') generate('first');
            return;
        }
        if (ai.salesKey !== currentSalesKey()) generate('new-sales');
        else if (!ai.result.production && ai.status !== 'error') generate('manual');
    }

    // Waits a moment so the latest shop records from the server have arrived before comparing sales.
    function scheduleCheck(delay) {
        if (checkTimer) clearTimeout(checkTimer);
        checkTimer = setTimeout(function () {
            checkTimer = null;
            checkForNewSales();
        }, delay);
    }

    function open() {
        whenReady(function () {
            if (!render() || !panelVisible()) return;
            loadSaved().then(function () { scheduleCheck(2000); });
        });
    }

    function refresh() {
        if (ai.status === 'loading') return;
        whenReady(function () { generate('manual'); });
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
        open();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
    document.addEventListener('content:replaced', boot);
    // New records from any account update parts 1-3 right away. The interpretation is rewritten
    // only if a sale was added (checked a moment later, once the records settle).
    function onRecords() {
        whenReady(function () {
            if (!render()) return;
            if (savedLoaded) scheduleCheck(2500);
        });
    }
    document.addEventListener('kreezby:remote-state', onRecords);
    document.addEventListener('kreezby:stocks-sync', onRecords);
    // Opening the Management Insight tab shows the saved interpretation (no new one is written).
    document.addEventListener('kreezby:insights-tab', function (event) {
        if (!event.detail || event.detail.key !== 'management-insight') return;
        open();
    });
})();
