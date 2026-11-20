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

    // Every type of inventory: finished products (every flavor, including ones added later),
    // raw materials and packaging materials (including materials added later in Inventory).
    function alertCatalog() {
        var list = CATALOG.slice();
        var dict = window.KreezbyDictionary;
        if (dict && typeof dict.productCatalog === 'function') {
            dict.productCatalog().forEach(function (p) {
                if (!p || !p.id || catalogItem(p.id)) return;
                list.push({ code: p.id, name: p.name, kind: 'finished', qty: 0, alert: null });
            });
        }
        var saved = readJson('kreezby_data_dictionary_v1', {}) || {};
        (Array.isArray(saved.materials_extra) ? saved.materials_extra : []).forEach(function (m) {
            if (!m || !m.material_id || !m.name || catalogItem(m.material_id)) return;
            if (list.some(function (x) { return x.code === m.material_id || String(x.name).toLowerCase() === String(m.name).toLowerCase(); })) return;
            list.push({ code: m.material_id, name: m.name, kind: 'material', type: m.type || '', qty: 0, alert: 10 });
        });
        return list;
    }

    // Finished product, Raw material or Packaging material, for the alarm list.
    function stockTypeOf(code) {
        var c = String(code || '');
        var item = null;
        alertCatalog().forEach(function (x) { if (x.code === c) item = x; });
        if (item && item.kind === 'finished') return 'Finished product';
        if ((item && /packag/i.test(item.type || '')) || /^PKG-/i.test(c)) return 'Packaging material';
        if (item || /^RM-/i.test(c)) return 'Raw material';
        return 'Finished product';
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
                    note.close();
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

    // Expired stock: head admin and admin get one notification per expired batch (or material),
    // sent automatically by whichever head admin, admin or staff page notices it first. The id is
    // the same on every device and the "already notified" list is shared, so it is sent once.
    var EXPIRY_NOTIFIED_KEY = 'kreezby_expiry_notified_v1';
    function notifyExpired() {
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.alerts !== 'function' || !window.KreezbyNotifications) return;
        var list;
        try { list = dict.alerts(); } catch (e) { return; }
        var notified = readJson(EXPIRY_NOTIFIED_KEY, {});
        if (!notified || typeof notified !== 'object' || Array.isArray(notified)) notified = {};
        var stored = readJson(NOTES_KEY, []);
        var storedIds = {};
        (Array.isArray(stored) ? stored : []).forEach(function (n) { if (n && n.id) storedIds[n.id] = true; });
        var changed = false;
        (list || []).forEach(function (alert) {
            if (!alert || alert.alert_type !== 'expired' || !alert.message) return;
            // Raw and packaging materials have no expiry date on the Inventory, so they are not reported as expired.
            if (/^(RM|PKG)-/i.test(String(alert.reference_id || ''))) return;
            var msg = String(alert.message);
            var dateMatch = msg.match(/expired on (\d{4}-\d{2}-\d{2})/);
            var batchMatch = msg.match(/ batch (\S+) \(/);
            var key = String(alert.reference_id || '') + '|' + (batchMatch ? batchMatch[1] : '') + '|' + (dateMatch ? dateMatch[1] : '');
            var id = 'expired-' + key.replace(/[^A-Za-z0-9|.-]+/g, '_');
            if (notified[key] || storedIds[id]) {
                if (!notified[key]) { notified[key] = new Date().toISOString(); changed = true; }
                return;
            }
            var name = msg.split(/ batch | \(| expired on /)[0];
            window.KreezbyNotifications.push({
                id: id,
                title: name + ' has expired',
                description: msg.replace(/ and cannot be sold\.$/, '.') + ' It was moved to Inventory › Expired and cannot be sold.',
                source: 'alert',
                audiences: ['head', 'admin']
            });
            notified[key] = new Date().toISOString();
            changed = true;
        });
        if (changed) writeJson(EXPIRY_NOTIFIED_KEY, notified);
    }

    // ---------- Stock alarm ----------
    // Low stock, near expiry and expired stock do not only add a notification: a pop-up covers
    // the page with a warning sound until someone acts on it (Acknowledge, Remind me later or
    // View Alerts). New problems pop up right away; problems already acknowledged come back
    // after ALARM_REPEAT_MS while they are still not fixed.
    var ALARM_REPEAT_MS = 4 * 60 * 60 * 1000;   // reminds again after 4 hours
    var ALARM_SNOOZE_MS = 30 * 60 * 1000;       // "Remind me later"
    var alarmTitleTimer = null;
    var alarmBaseTitle = '';
    var audioCtx = null;
    var pendingSound = false;

    function alarmUserKey() {
        try {
            var s = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
            return String(s.userId || s.id || s.identity || s.userName || s.email || 'me').toLowerCase().replace(/[^a-z0-9_-]+/g, '');
        } catch (e) { return 'me'; }
    }
    // Per account on this browser ("kz" keys are not shared with other accounts or devices).
    function alarmState() {
        var st = readJson('kzStockAlarm:' + alarmUserKey(), null);
        if (!st || typeof st !== 'object') st = { ack: {}, snoozeUntil: 0 };
        if (!st.ack || typeof st.ack !== 'object') st.ack = {};
        return st;
    }
    function saveAlarmState(st) { writeJson('kzStockAlarm:' + alarmUserKey(), st); }

    function alarmItems() {
        return liveAlertItems().filter(function (item) {
            if (item.kind !== 'low' && item.kind !== 'near' && item.kind !== 'expired') return false;
            // Raw and packaging materials have no expiry date on the Inventory.
            if ((item.kind === 'near' || item.kind === 'expired') && /^(RM|PKG)-/i.test(String(item.code || ''))) return false;
            return true;
        }).map(function (item) {
            var batch = (String(item.message).match(/ batch (\S+)/) || [])[1] || '';
            var out = item.kind === 'low' && /out of stock/.test(item.message);
            item.alarmKey = item.kind + '|' + item.code + '|' + batch + (out ? '|out' : '');
            item.stockType = stockTypeOf(item.code);
            return item;
        });
    }

    function alarmLabel(item) {
        if (item.kind === 'expired') return 'Expired';
        if (item.kind === 'near') return 'Near expiry';
        return /out of stock/.test(item.message) ? 'Out of stock' : 'Low stock';
    }

    function injectAlarmStyle() {
        if (document.getElementById('kz-stock-alarm-style')) return;
        var st = document.createElement('style');
        st.id = 'kz-stock-alarm-style';
        st.textContent = ''
            + '#kz-stock-alarm{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(43,30,26,.55);font-family:inherit;}'
            + '#kz-stock-alarm[hidden]{display:none!important;}'
            + '#kz-stock-alarm .kza-card{width:min(560px,100%);max-height:calc(100vh - 36px);display:flex;flex-direction:column;background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;border-top:6px solid #c62828;animation:kzaPop .25s ease-out;}'
            + '@keyframes kzaPop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}'
            + '@keyframes kzaPulse{0%,100%{box-shadow:0 0 0 0 rgba(198,40,40,.45)}50%{box-shadow:0 0 0 12px rgba(198,40,40,0)}}'
            + '#kz-stock-alarm .kza-head{display:flex;gap:14px;align-items:center;padding:20px 22px 12px;}'
            + '#kz-stock-alarm .kza-icon{flex:0 0 48px;width:48px;height:48px;border-radius:50%;background:#c62828;color:#fff;display:grid;place-items:center;font-size:26px;font-weight:800;animation:kzaPulse 1.4s infinite;}'
            + '#kz-stock-alarm h2{margin:0;font-size:20px;line-height:1.25;color:#3d2c2a;}'
            + '#kz-stock-alarm .kza-sub{margin:3px 0 0;font-size:13px;color:#7d726c;line-height:1.45;}'
            + '#kz-stock-alarm .kza-counts{display:flex;gap:8px;flex-wrap:wrap;padding:0 22px 12px;}'
            + '#kz-stock-alarm .kza-count{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:800;}'
            + '#kz-stock-alarm .kza-typechip{background:#f5ede6;color:#5d4037;}'
            + '#kz-stock-alarm .kza-list{list-style:none;margin:0;padding:0 22px;overflow:auto;flex:1 1 auto;}'
            + '#kz-stock-alarm .kza-list li{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #f1e9e3;font-size:13.5px;line-height:1.45;color:#3d2c2a;}'
            + '#kz-stock-alarm .kza-tag{flex:0 0 auto;min-width:92px;text-align:center;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;}'
            + '#kz-stock-alarm .kza-type{display:block;font-size:11px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#8d6e63;margin-bottom:1px;}'
            + '#kz-stock-alarm .kza-new{display:inline-block;margin-left:6px;padding:1px 6px;border-radius:6px;background:#3d2c2a;color:#fff;font-size:10px;font-weight:800;vertical-align:middle;}'
            + '#kz-stock-alarm .is-expired{background:#ffebee;color:#c62828;}'
            + '#kz-stock-alarm .is-out{background:#c62828;color:#fff;}'
            + '#kz-stock-alarm .is-low{background:#fff3e0;color:#e65100;}'
            + '#kz-stock-alarm .is-near{background:#fff8e1;color:#8d6e00;}'
            + '#kz-stock-alarm .kza-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;padding:14px 22px 18px;border-top:1px solid #efe6df;background:#fffaf4;}'
            + '#kz-stock-alarm .kza-actions button{height:42px;padding:0 16px;border-radius:10px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;}'
            + '#kz-stock-alarm .kza-later{border:1px solid #d7ccc8;background:#fff;color:#5d4037;}'
            + '#kz-stock-alarm .kza-view{border:1px solid #3d2c2a;background:#fff;color:#3d2c2a;}'
            + '#kz-stock-alarm .kza-ack{border:0;background:#c62828;color:#fff;}'
            + '#kz-stock-alarm .kza-sound{margin-right:auto;border:0!important;background:transparent!important;color:#8d6e63!important;font-size:12px!important;padding:0 4px!important;}'
            + '@media (max-width:560px){#kz-stock-alarm .kza-actions button{flex:1 1 auto}#kz-stock-alarm .kza-sound{flex-basis:100%!important;order:9}}';
        (document.head || document.documentElement).appendChild(st);
    }

    function soundOn() { return readJson('kzStockAlarmSound', true) !== false; }

    // A short warning beep made in the browser (no sound file). Browsers only allow sound after
    // the person has clicked or typed on the page once; until then it plays on the next click.
    function playAlarmSound() {
        if (!soundOn()) return;
        try {
            var Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            audioCtx = audioCtx || new Ctx();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(function () {});
                if (audioCtx.state === 'suspended') { pendingSound = true; return; }
            }
            pendingSound = false;
            var t = audioCtx.currentTime;
            [0, 0.28, 0.56].forEach(function (offset, i) {
                var osc = audioCtx.createOscillator();
                var gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.value = i === 2 ? 660 : 880;
                gain.gain.setValueAtTime(0.0001, t + offset);
                gain.gain.exponentialRampToValueAtTime(0.18, t + offset + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.22);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(t + offset);
                osc.stop(t + offset + 0.24);
            });
        } catch (e) { /* sound is optional */ }
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e2) { /* optional */ }
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (name) {
        window.addEventListener(name, function () {
            if (pendingSound && document.getElementById('kz-stock-alarm') && !document.getElementById('kz-stock-alarm').hidden) playAlarmSound();
        }, true);
    });

    // The browser tab blinks while the alarm is open and the page is in the background.
    function startTitleBlink(count) {
        if (alarmTitleTimer) return;
        alarmBaseTitle = document.title;
        var on = false;
        alarmTitleTimer = setInterval(function () {
            on = !on;
            document.title = on ? '⚠ ' + count + ' stock alert' + (count === 1 ? '' : 's') + '!' : alarmBaseTitle;
        }, 1000);
    }
    function stopTitleBlink() {
        if (!alarmTitleTimer) return;
        clearInterval(alarmTitleTimer);
        alarmTitleTimer = null;
        if (alarmBaseTitle) document.title = alarmBaseTitle;
    }

    function hideAlarm() {
        var box = document.getElementById('kz-stock-alarm');
        if (box) box.hidden = true;
        stopTitleBlink();
    }

    function showAlarm(items, fresh) {
        injectAlarmStyle();
        var box = document.getElementById('kz-stock-alarm');
        if (!box) {
            box = document.createElement('div');
            box.id = 'kz-stock-alarm';
            box.setAttribute('role', 'alertdialog');
            box.setAttribute('aria-modal', 'true');
            box.setAttribute('aria-labelledby', 'kza-title');
            document.body.appendChild(box);
            box.addEventListener('click', function (e) {
                var btn = e.target.closest ? e.target.closest('button[data-kza]') : null;
                if (!btn) return;
                var act = btn.getAttribute('data-kza');
                var st = alarmState();
                var keys = String(box.getAttribute('data-keys') || '').split(',').filter(Boolean);
                if (act === 'sound') {
                    writeJson('kzStockAlarmSound', !soundOn());
                    btn.textContent = soundOn() ? '🔊 Sound on' : '🔇 Sound off';
                    if (soundOn()) playAlarmSound();
                    return;
                }
                if (act === 'later') {
                    st.snoozeUntil = Date.now() + ALARM_SNOOZE_MS;
                } else {
                    keys.forEach(function (k) { st.ack[k] = Date.now(); });
                    st.snoozeUntil = 0;
                }
                saveAlarmState(st);
                hideAlarm();
                if (act === 'view') location.href = alertHref();
            });
        }
        var counts = { expired: 0, out: 0, low: 0, near: 0 };
        items.forEach(function (item) {
            var label = alarmLabel(item);
            if (label === 'Expired') counts.expired++;
            else if (label === 'Out of stock') counts.out++;
            else if (label === 'Low stock') counts.low++;
            else counts.near++;
        });
        var order = { 'Expired': 0, 'Out of stock': 1, 'Low stock': 2, 'Near expiry': 3 };
        var sorted = items.slice().sort(function (a, b) { return order[alarmLabel(a)] - order[alarmLabel(b)]; });
        var cls = { 'Expired': 'is-expired', 'Out of stock': 'is-out', 'Low stock': 'is-low', 'Near expiry': 'is-near' };
        var chips = [
            counts.expired ? '<span class="kza-count is-expired">' + counts.expired + ' expired</span>' : '',
            counts.out ? '<span class="kza-count is-out">' + counts.out + ' out of stock</span>' : '',
            counts.low ? '<span class="kza-count is-low">' + counts.low + ' low stock</span>' : '',
            counts.near ? '<span class="kza-count is-near">' + counts.near + ' near expiry</span>' : ''
        ].join('');
        var types = {};
        items.forEach(function (item) { types[item.stockType] = (types[item.stockType] || 0) + 1; });
        chips += ['Finished product', 'Raw material', 'Packaging material'].filter(function (t) { return types[t]; })
            .map(function (t) { return '<span class="kza-count kza-typechip">' + types[t] + ' ' + t.toLowerCase() + (types[t] === 1 ? '' : 's') + '</span>'; }).join('');
        box.setAttribute('data-keys', items.map(function (i) { return i.alarmKey; }).join(','));
        box.innerHTML = '<div class="kza-card">'
            + '<div class="kza-head"><div class="kza-icon" aria-hidden="true">!</div><div>'
            + '<h2 id="kza-title">Stock alert: action needed</h2>'
            + '<p class="kza-sub">' + (items.length === 1 ? 'This item needs' : 'These ' + items.length + ' items need') + ' attention now. Expired stock must not be sold; restock low items and use near-expiry stock first.</p>'
            + '</div></div>'
            + '<div class="kza-counts">' + chips + '</div>'
            + '<ul class="kza-list">' + sorted.map(function (item) {
                var label = alarmLabel(item);
                var isNew = fresh.indexOf(item.alarmKey) >= 0;
                return '<li><span class="kza-tag ' + cls[label] + '">' + label + '</span><span><span class="kza-type">' + escapeHtml(item.stockType || '') + '</span>' + escapeHtml(item.message) + (isNew ? '<span class="kza-new">NEW</span>' : '') + '</span></li>';
            }).join('') + '</ul>'
            + '<div class="kza-actions">'
            + '<button type="button" class="kza-sound" data-kza="sound">' + (soundOn() ? '🔊 Sound on' : '🔇 Sound off') + '</button>'
            + '<button type="button" class="kza-later" data-kza="later">Remind me in 30 min</button>'
            + (/alert-(headadmin|admin|staff)\.html$/i.test(location.pathname || '') ? '' : '<button type="button" class="kza-view" data-kza="view">View Alerts</button>')
            + '<button type="button" class="kza-ack" data-kza="ack">Acknowledge</button>'
            + '</div></div>';
        box.hidden = false;
        var ack = box.querySelector('.kza-ack');
        if (ack) setTimeout(function () { try { ack.focus(); } catch (e) { /* ignore */ } }, 30);
        startTitleBlink(items.length);
        playAlarmSound();
    }

    var alarmShownSig = '';
    function checkAlarm() {
        if (!allowedRole() || !document.body) return;
        // The screen lock comes first; the alarm shows once the account is unlocked.
        if (document.documentElement.classList.contains('kz-locked')) return;
        var items = alarmItems();
        var box = document.getElementById('kz-stock-alarm');
        if (!items.length) { hideAlarm(); alarmShownSig = ''; return; }
        var st = alarmState();
        var now = Date.now();
        var due = items.filter(function (i) { var at = st.ack[i.alarmKey]; return !at || now - at >= ALARM_REPEAT_MS; });
        var fresh = items.filter(function (i) { return !st.ack[i.alarmKey]; }).map(function (i) { return i.alarmKey; });
        var sig = items.map(function (i) { return i.alarmKey; }).sort().join(',');
        if (box && !box.hidden) {
            // Already open: refresh it if the list changed (sound again only for new problems).
            if (sig !== alarmShownSig) {
                var hadNew = fresh.some(function (k) { return String(box.getAttribute('data-keys') || '').split(',').indexOf(k) < 0; });
                alarmShownSig = sig;
                showAlarm(items, fresh);
                if (!hadNew) { /* showAlarm played the sound; fine for an updated list */ }
            }
            return;
        }
        if (!due.length) return;
        // "Remind me later" waits, unless something new came up.
        if (st.snoozeUntil && now < st.snoozeUntil && !fresh.length) return;
        alarmShownSig = sig;
        showAlarm(items, fresh);
    }

    function scanStock() {
        if (!allowedRole()) return;
        try { notifyExpired(); } catch (e) { /* stock alerts below still run */ }
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
                // Stock is back above the alert line: the alert is resolved by itself and logged.
                logResolved(row, open);
                delete active[row.code];
                changed = true;
            }
        });
        if (changed) writeJson(ACTIVE_KEY, active);
        if (lastChanged) writeJson(LAST_QTY_KEY, last);
        renderLiveRows();
        renderThresholdBar();
        try { checkAlarm(); } catch (e) { /* the alarm is optional */ }
    }

    var RESOLVED_KEY = 'kreezbyAlertResolvedLog';
    function logResolved(row, open) {
        var log = readJson(RESOLVED_KEY, []);
        if (!Array.isArray(log)) log = [];
        log.unshift({
            code: row.code, name: row.name, kind: 'low',
            lowQty: open && open.qty != null ? open.qty : null,
            nowQty: row.qty, threshold: row.threshold,
            acknowledged: !!(open && open.muted),
            resolvedAt: new Date().toISOString()
        });
        writeJson(RESOLVED_KEY, log.slice(0, 50));
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
        // Each line: [tag text, tag tone, what it means and what to do].
        var lines = [];
        if (count.expired) lines.push(['Expired', 'bad', count.expired + (count.expired === 1 ? ' batch has' : ' batches have') + ' expired. Take them off the shelf; they cannot be sold.']);
        if (count.out) lines.push(['Out of stock', 'bad', count.out + (count.out === 1 ? ' item is' : ' items are') + ' out of stock. Customers and retailers cannot be served until it is restocked.']);
        if (count.low - count.out > 0) lines.push(['Low stock', 'warn', (count.low - count.out) + (count.low - count.out === 1 ? ' item is' : ' items are') + ' at or below the alert line. Restock soon.']);
        if (count.near) lines.push(['Near expiry', 'warn', count.near + (count.near === 1 ? ' batch expires' : ' batches expire') + ' within its expiry alert days. Sell or use these first.']);
        if (count.reorder) lines.push(['Reorder', 'info', count.reorder + (count.reorder === 1 ? ' item has' : ' items have') + ' reached the reorder point. Order now so stock arrives before it runs low.']);
        var title = items.length ? 'Alert results: ' + items.length + (items.length === 1 ? ' item needs' : ' items need') + ' attention' : 'Alert results: all clear';
        ensureResultsStyle();
        var stats = [
            ['Low stock', count.low], ['Reorder point', count.reorder], ['Near expiry', count.near], ['Expired', count.expired]
        ].map(function (c) {
            return '<div class="ka-stat' + (c[1] ? ' has' : '') + '"><small>' + c[0] + '</small><strong>' + c[1] + '</strong></div>';
        }).join('');
        var body = lines.length
            ? '<ul class="ka-list">' + lines.map(function (l) {
                return '<li><span class="ka-tag ' + l[1] + '">' + escapeHtml(l[0]) + '</span><span>' + escapeHtml(l[2]) + '</span></li>';
            }).join('') + '</ul>'
            : '<p class="ka-empty">Every item is above its reorder point and no batch is near expiry or expired. No action is needed.</p>';
        var resolved = readJson(RESOLVED_KEY, []);
        if (!Array.isArray(resolved)) resolved = [];
        var resolvedHtml = resolved.length
            ? '<ul class="ka-list">' + resolved.slice(0, 8).map(function (r) {
                var when = new Date(r.resolvedAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                return '<li><span class="ka-tag ok">Resolved</span><span>' + escapeHtml(r.name || r.code) + ': back to ' + r.nowQty
                    + (r.lowQty != null ? ' (was ' + r.lowQty + ')' : '') + ', above the alert line of ' + r.threshold + ' · ' + escapeHtml(when)
                    + (r.acknowledged ? ' · had been acknowledged' : '') + '</span></li>';
            }).join('') + '</ul>'
            : '<p class="ka-empty">No alert has been resolved yet.</p>';
        var rules = '<ul class="ka-list">'
            + '<li><span class="ka-tag warn">Low stock</span><span>Raised when an item is at or below its alert line (set per item in Alert settings, otherwise the shop-wide line). Critical when it is at half the line or out of stock.</span></li>'
            + '<li><span class="ka-tag info">Reorder point</span><span>Alert line × 1.5. Suggested order = (alert line × 2) − stock on hand. Sent once when stock first drops to it.</span></li>'
            + '<li><span class="ka-tag warn">Near expiry</span><span>A batch with stock left that expires within its expiry alert days (finished products: 3 days; raw materials: 7 days).</span></li>'
            + '<li><span class="ka-tag bad">Expired</span><span>A batch past its expiry date. Its pouches are held out of sales until head admin or admin disposes of them (recorded as waste).</span></li>'
            + '<li><span class="ka-tag info">Frequency</span><span>Stock is checked every time stock changes and when a page opens. The alarm pops up for new alerts; Acknowledge silences it for 4 hours, Remind me later for 30 minutes.</span></li>'
            + '<li><span class="ka-tag ok">Resolution</span><span>A low-stock alert is resolved by itself once stock goes back above the alert line; an expired alert once the batch is disposed of. Resolved alerts are listed under Recently resolved.</span></li>'
            + '</ul>';
        host.innerHTML = '<section class="ka-card" role="status">'
            + '<div class="ka-head"><h4>' + escapeHtml(title) + '</h4></div>'
            + '<div class="ka-stats">' + stats + '</div>'
            + body
            + '</section>'
            + '<section class="ka-card"><div class="ka-head"><h4>Recently resolved</h4></div>' + resolvedHtml + '</section>'
            + '<details class="ka-card"><summary style="cursor:pointer;font-weight:700;font-size:14px">Alert rules</summary>' + rules + '</details>';
    }

    // Same look as Insights > Management Insight: white card, small stat tiles, tagged lines.
    function ensureResultsStyle() {
        if (document.getElementById('ka-results-style')) return;
        var style = document.createElement('style');
        style.id = 'ka-results-style';
        style.textContent = ''
            + '.ka-card{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:14px 16px;margin:0 0 14px;color:#3e2723;}'
            + '.ka-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:0 0 10px;}'
            + '.ka-head h4{margin:0;font-size:14px;color:#3e2723;}'
            + '.ka-tag{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;}'
            + '.ka-tag.ok{background:#e8f5e9;color:#2e7d32;}'
            + '.ka-tag.warn{background:#fff3e0;color:#e65100;}'
            + '.ka-tag.bad{background:#ffebee;color:#c62828;}'
            + '.ka-tag.info{background:#e3f2fd;color:#1565c0;}'
            + '.ka-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;}'
            + '.ka-stat{background:#fffaf3;border:1px solid #f0e4d2;border-radius:10px;padding:8px 10px;min-width:0;}'
            + '.ka-stat small{display:block;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8d6e63;}'
            + '.ka-stat strong{display:block;font-size:18px;line-height:1.25;color:#3e2723;margin-top:2px;}'
            + '.ka-stat.has strong{color:#c62828;}'
            + '.ka-list{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:6px;}'
            + '.ka-list li{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:start;padding:7px 10px;border-radius:9px;background:#fffaf3;border:1px solid #f0e4d2;font-size:12.5px;line-height:1.4;}'
            + '.ka-list .ka-tag{justify-self:start;}'
            + '.ka-empty{margin:12px 0 0;font-size:12.5px;color:#7a6558;}'
            + '@media (max-width:900px){.ka-stats{grid-template-columns:repeat(2,minmax(0,1fr));}}'
            + '@media (max-width:600px){.ka-card{padding:12px;}.ka-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;}'
            + '.ka-stat{padding:7px 10px;}.ka-stat strong{font-size:17px;}'
            + '.ka-list li{grid-template-columns:minmax(0,1fr);gap:4px;}}';
        document.head.appendChild(style);
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
                script.src = '../js/notification-store.js?v=20261115keepread';
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
        scan: scanStock,
        showAlarmNow: function () { var st = alarmState(); st.ack = {}; st.snoozeUntil = 0; saveAlarmState(st); checkAlarm(); }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
