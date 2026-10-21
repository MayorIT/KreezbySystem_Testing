(function () {
    'use strict';

    var PRODUCTS = [
        { id:'CRK-CHO-P', name:'Chocolate Crinkles', price:165, category:'pouch', photo:'chocolate-crinkles.jpg', stock:120 },
        { id:'CRK-ALM-P', name:'Choco-Almond Crinkles', price:165, category:'pouch', photo:'choco-almond-crinkles.jpg', stock:85 },
        { id:'CRK-LEM-P', name:'Lemon Crinkles', price:165, category:'pouch', photo:'lemon-crinkles.jpg', stock:62 },
        { id:'CRK-BUT-J', name:'Choco Butternut Crinkles', price:200, category:'cookie', photo:'choco-butternut-crinkles.jpg', stock:45 },
        { id:'CRK-MNG-J', name:'Mango Crinkles', price:165, category:'cookie', photo:'mango-crinkles.jpg', stock:42 },
        { id:'CRK-UBE-P', name:'Ube Crinkles', price:165, category:'other', photo:'ube-crinkles.jpg', stock:52 }
    ];
    var cart = {};

    function read(key, fallback) { try { var value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; } catch (e) { return fallback; } }
    function money(value) { return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
    function esc(value) { return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function photo(file) { return '../customer/flavors/' + file; }
    function orders() { var list = read('kreezbyOrders', []); return Array.isArray(list) ? list : []; }
    function orderTotal(order) { return Number(String(order.subtotal != null ? order.subtotal : order.total).replace(/[^\d.]/g,'')) || 0; }
    function orderStatus(order) { return String(order.status || 'New').replace(/_/g,' '); }
    function today(value) { return String(value || '').slice(0,10) === new Date().toISOString().slice(0,10); }
    function inventoryAlerts() {
        if (window.KreezbyDictionary && typeof KreezbyDictionary.staffInventoryAlerts === 'function') {
            return KreezbyDictionary.staffInventoryAlerts();
        }
        return PRODUCTS.filter(function (p) {
            return p.stock < 70;
        }).map(function (p) {
            return { product:p.name, category:'Finished Goods', currentStock:p.stock, threshold:70, status:'Low Stock' };
        });
    }

    function setText(root, selector, value) {
        var node = root.querySelector(selector);
        if (node) node.textContent = value;
    }

    function setHtml(root, selector, value) {
        var node = root.querySelector(selector);
        if (node) node.innerHTML = value;
    }

    function renderProducts(root) {
        var search = root.querySelector('[data-product-search]');
        var query = String((search && search.value) || '').toLowerCase();
        setHtml(root, '[data-products]', PRODUCTS.filter(function (p) {
            return p.name.toLowerCase().indexOf(query) !== -1;
        }).map(function (p) {
            return '<button type="button" class="staff-product" data-product="' + p.id + '"><img src="' + photo(p.photo) + '" alt=""><strong>' + esc(p.name) + '</strong><span>' + money(p.price) + '</span></button>';
        }).join(''));
    }
    function renderCart(root) {
        var total = 0;
        var html = Object.keys(cart).map(function (id) {
            var p = PRODUCTS.filter(function (item) { return item.id === id; })[0];
            if (!p) return '';
            var qty = cart[id]; total += p.price * qty;
            return '<div class="staff-cart-line"><span>' + esc(p.name) + '<small>' + qty + ' × ' + money(p.price) + '</small></span><button type="button" data-remove="' + id + '">×</button></div>';
        }).join('');
        setHtml(root, '[data-cart]', html || '<p class="staff-empty">Select a product to start.</p>');
        setText(root, '[data-cart-total]', money(total));
    }
    function renderTables(root) {
        var list = orders();
        var pending = list.filter(function (o) { return !/complete|deliver|cancel/i.test(orderStatus(o)); });
        var sales = read('kreezby_pos_sales_v1', []); if (!Array.isArray(sales)) sales = [];
        var todaysSales = sales.filter(function (s) { return today(s.createdAt || s.date); });
        var salesTotal = todaysSales.reduce(function (sum, s) { return sum + Number(s.total || s.amount || 0); }, 0);
        setText(root, '[data-staff-kpi="sales"]', money(salesTotal));
        setText(root, '[data-staff-kpi="transactions"]', String(todaysSales.length));
        setText(root, '[data-staff-kpi="orders"]', String(pending.length));
        var low = inventoryAlerts();
        setText(root, '[data-staff-kpi="low"]', String(low.length));
        setHtml(root, '[data-recent-transactions]', todaysSales.slice(-5).reverse().map(function (s) {
            return '<tr><td>' + esc(s.id || s.saleId || 'TR-000') + '</td><td>' + new Date(s.createdAt || Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</td><td>POS</td><td>Walk-in</td><td>' + money(s.total || s.amount) + '</td><td><span class="staff-status completed">Completed</span></td></tr>';
        }).join('') || '<tr><td colspan="6">No transactions today.</td></tr>');
        setHtml(root, '[data-pending-orders]', pending.slice(0,5).map(function (o) {
            return '<tr><td>' + esc(o.orderNumber || o.id || 'ORD-000') + '</td><td>' + esc((o.shippingInfo && o.shippingInfo.fullName) || 'Customer') + '</td><td>Online</td><td>' + ((o.items && o.items.length) || 1) + '</td><td>' + money(orderTotal(o)) + '</td><td><span class="staff-status preparing">' + esc(orderStatus(o)) + '</span></td></tr>';
        }).join('') || '<tr><td colspan="6">No pending orders.</td></tr>');
        setHtml(root, '[data-inventory-alerts]', low.map(function (p) {
            return '<tr><td>' + esc(p.product) + '</td><td>' + esc(p.category) + '</td><td>' + p.currentStock + ' pcs</td><td>' + p.threshold + ' pcs</td><td><span class="staff-status low">' + esc(p.status) + '</span></td></tr>';
        }).join('') || '<tr><td colspan="5">Inventory is healthy.</td></tr>');
    }
    function boot() {
        var root = document.getElementById('staff-dashboard-root');
        if (!root) return;
        var session = read('kreezby_session', {});
        setText(root, '[data-staff-name]', session.userName || session.name || 'Staff');
        setText(root, '[data-staff-date]', new Date().toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}));
        renderProducts(root);
        renderCart(root);
        renderTables(root);
        if (root.dataset.staffDashBound === '1') return;
        root.dataset.staffDashBound = '1';
        root.addEventListener('click', function (event) {
            var product = event.target.closest('[data-product]');
            if (product) {
                cart[product.getAttribute('data-product')] = (cart[product.getAttribute('data-product')] || 0) + 1;
                renderCart(root);
                return;
            }
            var remove = event.target.closest('[data-remove]');
            if (remove) {
                delete cart[remove.getAttribute('data-remove')];
                renderCart(root);
                return;
            }
            if (event.target.closest('[data-complete-sale]')) {
                if (!Object.keys(cart).length) return;
                var total = Object.keys(cart).reduce(function (sum, id) {
                    var p = PRODUCTS.filter(function (item) { return item.id === id; })[0];
                    return sum + (p ? p.price * cart[id] : 0);
                }, 0);
                var sales = read('kreezby_pos_sales_v1', []);
                if (!Array.isArray(sales)) sales = [];
                sales.push({ id:'TR-' + Date.now().toString().slice(-6), total:total, createdAt:new Date().toISOString() });
                localStorage.setItem('kreezby_pos_sales_v1', JSON.stringify(sales));
                cart = {};
                renderCart(root);
                renderTables(root);
            }
        });
        var search = root.querySelector('[data-product-search]');
        if (search) search.addEventListener('input', function () { renderProducts(root); });
        window.addEventListener('storage', function () { renderTables(root); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
})();
