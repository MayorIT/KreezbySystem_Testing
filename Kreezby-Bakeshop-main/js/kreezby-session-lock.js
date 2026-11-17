/**
 * Session lock for the head admin, admin, staff and retailer portals.
 *
 * If a signed-in computer is left open, nobody else can use the account:
 *  - After 5 minutes with no mouse, keyboard, touch or scroll activity the page locks.
 *    The page is covered and blurred, and it opens again only with this account's password
 *    (checked by the server, POST /api/unlock-session).
 *  - "Lock screen" in the account menu locks it right away.
 *  - The lock covers every open tab of the site, and it stays after a refresh or a new tab.
 *  - 5 wrong passwords, or 30 minutes locked, end the sign-in (log out).
 *  - A computer that was asleep or closed longer than that is logged out when it is opened.
 * Locks, unlocks, wrong passwords and automatic log outs are kept in the security_log collection.
 */
(function () {
    'use strict';

    if (window.KreezbySessionLock) return;

    var IDLE_LOCK_MS = 5 * 60 * 1000;       // lock after 5 minutes without activity
    var LOCKED_LOGOUT_MS = 30 * 60 * 1000;  // log out after 30 minutes locked
    var MAX_TRIES = 5;
    var STATE_KEY = 'kzSessionLock';        // this browser only (not shared with other devices)
    var ACTIVITY_WRITE_MS = 10 * 1000;

    var path = String(location.pathname || '').replace(/\\/g, '/');
    var portal = path.match(/^(.*\/)(head_admin|admin|admin_names|staff|staff_names|retailer)\//i);
    if (!portal) return;
    var loginHref = portal[1] + 'auth/log_in.html';
    var logoHref = portal[1] + 'assets/logo/kreezby-logo.png';

    function session() {
        try { return JSON.parse(localStorage.getItem('kreezby_session') || 'null'); } catch (e) { return null; }
    }
    function token() { var s = session(); return s && s.token ? String(s.token) : ''; }
    // A short tag of the sign-in, so a new log in never inherits an old lock.
    function sessionTag() {
        var t = token();
        if (t) return t.slice(-16);
        var s = session();
        return s ? String(s.identity || s.userName || s.email || s.id || '') : '';
    }
    function accountName() {
        var s = session() || {};
        return String(s.displayName || s.name || s.userName || s.identity || s.username || '').trim();
    }

    function readState() {
        var st = null;
        try { st = JSON.parse(localStorage.getItem(STATE_KEY) || 'null'); } catch (e) { st = null; }
        if (!st || st.tag !== sessionTag()) st = { tag: sessionTag(), lastActive: Date.now(), locked: false, lockedAt: 0, tries: 0 };
        return st;
    }
    function writeState(st) {
        st.tag = sessionTag();
        try { localStorage.setItem(STATE_KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ }
    }

    function report(event, extra) {
        var t = token();
        if (!t || !window.fetch) return;
        try {
            fetch('/api/security-event', {
                method: 'POST',
                credentials: 'same-origin',
                keepalive: true,
                headers: { 'Content-Type': 'application/json', 'X-Kreezby-Token': t },
                body: JSON.stringify(Object.assign({ event: event }, extra || {}))
            }).catch(function () { /* the lock still works without the log */ });
        } catch (e) { /* ignore */ }
    }

    // ---------- Look ----------
    function injectStyle() {
        if (document.getElementById('kz-lock-style')) return;
        var css = document.createElement('style');
        css.id = 'kz-lock-style';
        css.textContent = ''
            + 'html.kz-locked,html.kz-locked body{overflow:hidden!important;}'
            + 'html.kz-locked body>*:not(#kz-lock){filter:blur(14px)!important;pointer-events:none!important;user-select:none!important;}'
            + '#kz-lock{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;'
            + 'background:rgba(43,30,26,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:inherit;}'
            + '#kz-lock[hidden]{display:none!important;}'
            + '#kz-lock .kzl-card{width:min(400px,100%);background:#fffaf4;border-radius:20px;padding:28px 26px 22px;box-shadow:0 24px 60px rgba(0,0,0,.35);color:#3d2c2a;text-align:center;}'
            + '#kz-lock .kzl-logo{height:34px;margin:0 auto 14px;display:block;}'
            + '#kz-lock .kzl-icon{width:54px;height:54px;margin:0 auto 12px;border-radius:50%;background:#ffca28;display:grid;place-items:center;}'
            + '#kz-lock .kzl-icon svg{width:26px;height:26px;stroke:#3d2c2a;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}'
            + '#kz-lock h2{margin:0 0 6px;font-size:20px;line-height:1.25;color:#3d2c2a;}'
            + '#kz-lock .kzl-who{margin:0 0 4px;font-weight:700;color:#5d4037;font-size:14px;overflow-wrap:anywhere;}'
            + '#kz-lock .kzl-lead{margin:0 0 18px;color:#7d726c;font-size:13px;line-height:1.5;}'
            + '#kz-lock form{display:flex;flex-direction:column;gap:10px;text-align:left;}'
            + '#kz-lock label{font-size:12px;font-weight:700;color:#5d4037;letter-spacing:.03em;text-transform:uppercase;}'
            + '#kz-lock .kzl-pass{position:relative;}'
            + '#kz-lock .kzl-pass input{width:100%;box-sizing:border-box;height:46px;padding:0 74px 0 14px;border:1px solid #d7ccc8;border-radius:12px;font:inherit;font-size:16px;background:#fff;color:#2b241f;}'
            + '#kz-lock .kzl-pass input:focus{outline:2px solid #ffca28;border-color:#ffca28;}'
            + '#kz-lock .kzl-show{position:absolute;right:6px;top:50%;transform:translateY(-50%);height:34px;padding:0 12px;border:0;border-radius:9px;background:#f5ede6;color:#5d4037;font:inherit;font-size:12px;font-weight:700;cursor:pointer;}'
            + '#kz-lock .kzl-error{min-height:18px;margin:0;font-size:13px;font-weight:600;color:#c62828;}'
            + '#kz-lock .kzl-unlock{height:46px;border:0;border-radius:12px;background:#3d2c2a;color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer;}'
            + '#kz-lock .kzl-unlock[disabled]{opacity:.6;cursor:wait;}'
            + '#kz-lock .kzl-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid #efe6df;font-size:12px;color:#8d6e63;text-align:left;}'
            + '#kz-lock .kzl-logout{border:1px solid #d7ccc8;background:#fff;color:#5d4037;border-radius:999px;padding:7px 14px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;}'
            + '.kz-lock-menu-item{cursor:pointer;}';
        (document.head || document.documentElement).appendChild(css);
    }

    var overlay = null;
    var countdownTimer = null;

    function buildOverlay() {
        if (overlay && document.body && document.body.contains(overlay)) return overlay;
        injectStyle();
        overlay = document.createElement('div');
        overlay.id = 'kz-lock';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'kzl-title');
        overlay.hidden = true;
        overlay.innerHTML = ''
            + '<div class="kzl-card">'
            + '<img class="kzl-logo" src="' + logoHref + '" alt="Kreezby">'
            + '<div class="kzl-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>'
            + '<h2 id="kzl-title">This screen is locked</h2>'
            + '<p class="kzl-who" data-kzl-who></p>'
            + '<p class="kzl-lead" data-kzl-lead>For your security the system locked itself. Enter your password to continue.</p>'
            + '<form autocomplete="off" novalidate>'
            + '<label for="kzl-password">Password</label>'
            + '<div class="kzl-pass"><input id="kzl-password" type="password" autocomplete="current-password" required>'
            + '<button type="button" class="kzl-show" data-kzl-show>Show</button></div>'
            + '<p class="kzl-error" data-kzl-error role="alert"></p>'
            + '<button type="submit" class="kzl-unlock" data-kzl-unlock>Unlock</button>'
            + '</form>'
            + '<div class="kzl-foot"><span data-kzl-count></span><button type="button" class="kzl-logout" data-kzl-logout>Not you? Log out</button></div>'
            + '</div>';
        document.body.appendChild(overlay);

        var form = overlay.querySelector('form');
        var input = overlay.querySelector('#kzl-password');
        overlay.querySelector('[data-kzl-show]').addEventListener('click', function () {
            var show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            this.textContent = show ? 'Hide' : 'Show';
            input.focus();
        });
        overlay.querySelector('[data-kzl-logout]').addEventListener('click', function () {
            report('logout_from_lock');
            endSession();
        });
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            tryUnlock(input.value);
        });
        // Keep keyboard focus inside the lock.
        overlay.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab') return;
            var items = Array.prototype.filter.call(overlay.querySelectorAll('input,button'), function (n) { return !n.disabled; });
            if (!items.length) return;
            var first = items[0], last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
        return overlay;
    }

    function setError(text) {
        var el = overlay && overlay.querySelector('[data-kzl-error]');
        if (el) el.textContent = text || '';
    }

    function paintCountdown() {
        var st = readState();
        var el = overlay && overlay.querySelector('[data-kzl-count]');
        if (!el || !st.locked) return;
        var left = Math.max(0, LOCKED_LOGOUT_MS - (Date.now() - (st.lockedAt || Date.now())));
        if (left <= 0) {
            report('auto_logout', { minutesIdle: Math.round((Date.now() - st.lastActive) / 60000) });
            endSession();
            return;
        }
        var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
        el.textContent = 'Logs out in ' + m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Other parts of the page cannot be reached with the keyboard or a screen reader while locked.
    function setInert(on) {
        if (!document.body) return;
        Array.prototype.forEach.call(document.body.children, function (node) {
            if (node.id === 'kz-lock') return;
            if (on) {
                if (!node.hasAttribute('inert')) { node.setAttribute('inert', ''); node.setAttribute('data-kz-inert', '1'); }
            } else if (node.getAttribute('data-kz-inert') === '1') {
                node.removeAttribute('inert');
                node.removeAttribute('data-kz-inert');
            }
        });
    }

    function showLock() {
        if (!document.body) { document.addEventListener('DOMContentLoaded', showLock, { once: true }); return; }
        buildOverlay();
        var name = accountName();
        overlay.querySelector('[data-kzl-who]').textContent = name ? 'Signed in as ' + name : '';
        var st = readState();
        var mins = Math.max(1, Math.round(IDLE_LOCK_MS / 60000));
        overlay.querySelector('[data-kzl-lead]').textContent = st.manual
            ? 'The screen was locked. Enter your password to continue.'
            : 'No one used this page for ' + mins + ' minutes, so it locked itself to protect the account. Enter your password to continue.';
        document.documentElement.classList.add('kz-locked');
        overlay.hidden = false;
        setInert(true);
        setError(st.tries ? (MAX_TRIES - st.tries) + ' tries left before you are logged out.' : '');
        var input = overlay.querySelector('#kzl-password');
        input.value = '';
        setTimeout(function () { try { input.focus(); } catch (e) { /* ignore */ } }, 30);
        clearInterval(countdownTimer);
        paintCountdown();
        countdownTimer = setInterval(paintCountdown, 1000);
        if (!token()) {
            setError('This sign-in cannot be checked. Please log in again.');
            overlay.querySelector('[data-kzl-unlock]').disabled = true;
        }
    }

    function hideLock() {
        clearInterval(countdownTimer);
        document.documentElement.classList.remove('kz-locked');
        setInert(false);
        if (overlay) {
            overlay.hidden = true;
            var input = overlay.querySelector('#kzl-password');
            if (input) { input.value = ''; input.type = 'password'; }
            var show = overlay.querySelector('[data-kzl-show]');
            if (show) show.textContent = 'Show';
            setError('');
        }
    }

    function lock(manual) {
        var st = readState();
        if (st.locked) { showLock(); return; }
        st.locked = true;
        st.manual = !!manual;
        st.lockedAt = Date.now();
        st.tries = 0;
        writeState(st);
        report(manual ? 'locked_manual' : 'locked', { minutesIdle: Math.round((Date.now() - st.lastActive) / 60000) });
        showLock();
    }

    function unlockedHere() {
        var st = readState();
        st.locked = false;
        st.manual = false;
        st.lockedAt = 0;
        st.tries = 0;
        st.lastActive = Date.now();
        writeState(st);
        hideLock();
    }

    function endSession() {
        clearInterval(countdownTimer);
        try { localStorage.removeItem(STATE_KEY); } catch (e) { /* ignore */ }
        try { localStorage.removeItem('kreezby_session'); } catch (e) { /* ignore */ }
        document.cookie = 'kz_alive=; Max-Age=0; path=/';
        location.replace(loginHref);
    }

    var busy = false;
    function tryUnlock(password) {
        if (busy) return;
        if (!password) { setError('Enter your password.'); return; }
        var t = token();
        if (!t) { endSession(); return; }
        busy = true;
        var btn = overlay.querySelector('[data-kzl-unlock]');
        btn.disabled = true;
        btn.textContent = 'Checking…';
        setError('');
        fetch('/api/unlock-session', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-Kreezby-Token': t },
            body: JSON.stringify({ password: password })
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) { return { status: res.status, data: data || {} }; });
        }).then(function (r) {
            if (r.status === 200 && r.data.ok) { unlockedHere(); return; }
            if (r.data.needLogin || r.status === 401) { endSession(); return; }
            if (r.status === 403) {
                var st = readState();
                st.tries = (st.tries || 0) + 1;
                writeState(st);
                var left = typeof r.data.triesLeft === 'number' ? Math.min(r.data.triesLeft, MAX_TRIES - st.tries) : MAX_TRIES - st.tries;
                if (left <= 0) { report('auto_logout'); endSession(); return; }
                setError('Wrong password. ' + left + (left === 1 ? ' try' : ' tries') + ' left before you are logged out.');
                var input = overlay.querySelector('#kzl-password');
                input.value = '';
                input.focus();
                return;
            }
            // Server busy or offline: the page stays locked.
            setError(r.data.error === 'Database is reconnecting.' ? 'The system is reconnecting. Try again in a moment.' : 'Could not check the password. Try again.');
        }).catch(function () {
            setError('No connection. The page stays locked until the password can be checked.');
        }).then(function () {
            busy = false;
            btn.disabled = false;
            btn.textContent = 'Unlock';
        });
    }

    // ---------- Activity ----------
    var lastWrite = 0;
    function activity() {
        var st = readState();
        if (st.locked) return;
        var now = Date.now();
        if (now - lastWrite < ACTIVITY_WRITE_MS) return;
        lastWrite = now;
        st.lastActive = now;
        writeState(st);
    }

    function check() {
        if (!session()) return; // signed out: nothing to protect
        var st = readState();
        var now = Date.now();
        if (st.locked) {
            if (now - (st.lockedAt || now) >= LOCKED_LOGOUT_MS) {
                report('auto_logout', { minutesIdle: Math.round((now - st.lastActive) / 60000) });
                endSession();
                return;
            }
            if (!overlay || overlay.hidden) showLock();
            return;
        }
        var idle = now - (st.lastActive || now);
        // Away longer than lock + log out time (laptop closed, browser reopened): end the sign-in.
        if (idle >= IDLE_LOCK_MS + LOCKED_LOGOUT_MS) {
            report('auto_logout', { minutesIdle: Math.round(idle / 60000) });
            endSession();
            return;
        }
        if (idle >= IDLE_LOCK_MS) lock(false);
    }

    // ---------- "Lock screen" in the account menu ----------
    function addMenuItem() {
        var menu = document.getElementById('user-dropdown-menu');
        if (!menu || menu.querySelector('.kz-lock-menu-item')) return;
        var item = document.createElement('a');
        item.href = '#';
        item.className = 'dropdown-item kz-lock-menu-item';
        item.textContent = '🔒 Lock screen';
        item.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            menu.classList.remove('active', 'open', 'show');
            lock(true);
        });
        var out = Array.prototype.filter.call(menu.querySelectorAll('.dropdown-item'), function (a) {
            return /log\s*out/i.test(a.textContent || '');
        })[0];
        menu.insertBefore(item, out || null);
    }

    function start() {
        if (!session()) return;
        // A first visit after logging in starts fresh.
        var st = readState();
        writeState(st);
        check();
        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(function (name) {
            window.addEventListener(name, activity, { passive: true, capture: true });
        });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
        window.addEventListener('focus', check);
        window.addEventListener('pageshow', check);
        setInterval(check, 15 * 1000);
        // Another tab locked, unlocked or logged out.
        window.addEventListener('storage', function (e) {
            if (e.key === 'kreezby_session' && !e.newValue) { location.replace(loginHref); return; }
            if (e.key !== STATE_KEY) return;
            var next = readState();
            if (next.locked) showLock();
            else if (overlay && !overlay.hidden) hideLock();
        });
        addMenuItem();
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('#user-dropdown-trigger')) setTimeout(addMenuItem, 0);
        }, true);
        if (window.MutationObserver) {
            new MutationObserver(function () {
                addMenuItem();
                var s = readState();
                if (s.locked && overlay && !document.body.contains(overlay)) { overlay = null; showLock(); }
            }).observe(document.body, { childList: true });
        }
        ['turbo:frame-load', 'kreezby:page-load'].forEach(function (n) { document.addEventListener(n, function () { addMenuItem(); check(); }); });
    }

    // Locked pages are covered before anything is drawn, so a refresh shows nothing behind it.
    (function earlyCover() {
        if (!session()) return;
        var st = readState();
        if (st.locked || Date.now() - (st.lastActive || Date.now()) >= IDLE_LOCK_MS) {
            injectStyle();
            document.documentElement.classList.add('kz-locked');
        }
    })();

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();

    window.KreezbySessionLock = { lock: function () { lock(true); }, version: '20261117' };
})();
