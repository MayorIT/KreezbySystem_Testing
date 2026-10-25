/**
 * Retailer dashboard — same look as the head admin / admin operations dashboard,
 * built from the retailer's own route-sheet rows (GET /api/retailer-records, own rows only):
 *  - Sales List Summary: deliveries and collections
 *  - Order Error: Pull Out (P.O) and Replace (R) per delivery
 *  - Next Delivery: 2 weeks after the latest delivery
 */
(function () {
    'use strict';

    var RANGE_KEY = 'kreezby-retailer-dash-range';
    var NEXT_DELIVERY_DAYS = 14;
    var state = { from: '', to: '', sales: [], salesLoaded: false, salesError: '' };

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function session() {
        try { return JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}; } catch (e) { return {}; }
    }

    function storeName() {
        var s = session();
        return String(s.userName || s.name || '').trim() || 'Retailer';
    }

    function iso(date) {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function parseDay(value) {
        var text = String(value || '').slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
    }

    function inRange(day, from, to) { return !!day && day >= from && day <= to; }

    function addDays(day, n) {
        var p = day.split('-');
        var d = new Date(+p[0], +p[1] - 1, +p[2]);
        d.setDate(d.getDate() + n);
        return iso(d);
    }

    function monthBounds(day) {
        var p = day.split('-');
        return { from: iso(new Date(+p[0], +p[1] - 1, 1)), to: iso(new Date(+p[0], +p[1], 0)) };
    }

    function previousMonth(from) {
        var p = from.split('-');
        return monthBounds(iso(new Date(+p[0], +p[1] - 2, 1)));
    }

    function formatLong(day) {
        var p = day.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function shortDay(day) { return formatLong(day).replace(/, \d{4}$/, ''); }

    function money(v) {
        return '₱' + Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function count(v) { return Math.round(Number(v) || 0).toLocaleString('en-PH'); }

    function num(v) {
        var n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function cell(v) {
        if (v === 0) return '0';
        return v == null || v === '' ? '—' : esc(v);
    }

    /* ---------- data ---------- */

    function loadSales() {
        var token = session().token || '';
        if (!token) {
            state.salesLoaded = true;
            state.salesError = 'Log in again to load your deliveries.';
            return Promise.resolve();
        }
        return fetch('/api/retailer-records', {
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'X-Kreezby-Token': token }
        }).then(function (res) {
            return res.json().catch(function () { return {}; });
        }).then(function (body) {
            state.salesLoaded = true;
            if (!body || body.ok === false) {
                state.salesError = (body && body.error) || 'Could not load your deliveries.';
                return;
            }
            state.salesError = '';
            state.sales = (body.sales || []).filter(function (r) { return parseDay(r.reportDate); });
        }).catch(function () {
            state.salesLoaded = true;
            state.salesError = 'Could not reach the server.';
        });
    }

    function latestDataDay() {
        var latest = '';
        state.sales.forEach(function (r) { if (r.reportDate > latest) latest = r.reportDate; });
        return latest;
    }

    function hasSavedRange() {
        try { return !!sessionStorage.getItem(RANGE_KEY); } catch (e) { return false; }
    }

    function loadRange() {
        var saved = null;
        try { saved = JSON.parse(sessionStorage.getItem(RANGE_KEY) || 'null'); } catch (e) { saved = null; }
        if (saved && parseDay(saved.from) && parseDay(saved.to)) {
            state.from = saved.from;
            state.to = saved.to;
            return;
        }
        var today = iso(new Date());
        var latest = latestDataDay();
        var anchor = latest && latest.slice(0, 7) !== today.slice(0, 7) && latest < today ? latest : today;
        var b = monthBounds(anchor);
        state.from = b.from;
        state.to = b.to;
    }

    function saveRange() {
        try { sessionStorage.setItem(RANGE_KEY, JSON.stringify({ from: state.from, to: state.to })); } catch (e) { /* ignore */ }
    }

    function buildModel() {
        var prior = previousMonth(state.from);
        var m = { collected: 0, days: {}, prevCollected: 0, prevDays: {}, po: 0, r: 0, rows: [] };
        state.sales.forEach(function (r) {
            var day = r.reportDate;
            if (inRange(day, state.from, state.to)) {
                m.collected += num(r.collected);
                m.days[day] = true;
                m.po += num(r.po);
                m.r += num(r.replaced);
                m.rows.push(r);
            } else if (inRange(day, prior.from, prior.to)) {
                m.prevCollected += num(r.collected);
                m.prevDays[day] = true;
            }
        });
        m.rows.sort(function (a, b) { return b.reportDate.localeCompare(a.reportDate); });
        m.deliveries = Object.keys(m.days).length;
        m.prevDeliveries = Object.keys(m.prevDays).length;
        return m;
    }

    /* ---------- drawing ---------- */

    function trend(current, previous, suffix) {
        if (!current && !previous) return { cls: 'flat', text: 'No change ' + suffix };
        if (!previous && current) return { cls: 'up', text: '↑ New ' + suffix };
        var rounded = Math.round(((current - previous) / previous) * 100);
        if (!rounded) return { cls: 'flat', text: '0% ' + suffix };
        return { cls: rounded > 0 ? 'up' : 'down', text: (rounded > 0 ? '↑ ' : '↓ ') + Math.abs(rounded) + '% ' + suffix };
    }

    function setTrend(node, info) {
        if (!node) return;
        node.className = 'ops-trend ' + info.cls;
        node.textContent = info.text;
    }

    // Possible next delivery: 2 weeks after the store's latest delivery on the route sheets.
    function paintNextDelivery(valueNode, noteNode) {
        if (!valueNode || !noteNode) return;
        if (!state.salesLoaded) {
            valueNode.textContent = '…';
            noteNode.textContent = 'Checking your deliveries';
            return;
        }
        var last = latestDataDay();
        if (!last) {
            valueNode.textContent = '—';
            noteNode.textContent = 'No deliveries recorded yet';
            return;
        }
        var next = addDays(last, NEXT_DELIVERY_DAYS);
        var overdue = next < iso(new Date());
        valueNode.textContent = shortDay(next);
        noteNode.className = 'ops-trend ' + (overdue ? 'down' : 'flat');
        noteNode.textContent = overdue
            ? 'Due — 2 weeks after ' + shortDay(last)
            : '2 weeks after your last delivery (' + shortDay(last) + ')';
    }

    function emptyRow(cols, text) {
        return '<tr><td colspan="' + cols + '">' + esc(text) + '</td></tr>';
    }

    function paint(root) {
        var m = buildModel();
        var q = function (sel) { return root.querySelector(sel); };
        var waiting = !state.salesLoaded ? 'Loading…' : (state.salesError && !state.sales.length ? state.salesError : '');

        q('[data-kpi="sales"]').textContent = money(m.collected);
        q('[data-kpi="deliveries"]').textContent = count(m.deliveries);
        q('[data-kpi="po"]').textContent = count(m.po) + ' pcs';
        setTrend(q('[data-trend="sales"]'), trend(m.collected, m.prevCollected, 'vs last month'));
        setTrend(q('[data-trend="deliveries"]'), trend(m.deliveries, m.prevDeliveries, 'vs last month'));
        q('[data-trend="po"]').textContent = 'Replaced (R): ' + count(m.r) + ' pcs';
        paintNextDelivery(q('[data-kpi="next"]'), q('[data-trend="next"]'));

        var sales = m.rows.slice(0, 6);
        q('[data-recent-sales]').innerHTML = waiting ? emptyRow(6, waiting) : (sales.length
            ? sales.map(function (r) {
                return '<tr><td>' + esc(formatLong(r.reportDate)) + '</td><td>' + cell(r.cons) + '</td><td>' + cell(r.cod) +
                    '</td><td>' + cell(r.staff) + '</td><td>' + cell(r.check) + '</td><td class="rdash-num">' +
                    (num(r.collected) ? money(r.collected) : '—') + '</td></tr>';
            }).join('')
            : emptyRow(6, 'No deliveries in this range.'));

        var errors = m.rows.filter(function (r) { return num(r.po) || num(r.replaced); }).slice(0, 6);
        q('[data-order-errors]').innerHTML = waiting ? emptyRow(3, waiting) : (errors.length
            ? errors.map(function (r) {
                return '<tr><td>' + esc(formatLong(r.reportDate)) + '</td><td class="rdash-num">' + count(num(r.po)) +
                    ' pcs</td><td class="rdash-num">' + count(num(r.replaced)) + ' pcs</td></tr>';
            }).join('') +
            '<tr class="rdash-total"><td>Total in range</td><td class="rdash-num">' + count(m.po) + ' pcs</td><td class="rdash-num">' + count(m.r) + ' pcs</td></tr>'
            : emptyRow(3, 'No pull-outs or replacements in this range.'));

        var label = q('[data-range-label]');
        if (label) label.textContent = formatLong(state.from) + ' – ' + formatLong(state.to);
    }

    function bind(root) {
        if (root.dataset.rdashBound === '1') {
            paint(root);
            return;
        }
        root.dataset.rdashBound = '1';

        var welcome = root.querySelector('[data-welcome]');
        if (welcome) welcome.textContent = 'Welcome back, ' + storeName() + '! Here is the overview of your store.';

        var pop = root.querySelector('[data-range-pop]');
        var fromInput = root.querySelector('[data-from]');
        var toInput = root.querySelector('[data-to]');
        var rangeBtn = root.querySelector('[data-range-btn]');
        if (rangeBtn && pop) {
            rangeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                fromInput.value = state.from;
                toInput.value = state.to;
                pop.hidden = !pop.hidden;
            });
            pop.addEventListener('click', function (e) { e.stopPropagation(); });
            document.addEventListener('click', function () { pop.hidden = true; });
        }
        var apply = root.querySelector('[data-apply-range]');
        if (apply) apply.addEventListener('click', function () {
            if (!parseDay(fromInput.value) || !parseDay(toInput.value) || fromInput.value > toInput.value) return;
            state.from = fromInput.value;
            state.to = toInput.value;
            saveRange();
            pop.hidden = true;
            paint(root);
        });

        loadRange();
        paint(root);
        loadSales().then(function () {
            if (!hasSavedRange()) loadRange();
            paint(root);
        });
        var timer = setInterval(function () {
            if (!document.body.contains(root)) { clearInterval(timer); return; }
            if (!document.hidden) loadSales().then(function () { paint(root); });
        }, 60000);
    }

    function boot() {
        var root = document.querySelector('[data-retailer-dash]');
        if (root) bind(root);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
})();
