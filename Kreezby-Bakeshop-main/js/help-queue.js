/**
 * Shared Help Center queue.
 * Customers wait in line. Head Admin, Admin, and Staff see the same tickets.
 */
(function () {
    'use strict';

    var KEY = 'kreezbyHelpQueueV1';
    var SEEN_KEY = 'kreezbyHelpSeen';
    var TAB_KEY = 'kreezbyHelpTabId';

    function readJson(storage, key, fallback) {
        try {
            var parsed = JSON.parse(storage.getItem(key) || '');
            return parsed == null ? fallback : parsed;
        } catch (err) {
            return fallback;
        }
    }

    function timeLabel(date) {
        return (date || new Date()).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
    }

    function uid() {
        return 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function load() {
        var state = readJson(localStorage, KEY, null);
        if (!state || !Array.isArray(state.tickets)) state = { tickets: [] };
        return state;
    }

    function save(state) {
        var open = [];
        var closed = [];
        (state.tickets || []).forEach(function (ticket) {
            if (!ticket || !ticket.id) return;
            if (ticket.messages && ticket.messages.length > 100) {
                ticket.messages = ticket.messages.slice(-100);
            }
            if (ticket.status === 'closed') closed.push(ticket);
            else open.push(ticket);
        });
        closed.sort(function (a, b) { return (a.updatedAt || 0) - (b.updatedAt || 0); });
        if (closed.length > 20) closed = closed.slice(-20);
        state.tickets = open.concat(closed);
        localStorage.setItem(KEY, JSON.stringify(state));
        try {
            document.dispatchEvent(new CustomEvent('kreezby:help-queue'));
        } catch (err) { /* listeners are optional */ }
    }

    function find(state, id) {
        var tickets = state.tickets || [];
        for (var i = 0; i < tickets.length; i++) {
            if (tickets[i].id === id) return tickets[i];
        }
        return null;
    }

    function sessionInfo() {
        return readJson(localStorage, 'kreezby_session', {}) || {};
    }

    function customerIdentity() {
        var session = sessionInfo();
        var profile = readJson(localStorage, 'kreezbyCustomerProfile', {}) || {};
        if (session.accountType === 'Customer' && (session.identity || session.userName)) {
            var accountName = String(session.userName || profile.fullName || 'Customer').trim() || 'Customer';
            return {
                id: 'cust:' + String(session.identity || session.userName),
                name: accountName
            };
        }
        var tabId = '';
        try { tabId = sessionStorage.getItem(TAB_KEY) || ''; } catch (err) { tabId = ''; }
        if (!tabId) {
            tabId = 'guest-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            try { sessionStorage.setItem(TAB_KEY, tabId); } catch (err2) { /* ignore */ }
        }
        var named = String(profile.fullName || '').trim();
        if (!named) {
            var tail = String(tabId).replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
            named = 'Customer ' + tail;
        }
        return { id: tabId, name: named };
    }

    function agentProfile() {
        var path = String(location.pathname || '').replace(/\\/g, '/').toLowerCase();
        var role = 'staff';
        var title = 'Kreezby';
        if (path.indexOf('/head_admin/') >= 0) {
            role = 'head_admin';
        } else if (path.indexOf('/admin/') >= 0) {
            role = 'admin';
        }
        var session = sessionInfo();
        var name = String(session.userName || title).trim() || title;
        return {
            id: role + ':' + name.toLowerCase(),
            role: role,
            title: title,
            name: name
        };
    }

    function waitingTickets(state) {
        return (state || load()).tickets.filter(function (ticket) {
            return ticket && ticket.status === 'waiting';
        }).sort(function (a, b) {
            return (a.createdAt || 0) - (b.createdAt || 0);
        });
    }

    function position(ticketId, state) {
        var line = waitingTickets(state);
        for (var i = 0; i < line.length; i++) {
            if (line[i].id === ticketId) {
                return { line: i + 1, ahead: i, total: line.length };
            }
        }
        return null;
    }

    function ticketForCustomer(identity) {
        var who = identity || customerIdentity();
        var tickets = load().tickets.filter(function (ticket) {
            return ticket && ticket.customerId === who.id && ticket.status !== 'closed';
        });
        tickets.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        return tickets[0] || null;
    }

    function listForAgents() {
        return load().tickets.filter(function (ticket) {
            return ticket && (ticket.status === 'waiting' || ticket.status === 'active' || ticket.status === 'closed');
        }).sort(function (a, b) {
            var rank = { waiting: 0, active: 1, closed: 2 };
            var ar = rank[a.status] == null ? 3 : rank[a.status];
            var br = rank[b.status] == null ? 3 : rank[b.status];
            if (ar !== br) return ar - br;
            return (a.createdAt || 0) - (b.createdAt || 0);
        });
    }

    function seenMap() {
        return readJson(sessionStorage, SEEN_KEY, {}) || {};
    }

    function isUnread(ticket) {
        if (!ticket) return false;
        var seen = Number(seenMap()[ticket.id] || 0);
        var latest = 0;
        (ticket.messages || []).forEach(function (message) {
            if (message.from === 'customer' && Number(message.at || 0) > latest) latest = Number(message.at);
        });
        return latest > seen;
    }

    function markSeen(ticketId) {
        var ticket = find(load(), ticketId);
        var map = seenMap();
        map[ticketId] = ticket ? Number(ticket.updatedAt || Date.now()) : Date.now();
        try { sessionStorage.setItem(SEEN_KEY, JSON.stringify(map)); } catch (err) { /* ignore */ }
    }

    function pushMessage(ticket, message) {
        ticket.messages = ticket.messages || [];
        ticket.messages.push(message);
        ticket.updatedAt = message.at;
    }

    function customerSend(text) {
        var body = String(text || '').trim().slice(0, 1000);
        if (!body) return null;
        var state = load();
        var who = customerIdentity();
        var ticket = null;
        for (var i = 0; i < state.tickets.length; i++) {
            var item = state.tickets[i];
            if (item.customerId === who.id && item.status !== 'closed') ticket = item;
        }
        var now = Date.now();
        if (!ticket) {
            ticket = {
                id: 'help-' + now.toString(36) + Math.random().toString(36).slice(2, 6),
                customerId: who.id,
                customerName: who.name,
                status: 'waiting',
                createdAt: now,
                updatedAt: now,
                agent: null,
                messages: []
            };
            pushMessage(ticket, {
                id: uid(),
                from: 'system',
                text: 'You joined the help line. Someone will respond to your message.',
                time: timeLabel(),
                at: now
            });
            state.tickets.push(ticket);
        }
        pushMessage(ticket, {
            id: uid(),
            from: 'customer',
            text: body,
            time: timeLabel(),
            at: Date.now(),
            senderName: who.name
        });
        save(state);
        return find(load(), ticket.id);
    }

    function accept(ticketId) {
        var state = load();
        var ticket = find(state, ticketId);
        if (!ticket || ticket.status === 'closed') return ticket;
        if (ticket.status === 'active') return ticket;
        var agent = agentProfile();
        var now = Date.now();
        ticket.status = 'active';
        ticket.agent = agent;
        ticket.acceptedAt = now;
        pushMessage(ticket, {
            id: uid(),
            from: 'system',
            text: 'Someone will respond to your message.',
            time: timeLabel(),
            at: now
        });
        save(state);
        return find(load(), ticket.id);
    }

    function agentReply(ticketId, text) {
        var body = String(text || '').trim().slice(0, 1000);
        if (!body) return null;
        var state = load();
        var ticket = find(state, ticketId);
        if (!ticket || ticket.status === 'closed') return null;
        var agent = agentProfile();
        if (ticket.status === 'active' && ticket.agent && ticket.agent.id !== agent.id) return null;
        var now = Date.now();
        if (ticket.status === 'waiting') {
            ticket.status = 'active';
            ticket.agent = agent;
            ticket.acceptedAt = now;
            pushMessage(ticket, {
                id: uid(),
                from: 'system',
                text: 'Someone will respond to your message.',
                time: timeLabel(),
                at: now
            });
        }
        pushMessage(ticket, {
            id: uid(),
            from: 'agent',
            text: body,
            time: timeLabel(),
            at: Date.now(),
            senderName: agent.name,
            senderTitle: agent.title,
            agentId: agent.id
        });
        save(state);
        return find(load(), ticket.id);
    }

    function closeTicket(ticketId) {
        var state = load();
        var ticket = find(state, ticketId);
        if (!ticket || ticket.status === 'closed') return ticket;
        var now = Date.now();
        ticket.status = 'closed';
        pushMessage(ticket, {
            id: uid(),
            from: 'system',
            text: 'This chat has ended. Send a new message if you still need help.',
            time: timeLabel(),
            at: now
        });
        save(state);
        return find(load(), ticket.id);
    }

    function toAgentMessages(ticket, agent) {
        var me = agent || agentProfile();
        return (ticket.messages || []).filter(function (message) {
            return message.from !== 'system';
        }).map(function (message) {
            if (message.from === 'agent' && message.agentId === me.id) {
                return { type: 'outgoing', text: message.text, time: message.time };
            }
            if (message.from === 'agent') {
                var who = message.senderName || 'Agent';
                if (message.senderTitle) who += ' (' + message.senderTitle + ')';
                return { type: 'incoming', text: who + ': ' + message.text, time: message.time };
            }
            return { type: 'incoming', text: message.text, time: message.time };
        });
    }

    function subscribe(fn) {
        if (typeof fn !== 'function') return;
        document.addEventListener('kreezby:help-queue', fn);
        window.addEventListener('storage', function (event) {
            if (event.key === KEY) fn();
        });
        document.addEventListener('kreezby:remote-state', function (event) {
            var keys = (event.detail && event.detail.keys) || [];
            if (keys.indexOf(KEY) >= 0) fn();
        });
    }

    window.KreezbyHelpQueue = {
        KEY: KEY,
        load: load,
        customerIdentity: customerIdentity,
        agentProfile: agentProfile,
        waitingTickets: waitingTickets,
        position: position,
        ticketForCustomer: ticketForCustomer,
        listForAgents: listForAgents,
        isUnread: isUnread,
        markSeen: markSeen,
        customerSend: customerSend,
        accept: accept,
        agentReply: agentReply,
        closeTicket: closeTicket,
        toAgentMessages: toAgentMessages,
        get: function (id) { return find(load(), id); },
        subscribe: subscribe
    };
})();
