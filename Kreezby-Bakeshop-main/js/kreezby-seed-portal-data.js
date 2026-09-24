/**
 * Functional test records for customer, admin, and wholesaler modules.
 * Overlay seed IDs when kreezbyPortalSeedVersion is stale; keep user-created rows.
 */
(function (root) {
    'use strict';

    var VERSION = '20260924c';
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
            code: 'PO-SIDC-001', dateCreated: '2026-09-12 09:40', entity: 'SIDC Batangas Hub',
            entityType: 'retailer', area: 'Batangas City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Weekly crinkle replenishment for Batangas hub.',
            items: [
                line(80, 'Boxes', 'Chocolate Crinkles', 'Standard batch', 165),
                line(40, 'Boxes', 'Ube Crinkles', 'Weekend demand', 165)
            ]
        },
        'PO-MCC-001': {
            code: 'PO-MCC-001', dateCreated: '2026-09-20 11:15', entity: 'Makati Crinkle Corner',
            entityType: 'retailer', area: 'Makati', status: 'PENDING', statusClass: 'pending',
            remarks: 'Festival weekend stock-up — awaiting dispatch.',
            items: [
                line(50, 'Boxes', 'Lemon Crinkles', '', 165),
                line(30, 'Boxes', 'Choco Butternut', '', 180)
            ]
        },
        'PO-QCM-001': {
            code: 'PO-QCM-001', dateCreated: '2026-09-16 14:05', entity: 'Quezon Crinkle Mart',
            entityType: 'retailer', area: 'Lucena City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Partial delivery; lemon cases still in production.',
            items: [
                line(36, 'Boxes', 'Chocolate Crinkles', 'Received 24', 165),
                line(24, 'Boxes', 'Lemon Crinkles', 'Back-ordered', 165)
            ]
        },
        'PO-C-MS-001': {
            code: 'PO-C-MS-001', dateCreated: '2026-09-22 08:20', entity: 'Maria Santos',
            entityType: 'customer', area: 'Batangas City', status: 'PROCESSING', statusClass: 'pending',
            remarks: 'Shop order ORD-2026-1042 — packing at main facility.',
            trackingNumber: '', courier: 'J&T Express Philippines',
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
            remarks: 'Shop order ORD-2026-1015 delivered.',
            trackingNumber: 'JT6049281734500', courier: 'J&T Express Philippines',
            items: [line(6, 'Jars', 'Choco Almond Crinkles', '', 175)]
        },
        'PO-C-BA-001': {
            code: 'PO-C-BA-001', dateCreated: '2026-09-20 19:05', entity: 'Bryle Atienza',
            entityType: 'customer', area: 'Lipa City', status: 'PROCESSING', statusClass: 'pending',
            remarks: 'Shop order ORD-2026-1008 awaiting pack.',
            items: [line(2, 'Jars', 'Cheesecake Crinkles', '', 165)]
        },
        'WPO-M-0088': {
            code: 'WPO-M-0088', dateCreated: '2026-09-08 07:50', entity: 'Metro Bulk Distributors',
            entityType: 'wholesaler', area: 'Quezon City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Inbound pallet program for NCR franchise partners.',
            items: [
                line(24, 'Pallets', 'Mixed Crinkles Bulk', 'Chocolate / Ube / Lemon', 12000),
                line(60, 'Cases', 'Choco Butternut Bulk', '', 1800)
            ]
        },
        'WPO-M-0091': {
            code: 'WPO-M-0091', dateCreated: '2026-09-21 09:10', entity: 'Metro Bulk Distributors',
            entityType: 'wholesaler', area: 'Quezon City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Next bulk wave — awaiting truck assignment.',
            items: [line(18, 'Pallets', 'Lemon Crinkles Bulk', '', 12000)]
        },
        'WPO-M-0094': {
            code: 'WPO-M-0094', dateCreated: '2026-09-15 15:30', entity: 'Metro Bulk Distributors',
            entityType: 'wholesaler', area: 'Quezon City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Chocolate pallets received; ube still in bake cycle.',
            items: [
                line(12, 'Pallets', 'Chocolate Crinkles Bulk', 'Received 8', 12000),
                line(8, 'Pallets', 'Ube Crinkles Bulk', 'Back-ordered', 12000)
            ]
        },
        'WPO-V-0042': {
            code: 'WPO-V-0042', dateCreated: '2026-09-09 08:25', entity: 'Visayas Wholesale Hub',
            entityType: 'wholesaler', area: 'Iloilo City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Iloilo hub restock from main facility.',
            items: [
                line(12, 'Pallets', 'Choco Butternut Bulk', '', 12000),
                line(48, 'Cases', 'Mixed Crinkles Bulk', '', 1800)
            ]
        },
        'WPO-V-0045': {
            code: 'WPO-V-0045', dateCreated: '2026-09-19 12:40', entity: 'Visayas Wholesale Hub',
            entityType: 'wholesaler', area: 'Iloilo City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Cebu partner allocation — scheduled barge.',
            items: [line(36, 'Cases', 'Lemon Crinkles Bulk', '', 1800)]
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
            entity: 'SIDC Batangas Hub', dateReceived: '2026-09-12 16:20',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Hub received weekly replenishment.',
            poOrigin: 'PO-SIDC-001', reference: 'SIDC-IN-0912', subTotal: 19800,
            lineItems: [
                line(80, 'Boxes', 'Chocolate Crinkles', '', 165),
                line(40, 'Boxes', 'Ube Crinkles', '', 165)
            ]
        },
        'recv-qcm-001': {
            id: 'recv-qcm-001', supplier: 'Kreezby Bakeshop', sourceType: 'Retailer',
            entity: 'Quezon Crinkle Mart', dateReceived: '2026-09-17 10:05',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Lemon cases still outstanding.',
            poOrigin: 'PO-QCM-001', reference: 'QCM-IN-0917', subTotal: 3960,
            lineItems: [line(24, 'Boxes', 'Chocolate Crinkles', 'Partial', 165)]
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
        },
        'recv-metro-001': {
            id: 'recv-metro-001', supplier: 'Kreezby Bakeshop', sourceType: 'Wholesaler',
            entity: 'Metro Bulk Distributors', dateReceived: '2026-09-09 13:10',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'QC bulk warehouse verified pallets.',
            poOrigin: 'WPO-M-0088', reference: 'MBD-IN-0909', subTotal: 396000,
            lineItems: [
                line(24, 'Pallets', 'Mixed Crinkles Bulk', '', 12000),
                line(60, 'Cases', 'Choco Butternut Bulk', '', 1800)
            ]
        },
        'recv-metro-002': {
            id: 'recv-metro-002', supplier: 'Kreezby Bakeshop', sourceType: 'Wholesaler',
            entity: 'Metro Bulk Distributors', dateReceived: '2026-09-21 17:00',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Truck assigned — awaiting dock-in.',
            poOrigin: 'WPO-M-0091', reference: 'MBD-IN-0921', subTotal: 0, lineItems: []
        },
        'recv-visayas-001': {
            id: 'recv-visayas-001', supplier: 'Kreezby Bakeshop', sourceType: 'Wholesaler',
            entity: 'Visayas Wholesale Hub', dateReceived: '2026-09-10 11:25',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Iloilo dock cleared inbound.',
            poOrigin: 'WPO-V-0042', reference: 'VWH-IN-0910', subTotal: 230400,
            lineItems: [
                line(12, 'Pallets', 'Choco Butternut Bulk', '', 12000),
                line(48, 'Cases', 'Mixed Crinkles Bulk', '', 1800)
            ]
        }
    };

    var SEED_BOS = {
        'BO-SIDC-001': {
            code: 'BO-SIDC-001', poCode: 'PO-QCM-001', dateCreated: '2026-09-16 14:20',
            entity: 'Quezon Crinkle Mart', entityType: 'retailer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'Sep 26, 2026', status: 'PENDING', statusClass: 'pending',
            remarks: 'Balance lemon cases still in bake cycle.',
            items: [boLine('Lemon Crinkles', 'Boxes', 'Outstanding', 24, 0, 165)]
        },
        'BO-MCC-001': {
            code: 'BO-MCC-001', poCode: 'PO-MCC-001', dateCreated: '2026-09-20 11:20',
            entity: 'Makati Crinkle Corner', entityType: 'retailer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'Sep 25, 2026', status: 'PENDING', statusClass: 'pending',
            remarks: 'Festival stock not yet dispatched.',
            items: [
                boLine('Lemon Crinkles', 'Boxes', '', 50, 0, 165),
                boLine('Choco Butternut', 'Boxes', '', 30, 0, 180)
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
        },
        'BO-W-0003': {
            code: 'BO-W-0003', poCode: 'WPO-M-0094', dateCreated: '2026-09-15 15:40',
            entity: 'Metro Bulk Distributors', entityType: 'wholesaler', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'Sep 24, 2026', status: 'PENDING', statusClass: 'pending',
            remarks: 'Ube bulk pallets awaiting transit authorization to QC hub.',
            items: [boLine('Ube Crinkles Bulk', 'Pallets', 'Bake cycle', 8, 0, 12000)]
        },
        'BO-V-0001': {
            code: 'BO-V-0001', poCode: 'WPO-V-0045', dateCreated: '2026-09-19 12:50',
            entity: 'Visayas Wholesale Hub', entityType: 'wholesaler', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'Sep 27, 2026', status: 'PENDING', statusClass: 'pending',
            remarks: 'Cebu partner allocation on next barge.',
            items: [boLine('Lemon Crinkles Bulk', 'Cases', '', 36, 0, 1800)]
        }
    };

    var SEED_RETURNS = {
        'RET-SIDC-001': {
            code: 'RET-SIDC-001', poOrigin: 'PO-SIDC-001', dateCreated: '2026-09-13 10:12',
            entity: 'SIDC Batangas Hub', entityType: 'retailer', status: 'RETURNED', statusClass: 'rejected',
            reason: 'Crushed box corners on 6 chocolate cases identified during hub receiving.',
            items: [line(6, 'Boxes', 'Chocolate Crinkles', 'Crushed corners', 165)]
        },
        'RET-MS-001': {
            code: 'RET-MS-001', poOrigin: 'PO-C-MS-003', dateCreated: '2026-09-12 09:18',
            entity: 'Maria Santos', entityType: 'customer', status: 'PROCESSED', statusClass: 'received',
            reason: 'One strawberry jar arrived with a broken seal. Replacement issued.',
            items: [line(1, 'Jars', 'Strawberry Crinkles', 'Broken seal', 165)]
        },
        'RET-M-0001': {
            code: 'RET-M-0001', poOrigin: 'WPO-M-0088', dateCreated: '2026-09-11 16:40',
            entity: 'Metro Bulk Distributors', entityType: 'wholesaler', status: 'PENDING REVIEW', statusClass: 'pending',
            reason: 'Damaged packaging on bulk chocolate and lemon cases at QC warehouse.',
            items: [
                line(40, 'Cases', 'Chocolate Crinkles (Bulk)', 'Damaged packaging', 320),
                line(20, 'Cases', 'Lemon Crinkles (Bulk)', 'Damaged packaging', 280)
            ]
        },
        'RET-V-0001': {
            code: 'RET-V-0001', poOrigin: 'WPO-V-0042', dateCreated: '2026-09-12 08:05',
            entity: 'Visayas Wholesale Hub', entityType: 'wholesaler', status: 'PARTIALLY PROCESSED', statusClass: 'partial',
            reason: 'Moisture damage on mixed-case pallet after barge unload.',
            items: [line(8, 'Cases', 'Mixed Crinkles Bulk', 'Moisture', 1800)]
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
            paymentMethod: 'gcash', receiptNumber: 'RCP-2026-00012',
            shippingInfo: {
                fullName: 'Maria Santos', phone: '09171234567',
                address: '18 Dolorosa St., Poblacion, Batangas City',
                notes: 'Please call at the gate'
            },
            status: 'Processing', date: '2026-09-22T08:20:00.000Z',
            paymentVerified: true, source: 'customer-shop'
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
            paymentMethod: 'gcash', receiptNumber: 'RCP-2026-00007',
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
            items: { 'ba-cheese': { name: 'Cheesecake Crinkles', cost: 165, qty: 2 } },
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
            id: 'n-wholesaler-wpo-m-0091', title: 'Wholesale PO pending',
            description: 'Metro Bulk Distributors WPO-M-0091 awaiting truck assignment.',
            timestamp: '2026-09-21T09:10:00.000Z', read: false, source: 'po'
        }
    ];

    var SEED_WHOLESALER_SALES = {
        'Metro Bulk Distributors': [
            { ref: 'WSL-M-2201', date: '2026-09-15', account: 'Makati Franchise Hub', items: '24 Pallets Mixed Crinkles', invoice: 288000, status: 'Delivered' },
            { ref: 'WSL-M-2198', date: '2026-09-13', account: 'Quezon City Retail Chain', items: '60 Cases Choco Butternut', invoice: 108000, status: 'Delivered' },
            { ref: 'WSL-M-2194', date: '2026-09-11', account: 'Marikina Distribution Point', items: '18 Pallets Lemon Crinkles', invoice: 216000, status: 'In Transit' },
            { ref: 'WSL-M-2188', date: '2026-09-06', account: 'Pasig Oven Outlet', items: '40 Cases Ube Crinkles', invoice: 72000, status: 'Delivered' }
        ],
        'Visayas Wholesale Hub': [
            { ref: 'WSL-V-1201', date: '2026-09-14', account: 'Bacolod City Mini-Mart', items: '48 Cases Mixed Crinkles', invoice: 86400, status: 'Delivered' },
            { ref: 'WSL-V-1198', date: '2026-09-12', account: 'Iloilo SIDC Branch', items: '12 Pallets Choco Butternut', invoice: 144000, status: 'Delivered' },
            { ref: 'WSL-V-1195', date: '2026-09-10', account: 'Cebu Wholesale Partner', items: '36 Cases Lemon Crinkles', invoice: 64800, status: 'In Transit' }
        ]
    };

    var STALE_PO_KEYS = ['PO-0001', 'PO-0002', 'PO-C001', 'PO-C002'];
    var STALE_RECV_KEYS = ['recv-102', 'recv-101', 'recv-103', 'recv-104', 'recv-105'];
    var STALE_BO_KEYS = ['BO-0005', 'BO-0004', 'BO-0003', 'BO-0002', 'BO-0001', 'BO-C012', 'BO-C011', 'BO-C010', 'BO-C009', 'BO-C008'];
    var STALE_RET_KEYS = ['RET-0001', 'RET-0002'];
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
        existing.forEach(function (n) { if (n && n.id) byId[n.id] = n; });
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
        writeJson('kreezby-wholesaler-sales-v1', clone(SEED_WHOLESALER_SALES));
        try { localStorage.setItem(VERSION_KEY, VERSION); } catch (e) { /* ignore */ }
        return true;
    }

    function countMap(key) {
        var data = readJson(key, {});
        return data && typeof data === 'object' ? Object.keys(data).length : 0;
    }

    function portalName() {
        var brand = document.querySelector('.panel-brand');
        return brand ? brand.textContent.trim() : '';
    }

    function money(n) {
        return '₱' + Number(n || 0).toLocaleString('en-PH');
    }

    function fillDashboardCounts() {
        var name = portalName();
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        var pos = readJson('kreezby-po-orders-v1', {});
        var recvs = readJson('kreezby-recv-receipts-v1', {});
        var bos = readJson('kreezby-bo-orders-v1', {});
        var rets = readJson('kreezby-return-records-v1', {});
        var orders = readJson('kreezbyOrders', []);
        var wSales = readJson('kreezby-wholesaler-sales-v1', {});

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

        if (path.indexOf('/wholesaler/') >= 0 && name) {
            poCount = Object.keys(pos).filter(function (k) { return pos[k].entity === name; }).length;
            recvCount = Object.keys(recvs).filter(function (k) { return matchesEntity(recvs[k]); }).length;
            boCount = Object.keys(bos).filter(function (k) { return bos[k].entity === name; }).length;
            retCount = Object.keys(rets).filter(function (k) { return rets[k].entity === name; }).length;
            salesCount = (wSales[name] || []).length;
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

    function fillWholesalerSales() {
        var name = portalName();
        if (!name) return;
        var tbody = document.querySelector('#saleslist-master-directory-panel-view table.data-display-table tbody');
        if (!tbody) return;
        var rows = (readJson('kreezby-wholesaler-sales-v1', {})[name]) || [];
        if (!rows.length) return;
        tbody.innerHTML = rows.map(function (row, i) {
            var cls = row.status === 'Delivered' ? 'received' : 'pending';
            return '<tr data-wsl-ref="' + row.ref + '" style="cursor:pointer;">' +
                '<td>' + (i + 1) + '</td><td>' + row.ref + '</td><td>' + row.date + '</td>' +
                '<td><strong>' + row.account + '</strong></td><td>' + row.items + '</td>' +
                '<td style="text-align:right;">' + money(row.invoice) + '</td>' +
                '<td><span class="status-pill-badge ' + cls + '">' + row.status + '</span></td></tr>';
        }).join('');
        var caption = document.querySelector('.retailer-saleslist-toolbar p');
        if (caption) caption.textContent = rows.length + ' outbound shipments logged';
    }

    function bindUi() {
        fillDashboardCounts();
        fillWholesalerSales();
    }

    root.KreezbyPortalSeed = {
        VERSION: VERSION,
        apply: apply,
        fillDashboardCounts: fillDashboardCounts,
        fillWholesalerSales: fillWholesalerSales,
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
