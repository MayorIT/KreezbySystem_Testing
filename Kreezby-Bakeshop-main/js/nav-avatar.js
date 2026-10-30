/**
 * Shows the customer's or retailer's profile photo on the account button in the header.
 * Customers keep their photo in kreezbyCustomerProfile; retailers in their portal profile.
 */
(function () {
    'use strict';
    var path = (window.location.pathname || '').replace(/\\/g, '/').toLowerCase();
    var kind = path.indexOf('/retailer/') >= 0 ? 'retailer' : (path.indexOf('/customer/') >= 0 ? 'customer' : '');
    if (!kind || window.KreezbyNavAvatar) return;

    function read(key, fallback) {
        try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
    }

    function retailerPhoto() {
        var session = read('kreezby_session', {}) || {};
        var query = String(session.identity || session.userName || '').trim().toLowerCase();
        if (!query) return '';
        var users = read('kreezby_maintenance_users', {}) || {};
        var found = null;
        (users.retailers || []).forEach(function (u) {
            if (!u || u.archived || found) return;
            if ([u.email, u.username, u.name, u.user_id, u.id, u.contact].some(function (f) { return f && String(f).trim().toLowerCase() === query; })) found = u;
        });
        var key = 'retailer:' + String((found && (found.username || found.id)) || '').toLowerCase();
        var overlay = (read('kreezby_portal_profiles', {}) || {})[key] || {};
        return overlay.avatarDataUrl || (found && found.avatarDataUrl) || '';
    }

    function photo() {
        var url = kind === 'customer' ? String((read('kreezbyCustomerProfile', {}) || {}).avatarDataUrl || '') : String(retailerPhoto() || '');
        return url.indexOf('data:image/') === 0 || /^https?:/.test(url) ? url : '';
    }

    function injectStyle() {
        if (document.getElementById('kz-nav-avatar-style')) return;
        var s = document.createElement('style');
        s.id = 'kz-nav-avatar-style';
        s.textContent = '.kz-nav-avatar{display:inline-block;flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:#efe6df center/cover no-repeat;border:2px solid #fff;box-sizing:border-box;margin-right:8px;vertical-align:middle}' +
            '.nav-btn__icon.kz-has-photo{background:center/cover no-repeat;border-radius:50%;overflow:hidden}' +
            '.nav-btn__icon.kz-has-photo svg{display:none}';
        document.head.appendChild(s);
    }

    var last = null;
    var observer = null;

    function paint() {
        var trigger = document.getElementById('user-dropdown-trigger');
        if (!trigger) return;
        injectStyle();
        var url = photo();
        if (observer) observer.disconnect();
        if (kind === 'customer') {
            var icon = trigger.querySelector('.nav-btn__icon');
            if (icon) {
                icon.classList.toggle('kz-has-photo', !!url);
                icon.style.backgroundImage = url ? 'url("' + url.replace(/"/g, '') + '")' : '';
            }
        } else {
            var mine = trigger.querySelector('.kz-nav-avatar');
            if (url) {
                if (!mine) {
                    mine = document.createElement('span');
                    mine.className = 'kz-nav-avatar';
                    mine.setAttribute('aria-hidden', 'true');
                    trigger.insertBefore(mine, trigger.firstChild);
                }
                mine.style.backgroundImage = 'url("' + url.replace(/"/g, '') + '")';
            } else if (mine) {
                mine.remove();
            }
        }
        last = url;
        if (observer) observer.observe(trigger, { childList: true });
    }

    function refresh() { paint(); }

    observer = new MutationObserver(function () { paint(); });
    window.KreezbyNavAvatar = { refresh: refresh };
    function boot() {
        paint();
        setTimeout(paint, 400);
        setTimeout(paint, 1500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    document.addEventListener('kreezby:profile-saved', paint);
    document.addEventListener('kreezby:remote-state', paint);
    document.addEventListener('kreezby:page-load', paint);
    window.addEventListener('storage', paint);
    // The profile can be saved on this same page; look again now and then.
    setInterval(function () { if (photo() !== last) paint(); }, 1500);
})();
