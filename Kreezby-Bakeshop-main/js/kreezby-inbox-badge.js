/**
 * Inbox unread counter for the head admin, admin and staff menus.
 *
 * The number on the Inbox menu item is the number of chats that still have messages nobody
 * on this account has read: customer help chats (Help Center tickets that are waiting, or that
 * this account is handling) plus retailer and team chats. It goes down as each chat is opened,
 * and comes back when a new message arrives, on every page, without refreshing.
 */
(function () {
    'use strict';

    if (window.KreezbyInboxBadge) return;

    var path = String(location.pathname || '').replace(/\\/g, '/');
    var portal = path.match(/^(.*\/)(head_admin|admin|admin_names|staff|staff_names)\//i);
    if (!portal) return;
    var jsBase = portal[1] + 'js/';

    function loadScript(id, src) {
        if (document.getElementById(id)) return;
        var s = document.createElement('script');
        s.id = id;
        s.src = src;
        s.onload = paint;
        (document.head || document.documentElement).appendChild(s);
    }

    // Help Center tickets live in kreezby-help-queue; load its reader on pages that do not have it.
    function ensureHelpQueue() {
        if (window.KreezbyHelpQueue) return;
        if (document.querySelector('script[src*="help-queue.js"]')) return;
        loadScript('kreezby-help-queue-badge-script', jsBase + 'help-queue.js?v=20261117read');
    }

    function teamReadAt(meId, peer) {
        try { return Number(localStorage.getItem('kzTeamRead:' + meId + ':' + peer)) || 0; } catch (e) { return 0; }
    }

    function isRetailer(role) { return /retail|wholesal/i.test(String(role || '')); }

    // { customers, retailers, team, total } — unread chats in each group.
    function counts() {
        var out = { customers: 0, retailers: 0, team: 0, total: 0 };
        var queue = window.KreezbyHelpQueue;
        if (queue && typeof queue.listForAgents === 'function') {
            var me = typeof queue.agentProfile === 'function' ? queue.agentProfile() : null;
            queue.listForAgents().forEach(function (ticket) {
                if (!ticket || ticket.status === 'closed') return;
                var mine = ticket.agent && me && ticket.agent.id === me.id;
                if (ticket.status === 'active' && !mine) return; // another agent is handling it
                if (queue.isUnread(ticket)) out.customers += 1;
            });
        }
        var team = window.KreezbyTeamChat;
        var meAcct = team && typeof team.me === 'function' ? team.me() : null;
        if (team && meAcct && typeof team.conversations === 'function') {
            team.conversations().forEach(function (conv) {
                var last = conv.last;
                if (!last || last.from === meAcct.id) return;
                if (last.at <= teamReadAt(meAcct.id, conv.peer)) return;
                if (isRetailer(conv.role)) out.retailers += 1;
                else out.team += 1;
            });
        }
        out.total = out.customers + out.retailers + out.team;
        return out;
    }

    function inboxLinks() {
        return Array.prototype.filter.call(document.querySelectorAll('a.kreezby-sidebar-nav-item'), function (a) {
            var file = String(a.getAttribute('href') || '').split('?')[0].split('#')[0].split('/').pop();
            return /^inbox-(admin|headadmin|staff)(-\d+)?\.html$/i.test(file);
        });
    }

    var lastText = '';
    function paint() {
        var c = counts();
        var label = c.total > 99 ? '99+' : String(c.total);
        var title = c.total
            ? c.total + (c.total === 1 ? ' unread chat' : ' unread chats') + ' (customers ' + c.customers + ', retailers ' + c.retailers + ', team ' + c.team + ')'
            : 'No unread chats';
        inboxLinks().forEach(function (link) {
            var badge = link.querySelector('[data-inbox-unread]');
            if (!badge) {
                // The general activity badge is replaced by the real unread count.
                var old = link.querySelector('.kreezby-sidebar-notification-badge');
                if (old) old.parentNode.removeChild(old);
                badge = document.createElement('span');
                badge.className = 'kreezby-sidebar-notification-badge kz-inbox-unread-badge';
                badge.setAttribute('data-inbox-unread', '');
                var labelEl = link.querySelector('.kreezby-sidebar-nav-label');
                if (labelEl && labelEl.nextSibling) link.insertBefore(badge, labelEl.nextSibling);
                else link.appendChild(badge);
            }
            badge.textContent = label;
            badge.hidden = !c.total;
            badge.title = title;
            badge.setAttribute('aria-label', title);
        });
        var text = label + '|' + c.customers + '|' + c.retailers + '|' + c.team;
        if (text !== lastText) {
            lastText = text;
            try { document.dispatchEvent(new CustomEvent('kreezby:inbox-unread', { detail: c })); } catch (e) { /* optional */ }
        }
    }

    function injectStyle() {
        if (document.getElementById('kz-inbox-badge-style')) return;
        var st = document.createElement('style');
        st.id = 'kz-inbox-badge-style';
        // Same look as the other menu badges; make sure it shows on the staff menu too.
        st.textContent = '.kz-inbox-unread-badge{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;margin-left:auto;border-radius:999px;background:#e53935;color:#fff;font-size:11px;font-weight:800;line-height:1;box-sizing:border-box;flex-shrink:0;}'
            + '.kz-inbox-unread-badge[hidden]{display:none!important;}'
            + 'body.sidebar-collapsed .kz-inbox-unread-badge{position:absolute;top:4px;right:4px;min-width:18px;height:18px;padding:0 5px;font-size:10px;margin:0;}'
            + 'body.sidebar-collapsed a.kreezby-sidebar-nav-item{position:relative;}';
        (document.head || document.documentElement).appendChild(st);
    }

    function start() {
        injectStyle();
        ensureHelpQueue();
        paint();
        ['kreezby:remote-state', 'kreezby:help-queue', 'kreezby:inbox-read',
         'kreezby-admin-sidebar-ready', 'kreezby-staff-sidebar-ready', 'kreezby-portal-sidebar-ready',
         'turbo:frame-load', 'kreezby:page-load'].forEach(function (name) {
            document.addEventListener(name, function () { setTimeout(paint, 0); });
        });
        window.addEventListener('storage', function (e) {
            if (!e.key || /^(kreezbyTeamChat_|kreezbyHelpQueue|kzTeamRead:|kzHelpSeen:)/.test(e.key)) paint();
        });
        // The sidebar is rebuilt on some pages; keep the badge on it.
        if (window.MutationObserver) {
            var aside = null;
            var mo = new MutationObserver(function () {
                if (inboxLinks().some(function (a) { return !a.querySelector('[data-inbox-unread]'); })) paint();
            });
            (function watch() {
                var next = document.querySelector('aside.dark-sidebar-panel, aside.sidebar-panel');
                if (next && next !== aside) {
                    aside = next;
                    mo.disconnect();
                    mo.observe(aside, { childList: true, subtree: true });
                }
                setTimeout(watch, 1500);
            })();
        }
        setInterval(paint, 4000);
    }

    window.KreezbyInboxBadge = { counts: counts, refresh: paint };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
