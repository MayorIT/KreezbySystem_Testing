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

    function readJsonList(key) {
        var value = readJson(key, []);
        return Array.isArray(value) ? value : [];
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
        if (Array.isArray(item.accountIds)) entry.accountIds = item.accountIds.slice();
        return entry;
    }

    var SOURCE_TASKS = {
        order: ['bo', 'ordertracking', 'saleslist', 'dailysales', 'inbox'],
        payment: ['ordertracking', 'saleslist', 'dailysales'],
        po: ['bo', 'ordertracking'],
        receive: ['bo', 'ordertracking'],
        return: ['ordertracking'],
        alert: ['alert', 'stocklevel', 'stocks', 'inventoryreport'],
        stock: ['stocks', 'stocklevel', 'inventoryreport'],
        delivery: ['deliveryschedule', 'ordertracking'],
        inbox: ['inbox', 'inbox_retailer'],
        forecast: ['aiforecast']
    };

    // Sidebar badges: each kind of activity counts on ONE menu item only, and a badge
    // only counts activity that happened after that account last opened the page.
    var BADGE_TASKS = {
        order: ['bo'],
        payment: ['saleslist'],
        po: ['bo'],
        receive: ['bo'],
        return: ['ordertracking'],
        alert: ['alert'],
        stock: ['stocks'],
        delivery: ['deliveryschedule'],
        inbox: ['inbox', 'inbox_retailer'],
        forecast: ['aiforecast']
    };
    var BADGE_SEEN_KEY = 'kreezbyBadgeSeen';
    // Activity before this moment never shows as a badge (old demo notifications).
    var BADGE_BASELINE = '2026-10-23T07:00:00.000Z';

    function isStaffPortal() {
        return /\/staff\//i.test(window.location.pathname || '');
    }

    function isRetailerPortal() {
        return /\/retailer\//i.test(window.location.pathname || '');
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

    function isCustomerPortal() {
        return /\/customer\//i.test(window.location.pathname || '');
    }

    // Which portal is looking at the notifications.
    function portalRole() {
        if (isRetailerPortal()) return 'retailer';
        if (isStaffPortal()) return 'staff';
        if (isHeadAdminPath()) return 'head';
        if (/\/admin\//i.test(window.location.pathname || '')) return 'admin';
        if (isCustomerPortal()) return 'customer';
        return 'portal';
    }

    function readSession() {
        var sess = readJson('kreezby_session', {});
        return sess && typeof sess === 'object' ? sess : {};
    }

    // Every id the signed-in account goes by, so a note addressed to it can be matched.
    function currentAccountKeys() {
        var keys = [];
        function add(v) {
            var k = String(v || '').trim().toLowerCase();
            if (k && keys.indexOf(k) === -1) keys.push(k);
        }
        var role = portalRole();
        if (role === 'staff' || role === 'admin' || role === 'head') {
            add(currentAccountId());
            return keys;
        }
        if (role === 'customer' || role === 'retailer') {
            var sess = readSession();
            add(sess.customerId);
            add(sess.accountId);
            add(sess.email);
            add(sess.identity);
        }
        return keys;
    }

    // Old shared read key, kept so notifications already read stay read.
    function legacyAudienceKey() {
        var role = portalRole();
        if (role === 'retailer') return 'retailer';
        if (role === 'staff') {
            var api = window.KreezbyStaffPermissions;
            if (api && typeof api.getCurrentStaffId === 'function') return api.getCurrentStaffId();
            return 'staff';
        }
        if (role === 'admin' || role === 'head') return 'admin';
        return 'portal';
    }

    // Read/unread is tracked per account: one admin reading a note does not mark it read for another.
    function audienceKey() {
        var role = portalRole();
        if (role === 'staff') return legacyAudienceKey();
        var keys = currentAccountKeys();
        return keys.length ? role + ':' + keys[0] : legacyAudienceKey();
    }

    function isReadForAudience(item) {
        var readBy = item.readBy && typeof item.readBy === 'object' ? item.readBy : null;
        var key = audienceKey();
        if (readBy && Object.prototype.hasOwnProperty.call(readBy, key)) return !!readBy[key];
        var legacy = legacyAudienceKey();
        if (readBy && Object.prototype.hasOwnProperty.call(readBy, legacy)) return !!readBy[legacy];
        if (readBy) return false;
        return !!item.read;
    }

    function staffHref(source) {
        var pages = {
            order: 'order-tracking-staff.html',
            payment: 'order-tracking-staff.html',
            return: 'order-tracking-staff.html',
            alert: 'alert-staff.html',
            stock: 'stocks-staff.html',
            delivery: 'deliveryschedule-staff.html',
            forecast: 'aiforecast_salesanalysis-staff.html'
        };
        if (source === 'inbox') {
            var api = window.KreezbyStaffPermissions;
            if (api && typeof api.getInboxHref === 'function') return api.getInboxHref();
            return 'inbox-staff.html';
        }
        return pages[source] || '';
    }

    function retailerHref() {
        return '';
    }

    var ADMIN_TASK_PAGES = {
        bo: 'bo',
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

    function currentAccountId() {
        if (isStaffPortal() && window.KreezbyStaffPermissions && typeof window.KreezbyStaffPermissions.getCurrentStaffId === 'function') {
            return window.KreezbyStaffPermissions.getCurrentStaffId();
        }
        if ((isAdminPortal()) && window.KreezbyAdminPermissions && typeof window.KreezbyAdminPermissions.getCurrentAdminId === 'function') {
            return window.KreezbyAdminPermissions.getCurrentAdminId();
        }
        return '';
    }

    // Notes about one customer's own activity (their order status, receipts, reviews).
    // (cart, checkout, favorites, profile, addresses) - never shown in head admin, admin or staff.
    var CUSTOMER_SOURCES = ['order-status', 'receipt', 'review', 'information', 'cart', 'checkout', 'favorites', 'profile', 'address', 'security'];
    var CUSTOMER_SEED_TITLES = ['Portal Session Started', 'Information Feed Enabled'];
    // Customer account messages saved under the generic "system" source.
    var CUSTOMER_ONLY_TITLES = ['Security Update Applied', 'Profile Updated', 'Added to Cart', 'Checkout Started'];
    // Announcements meant for every customer and retailer.
    var PARTNER_SOURCES = ['new_product', 'price_change'];
    var SHOP_AUDIENCES = ['admin', 'head', 'staff'];

    function isCustomerSeed(item) {
        return CUSTOMER_SEED_TITLES.indexOf(String(item && item.title || '')) !== -1;
    }

    // Who a note is for. Notes saved without a target are worked out from their source,
    // so customer activity never lands in the shop portals and shop activity never reaches customers.
    function targetAudiences(item) {
        var audiences = itemAudiences(item);
        if (audiences) return audiences;
        var source = String(item && item.source || 'system');
        if (source === 'price_change') return ['customer'];   // retailers keep their fixed price
        if (PARTNER_SOURCES.indexOf(source) !== -1) return ['customer', 'retailer'];
        if (CUSTOMER_SOURCES.indexOf(source) !== -1 || isCustomerSeed(item) || CUSTOMER_ONLY_TITLES.indexOf(String(item.title || '')) !== -1) return ['customer'];
        return SHOP_AUDIENCES;
    }

    function roleMatches(role, audiences) {
        if (role === 'head') return audiences.indexOf('head') !== -1 || audiences.indexOf('admin') !== -1;
        if (role === 'retailer') return audiences.indexOf('retailer') !== -1 || audiences.indexOf('wholesaler') !== -1;
        return audiences.indexOf(role) !== -1;
    }

    function ownOrderNumbers() {
        var api = window.KreezbyCustomerOrders;
        if (!api || typeof api.loadOrders !== 'function') return null;
        var nums = {};
        try {
            (api.loadOrders() || []).forEach(function (o) {
                if (o && o.orderNumber) nums[String(o.orderNumber)] = true;
            });
        } catch (e) { return null; }
        return nums;
    }

    // Older customer notes carry no owner; show one only if its order belongs to this customer.
    function customerOwnsNote(item) {
        if (isCustomerSeed(item)) return true;
        var source = String(item.source || '');
        if (PARTNER_SOURCES.indexOf(source) !== -1) return true;
        var orderNumber = item.orderNumber || '';
        if (!orderNumber) {
            var m = /:\s*(\S+)\s*$/.exec(String(item.title || ''));
            orderNumber = m ? m[1] : '';
        }
        if (!orderNumber) return false;
        var mine = ownOrderNumbers();
        return !!(mine && mine[orderNumber]);
    }

    function visibleToAudience(item) {
        if (!item) return false;
        var role = portalRole();
        if (role === 'portal') return false;

        if (Array.isArray(item.accountIds) && item.accountIds.length) {
            var keys = currentAccountKeys();
            return item.accountIds.some(function (id) {
                return keys.indexOf(String(id || '').trim().toLowerCase()) !== -1;
            });
        }

        if (role === 'retailer' && item.source === 'price_change') return false;
        if (!roleMatches(role, targetAudiences(item))) return false;

        if (role === 'customer') return customerOwnsNote(item);
        if (role !== 'staff') return true;

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
                title: String(n.title || '').replace(/Shangag/g, 'Sinangag'),
                description: String(n.description || '').replace(/Shangag/g, 'Sinangag'),
                timestamp: new Date(n.timestamp),
                read: isReadForAudience(n)
            });
            if (isStaffPortal()) {
                var href = staffHref(n.source);
                if (href) item.href = href;
            } else if (isRetailerPortal()) {
                var retailerLink = retailerHref(n.source);
                if (retailerLink) item.href = retailerLink;
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
        if (item && item.orderNumber) entry.orderNumber = String(item.orderNumber);
        var role = portalRole();
        var untargeted = !entry.audience && !entry.audiences && !entry.accountIds;
        if (untargeted && (role === 'customer' || role === 'retailer') && PARTNER_SOURCES.indexOf(entry.source) === -1) {
            entry.audiences = [role];
            var keys = currentAccountKeys();
            if (keys.length) entry.accountIds = keys;
        }
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

    function badgeViewerKey() {
        return currentAccountId() || audienceKey();
    }

    // One stored record per account, so accounts never overwrite each other's badges.
    function badgeSeenKey() {
        return BADGE_SEEN_KEY + '_' + String(badgeViewerKey() || 'viewer').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
    }

    function readBadgeSeen() {
        var mine = readJson(badgeSeenKey(), {});
        return mine && typeof mine === 'object' && !Array.isArray(mine) ? mine : {};
    }

    function badgeSeenAt(taskKey) {
        var mine = readBadgeSeen();
        if (!mine._since) {
            // First time this account sees badges: only activity from now on counts,
            // so a backlog of old notifications never shows up as menu numbers.
            mine._since = new Date().toISOString();
            writeJson(badgeSeenKey(), mine);
        }
        var floor = mine._since > BADGE_BASELINE ? mine._since : BADGE_BASELINE;
        var seen = mine[taskKey] || '';
        return seen > floor ? seen : floor;
    }

    function markTaskSeen(taskKey) {
        if (!taskKey) return;
        var mine = readBadgeSeen();
        if (!mine._since) mine._since = new Date().toISOString();
        mine[taskKey] = new Date().toISOString();
        writeJson(badgeSeenKey(), mine);
        emit({ type: 'task-seen', task: taskKey, unread: getUnreadCount() });
    }

    function getUnreadCountForTask(taskKey) {
        var count = 0;
        var since = badgeSeenAt(taskKey);
        getAll().forEach(function (item) {
            var tasks = BADGE_TASKS[item.source || 'system'] || [];
            if (tasks.indexOf(taskKey) === -1 || item.read) return;
            var at = item.timestamp instanceof Date ? item.timestamp.toISOString() : String(item.timestamp || '');
            if (at > since) count += 1;
        });
        return count;
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
        readJsonList('kreezbyOrders').forEach(function (o) {
            if (o && o.orderNumber) cursor.orders[o.orderNumber] = true;
        });
        readJsonList('kreezby-po-orders-v1').forEach(function (o) {
            if (o && o.code) cursor.po[o.code] = true;
        });
        readJsonList('kreezby-receive-v1').forEach(function (o) {
            if (o && o.code) cursor.receipts[o.code] = true;
        });
        writeJson(CURSOR_KEY, cursor);
        return cursor;
    }

    function scanOrders(cursor) {
        var added = false;
        readJsonList('kreezbyOrders').forEach(function (order) {
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
        if (path.indexOf('/admin/') !== -1 || path.indexOf('/head_admin/') !== -1 || path.indexOf('/staff/') !== -1 || path.indexOf('/retailer/') !== -1) {
            var pollTimer = null;
            function pollOnce() {
                if (document.hidden) return;
                var c = readJson(CURSOR_KEY, ensureCursor());
                scanStorage(c);
            }
            function startPoll() {
                if (pollTimer) return;
                pollTimer = setInterval(pollOnce, 8000);
            }
            function stopPoll() {
                if (!pollTimer) return;
                clearInterval(pollTimer);
                pollTimer = null;
            }
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) stopPoll();
                else {
                    pollOnce();
                    startPoll();
                }
            });
            window.addEventListener('pagehide', stopPoll);
            if (!document.hidden) startPoll();
        }
    }

    function notifyExternalChange() {
        emit({ type: 'external', unread: getUnreadCount() });
    }

    window.KreezbyNotifications = {
        getAll: getAll,
        getUnreadCount: getUnreadCount,
        getUnreadCountForTask: getUnreadCountForTask,
        markTaskSeen: markTaskSeen,
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
