/**
 * Functional test records for customer, admin, and retailer modules.
 * Overlay seed IDs when kreezbyPortalSeedVersion is stale; keep user-created rows.
 */
(function (root) {
    'use strict';

    var VERSION = '20261023clean';
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

    var SEED_POS = {};

    var SEED_RECEIPTS = {};

    var SEED_BOS = {};

    var SEED_RETURNS = {};

    var SEED_CUSTOMER_ORDERS = [];

    var SEED_RECEIPTS_CUSTOMER = [];

    var SEED_PROFILE = {
        accountId: 'cust-mark-cruz',
        username: 'mark_cruz',
        fullName: 'Mark Anthony Cruz',
        email: 'mark.cruz@email.com',
        contactNumber: '',
        defaultAddress: '',
        addresses: [],
        avatarDataUrl: '',
        updatedAt: '2026-10-23T00:00:00.000Z'
    };

    var SEED_NOTIFICATIONS = [];

    var STALE_PO_KEYS = ['PO-0001', 'PO-0002', 'PO-C001', 'PO-C002', 'WPO-M-0088', 'WPO-M-0091', 'WPO-M-0094', 'WPO-V-0042', 'WPO-V-0045', 'PO-SIDC-001', 'PO-MCC-001', 'PO-QCM-001', 'PO-STAFF-SIDC', 'PO-STAFF-MCC', 'ORD-2026-0102', 'PO-C-MS-001', 'PO-C-MS-002', 'PO-C-MS-003', 'PO-C-KR-001', 'PO-C-BA-001'];
    var STALE_RECV_KEYS = ['recv-102', 'recv-101', 'recv-103', 'recv-104', 'recv-105', 'recv-metro-001', 'recv-metro-002', 'recv-visayas-001', 'recv-flour-001', 'recv-sidc-001', 'recv-qcm-001', 'recv-maria-001'];
    var STALE_BO_KEYS = ['BO-0005', 'BO-0004', 'BO-0003', 'BO-0002', 'BO-0001', 'BO-C012', 'BO-C011', 'BO-C010', 'BO-C009', 'BO-C008', 'BO-W-0003', 'BO-V-0001', 'BO-SIDC-001', 'BO-MCC-001', 'BO-C-MS-001'];
    var STALE_RET_KEYS = ['RET-0001', 'RET-0002', 'RET-M-0001', 'RET-V-0001', 'RET-SIDC-001', 'RET-MS-001'];
    var STALE_RECEIPT_NUMBERS = ['RCP-2026-00012', 'RCP-2026-00011', 'RCP-2026-00008'];
    var STALE_NOTIFICATION_IDS = ['n-order-ORD-2026-1042', 'n-order-ORD-2026-1008', 'n-alert-stock-mango', 'n-delivery-tagaytay', 'n-inbox-shangag', 'n-retailer-delivery-today', 'n-retailer-payment-due', 'n-retailer-low-stock', 'n-retailer-backorder', 'n-retailer-return', 'n-retailer-po-delivered'];
    var STALE_ORDER_NUMBERS = ['ORD-2026-0001', 'ORD-2026-1042', 'ORD-2026-1038', 'ORD-2026-1021', 'ORD-2026-1015', 'ORD-2026-1008'];

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
            if (row && row.receiptNumber && STALE_RECEIPT_NUMBERS.indexOf(row.receiptNumber) < 0) byNumber[row.receiptNumber] = row;
        });
        seedList.forEach(function (row) { byNumber[row.receiptNumber] = clone(row); });
        var list = Object.keys(byNumber).map(function (k) { return byNumber[k]; });
        writeJson(key, list);
        return list;
    }

    function seedProfileIfNeeded() {
        var existing = readJson('kreezbyCustomerProfile', null);
        if (existing && existing.fullName && existing.fullName !== 'Bryle Atienza') return existing;
        var sess = readJson('kreezby_session', null);
        if (sess && sess.accountType === 'Customer' && sess.userName) {
            // A real customer is signed in: never fall back to the demo profile.
            var own = { accountId: sess.customerId || '', fullName: sess.userName, email: sess.email || '', contactNumber: sess.phone || '', defaultAddress: sess.address || '', addresses: [], avatarDataUrl: '', updatedAt: new Date().toISOString() };
            writeJson('kreezbyCustomerProfile', own);
            return own;
        }
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
            if (STALE_NOTIFICATION_IDS.indexOf(n.id) >= 0) return;
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
