/**
 * Live stock for customer and guest shop pages.
 * Reads the finished-goods counts the admin/staff stock screens keep in
 * kreezby_data_dictionary_v1 (synced from the database every few seconds),
 * shows "Available stocks: N" on each flavor card, and stops a shopper from adding
 * more pouches than are on hand.
 */
(function () {
    'use strict';

    var DICT_KEY = 'kreezby_data_dictionary_v1';
    var CART_KEY = 'kreezbyCart';

    // Same name-to-code rules as kreezby-data-dictionary.js.
    function productId(name) {
        var text = String(name || '').toLowerCase();
        if (!text) return '';
        if (text.indexOf('oatmeal') >= 0) return 'CKE-OAT-P';
        if (text.indexOf('assorted') >= 0) return 'CRK-AST-P';
        if (text.indexOf('almond') >= 0) return 'CRK-ALM-P';
        if (text.indexOf('cashew') >= 0) return 'CRK-CSH-P';
        if (text.indexOf('butternut') >= 0) return 'CRK-BUT-J';
        if (text.indexOf('strawberry') >= 0) return 'CRK-STR-P';
        if (text.indexOf('velvet') >= 0) return 'CRK-RV-P';
        if (text.indexOf('lemon') >= 0) return 'CRK-LEM-P';
        if (text.indexOf('melon') >= 0) return 'CRK-MEL-P';
        if (text.indexOf('pandan') >= 0) return 'CRK-PAN-P';
        if (text.indexOf('mango') >= 0) return 'CRK-MNG-J';
        if (text.indexOf('ube') >= 0) return 'CRK-UBE-P';
        if (text.indexOf('chocolate') >= 0) return 'CRK-CHO-P';
        return '';
    }

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function stockMap() {
        var dict = readJson(DICT_KEY, {}) || {};
        return dict.product_stock || {};
    }

    // Paid orders whose pouches have not been taken out of stock yet still claim those pouches.
    function reservedMap() {
        var orders = readJson('kreezbyOrders', []);
        var map = {};
        if (!Array.isArray(orders)) return map;
        orders.forEach(function (order) {
            if (!order || order.inventoryDeducted || order.paymentStatus !== 'paid') return;
            if (/cancel|return|reject/i.test(String(order.status || ''))) return;
            Object.keys(order.items || {}).forEach(function (key) {
                var item = order.items[key];
                var id = item && productId(item.name);
                if (id) map[id] = (map[id] || 0) + (Number(item.qty) || 0);
            });
        });
        return map;
    }

    /** Pouches a customer can still buy: on hand minus paid orders not yet deducted. */
    function available(name) {
        var id = productId(name);
        if (!id) return 0;
        var onHand = Number(stockMap()[id]) || 0;
        var reserved = reservedMap()[id] || 0;
        return Math.max(0, onHand - reserved);
    }

    function stockLabel(qty) {
        if (qty <= 0) return 'Out of stock';
        return 'Available stocks: ' + qty;
    }

    function ensureStyles() {
        if (document.getElementById('kz-customer-stock-style')) return;
        var st = document.createElement('style');
        st.id = 'kz-customer-stock-style';
        st.textContent = ''
            + '.flavor-card__stock{display:inline-flex;align-items:center;gap:6px;margin:6px 0 0;font-size:12px;font-weight:600;color:#2e7d32;}'
            + '.flavor-card__stock::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;flex:0 0 auto;}'
            + '.flavor-card__stock.is-low{color:#e65100;}'
            + '.flavor-card__stock.is-out{color:#c62828;}'
            + '.flavor-card.is-sold-out .flavor-card__image img{filter:grayscale(.85);opacity:.7;}'
            + '.flavor-card.is-sold-out .flavor-card__badge{background:#c62828;color:#fff;}'
            + '.flavor-card .add-cart-btn:disabled,.flavor-card .counter-btn:disabled{opacity:.45;cursor:not-allowed;}';
        (document.head || document.documentElement).appendChild(st);
    }

    function cartQty(prodId) {
        // The shop pages keep the open cart in a page-level variable; fall back to the saved cart.
        try {
            /* global shoppingCartStateMap */
            if (typeof shoppingCartStateMap !== 'undefined' && shoppingCartStateMap && shoppingCartStateMap[prodId]) {
                return Number(shoppingCartStateMap[prodId].qty) || 0;
            }
        } catch (e) { /* not on this page */ }
        var saved = readJson(CART_KEY, {}) || {};
        return saved[prodId] ? Number(saved[prodId].qty) || 0 : 0;
    }

    function nameForCard(card) {
        var title = card.querySelector('.flavor-card__title');
        return title ? title.textContent : '';
    }

    function refresh() {
        ensureStyles();
        Array.prototype.forEach.call(document.querySelectorAll('.flavor-card'), function (card) {
            var name = nameForCard(card);
            if (!productId(name)) return;
            var qty = available(name);
            // The stock count takes the place of the "Pouch (10 Pcs)" line under the flavor name.
            var line = card.querySelector('.flavor-card__stock') || card.querySelector('.flavor-card__description');
            if (!line) {
                line = document.createElement('p');
                var text = card.querySelector('.flavor-card__text');
                if (text) text.appendChild(line);
            }
            line.classList.add('flavor-card__stock');
            line.setAttribute('aria-live', 'polite');
            line.textContent = stockLabel(qty);
            line.classList.toggle('is-out', qty <= 0);
            line.classList.toggle('is-low', qty > 0 && qty <= 3);
            card.classList.toggle('is-sold-out', qty <= 0);
            var badge = card.querySelector('.flavor-card__badge');
            if (badge) badge.textContent = qty <= 0 ? 'Out of stock' : 'Fresh';
            var addBtn = card.querySelector('.add-cart-btn');
            if (addBtn) {
                addBtn.disabled = qty <= 0;
                addBtn.textContent = qty <= 0 ? 'Out of Stock' : 'Add To Cart Bag';
            }
            Array.prototype.forEach.call(card.querySelectorAll('.counter-btn'), function (btn) { btn.disabled = qty <= 0; });
            var orderNow = card.querySelector('.btn-guest-action');
            if (orderNow) orderNow.textContent = qty <= 0 ? 'Out of Stock' : 'Order Now';
        });
    }

    function notify(message) {
        if (typeof window.showCartToast === 'function') {
            try { window.showCartToast(message); return; } catch (e) { /* fall through */ }
        }
        window.alert(message);
    }

    function catalogName(prodId) {
        var label = document.getElementById('qty-val-' + prodId);
        var card = label && label.closest('.flavor-card');
        if (card) return nameForCard(card);
        try {
            /* global productFlavorsCatalog */
            if (typeof productFlavorsCatalog !== 'undefined') {
                var item = productFlavorsCatalog.find(function (p) { return p.id === prodId; });
                if (item) return item.name;
            }
        } catch (e) { /* not on this page */ }
        return '';
    }

    var guarded = false;
    function installGuards() {
        if (guarded) return;
        var add = window.commitItemToCartState;
        var adjust = window.adjustCardWidgetQtyState;
        var change = window.changeCartLineQty;
        if (typeof add !== 'function' && typeof adjust !== 'function') return;
        guarded = true;

        if (typeof adjust === 'function') {
            window.adjustCardWidgetQtyState = function (prodId, delta) {
                var name = catalogName(prodId);
                var label = document.getElementById('qty-val-' + prodId);
                var current = label ? parseInt(label.textContent, 10) || 1 : 1;
                if (delta > 0 && name && productId(name)) {
                    var room = available(name) - cartQty(prodId);
                    if (current + delta > room) {
                        notify(room > 0 ? 'Only ' + room + ' more ' + (room === 1 ? 'pouch' : 'pouches') + ' of ' + name + ' available.' : name + ' is out of stock.');
                        return;
                    }
                }
                return adjust.apply(this, arguments);
            };
        }
        if (typeof add === 'function') {
            window.commitItemToCartState = function (prodId) {
                var name = catalogName(prodId);
                if (name && productId(name)) {
                    var label = document.getElementById('qty-val-' + prodId);
                    var wanted = label ? parseInt(label.textContent, 10) || 1 : 1;
                    var room = available(name) - cartQty(prodId);
                    if (room <= 0) {
                        notify(cartQty(prodId) > 0 ? 'All available ' + name + ' are already in your cart.' : name + ' is out of stock.');
                        return;
                    }
                    if (wanted > room && label) label.textContent = String(room);
                }
                return add.apply(this, arguments);
            };
        }
        if (typeof change === 'function') {
            window.changeCartLineQty = function (prodId, delta) {
                if (delta > 0) {
                    var name = '';
                    try { name = shoppingCartStateMap[prodId].name; } catch (e) { name = catalogName(prodId); }
                    if (name && productId(name) && cartQty(prodId) + delta > available(name)) {
                        notify('Only ' + available(name) + ' ' + (available(name) === 1 ? 'pouch' : 'pouches') + ' of ' + name + ' available.');
                        return;
                    }
                }
                return change.apply(this, arguments);
            };
        }
    }

    /** Lines in the cart that ask for more than is on hand: [{ name, wanted, available }]. */
    function shortages(cart) {
        var items = cart || readJson(CART_KEY, {}) || {};
        var totals = {};
        Object.keys(items).forEach(function (key) {
            var line = items[key];
            if (!line || !line.name) return;
            var id = productId(line.name);
            if (!id) return;
            if (!totals[id]) totals[id] = { name: line.name, wanted: 0, available: available(line.name) };
            totals[id].wanted += Number(line.qty) || 0;
        });
        return Object.keys(totals).map(function (id) { return totals[id]; }).filter(function (row) {
            return row.wanted > row.available;
        });
    }

    var queued = false;
    function queueRefresh() {
        if (queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(function () {
            queued = false;
            refresh();
            installGuards();
        });
    }

    function boot() {
        refresh();
        installGuards();
        var grid = document.getElementById('shop-menu-container');
        if (grid && window.MutationObserver) {
            new MutationObserver(function (records) {
                // Only react to new cards, not to the stock lines this script writes.
                for (var i = 0; i < records.length; i++) {
                    var added = records[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        if (added[j].nodeType === 1 && !added[j].classList.contains('flavor-card__stock')) { queueRefresh(); return; }
                    }
                }
            }).observe(grid, { childList: true, subtree: true });
        }
    }

    document.addEventListener('kreezby:remote-state', function (e) {
        var keys = e && e.detail && e.detail.keys;
        if (!keys || keys.indexOf(DICT_KEY) !== -1 || keys.indexOf('kreezbyOrders') !== -1) queueRefresh();
    });
    window.addEventListener('storage', function (e) {
        if (!e || e.key === DICT_KEY || e.key === 'kreezbyOrders') queueRefresh();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    window.addEventListener('load', function () { refresh(); installGuards(); });

    window.KreezbyCustomerStock = {
        productId: productId,
        available: available,
        shortages: shortages,
        refresh: refresh
    };
})();
