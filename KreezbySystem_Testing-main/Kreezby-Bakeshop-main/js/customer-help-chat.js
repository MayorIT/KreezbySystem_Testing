/**
 * Customer Help Center assistant.
 * Answers from the shop menu, checkout rules, and orders saved on this device.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezbyHelpChatV4';
    var ORDERS_KEY = 'kreezbyOrders';
    var JNT_TRACK = 'https://www.jtexpress.ph/track-and-trace?billCodes=';

    var CATALOG = [
        { id: 'flavor-choc', name: 'Chocolate Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['chocolate crinkles', 'plain chocolate'] },
        { id: 'flavor-almond', name: 'Choco-Almond Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['almond', 'choco-almond', 'choco almond'] },
        { id: 'flavor-cashew', name: 'Choco-Cashew Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['cashew', 'choco-cashew', 'choco cashew'] },
        { id: 'flavor-straw', name: 'Strawberry Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['strawberry', 'straw'] },
        { id: 'flavor-velvet', name: 'Red Velvet Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['red velvet', 'velvet'] },
        { id: 'flavor-lemon', name: 'Lemon Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['lemon'] },
        { id: 'flavor-melon', name: 'Melon Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['melon'] },
        { id: 'flavor-pandan', name: 'Pandan Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['pandan'] },
        { id: 'flavor-ube', name: 'Ube Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, keys: ['ube', 'purple yam'] },
        { id: 'flavor-assorted', name: 'Assorted Crinkles', variant: 'Pouch (250g)', cost: 165, keys: ['assorted', 'assorted crinkles', 'mixed'] },
        { id: 'flavor-mango', name: 'Mango Crinkles', variant: 'Jar (250g Container)', cost: 165, keys: ['mango'] },
        { id: 'flavor-butternut', name: 'Choco Butternut Crinkles', variant: 'Jar (250g Container)', cost: 200, keys: ['butternut', 'choco butternut'] }
    ];

    var MENU = [
        { label: 'Track my order', prompt: 'Track my order' },
        { label: 'Crinkles and flavors', prompt: 'What crinkles do you have?' },
        { label: 'Delivery', prompt: 'How does delivery work?' },
        { label: 'Payment', prompt: 'How do I pay?' },
        { label: 'Damaged or wrong item', prompt: 'I received a damaged item' }
    ];

    var messages = [];
    var chips = [];
    var pending = false;
    var pendingFiles = [];
    var threadEl;
    var chipsEl;
    var formEl;
    var inputEl;
    var MAX_ATTACH_BYTES = 12 * 1024 * 1024;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function money(value) {
        var amount = Number(value);
        if (!isFinite(amount)) return String(value || '');
        return '₱' + amount.toFixed(2);
    }

    function nowLabel() {
        return new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    }

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function hasAny(text, keys) {
        for (var i = 0; i < keys.length; i++) {
            if (text.indexOf(keys[i]) !== -1) return true;
        }
        return false;
    }

    function sessionInfo() {
        try {
            return JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
        } catch (err) {
            return {};
        }
    }

    function customerName() {
        var session = sessionInfo();
        if (session.accountType === 'Customer' && session.userName) {
            return String(session.userName).trim();
        }
        if (session.accountType) return '';
        try {
            var profile = JSON.parse(localStorage.getItem('kreezbyCustomerProfile') || '{}');
            if (profile && profile.fullName) return String(profile.fullName).trim();
        } catch (err) { /* ignore */ }
        return '';
    }

    function loadOrders() {
        if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
            try { window.KreezbyPortalSeed.apply(); } catch (err) { /* ignore */ }
        }
        try {
            var parsed = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function myOrders() {
        var orders = loadOrders().slice().sort(function (a, b) {
            return String(b.date || '').localeCompare(String(a.date || ''));
        });
        var name = customerName().toLowerCase();
        if (!name) return orders;
        return orders.filter(function (order) {
            var shipName = (((order.shippingInfo || {}).fullName) || order.poEntity || '').toLowerCase();
            return shipName === name;
        });
    }

    function findOrder(token) {
        var needle = String(token || '').toLowerCase();
        var orders = loadOrders();
        for (var i = 0; i < orders.length; i++) {
            var order = orders[i];
            if (String(order.orderNumber || '').toLowerCase() === needle) return order;
            if (String(order.receiptNumber || '').toLowerCase() === needle) return order;
            if (String(order.trackingNumber || '').toLowerCase() === needle) return order;
        }
        if (/^\d{3,}$/.test(needle)) {
            for (var j = 0; j < orders.length; j++) {
                var num = String(orders[j].orderNumber || '');
                if (num.slice(-needle.length) === needle) return orders[j];
            }
        }
        return null;
    }

    function statusCopy(status) {
        if (status === 'Shipped') return 'Shipped — your order is on the way with J&T Express Philippines.';
        if (status === 'Completed') return 'Delivered — this order is complete. Enjoy your crinkles.';
        return 'Processing — Kreezby is preparing this order. A J&T tracking number is added once it ships.';
    }

    function paymentLabel(method) {
        var labels = {
            gcash: 'GCash',
            mayabank: 'MayaBank',
            maya: 'Maya',
            maribank: 'MariBank',
            metrobank: 'Metrobank',
            cash_on_delivery: 'Cash on delivery'
        };
        return labels[method] || method || 'Paid';
    }

    function itemSummary(order) {
        return Object.keys(order.items || {}).map(function (id) {
            var item = order.items[id] || {};
            return (item.name || 'Item') + ' × ' + (item.qty || 0);
        });
    }

    function orderTotal(order) {
        if (order.total) return String(order.total);
        if (order.subtotal != null) return money(order.subtotal);
        var items = Object.keys(order.items || {});
        var sum = items.reduce(function (total, id) {
            var item = order.items[id] || {};
            return total + (Number(item.cost) || 0) * (Number(item.qty) || 0);
        }, 0);
        return money(sum);
    }

    function pouches() {
        return CATALOG.filter(function (item) { return item.variant.indexOf('Pouch') === 0; });
    }

    function jars() {
        return CATALOG.filter(function (item) { return item.variant.indexOf('Jar') === 0; });
    }

    function matchedFlavors(text) {
        return CATALOG.filter(function (item) {
            return item.keys.some(function (key) { return text.indexOf(key) !== -1; });
        });
    }

    function productText(item) {
        var kind = item.variant.indexOf('Jar') === 0
            ? 'It comes in a resealable 250g jar for sharing and gifting.'
            : (item.id === 'flavor-assorted'
                ? 'It is a 250g pouch with a mix of crinkle flavors.'
                : 'It is a pouch of 8 pieces, packed for everyday snacking.');
        return item.name + ' is ' + money(item.cost) + '. ' + kind;
    }

    function chipsOf(list) {
        return list.map(function (item) {
            return { label: item.label, prompt: item.prompt };
        });
    }

    function menuReply(firstName) {
        var hello = firstName ? 'Hi ' + firstName + '!' : 'Hi!';
        return {
            text: hello + ' I am the Kreezby assistant. Ask me about crinkles, delivery, payment, or an order number and I will answer from the shop menu and the orders saved on this device.',
            blocks: [{ type: 'menu', title: 'What do you need help with?' }],
            chips: chipsOf(MENU)
        };
    }

    function trackReply() {
        var orders = myOrders();
        var name = customerName();
        if (!orders.length) {
            return {
                text: 'I do not see an order saved on this device yet. After checkout you get an order number like ORD-2026-1042. Type that number and I will look it up. You can also open the order bell on the shop home.',
                chips: [
                    { label: 'How does delivery work?', prompt: 'How does delivery work?' },
                    { label: 'How do I place an order?', prompt: 'How do I place an order?' },
                    { label: 'Main menu', prompt: 'Main menu' }
                ]
            };
        }
        var intro = name
            ? 'Here are the orders for ' + name + '. Tap one for the status, items, and J&T tracking number.'
            : 'Here are the orders saved on this device. Tap one, or type an order number such as ORD-2026-1042.';
        return {
            text: intro,
            blocks: [{ type: 'orders', orders: orders.slice(0, 6) }],
            chips: [
                { label: 'How does delivery work?', prompt: 'How does delivery work?' },
                { label: 'How do I pay?', prompt: 'How do I pay?' },
                { label: 'Main menu', prompt: 'Main menu' }
            ]
        };
    }

    function orderDetailReply(order) {
        var lines = itemSummary(order);
        var ship = order.shippingInfo || {};
        var bits = [
            order.orderNumber + ' · ' + statusCopy(order.status),
            lines.length ? 'Items: ' + lines.join(', ') + '.' : '',
            'Total ' + orderTotal(order) + '.',
            ship.address ? 'Deliver to: ' + ship.address + '.' : '',
            ship.notes ? 'Delivery note: ' + ship.notes + '.' : '',
            'Payment: ' + paymentLabel(order.paymentMethod) +
            (order.gcashReference ? ' · GCash ref ' + order.gcashReference : '') +
            (order.paymentMethod === 'gcash'
                ? ((order.paymentStatus === 'failed' || order.paymentFailed)
                    ? ' · failed transaction'
                    : (String(order.paymentStatus || '').toLowerCase() === 'paid' || (order.gcashWebpay && String(order.gcashWebpay.apiStatus || '').toLowerCase() === 'paid')
                        ? ' · paid by GCash webpay'
                        : (order.status === 'Completed' ? ' · delivered' : ' · GCash webpay')))
                : '') +
            (order.receiptNumber ? ' · Receipt ' + order.receiptNumber : '') + '.'
        ];
        if (order.trackingNumber) {
            bits.push('Courier: ' + (order.carrier || 'J&T Express Philippines') + '. Tracking number ' + order.trackingNumber + '.');
        } else if (order.status !== 'Completed') {
            bits.push('No J&T tracking number yet. It is added when the order moves to Shipped.');
        }
        var links = [];
        if (order.trackingNumber) {
            links.push({
                href: JNT_TRACK + encodeURIComponent(String(order.trackingNumber).trim()),
                label: 'Track ' + order.trackingNumber + ' on J&T'
            });
        }
        return {
            text: bits.filter(Boolean).join('\n'),
            blocks: links.length ? [{ type: 'links', links: links }] : [],
            chips: [
                { label: 'My other orders', prompt: 'Track my order' },
                { label: 'How does delivery work?', prompt: 'How does delivery work?' },
                { label: 'Report an issue', prompt: 'I received a damaged item' }
            ]
        };
    }

    function missingOrderReply(code) {
        var reply = trackReply();
        reply.text = 'I could not find ' + code + ' in the orders on this device. Check the number on your receipt, or pick an order below.';
        return reply;
    }

    function deliveryReply() {
        return {
            text: 'Orders move through three steps:\n1. Processing — prepared at Kreezby.\n2. Shipped — handed to J&T Express Philippines with a tracking number.\n3. Delivered — marked Completed.\n\nAt checkout, enter your full name, phone, and complete delivery address. A delivery note is optional (gate, landmark, or call-ahead).',
            chips: [
                { label: 'Track my order', prompt: 'Track my order' },
                { label: 'How do I pay?', prompt: 'How do I pay?' },
                { label: 'Main menu', prompt: 'Main menu' }
            ]
        };
    }

    function paymentReply() {
        return {
            text: 'Customers can pay with PayMongo or cash on delivery.\n\nPayMongo:\n1. Choose PayMongo at checkout.\n2. Enter the email for the receipt.\n3. Tap Show QR code.\n4. Scan the QR with GCash or Maya. The order is placed only after that scan succeeds.\n\nCash on delivery:\n1. Choose Cash on delivery.\n2. Place the order and pay cash when it arrives.',
            chips: [
                { label: 'Track my order', prompt: 'Track my order' },
                { label: 'How do I place an order?', prompt: 'How do I place an order?' },
                { label: 'How does delivery work?', prompt: 'How does delivery work?' }
            ]
        };
    }

    function catalogReply(list, intro) {
        return {
            text: intro,
            blocks: [{ type: 'products', items: list }],
            chips: [
                { label: 'Pouch flavors', prompt: 'What are the pouch flavors?' },
                { label: 'Jar specials', prompt: 'What are the jar specials?' },
                { label: 'How do I place an order?', prompt: 'How do I place an order?' }
            ]
        };
    }

    function crinklesReply() {
        return catalogReply(
            CATALOG,
            'Kreezby is The Crinkle Factory in Batangas City. The shop menu has 10 pouch flavors at ₱165.00, plus two jar specials. Nine pouches are 8 pieces. Assorted Crinkles is a 250g mixed pouch. Jars are resealable 250g containers for sharing and gifting. Choco Butternut is ₱200.00. Every other flavor is ₱165.00.'
        );
    }

    function pouchReply() {
        return catalogReply(
            pouches(),
            'Pouch favorites are fresh everyday crinkles in easy-to-carry packs. Most pouches are 8 pieces at ₱165.00. Assorted Crinkles is a 250g mixed pouch at ₱165.00.'
        );
    }

    function jarReply() {
        return catalogReply(
            jars(),
            'Jar specials are resealable 250g containers for sharing and gifting. Mango Crinkles are ₱165.00. Choco Butternut Crinkles are ₱200.00.'
        );
    }

    function flavorReply(items) {
        if (items.length === 1) {
            var item = items[0];
            return {
                text: productText(item),
                blocks: [{ type: 'products', items: items }],
                chips: [
                    { label: 'All flavors', prompt: 'What crinkles do you have?' },
                    { label: 'How do I place an order?', prompt: 'How do I place an order?' },
                    { label: 'How does delivery work?', prompt: 'How does delivery work?' }
                ]
            };
        }
        return catalogReply(
            items,
            'These are the matching crinkles on the shop menu. Most pouch flavors are 8 pieces. Assorted Crinkles is a 250g mixed pouch. Jars are 250g.'
        );
    }

    function priceReply() {
        return catalogReply(
            CATALOG,
            'Pouch crinkles are ₱165.00. Most pouches are 8 pieces, and Assorted Crinkles is a 250g mixed pouch. Mango Crinkles in a 250g jar are ₱165.00. Choco Butternut in a 250g jar is ₱200.00.'
        );
    }

    function orderHowReply() {
        return {
            text: 'To place an order:\n1. Open the shop and pick a crinkle flavor.\n2. Set the quantity and tap Add To Cart.\n3. Check out with your name, phone, and full delivery address.\n4. Choose PayMongo or cash on delivery.\n5. For PayMongo, enter your email and tap Show QR code, then scan it with GCash or Maya. For cash on delivery, pay when the order arrives.\n6. The PayMongo order is placed after the QR payment succeeds.',
            blocks: [{ type: 'links', links: [{ href: 'customer.html', label: 'Back to the shop' }] }],
            chips: [
                { label: 'What crinkles do you have?', prompt: 'What crinkles do you have?' },
                { label: 'How do I pay?', prompt: 'How do I pay?' },
                { label: 'Track my order', prompt: 'Track my order' }
            ]
        };
    }

    function issueReply() {
        return {
            text: 'Sorry about that. I can look up the order, and a person reviews product, payment, and delivery problems from Report an Issue.\n\nInclude:\n• the order number, such as ORD-2026-1042\n• the issue type: Product Quality, Order Status, or Payment / Refund\n• what you received, plus a photo of the pack or receipt\n\nThe team follows up in this Help Center.',
            blocks: [{ type: 'links', links: [{ href: 'report_issue-customer.html', label: 'Report an issue' }] }],
            chips: [
                { label: 'Track my order', prompt: 'Track my order' },
                { label: 'How does delivery work?', prompt: 'How does delivery work?' },
                { label: 'Main menu', prompt: 'Main menu' }
            ]
        };
    }

    function cancelReply() {
        return {
            text: 'Checkout does not have a cancel button after the order is placed. If it is still Processing, submit Report an Issue with the order number and say what you need changed (address, item, or payment). Once the status is Shipped, the parcel is already with J&T Express Philippines and you can follow it with the tracking number.',
            blocks: [{ type: 'links', links: [{ href: 'report_issue-customer.html', label: 'Report an issue' }] }],
            chips: [
                { label: 'Track my order', prompt: 'Track my order' },
                { label: 'How does delivery work?', prompt: 'How does delivery work?' }
            ]
        };
    }

    function partnerReply() {
        return {
            text: 'Shops that want to carry Kreezby crinkles can send a partnership inquiry. The customer shop itself is for pouch and jar orders, with delivery through J&T.',
            blocks: [{ type: 'links', links: [{ href: 'become-a-partner.html', label: 'Become a partner' }] }],
            chips: [
                { label: 'What crinkles do you have?', prompt: 'What crinkles do you have?' },
                { label: 'Main menu', prompt: 'Main menu' }
            ]
        };
    }

    function supportReply() {
        return issueReply();
    }

    function fallbackReply() {
        return {
            text: 'I answer from the Kreezby shop: crinkle flavors and prices, delivery with J&T, order tracking, and checkout payment. Pick a topic below, or type an order number.',
            blocks: [{ type: 'menu', title: 'Try one of these' }],
            chips: chipsOf(MENU)
        };
    }

    function replyTo(raw) {
        var original = String(raw || '').trim();
        var text = normalize(original);

        var orderMatch = original.match(/\b(ORD-\d{4}-\d+)\b/i);
        var receiptMatch = original.match(/\b(RCP-\d{4}-\d+)\b/i);
        var trackingMatch = original.match(/\b(JT\d{6,})\b/i);
        var code = orderMatch || receiptMatch || trackingMatch;
        if (code) {
            var found = findOrder(code[1]);
            return found ? orderDetailReply(found) : missingOrderReply(code[1].toUpperCase());
        }

        if (/^\d{3,6}$/.test(text)) {
            var byTail = findOrder(text);
            if (byTail) return orderDetailReply(byTail);
        }

        var shortGreeting = text.length < 24 && hasAny(text, ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'kamusta', 'help']);
        if (text === 'main menu' || text === 'menu' || shortGreeting) {
            var full = customerName();
            return menuReply(full ? full.split(' ')[0] : '');
        }

        if (hasAny(text, ['how to order', 'how do i order', 'place an order', 'how to buy', 'add to cart', 'how do i buy'])) {
            return orderHowReply();
        }
        if (hasAny(text, ['partner', 'reseller', 'retailer application', 'become a partner'])) {
            return partnerReply();
        }
        if (hasAny(text, ['cancel', 'change address', 'change my order', 'edit order', 'wrong address'])) {
            return cancelReply();
        }
        if (hasAny(text, ['damaged', 'damage', 'wrong item', 'missing item', 'stale', 'expired', 'refund', 'return', 'complaint', 'report', 'broken', 'spoiled', 'talk to support', 'human', 'agent'])) {
            return supportReply();
        }
        if (hasAny(text, ['pay', 'payment', 'gcash', 'maya', 'maribank', 'metrobank', 'qr code', 'receipt'])) {
            return paymentReply();
        }
        var askingTrack = hasAny(text, ['track', 'tracking', 'where is my', 'where is the', 'nasaan', 'order status', 'my order', 'status ng']);
        if (askingTrack) return trackReply();

        if (hasAny(text, ['delivery', 'deliver', 'shipping', 'courier', 'j and t', 'jnt', 'shipped', 'how long', 'when will'])) {
            return deliveryReply();
        }

        if (hasAny(text, ['jar special', 'jars', '250g', 'resealable'])) return jarReply();
        if (hasAny(text, ['pouch', 'pouches', '8 pcs', '8 pieces', '8 pc'])) return pouchReply();

        var flavors = matchedFlavors(text);
        if (!flavors.length && hasAny(text, ['chocolate', 'choco'])) {
            flavors = CATALOG.filter(function (item) {
                return item.name.toLowerCase().indexOf('choco') !== -1;
            });
        }
        if (flavors.length && !hasAny(text, ['how much are', 'price list', 'all flavor', 'what crinkle', 'menu'])) {
            return flavorReply(flavors);
        }

        if (hasAny(text, ['how much', 'price', 'prices', 'magkano', 'cost'])) return priceReply();
        if (hasAny(text, ['crinkle', 'flavor', 'flavors', 'menu', 'product', 'what do you sell', 'pasalubong'])) {
            return crinklesReply();
        }
        if (hasAny(text, ['cookie', 'oatmeal', 'cake', 'bread', 'donut', 'cupcake'])) {
            return catalogReply(
                CATALOG,
                'The shop menu is crinkles only. There are pouch flavors at ₱165.00, including Assorted Crinkles, plus Mango and Choco Butternut jar specials.'
            );
        }
        if (hasAny(text, ['where are you', 'location', 'address of', 'batangas', 'store hours', 'open'])) {
            return {
                text: 'Kreezby Bakeshop is The Crinkle Factory in Batangas City. Shop orders are delivered to the address you enter at checkout through J&T Express Philippines.',
                chips: [
                    { label: 'How does delivery work?', prompt: 'How does delivery work?' },
                    { label: 'What crinkles do you have?', prompt: 'What crinkles do you have?' }
                ]
            };
        }

        return fallbackReply();
    }

    function renderBlocks(host, blocks) {
        (blocks || []).forEach(function (block) {
            if (block.type === 'menu') {
                var menu = document.createElement('div');
                menu.className = 'help-menu';
                menu.innerHTML = '<p class="help-menu__title">' + escapeHtml(block.title || 'Choose a topic') + '</p>';
                MENU.forEach(function (item) {
                    var acc = document.createElement('div');
                    acc.className = 'help-acc';
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'help-menu__btn';
                    btn.setAttribute('data-acc', item.prompt);
                    btn.setAttribute('aria-expanded', 'false');
                    btn.innerHTML = '<span>' + escapeHtml(item.label) + '</span><span class="help-menu__chev" aria-hidden="true">›</span>';
                    var panel = document.createElement('div');
                    panel.className = 'help-acc__panel';
                    panel.hidden = true;
                    acc.appendChild(btn);
                    acc.appendChild(panel);
                    menu.appendChild(acc);
                });
                host.appendChild(menu);
            }
            if (block.type === 'orders') {
                var list = document.createElement('div');
                list.className = 'help-orders';
                (block.orders || []).forEach(function (order) {
                    var nest = document.createElement('div');
                    nest.className = 'help-nest';
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'help-order';
                    btn.setAttribute('data-prompt', order.orderNumber);
                    var items = itemSummary(order).join(', ');
                    btn.innerHTML =
                        '<span class="help-order__top"><strong>' + escapeHtml(order.orderNumber) + '</strong><em>' + escapeHtml(order.status || 'Processing') + '</em></span>' +
                        '<span class="help-order__items">' + escapeHtml(items || 'Crinkle order') + '</span>' +
                        '<span class="help-order__meta">' + escapeHtml(orderTotal(order)) +
                        (order.trackingNumber ? ' · ' + escapeHtml(order.trackingNumber) : '') + '</span>';
                    var slot = document.createElement('div');
                    slot.className = 'help-inline';
                    slot.hidden = true;
                    nest.appendChild(btn);
                    nest.appendChild(slot);
                    list.appendChild(nest);
                });
                host.appendChild(list);
            }
            if (block.type === 'products') {
                var products = document.createElement('div');
                products.className = 'help-products';
                (block.items || []).forEach(function (item) {
                    var nest = document.createElement('div');
                    nest.className = 'help-nest';
                    var row = document.createElement('button');
                    row.type = 'button';
                    row.className = 'help-product';
                    row.setAttribute('data-prompt', item.name);
                    row.innerHTML =
                        '<span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.variant) + '</small></span>' +
                        '<em>' + escapeHtml(money(item.cost)) + '</em>';
                    var slot = document.createElement('div');
                    slot.className = 'help-inline';
                    slot.hidden = true;
                    nest.appendChild(row);
                    nest.appendChild(slot);
                    products.appendChild(nest);
                });
                host.appendChild(products);
            }
            if (block.type === 'links') {
                var links = document.createElement('div');
                links.className = 'help-links';
                (block.links || []).forEach(function (link) {
                    var anchor = document.createElement('a');
                    anchor.className = 'help-link';
                    anchor.href = link.href;
                    anchor.textContent = link.label;
                    if (/^https?:/i.test(link.href)) {
                        anchor.target = '_blank';
                        anchor.rel = 'noopener noreferrer';
                    }
                    links.appendChild(anchor);
                });
                host.appendChild(links);
            }
        });
    }

    function fileKind(file) {
        var type = String((file && file.type) || '');
        if (type.indexOf('image/') === 0) return 'image';
        if (type.indexOf('video/') === 0) return 'video';
        if (type.indexOf('audio/') === 0) return 'audio';
        return 'file';
    }

    function appendHelpFiles(bubble, files) {
        if (!files || !files.length) return;
        var wrap = document.createElement('div');
        wrap.className = 'help-files';
        files.forEach(function (file) {
            if (file.kind === 'image' && file.url) {
                var img = document.createElement('img');
                img.className = 'help-file-image';
                img.alt = file.name || 'Photo';
                img.src = file.url;
                wrap.appendChild(img);
                return;
            }
            if (file.kind === 'video' && file.url) {
                var video = document.createElement('video');
                video.className = 'help-file-video';
                video.controls = true;
                video.src = file.url;
                wrap.appendChild(video);
                return;
            }
            if (file.kind === 'audio' && file.url) {
                var audio = document.createElement('audio');
                audio.className = 'help-file-audio';
                audio.controls = true;
                audio.src = file.url;
                wrap.appendChild(audio);
                return;
            }
            var doc = document.createElement('a');
            doc.className = 'help-file-doc';
            doc.textContent = file.name || 'Document';
            if (file.url) {
                doc.href = file.url;
                doc.download = file.name || 'file';
            } else {
                doc.href = '#';
            }
            wrap.appendChild(doc);
        });
        bubble.appendChild(wrap);
    }

    function renderThread() {
        if (!threadEl) return;
        threadEl.innerHTML = '';
        messages.forEach(function (msg) {
            var row = document.createElement('div');
            row.className = 'help-msg help-msg--' + msg.role;
            var bubble = document.createElement('div');
            bubble.className = 'help-bubble';
            appendHelpFiles(bubble, msg.attachments);
            if (msg.text) {
                var text = document.createElement('p');
                text.className = 'help-bubble__text';
                text.innerHTML = escapeHtml(msg.text).replace(/\n/g, '<br>');
                bubble.appendChild(text);
            }
            var time = document.createElement('span');
            time.className = 'help-bubble__time';
            time.textContent = msg.time || '';
            bubble.appendChild(time);
            if (msg.role === 'bot') {
                renderBlocks(bubble, msg.blocks);
                var hasMenu = (msg.blocks || []).some(function (block) { return block.type === 'menu'; });
                if (!hasMenu && msg.chips && msg.chips.length) renderChipRow(bubble, msg.chips);
            }
            if (msg.role === 'bot') {
                var avatar = document.createElement('div');
                avatar.className = 'help-msg__avatar';
                avatar.textContent = 'K';
                avatar.setAttribute('aria-hidden', 'true');
                row.appendChild(avatar);
            }
            row.appendChild(bubble);
            threadEl.appendChild(row);
        });
        if (pending) {
            var typing = document.createElement('div');
            typing.className = 'help-msg help-msg--bot help-msg--typing';
            typing.innerHTML = '<div class="help-msg__avatar" aria-hidden="true">K</div><div class="help-bubble"><span class="help-typing" aria-label="Assistant is typing"><i></i><i></i><i></i></span></div>';
            threadEl.appendChild(typing);
        }
        threadEl.scrollTop = threadEl.scrollHeight;
    }

    function renderChipRow(host, list) {
        var row = document.createElement('div');
        row.className = 'help-inline__chips';
        (list || []).forEach(function (chip) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'help-chip';
            btn.setAttribute('data-prompt', chip.prompt);
            btn.textContent = chip.label;
            row.appendChild(btn);
        });
        var follow = document.createElement('div');
        follow.className = 'help-inline help-follow';
        follow.hidden = true;
        host.appendChild(row);
        host.appendChild(follow);
    }

    function renderChips() {
        if (!chipsEl) return;
        chipsEl.innerHTML = '';
    }

    function fillAnswer(host, reply) {
        host.innerHTML = '';
        if (reply.text) {
            var text = document.createElement('p');
            text.className = 'help-inline__text';
            text.innerHTML = escapeHtml(reply.text).replace(/\n/g, '<br>');
            host.appendChild(text);
        }
        renderBlocks(host, reply.blocks);
        var hasMenu = (reply.blocks || []).some(function (block) { return block.type === 'menu'; });
        if (!hasMenu && reply.chips && reply.chips.length) renderChipRow(host, reply.chips);
    }

    function accParts(acc) {
        var btn = null;
        var panel = null;
        Array.prototype.forEach.call(acc.children, function (child) {
            if (child.classList.contains('help-menu__btn')) btn = child;
            if (child.classList.contains('help-acc__panel')) panel = child;
        });
        return { btn: btn, panel: panel };
    }

    function closeAcc(acc) {
        if (!acc) return;
        acc.classList.remove('is-open');
        var parts = accParts(acc);
        if (parts.btn) parts.btn.setAttribute('aria-expanded', 'false');
        if (parts.panel) parts.panel.hidden = true;
    }

    function closeEveryAccordion() {
        if (!threadEl) return;
        Array.prototype.forEach.call(threadEl.querySelectorAll('.help-acc.is-open'), closeAcc);
    }

    function revealUnder(anchor) {
        if (!threadEl || !anchor) return;
        var threadRect = threadEl.getBoundingClientRect();
        var rect = anchor.getBoundingClientRect();
        if (rect.top < threadRect.top + 4) {
            threadEl.scrollTop -= threadRect.top + 8 - rect.top;
        }
        var panel = anchor.nextElementSibling;
        if (!panel || panel.hidden) return;
        var panelTop = panel.getBoundingClientRect().top;
        var limit = threadRect.bottom - 88;
        if (panelTop > limit) {
            var room = rect.top - threadRect.top - 8;
            if (room > 0) threadEl.scrollTop += Math.min(panelTop - limit, room);
        }
    }

    function toggleAccordion(btn) {
        var acc = btn.closest('.help-acc');
        if (!acc) return;
        var parts = accParts(acc);
        var open = btn.getAttribute('aria-expanded') === 'true';
        var menu = acc.parentNode;
        if (menu) {
            Array.prototype.forEach.call(menu.children, function (child) {
                if (child !== acc && child.classList.contains('help-acc')) closeAcc(child);
            });
        }
        if (open) {
            closeAcc(acc);
            return;
        }
        btn.setAttribute('aria-expanded', 'true');
        acc.classList.add('is-open');
        if (parts.panel) {
            parts.panel.hidden = false;
            if (!parts.panel.getAttribute('data-filled')) {
                fillAnswer(parts.panel, replyTo(btn.getAttribute('data-acc')));
                parts.panel.setAttribute('data-filled', '1');
            }
        }
        revealUnder(btn);
    }

    function openInline(btn, slot, prompt) {
        var list = btn.parentNode && btn.parentNode.classList.contains('help-nest') ? btn.parentNode.parentNode : null;
        if (list) {
            Array.prototype.forEach.call(list.children, function (child) {
                var inline = null;
                var rowBtn = null;
                Array.prototype.forEach.call(child.children || [], function (node) {
                    if (node.classList.contains('help-inline')) inline = node;
                    if (node.hasAttribute && node.hasAttribute('data-prompt')) rowBtn = node;
                });
                if (inline && inline !== slot) {
                    inline.hidden = true;
                    inline.removeAttribute('data-open');
                }
                if (rowBtn && rowBtn !== btn) rowBtn.classList.remove('is-open');
            });
        }
        if (!slot.hidden && slot.getAttribute('data-open') === prompt) {
            slot.hidden = true;
            slot.removeAttribute('data-open');
            btn.classList.remove('is-open');
            return;
        }
        fillAnswer(slot, replyTo(prompt));
        slot.hidden = false;
        slot.setAttribute('data-open', prompt);
        btn.classList.add('is-open');
        revealUnder(btn);
    }

    function persist() {
        try {
            var slim = messages.map(function (msg) {
                var copy = {
                    role: msg.role,
                    text: msg.text,
                    blocks: msg.blocks,
                    chips: msg.chips || [],
                    time: msg.time
                };
                if (msg.attachments && msg.attachments.length) {
                    copy.attachments = msg.attachments.map(function (file) {
                        var item = {
                            name: file.name,
                            kind: file.kind,
                            size: file.size,
                            type: file.type
                        };
                        if (file.url && String(file.url).indexOf('data:') === 0 && String(file.url).length < 400000) {
                            item.url = file.url;
                        }
                        return item;
                    });
                }
                return copy;
            });
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: slim, chips: chips }));
        } catch (err) { /* ignore */ }
    }

    function restore() {
        try {
            var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
            if (saved && Array.isArray(saved.messages) && saved.messages.length) {
                messages = saved.messages;
                chips = [];
                return;
            }
        } catch (err) { /* ignore */ }
        var full = customerName();
        var greeting = menuReply(full ? full.split(' ')[0] : '');
        greeting.time = nowLabel();
        messages = [{
            role: 'bot',
            text: greeting.text,
            blocks: greeting.blocks,
            time: greeting.time,
            chips: []
        }];
        chips = [];
    }

    function pushBot(reply) {
        messages.push({
            role: 'bot',
            text: reply.text,
            blocks: reply.blocks || [],
            chips: reply.chips || [],
            time: nowLabel()
        });
        chips = [];
        pending = false;
        renderThread();
        renderChips();
        persist();
    }

    function attachmentAck(files) {
        var first = files && files[0];
        var label = !first ? 'file' : (first.kind === 'image' ? 'photo' : (first.kind === 'video' ? 'video' : (first.kind === 'audio' ? 'voice message' : 'file')));
        var name = first && first.name ? ' (' + first.name + ')' : '';
        return {
            text: files.length > 1
                ? 'Thanks, we received your files. Add a short note if you want us to check a specific order.'
                : 'Thanks, we received your ' + label + name + '. Add a short note if you want us to check a specific order.',
            blocks: [],
            chips: chipsOf(MENU)
        };
    }

    function ask(raw, attachments, options) {
        var text = String(raw || '').trim();
        var files = attachments || [];
        if ((!text && !files.length) || pending) return false;
        messages.push({
            role: 'user',
            text: text,
            time: nowLabel(),
            attachments: files
        });
        pending = true;
        if (inputEl && !(options && options.keepDraft)) inputEl.value = '';
        renderThread();
        window.setTimeout(function () {
            try {
                pushBot(text ? replyTo(text) : attachmentAck(files));
            } catch (err) {
                pending = false;
                pushBot(fallbackReply());
            }
        }, 180);
        return true;
    }

    function showHelpNote(message) {
        var note = document.getElementById('help-attach-note');
        if (!note) return;
        note.hidden = !message;
        note.textContent = message || '';
    }

    function renderHelpPending() {
        var box = document.getElementById('help-attach-preview');
        if (!box) return;
        box.innerHTML = '';
        box.hidden = !pendingFiles.length;
        pendingFiles.forEach(function (item, index) {
            var chip = document.createElement('div');
            chip.className = 'help-attach-chip' + (item.kind === 'file' ? ' is-file' : '');
            if (item.kind === 'image') {
                var img = document.createElement('img');
                img.alt = '';
                img.src = item.url;
                chip.appendChild(img);
            } else if (item.kind === 'video') {
                var video = document.createElement('video');
                video.muted = true;
                video.src = item.url;
                chip.appendChild(video);
            } else {
                var label = document.createElement('span');
                label.textContent = item.name;
                chip.appendChild(label);
            }
            var remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'help-attach-remove';
            remove.setAttribute('aria-label', 'Remove attachment');
            remove.textContent = '×';
            remove.addEventListener('click', function () {
                pendingFiles.splice(index, 1);
                renderHelpPending();
            });
            chip.appendChild(remove);
            box.appendChild(chip);
        });
    }

    function addHelpFiles(fileList) {
        if (pending) {
            showHelpNote('Wait for the assistant to finish before attaching another file.');
            return;
        }
        var rejected = 0;
        Array.prototype.forEach.call(fileList || [], function (file) {
            if (!file) return;
            if (file.size > MAX_ATTACH_BYTES) {
                rejected += 1;
                return;
            }
            var kind = fileKind(file);
            pendingFiles.push({
                name: file.name || (kind === 'image' ? 'Photo' : 'Attachment'),
                kind: kind,
                type: file.type || '',
                size: file.size || 0,
                url: URL.createObjectURL(file)
            });
        });
        renderHelpPending();
        showHelpNote(rejected ? 'Each file must be 12 MB or smaller.' : '');
    }

    var closeHelpCamera = null;

    function openHelpCamera() {
        if (closeHelpCamera) closeHelpCamera();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showHelpNote('This browser cannot open the camera.');
            return;
        }
        var overlay = document.createElement('div');
        overlay.className = 'kreezby-camera';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Camera');
        overlay.innerHTML =
            '<div class="kreezby-camera__panel">' +
                '<video autoplay playsinline muted></video>' +
                '<div class="kreezby-camera__actions">' +
                    '<button type="button" data-camera="cancel">Cancel</button>' +
                    '<button type="button" data-camera="shot">Take photo</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        var video = overlay.querySelector('video');
        var stream = null;
        var settled = false;

        function finish(file, error) {
            if (settled) return;
            settled = true;
            if (stream) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                stream = null;
            }
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (closeHelpCamera === finish) closeHelpCamera = null;
            if (error) showHelpNote(error);
            else if (file) addHelpFiles([file]);
        }

        closeHelpCamera = finish;
        overlay.querySelector('[data-camera="cancel"]').addEventListener('click', function () {
            finish(null, '');
        });
        overlay.querySelector('[data-camera="shot"]').addEventListener('click', function () {
            var width = video.videoWidth || 0;
            var height = video.videoHeight || 0;
            if (!width || !height) return;
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(video, 0, 0, width, height);
            canvas.toBlob(function (blob) {
                if (!blob) {
                    finish(null, 'Could not take the photo.');
                    return;
                }
                finish(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }), '');
            }, 'image/jpeg', 0.92);
        });

        function requestCamera(attempt) {
            var constraints = attempt === 0
                ? { video: { facingMode: { ideal: 'environment' } }, audio: false }
                : { video: true, audio: false };
            return navigator.mediaDevices.getUserMedia(constraints).catch(function () {
                if (attempt === 0) return requestCamera(1);
                throw new Error('camera');
            });
        }

        requestCamera(0).then(function (media) {
            if (settled) {
                media.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            stream = media;
            video.srcObject = media;
            var play = video.play();
            if (play && typeof play.catch === 'function') play.catch(function () {});
        }).catch(function () {
            finish(null, 'Allow camera access to take a photo.');
        });
    }

    function wireHelpAttachments() {
        var button = document.getElementById('help-attach-btn');
        var menu = document.getElementById('help-attach-menu');
        if (!button || !menu || !formEl) return;

        function setOpen(open) {
            menu.hidden = !open;
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(menu.hidden);
        });

        menu.addEventListener('click', function (event) {
            event.stopPropagation();
            var item = event.target.closest('[data-attach]');
            if (!item) return;
            var kind = item.getAttribute('data-attach');
            setOpen(false);
            if (kind === 'camera') {
                openHelpCamera();
                return;
            }
            var picker = document.getElementById('help-file-' + kind);
            if (!picker) return;
            picker.value = '';
            picker.click();
        });

        document.addEventListener('click', function () {
            setOpen(false);
        });

        ['document'].forEach(function (kind) {
            var picker = document.getElementById('help-file-' + kind);
            if (!picker) return;
            picker.addEventListener('change', function () {
                addHelpFiles(picker.files);
                picker.value = '';
            });
        });
    }

    function onPromptClick(event) {
        var accBtn = event.target.closest('.help-menu__btn');
        if (accBtn && threadEl && threadEl.contains(accBtn)) {
            event.preventDefault();
            toggleAccordion(accBtn);
            return;
        }
        var btn = event.target.closest('[data-prompt]');
        if (!btn || !threadEl || !threadEl.contains(btn)) return;
        event.preventDefault();
        var prompt = btn.getAttribute('data-prompt') || '';
        if (normalize(prompt) === 'main menu') {
            closeEveryAccordion();
            var first = threadEl.querySelector('.help-menu');
            if (first) revealUnder(first);
            return;
        }
        var topic = null;
        Array.prototype.forEach.call(threadEl.querySelectorAll('.help-menu__btn'), function (item) {
            if (!topic && item.getAttribute('data-acc') === prompt) topic = item;
        });
        if (topic && !btn.closest('.help-acc__panel, .help-inline')) {
            toggleAccordion(topic);
            return;
        }
        var nest = btn.parentNode && btn.parentNode.classList.contains('help-nest') ? btn.parentNode : null;
        var slot = null;
        if (nest) {
            Array.prototype.forEach.call(nest.children, function (child) {
                if (child.classList.contains('help-inline')) slot = child;
            });
        } else if (btn.parentNode && btn.parentNode.nextElementSibling && btn.parentNode.nextElementSibling.classList.contains('help-follow')) {
            slot = btn.parentNode.nextElementSibling;
        }
        if (!slot) {
            ask(prompt);
            return;
        }
        openInline(btn, slot, prompt);
    }

    function init() {
        var root = document.getElementById('help-bot');
        if (!root) return;
        threadEl = document.getElementById('help-bot-thread');
        chipsEl = document.getElementById('help-bot-quick');
        formEl = document.getElementById('help-bot-form');
        inputEl = document.getElementById('help-bot-input');
        restore();
        renderThread();
        renderChips();
        root.addEventListener('click', onPromptClick);
        if (formEl) {
            formEl.addEventListener('submit', function (event) {
                event.preventDefault();
                var files = pendingFiles.slice();
                if (!ask(inputEl ? inputEl.value : '', files)) return;
                pendingFiles = [];
                renderHelpPending();
                showHelpNote('');
            });
        }
        wireHelpAttachments();
        wireHelpVoice();
    }

    var helpVoice = { recorder: null, stream: null, chunks: [], send: false, started: 0, timer: 0 };

    function helpVoiceClock(ms) {
        var total = Math.max(0, Math.floor(ms / 1000));
        var minutes = Math.floor(total / 60);
        var seconds = total % 60;
        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    function setHelpVoiceUi(on) {
        var btn = document.getElementById('help-voice-btn');
        if (!btn) return;
        btn.classList.toggle('is-recording', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.title = on ? 'Stop and send voice message' : 'Voice message';
    }

    function finishHelpVoice() {
        window.clearInterval(helpVoice.timer);
        helpVoice.timer = 0;
        setHelpVoiceUi(false);
        if (helpVoice.stream) {
            helpVoice.stream.getTracks().forEach(function (track) { track.stop(); });
            helpVoice.stream = null;
        }
    }

    function stopHelpVoice(send) {
        helpVoice.send = !!send;
        if (helpVoice.recorder && helpVoice.recorder.state === 'recording') {
            helpVoice.recorder.stop();
            return;
        }
        finishHelpVoice();
        showHelpNote('');
    }

    function startHelpVoice() {
        if (pending) {
            showHelpNote('Wait for the assistant to finish before sending a voice message.');
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
            showHelpNote('Voice messages need a microphone in this browser.');
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
            var mime = '';
            for (var i = 0; i < types.length; i++) {
                if (window.MediaRecorder.isTypeSupported(types[i])) {
                    mime = types[i];
                    break;
                }
            }
            var recorder;
            try {
                recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
            } catch (err) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                showHelpNote('This browser could not start a voice recording.');
                return;
            }
            helpVoice.stream = stream;
            helpVoice.recorder = recorder;
            helpVoice.chunks = [];
            helpVoice.send = false;
            helpVoice.started = Date.now();
            recorder.ondataavailable = function (event) {
                if (event.data && event.data.size) helpVoice.chunks.push(event.data);
            };
            recorder.onstop = function () {
                var blob = new Blob(helpVoice.chunks, { type: recorder.mimeType || mime || 'audio/webm' });
                var shouldSend = helpVoice.send && blob.size && (Date.now() - helpVoice.started) > 350;
                helpVoice.recorder = null;
                helpVoice.chunks = [];
                finishHelpVoice();
                if (!shouldSend) {
                    showHelpNote(helpVoice.send ? 'Record a little longer, then tap the microphone to send.' : '');
                    return;
                }
                showHelpNote('');
                ask('', [{
                    name: 'Voice message',
                    kind: 'audio',
                    type: blob.type || '',
                    size: blob.size,
                    url: URL.createObjectURL(blob)
                }], { keepDraft: true });
            };
            recorder.start();
            setHelpVoiceUi(true);
            showHelpNote('Recording 0:00 — tap the microphone to send');
            helpVoice.timer = window.setInterval(function () {
                showHelpNote('Recording ' + helpVoiceClock(Date.now() - helpVoice.started) + ' — tap the microphone to send');
            }, 500);
        }).catch(function () {
            showHelpNote('Allow microphone access to send a voice message.');
        });
    }

    function wireHelpVoice() {
        var button = document.getElementById('help-voice-btn');
        if (!button) return;
        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (helpVoice.recorder && helpVoice.recorder.state === 'recording') stopHelpVoice(true);
            else startHelpVoice();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
