/**
 * Staff & admin presence for the inbox.
 *
 * - Every signed-in staff / admin / head admin page writes a small heartbeat
 *   (localStorage key "kreezbyPresence_<accountId>") every 30 seconds. The key is a
 *   normal shared kreezby* key, so kreezby-db-sync.js mirrors it to the server and
 *   every other browser receives it.
 * - The staff and admin inbox shows an "Active" strip above "Search chats":
 *   green dot = online now, otherwise how long ago the person went offline.
 */
(function () {
    'use strict';

    if (window.KreezbyPresence) return;

    var PREFIX = 'kreezbyPresence_';
    var HEARTBEAT_MS = 30000;
    // Background tabs may only run timers once a minute, so allow some slack.
    var ONLINE_WINDOW_MS = 150000;
    var INBOX_ROLES = { staff: 1, admin: 1, headadmin: 1, head_admin: 1, retailer: 1 };
    var PORTAL_TYPES = {
        'Staff': 'Staff',
        'Administrator': 'Admin',
        'Head Administrator': 'Head Admin',
        'IT Support': 'Admin',
        // Retailers can message (and be messaged by) any head admin, admin or staff.
        'Retailer': 'Retailer'
    };

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) || fallback) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function slug(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    }

    function users() {
        if (window.KreezbyMaintenanceSettings && typeof window.KreezbyMaintenanceSettings.getUsers === 'function') {
            try { return window.KreezbyMaintenanceSettings.getUsers() || {}; } catch (e) { /* fall through */ }
        }
        return readJson('kreezby_maintenance_users', {});
    }

    function roleLabel(account, fallbackBucket) {
        var type = String(account.accountType || '');
        if (PORTAL_TYPES[type]) return PORTAL_TYPES[type];
        return fallbackBucket === 'staff' ? 'Staff' : 'Admin';
    }

    /** Staff + admin accounts that should appear in the strip. */
    function teamAccounts() {
        var blob = users();
        var list = [];
        (blob.admins || []).forEach(function (a) {
            if (!a || a.active === false) return;
            list.push({ id: slug(a.id || a.username || a.name), name: a.name || a.username || 'Admin', role: roleLabel(a, 'admins') });
        });
        (blob.staff || []).forEach(function (s) {
            if (!s || s.active === false) return;
            list.push({ id: slug(s.id || s.username || s.name), name: s.name || s.username || 'Staff', role: 'Staff' });
        });
        return list.filter(function (a) { return a.id; });
    }

    /** Who is signed in on this browser (staff / admin only). */
    function currentAccount() {
        var session = readJson('kreezby_session', null);
        if (!session || !PORTAL_TYPES[session.accountType]) return null;
        var ident = String(session.identity || session.userName || session.username || '').trim().toLowerCase();
        if (!ident) return null;
        var blob = users();
        var buckets = session.accountType === 'Retailer'
            ? [['retailers', blob.retailers || []]]
            : [['admins', blob.admins || []], ['staff', blob.staff || []]];
        for (var b = 0; b < buckets.length; b++) {
            var rows = buckets[b][1];
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i] || {};
                var keys = [row.id, row.username, row.name, row.email].map(function (v) { return String(v || '').toLowerCase(); });
                if (keys.indexOf(ident) >= 0) {
                    return {
                        id: slug(row.id || row.username || row.name),
                        name: row.name || row.username || session.userName,
                        role: buckets[b][0] === 'staff' ? 'Staff' : (buckets[b][0] === 'retailers' ? 'Retailer' : roleLabel(row, 'admins'))
                    };
                }
            }
        }
        return { id: slug(ident), name: session.userName || session.identity, role: PORTAL_TYPES[session.accountType] };
    }

    function onPortalPage() {
        return /\/(staff|staff_names|admin|admin_names|head_admin|retailer)\//i.test(location.pathname || '');
    }

    var me = null;

    // "Appear offline" choice, kept on this browser only (not a shared kreezby* key).
    var MODE_KEY = 'kzPresenceMode';
    function appearOffline() {
        try { return localStorage.getItem(MODE_KEY) === 'offline'; } catch (e) { return false; }
    }
    function setAppearOffline(on) {
        try {
            if (on) localStorage.setItem(MODE_KEY, 'offline');
            else localStorage.removeItem(MODE_KEY);
        } catch (e) { /* ignore */ }
        beat(false);
        mountAll();
    }

    function beat(offline) {
        if (!onPortalPage()) return;
        me = currentAccount();
        if (!me) return;
        offline = !!offline || appearOffline() || (typeof navigator !== 'undefined' && navigator.onLine === false);
        try {
            localStorage.setItem(PREFIX + me.id, JSON.stringify({
                id: me.id,
                name: me.name,
                role: me.role,
                lastSeen: Date.now(),
                offline: !!offline
            }));
        } catch (e) { /* storage full or blocked */ }
    }

    function presenceFor(id) {
        return readJson(PREFIX + id, null);
    }

    function isOnline(p) {
        return !!(p && !p.offline && Date.now() - Number(p.lastSeen || 0) < ONLINE_WINDOW_MS);
    }

    function agoLabel(p, short) {
        if (!p || !p.lastSeen) return '';
        var mins = Math.max(1, Math.floor((Date.now() - Number(p.lastSeen)) / 60000));
        var text;
        if (mins < 60) text = mins + (short ? 'm' : (mins === 1 ? ' min' : ' mins'));
        else if (mins < 1440) {
            var h = Math.floor(mins / 60);
            text = h + (short ? 'h' : (h === 1 ? ' hr' : ' hrs'));
        } else {
            var d = Math.floor(mins / 1440);
            text = d + (short ? 'd' : (d === 1 ? ' day' : ' days'));
        }
        return short ? text : 'Offline ' + text + ' ago';
    }

    function initials(name) {
        var parts = String(name || '?').trim().split(/\s+/);
        return ((parts[0] || '?').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
    }

    function avatarColor(name) {
        var palette = ['#0084ff', '#a033ff', '#f02849', '#44bec7', '#ff7e29', '#67b00c'];
        var total = 0;
        var label = String(name || '');
        for (var i = 0; i < label.length; i++) total += label.charCodeAt(i);
        return palette[total % palette.length];
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function people() {
        var myId = me ? me.id : (currentAccount() || {}).id;
        var seen = {};
        var list = [];
        teamAccounts().forEach(function (a) {
            if (seen[a.id] || a.id === myId) return;
            seen[a.id] = 1;
            var p = presenceFor(a.id);
            list.push({ id: a.id, name: a.name, role: a.role, p: p, online: isOnline(p) });
        });
        // Accounts that sent a heartbeat but are not in the account list (e.g. seed data missing).
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (!key || key.indexOf(PREFIX) !== 0) continue;
            var p2 = readJson(key, null);
            if (!p2 || !p2.id || seen[p2.id] || p2.id === myId) continue;
            // The strip lists the Kreezby team only; retailers show up in Chats when they message.
            if (p2.role === 'Retailer') continue;
            seen[p2.id] = 1;
            list.push({ id: p2.id, name: p2.name || p2.id, role: p2.role || 'Staff', p: p2, online: isOnline(p2) });
        }
        list.sort(function (a, b) {
            if (a.online !== b.online) return a.online ? -1 : 1;
            return Number((b.p && b.p.lastSeen) || 0) - Number((a.p && a.p.lastSeen) || 0);
        });
        return list;
    }

    function render(strip) {
        var list = people();
        var onlineCount = list.filter(function (x) { return x.online; }).length;
        var html =
            '<div class="inbox-presence-head">' +
                '<span class="inbox-presence-title">Active</span>' +
                '<span class="inbox-presence-count">' + onlineCount + ' online</span>' +
            '</div>' +
            '<div class="inbox-presence-me-row">' +
                '<button type="button" class="inbox-presence-me' + (appearOffline() ? ' is-hidden' : '') + '" data-presence-toggle' +
                    ' title="' + (appearOffline() ? 'Others see you as offline. Tap to show as online.' : 'Others see you as online. Tap to appear offline.') + '">' +
                    '<span class="inbox-presence-me-dot" aria-hidden="true"></span>' +
                    (appearOffline() ? 'You appear offline' : 'You are online') +
                    '<span class="inbox-presence-me-switch">' + (appearOffline() ? 'Go online' : 'Appear offline') + '</span>' +
                '</button>' +
            '</div>';
        if (!list.length) {
            html += '<p class="inbox-presence-empty">No staff or admin accounts yet.</p>';
        } else {
            html += '<div class="inbox-presence-row" role="list">' + list.map(function (x) {
                var ago = agoLabel(x.p, true);
                var status = x.online ? 'Active now' : (ago ? agoLabel(x.p, false) : 'Offline');
                var first = String(x.name).split(/\s+/)[0];
                return '<button type="button" class="inbox-presence-person' + (x.online ? ' is-online' : ' is-offline') + '" role="listitem"' +
                        ' data-person-id="' + esc(x.id) + '" data-person-name="' + esc(x.name) + '" data-person-role="' + esc(x.role) + '"' +
                        ' title="' + esc('Chat with ' + x.name + ' · ' + x.role + ' · ' + status) + '">' +
                        '<span class="inbox-presence-avatar" style="background:' + avatarColor(x.name) + '">' + esc(initials(x.name)) +
                            (x.online
                                ? '<span class="inbox-presence-dot" aria-hidden="true"></span>'
                                : (ago ? '<span class="inbox-presence-ago">' + esc(ago) + '</span>' : '')) +
                        '</span>' +
                        '<span class="inbox-presence-name">' + esc(first) + '</span>' +
                        '<span class="inbox-presence-meta"><span class="inbox-presence-role is-' + (x.role === 'Staff' ? 'staff' : 'admin') + '">' + esc(x.role) + '</span>' +
                            '<span class="inbox-presence-status">' + esc(x.online ? 'Online' : (ago ? ago + ' ago' : 'Offline')) + '</span></span>' +
                    '</button>';
            }).join('') + '</div>';
        }
        if (strip.__lastHtml !== html) {
            strip.__lastHtml = html;
            strip.innerHTML = html;
        }
    }

    /** Find staff/admin inboxes and make sure each has a strip above the search box. */
    function mountAll() {
        document.querySelectorAll('[data-inbox-role]').forEach(function (root) {
            var role = String(root.getAttribute('data-inbox-role') || '').toLowerCase();
            if (!INBOX_ROLES[role]) return;
            var search = root.querySelector('.inbox-chat-search');
            if (!search) return;
            var strip = root.querySelector('.inbox-presence');
            if (!strip) {
                strip = document.createElement('div');
                strip.className = 'inbox-presence';
                strip.setAttribute('aria-label', 'Online staff and admins');
                search.parentNode.insertBefore(strip, search);
                strip.addEventListener('click', function (event) {
                    if (event.target.closest('[data-presence-toggle]')) {
                        setAppearOffline(!appearOffline());
                        return;
                    }
                    var btn = event.target.closest('.inbox-presence-person');
                    if (!btn) return;
                    var api = root.kreezbyInboxApi;
                    if (api && typeof api.openTeamChat === 'function') {
                        api.openTeamChat({
                            id: btn.getAttribute('data-person-id'),
                            name: btn.getAttribute('data-person-name'),
                            role: btn.getAttribute('data-person-role')
                        });
                    }
                });
            }
            render(strip);
        });
    }

    function ensureStyles() {
        if (!document.getElementById('kreezby-presence-me-style')) {
            var meStyle = document.createElement('style');
            meStyle.id = 'kreezby-presence-me-style';
            meStyle.textContent =
                '.inbox-presence-me-row{margin:2px 0 8px}' +
                '.inbox-presence-me{display:inline-flex;align-items:center;gap:7px;border:1px solid #d1fae5;background:#ecfdf5;color:#065f46;border-radius:999px;padding:4px 6px 4px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}' +
                '.inbox-presence-me-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.25)}' +
                '.inbox-presence-me-switch{margin-left:4px;padding:2px 8px;border-radius:999px;background:#fff;color:#374151;font-weight:600;border:1px solid #e5e7eb}' +
                '.inbox-presence-me.is-hidden{border-color:#e5e7eb;background:#f3f4f6;color:#4b5563}' +
                '.inbox-presence-me.is-hidden .inbox-presence-me-dot{background:#9ca3af;box-shadow:none}';
            (document.head || document.documentElement).appendChild(meStyle);
        }
        if (document.getElementById('kreezby-presence-style')) return;
        var src = '';
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var s = scripts[i].getAttribute('src') || '';
            var at = s.indexOf('js/kreezby-presence.js');
            if (at !== -1) { src = s.slice(0, at); break; }
        }
        var link = document.createElement('link');
        link.id = 'kreezby-presence-style';
        link.rel = 'stylesheet';
        link.href = src + 'css/shared/inbox-presence.css?v=20261022a';
        (document.head || document.documentElement).appendChild(link);
    }

    var mountQueued = false;
    function queueMount() {
        if (mountQueued) return;
        mountQueued = true;
        setTimeout(function () { mountQueued = false; mountAll(); }, 120);
    }

    function start() {
        ensureStyles();
        beat(false);
        mountAll();
        setInterval(function () { beat(false); }, HEARTBEAT_MS);
        setInterval(mountAll, 15000);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { beat(false); mountAll(); }
        });
        // Wi-Fi / data dropped or came back: update straight away.
        window.addEventListener('online', function () { beat(false); mountAll(); });
        window.addEventListener('offline', function () { mountAll(); });
        document.addEventListener('kreezby:remote-state', queueMount);
        document.addEventListener('turbo:frame-load', queueMount);
        window.addEventListener('storage', function (e) {
            if (e.key && e.key.indexOf(PREFIX) === 0) queueMount();
        });
        // Logging out marks the account offline straight away.
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href*="log_in"]');
            if (a) beat(true);
        }, true);
        if (window.MutationObserver && document.body) {
            new MutationObserver(function (records) {
                for (var i = 0; i < records.length; i++) {
                    var nodes = records[i].addedNodes;
                    for (var j = 0; j < nodes.length; j++) {
                        var n = nodes[j];
                        if (n.nodeType === 1 && (n.matches('.inbox-chat-search, [data-inbox-role]') || n.querySelector('.inbox-chat-search'))) {
                            queueMount();
                            return;
                        }
                    }
                }
            }).observe(document.body, { childList: true, subtree: true });
        }
    }

    /* ---------- Team chat (staff <-> admin direct messages) ----------
       Each sender owns one key per recipient: kreezbyTeamChat_<from>__<to>
       = { from, to, fromName, fromRole, messages: [{ text, at }] }.
       Two people never write the same key, so syncing can't drop messages. */
    var CHAT_PREFIX = 'kreezbyTeamChat_';
    var MAX_STORED = 200;

    function chatKey(from, to) { return CHAT_PREFIX + from + '__' + to; }

    function myId() {
        var acct = currentAccount();
        return acct ? acct.id : '';
    }

    function readBox(from, to) {
        var box = readJson(chatKey(from, to), null);
        return box && Array.isArray(box.messages) ? box : null;
    }

    function threadWith(peer) {
        var me2 = myId();
        if (!me2 || !peer) return [];
        var list = [];
        var mine = readBox(me2, peer);
        var theirs = readBox(peer, me2);
        if (mine) mine.messages.forEach(function (m) { list.push({ from: me2, text: m.text, at: Number(m.at) || 0 }); });
        if (theirs) theirs.messages.forEach(function (m) { list.push({ from: peer, text: m.text, at: Number(m.at) || 0 }); });
        list.sort(function (a, b) { return a.at - b.at; });
        return list;
    }

    function personInfo(id) {
        var found = null;
        teamAccounts().forEach(function (a) { if (a.id === id) found = a; });
        if (found) return found;
        var p = presenceFor(id);
        if (p) return { id: id, name: p.name || id, role: p.role || 'Staff' };
        var box = readBox(id, myId());
        if (box) return { id: id, name: box.fromName || id, role: box.fromRole || 'Staff' };
        return { id: id, name: id, role: 'Staff' };
    }

    function conversations() {
        var me2 = myId();
        if (!me2) return [];
        var peers = {};
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (!key || key.indexOf(CHAT_PREFIX) !== 0) continue;
            var pair = key.slice(CHAT_PREFIX.length).split('__');
            if (pair.length !== 2) continue;
            if (pair[0] === me2 && pair[1] !== me2) peers[pair[1]] = 1;
            else if (pair[1] === me2 && pair[0] !== me2) peers[pair[0]] = 1;
        }
        return Object.keys(peers).map(function (peer) {
            var thread = threadWith(peer);
            var info = personInfo(peer);
            return {
                peer: peer,
                name: info.name,
                role: info.role,
                messages: thread,
                last: thread.length ? thread[thread.length - 1] : null
            };
        }).filter(function (c) { return c.last; });
    }

    function send(peer, text) {
        var acct = currentAccount();
        if (!acct || !peer || !text) return false;
        var box = readBox(acct.id, peer) || { from: acct.id, to: peer, messages: [] };
        box.fromName = acct.name;
        box.fromRole = acct.role;
        box.messages.push({ text: String(text), at: Date.now() });
        if (box.messages.length > MAX_STORED) box.messages = box.messages.slice(-MAX_STORED);
        try {
            localStorage.setItem(chatKey(acct.id, peer), JSON.stringify(box));
            return true;
        } catch (e) {
            return false;
        }
    }

    window.KreezbyTeamChat = {
        me: currentAccount,
        thread: threadWith,
        conversations: conversations,
        send: send,
        person: personInfo,
        isOnline: function (id) { return isOnline(presenceFor(id)); },
        statusText: function (id) {
            var p = presenceFor(id);
            if (isOnline(p)) return 'Active now';
            var ago = agoLabel(p, false);
            return ago || 'Offline';
        }
    };

    window.KreezbyPresence = { refresh: mountAll, beat: beat };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
