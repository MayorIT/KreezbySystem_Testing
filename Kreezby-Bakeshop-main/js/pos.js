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
    // Every flavor Kreezby makes. The POS grid below shows the ones that are active in the database.
    var ALL_PRODUCTS = [
        { code: 'CRK-CHO-P', name: 'Chocolate Crinkles', price: 165, photo: 'crinkle-chocolate.jpg' },
        { code: 'CRK-ALM-P', name: 'Choco-Almond Crinkles', price: 165, photo: 'choco-almond-crinkles.jpg' },
        { code: 'CRK-CSH-P', name: 'Choco-Cashew Crinkles', price: 165, photo: 'choco-cashew-crinkles.jpg' },
        { code: 'CRK-STR-P', name: 'Strawberry Crinkles', price: 165, photo: 'strawberry-crinkles.jpg' },
        { code: 'CRK-RV-P', name: 'Red Velvet Crinkles', price: 165, photo: 'red-velvet-crinkles.jpg' },
        { code: 'CRK-LEM-P', name: 'Lemon Crinkles', price: 165, photo: 'lemon-crinkles.jpg' },
        { code: 'CRK-MEL-P', name: 'Melon Crinkles', price: 165, photo: 'melon-crinkles.jpg' },
        { code: 'CRK-PAN-P', name: 'Pandan Crinkles', price: 165, photo: 'pandan-crinkles.jpg' },
        { code: 'CRK-UBE-P', name: 'Ube Crinkles', price: 165, photo: 'ube-crinkles.jpg' },
        { code: 'CRK-MNG-J', name: 'Mango Crinkles', price: 165, photo: 'mango-crinkles.jpg' },
        { code: 'CRK-BUT-J', name: 'Choco Butternut Crinkles', price: 200, photo: 'crinkle-choco-butternut.jpg' },
        { code: 'CRK-AST-P', name: 'Assorted Crinkles', price: 165, photo: 'assorted-crinkles.jpg' }
    ];
    var CORE_CODES = ['CRK-CHO-P', 'CRK-ALM-P', 'CRK-LEM-P', 'CRK-BUT-J', 'CRK-MNG-J', 'CRK-UBE-P'];
    var PRODUCTS = ALL_PRODUCTS.filter(function (item) { return CORE_CODES.indexOf(item.code) >= 0; });

    /* The sale list follows the database: the six core flavors, every flavor registered on the
       Stock List (products_extra) and any flavor that has pouches in stock. Archived flavors are hidden. */
    function syncProducts() {
        var saved = readJson('kreezby_data_dictionary_v1', {}) || {};
        var stock = saved.product_stock || {};
        var prices = saved.product_prices || {};
        var archived = readJson('kreezby_archived_stock', []);
        if (!Array.isArray(archived)) archived = [];
        var hidden = {};
        archived.forEach(function (label) { hidden[plainName(label)] = true; });
        var wanted = {};
        CORE_CODES.forEach(function (code) { wanted[code] = true; });
        (saved.products_extra || []).forEach(function (extra) { if (extra && extra.product_id) wanted[extra.product_id] = true; });
        Object.keys(stock).forEach(function (code) { if (Number(stock[code]) > 0) wanted[code] = true; });
        var next = ALL_PRODUCTS.filter(function (item) {
            return wanted[item.code] && !hidden[plainName(item.name)] && !hidden[plainName(item.name.replace(/\s*crinkles$/i, ''))];
        });
        // a flavor registered under an id the POS does not know yet still gets a card
        (saved.products_extra || []).forEach(function (extra) {
            if (!extra || !extra.product_id || !extra.product_name) return;
            if (ALL_PRODUCTS.some(function (item) { return item.code === extra.product_id; })) return;
            if (hidden[plainName(extra.product_name)]) return;
            next.push({ code: extra.product_id, name: extra.product_name, price: Number(extra.price) || 165, photo: 'assorted-crinkles.jpg' });
        });
        next.forEach(function (item) {
            var custom = Number(prices[item.code]);
            if (custom > 0) item.price = custom;
        });
        var same = next.length === PRODUCTS.length && next.every(function (item, i) { return PRODUCTS[i] && PRODUCTS[i].code === item.code && PRODUCTS[i].price === item.price; });
        if (same) return;
        PRODUCTS.length = 0;
        next.forEach(function (item) { PRODUCTS.push(item); });
    }
    var PAYMENTS = ['Cash', 'GCash'];
    var cart = {};
    var applyingStock = false;
    var weekOpen = false;
    var editingId = '';
    var pendingDelete = '';
    var actionMenuId = '';
    var primeEdit = false;
    var editCustomer = '';
    var editPayment = 'Cash';
    var editTender = '';

    function peso(amount) {
        return '₱' + Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function flavorPhoto(file) {
        var path = (location.pathname || '').replace(/\\/g, '/');
        var prefix = /\/(?:admin_names|staff_names)\/[^/]+\//i.test(path) ? '../../' : '../';
        return prefix + 'customer/flavors/' + file;
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
        for (var i = 0; i < ALL_PRODUCTS.length; i++) {
            if (plainName(ALL_PRODUCTS[i].name) === wanted) return ALL_PRODUCTS[i];
        }
        for (var j = 0; j < PRODUCTS.length; j++) {
            if (plainName(PRODUCTS[j].name) === wanted) return PRODUCTS[j];
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

    function stampFromDate(date) {
        var month = String(date.getMonth() + 1);
        var day = String(date.getDate());
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return date.getFullYear() + '-' + month + '-' + day;
    }

    function todayStamp() {
        return stampFromDate(new Date());
    }

    function dayKey(value) {
        var text = String(value || '');
        var match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) return match[1] + '-' + match[2] + '-' + match[3];
        var parsed = new Date(text);
        if (isNaN(parsed.getTime())) return '';
        return stampFromDate(parsed);
    }

    function prettyDay(key) {
        var parts = String(key || '').split('-');
        if (parts.length < 3) return key;
        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function finishedPurchase(lines, fallbackTotal) {
        var qty = 0;
        var amount = 0;
        var matched = false;
        (lines || []).forEach(function (line) {
            var product = knownProduct(line.name);
            if (!product && line.code) {
                product = ALL_PRODUCTS.concat(PRODUCTS).filter(function (item) { return item.code === line.code; })[0] || null;
            }
            if (!product) return;
            matched = true;
            var count = Number(line.qty) || 0;
            var price = Number(line.price) || product.price || 0;
            qty += count;
            amount += count * price;
        });
        if (!matched) amount = Number(fallbackTotal) || 0;
        return { qty: qty, amount: amount };
    }

    function lastSevenDays() {
        var days = [];
        var now = new Date();
        now.setHours(12, 0, 0, 0);
        for (var i = 0; i < 7; i++) {
            var day = new Date(now);
            day.setDate(now.getDate() - i);
            days.push(stampFromDate(day));
        }
        return days;
    }

    function weekPurchases() {
        var days = lastSevenDays();
        var totals = {};
        days.forEach(function (day) { totals[day] = { amount: 0, qty: 0 }; });
        var seen = {};
        function add(id, when, lines, fallbackTotal) {
            if (id && seen[id]) return;
            if (id) seen[id] = true;
            var key = dayKey(when);
            if (!totals[key]) return;
            var purchase = finishedPurchase(lines, fallbackTotal);
            totals[key].amount += purchase.amount;
            totals[key].qty += purchase.qty;
        }
        readSales().forEach(function (sale) {
            if (!sale) return;
            add(sale.id, sale.date || sale.at, sale.lines, sale.total);
        });
        onlineOrders().forEach(function (order) {
            add(order.id, order.when, order.lines, order.total);
        });
        return days.map(function (day) {
            return { date: day, amount: totals[day].amount, qty: totals[day].qty };
        });
    }

    function weekPurchasesHtml() {
        return '<ul class="pos-week">' + weekPurchases().map(function (row) {
            var pouches = row.qty + (row.qty === 1 ? ' pouch' : ' pouches');
            return '<li><span>' + esc(prettyDay(row.date)) + '</span><strong>' + peso(row.amount) + '</strong><em>' + esc(pouches) + '</em></li>';
        }).join('') + '</ul>';
    }

    function stockFor(name) {
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.productStock !== 'function') return 0;
        var qty = dict.productStock(name);
        return qty == null ? 0 : Number(qty) || 0;
    }

    function heldQty(name) {
        if (!editingId) return 0;
        var sales = readSales();
        for (var i = 0; i < sales.length; i++) {
            var sale = sales[i];
            if (!sale || sale.id !== editingId) continue;
            return (sale.lines || []).reduce(function (sum, line) {
                return line.name === name ? sum + (Number(line.qty) || 0) : sum;
            }, 0);
        }
        return 0;
    }

    function stockAvailable(name) {
        return stockFor(name) + heldQty(name);
    }

    function expiredName(name) {
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.saleBlockReason !== 'function') return false;
        return dict.saleBlockReason(name) === 'expired';
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
        syncProducts();
        var lines = cartLines();
        var total = cartTotal(lines);
        var productsHtml = PRODUCTS.map(function (product) {
            var stock = stockAvailable(product.name);
            var qty = cart[product.code] || 0;
            var expired = expiredName(product.name);
            var soldOut = expired || stock <= 0;
            return '<article class="pos-product' + (soldOut ? ' is-empty' : '') + '">' +
                '<div class="pos-photo-frame"><img class="pos-photo" src="' + esc(flavorPhoto(product.photo)) + '" alt="' + esc(product.name) + '"></div>' +
                '<h4>' + esc(product.name) + '</h4>' +
                '<p class="pos-price">' + peso(product.price) + '</p>' +
                '<p class="pos-stock">' + (expired ? 'Expired — cannot be sold' : (stock + ' in stock')) + '</p>' +
                '<div class="pos-qty">' +
                    '<button type="button" data-pos-dec="' + esc(product.code) + '" aria-label="Remove one ' + esc(product.name) + '"' + (qty ? '' : ' disabled') + '>−</button>' +
                    '<span>' + qty + '</span>' +
                    '<button type="button" data-pos-inc="' + esc(product.code) + '" aria-label="Add one ' + esc(product.name) + '"' + (expired || qty >= stock ? ' disabled' : '') + '>+</button>' +
                '</div>' +
            '</article>';
        }).join('');
        var cartHtml = lines.length ? lines.map(function (line) {
            return '<li><span>' + esc(line.name) + ' × ' + line.qty + '</span><strong>' + peso(line.line) + '</strong></li>';
        }).join('') : '<li class="pos-empty">No items yet. Add pouches from the left.</li>';
        var history = readSales().filter(function (sale) {
            return sale && String(sale.channel || 'Walk-in') !== 'Online';
        }).slice().reverse();
        var historyHtml = history.length ? history.map(function (sale) {
            var summary = (sale.lines || []).map(function (line) {
                return line.qty + ' ' + line.name;
            }).join(', ');
            var editing = sale.id === editingId;
            var menuOpen = sale.id === actionMenuId;
            var confirming = sale.id === pendingDelete;
            return '<tr' + (editing ? ' class="is-editing"' : '') + '>' +
                '<td>' + esc(sale.id) + '</td>' +
                '<td>' + esc((sale.customer || 'Walk-in') + ' · ' + (sale.payment || '')) + '</td>' +
                '<td>' + esc(summary) + '</td>' +
                '<td>' + peso(sale.total) + '</td>' +
                '<td>' + (sale.amountGiven != null ? peso(sale.amountGiven) : '—') + '</td>' +
                '<td>' + (sale.change != null ? peso(sale.change) : '—') + '</td>' +
                '<td class="pos-row-actions">' +
                    '<div class="pos-action' + (menuOpen ? ' is-open' : '') + '">' +
                        '<button type="button" class="pos-action-btn" data-pos-action="' + esc(sale.id) + '" aria-expanded="' + (menuOpen ? 'true' : 'false') + '">Action</button>' +
                        (menuOpen
                            ? '<div class="pos-action-menu" role="menu">' +
                                '<button type="button" role="menuitem" data-pos-edit="' + esc(sale.id) + '">Edit</button>' +
                                '<button type="button" role="menuitem" class="pos-delete' + (confirming ? ' is-confirm' : '') + '" data-pos-delete="' + esc(sale.id) + '">' + (confirming ? 'Confirm delete' : 'Delete') + '</button>' +
                              '</div>'
                            : '') +
                    '</div>' +
                '</td></tr>';
        }).join('') : '<tr><td class="pos-empty" colspan="7">No transactions yet.</td></tr>';
        var payment = 'Cash';
        var existingPay = document.getElementById('pos-payment');
        var existingName = document.getElementById('pos-customer');
        var existingTender = document.getElementById('pos-tender');
        if (existingPay && PAYMENTS.indexOf(existingPay.value) >= 0) payment = existingPay.value;
        var nameValue = existingName ? existingName.value : 'Walk-in';
        var tenderValue = existingTender ? existingTender.value : '';
        if (primeEdit) {
            nameValue = editCustomer || 'Walk-in';
            payment = PAYMENTS.indexOf(editPayment) >= 0 ? editPayment : 'Cash';
            tenderValue = editTender;
            primeEdit = false;
        }
        var saleTitle = editingId ? 'Edit sale' : 'Walk-in Sale';
        var saleNote = editingId ? '<p class="pos-note">' + esc(editingId) + '</p>' : '';
        var clearLabel = editingId ? 'Cancel' : 'Clear';
        var completeLabel = editingId ? 'Save changes' : 'Complete Sale';
        root.querySelector('.pos-layout').innerHTML =
            '<section class="pos-catalog"><div class="pos-catalog-head"><h3>Finished Products</h3><button type="button" id="pos-week-sales" aria-expanded="' + (weekOpen ? 'true' : 'false') + '">' + (weekOpen ? 'Hide 7-day purchases' : '7-day purchases') + '</button></div>' +
                (weekOpen ? weekPurchasesHtml() : '') +
                '<div class="pos-grid">' + productsHtml + '</div></section>' +
            '<div class="pos-side">' +
            '<section class="pos-ticket"><h3>' + saleTitle + '</h3>' + saleNote +
                '<label>Customer<input id="pos-customer" type="text" value="' + esc(nameValue) + '" placeholder="Walk-in"></label>' +
                '<label>Payment<select id="pos-payment">' + PAYMENTS.map(function (item) {
                    return '<option' + (item === payment ? ' selected' : '') + '>' + item + '</option>';
                }).join('') + '</select></label>' +
                '<label>Amount given (cash)<input id="pos-tender" type="number" min="0" step="0.01" value="' + esc(tenderValue) + '" placeholder="Exact amount"></label>' +
                '<ul class="pos-lines">' + cartHtml + '</ul>' +
                '<p class="pos-total"><span>Total</span><strong>' + peso(total) + '</strong></p>' +
                '<p id="pos-change" class="pos-change"></p>' +
                '<div id="pos-gcash" class="pos-gcash" hidden><button type="button" id="pos-gcash-btn">Show GCash QR for customer</button></div>' +
                '<p id="pos-status" class="pos-status"></p>' +
                '<div class="pos-actions"><button type="button" id="pos-clear" class="pos-secondary">' + clearLabel + '</button><button type="button" id="pos-complete">' + completeLabel + '</button></div>' +
            '</section>' +
            '<section class="pos-history' + (actionMenuId ? ' is-menu-open' : '') + '"><h3>Transaction History</h3><div class="pos-table-scroll"><table class="pos-table"><thead><tr><th>Sale</th><th>Customer</th><th>Items</th><th>Total</th><th>Amount Given</th><th>Change</th><th></th></tr></thead><tbody>' + historyHtml + '</tbody></table></div></section>' +
            '</div>';
        updateChange();
    }

    function updateChange() {
        var tender = document.getElementById('pos-tender');
        var note = document.getElementById('pos-change');
        var payment = document.getElementById('pos-payment');
        if (!tender || !note || !payment) return;
        var cash = payment.value === 'Cash';
        var gbox = document.getElementById('pos-gcash');
        if (gbox) gbox.hidden = payment.value !== 'GCash';
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
        note.textContent = due > 0
            ? 'Amount given ' + peso(given) + ' · Still due ' + peso(due)
            : 'Amount given ' + peso(given) + ' · Customer\'s change ' + peso(Math.abs(due));
    }

    function changeQty(code, delta) {
        var product = PRODUCTS.filter(function (item) { return item.code === code; })[0];
        if (!product) return;
        if (delta > 0 && expiredName(product.name)) {
            setStatus(product.name + ' is expired and cannot be sold.', 'warn');
            return;
        }
        var stock = stockAvailable(product.name);
        var next = Math.max(0, (cart[code] || 0) + delta);
        if (next > stock) next = stock;
        if (next) cart[code] = next;
        else delete cart[code];
        render();
    }

    // ---- GCash QR for the customer (PayMongo QR Ph, same as online checkout) ----
    var gcashPoll = null;

    function closeGcashQr() {
        if (gcashPoll) { clearInterval(gcashPoll); gcashPoll = null; }
        var m = document.getElementById('pos-gcash-modal');
        if (m && m.parentNode) m.parentNode.removeChild(m);
    }

    function posSessionEmail() {
        try {
            var sess = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sess.email || '')) return sess.email;
        } catch (e) { /* ignore */ }
        return 'walkin@kreezby.com';
    }

    function openGcashQr() {
        var total = cartTotal(cartLines());
        if (!cartLines().length) { setStatus('Add at least one product first.', 'warn'); return; }
        if (total < 20) { setStatus('GCash QR needs a total of at least ₱20.00.', 'warn'); return; }
        closeGcashQr();
        if (!document.getElementById('pos-gcash-style')) {
            var st = document.createElement('style');
            st.id = 'pos-gcash-style';
            st.textContent =
                '.pos-gcash{margin:6px 0 4px}.pos-gcash button{width:100%;padding:11px;border:0;border-radius:10px;background:#0a6ef0;color:#fff;font:inherit;font-weight:700;cursor:pointer}' +
                '#pos-gcash-modal{position:fixed;inset:0;z-index:10050;background:rgba(30,20,15,.62);display:flex;align-items:center;justify-content:center;padding:16px}' +
                '#pos-gcash-modal .gq-card{background:#fff;border-radius:18px;padding:22px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
                '#pos-gcash-modal h3{margin:0 0 4px;font-size:20px;color:#0a4db3}' +
                '#pos-gcash-modal .gq-amt{font-size:30px;font-weight:800;color:#3d2c2a;margin:4px 0 10px}' +
                '#pos-gcash-modal .gq-img{width:260px;max-width:100%;aspect-ratio:1/1;margin:0 auto 10px;display:flex;align-items:center;justify-content:center;border:1px solid #e0d6ce;border-radius:12px;color:#8d6e63;font-size:14px}' +
                '#pos-gcash-modal .gq-img img{width:100%;height:100%;object-fit:contain;border-radius:12px}' +
                '#pos-gcash-modal .gq-msg{min-height:20px;font-size:14px;font-weight:600;color:#5d4037;margin:6px 0 12px}' +
                '#pos-gcash-modal .gq-msg.ok{color:#2e7d32}#pos-gcash-modal .gq-msg.err{color:#c62828}' +
                '#pos-gcash-modal .gq-close{padding:10px 22px;border:1px solid #d7ccc8;background:#fff;border-radius:10px;font:inherit;font-weight:700;cursor:pointer;color:#3d2c2a}';
            document.head.appendChild(st);
        }
        var modal = document.createElement('div');
        modal.id = 'pos-gcash-modal';
        modal.innerHTML = '<div class="gq-card"><h3>Pay with GCash</h3><div class="gq-amt">' + peso(total) + '</div>' +
            '<div class="gq-img" data-gq-img>Creating QR code…</div>' +
            '<p class="gq-msg" data-gq-msg>Scan with GCash or any bank / e-wallet app.</p>' +
            '<button type="button" class="gq-close" data-gq-close>Close</button></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function (ev) {
            if (ev.target === modal || (ev.target.hasAttribute && ev.target.hasAttribute('data-gq-close'))) closeGcashQr();
        });
        var img = modal.querySelector('[data-gq-img]');
        var msg = modal.querySelector('[data-gq-msg]');
        function say(text, kind) { msg.textContent = text; msg.className = 'gq-msg' + (kind ? ' ' + kind : ''); }
        var nameNode = document.getElementById('pos-customer');
        var payerName = (nameNode && nameNode.value.trim()) || 'Walk-in customer';
        fetch('/api/paymongo/e-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: total,
                wallet: 'qrph',
                name: payerName,
                email: posSessionEmail(),
                description: 'Kreezby walk-in POS sale',
                returnUrl: window.location.origin + window.location.pathname,
                reference: 'walk-in-pos',
                audience: 'customer'
            })
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; });
        }).then(function (r) {
            if (!document.getElementById('pos-gcash-modal')) return;
            if (!r.res.ok || !r.data.ok || !r.data.qrImage) {
                img.textContent = 'No QR';
                say(r.data.error || 'The GCash QR could not be created. Try again.', 'err');
                return;
            }
            img.innerHTML = '<img alt="GCash QR code" src="' + r.data.qrImage + '">';
            var id = r.data.paymentIntentId;
            if (r.data.testUrl) say('Test mode: open the QR with a phone camera and choose Authorize.', '');
            gcashPoll = setInterval(function () {
                if (!document.getElementById('pos-gcash-modal')) { clearInterval(gcashPoll); gcashPoll = null; return; }
                fetch('/api/paymongo/payment-intents/' + encodeURIComponent(id), { cache: 'no-store' })
                    .then(function (x) { return x.json(); })
                    .then(function (info) {
                        if (!info || !info.ok) return;
                        if (info.status === 'succeeded') {
                            clearInterval(gcashPoll); gcashPoll = null;
                            say('Payment received ✓ — you can now press Complete Sale.', 'ok');
                            setStatus('GCash payment of ' + peso(total) + ' received. Press Complete Sale.', 'ok');
                        } else if (info.status === 'failed' || info.status === 'expired' || info.status === 'cancelled') {
                            clearInterval(gcashPoll); gcashPoll = null;
                            say('This QR is no longer valid. Close and show a new one.', 'err');
                        }
                    }).catch(function () { /* keep waiting */ });
            }, 4000);
        }).catch(function () {
            img.textContent = 'No QR';
            say('The shop server could not be reached. Check the connection and try again.', 'err');
        });
    }

    function completeSale() {
        var lines = cartLines();
        if (!lines.length) {
            setStatus('Add at least one product.', 'warn');
            return;
        }
        var expired = lines.filter(function (line) { return expiredName(line.name); });
        if (expired.length) {
            setStatus(expired[0].name + ' is expired and cannot be sold.', 'warn');
            render();
            return;
        }
        var short = lines.filter(function (line) { return line.qty > stockAvailable(line.name); });
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
            setStatus('Amount given is less than the total.', 'warn');
            return;
        }
        var amountGiven = total;
        if (payment === 'Cash' && tenderNode && tenderNode.value) amountGiven = Math.round(Number(tenderNode.value) * 100) / 100;
        var changeDue = Math.round((amountGiven - total) * 100) / 100;
        var date = todayStamp();
        var sales = readSales();
        var existingIndex = -1;
        if (editingId) {
            for (var s = 0; s < sales.length; s++) {
                if (sales[s] && sales[s].id === editingId) existingIndex = s;
            }
            if (existingIndex < 0) {
                editingId = '';
                setStatus('That sale is no longer in the history.', 'warn');
                render();
                return;
            }
        }
        var previous = existingIndex >= 0 ? sales[existingIndex] : null;
        applyingStock = true;
        if (previous && typeof dict.undoSale === 'function') {
            (previous.lines || []).forEach(function (line) {
                dict.undoSale(line.name, line.qty, previous.date);
            });
        }
        var saleDate = previous ? previous.date : date;
        for (var i = 0; i < lines.length; i++) {
            var left = dict.recordSale(lines[i].name, lines[i].qty, saleDate);
            if (left == null) {
                if (previous) {
                    (previous.lines || []).forEach(function (line) {
                        dict.recordSale(line.name, line.qty, previous.date);
                    });
                }
                applyingStock = false;
                setStatus('Could not record ' + lines[i].name + '.', 'warn');
                render();
                return;
            }
        }
        var seq = String(sales.length + 1);
        while (seq.length < 4) seq = '0' + seq;
        var receipt = {
            id: previous ? previous.id : ('POS-' + date.replace(/-/g, '') + '-' + seq),
            at: previous ? previous.at : new Date().toISOString(),
            date: saleDate,
            customer: customer,
            channel: 'Walk-in',
            payment: payment,
            cashier: previous ? previous.cashier : cashierName(),
            lines: lines.map(function (line) {
                return { code: line.code, name: line.name, qty: line.qty, price: line.price };
            }),
            total: total,
            amountGiven: amountGiven,
            change: changeDue
        };
        if (previous) sales[existingIndex] = receipt;
        else sales.push(receipt);
        writeSales(sales);
        applyingStock = false;
        closeGcashQr();
        cart = {};
        editingId = '';
        pendingDelete = '';
        actionMenuId = '';
        var tenderBox = document.getElementById('pos-tender');
        if (tenderBox) tenderBox.value = '';
        render();
        setStatus(receipt.id + (previous ? ' updated.' : ' saved.') + ' Total ' + peso(total) + ' · Amount given ' + peso(amountGiven) + ' · Change ' + peso(changeDue) + '. Stock was updated.', 'ok');
    }

    function findSale(id) {
        var sales = readSales();
        for (var i = 0; i < sales.length; i++) {
            if (sales[i] && sales[i].id === id) return sales[i];
        }
        return null;
    }

    function beginEdit(id) {
        var sale = findSale(id);
        if (!sale || String(sale.channel || 'Walk-in') === 'Online') return;
        editingId = id;
        pendingDelete = '';
        actionMenuId = '';
        primeEdit = true;
        editCustomer = sale.customer || 'Walk-in';
        editPayment = sale.payment || 'Cash';
        editTender = sale.payment === 'Cash' && sale.amountGiven != null ? String(sale.amountGiven) : '';
        cart = {};
        (sale.lines || []).forEach(function (line) {
            var product = PRODUCTS.filter(function (item) {
                return item.code === line.code || item.name === line.name;
            })[0];
            if (product) cart[product.code] = Number(line.qty) || 0;
        });
        render();
        setStatus('Editing ' + sale.id + '. Save changes when the sale looks right.', 'ok');
    }

    function deleteSale(id) {
        var sale = findSale(id);
        if (!sale || String(sale.channel || 'Walk-in') === 'Online') return;
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.undoSale !== 'function') {
            setStatus('Inventory is not ready yet. Refresh and try again.', 'warn');
            return;
        }
        applyingStock = true;
        (sale.lines || []).forEach(function (line) {
            dict.undoSale(line.name, line.qty, sale.date);
        });
        writeSales(readSales().filter(function (row) { return !row || row.id !== id; }));
        applyingStock = false;
        if (editingId === id) {
            editingId = '';
            cart = {};
        }
        pendingDelete = '';
        actionMenuId = '';
        render();
        setStatus(sale.id + ' deleted. Stock was put back.', 'ok');
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
        for (var check = 0; check < stockLines.length; check++) {
            var blocked = knownProduct(stockLines[check].name);
            if (blocked && expiredName(blocked.name)) {
                return { ok: false, message: blocked.name + ' is expired and cannot be sold.' };
            }
        }
        for (var i = 0; i < stockLines.length; i++) {
            var product = knownProduct(stockLines[i].name);
            var left = dict.recordSale(product.name, stockLines[i].qty, date);
            if (left == null) {
                return { ok: false, message: 'Could not record ' + product.name + '.' };
            }
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

    var syncRetries = 0;
    var syncTimer = 0;
    function scheduleSync(delay) {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(syncOnlineInventory, delay == null ? 200 : delay);
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
            // The inventory script is still loading (slow on a hosted site): retry quietly.
            if (syncRetries < 30) { syncRetries += 1; scheduleSync(500); }
            return;
        }
        syncRetries = 0;
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
        if (!root) return;
        if (!event.target.closest || !event.target.closest('#pos-master')) {
            if (actionMenuId) {
                actionMenuId = '';
                pendingDelete = '';
                render();
            }
            return;
        }
        if (event.target.id === 'pos-week-sales' || (event.target.closest && event.target.closest('#pos-week-sales'))) {
            weekOpen = !weekOpen;
            actionMenuId = '';
            pendingDelete = '';
            render();
            return;
        }
        var inc = event.target.closest('[data-pos-inc]');
        var dec = event.target.closest('[data-pos-dec]');
        var action = event.target.closest('[data-pos-action]');
        var edit = event.target.closest('[data-pos-edit]');
        var remove = event.target.closest('[data-pos-delete]');
        if (inc) changeQty(inc.getAttribute('data-pos-inc'), 1);
        else if (dec) changeQty(dec.getAttribute('data-pos-dec'), -1);
        else if (action) {
            var openId = action.getAttribute('data-pos-action');
            actionMenuId = actionMenuId === openId ? '' : openId;
            if (pendingDelete && pendingDelete !== actionMenuId) pendingDelete = '';
            render();
        } else if (edit) beginEdit(edit.getAttribute('data-pos-edit'));
        else if (remove) {
            var saleId = remove.getAttribute('data-pos-delete');
            if (pendingDelete === saleId) deleteSale(saleId);
            else {
                pendingDelete = saleId;
                actionMenuId = saleId;
                render();
            }
        } else if (event.target.id === 'pos-clear') {
            cart = {};
            editingId = '';
            pendingDelete = '';
            actionMenuId = '';
            render();
        } else if (event.target.id === 'pos-complete') {
            completeSale();
        } else if (event.target.id === 'pos-gcash-btn') {
            openGcashQr();
        } else if (actionMenuId && !event.target.closest('.pos-action')) {
            actionMenuId = '';
            pendingDelete = '';
            render();
        }
    }

    function mount() {
        var root = document.getElementById('pos-master');
        if (!root) return;
        document.body.classList.add('po-admin-page');
        if (!document.getElementById('kreezby-pos-style')) {
            var style = document.createElement('link');
            style.id = 'kreezby-pos-style';
            style.rel = 'stylesheet';
            style.href = '../css/pages/admin/pos-admin.css?v=20261028posv7';
            document.head.appendChild(style);
        }
        if (root.dataset.posReady !== '1') {
            root.dataset.posReady = '1';
            root.innerHTML = '<div class="pos-layout"></div>';
        }
        scheduleSync(0);
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
            if (!applyingStock) scheduleSync(150);
        });
        document.addEventListener('kreezby:remote-state', function () {
            if (!applyingStock) scheduleSync(250);
        });
        document.addEventListener('kreezby-orders-updated', function () { scheduleSync(150); });
        document.addEventListener('kreezby:page-load', mount);
        document.addEventListener('turbo:frame-load', mount);
    }

    window.KreezbyPos = { boot: mount };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
