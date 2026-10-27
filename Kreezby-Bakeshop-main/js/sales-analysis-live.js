/**
 * Sales Analysis (Head Admin / Admin / Staff) — live from the shared database.
 *  - In Stock Qty:  the same finished-goods stock the Stock List, POS and customer shop use.
 *  - Sales Volume:  every sale recorded in the system (POS sales, paid online orders, manual sales).
 * It redraws by itself whenever stock, orders or sales change anywhere (another user, POS, checkout).
 */
(function () {
    'use strict';

    var STORE_KEY = 'kreezby_data_dictionary_v1';
    var ARCHIVE_KEY = 'kreezby_archived_stock';
    var FLAVORS = [
        { id: 'CRK-CHO-P', name: 'Chocolate Crinkles', core: true },
        { id: 'CRK-ALM-P', name: 'Choco-Almond Crinkles', core: true },
        { id: 'CRK-CSH-P', name: 'Choco-Cashew Crinkles' },
        { id: 'CRK-STR-P', name: 'Strawberry Crinkles' },
        { id: 'CRK-RV-P', name: 'Red Velvet Crinkles' },
        { id: 'CRK-LEM-P', name: 'Lemon Crinkles', core: true },
        { id: 'CRK-MEL-P', name: 'Melon Crinkles' },
        { id: 'CRK-PAN-P', name: 'Pandan Crinkles' },
        { id: 'CRK-UBE-P', name: 'Ube Crinkles', core: true },
        { id: 'CRK-MNG-J', name: 'Mango Crinkles', core: true },
        { id: 'CRK-BUT-J', name: 'Choco Butternut Crinkles', core: true },
        { id: 'CRK-AST-P', name: 'Assorted Crinkles' }
    ];

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function fmt(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

    function plain(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

    function collect() {
        var saved = readJson(STORE_KEY, {}) || {};
        var dict = window.KreezbyDictionary;
        var stock = {};
        var sold = {};
        var names = {};
        FLAVORS.forEach(function (f) { names[f.id] = f.name; });

        // stock: the same numbers the Stock List shows
        var map = saved.product_stock || {};
        Object.keys(map).forEach(function (id) { stock[id] = Number(map[id]) || 0; });
        FLAVORS.forEach(function (f) {
            if (dict && typeof dict.productStock === 'function') {
                var live = dict.productStock(f.name);
                if (live != null) stock[f.id] = Number(live) || 0;
            }
        });

        // sales: every recorded sale
        var rows = [];
        if (dict && typeof dict.salesTransactions === 'function') rows = dict.salesTransactions() || [];
        else rows = saved.sales_transactions_extra || [];
        rows.forEach(function (row) {
            if (!row || !row.product_id) return;
            sold[row.product_id] = (sold[row.product_id] || 0) + (Number(row.quantity_sold) || 0);
        });

        var extra = {};
        (saved.products_extra || []).forEach(function (item) {
            if (item && item.product_id) { extra[item.product_id] = true; if (item.product_name) names[item.product_id] = item.product_name; }
        });

        var archived = readJson(ARCHIVE_KEY, []);
        var hidden = {};
        (Array.isArray(archived) ? archived : []).forEach(function (label) { hidden[plain(label)] = true; });

        var ids = [];
        function add(id) { if (id && ids.indexOf(id) < 0) ids.push(id); }
        FLAVORS.forEach(function (f) {
            if (f.core || extra[f.id] || stock[f.id] > 0 || sold[f.id] > 0) add(f.id);
        });
        Object.keys(extra).forEach(add);
        Object.keys(sold).forEach(add);

        var list = ids.filter(function (id) {
            var n = names[id] || id;
            return !(hidden[plain(n)] || hidden[plain(n.replace(/\s*crinkles$/i, ''))]) || sold[id] > 0;
        }).map(function (id) {
            return { id: id, name: names[id] || id, stock: stock[id] || 0, sales: sold[id] || 0 };
        });
        list.sort(function (a, b) { return b.sales - a.sales || b.stock - a.stock || a.name.localeCompare(b.name); });
        return list;
    }

    var timer = null;
    var lastSig = '';

    function paint(force) {
        var table = document.getElementById('sales-analysis-table');
        if (!table) return;
        var body = table.querySelector('tbody');
        if (!body) return;
        var list = collect();
        var sig = JSON.stringify(list);
        if (!force && sig === lastSig && body.children.length) return;
        lastSig = sig;
        if (!list.length) {
            body.innerHTML = '<tr data-stock="0" data-sales="0"><td colspan="4" style="text-align:center;padding:22px;color:#8d6e63">No flavors recorded yet.</td></tr>';
        } else {
            body.innerHTML = list.map(function (item, i) {
                return '<tr data-stock="' + item.stock + '" data-sales="' + item.sales + '">' +
                    '<td class="po-col-num">' + (i + 1) + '</td>' +
                    '<td class="sa-flavor"><strong>' + esc(item.name) + '</strong></td>' +
                    '<td class="sa-num">' + fmt(item.stock) + '</td>' +
                    '<td class="sa-num">' + fmt(item.sales) + '</td></tr>';
            }).join('');
        }
        var totals = document.getElementById('sales-analysis-totals');
        if (totals) {
            var s = list.reduce(function (n, x) { return n + x.stock; }, 0);
            var v = list.reduce(function (n, x) { return n + x.sales; }, 0);
            totals.textContent = fmt(s) + ' stock · ' + fmt(v) + ' sales';
        }
        // let the page's own search / "show" controls re-apply to the fresh rows
        var search = document.getElementById('sales-analysis-search');
        if (search) {
            try { search.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { /* optional */ }
        }
    }

    function queue(force) {
        if (timer) return;
        timer = setTimeout(function () { timer = null; paint(force); }, 120);
    }

    function boot() { queue(true); }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    ['kreezby:page-load', 'content:replaced', 'turbo:frame-load', 'kreezby-orders-updated', 'kreezby:stocks-sync'].forEach(function (name) {
        document.addEventListener(name, function () { queue(false); });
    });
    document.addEventListener('kreezby:remote-state', function (e) {
        var keys = (e && e.detail && e.detail.keys) || [];
        if (keys.some(function (k) { return k === STORE_KEY || k === 'kreezbyOrders' || k === 'kreezby_pos_sales_v1' || k === ARCHIVE_KEY; })) queue(false);
    });
    window.addEventListener('storage', function (e) {
        if (!e.key || e.key === STORE_KEY || e.key === 'kreezbyOrders' || e.key === 'kreezby_pos_sales_v1') queue(false);
    });
    setInterval(function () { if (!document.hidden) queue(false); }, 15000);
    window.KreezbySalesAnalysis = { refresh: function () { paint(true); } };
})();
