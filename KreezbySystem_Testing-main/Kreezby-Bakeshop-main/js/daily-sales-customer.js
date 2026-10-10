(function () {
    'use strict';

    function money(n) {
        var v = Number(n) || 0;
        return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function customerLines(order) {
        return Object.keys(order.items || {}).map(function (key) {
            var item = order.items[key] || {};
            var qty = Number(item.qty) || 0;
            var cost = Number(item.cost) || 0;
            return {
                name: item.name || 'Item',
                qty: qty,
                total: cost * qty
            };
        });
    }

    function poLines(order) {
        return (order.items || []).map(function (item) {
            var qty = Number(item.qty) || 0;
            var cost = Number(item.cost) || 0;
            var total = item.total != null ? Number(item.total) : qty * cost;
            return { name: item.name || 'Item', qty: qty, total: total };
        });
    }

    function collect() {
        var rows = [];
        readJson('kreezbyOrders', []).forEach(function (order) {
            if (!order) return;
            rows.push({
                when: order.date || '',
                code: order.orderNumber || order.receiptNumber || 'Order',
                type: order.accountType || 'Regular Customer',
                name: order.accountName || (order.shippingInfo && order.shippingInfo.fullName) || 'Customer',
                area: order.accountArea || '',
                lines: customerLines(order)
            });
        });
        var pos = readJson('kreezby-po-orders-v1', {});
        Object.keys(pos || {}).forEach(function (code) {
            var order = pos[code];
            if (!order || order.entityType === 'wholesaler') return;
            var type = order.accountType || (order.entityType === 'customer' ? 'Regular Customer' : 'Retailer');
            rows.push({
                when: order.dateCreated || '',
                code: order.code || code,
                type: type,
                name: order.accountName || order.entity || 'Account',
                area: order.accountArea || order.area || '',
                lines: poLines(order)
            });
        });
        rows.sort(function (a, b) { return String(b.when).localeCompare(String(a.when)); });
        return rows;
    }

    function render() {
        var host = document.getElementById('account-order-details');
        if (!host) return;
        var rows = collect();
        if (!rows.length) {
            host.innerHTML = '<p class="account-order-empty">Orders from a regular customer or retailer account show here with their name, area, and items.</p>';
            return;
        }
        host.innerHTML = rows.map(function (row) {
            var who = esc(row.name);
            var meta = esc(row.type) + (row.area ? ' · ' + esc(row.area) : '');
            var lines = row.lines.map(function (line) {
                return '<tr><td>' + esc(line.qty) + '</td><td>' + esc(line.name) + '</td><td style="text-align:right;">' + esc(money(line.total)) + '</td></tr>';
            }).join('');
            if (!lines) lines = '<tr><td colspan="3">No items on this order.</td></tr>';
            return '<article class="account-order-card">' +
                '<header><strong>' + who + '</strong><span>' + meta + '</span><em>' + esc(row.code) + '</em></header>' +
                '<table class="data-display-table"><thead><tr><th>Qty</th><th>Item</th><th style="text-align:right;">Total</th></tr></thead><tbody>' +
                lines + '</tbody></table></article>';
        }).join('');
    }

    function collectWalkIn() {
        var nameField = document.getElementById('cust-name-field');
        var rows = document.querySelectorAll('#sales-table-lines-injector tr');
        var items = {};
        rows.forEach(function (row, index) {
            var inputs = row.querySelectorAll('input');
            if (inputs.length < 4) return;
            var qty = Number(inputs[1].value) || 0;
            var price = Number(inputs[2].value) || 0;
            items['line-' + index] = {
                name: inputs[0].value,
                qty: qty,
                cost: price
            };
        });
        if (!Object.keys(items).length) return null;
        return {
            orderNumber: 'WALK-' + Date.now(),
            items: items,
            total: (document.getElementById('matrix-grand-total-label') || {}).textContent || '',
            accountType: 'Regular Customer',
            accountName: (nameField && nameField.value.trim()) || 'Walk-in customer',
            accountArea: '',
            status: 'Completed',
            date: new Date().toISOString(),
            paymentVerified: true
        };
    }

    function boot() {
        var title = document.querySelector('.sales-form-card .form-section-title');
        var titles = document.querySelectorAll('.sales-form-card .form-section-title');
        var saleTitle = null;
        titles.forEach(function (node) {
            if ((node.textContent || '').indexOf('Sale Details') >= 0) saleTitle = node;
        });
        if (!saleTitle) saleTitle = title;
        if (saleTitle && !document.getElementById('account-order-details')) {
            var host = document.createElement('div');
            host.id = 'account-order-details';
            saleTitle.insertAdjacentElement('afterend', host);
        }
        if (!document.getElementById('account-order-style')) {
            var style = document.createElement('style');
            style.id = 'account-order-style';
            style.textContent = '.account-order-empty{margin:0 0 18px;color:#666;font-size:13px;}' +
                '.account-order-card{border:1px solid #e6e6e6;border-radius:12px;padding:12px 14px;margin:0 0 14px;background:#fff;}' +
                '.account-order-card header{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:baseline;margin-bottom:8px;}' +
                '.account-order-card header span{color:#555;font-size:13px;}' +
                '.account-order-card header em{margin-left:auto;font-style:normal;color:#888;font-size:12px;}';
            document.head.appendChild(style);
        }
        var save = window.processCheckoutReceiptSubmission;
        window.processCheckoutReceiptSubmission = function () {
            var snapshot = collectWalkIn();
            if (typeof save === 'function') save();
            if (snapshot) {
                var orders = readJson('kreezbyOrders', []);
                orders.push(snapshot);
                localStorage.setItem('kreezbyOrders', JSON.stringify(orders));
                if (window.KreezbyDictionary && typeof window.KreezbyDictionary.recordSale === 'function') {
                    Object.keys(snapshot.items || {}).forEach(function (key) {
                        var item = snapshot.items[key];
                        window.KreezbyDictionary.recordSale(item.name, item.qty, snapshot.date.slice(0, 10));
                    });
                }
                render();
            }
        };
        render();
        window.addEventListener('storage', render);
        document.addEventListener('kreezby:page-load', render);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
