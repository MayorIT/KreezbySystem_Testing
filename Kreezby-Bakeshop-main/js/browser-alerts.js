/**
 * Stock threshold alerts and system notifications for head admin, admin, and staff.
 * Chrome, Edge, Firefox, and Safari show these on the device where this portal is open.
 */
(function () {
    'use strict';

    if (window.KreezbyBrowserAlerts) return;

    var SETTINGS_KEY = 'kreezbyAlertSettings';
    var ACTIVE_KEY = 'kreezbyAlertActive';
    var LAST_QTY_KEY = 'kreezbyAlertLastQty';
    var SEEN_KEY = 'kreezbyBrowserAlertSeen';
    var STOCK_KEY = 'kreezby-stock-local-v1';
    var NOTES_KEY = 'kreezbyNotifications';
    var DEFAULT_THRESHOLD = 50;

    var CATALOG = [
        { code: 'CRK-CHO-P', name: 'Chocolate Crinkles', kind: 'finished', qty: 0, alert: 100 },
        { code: 'CRK-ALM-P', name: 'Choco-Almond Crinkles', kind: 'finished', qty: 0, alert: 80 },
        { code: 'CRK-LEM-P', name: 'Lemon Crinkles', kind: 'finished', qty: 0, alert: 90 },
        { code: 'CRK-BUT-J', name: 'Choco Butternut Crinkles', kind: 'finished', qty: 0, alert: 70 },
        { code: 'CRK-MNG-J', name: 'Mango Crinkles', kind: 'finished', qty: 0, alert: 60 },
        { code: 'CRK-UBE-P', name: 'Ube Crinkles', kind: 'finished', qty: 0, alert: 50 },
        { code: 'RM-WFL-01', name: 'Wheat Flour', kind: 'material', qty: 0, alert: 40 },
        { code: 'RM-WSG-01', name: 'White Sugar', kind: 'material', qty: 0, alert: 30 },
        { code: 'RM-OIL-01', name: 'Vegetable Oil', kind: 'material', qty: 0, alert: 20 },
        { code: 'RM-EGG-01', name: 'Egg', kind: 'material', qty: 0, alert: 24 },
        { code: 'RM-COC-01', name: 'Cocoa', kind: 'material', qty: 0, alert: 20 },
        { code: 'RM-BKP-01', name: 'Baking Powder', kind: 'material', qty: 0, alert: 10 },
        { code: 'RM-SLT-01', name: 'Salt', kind: 'material', qty: 0, alert: 15 },
        { code: 'RM-CFS-01', name: 'Confectioner Sugar', kind: 'material', qty: 0, alert: 12 },
        { code: 'RM-PSB-01', name: 'Potassium Sorbate', kind: 'material', qty: 0, alert: 5 },
        { code: 'PKG-SUP-01', name: 'Stand up pouch', kind: 'material', qty: 0, alert: 25 },
        { code: 'PKG-STK-CHO', name: 'Stickers (Chocolate)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-ALM', name: 'Stickers (Choco-Almond)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-CSH', name: 'Stickers (Choco-Cashew)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-STR', name: 'Stickers (Strawberry)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-RVL', name: 'Stickers (Red Velvet)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-LEM', name: 'Stickers (Lemon)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-MEL', name: 'Stickers (Melon)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-PAN', name: 'Stickers (Pandan)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-UBE', name: 'Stickers (Ube)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-MNG', name: 'Stickers (Mango)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-BUT', name: 'Stickers (Choco Butternut)', kind: 'material', qty: 0, alert: 8 },
        { code: 'PKG-STK-AST', name: 'Stickers (Assorted)', kind: 'material', qty: 0, alert: 8 }
    ];

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }

    function portalKind() {
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        if (/\/head_admin\//i.test(path)) return 'head';
        if (/\/admin\//i.test(path) || /\/admin_names\//i.test(path)) return 'admin';
        if (/\/staff\//i.test(path) || /\/staff_names\//i.test(path)) return 'staff';
        return '';
    }

    function allowedRole() {
        if (!portalKind()) return false;
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
            var type = String(session.accountType || '');
            if (type === 'Customer' || type === 'Retailer' || type === 'Wholesaler') return false;
        } catch (e) { /* the portal folder is the role */ }
        return true;
    }

    function settings() {
        var stored = readJson(SETTINGS_KEY, null);
        var shop = DEFAULT_THRESHOLD;
        var items = {};
        if (stored && typeof stored === 'object') {
            if (Number.isFinite(Number(stored.shop)) && Number(stored.shop) >= 0) shop = Number(stored.shop);
            if (stored.items && typeof stored.items === 'object') items = stored.items;
        }
        return { shop: shop, items: items };
    }

    function saveSettings(next) {
        writeJson(SETTINGS_KEY, {
            shop: Number(next.shop),
            items: next.items || {}
        });
        scanStock();
    }

    function catalogItem(code) {
        var i;
        for (i = 0; i < CATALOG.length; i++) {
            if (CATALOG[i].code === code) return CATALOG[i];
        }
        return null;
    }

    function thresholdFor(code) {
        var current = settings();
        if (code && current.items && current.items[code] != null && current.items[code] !== '') {
            var itemValue = Number(current.items[code]);
            if (Number.isFinite(itemValue) && itemValue >= 0) return itemValue;
        }
        var item = catalogItem(code);
        if (item && item.alert != null && Number.isFinite(Number(item.alert)) && Number(item.alert) >= 0) return Number(item.alert);
        return Number(current.shop);
    }

    function setShopThreshold(value) {
        var number = Number(value);
        if (!Number.isFinite(number) || number < 0) return false;
        var current = settings();
        current.shop = number;
        saveSettings(current);
        return true;
    }

    function setItemThreshold(code, value) {
        var number = Number(value);
        if (!code || !Number.isFinite(number) || number < 0) return false;
        var current = settings();
        current.items[code] = number;
        saveSettings(current);
        return true;
    }

    function setItemThresholds(map) {
        var current = settings();
        var codes = Object.keys(map || {});
        var i;
        for (i = 0; i < codes.length; i++) {
            var number = Number(map[codes[i]]);
            if (!codes[i] || !Number.isFinite(number) || number < 0) return false;
        }
        if (!current.items) current.items = {};
        codes.forEach(function (code) {
            current.items[code] = Number(map[code]);
        });
        saveSettings(current);
        return true;
    }

    function clearItemThreshold(code) {
        var current = settings();
        if (!current.items || current.items[code] == null) return;
        delete current.items[code];
        saveSettings(current);
    }

    function countPhrase(item, qty) {
        if (!item || item.kind !== 'finished') return String(qty);
        return qty + ' ' + (Number(qty) === 1 ? 'pouch' : 'pouches');
    }

    function liveQty(item, localQty) {
        var dict = window.KreezbyDictionary;
        if (dict && item.kind === 'finished' && typeof dict.productStock === 'function') {
            var finished = dict.productStock(item.name);
            if (finished != null && Number.isFinite(Number(finished))) return Number(finished);
        }
        if (dict && typeof dict.materialStock === 'function') {
            var material = dict.materialStock(item.name);
            if (material != null && Number.isFinite(Number(material))) return Number(material);
        }
        if (Object.prototype.hasOwnProperty.call(localQty, item.code)) {
            var stored = Number(localQty[item.code]);
            if (Number.isFinite(stored)) return stored;
        }
        return NaN; // no real stock source on this page
    }

    // The alert catalog plus any other flavor that has stock (Melon, Strawberry, ...).
    function alertCatalog() {
        var list = CATALOG.slice();
        var dict = window.KreezbyDictionary;
        if (dict && typeof dict.productCatalog === 'function') {
            dict.productCatalog().forEach(function (p) {
                if (!p || !p.id || catalogItem(p.id)) return;
                list.push({ code: p.id, name: p.name, kind: 'finished', qty: 0, alert: null });
            });
        }
        return list;
    }

    function stockRows() {
        var local = readJson(STOCK_KEY, {});
        var qty = local && local.qty ? local.qty : {};
        return alertCatalog().map(function (item) {
            var current = liveQty(item, qty);
            var fallback = !Number.isFinite(current);
            if (fallback) current = item.qty;
            return {
                code: item.code,
                name: item.name,
                kind: item.kind,
                fallback: fallback,
                qty: current,
                count: countPhrase(item, current),
                threshold: thresholdFor(item.code)
            };
        });
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function alertHref() {
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        var dir = path.replace(/[^/]*$/, '');
        if (portalKind() === 'head') return dir + 'alert-headadmin.html';
        if (portalKind() === 'staff') return dir + 'alert-staff.html';
        return dir + 'alert-admin.html';
    }

    function profileHref() {
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        var dir = path.replace(/[^/]*$/, '');
        if (portalKind() === 'head') return dir + 'profile-headadmin.html';
        if (portalKind() === 'staff') return dir + 'profile-staff.html';
        if (portalKind() === 'admin') return dir + 'profile-admin.html';
        return '';
    }

    function seenStore() {
        var seen = readJson(SEEN_KEY, null);
        if (!seen || typeof seen !== 'object' || !seen.ids) seen = { primed: false, ids: {} };
        return seen;
    }

    function markSeen(id) {
        var seen = seenStore();
        seen.ids[id] = 1;
        writeJson(SEEN_KEY, seen);
    }

    function iconUrl() {
        try { return new URL('/assets/logo/favicon.png?v=20261018tab', window.location.origin).href; }
        catch (e) { return ''; }
    }

    function showNative(title, body, tag) {
        if (!window.Notification || Notification.permission !== 'granted') return;
        var href = alertHref();
        var options = {
            body: body,
            tag: tag || title,
            renotify: true,
            icon: iconUrl(),
            data: { href: href }
        };
        function fallback() {
            try {
                var note = new Notification(title, { body: body, tag: tag || title, icon: iconUrl() });
                note.onclick = function () {
                    window.focus();
                    window.location.href = href;
                };
            } catch (e) { /* this browser blocked the system notification */ }
        }
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
            navigator.serviceWorker.getRegistration().then(function (reg) {
                if (reg && reg.showNotification) return reg.showNotification(title, options).catch(fallback);
                fallback();
            }).catch(fallback);
            return;
        }
        fallback();
    }

    function announce(note) {
        if (!note || !note.id) return;
        var seen = seenStore();
        if (!seen.primed || seen.ids[note.id]) return;
        markSeen(note.id);
    }

    function noteTime(note) {
        if (!note || !note.timestamp) return 0;
        var time = note.timestamp instanceof Date ? note.timestamp.getTime() : new Date(note.timestamp).getTime();
        return isNaN(time) ? 0 : time;
    }

    function normalizeCountText(text) {
        return String(text || '')
            .replace(/(\d+) jars\b/gi, function (_, n) { return n + (n === '1' ? ' pouch' : ' pouches'); })
            .replace(/(\d+) packs\b/gi, function (_, n) { return n + (n === '1' ? ' pouch' : ' pouches'); })
            .replace(/(\d+) (?:sacks|bags|blocks|rolls|cartons|bundles|kg)\b/gi, '$1');
    }

    function rewriteStoredCounts() {
        var list = readJson(NOTES_KEY, []);
        if (!Array.isArray(list)) return;
        var changed = false;
        list.forEach(function (note) {
            if (!note) return;
            var description = normalizeCountText(note.description);
            var title = normalizeCountText(note.title);
            if (description !== note.description) {
                note.description = description;
                changed = true;
            }
            if (title !== note.title) {
                note.title = title;
                changed = true;
            }
        });
        if (!changed) return;
        writeJson(NOTES_KEY, list);
        document.dispatchEvent(new CustomEvent('kreezby:notification-change', { detail: { type: 'updated' } }));
    }

    function flushUnseen() {
        var list = window.KreezbyNotifications ? window.KreezbyNotifications.getAll() : readJson(NOTES_KEY, []);
        if (!Array.isArray(list)) list = [];
        var seen = seenStore();
        if (!seen.primed) {
            var cutoff = Date.now() - (2 * 60 * 1000);
            list.forEach(function (note) {
                if (note && note.id && noteTime(note) < cutoff) seen.ids[note.id] = 1;
            });
            seen.primed = true;
            writeJson(SEEN_KEY, seen);
        }
        list.forEach(announce);
    }

    function pushAlert(row) {
        var id = 'stock-' + row.code + '-' + Date.now();
        var title = row.qty <= 0 ? row.name + ' is out of stock' : row.name + ' is below the alert line';
        var description = row.name + ' is at ' + row.count + '. Alerts start at ' + row.threshold + ' or below.';
        var entry = {
            id: id,
            title: title,
            description: description,
            source: 'alert',
            audiences: ['admin', 'head', 'staff']
        };
        if (window.KreezbyNotifications) window.KreezbyNotifications.push(entry);
        else {
            var list = readJson(NOTES_KEY, []);
            list.unshift({
                id: id,
                title: title,
                description: description,
                timestamp: new Date().toISOString(),
                read: false,
                source: 'alert',
                audiences: ['admin', 'head', 'staff']
            });
            writeJson(NOTES_KEY, list);
            document.dispatchEvent(new CustomEvent('kreezby:notification-change', { detail: { type: 'added', notification: entry } }));
        }
        return id;
    }

    function pushReorder(row, rp) {
        var entry = {
            id: 'reorder-' + row.code + '-' + Date.now(),
            title: row.name + ' reached its reorder point',
            description: row.name + ' is at ' + row.count + ' (reorder point ' + rp + '). Order about ' + suggestedOrder(row) + ' now so it does not run low.',
            source: 'alert',
            audiences: ['admin', 'head', 'staff']
        };
        if (window.KreezbyNotifications) window.KreezbyNotifications.push(entry);
    }

    function showInApp(title, body) {
        var existing = document.getElementById('kreezby-threshold-toast');
        if (existing) existing.remove();
        var toast = document.createElement('a');
        toast.id = 'kreezby-threshold-toast';
        toast.href = alertHref();
        toast.setAttribute('role', 'status');
        toast.style.cssText = 'position:fixed;z-index:10070;right:16px;bottom:16px;max-width:min(360px,calc(100vw - 24px));display:block;background:#3e2723;color:#fff;padding:12px 14px;border-radius:12px;text-decoration:none;box-shadow:0 10px 28px rgba(0,0,0,.28);';
        toast.innerHTML = '<strong style="display:block;margin:0 0 4px;font-size:14px;">' + escapeHtml(title) + '</strong>'
            + '<span style="display:block;font-size:13px;line-height:1.4;color:#ffe082;">' + escapeHtml(body) + '</span>';
        document.body.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 8000);
    }

    function scanStock() {
        if (!allowedRole()) return;
        var active = readJson(ACTIVE_KEY, {});
        if (!active || typeof active !== 'object') active = {};
        // Last stock count seen per item. A notification is sent only when an item
        // drops to or below its alert line; items that were already low (for example
        // right after the data reset set every count to 0) don't create a burst of alerts.
        var last = readJson(LAST_QTY_KEY, {});
        if (!last || typeof last !== 'object' || Array.isArray(last)) last = {};
        var lastChanged = false;
        var changed = false;
        stockRows().forEach(function (row) {
            // A page without real stock data must not record or alert on placeholder counts.
            if (row.fallback) return;
            var open = active[row.code];
            var before = Object.prototype.hasOwnProperty.call(last, row.code) ? Number(last[row.code]) : null;
            if (before !== row.qty) {
                last[row.code] = row.qty;
                lastChanged = true;
            }
            // Reorder point notification: sent once when stock first drops to the reorder point.
            var rp = reorderPoint(row.threshold);
            if (before != null && before > rp && row.qty <= rp && row.qty > row.threshold) pushReorder(row, rp);
            if (row.qty <= row.threshold) {
                if (open && open.id) return;
                var dropped = before != null && before > row.threshold;
                active[row.code] = { id: dropped ? pushAlert(row) : ('quiet-' + row.code), qty: row.qty, threshold: row.threshold };
                changed = true;
                return;
            }
            if (open) {
                delete active[row.code];
                changed = true;
            }
        });
        if (changed) writeJson(ACTIVE_KEY, active);
        if (lastChanged) writeJson(LAST_QTY_KEY, last);
        renderLiveRows();
        renderThresholdBar();
    }

    function acknowledge(code) {
        if (!code) return;
        var active = readJson(ACTIVE_KEY, {});
        if (!active[code]) active[code] = {};
        active[code].id = active[code].id || ('muted-' + code);
        active[code].muted = true;
        writeJson(ACTIVE_KEY, active);
        renderLiveRows();
    }

    // Reorder point: a little above the alert line, so stock is ordered before it runs low.
    // Reorder point = alert line × 1.5. Suggested order = enough to reach twice the alert line.
    function reorderPoint(threshold) {
        return Math.ceil(Number(threshold) * 1.5);
    }

    function suggestedOrder(row) {
        return Math.max(0, Math.ceil(Number(row.threshold) * 2) - Number(row.qty));
    }

    function alertKinds() {
        return {
            low: { label: 'Low stock', severity: 'Warning' },
            reorder: { label: 'Reorder point', severity: 'Info' },
            near: { label: 'Near expiry', severity: 'Warning' },
            expired: { label: 'Expired', severity: 'Critical' }
        };
    }

    // Everything the Alerts page lists, from the live stock and batches.
    function liveAlertItems() {
        var active = readJson(ACTIVE_KEY, {});
        var items = [];
        stockRows().forEach(function (row) {
            if (row.fallback || !(row.threshold >= 0)) return;
            if (active[row.code] && active[row.code].muted && row.qty <= row.threshold) return;
            var unit = row.kind === 'finished' ? ' pouches' : '';
            if (row.qty <= row.threshold) {
                items.push({
                    kind: 'low', code: row.code, name: row.name,
                    severity: row.qty <= 0 || row.qty <= Math.floor(row.threshold / 2) ? 'Critical' : 'Warning',
                    actions: 'restock,dismiss',
                    message: (row.qty <= 0 ? row.name + ' is out of stock' : row.name + ' is at ' + row.count)
                        + ', at or below the alert line of ' + row.threshold + unit + '. Reorder about ' + suggestedOrder(row) + unit + '.'
                });
                return;
            }
            var rp = reorderPoint(row.threshold);
            if (row.qty <= rp) {
                items.push({
                    kind: 'reorder', code: row.code, name: row.name, severity: 'Info', actions: 'restock,dismiss',
                    message: row.name + ' is at ' + row.count + ', at its reorder point of ' + rp + unit
                        + ' (alert line ' + row.threshold + '). Order about ' + suggestedOrder(row) + unit + ' now so it does not run low.'
                });
            }
        });
        var dict = window.KreezbyDictionary;
        if (dict && typeof dict.alerts === 'function') {
            dict.alerts().forEach(function (alert) {
                if (!alert || alert.status !== 'pending') return;
                if (alert.alert_type !== 'near_expiry' && alert.alert_type !== 'expired') return;
                items.push({
                    kind: alert.alert_type === 'expired' ? 'expired' : 'near',
                    code: alert.reference_id, name: '', actions: 'dismiss',
                    severity: alert.alert_type === 'expired' ? 'Critical' : 'Warning',
                    message: alert.message + (alert.alert_type === 'expired' ? ' Remove it from sale.' : ' Sell or use it first.')
                });
            });
        }
        return items;
    }

    // "Alert results and interpretation": what the alerts mean right now, in plain words.
    function renderResults(items) {
        var host = document.getElementById('admin-alert-banners');
        if (!host) return;
        var count = { low: 0, reorder: 0, near: 0, expired: 0, out: 0 };
        items.forEach(function (item) {
            count[item.kind] += 1;
            if (item.kind === 'low' && /out of stock/.test(item.message)) count.out += 1;
        });
        var lines = [];
        if (count.expired) lines.push(count.expired + (count.expired === 1 ? ' batch has' : ' batches have') + ' expired. Take them off the shelf; they cannot be sold.');
        if (count.out) lines.push(count.out + (count.out === 1 ? ' item is' : ' items are') + ' out of stock. Customers and retailers cannot be served until it is restocked.');
        if (count.low - count.out > 0) lines.push((count.low - count.out) + (count.low - count.out === 1 ? ' item is' : ' items are') + ' at or below the alert line. Restock soon.');
        if (count.near) lines.push(count.near + (count.near === 1 ? ' batch expires' : ' batches expire') + ' within its expiry alert days. Sell or use these first.');
        if (count.reorder) lines.push(count.reorder + (count.reorder === 1 ? ' item has' : ' items have') + ' reached the reorder point. Order now so stock arrives before it runs low.');
        var tone = count.expired || count.out ? 'destructive' : (count.low || count.near ? 'warning' : (count.reorder ? 'info' : 'success'));
        var title = items.length ? 'Alert results: ' + items.length + (items.length === 1 ? ' item needs' : ' items need') + ' attention' : 'Alert results: all clear';
        var chips = [
            ['Low stock', count.low], ['Reorder point', count.reorder], ['Near expiry', count.near], ['Expired', count.expired]
        ].map(function (c) {
            return '<span style="display:inline-flex;gap:6px;align-items:center;padding:3px 10px;border-radius:999px;background:#fff;border:1px solid #eadfce;font-size:12px;font-weight:700;color:#3e2723;">' + c[0] + ' <b>' + c[1] + '</b></span>';
        }).join(' ');
        var body = lines.length
            ? '<ul style="margin:6px 0 0;padding-left:18px;">' + lines.map(function (l) { return '<li>' + escapeHtml(l) + '</li>'; }).join('') + '</ul>'
            : '<p style="margin:6px 0 0;">Every item is above its reorder point and no batch is near expiry or expired. No action is needed.</p>';
        host.innerHTML = '<div role="status" class="kreezby-alert kreezby-alert--' + tone + ' kreezby-alert--light kreezby-alert--md" data-kreezby-alert data-kreezby-alert-static>'
            + '<div class="kreezby-alert__content">'
            + '<div class="kreezby-alert__title">' + escapeHtml(title) + '</div>'
            + '<div class="kreezby-alert__description"><div style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 2px;">' + chips + '</div>' + body
            + '<p style="margin:8px 0 0;font-size:12px;opacity:.85;">How to read this: <b>Low stock</b> = at or below the alert line set in Alert settings. <b>Reorder point</b> = 1.5 × the alert line; ordering at this point keeps stock from dropping to the alert line. <b>Near expiry</b> = within the item\'s expiry alert days. <b>Expired</b> = past its expiry date.</p>'
            + '</div></div></div>';
    }

    // Type filter (All / Low stock / Reorder point / Near expiry / Expired) next to the search box.
    function ensureKindFilter() {
        if (document.getElementById('alert-kind')) return;
        var tools = document.querySelector('#alert-master .po-list-toolbar-tools');
        if (!tools) return;
        var label = document.createElement('label');
        label.className = 'po-page-size';
        label.innerHTML = 'Type <select id="alert-kind"><option value="">All alerts</option>'
            + '<option value="low">Low stock</option><option value="reorder">Reorder point</option>'
            + '<option value="near">Near expiry</option><option value="expired">Expired</option></select>';
        tools.insertBefore(label, tools.firstChild);
    }

    function renderLiveRows() {
        var table = document.querySelector('#alert-table tbody');
        if (!table) return;
        ensureKindFilter();
        var items = liveAlertItems();
        var signature = items.map(function (item) { return item.kind + ':' + item.code + ':' + item.message; }).join('|');
        if (table.dataset.liveSignature === signature) return;
        table.dataset.liveSignature = signature;
        renderResults(items);
        table.querySelectorAll('tr').forEach(function (row) { row.remove(); });
        var stamp = new Date();
        var when = stamp.getFullYear() + '-' + String(stamp.getMonth() + 1).padStart(2, '0') + '-' + String(stamp.getDate()).padStart(2, '0')
            + ' ' + String(stamp.getHours()).padStart(2, '0') + ':' + String(stamp.getMinutes()).padStart(2, '0');
        var order = { expired: 0, low: 1, near: 2, reorder: 3 };
        var kinds = alertKinds();
        items.sort(function (a, b) { return order[a.kind] - order[b.kind]; });
        if (!items.length) {
            table.innerHTML = '<tr class="kreezby-phone-span"><td colspan="6" style="text-align:center;padding:18px;color:#7a6558;">No alerts right now. Stock is above every reorder point and nothing is near expiry.</td></tr>';
        }
        items.forEach(function (item) {
            var tr = document.createElement('tr');
            tr.setAttribute('data-live-alert', '1');
            tr.setAttribute('data-kind', item.kind);
            tr.setAttribute('data-source', item.code);
            tr.setAttribute('data-time', when);
            tr.setAttribute('data-severity', item.severity);
            tr.setAttribute('data-actions', item.actions);
            var menu = (item.actions.indexOf('restock') >= 0 ? '<button type="button" class="action-popup-item" data-alert-action="restock">Create Restock P.O.</button>' : '')
                + '<button type="button" class="action-popup-item dismiss-action" data-alert-action="dismiss">Dismiss Alert</button>';
            tr.innerHTML = ''
                + '<td class="po-col-num"></td>'
                + '<td>' + escapeHtml(when) + '</td>'
                + '<td><strong>' + escapeHtml(item.code) + '</strong><div style="font-size:11px;color:#7a6558;margin-top:2px;">' + escapeHtml(kinds[item.kind].label) + '</div></td>'
                + '<td class="al-message">' + escapeHtml(item.message) + '</td>'
                + '<td class="al-severity"><span class="severity-badge ' + item.severity.toLowerCase() + '">' + item.severity + '</span></td>'
                + '<td class="al-action"><div class="action-menu-relative-container" data-kreezby-page-menu>'
                + '<button type="button" class="action-trigger-btn" data-alert-menu="1">Action ▾</button>'
                + '<div class="action-popup-menu">' + menu + '</div></div></td>';
            table.appendChild(tr);
        });
        if (window.AlertAdmin && typeof window.AlertAdmin.filter === 'function') window.AlertAdmin.filter();
    }

    function codeForName(name) {
        var wanted = String(name || '').trim().toLowerCase();
        var i;
        if (!wanted) return '';
        for (i = 0; i < CATALOG.length; i++) {
            if (CATALOG[i].name.toLowerCase() === wanted || CATALOG[i].code.toLowerCase() === wanted) return CATALOG[i].code;
        }
        return '';
    }

    function renderThresholdBar() {
        var bar = document.getElementById('kreezby-threshold-bar');
        if (bar) bar.remove();
    }

    function renderPermissionBanner() {
        var banner = document.getElementById('kreezby-notify-banner');
        if (banner) banner.remove();
    }

    function requestPermission() {
        if (!window.Notification) return Promise.resolve('unsupported');
        return Notification.requestPermission().then(function (result) {
            var banner = document.getElementById('kreezby-notify-banner');
            if (banner && result !== 'default') banner.remove();
            if (result === 'granted') {
                registerWorker();
                showNative('Kreezby alerts are on', 'This browser will notify this device when stock reaches the threshold.', 'kreezby-notify-enabled');
                flushUnseen();
            }
            document.dispatchEvent(new CustomEvent('kreezby:notify-permission', { detail: { permission: result } }));
            return result;
        });
    }

    function sendTest() {
        if (!window.Notification || Notification.permission !== 'granted') {
            return requestPermission();
        }
        showNative('Kreezby test alert', 'This is how Chrome, Edge, and other browsers notify this device.', 'kreezby-test-' + Date.now());
        return Promise.resolve('granted');
    }

    function registerWorker() {
        if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;
        // The site may live at the domain root (local server) or under /Kreezby-Bakeshop-main/
        // (Vercel): register the worker from the folder that holds the portal folders.
        var path = window.location.pathname.replace(/\\/g, '/');
        var match = path.match(/^(.*?\/)(admin|head_admin|staff|retailer|customer|auth|admin_names|staff_names)\//i);
        var base = match ? match[1] : '/';
        navigator.serviceWorker.register(base + 'sw-alerts.js', { scope: base }).catch(function () { /* page notifications still work */ });
    }

    function ensureProfileLink() {
        var menu = document.getElementById('user-dropdown-menu');
        var href = profileHref();
        if (!menu || !href || menu.querySelector('[data-profile-link]')) return;
        var link = document.createElement('a');
        link.href = href;
        link.className = 'dropdown-item';
        link.setAttribute('data-profile-link', '1');
        link.textContent = 'Profile';
        menu.insertBefore(link, menu.firstChild);
    }

    function watchProfileLink() {
        ensureProfileLink();
        if (!window.MutationObserver || document.body.dataset.kreezbyProfileWatch === '1') return;
        document.body.dataset.kreezbyProfileWatch = '1';
        new MutationObserver(function () { ensureProfileLink(); }).observe(document.body, { childList: true, subtree: true });
    }

    function ensureCss() {
        var href = '../css/shared/portal-profile.css?v=20261015layout6';
        var link = document.getElementById('kreezby-portal-profile-style');
        if (link) {
            if (link.getAttribute('href') !== href) link.href = href;
            return;
        }
        link = document.createElement('link');
        link.id = 'kreezby-portal-profile-style';
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function boot() {
        if (!allowedRole()) return;
        ensureCss();
        registerWorker();
        watchProfileLink();
        renderPermissionBanner();
        renderThresholdBar();
        document.addEventListener('content:replaced', renderThresholdBar);
        document.addEventListener('kreezby:page-load', renderThresholdBar);
        document.addEventListener('turbo:frame-load', renderThresholdBar);
        var start = function () {
            rewriteStoredCounts();
            flushUnseen();
            scanStock();
            setTimeout(rewriteStoredCounts, 1500);
        };
        if (window.KreezbyNotifications) start();
        else {
            var existing = document.getElementById('kreezby-notification-store-script');
            if (existing) existing.addEventListener('load', start, { once: true });
            else {
                var script = document.createElement('script');
                script.id = 'kreezby-notification-store-script';
                script.src = '../js/notification-store.js?v=20261108cart';
                script.onload = start;
                document.head.appendChild(script);
            }
        }
        document.addEventListener('kreezby:notification-change', function (event) {
            var change = event.detail || {};
            if (change.type === 'added') announce(change.notification);
        });
        document.addEventListener('kreezby:remote-state', function () {
            flushUnseen();
            scanStock();
        });
        document.addEventListener('kreezby:stocks-sync', function () {
            scanStock();
        });
        window.addEventListener('storage', function (event) {
            if (!event.key || [NOTES_KEY, STOCK_KEY, SETTINGS_KEY, ACTIVE_KEY, 'kreezby_data_dictionary_v1'].indexOf(event.key) === -1) return;
            flushUnseen();
            scanStock();
        });
        setInterval(function () {
            flushUnseen();
            scanStock();
        }, 5000);
    }

    window.KreezbyBrowserAlerts = {
        settings: settings,
        thresholdFor: thresholdFor,
        codeForName: codeForName,
        setShopThreshold: setShopThreshold,
        setItemThreshold: setItemThreshold,
        setItemThresholds: setItemThresholds,
        clearItemThreshold: clearItemThreshold,
        stockRows: stockRows,
        acknowledge: acknowledge,
        requestPermission: requestPermission,
        sendTest: sendTest,
        permission: function () { return window.Notification ? Notification.permission : 'unsupported'; },
        scan: scanStock
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
