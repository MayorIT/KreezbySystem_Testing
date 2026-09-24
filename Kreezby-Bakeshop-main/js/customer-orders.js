/**
 * Customer order list + Shopee/Lazada-style order detail view.
 */
(function () {
    'use strict';

    var STATUS_STEPS = ['Processing', 'Shipped', 'Completed'];
    var STEPPER_META = {
        Processing: { title: 'Order Processing', desc: 'Your order is being prepared at Kreezby.' },
        Shipped: { title: 'Shipped', desc: 'Your order is on the way!' },
        Completed: { title: 'Delivered', desc: 'Order delivered. Enjoy your crinkles!' }
    };
    var STATUS_COLORS = {
        Processing: '#fbc02d',
        Shipped: '#1e88e5',
        Completed: '#4caf50'
    };

    var currentFilter = 'all';
    var currentDetailOrder = null;

    function currentCustomerName() {
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || '{}');
            if (session && session.userName) return String(session.userName).trim();
        } catch (e) { /* ignore */ }
        try {
            var profile = JSON.parse(localStorage.getItem('kreezbyCustomerProfile') || '{}');
            if (profile && profile.fullName) return String(profile.fullName).trim();
        } catch (e2) { /* ignore */ }
        return '';
    }

    function loadAllOrders() {
        try {
            return JSON.parse(localStorage.getItem('kreezbyOrders') || '[]');
        } catch (e) {
            return [];
        }
    }

    function loadOrders() {
        var orders = loadAllOrders();
        var name = currentCustomerName().toLowerCase();
        if (!name) return orders;
        return orders.filter(function (o) {
            var shipName = (((o.shippingInfo || {}).fullName) || o.poEntity || '').toLowerCase();
            return shipName === name;
        });
    }

    function seedDemoOrderIfNeeded() {
        if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
            window.KreezbyPortalSeed.apply();
            return;
        }
        var orders = loadAllOrders();
        if (orders && orders.length) return;

        var now = new Date().toISOString();
        var demoOrder = {
            orderNumber: 'ORD-2026-0001',
            poCode: 'PO-TEST-001',
            poEntity: 'Customer Demo',
            items: {
                'demo-1': { name: 'Chocolate Crinkles', cost: 165, qty: 2 },
                'demo-2': { name: 'Strawberry Crinkles', cost: 165, qty: 1 }
            },
            subtotal: 495,
            deliveryFee: 50,
            total: '₱545.00',
            paymentMethod: 'cash_on_delivery',
            shippingInfo: {
                fullName: 'Customer Demo',
                phone: '09171234567',
                address: '123 Sample Street, Batangas City',
                notes: 'Leave at gate'
            },
            status: 'Shipped',
            trackingNumber: 'JT1234567890123',
            carrier: 'J&T Express Philippines',
            staffNotes: 'Dispatched from factory',
            date: now,
            statusUpdatedAt: now,
            shippedAt: now,
            paymentVerified: true,
            source: 'demo'
        };

        localStorage.setItem('kreezbyOrders', JSON.stringify([demoOrder]));
    }

    function findOrder(orderNumber) {
        return loadOrders().find(function (o) { return o.orderNumber === orderNumber; });
    }

    function formatDate(iso) {
        return new Date(iso).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatMoney(n) {
        return '₱' + Number(n).toFixed(2);
    }

    function orderTotals(order) {
        var items = Object.values(order.items || {});
        var subtotal = order.subtotal;
        if (subtotal == null) {
            subtotal = items.reduce(function (sum, item) {
                return sum + (item.cost * item.qty);
            }, 0);
        }
        var deliveryFee = order.deliveryFee != null ? order.deliveryFee : (subtotal > 0 ? 50 : 0);
        var total = order.total;
        if (!total) {
            total = formatMoney(subtotal + deliveryFee);
        }
        return { subtotal: subtotal, deliveryFee: deliveryFee, total: total };
    }

    function itemCount(order) {
        return Object.values(order.items || {}).reduce(function (n, item) {
            return n + item.qty;
        }, 0);
    }

    var PRODUCT_IMAGES_BY_ID = {
        'flavor-choc': 'flavors/chocolate.jpg',
        'flavor-almond': 'flavors/choco-almond.jpg',
        'flavor-cashew': 'flavors/choco-cashew.jpg',
        'flavor-mint': 'flavors/choco-mint.jpg',
        'flavor-straw': 'flavors/strawberry.jpg',
        'flavor-velvet': 'flavors/redvelvet.jpg',
        'flavor-lemon': 'flavors/lemon.jpg',
        'flavor-melon': 'flavors/melon.jpg',
        'flavor-pandan': 'flavors/pandan.jpg',
        'flavor-ube': 'flavors/ube.jpg',
        'flavor-mango': 'flavors/mango.jpg',
        'flavor-butternut': 'flavors/chocobutternut.jpg'
    };

    var PRODUCT_IMAGES_BY_NAME = {
        'Chocolate Crinkles': 'flavors/chocolate.jpg',
        'Choco-Almond Crinkles': 'flavors/choco-almond.jpg',
        'Choco-Cashew Crinkles': 'flavors/choco-cashew.jpg',
        'Choco-Mint Crinkles': 'flavors/choco-mint.jpg',
        'Strawberry Crinkles': 'flavors/strawberry.jpg',
        'Red Velvet Crinkles': 'flavors/redvelvet.jpg',
        'Lemon Crinkles': 'flavors/lemon.jpg',
        'Melon Crinkles': 'flavors/melon.jpg',
        'Pandan Crinkles': 'flavors/pandan.jpg',
        'Ube Crinkles': 'flavors/ube.jpg',
        'Mango Crinkles': 'flavors/mango.jpg',
        'Choco Butternut Crinkles': 'flavors/chocobutternut.jpg'
    };

    function imgFallback(name) {
        var label = encodeURIComponent(name || 'Order');
        return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%25' height='100%25' fill='%23eef2f7'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%2394a3b8'>" + label + '</text></svg>';
    }

    function resolveItemImage(itemId, item) {
        if (item && item.img) return item.img;
        if (itemId && PRODUCT_IMAGES_BY_ID[itemId]) return PRODUCT_IMAGES_BY_ID[itemId];
        if (item && item.name && PRODUCT_IMAGES_BY_NAME[item.name]) return PRODUCT_IMAGES_BY_NAME[item.name];
        return imgFallback(item && item.name);
    }

    function firstOrderItem(order) {
        var entries = Object.entries(order.items || {});
        if (!entries.length) return { id: '', item: { name: 'Order' } };
        return { id: entries[0][0], item: entries[0][1] || {} };
    }

    function updateOrdersTriggerState() {
        var badge = document.getElementById('orders-trigger-badge');
        var trigger = document.querySelector('.orders-trigger-btn');
        var count = loadOrders().length;
        if (badge) {
            badge.hidden = count <= 0;
            badge.textContent = String(count);
        }
        if (trigger) {
            trigger.setAttribute('aria-label', count > 0
                ? 'Order Notification, ' + count + ' order' + (count === 1 ? '' : 's')
                : 'Order Notification');
        }
    }

    function firstItemName(order) {
        var items = Object.values(order.items || {});
        if (!items.length) return 'No items';
        var name = items[0].name;
        if (items.length > 1) return name + ' +' + (items.length - 1) + ' more';
        return name;
    }

    function statusBadge(status) {
        var color = STATUS_COLORS[status] || '#666';
        return '<span class="order-status-pill" style="background:' + color + '">' + status + '</span>';
    }

    function stepState(index, activeIdx) {
        if (index < activeIdx) return 'completed';
        if (index === activeIdx) return 'active';
        return 'pending';
    }

    function stepStatusLabel(state) {
        if (state === 'completed') return 'Complete';
        if (state === 'active') return 'In Progress';
        return 'Pending';
    }

    function stepTimestamp(order, stepIndex, activeIdx) {
        if (stepIndex > activeIdx) return '';
        var base = new Date(order.date);
        if (isNaN(base.getTime())) return '';
        if (stepIndex > 0) {
            base.setHours(base.getHours() + stepIndex * 24);
        }
        return formatDate(base.toISOString());
    }

    function renderTrackingBlock(order) {
        if (!order.trackingNumber) return '';
        var carrier = order.carrier || 'J&T Express Philippines';
        var trackUrl = window.KreezbyOrderTracking && window.KreezbyOrderTracking.jntTrackUrl
            ? window.KreezbyOrderTracking.jntTrackUrl(order.trackingNumber)
            : ('https://www.jtexpress.ph/track-and-trace?billCodes=' + encodeURIComponent(order.trackingNumber));

        return (
            '<div class="order-detail-tracking-box">' +
            '<h4>Shipment tracking</h4>' +
            '<div class="order-detail-tracking-row"><span>Courier</span><span>' + carrier + '</span></div>' +
            '<div class="order-detail-tracking-row"><span>Tracking ID</span><span>' + order.trackingNumber + '</span></div>' +
            '<a class="order-detail-tracking-link" href="' + trackUrl + '" target="_blank" rel="noopener noreferrer">Track on J&amp;T Express Philippines →</a>' +
            '</div>'
        );
    }

    function renderStepper(order) {
        var activeIdx = STATUS_STEPS.indexOf(order.status);
        if (activeIdx < 0) activeIdx = 0;

        var stepsHtml = STATUS_STEPS.map(function (stepKey, i) {
            var state = stepState(i, activeIdx);
            var meta = STEPPER_META[stepKey] || { title: stepKey, desc: '' };
            var circleContent = state === 'completed' ? '✓' : String(i + 1);
            var time = stepTimestamp(order, i, activeIdx);

            return (
                '<div class="stepper-step stepper-' + state + '">' +
                '<div class="stepper-circle">' + circleContent + '</div>' +
                '<div class="stepper-line"></div>' +
                '<div class="stepper-content">' +
                '<div class="stepper-title">' + meta.title + '</div>' +
                '<span class="stepper-status">' + stepStatusLabel(state) + '</span>' +
                (time ? '<div class="stepper-time">' + time + '</div>' : '') +
                '</div>' +
                '</div>'
            );
        }).join('');

        return '<div class="stepper-box">' + stepsHtml + '</div>';
    }

    function renderOrderCard(order) {
        var totals = orderTotals(order);
        var count = itemCount(order);
        var dateStr = formatDate(order.date);
        var first = firstOrderItem(order);
        var imageSrc = resolveItemImage(first.id, first.item);
        var imageAlt = first.item.name || 'Ordered crinkles';
        var countBadge = count > 1
            ? '<span class="order-list-thumb-count">' + count + '</span>'
            : '';

        return (
            '<button type="button" class="order-list-card" data-order-id="' + order.orderNumber + '">' +
            '<div class="order-list-card-top">' +
            '<div class="order-list-card-meta">' +
            '<span class="order-list-number">' + order.orderNumber + '</span>' +
            '<span class="order-list-date">' + dateStr + '</span>' +
            '</div>' +
            statusBadge(order.status) +
            '</div>' +
            '<div class="order-list-card-body">' +
            '<div class="order-list-thumb">' +
            '<img src="' + imageSrc + '" alt="' + imageAlt + '" onerror="this.src=\'' + imgFallback(imageAlt) + '\'">' +
            countBadge +
            '</div>' +
            '<div class="order-list-preview">' +
            '<div class="order-list-items">' + firstItemName(order) + '</div>' +
            '<div class="order-list-total">' + totals.total + '</div>' +
            '</div>' +
            '<span class="order-list-chevron" aria-hidden="true">›</span>' +
            '</div>' +
            '</button>'
        );
    }

    function renderOrders(filter) {
        seedDemoOrderIfNeeded();
        currentFilter = filter || currentFilter;
        var container = document.getElementById('orders-container');
        if (!container) return;

        var orders = loadOrders();
        var filtered = currentFilter === 'all'
            ? orders
            : orders.filter(function (o) {
                return o.status.toLowerCase() === currentFilter.toLowerCase();
            });

        if (!filtered.length) {
            container.innerHTML = '<div class="orders-empty-state"><p>No orders found.</p></div>';
            updateOrdersTriggerState();
            return;
        }

        container.innerHTML = filtered.slice().reverse().map(renderOrderCard).join('');
        updateOrdersTriggerState();
    }

    function showListView() {
        currentDetailOrder = null;
        var listView = document.getElementById('orders-list-view');
        var detailView = document.getElementById('orders-detail-view');
        var title = document.getElementById('orders-modal-title');
        var backBtn = document.getElementById('orders-back-btn');

        if (listView) listView.style.display = '';
        if (detailView) detailView.style.display = 'none';
        if (title) title.textContent = 'Order Notification';
        if (backBtn) backBtn.style.display = 'none';
    }

    function showOrderDetail(orderNumber) {
        currentDetailOrder = orderNumber;
        var order = findOrder(orderNumber);
        if (!order) return;

        var listView = document.getElementById('orders-list-view');
        var detailView = document.getElementById('orders-detail-view');
        var title = document.getElementById('orders-modal-title');
        var backBtn = document.getElementById('orders-back-btn');

        if (listView) listView.style.display = 'none';
        if (detailView) detailView.style.display = 'block';
        if (title) title.textContent = 'Order Details';
        if (backBtn) backBtn.style.display = 'inline-flex';

        var totals = orderTotals(order);
        var shipping = order.shippingInfo || {};
        var paymentLabel = (order.paymentMethod || '—').toUpperCase();

        var itemsHtml = Object.entries(order.items || {}).map(function (entry) {
            var itemId = entry[0];
            var item = entry[1];
            var lineTotal = item.cost * item.qty;
            var imageSrc = resolveItemImage(itemId, item);
            return (
                '<div class="order-detail-item">' +
                '<div class="order-detail-item-thumb">' +
                '<img src="' + imageSrc + '" alt="' + (item.name || 'Ordered item') + '" onerror="this.src=\'' + imgFallback(item.name) + '\'">' +
                '</div>' +
                '<div class="order-detail-item-info">' +
                '<div class="order-detail-item-name">' + item.name + '</div>' +
                '<div class="order-detail-item-qty">₱' + item.cost.toFixed(2) + ' × ' + item.qty + '</div>' +
                '</div>' +
                '<div class="order-detail-item-price">' + formatMoney(lineTotal) + '</div>' +
                '</div>'
            );
        }).join('');

        detailView.innerHTML =
            '<div class="order-detail-status-banner">' +
            statusBadge(order.status) +
            '<p class="order-detail-status-msg">' + statusMessage(order.status) + '</p>' +
            renderStepper(order) +
            renderTrackingBlock(order) +
            '</div>' +

            '<section class="order-detail-section">' +
            '<h3 class="order-detail-section-title">📍 Delivery Address</h3>' +
            '<div class="order-detail-address">' +
            '<div class="order-detail-address-name">' + (shipping.fullName || '—') + '</div>' +
            '<div class="order-detail-address-phone">' + (shipping.phone || '—') + '</div>' +
            '<div class="order-detail-address-text">' + (shipping.address || '—') + '</div>' +
            (shipping.notes ? '<div class="order-detail-address-notes">Note: ' + shipping.notes + '</div>' : '') +
            '</div>' +
            '</section>' +

            '<section class="order-detail-section">' +
            '<h3 class="order-detail-section-title">🛍️ Order Items</h3>' +
            '<div class="order-detail-items">' + itemsHtml + '</div>' +
            '</section>' +

            '<section class="order-detail-section">' +
            '<h3 class="order-detail-section-title">💳 Payment Summary</h3>' +
            '<div class="order-detail-summary">' +
            '<div class="order-detail-summary-row"><span>Subtotal</span><span>' + formatMoney(totals.subtotal) + '</span></div>' +
            '<div class="order-detail-summary-row"><span>Delivery Fee</span><span>' + formatMoney(totals.deliveryFee) + '</span></div>' +
            '<div class="order-detail-summary-row order-detail-summary-total"><span>Order Total</span><span>' + totals.total + '</span></div>' +
            '<div class="order-detail-summary-row"><span>Payment Method</span><span>' + paymentLabel + '</span></div>' +
            '<div class="order-detail-summary-row"><span>Payment Status</span><span>' +
            (order.paymentVerified ? '<span class="payment-verified">✓ Verified</span>' : '<span class="payment-pending">⏳ Pending</span>') +
            '</span></div>' +
            '</div>' +
            '</section>' +

            '<section class="order-detail-section order-detail-info">' +
            '<div class="order-detail-info-row"><span>Order Number</span><span>' + order.orderNumber + '</span></div>' +
            (order.poCode ? '<div class="order-detail-info-row"><span>PO Code</span><span>' + order.poCode + '</span></div>' : '') +
            '<div class="order-detail-info-row"><span>Order Date</span><span>' + formatDate(order.date) + '</span></div>' +
            '</section>';
    }

    function statusMessage(status) {
        if (status === 'Processing') return 'Your order is being prepared at Kreezby.';
        if (status === 'Shipped') return 'Your order is on the way!';
        if (status === 'Completed') return 'Order delivered. Enjoy your crinkles!';
        return 'Order status: ' + status;
    }

    function filterOrders(filter, element) {
        if (element && element.parentElement) {
            element.parentElement.querySelectorAll('.tab-link').forEach(function (tab) {
                tab.classList.remove('active');
            });
            element.classList.add('active');
        }
        renderOrders(filter);
    }

    function bindOrdersUi() {
        var container = document.getElementById('orders-container');
        if (container && !container.dataset.bound) {
            container.dataset.bound = '1';
            container.addEventListener('click', function (e) {
                var card = e.target.closest('.order-list-card');
                if (card && card.dataset.orderId) {
                    showOrderDetail(card.dataset.orderId);
                }
            });
        }

        var backBtn = document.getElementById('orders-back-btn');
        if (backBtn && !backBtn.dataset.bound) {
            backBtn.dataset.bound = '1';
            backBtn.addEventListener('click', showListView);
        }
    }

    function onOrdersModalOpen() {
        seedDemoOrderIfNeeded();
        bindOrdersUi();
        showListView();
        renderOrders('all');
        var tabs = document.querySelectorAll('#orders-list-view .tab-link');
        tabs.forEach(function (tab, i) {
            tab.classList.toggle('active', i === 0);
        });
        currentFilter = 'all';
    }

    window.KreezbyCustomerOrders = {
        loadOrders: loadOrders,
        renderOrders: renderOrders,
        filterOrders: filterOrders,
        showOrderDetail: showOrderDetail,
        showListView: showListView,
        onOrdersModalOpen: onOrdersModalOpen,
        refreshTrigger: updateOrdersTriggerState
    };

    window.filterOrders = filterOrders;

    function bootOrdersUi() {
        bindOrdersUi();
        updateOrdersTriggerState();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootOrdersUi);
    } else {
        bootOrdersUi();
    }
    window.addEventListener('pageshow', function () {
        bootOrdersUi();
        renderOrders(currentFilter || 'all');
    });
    document.addEventListener('turbo:load', function () {
        bootOrdersUi();
        renderOrders(currentFilter || 'all');
    });
    document.addEventListener('turbo:render', function () {
        bootOrdersUi();
        renderOrders(currentFilter || 'all');
    });
    document.addEventListener('kreezby-orders-updated', function () {
        if (currentDetailOrder) showOrderDetail(currentDetailOrder);
        renderOrders(currentFilter);
        updateOrdersTriggerState();
    });
})();
