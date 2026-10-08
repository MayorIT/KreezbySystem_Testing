/**
 * Customer Help Center assistant.
 * Answers from the shop menu, checkout rules, and orders saved on this device.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezbyHelpChatV3';
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
    var threadEl;
    var chipsEl;
    var formEl;
    var inputEl;

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
        if (hasAny(text, ['wholesale', 'partner', 'reseller', 'retailer application', 'become a partner'])) {
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
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'help-menu__btn';
                    btn.setAttribute('data-prompt', item.prompt);
                    btn.innerHTML = '<span>' + escapeHtml(item.label) + '</span><span aria-hidden="true">›</span>';
                    menu.appendChild(btn);
                });
                host.appendChild(menu);
            }
            if (block.type === 'orders') {
                var list = document.createElement('div');
                list.className = 'help-orders';
                (block.orders || []).forEach(function (order) {
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
                    list.appendChild(btn);
                });
                host.appendChild(list);
            }
            if (block.type === 'products') {
                var products = document.createElement('div');
                products.className = 'help-products';
                (block.items || []).forEach(function (item) {
                    var row = document.createElement('button');
                    row.type = 'button';
                    row.className = 'help-product';
                    row.setAttribute('data-prompt', item.name);
                    row.innerHTML =
                        '<span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.variant) + '</small></span>' +
                        '<em>' + escapeHtml(money(item.cost)) + '</em>';
                    products.appendChild(row);
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

    function renderThread() {
        if (!threadEl) return;
        threadEl.innerHTML = '';
        messages.forEach(function (msg) {
            var row = document.createElement('div');
            row.className = 'help-msg help-msg--' + msg.role;
            var bubble = document.createElement('div');
            bubble.className = 'help-bubble';
            var text = document.createElement('p');
            text.className = 'help-bubble__text';
            text.innerHTML = escapeHtml(msg.text).replace(/\n/g, '<br>');
            bubble.appendChild(text);
            if (msg.role === 'bot') renderBlocks(bubble, msg.blocks);
            var time = document.createElement('span');
            time.className = 'help-bubble__time';
            time.textContent = msg.time || '';
            bubble.appendChild(time);
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

    function renderChips() {
        if (!chipsEl) return;
        chipsEl.innerHTML = '';
        chips.forEach(function (chip) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'help-chip';
            btn.setAttribute('data-prompt', chip.prompt);
            btn.textContent = chip.label;
            chipsEl.appendChild(btn);
        });
    }

    function persist() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: messages, chips: chips }));
        } catch (err) { /* ignore */ }
    }

    function restore() {
        try {
            var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
            if (saved && Array.isArray(saved.messages) && saved.messages.length) {
                messages = saved.messages;
                chips = Array.isArray(saved.chips) ? saved.chips : chipsOf(MENU);
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
            time: greeting.time
        }];
        chips = greeting.chips;
    }

    function pushBot(reply) {
        messages.push({
            role: 'bot',
            text: reply.text,
            blocks: reply.blocks || [],
            time: nowLabel()
        });
        chips = reply.chips && reply.chips.length ? reply.chips : chipsOf(MENU);
        pending = false;
        renderThread();
        renderChips();
        persist();
    }

    function ask(raw) {
        var text = String(raw || '').trim();
        if (!text || pending) return;
        messages.push({ role: 'user', text: text, time: nowLabel() });
        pending = true;
        if (inputEl) inputEl.value = '';
        renderThread();
        window.setTimeout(function () {
            pushBot(replyTo(text));
        }, 550);
    }

    function onPromptClick(event) {
        var btn = event.target.closest('[data-prompt]');
        if (!btn || !formEl || !formEl.contains(btn) && !threadEl.contains(btn) && !chipsEl.contains(btn)) return;
        event.preventDefault();
        ask(btn.getAttribute('data-prompt'));
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
                ask(inputEl ? inputEl.value : '');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
