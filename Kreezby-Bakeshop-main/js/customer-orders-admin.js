/**
 * "Customer Orders" tab on the Orders page (head admin, admin, staff).
 * Lists every customer order with its payment method, payment status,
 * order total and the amount the customer has actually paid.
 * Data: the shared kreezbyOrders list (kept in sync with MongoDB by kreezby-db-sync.js).
 */
(function () {
    'use strict';

    if (window.__KreezbyCustomerOrdersAdmin) return;
    window.__KreezbyCustomerOrdersAdmin = true;

    var ORDERS_KEY = 'kreezbyOrders';
    var page = 1;

    function readOrders() {
        try {
            var list = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
            return Array.isArray(list) ? list.filter(Boolean) : [];
        } catch (e) {
            return [];
        }
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function money(n) {
        var num = Number(n);
        if (!isFinite(num)) num = 0;
        return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseAmount(value) {
        if (typeof value === 'number') return value;
        var num = Number(String(value || '').replace(/[^0-9.\-]/g, ''));
        return isFinite(num) ? num : 0;
    }

    function orderItems(order) {
        var raw = order.items;
        if (Array.isArray(raw)) return raw;
        if (!raw || typeof raw !== 'object') return [];
        return Object.keys(raw).map(function (k) { return raw[k]; }).filter(Boolean);
    }

    function orderTotal(order) {
        var total = parseAmount(order.total);
        if (total > 0) return total;
        return orderItems(order).reduce(function (sum, item) {
            return sum + (Number(item.cost) || 0) * (Number(item.qty) || 0);
        }, 0);
    }

    function methodLabel(order) {
        var method = String(order.paymentMethod || '').toLowerCase();
        var wallet = order.paymongo && order.paymongo.wallet ? String(order.paymongo.wallet).toLowerCase() : '';
        var labels = {
            paymongo: 'QR Ph (PayMongo)',
            qrph: 'QR Ph (PayMongo)',
            gcash: 'GCash',
            maya: 'Maya',
            paymaya: 'Maya',
            cash_on_delivery: 'Cash on delivery',
            cod: 'Cash on delivery',
            po: 'Purchase order'
        };
        if (method === 'paymongo' && wallet && wallet !== 'qrph') {
            return (labels[wallet] || wallet) + ' (PayMongo)';
        }
        return labels[method] || (order.paymentMethod ? String(order.paymentMethod) : 'Not set');
    }

    function isPaid(order) {
        var status = String(order.paymentStatus || '').toLowerCase();
        if (status === 'paid' || status === 'verified' || status === 'succeeded') return true;
        if (order.paymentVerified) return true;
        var delivered = /completed|delivered|received/i.test(String(order.status || ''));
        var cod = /cash_on_delivery|cod/i.test(String(order.paymentMethod || ''));
        return cod && delivered;
    }

    function paymentStatusLabel(order) {
        if (isPaid(order)) return 'Paid';
        if (/cash_on_delivery|cod/i.test(String(order.paymentMethod || ''))) return 'Pay on delivery';
        return 'Awaiting payment';
    }

    function customerName(order) {
        return (order.shippingInfo && order.shippingInfo.fullName) || order.accountName || order.customerName || order.poEntity || 'Customer';
    }

    function formatDate(value) {
        var d = new Date(value);
        if (isNaN(d.getTime())) return esc(value || '-');
        return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function itemsText(order) {
        var items = orderItems(order);
        if (!items.length) return '-';
        return items.map(function (item) {
            return esc(item.name || 'Item') + ' &times; ' + esc(item.qty || 0);
        }).join('<br>');
    }

    function isCustomerOrder(order) {
        var type = String(order.accountType || '').toLowerCase();
        if (type && type.indexOf('retailer') >= 0) return false;
        return !!order.orderNumber;
    }

    function filtered() {
        var input = document.getElementById('kz-customer-orders-search');
        var q = input ? String(input.value || '').trim().toLowerCase() : '';
        var list = readOrders().filter(isCustomerOrder);
        list.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
        if (!q) return list;
        return list.filter(function (order) {
            return [order.orderNumber, customerName(order), methodLabel(order), paymentStatusLabel(order), order.status, order.date]
                .join(' ').toLowerCase().indexOf(q) >= 0;
        });
    }

    function pageSize() {
        var sel = document.getElementById('kz-customer-orders-page-size');
        return sel ? Number(sel.value) || 10 : 10;
    }

    function render() {
        var body = document.getElementById('kz-customer-orders-tbody');
        if (!body) return;
        var list = filtered();
        var size = pageSize();
        var pages = Math.max(1, Math.ceil(list.length / size));
        if (page > pages) page = pages;
        var start = (page - 1) * size;
        var rows = list.slice(start, start + size);

        var count = document.getElementById('kz-customer-orders-count');
        if (count) count.textContent = list.length + (list.length === 1 ? ' order' : ' orders');

        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="10" class="kz-co-empty">No customer orders yet.</td></tr>';
        } else {
            body.innerHTML = rows.map(function (order, i) {
                var total = orderTotal(order);
                var paid = isPaid(order) ? total : 0;
                var statusLabel = paymentStatusLabel(order);
                var statusClass = statusLabel === 'Paid' ? 'is-paid' : (statusLabel === 'Pay on delivery' ? 'is-cod' : 'is-pending');
                return '<tr>' +
                    '<td class="po-col-num">' + (start + i + 1) + '</td>' +
                    '<td class="po-col-date">' + formatDate(order.date) + '</td>' +
                    '<td class="po-col-code"><strong>' + esc(order.orderNumber) + '</strong></td>' +
                    '<td class="po-col-entity">' + esc(customerName(order)) + '</td>' +
                    '<td class="po-col-items">' + itemsText(order) + '</td>' +
                    '<td>' + esc(methodLabel(order)) + '</td>' +
                    '<td><span class="kz-co-pay ' + statusClass + '">' + esc(statusLabel) + '</span></td>' +
                    '<td class="kz-co-num">' + money(total) + '</td>' +
                    '<td class="kz-co-num"><strong>' + money(paid) + '</strong></td>' +
                    '<td class="po-col-status">' + esc(order.status || 'Processing') + '</td>' +
                '</tr>';
            }).join('');
        }

        var totalPaid = list.reduce(function (sum, order) { return sum + (isPaid(order) ? orderTotal(order) : 0); }, 0);
        var footer = document.getElementById('kz-customer-orders-footer');
        if (footer) {
            footer.innerHTML =
                '<span>Total paid: <strong>' + money(totalPaid) + '</strong></span>' +
                (pages > 1
                    ? '<span class="kz-co-pager">' +
                        '<button type="button" data-kz-co-page="prev"' + (page <= 1 ? ' disabled' : '') + '>Prev</button>' +
                        ' Page ' + page + ' of ' + pages + ' ' +
                        '<button type="button" data-kz-co-page="next"' + (page >= pages ? ' disabled' : '') + '>Next</button>' +
                      '</span>'
                    : '');
        }
    }

    function injectStyle() {
        if (document.getElementById('kz-customer-orders-style')) return;
        var s = document.createElement('style');
        s.id = 'kz-customer-orders-style';
        s.textContent =
            '#kz-customer-orders-table { table-layout: auto; width: 100%; }' +
            '#kz-customer-orders-table th { white-space: normal; line-height: 1.25; }' + '#kz-customer-orders-table td.po-col-date, #kz-customer-orders-table td.po-col-code { white-space: nowrap; }' +
            '#kz-customer-orders-table th.kz-co-num, #kz-customer-orders-table td.kz-co-num { text-align: right; white-space: nowrap; }' +
            '.kz-co-empty { text-align: center; padding: 24px; color: #8d6e63; }' +
            '.kz-co-pay { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }' +
            '.kz-co-pay.is-paid { background: #e8f5e9; color: #2e7d32; }' +
            '.kz-co-pay.is-cod { background: #fff8e1; color: #8d6e00; }' +
            '.kz-co-pay.is-pending { background: #ffebee; color: #c62828; }' +
            '#kz-customer-orders-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }' +
            '.kz-co-pager button { margin: 0 4px; }';
        document.head.appendChild(s);
    }

    function init() {
        if (!document.getElementById('kz-customer-orders-tbody')) return;
        injectStyle();
        render();
        var search = document.getElementById('kz-customer-orders-search');
        if (search) search.addEventListener('input', function () { page = 1; render(); });
        var size = document.getElementById('kz-customer-orders-page-size');
        if (size) size.addEventListener('change', function () { page = 1; render(); });
        document.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('[data-kz-co-page]') : null;
            if (!btn || btn.disabled) return;
            page += btn.getAttribute('data-kz-co-page') === 'next' ? 1 : -1;
            if (page < 1) page = 1;
            render();
        });
        document.addEventListener('kreezby:remote-state', function (e) {
            var keys = e.detail && e.detail.keys;
            if (!keys || keys.indexOf(ORDERS_KEY) !== -1) render();
        });
        window.addEventListener('storage', function (e) {
            if (!e.key || e.key === ORDERS_KEY) render();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.KreezbyCustomerOrdersAdmin = { render: render };
})();
