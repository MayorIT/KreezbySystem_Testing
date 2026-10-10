/**
 * Functional test records for customer, admin, and retailer modules.
 * Overlay seed IDs when kreezbyPortalSeedVersion is stale; keep user-created rows.
 */
(function (root) {
    'use strict';

    var VERSION = '20261009retail';
    var VERSION_KEY = 'kreezbyPortalSeedVersion';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return fallback;
    }

    function writeJson(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }

    function currentVersion() {
        try { return localStorage.getItem(VERSION_KEY) || ''; } catch (e) { return ''; }
    }

    function line(qty, unit, name, note, cost) {
        return { qty: qty, unit: unit, name: name, note: note || '', cost: cost, total: qty * cost };
    }

    function boLine(name, unit, note, ordered, received, cost) {
        return {
            name: name, unit: unit, note: note || '',
            ordered: ordered, received: received, backOrder: Math.max(0, ordered - received),
            cost: cost, total: (ordered - received) * cost
        };
    }

    var SEED_POS = {
        'PO-SIDC-001': {
            code: 'PO-SIDC-001',             dateCreated: '2026-09-12', entity: 'SIDC Batangas Hub',
            entityType: 'retailer', area: 'Batangas City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Weekly replenishment on consignment.',
            paymentMethod: 'consignment',
            paymentVerified: false, paymentStatus: 'pending',
            items: [
                line(80, 'Pouches', 'Chocolate Crinkles', '', 165)
            ]
        },
        'PO-MCC-001': {
            code: 'PO-MCC-001',             dateCreated: '2026-09-20', entity: 'Makati Crinkle Corner',
            entityType: 'retailer', area: 'Makati', status: 'PENDING', statusClass: 'pending',
            remarks: 'Festival weekend stock-up. Paid by check.',
            paymentMethod: 'check', checkNumber: '104482',
            paymentVerified: false, paymentStatus: 'pending',
            items: [
                line(50, 'Pouches', 'Chocolate Crinkles', '', 165)
            ]
        },
        'PO-QCM-001': {
            code: 'PO-QCM-001',             dateCreated: '2026-09-16', entity: 'Quezon Crinkle Mart',
            entityType: 'retailer', area: 'Lucena City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Partial delivery of Chocolate Crinkles pouches. Cash on delivery.',
            paymentMethod: 'cash_on_delivery', paymentVerified: true, paymentStatus: 'verified',
            items: [
                line(36, 'Pouches', 'Chocolate Crinkles', 'Received 24', 165)
            ]
        },
        'PO-STAFF-SIDC': {
            code: 'PO-STAFF-SIDC', dateCreated: '2026-09-18', entity: 'SIDC Batangas Hub',
            entityType: 'retailer', orderSource: 'staff', area: 'Batangas City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Staff order for this shop.',
            items: [line(12, 'Pouches', 'Chocolate Crinkles', '', 165)]
        },
        'PO-STAFF-MCC': {
            code: 'PO-STAFF-MCC', dateCreated: '2026-09-18', entity: 'Makati Crinkle Corner',
            entityType: 'retailer', orderSource: 'staff', area: 'Makati', status: 'PENDING', statusClass: 'pending',
            remarks: 'Staff order for this shop.',
            items: [line(10, 'Pouches', 'Chocolate Crinkles', '', 165)]
        },
        'ORD-2026-0102': {
            code: 'ORD-2026-0102', dateCreated: '2026-09-29', entity: 'Retailer',
            entityType: 'retailer', area: '', status: 'PENDING', statusClass: 'pending',
            remarks: 'GCash webpay paid. Chocolate Crinkles pouches. Inventory already deducted.',
            paymentMethod: 'gcash', gcashReference: '202609291810450012', gcashPaidTo: '09178001650',
            paymentVerified: true, paymentStatus: 'paid', inventoryDeducted: true,
            gcashWebpay: {
                checkoutSessionId: 'cs_gcash_9982314',
                webpayReferenceNumber: '202609291810450012',
                apiStatus: 'PAID',
                paidAt: '2026-09-29T18:10:45Z'
            },
            items: [
                line(17, 'Pouches', 'Chocolate Crinkles', 'GCash webpay', 200)
            ]
        },
        'PO-C-MS-001': {
            code: 'PO-C-MS-001', dateCreated: '2026-09-22 08:20', entity: 'Maria Santos',
            entityType: 'customer', area: 'Batangas City', status: 'PROCESSING', statusClass: 'pending',
            remarks: 'Shop order ORD-2026-1042 — GCash reference waiting for verification.',
            trackingNumber: '', courier: 'J&T Express Philippines',
            paymentMethod: 'gcash', gcashReference: '8291042165831', gcashPaidTo: '09178001650',
            paymentVerified: false, paymentStatus: 'pending', shopOrderNumber: 'ORD-2026-1042',
            items: [
                line(3, 'Jars', 'Chocolate Crinkles', '', 165),
                line(2, 'Jars', 'Ube Crinkles', '', 165)
            ]
        },
        'PO-C-MS-002': {
            code: 'PO-C-MS-002', dateCreated: '2026-09-18 16:10', entity: 'Maria Santos',
            entityType: 'customer', area: 'Batangas City', status: 'SHIPPED', statusClass: 'shipped',
            remarks: 'Shop order ORD-2026-1038 in transit.',
            trackingNumber: 'JT6049281735001', courier: 'J&T Express Philippines',
            items: [line(4, 'Jars', 'Lemon Crinkles', '', 165)]
        },
        'PO-C-MS-003': {
            code: 'PO-C-MS-003', dateCreated: '2026-09-10 10:00', entity: 'Maria Santos',
            entityType: 'customer', area: 'Batangas City', status: 'COMPLETED', statusClass: 'completed',
            remarks: 'Shop order ORD-2026-1021 delivered.',
            trackingNumber: 'JT6049281734888', courier: 'J&T Express Philippines',
            items: [
                line(2, 'Jars', 'Chocolate Crinkles', '', 165),
                line(1, 'Jars', 'Strawberry Crinkles', '', 165)
            ]
        },
        'PO-C-KR-001': {
            code: 'PO-C-KR-001', dateCreated: '2026-09-05 13:45', entity: 'Kyla Ramos',
            entityType: 'customer', area: 'Lipa City', status: 'COMPLETED', statusClass: 'completed',
            remarks: 'Shop order ORD-2026-1015 delivered. GCash reference verified.',
            trackingNumber: 'JT6049281734500', courier: 'J&T Express Philippines',
            paymentMethod: 'gcash', gcashReference: '7049182635501', gcashPaidTo: '09178001650',
            paymentVerified: true, paymentStatus: 'verified', shopOrderNumber: 'ORD-2026-1015',
            items: [line(6, 'Jars', 'Choco Almond Crinkles', '', 175)]
        },
        'PO-C-BA-001': {
            code: 'PO-C-BA-001', dateCreated: '2026-09-20 19:05', entity: 'Bryle Atienza',
            entityType: 'customer', area: 'Lipa City', status: 'PROCESSING', statusClass: 'pending',
            remarks: 'Shop order ORD-2026-1008 awaiting pack.',
            items: [line(2, 'Jars', 'Mango Crinkles', '', 165)]
        }
    };

    var SEED_RECEIPTS = {
        'recv-flour-001': {
            id: 'recv-flour-001', supplier: 'Golden Harvest Milling', sourceType: 'Supplier',
            entity: 'Kreezby Bakeshop', dateReceived: '2026-09-14 08:15',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Flour and sugar delivery complete.',
            poOrigin: 'PO-SUP-441', reference: 'GRN-441', subTotal: 48200,
            lineItems: [
                line(40, 'Sacks', 'All-Purpose Flour', '25kg', 980),
                line(20, 'Sacks', 'Refined Sugar', '25kg', 450)
            ]
        },
        'recv-sidc-001': {
            id: 'recv-sidc-001', supplier: 'Kreezby Bakeshop', sourceType: 'Retailer',
            entity: 'SIDC Batangas Hub', dateReceived: '2026-09-12',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Hub received Chocolate Crinkles pouches. Paid by GCash.',
            poOrigin: 'PO-SIDC-001', reference: 'SIDC-IN-0912', subTotal: 13200,
            lineItems: [
                line(80, 'Pouches', 'Chocolate Crinkles', '', 165)
            ]
        },
        'recv-qcm-001': {
            id: 'recv-qcm-001', supplier: 'Kreezby Bakeshop', sourceType: 'Retailer',
            entity: 'Quezon Crinkle Mart', dateReceived: '2026-09-17',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Partial Chocolate Crinkles pouches. Paid in cash.',
            poOrigin: 'PO-QCM-001', reference: 'QCM-IN-0917', subTotal: 3960,
            lineItems: [line(24, 'Pouches', 'Chocolate Crinkles', 'Partial', 165)]
        },
        'recv-maria-001': {
            id: 'recv-maria-001', supplier: 'Maria Santos', sourceType: 'Customer',
            entity: 'Maria Santos', dateReceived: '2026-09-11 14:40',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Customer order packed and released.',
            poOrigin: 'PO-C-MS-003', reference: 'ORD-2026-1021', subTotal: 495,
            lineItems: [
                line(2, 'Jars', 'Chocolate Crinkles', '', 165),
                line(1, 'Jars', 'Strawberry Crinkles', '', 165)
            ]
        }
    };

    var SEED_BOS = {
        'BO-SIDC-001': {
            code: 'BO-SIDC-001', poCode: 'PO-QCM-001', dateCreated: '2026-09-16',
            entity: 'Quezon Crinkle Mart', entityType: 'retailer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'Sep 26, 2026', status: 'PENDING', statusClass: 'pending',
            remarks: 'Remaining Chocolate Crinkles pouches. Paid in cash.',
            items: [boLine('Chocolate Crinkles', 'Pouches', 'Outstanding', 12, 0, 165)]
        },
        'BO-MCC-001': {
            code: 'BO-MCC-001', poCode: 'PO-MCC-001', dateCreated: '2026-09-20',
            entity: 'Makati Crinkle Corner', entityType: 'retailer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'Sep 25, 2026', status: 'PENDING', statusClass: 'pending',
            remarks: 'Chocolate Crinkles pouches not yet dispatched. Paid by check.',
            items: [
                boLine('Chocolate Crinkles', 'Pouches', '', 50, 0, 165)
            ]
        },
        'BO-C-MS-001': {
            code: 'BO-C-MS-001', poCode: 'PO-C-MS-001', dateCreated: '2026-09-22 08:25',
            entity: 'Maria Santos', entityType: 'customer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'Sep 24, 2026', status: 'PENDING', statusClass: 'pending',
            remarks: 'Customer shop order still packing.',
            items: [
                boLine('Chocolate Crinkles', 'Jars', '', 3, 0, 165),
                boLine('Ube Crinkles', 'Jars', '', 2, 0, 165)
            ]
        }
    };

    var SEED_RETURNS = {
        'RET-SIDC-001': {
            code: 'RET-SIDC-001', poOrigin: 'PO-SIDC-001', dateCreated: '2026-09-13',
            entity: 'SIDC Batangas Hub', entityType: 'retailer', status: 'RETURNED', statusClass: 'rejected',
            reason: 'Crushed corners on 6 Chocolate Crinkles pouches. Paid by GCash.',
            items: [line(6, 'Pouches', 'Chocolate Crinkles', 'Crushed corners', 165)]
        },
        'RET-MS-001': {
            code: 'RET-MS-001', poOrigin: 'PO-C-MS-003', dateCreated: '2026-09-12 09:18',
            entity: 'Maria Santos', entityType: 'customer', status: 'PROCESSED', statusClass: 'received',
            reason: 'One strawberry jar arrived with a broken seal. Replacement issued.',
            items: [line(1, 'Jars', 'Strawberry Crinkles', 'Broken seal', 165)]
        }
    };

    var SEED_CUSTOMER_ORDERS = [
        {
            orderNumber: 'ORD-2026-1042', poCode: 'PO-C-MS-001', poEntity: 'Maria Santos',
            items: {
                'ms-choco': { name: 'Chocolate Crinkles', cost: 165, qty: 3 },
                'ms-ube': { name: 'Ube Crinkles', cost: 165, qty: 2 }
            },
            subtotal: 825, deliveryFee: 50, total: '₱875.00',
            paymentMethod: 'gcash', gcashReference: '8291042165831', gcashPaidTo: '09178001650',
            paymentStatus: 'pending', receiptNumber: 'RCP-2026-00012',
            shippingInfo: {
                fullName: 'Maria Santos', phone: '09171234567',
                address: '18 Dolorosa St., Poblacion, Batangas City',
                notes: 'Please call at the gate'
            },
            status: 'Processing', date: '2026-09-22T08:20:00.000Z',
            paymentVerified: false, source: 'customer-shop'
        },
        {
            orderNumber: 'ORD-2026-1038', poCode: 'PO-C-MS-002', poEntity: 'Maria Santos',
            items: { 'ms-lemon': { name: 'Lemon Crinkles', cost: 165, qty: 4 } },
            subtotal: 660, deliveryFee: 50, total: '₱710.00',
            paymentMethod: 'cash_on_delivery', receiptNumber: 'RCP-2026-00011',
            shippingInfo: {
                fullName: 'Maria Santos', phone: '09171234567',
                address: '18 Dolorosa St., Poblacion, Batangas City', notes: ''
            },
            status: 'Shipped', trackingNumber: 'JT6049281735001',
            carrier: 'J&T Express Philippines',
            date: '2026-09-18T16:10:00.000Z', shippedAt: '2026-09-19T09:00:00.000Z',
            statusUpdatedAt: '2026-09-19T09:00:00.000Z',
            paymentVerified: true, source: 'customer-shop'
        },
        {
            orderNumber: 'ORD-2026-1021', poCode: 'PO-C-MS-003', poEntity: 'Maria Santos',
            items: {
                'ms-choco-2': { name: 'Chocolate Crinkles', cost: 165, qty: 2 },
                'ms-straw': { name: 'Strawberry Crinkles', cost: 165, qty: 1 }
            },
            subtotal: 495, deliveryFee: 50, total: '₱545.00',
            paymentMethod: 'maya', receiptNumber: 'RCP-2026-00008',
            shippingInfo: {
                fullName: 'Maria Santos', phone: '09171234567',
                address: '18 Dolorosa St., Poblacion, Batangas City', notes: ''
            },
            status: 'Completed', trackingNumber: 'JT6049281734888',
            carrier: 'J&T Express Philippines',
            date: '2026-09-10T10:00:00.000Z', shippedAt: '2026-09-10T15:00:00.000Z',
            statusUpdatedAt: '2026-09-11T11:20:00.000Z',
            paymentVerified: true, source: 'customer-shop'
        },
        {
            orderNumber: 'ORD-2026-1015', poCode: 'PO-C-KR-001', poEntity: 'Kyla Ramos',
            items: { 'kr-almond': { name: 'Choco Almond Crinkles', cost: 175, qty: 6 } },
            subtotal: 1050, deliveryFee: 50, total: '₱1,100.00',
            paymentMethod: 'gcash', gcashReference: '7049182635501', gcashPaidTo: '09178001650',
            paymentStatus: 'verified', receiptNumber: 'RCP-2026-00007',
            shippingInfo: {
                fullName: 'Kyla Ramos', phone: '09181112202',
                address: '42 Marawoy Ave., Lipa City', notes: 'Office drop-off'
            },
            status: 'Completed', trackingNumber: 'JT6049281734500',
            carrier: 'J&T Express Philippines',
            date: '2026-09-05T13:45:00.000Z',
            statusUpdatedAt: '2026-09-07T16:00:00.000Z',
            paymentVerified: true, source: 'customer-shop'
        },
        {
            orderNumber: 'ORD-2026-1008', poCode: 'PO-C-BA-001', poEntity: 'Bryle Atienza',
            items: { 'ba-mango': { name: 'Mango Crinkles', cost: 165, qty: 2 } },
            subtotal: 330, deliveryFee: 50, total: '₱380.00',
            paymentMethod: 'cash_on_delivery', receiptNumber: 'RCP-2026-00006',
            shippingInfo: {
                fullName: 'Bryle Atienza', phone: '09189876543',
                address: '9 Taray St., Lipa City', notes: ''
            },
            status: 'Processing', date: '2026-09-20T19:05:00.000Z',
            paymentVerified: true, source: 'customer-shop'
        }
    ];

    var SEED_RECEIPTS_CUSTOMER = [
        {
            receiptNumber: 'RCP-2026-00012', orderNumber: 'ORD-2026-1042',
            issuedAt: '2026-09-22T08:21:00.000Z', customerName: 'Maria Santos',
            customerPhone: '09171234567', customerAddress: '18 Dolorosa St., Poblacion, Batangas City',
            paymentMethod: 'GCash', subtotal: 825, deliveryFee: 50, total: 875,
            items: [
                { name: 'Chocolate Crinkles', qty: 3, price: 165, lineTotal: 495 },
                { name: 'Ube Crinkles', qty: 2, price: 165, lineTotal: 330 }
            ],
            shippingNotes: 'Please call at the gate', status: 'Processing'
        },
        {
            receiptNumber: 'RCP-2026-00011', orderNumber: 'ORD-2026-1038',
            issuedAt: '2026-09-18T16:11:00.000Z', customerName: 'Maria Santos',
            customerPhone: '09171234567', customerAddress: '18 Dolorosa St., Poblacion, Batangas City',
            paymentMethod: 'Cash on Delivery', subtotal: 660, deliveryFee: 50, total: 710,
            items: [{ name: 'Lemon Crinkles', qty: 4, price: 165, lineTotal: 660 }],
            shippingNotes: '', status: 'Shipped'
        },
        {
            receiptNumber: 'RCP-2026-00008', orderNumber: 'ORD-2026-1021',
            issuedAt: '2026-09-10T10:01:00.000Z', customerName: 'Maria Santos',
            customerPhone: '09171234567', customerAddress: '18 Dolorosa St., Poblacion, Batangas City',
            paymentMethod: 'Maya', subtotal: 495, deliveryFee: 50, total: 545,
            items: [
                { name: 'Chocolate Crinkles', qty: 2, price: 165, lineTotal: 330 },
                { name: 'Strawberry Crinkles', qty: 1, price: 165, lineTotal: 165 }
            ],
            shippingNotes: '', status: 'Completed'
        }
    ];

    var SEED_PROFILE = {
        username: 'maria_santos',
        fullName: 'Maria Santos',
        email: 'maria.santos@email.com',
        contactNumber: '09171234567',
        defaultAddress: '18 Dolorosa St., Poblacion, Batangas City',
        addresses: [
            { id: 'addr-ms-home', label: 'Home', address: '18 Dolorosa St., Poblacion, Batangas City' },
            { id: 'addr-ms-work', label: 'Office', address: 'Kreezby Pickup Counter, SM Batangas' }
        ],
        avatarDataUrl: '',
        updatedAt: '2026-09-22T08:20:00.000Z'
    };

    var SEED_NOTIFICATIONS = [
        {
            id: 'n-order-ORD-2026-1042', title: 'Customer Order Placed',
            description: 'New order ORD-2026-1042 from Maria Santos',
            timestamp: '2026-09-22T08:20:00.000Z', read: false, source: 'order'
        },
        {
            id: 'n-order-ORD-2026-1008', title: 'Customer Order Placed',
            description: 'New order ORD-2026-1008 from Bryle Atienza',
            timestamp: '2026-09-20T19:05:00.000Z', read: false, source: 'order'
        },
        {
            id: 'n-alert-stock-mango', title: 'Low stock alert',
            description: 'Mango Crinkles dropped below the safety threshold. Current stock: 45 jars.',
            timestamp: '2026-09-22T07:40:00.000Z', read: false, source: 'alert'
        },
        {
            id: 'n-delivery-tagaytay', title: 'Delivery route ready',
            description: 'Tagaytay route for Dec 31 is ready for dispatch.',
            timestamp: '2026-09-21T11:15:00.000Z', read: false, source: 'delivery'
        },
        {
            id: 'n-inbox-shangag', title: 'New retailer message',
            description: 'Shangag Express Tagaytay sent a new message in the inbox.',
            timestamp: '2026-09-22T09:05:00.000Z', read: false, source: 'inbox'
        },
        {
            id: 'n-retailer-delivery-today', title: 'Delivery arriving today',
            description: 'Your shipment of Chocolate Crinkles pouches is out for delivery.',
            timestamp: '2026-10-05T01:30:00.000Z', read: false, source: 'delivery', audience: 'retailer'
        },
        {
            id: 'n-retailer-payment-due', title: 'Payment due',
            description: 'Invoice INV-2026-156 for ₱12,500 is on consignment.',
            timestamp: '2026-10-04T22:00:00.000Z', read: false, source: 'payment', audience: 'retailer'
        },
        {
            id: 'n-retailer-low-stock', title: 'Low stock warning',
            description: 'Chocolate Crinkles pouches are below the reorder point (15 pouches remaining).',
            timestamp: '2026-10-04T16:00:00.000Z', read: false, source: 'alert', audience: 'retailer'
        },
        {
            id: 'n-retailer-backorder', title: 'Back order waiting',
            description: 'Part of your Chocolate Crinkles order is on back order for the next run.',
            timestamp: '2026-10-04T12:00:00.000Z', read: false, source: 'bo', audience: 'retailer'
        },
        {
            id: 'n-retailer-return', title: 'Return received',
            description: 'A return was logged against your purchase order.',
            timestamp: '2026-10-03T09:00:00.000Z', read: false, source: 'return', audience: 'retailer'
        },
        {
            id: 'n-retailer-po-delivered', title: 'Order delivered',
            description: 'Purchase order ORD-2026-0102 has been delivered.',
            timestamp: '2026-10-02T08:00:00.000Z', read: true, source: 'po', audience: 'retailer'
        }
    ];

    var STALE_PO_KEYS = ['PO-0001', 'PO-0002', 'PO-C001', 'PO-C002', 'WPO-M-0088', 'WPO-M-0091', 'WPO-M-0094', 'WPO-V-0042', 'WPO-V-0045'];
    var STALE_RECV_KEYS = ['recv-102', 'recv-101', 'recv-103', 'recv-104', 'recv-105', 'recv-metro-001', 'recv-metro-002', 'recv-visayas-001'];
    var STALE_BO_KEYS = ['BO-0005', 'BO-0004', 'BO-0003', 'BO-0002', 'BO-0001', 'BO-C012', 'BO-C011', 'BO-C010', 'BO-C009', 'BO-C008', 'BO-W-0003', 'BO-V-0001'];
    var STALE_RET_KEYS = ['RET-0001', 'RET-0002', 'RET-M-0001', 'RET-V-0001'];
    var STALE_ORDER_NUMBERS = ['ORD-2026-0001'];

    function mergeMap(key, seedMap, staleKeys) {
        var existing = readJson(key, {});
        if (!existing || typeof existing !== 'object' || Array.isArray(existing)) existing = {};
        var merged = {};
        Object.keys(existing).forEach(function (k) { merged[k] = existing[k]; });
        (staleKeys || []).forEach(function (k) { delete merged[k]; });
        Object.keys(seedMap).forEach(function (k) { merged[k] = clone(seedMap[k]); });
        writeJson(key, merged);
        return merged;
    }

    function mergeOrders() {
        var existing = readJson('kreezbyOrders', []);
        if (!Array.isArray(existing)) existing = [];
        var byNumber = {};
        existing.forEach(function (order) {
            if (order && order.orderNumber && STALE_ORDER_NUMBERS.indexOf(order.orderNumber) < 0) {
                byNumber[order.orderNumber] = order;
            }
        });
        SEED_CUSTOMER_ORDERS.forEach(function (order) {
            byNumber[order.orderNumber] = clone(order);
        });
        var list = Object.keys(byNumber).map(function (k) { return byNumber[k]; });
        list.sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
        writeJson('kreezbyOrders', list);
        return list;
    }

    function mergeReceiptsArray(key, seedList) {
        var existing = readJson(key, []);
        if (!Array.isArray(existing)) existing = [];
        var byNumber = {};
        existing.forEach(function (row) {
            if (row && row.receiptNumber) byNumber[row.receiptNumber] = row;
        });
        seedList.forEach(function (row) { byNumber[row.receiptNumber] = clone(row); });
        var list = Object.keys(byNumber).map(function (k) { return byNumber[k]; });
        writeJson(key, list);
        return list;
    }

    function seedProfileIfNeeded() {
        var existing = readJson('kreezbyCustomerProfile', null);
        if (existing && existing.fullName && existing.fullName !== 'Bryle Atienza') return existing;
        writeJson('kreezbyCustomerProfile', clone(SEED_PROFILE));
        return SEED_PROFILE;
    }

    function mergeNotifications() {
        var existing = readJson('kreezbyNotifications', []);
        if (!Array.isArray(existing)) existing = [];
        var byId = {};
        existing.forEach(function (n) {
            if (!n || !n.id) return;
            if (n.audience === 'wholesaler' || String(n.id).indexOf('n-wholesaler') === 0) return;
            byId[n.id] = n;
        });
        SEED_NOTIFICATIONS.forEach(function (n) {
            if (!byId[n.id]) byId[n.id] = clone(n);
        });
        var list = Object.keys(byId).map(function (k) { return byId[k]; });
        list.sort(function (a, b) { return String(b.timestamp || '').localeCompare(String(a.timestamp || '')); });
        writeJson('kreezbyNotifications', list);
        return list;
    }

    function apply(force) {
        if (!force && currentVersion() === VERSION) return false;
        mergeMap('kreezby-po-orders-v1', SEED_POS, STALE_PO_KEYS);
        mergeMap('kreezby-recv-receipts-v1', SEED_RECEIPTS, STALE_RECV_KEYS);
        mergeMap('kreezby-bo-orders-v1', SEED_BOS, STALE_BO_KEYS);
        mergeMap('kreezby-return-records-v1', SEED_RETURNS, STALE_RET_KEYS);
        mergeOrders();
        mergeReceiptsArray('kreezbyCustomerReceipts', SEED_RECEIPTS_CUSTOMER);
        mergeReceiptsArray('kreezbyOwnerReceipts', SEED_RECEIPTS_CUSTOMER);
        seedProfileIfNeeded();
        mergeNotifications();
        try { localStorage.removeItem('kreezby-wholesaler-sales-v1'); } catch (e) { /* ignore */ }
        try { localStorage.setItem(VERSION_KEY, VERSION); } catch (e) { /* ignore */ }
        if (window.KreezbyNotifications && typeof window.KreezbyNotifications.notifyExternalChange === 'function') {
            window.KreezbyNotifications.notifyExternalChange();
        }
        try {
            document.dispatchEvent(new CustomEvent('kreezby:notification-change', { detail: { type: 'seed' } }));
        } catch (e) { /* ignore */ }
        return true;
    }

    function countMap(key) {
        var data = readJson(key, {});
        return data && typeof data === 'object' ? Object.keys(data).length : 0;
    }

    function portalName() {
        var brand = document.querySelector('.panel-brand');
        if (brand && brand.textContent.trim()) return brand.textContent.trim();
        var pill = document.getElementById('user-dropdown-trigger');
        if (pill) return String(pill.textContent || '').replace(/▾/g, '').trim();
        return '';
    }

    function fillDashboardCounts() {
        var name = portalName();
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        var pos = readJson('kreezby-po-orders-v1', {});
        var recvs = readJson('kreezby-recv-receipts-v1', {});
        var bos = readJson('kreezby-bo-orders-v1', {});
        var rets = readJson('kreezby-return-records-v1', {});
        var orders = readJson('kreezbyOrders', []);

        function matchesEntity(record) {
            if (!name) return true;
            return record.entity === name || record.supplier === name;
        }

        var poCount = Object.keys(pos).length;
        var recvCount = Object.keys(recvs).length;
        var boCount = Object.keys(bos).length;
        var retCount = Object.keys(rets).length;
        var salesCount = Array.isArray(orders) ? orders.length : 0;
        var alertCount = 3;

        if (path.indexOf('/retailer/') >= 0 && name) {
            poCount = Object.keys(pos).filter(function (k) { return pos[k].entity === name && pos[k].entityType !== 'wholesaler'; }).length;
            recvCount = Object.keys(recvs).filter(function (k) { return matchesEntity(recvs[k]) && recvs[k].sourceType !== 'Wholesaler'; }).length;
            boCount = Object.keys(bos).filter(function (k) { return bos[k].entity === name && bos[k].entityType !== 'wholesaler'; }).length;
            retCount = Object.keys(rets).filter(function (k) { return rets[k].entity === name && rets[k].entityType !== 'wholesaler'; }).length;
            alertCount = 3;
        }

        document.querySelectorAll('.stat-card').forEach(function (card) {
            var title = card.querySelector('.stat-title');
            var value = card.querySelector('.stat-value');
            if (!title || !value) return;
            var label = (title.textContent || '').toLowerCase();
            if (label.indexOf('po record') >= 0) value.textContent = String(poCount);
            else if (label.indexOf('receiving') >= 0) value.textContent = String(recvCount);
            else if (label.indexOf('bo record') >= 0) value.textContent = String(boCount);
            else if (label.indexOf('return') >= 0) value.textContent = String(retCount);
            else if (label.indexOf('sales') >= 0) value.textContent = String(salesCount);
            else if (label.indexOf('order tracking') >= 0) value.textContent = String(Array.isArray(orders) ? orders.length : 0);
            else if (label.indexOf('alert') >= 0) value.textContent = String(alertCount);
        });
    }


    function bindUi() {
        fillDashboardCounts();
    }

    root.KreezbyPortalSeed = {
        VERSION: VERSION,
        apply: apply,
        fillDashboardCounts: fillDashboardCounts,
        portalName: portalName,
        countMap: countMap,
        POS: SEED_POS,
        RECEIPTS: SEED_RECEIPTS,
        BOS: SEED_BOS,
        RETURNS: SEED_RETURNS,
        ORDERS: SEED_CUSTOMER_ORDERS
    };

    apply(false);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindUi);
    } else {
        bindUi();
    }
    document.addEventListener('kreezby:page-load', bindUi);
})(window);
