/**
 * Event-driven notifications — only surfaced when new activity is detected.
 */
(function () {
    'use strict';

    if (window.KreezbyNotifications) return;

    var STORAGE_KEY = 'kreezbyNotifications';
    var CURSOR_KEY = 'kreezbyNotificationCursor';
    var listeners = [];

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {}
    }

    function uid() {
        return 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }

    function normalize(item) {
        return {
            id: String(item.id || uid()),
            title: item.title || 'Notification',
            description: item.description || item.message || '',
            timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : (item.timestamp || new Date().toISOString()),
            read: !!item.read,
            source: item.source || 'system'
        };
    }

    function getAll() {
        return readJson(STORAGE_KEY, []).map(function (n) {
            return Object.assign({}, n, { timestamp: new Date(n.timestamp) });
        });
    }

    function saveAll(list) {
        writeJson(STORAGE_KEY, list.map(function (n) {
            return Object.assign({}, n, {
                timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp
            });
        }));
    }

    function emit(change) {
        listeners.forEach(function (fn) {
            try { fn(change); } catch (e) {}
        });
        document.dispatchEvent(new CustomEvent('kreezby:notification-change', { detail: change }));
    }

    function push(item) {
        var entry = normalize(item);
        entry.read = false;
        var list = getAll();
        list.unshift(entry);
        saveAll(list);
        emit({ type: 'added', notification: entry, unread: getUnreadCount() });
        return entry;
    }

    function getUnreadCount() {
        return getAll().filter(function (n) { return !n.read; }).length;
    }

    function markRead(id) {
        var list = getAll();
        var changed = false;
        list = list.map(function (n) {
            if (String(n.id) === String(id) && !n.read) {
                changed = true;
                return Object.assign({}, n, { read: true });
            }
            return n;
        });
        if (changed) {
            saveAll(list);
            emit({ type: 'read', id: id, unread: getUnreadCount() });
        }
    }

    function markAllRead() {
        var list = getAll();
        if (!list.some(function (n) { return !n.read; })) return;
        saveAll(list.map(function (n) { return Object.assign({}, n, { read: true }); }));
        emit({ type: 'read-all', unread: 0 });
    }

    function subscribe(fn) {
        listeners.push(fn);
        return function () {
            listeners = listeners.filter(function (f) { return f !== fn; });
        };
    }

    function ensureCursor() {
        var cursor = readJson(CURSOR_KEY, null);
        if (cursor && cursor.initialized) return cursor;

        cursor = { initialized: true, orders: {}, po: {}, receipts: {} };
        readJson('kreezbyOrders', []).forEach(function (o) {
            if (o && o.orderNumber) cursor.orders[o.orderNumber] = true;
        });
        readJson('kreezby-po-orders-v1', []).forEach(function (o) {
            if (o && o.code) cursor.po[o.code] = true;
        });
        readJson('kreezby-receive-v1', []).forEach(function (o) {
            if (o && o.code) cursor.receipts[o.code] = true;
        });
        writeJson(CURSOR_KEY, cursor);
        return cursor;
    }

    function scanOrders(cursor) {
        var added = false;
        readJson('kreezbyOrders', []).forEach(function (order) {
            if (!order || !order.orderNumber || cursor.orders[order.orderNumber]) return;
            cursor.orders[order.orderNumber] = true;
            var name = (order.shippingInfo && order.shippingInfo.fullName) || 'Customer';
            push({
                title: 'Customer Order Placed',
                description: 'New order ' + order.orderNumber + ' from ' + name,
                source: 'order'
            });
            added = true;
        });
        return added;
    }

    function scanStorage(cursor) {
        var changed = scanOrders(cursor);
        writeJson(CURSOR_KEY, cursor);
        return changed;
    }

    function init() {
        var cursor = ensureCursor();
        scanStorage(cursor);

        window.addEventListener('storage', function (e) {
            if (e.key === STORAGE_KEY) {
                emit({ type: 'storage-sync', unread: getUnreadCount() });
                return;
            }
            if (!e.key || ['kreezbyOrders', 'kreezby-po-orders-v1', 'kreezby-receive-v1'].indexOf(e.key) === -1) return;
            var c = readJson(CURSOR_KEY, ensureCursor());
            scanStorage(c);
        });

        document.addEventListener('kreezby:activity', function (e) {
            var detail = e.detail || {};
            if (!detail.title) return;
            push({
                title: detail.title,
                description: detail.description || detail.message || '',
                source: detail.source || 'activity'
            });
        });

        if ((window.location.pathname || '').indexOf('/admin/') !== -1
            || (window.location.pathname || '').indexOf('/head_admin/') !== -1) {
            setInterval(function () {
                var c = readJson(CURSOR_KEY, ensureCursor());
                scanStorage(c);
            }, 4000);
        }
    }

    window.KreezbyNotifications = {
        getAll: getAll,
        getUnreadCount: getUnreadCount,
        push: push,
        markRead: markRead,
        markAllRead: markAllRead,
        subscribe: subscribe,
        init: init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
