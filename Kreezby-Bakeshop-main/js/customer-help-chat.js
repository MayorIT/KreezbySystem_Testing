/**
 * Customer Help Center inbox.
 * Joins a shared line that Head Admin, Admin, and Staff assist from their inboxes.
 */
(function () {
    'use strict';

    var threadEl;
    var inputEl;
    var endBtn;
    var queueEl;
    var numberEl;
    var detailEl;
    var statusEl;
    var dotEl;
    var lastMessageSig = '';
    var closedNote = '';

    function api() {
        return window.KreezbyHelpQueue;
    }

    function ticket() {
        var queue = api();
        return queue ? queue.ticketForCustomer() : null;
    }

    function setStatus(text, mode) {
        if (statusEl) statusEl.textContent = text;
        if (dotEl) {
            dotEl.classList.toggle('is-wait', mode === 'wait');
            dotEl.classList.toggle('is-live', mode === 'live');
            dotEl.classList.toggle('is-idle', mode === 'idle');
        }
    }

    function paintQueue(current) {
        var queue = api();
        if (!queueEl || !queue) return;
        if (!current || current.status === 'closed') {
            queueEl.hidden = true;
            setStatus('Send a message to join the line', 'idle');
            if (endBtn) endBtn.hidden = true;
            return;
        }
        queueEl.hidden = false;
        if (endBtn) endBtn.hidden = false;
        var labelEl = queueEl.querySelector('.help-queue__label');
        if (current.status === 'waiting') {
            var spot = queue.position(current.id) || { line: 1, ahead: 0, total: 1 };
            queueEl.classList.remove('is-live');
            if (labelEl) labelEl.textContent = 'Your place in line';
            if (numberEl) numberEl.textContent = String(spot.line);
            if (detailEl) {
                var waitingCopy = spot.total === 1
                    ? '1 customer is waiting in line.'
                    : (spot.total + ' customers are waiting in line.');
                var lineCopy = spot.ahead === 0
                    ? 'You are number 1.'
                    : ('You are number ' + spot.line + '. ' + spot.ahead + (spot.ahead === 1 ? ' customer is' : ' customers are') + ' ahead of you.');
                detailEl.textContent = waitingCopy + ' ' + lineCopy + ' Someone will respond to your message.';
            }
            setStatus(spot.total === 1 ? '1 customer waiting' : (spot.total + ' customers waiting'), 'wait');
            return;
        }
        queueEl.classList.add('is-live');
        if (labelEl) labelEl.textContent = 'Live help';
        if (numberEl) numberEl.textContent = 'Connected';
        if (detailEl) detailEl.textContent = 'Someone will respond to your message.';
        setStatus('Someone will respond', 'live');
    }

    function renderThread(current) {
        if (!threadEl) return;
        var sig = current ? (current.id + ':' + current.status + ':' + current.updatedAt) : 'none';
        if (sig === lastMessageSig) return;
        lastMessageSig = sig;
        threadEl.innerHTML = '';
        if (!current) {
            if (closedNote) {
                var ended = document.createElement('p');
                ended.className = 'help-note';
                ended.textContent = closedNote;
                threadEl.appendChild(ended);
            }
            threadEl.appendChild(bubble('bot', 'Describe your concern and you will join the help line. Your number shows how many customers are waiting ahead of you. Someone will respond to your message.'));
            return;
        }
        closedNote = '';
        (current.messages || []).forEach(function (message) {
            if (message.from === 'system') {
                var note = document.createElement('p');
                note.className = 'help-note';
                note.textContent = message.text;
                threadEl.appendChild(note);
                return;
            }
            var mine = message.from === 'customer';
            threadEl.appendChild(bubble(mine ? 'user' : 'bot', message.text, message.time, ''));
        });
        threadEl.scrollTop = threadEl.scrollHeight;
    }

    function bubble(kind, text, time, sender) {
        var row = document.createElement('div');
        row.className = 'help-msg' + (kind === 'user' ? ' help-msg--user' : ' help-msg--bot');
        if (kind !== 'user') {
            var avatar = document.createElement('div');
            avatar.className = 'help-msg__avatar';
            avatar.textContent = 'K';
            row.appendChild(avatar);
        }
        var box = document.createElement('div');
        box.className = 'help-bubble';
        if (sender) {
            var who = document.createElement('p');
            who.className = 'help-bubble__who';
            who.textContent = sender;
            box.appendChild(who);
        }
        var body = document.createElement('p');
        body.className = 'help-bubble__text';
        body.textContent = text;
        box.appendChild(body);
        if (time) {
            var stamp = document.createElement('span');
            stamp.className = 'help-bubble__time';
            stamp.textContent = time;
            box.appendChild(stamp);
        }
        row.appendChild(box);
        return row;
    }

    function paint() {
        var current = ticket();
        paintQueue(current);
        renderThread(current);
    }

    function send(event) {
        if (event) event.preventDefault();
        var queue = api();
        if (!queue || !inputEl) return;
        var text = inputEl.value;
        if (!String(text || '').trim()) return;
        inputEl.value = '';
        lastMessageSig = '';
        queue.customerSend(text);
        paint();
        inputEl.focus();
    }

    function endChat() {
        var queue = api();
        var current = ticket();
        if (!queue || !current) return;
        closedNote = 'This chat has ended. Send a new message if you still need help.';
        lastMessageSig = '';
        queue.closeTicket(current.id);
        paint();
    }

    function init() {
        threadEl = document.getElementById('help-bot-thread');
        inputEl = document.getElementById('help-bot-input');
        endBtn = document.getElementById('help-end');
        queueEl = document.getElementById('help-queue');
        numberEl = document.getElementById('help-queue-number');
        detailEl = document.getElementById('help-queue-detail');
        statusEl = document.getElementById('help-status-text');
        dotEl = document.getElementById('help-status-dot');
        var form = document.getElementById('help-bot-form');
        if (!threadEl || !form || !api()) return;
        form.addEventListener('submit', send);
        if (endBtn) endBtn.addEventListener('click', endChat);
        api().subscribe(paint);
        paint();
        window.setInterval(paint, 2000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
