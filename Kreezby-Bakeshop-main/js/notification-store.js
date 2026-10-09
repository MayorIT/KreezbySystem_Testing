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
        var entry = {
            id: String(item.id || uid()),
            title: item.title || 'Notification',
            description: item.description || item.message || '',
            timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : (item.timestamp || new Date().toISOString()),
            read: !!item.read,
            source: item.source || 'system'
        };
        if (item.audience) entry.audience = item.audience;
        if (Array.isArray(item.audiences)) entry.audiences = item.audiences.slice();
        return entry;
    }

    var SOURCE_TASKS = {
        order: ['ordertracking', 'saleslist', 'dailysales', 'inbox'],
        payment: ['ordertracking', 'saleslist', 'dailysales'],
        po: ['po', 'receive', 'bo'],
        receive: ['receive'],
        return: ['return'],
        alert: ['alert', 'stocklevel', 'stocks', 'inventoryreport'],
        stock: ['stocks', 'stocklevel', 'inventoryreport'],
        delivery: ['deliveryschedule', 'ordertracking'],
        inbox: ['inbox', 'inbox_retailer'],
        forecast: ['aiforecast']
    };

    function isStaffPortal() {
        return /\/staff\//i.test(window.location.pathname || '');
    }

    function sessionAccountType() {
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || 'null');
            return session && session.accountType ? String(session.accountType) : '';
        } catch (e) { return ''; }
    }

    function isPartnerPortal() {
        return /\/retailer\//i.test(window.location.pathname || '');
    }

    function isWholesalerPortal() {
        return isPartnerPortal() && sessionAccountType() === 'Wholesaler';
    }

    function isRetailerPortal() {
        return isPartnerPortal() && !isWholesalerPortal();
    }

    function itemAudiences(item) {
        if (!item) return null;
        if (Array.isArray(item.audiences) && item.audiences.length) return item.audiences;
        if (item.audience) return [item.audience];
        return null;
    }

    function staffTasks() {
        var api = window.KreezbyStaffPermissions;
        if (!api || typeof api.getStaffTasks !== 'function') return null;
        var id = typeof api.getCurrentStaffId === 'function' ? api.getCurrentStaffId() : undefined;
        return api.getStaffTasks(id);
    }

    function audienceKey() {
        var path = window.location.pathname || '';
        if (isWholesalerPortal()) return 'wholesaler';
        if (isRetailerPortal()) return 'retailer';
        if (isStaffPortal()) {
            var api = window.KreezbyStaffPermissions;
            if (api && typeof api.getCurrentStaffId === 'function') return api.getCurrentStaffId();
            return 'staff';
        }
        if (path.indexOf('/admin/') !== -1 || path.indexOf('/head_admin/') !== -1) return 'admin';
        return 'portal';
    }

    function isReadForAudience(item) {
        var key = audienceKey();
        if (item.readBy && typeof item.readBy === 'object' && Object.prototype.hasOwnProperty.call(item.readBy, key)) {
            return !!item.readBy[key];
        }
        return !!item.read;
    }

    function staffHref(source) {
        var pages = {
            order: 'order-tracking-staff.html',
            payment: 'order-tracking-staff.html',
            po: 'po-staff.html',
            receive: 'receive-staff.html',
            return: 'return-staff.html',
            alert: 'alert-staff.html',
            stock: 'stocks-staff.html',
            delivery: 'deliveryschedule-staff.html',
            forecast: 'forecast-staff.html'
        };
        if (source === 'inbox') {
            var api = window.KreezbyStaffPermissions;
            if (api && typeof api.getInboxHref === 'function') return api.getInboxHref();
            return 'inbox-staff.html';
        }
        return pages[source] || '';
    }

    function retailerHref(source) {
        var pages = {
            po: 'inbox-portal.html',
            payment: 'inbox-portal.html',
            delivery: 'inbox-portal.html',
            bo: 'bo-portal.html',
            return: 'inbox-portal.html',
            alert: 'inbox-portal.html',
            stock: 'inbox-portal.html',
            new_product: 'inbox-portal.html',
            price_change: 'inbox-portal.html'
        };
        return pages[source] || '';
    }

    function wholesalerHref(source) {
        var pages = {
            po: 'inbox-portal.html',
            payment: 'inbox-portal.html',
            delivery: 'inbox-portal.html',
            receive: 'inbox-portal.html',
            bo: 'bo-portal.html',
            return: 'inbox-portal.html',
            alert: 'inbox-portal.html',
            stock: 'inbox-portal.html',
            new_product: 'inbox-portal.html',
            price_change: 'inbox-portal.html'
        };
        return pages[source] || '';
    }

    var ADMIN_TASK_PAGES = {
        po: 'po',
        receive: 'receive',
        bo: 'bo',
        return: 'return',
        stocks: 'stocks',
        saleslist: 'saleslist',
        ordertracking: 'order-tracking',
        aiforecast: 'aiforecast_salesanalysis',
        deliveryschedule: 'deliveryschedule',
        alert: 'alert',
        stocklevel: 'stocklevel',
        maintenance: 'maintenance',
        inbox: 'inbox',
        issuereports: 'issue-reports'
    };

    function isHeadAdminPath() {
        return /\/head_admin\//i.test(window.location.pathname || '');
    }

    function isAdminPortal() {
        var path = window.location.pathname || '';
        return /\/admin\//i.test(path) || isHeadAdminPath();
    }

    function adminPageForTask(taskKey) {
        var file = ADMIN_TASK_PAGES[taskKey];
        if (!file) return '';
        if (isHeadAdminPath() && taskKey === 'receive') return '';
        return file + (isHeadAdminPath() ? '-headadmin.html' : '-admin.html');
    }

    function adminHref(source) {
        var needed = SOURCE_TASKS[source] || [];
        var i;
        for (i = 0; i < needed.length; i++) {
            var page = adminPageForTask(needed[i]);
            if (page) return page;
        }
        return '';
    }

    function visibleToAudience(item) {
        var audiences = itemAudiences(item);
        if (isRetailerPortal()) {
            if (audiences) return audiences.indexOf('retailer') !== -1;
            var source = item && item.source ? item.source : '';
            return source === 'new_product' || source === 'price_change';
        }
        if (isWholesalerPortal()) {
            if (audiences) return audiences.indexOf('wholesaler') !== -1;
            var wholesaleSource = item && item.source ? item.source : '';
            return wholesaleSource === 'new_product' || wholesaleSource === 'price_change';
        }
        if (audiences && audiences.length === 1 && (audiences[0] === 'retailer' || audiences[0] === 'wholesaler')) return false;
        if (!isStaffPortal()) return true;
        var tasks = staffTasks();
        if (!tasks) return true;
        var needed = SOURCE_TASKS[item.source || 'system'];
        if (!needed) return tasks.indexOf('alert') !== -1;
        for (var i = 0; i < needed.length; i++) {
            if (tasks.indexOf(needed[i]) !== -1) return true;
        }
        return false;
    }

    function readStored() {
        var list = readJson(STORAGE_KEY, []);
        return Array.isArray(list) ? list : [];
    }

    function hydrate(list) {
        return list.map(function (n) {
            var item = Object.assign({}, n, {
                timestamp: new Date(n.timestamp),
                read: isReadForAudience(n)
            });
            if (isStaffPortal()) {
                var href = staffHref(n.source);
                if (href) item.href = href;
            } else if (isRetailerPortal()) {
                var retailerLink = retailerHref(n.source);
                if (retailerLink) item.href = retailerLink;
            } else if (isWholesalerPortal()) {
                var wholesaleLink = wholesalerHref(n.source);
                if (wholesaleLink) item.href = wholesaleLink;
            } else if (isAdminPortal()) {
                var adminLink = adminHref(n.source);
                if (adminLink) item.href = adminLink;
            }
            return item;
        });
    }

    function getAll() {
        return hydrate(readStored()).filter(visibleToAudience);
    }

    function saveAll(list) {
        writeJson(STORAGE_KEY, list.map(function (n) {
            var copy = Object.assign({}, n, {
                timestamp: n.timestamp instanceof Date ? n.timestamp.toISOString() : n.timestamp
            });
            delete copy.href;
            return copy;
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
        var list = readStored();
        list.unshift(entry);
        saveAll(list);
        emit({ type: 'added', notification: entry, unread: getUnreadCount() });
        return entry;
    }

    function getUnreadCount() {
        return getAll().filter(function (n) { return !n.read; }).length;
    }

    function markRead(id) {
        var key = audienceKey();
        var list = readStored();
        var changed = false;
        list = list.map(function (n) {
            if (String(n.id) !== String(id) || isReadForAudience(n)) return n;
            changed = true;
            var readBy = Object.assign({}, n.readBy || {});
            readBy[key] = true;
            return Object.assign({}, n, { readBy: readBy });
        });
        if (changed) {
            saveAll(list);
            emit({ type: 'read', id: id, unread: getUnreadCount() });
        }
    }

    function markAllRead() {
        var key = audienceKey();
        var list = readStored();
        var changed = false;
        list = list.map(function (n) {
            if (!visibleToAudience(n) || isReadForAudience(n)) return n;
            changed = true;
            var readBy = Object.assign({}, n.readBy || {});
            readBy[key] = true;
            return Object.assign({}, n, { readBy: readBy });
        });
        if (!changed) return;
        saveAll(list);
        emit({ type: 'read-all', unread: getUnreadCount() });
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

        var path = window.location.pathname || '';
        if (path.indexOf('/admin/') !== -1 || path.indexOf('/head_admin/') !== -1 || path.indexOf('/staff/') !== -1 || path.indexOf('/retailer/') !== -1 || path.indexOf('/wholesaler/') !== -1) {
            setInterval(function () {
                var c = readJson(CURSOR_KEY, ensureCursor());
                scanStorage(c);
            }, 4000);
        }
    }

    function notifyExternalChange() {
        emit({ type: 'external', unread: getUnreadCount() });
    }

    window.KreezbyNotifications = {
        getAll: getAll,
        getUnreadCount: getUnreadCount,
        push: push,
        markRead: markRead,
        markAllRead: markAllRead,
        subscribe: subscribe,
        notifyExternalChange: notifyExternalChange,
        init: init
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
