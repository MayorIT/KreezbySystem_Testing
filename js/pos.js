/**
 * Point of sale for head admin, admin, and staff.
 * Walk-in sales and online orders are recorded here, and posted sales deduct finished-goods stock.
 */
(function () {
    'use strict';

    if (window.KreezbyPos) {
        window.KreezbyPos.boot();
        return;
    }

    var SALES_KEY = 'kreezby_pos_sales_v1';
    var PRODUCTS = [
        { code: 'CRK-CHO-P', name: 'Chocolate Crinkles', price: 165 },
        { code: 'CRK-ALM-P', name: 'Choco-Almond Crinkles', price: 165 },
        { code: 'CRK-LEM-P', name: 'Lemon Crinkles', price: 165 },
        { code: 'CRK-BUT-J', name: 'Choco Butternut Crinkles', price: 200 },
        { code: 'CRK-MNG-J', name: 'Mango Crinkles', price: 165 },
        { code: 'CRK-UBE-P', name: 'Ube Crinkles', price: 165 }
    ];
    var PAYMENTS = ['Cash', 'GCash', 'Check', 'Cons'];
    var cart = {};
    var applyingStock = false;

    function peso(amount) {
        return '₱' + Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function itemLines(raw) {
        var list = Array.isArray(raw) ? raw : Object.keys(raw || {}).map(function (key) { return raw[key]; });
        return list.map(function (item) {
            return {
                name: (item && item.name) || 'Item',
                qty: Number(item && (item.qty != null ? item.qty : item.quantity)) || 0,
                price: Number(item && (item.cost != null ? item.cost : item.price)) || 0
            };
        }).filter(function (line) { return line.qty > 0; });
    }

    function paymentLabel(method) {
        var key = String(method || '').toLowerCase();
        if (key === 'gcash' || key === 'paymongo' || key === 'maya') return 'GCash';
        if (key === 'cash_on_delivery' || key === 'cash') return 'Cash';
        if (key === 'check') return 'Check';
        if (key === 'cons' || key.indexOf('consign') >= 0) return 'Cons';
        return method || 'Online';
    }

    function plainName(name) {
        return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    function knownProduct(name) {
        var wanted = plainName(name);
        for (var i = 0; i < PRODUCTS.length; i++) {
            if (plainName(PRODUCTS[i].name) === wanted) return PRODUCTS[i];
        }
        return null;
    }

    function onlineOrders() {
        var rows = [];
        var seen = {};
        readJson('kreezbyOrders', []).forEach(function (order) {
            if (!order) return;
            var id = order.orderNumber || order.receiptNumber || '';
            if (!id || seen[id]) return;
            seen[id] = true;
            if (order.poCode) seen[order.poCode] = true;
            var lines = itemLines(order.items);
            var goods = lines.reduce(function (sum, line) { return sum + (line.qty * line.price); }, 0);
            rows.push({
                id: id,
                store: 'kreezbyOrders',
                customer: (order.shippingInfo && order.shippingInfo.fullName) || order.accountName || order.poEntity || 'Customer',
                when: order.date || '',
                status: order.status || 'Processing',
                payment: paymentLabel(order.paymentMethod),
                lines: lines,
                total: goods,
                posted: orderIsPosted(order, id)
            });
        });
        var purchaseOrders = readJson('kreezby-po-orders-v1', {});
        Object.keys(purchaseOrders || {}).forEach(function (code) {
            var order = purchaseOrders[code];
            if (!order || order.entityType === 'wholesaler') return;
            var id = order.code || code;
            if (!id || seen[id] || (order.shopOrderNumber && seen[order.shopOrderNumber])) return;
            seen[id] = true;
            var lines = itemLines(order.items);
            var goods = lines.reduce(function (sum, line) { return sum + (line.qty * (line.price || 0)); }, 0);
            rows.push({
                id: id,
                store: 'kreezby-po-orders-v1',
                customer: order.accountName || order.entity || 'Account',
                when: order.dateCreated || '',
                status: order.status || 'Processing',
                payment: paymentLabel(order.paymentMethod || order.payment),
                lines: lines,
                total: goods,
                posted: orderIsPosted(order, id)
            });
        });
        rows.sort(function (a, b) { return String(b.when).localeCompare(String(a.when)); });
        return rows.filter(function (row) { return row.id; });
    }

    function orderIsPosted(order, id) {
        if (order && (order.posStockPosted || order.inventoryDeducted)) return true;
        return readSales().some(function (sale) { return sale && sale.id === id; });
    }

    function readSales() {
        try {
            var rows = JSON.parse(localStorage.getItem(SALES_KEY) || '[]');
            return Array.isArray(rows) ? rows : [];
        } catch (e) {
            return [];
        }
    }

    function writeSales(rows) {
        localStorage.setItem(SALES_KEY, JSON.stringify(rows));
    }

    function todayStamp() {
        var now = new Date();
        var month = String(now.getMonth() + 1);
        var day = String(now.getDate());
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return now.getFullYear() + '-' + month + '-' + day;
    }

    function stockFor(name) {
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.productStock !== 'function') return 0;
        var qty = dict.productStock(name);
        return qty == null ? 0 : Number(qty) || 0;
    }

    function cashierName() {
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
            return session.userName || session.identity || 'Staff';
        } catch (e) {
            return 'Staff';
        }
    }

    function cartLines() {
        return PRODUCTS.filter(function (product) {
            return (cart[product.code] || 0) > 0;
        }).map(function (product) {
            var qty = cart[product.code];
            return {
                code: product.code,
                name: product.name,
                price: product.price,
                qty: qty,
                line: qty * product.price
            };
        });
    }

    function cartTotal(lines) {
        return lines.reduce(function (sum, line) { return sum + line.line; }, 0);
    }

    function setStatus(message, kind) {
        var node = document.getElementById('pos-status');
        if (!node) return;
        node.textContent = message || '';
        node.className = 'pos-status' + (kind ? ' is-' + kind : '');
    }

    function render() {
        var root = document.getElementById('pos-master');
        if (!root || root.dataset.posReady !== '1') return;
        var lines = cartLines();
        var total = cartTotal(lines);
        var sales = readSales().slice().reverse();
        var walkInSales = sales.filter(function (sale) {
            return String(sale.channel || 'Walk-in') !== 'Online';
        }).slice(0, 5);
        var productsHtml = PRODUCTS.map(function (product) {
            var stock = stockFor(product.name);
            var qty = cart[product.code] || 0;
            var soldOut = stock <= 0;
            return '<article class="pos-product' + (soldOut ? ' is-empty' : '') + '">' +
                '<h4>' + esc(product.name) + '</h4>' +
                '<p class="pos-price">' + peso(product.price) + '</p>' +
                '<p class="pos-stock">' + stock + ' in stock</p>' +
                '<div class="pos-qty">' +
                    '<button type="button" data-pos-dec="' + esc(product.code) + '" aria-label="Remove one ' + esc(product.name) + '"' + (qty ? '' : ' disabled') + '>−</button>' +
                    '<span>' + qty + '</span>' +
                    '<button type="button" data-pos-inc="' + esc(product.code) + '" aria-label="Add one ' + esc(product.name) + '"' + (qty >= stock ? ' disabled' : '') + '>+</button>' +
                '</div>' +
            '</article>';
        }).join('');
        var cartHtml = lines.length ? lines.map(function (line) {
            return '<li><span>' + esc(line.name) + ' × ' + line.qty + '</span><strong>' + peso(line.line) + '</strong></li>';
        }).join('') : '<li class="pos-empty">No items yet. Add pouches from the left.</li>';
        var historyHtml = walkInSales.length ? walkInSales.map(function (sale) {
            var summary = (sale.lines || []).map(function (line) {
                return line.qty + ' ' + line.name;
            }).join(', ');
            return '<li><div><strong>' + esc(sale.id) + '</strong><span>' + esc(sale.customer || 'Walk-in') + ' · ' + esc(sale.payment) + '</span></div>' +
                '<div><span>' + esc(summary) + '</span><strong>' + peso(sale.total) + '</strong></div></li>';
        }).join('') : '<li class="pos-empty">No walk-in sales yet.</li>';
        var onlineAll = onlineOrders();
        var online = onlineAll.slice(0, 5);
        var onlineHtml = online.length ? online.map(function (order) {
            var summary = order.lines.map(function (line) {
                return line.qty + ' ' + line.name;
            }).join(', ');
            var action = order.posted
                ? '<span class="pos-posted">Stock updated</span>'
                : '<span class="pos-pending">Updating stock</span>';
            return '<li><div><strong>' + esc(order.id) + '</strong><span>' + esc(order.customer) + ' · ' + esc(order.payment) + ' · ' + esc(order.status) + '</span></div>' +
                '<div><span>' + esc(summary || 'No items') + '</span><strong>' + peso(order.total) + '</strong></div>' +
                '<div class="pos-online-action">' + action + '</div></li>';
        }).join('') : '<li class="pos-empty">No online orders yet.</li>';
        var payment = 'Cash';
        var existingPay = document.getElementById('pos-payment');
        var existingName = document.getElementById('pos-customer');
        var existingTender = document.getElementById('pos-tender');
        if (existingPay) payment = existingPay.value || 'Cash';
        var nameValue = existingName ? existingName.value : 'Walk-in';
        var tenderValue = existingTender ? existingTender.value : '';
        root.querySelector('.pos-layout').innerHTML =
            '<section class="pos-catalog"><h3>Finished Products</h3><div class="pos-grid">' + productsHtml + '</div></section>' +
            '<section class="pos-ticket"><h3>Walk-in Sale</h3>' +
                '<label>Customer<input id="pos-customer" type="text" value="' + esc(nameValue) + '" placeholder="Walk-in"></label>' +
                '<label>Payment<select id="pos-payment">' + PAYMENTS.map(function (item) {
                    return '<option' + (item === payment ? ' selected' : '') + '>' + item + '</option>';
                }).join('') + '</select></label>' +
                '<label>Cash received<input id="pos-tender" type="number" min="0" step="0.01" value="' + esc(tenderValue) + '" placeholder="Exact amount"></label>' +
                '<ul class="pos-lines">' + cartHtml + '</ul>' +
                '<p class="pos-total"><span>Total</span><strong>' + peso(total) + '</strong></p>' +
                '<p id="pos-change" class="pos-change"></p>' +
                '<p id="pos-status" class="pos-status"></p>' +
                '<div class="pos-actions"><button type="button" id="pos-clear" class="pos-secondary">Clear</button><button type="button" id="pos-complete">Complete Sale</button></div>' +
                '<h3 class="pos-subhead">Walk-in Sales</h3>' +
                (walkInSales.length ? '<p class="pos-note">Latest ' + walkInSales.length + '</p>' : '') +
                '<ul class="pos-recent">' + historyHtml + '</ul>' +
            '</section>' +
            '<section class="pos-online"><h3>Online Orders</h3><p class="pos-note">Latest ' + online.length + (onlineAll.length > online.length ? ' of ' + onlineAll.length : '') + '</p><ul>' + onlineHtml + '</ul></section>';
        updateChange();
    }

    function updateChange() {
        var tender = document.getElementById('pos-tender');
        var note = document.getElementById('pos-change');
        var payment = document.getElementById('pos-payment');
        if (!tender || !note || !payment) return;
        var cash = payment.value === 'Cash';
        tender.parentNode.hidden = !cash;
        if (!cash) {
            note.textContent = '';
            return;
        }
        var given = Number(tender.value);
        if (!tender.value) {
            note.textContent = '';
            return;
        }
        var due = cartTotal(cartLines()) - given;
        note.textContent = due > 0 ? 'Still due ' + peso(due) : 'Change ' + peso(Math.abs(due));
    }

    function changeQty(code, delta) {
        var product = PRODUCTS.filter(function (item) { return item.code === code; })[0];
        if (!product) return;
        var stock = stockFor(product.name);
        var next = Math.max(0, (cart[code] || 0) + delta);
        if (next > stock) next = stock;
        if (next) cart[code] = next;
        else delete cart[code];
        render();
    }

    function completeSale() {
        var lines = cartLines();
        if (!lines.length) {
            setStatus('Add at least one product.', 'warn');
            return;
        }
        var short = lines.filter(function (line) { return line.qty > stockFor(line.name); });
        if (short.length) {
            setStatus(short[0].name + ' does not have enough stock.', 'warn');
            render();
            return;
        }
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.recordSale !== 'function') {
            setStatus('Inventory is not ready yet. Refresh and try again.', 'warn');
            return;
        }
        var paymentNode = document.getElementById('pos-payment');
        var nameNode = document.getElementById('pos-customer');
        var tenderNode = document.getElementById('pos-tender');
        var payment = paymentNode ? paymentNode.value : 'Cash';
        var customer = (nameNode && nameNode.value.trim()) || 'Walk-in';
        var total = cartTotal(lines);
        if (payment === 'Cash' && tenderNode && tenderNode.value && Number(tenderNode.value) < total) {
            setStatus('Cash received is less than the total.', 'warn');
            return;
        }
        var date = todayStamp();
        for (var i = 0; i < lines.length; i++) {
            var left = dict.recordSale(lines[i].name, lines[i].qty, date);
            if (left == null) {
                setStatus('Could not record ' + lines[i].name + '.', 'warn');
                render();
                return;
            }
        }
        var sales = readSales();
        var seq = String(sales.length + 1);
        while (seq.length < 4) seq = '0' + seq;
        var receipt = {
            id: 'POS-' + date.replace(/-/g, '') + '-' + seq,
            at: new Date().toISOString(),
            date: date,
            customer: customer,
            channel: 'Walk-in',
            payment: payment,
            cashier: cashierName(),
            lines: lines.map(function (line) {
                return { code: line.code, name: line.name, qty: line.qty, price: line.price };
            }),
            total: total
        };
        sales.push(receipt);
        writeSales(sales);
        cart = {};
        render();
        setStatus(receipt.id + ' saved. Stock was updated.', 'ok');
    }

    function markPosted(store, id) {
        var linked = [id];
        var orders = readJson('kreezbyOrders', []);
        orders.forEach(function (order) {
            if (!order) return;
            var orderId = order.orderNumber || order.receiptNumber;
            if (orderId === id || order.poCode === id) {
                order.posStockPosted = true;
                order.inventoryDeducted = true;
                if (order.poCode) linked.push(order.poCode);
                if (order.orderNumber) linked.push(order.orderNumber);
            }
        });
        var purchaseOrders = readJson('kreezby-po-orders-v1', {});
        Object.keys(purchaseOrders || {}).forEach(function (code) {
            var order = purchaseOrders[code];
            if (!order) return;
            var orderId = order.code || code;
            if (linked.indexOf(orderId) >= 0 || linked.indexOf(order.shopOrderNumber) >= 0) {
                order.posStockPosted = true;
                order.inventoryDeducted = true;
                if (order.shopOrderNumber) linked.push(order.shopOrderNumber);
            }
        });
        orders.forEach(function (order) {
            if (!order) return;
            if (linked.indexOf(order.orderNumber) >= 0 || linked.indexOf(order.poCode) >= 0) {
                order.posStockPosted = true;
                order.inventoryDeducted = true;
            }
        });
        localStorage.setItem('kreezbyOrders', JSON.stringify(orders));
        localStorage.setItem('kreezby-po-orders-v1', JSON.stringify(purchaseOrders));
    }

    function applyOnlineStock(order) {
        if (!order || order.posted) return { ok: true, skipped: [] };
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.recordSale !== 'function') {
            return { ok: false, message: 'Inventory is not ready yet. Refresh and try again.' };
        }
        var stockLines = [];
        var skipped = [];
        order.lines.forEach(function (line) {
            if (knownProduct(line.name)) stockLines.push(line);
            else skipped.push(line.name);
        });
        var date = String(order.when || todayStamp()).slice(0, 10) || todayStamp();
        for (var i = 0; i < stockLines.length; i++) {
            var product = knownProduct(stockLines[i].name);
            var left = dict.recordSale(product.name, stockLines[i].qty, date);
            if (left == null) return { ok: false, message: 'Could not record ' + stockLines[i].name + '.' };
        }
        markPosted(order.store, order.id);
        var sales = readSales();
        if (!sales.some(function (sale) { return sale && sale.id === order.id; })) {
            sales.push({
                id: order.id,
                at: new Date().toISOString(),
                date: date,
                customer: order.customer,
                channel: 'Online',
                payment: order.payment,
                cashier: cashierName(),
                lines: order.lines.map(function (line) {
                    var product = knownProduct(line.name);
                    return { code: product ? product.code : '', name: line.name, qty: line.qty, price: line.price };
                }),
                total: order.total
            });
            writeSales(sales);
        }
        return { ok: true, skipped: skipped };
    }

    function syncOnlineInventory() {
        if (applyingStock || !document.getElementById('pos-master')) return;
        var pending = onlineOrders().filter(function (order) { return !order.posted; });
        if (!pending.length) {
            render();
            return;
        }
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.recordSale !== 'function') {
            render();
            setStatus('Inventory is not ready yet. Refresh and try again.', 'warn');
            return;
        }
        applyingStock = true;
        var count = 0;
        var skipped = [];
        var problem = '';
        pending.forEach(function (order) {
            var result = applyOnlineStock(order);
            if (result.ok) count += 1;
            else if (result.message) problem = result.message;
            if (result.skipped && result.skipped.length) skipped = skipped.concat(result.skipped);
        });
        applyingStock = false;
        render();
        if (problem && !count) {
            setStatus(problem, 'warn');
            return;
        }
        if (!count) return;
        var note = 'Stock updated for ' + count + ' online order' + (count === 1 ? '' : 's') + '.';
        if (skipped.length) note += ' Left out of stock: ' + skipped.join(', ') + '.';
        setStatus(note, 'ok');
    }

    function onClick(event) {
        var root = document.getElementById('pos-master');
        if (!root || !event.target.closest || !event.target.closest('#pos-master')) return;
        var inc = event.target.closest('[data-pos-inc]');
        var dec = event.target.closest('[data-pos-dec]');
        if (inc) changeQty(inc.getAttribute('data-pos-inc'), 1);
        else if (dec) changeQty(dec.getAttribute('data-pos-dec'), -1);
        else if (event.target.id === 'pos-clear') {
            cart = {};
            render();
        }         else if (event.target.id === 'pos-complete') {
            completeSale();
        }
    }

    function mount() {
        var root = document.getElementById('pos-master');
        if (!root) return;
        document.body.classList.add('po-admin-page');
        var style = document.getElementById('kreezby-pos-style');
        var styleHref = '../css/pages/admin/pos-admin.css?v=20261014posside';
        if (!style) {
            style = document.createElement('link');
            style.id = 'kreezby-pos-style';
            style.rel = 'stylesheet';
            document.head.appendChild(style);
        }
        if (style.getAttribute('href') !== styleHref) style.href = styleHref;
        if (root.dataset.posReady !== '1') {
            root.dataset.posReady = '1';
            root.innerHTML = '<div class="pos-layout"></div>';
        }
        syncOnlineInventory();
    }

    if (!window.__kreezbyPosClick) {
        window.__kreezbyPosClick = true;
        document.addEventListener('click', onClick);
        document.addEventListener('input', function (event) {
            if (!event.target) return;
            if (event.target.id === 'pos-tender' || event.target.id === 'pos-payment') updateChange();
        });
        document.addEventListener('change', function (event) {
            if (event.target && event.target.id === 'pos-payment') updateChange();
        });
        document.addEventListener('kreezby:stocks-sync', function () {
            if (!applyingStock) render();
        });
        document.addEventListener('kreezby-orders-updated', syncOnlineInventory);
        document.addEventListener('kreezby:page-load', mount);
        document.addEventListener('turbo:frame-load', mount);
    }

    window.KreezbyPos = { boot: mount };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
