/**
 * Phone layout: inject CSS, off-canvas sidebar, compact header chrome.
 */
(function () {
    'use strict';

    if (window.KreezbyMobileLoaded) return;
    window.KreezbyMobileLoaded = true;

    var PHONE_MQ = '(max-width: 900px)';
    var OPEN_CLASS = 'kreezby-nav-open';

    function moduleRelativeRoot() {
        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'retailer', 'customer', 'wholesaler', 'auth', 'it_kreezby', 'head_admin'];
        var rootIdx = -1;
        for (var i = parts.length - 1; i >= 0; i--) {
            if (roots.indexOf(parts[i].toLowerCase()) >= 0) {
                rootIdx = i;
                break;
            }
        }
        if (rootIdx < 0) return '';

        var depth = parts.length - rootIdx - 1;
        var prefix = '';
        for (var d = 0; d <= depth; d++) prefix += '../';
        return prefix;
    }

    function isPhone() {
        return window.matchMedia && window.matchMedia(PHONE_MQ).matches;
    }

    function hasSidebar() {
        return !!document.querySelector('aside.sidebar-panel, aside.dark-sidebar-panel, aside.kreezby-icon-sidebar');
    }

    function ensureViewport() {
        var meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'viewport';
            (document.head || document.documentElement).appendChild(meta);
        }
        meta.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
    }

    function ensureCss() {
        var href = moduleRelativeRoot() + 'css/shared/kreezby-mobile.css?v=20260925phone9';
        var link = document.getElementById('kreezby-mobile-style');
        if (!link) {
            link = document.createElement('link');
            link.id = 'kreezby-mobile-style';
            link.rel = 'stylesheet';
        }
        link.href = href;
        (document.head || document.documentElement).appendChild(link);
    }

    function ensureScrim() {
        if (document.querySelector('.kreezby-nav-scrim')) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kreezby-nav-scrim';
        btn.setAttribute('aria-label', 'Close menu');
        btn.addEventListener('click', closeNav);
        document.body.appendChild(btn);
    }

    function hamburger() {
        return document.querySelector('.hamburger-toggle');
    }

    function placeHamburger() {
        var btn = hamburger();
        var header = document.querySelector('.top-navbar-node');
        var right = header && header.querySelector('.top-nav-links-right');
        if (!btn || !header) return;

        if (isPhone()) {
            if (header.firstElementChild !== btn) header.insertBefore(btn, header.firstChild);
            btn.setAttribute('aria-label', 'Open menu');
            btn.setAttribute('aria-expanded', document.body.classList.contains(OPEN_CLASS) ? 'true' : 'false');
        } else if (right && btn.parentNode !== right) {
            right.appendChild(btn);
            btn.setAttribute('aria-label', 'Toggle sidebar');
        }
    }

    function syncHamburgerPressed() {
        var btn = hamburger();
        if (!btn) return;
        if (isPhone()) {
            var open = document.body.classList.contains(OPEN_CLASS);
            btn.setAttribute('aria-pressed', open ? 'true' : 'false');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
    }

    function openNav() {
        if (!hasSidebar()) return;
        ensureScrim();
        document.body.classList.add(OPEN_CLASS);
        syncHamburgerPressed();
    }

    function closeNav() {
        document.body.classList.remove(OPEN_CLASS);
        syncHamburgerPressed();
    }

    var SVG = ' width="18" height="18" style="width:18px;height:18px;display:block;flex-shrink:0"';
    var CHROME_ICONS = {
        inquiry: '<svg viewBox="0 0 24 24"' + SVG + '><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>',
        control: '<svg viewBox="0 0 24 24"' + SVG + '><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
        home: '<svg viewBox="0 0 24 24"' + SVG + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-6h6v6"/></svg>',
        maintenance: '<svg viewBox="0 0 24 24"' + SVG + '><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
        inbox: '<svg viewBox="0 0 24 24"' + SVG + '><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
    };

    function fileOf(href) {
        try {
            return new URL(href, location.href).pathname.split('/').pop().toLowerCase().split('?')[0];
        } catch (e) {
            return String(href || '').split('/').pop().toLowerCase().split('?')[0];
        }
    }

    function chromeKey(link) {
        var text = ((link.getAttribute('title') || '') + ' ' + (link.textContent || '')).toLowerCase();
        var href = (link.getAttribute('href') || '').toLowerCase();
        var file = href.split('/').pop().split('?')[0];
        if (text.indexOf('inquiry') >= 0 || file === 'inquiries.html') return 'inquiry';
        if (text.indexOf('control') >= 0) return 'control';
        if (/\bhome\b/.test(text) || file === 'admin.html' || file === 'head_admin.html' || /^staff-\d+\.html$/.test(file) || /^retailer-/.test(file)) return 'home';
        if (text.indexOf('maintenance') >= 0 || file.indexOf('maintenance-') === 0) return 'maintenance';
        if (text.indexOf('inbox') >= 0 || file.indexOf('inbox-') === 0) return 'inbox';
        return '';
    }

    function collectChromeLinks() {
        var items = [];
        var seen = {};
        document.querySelectorAll('.top-navbar-node a[href]').forEach(function (link) {
            if (link.closest('.user-dropdown-menu')) return;
            if (link.closest('aside')) return;
            var key = chromeKey(link);
            if (!key || seen[key]) return;
            seen[key] = true;
            var labelNode = link.querySelector('.expandable-nav-tab__label');
            items.push({
                key: key,
                href: link.getAttribute('href'),
                label: (link.getAttribute('title') || (labelNode && labelNode.textContent) || link.textContent || '').trim(),
                turboTop: link.getAttribute('data-turbo-frame') === '_top' || key === 'inbox' || key === 'control' || key === 'inquiry'
            });
        });
        return items;
    }

    function makeSidebarItem(item) {
        var a = document.createElement('a');
        a.className = 'kreezby-sidebar-nav-item kreezby-sidebar-chrome';
        a.setAttribute('href', item.href);
        if (item.turboTop) {
            a.setAttribute('data-turbo', 'false');
            a.setAttribute('data-turbo-frame', '_top');
        } else if (document.getElementById('kreezby-main-content')) {
            a.setAttribute('data-turbo-frame', 'kreezby-main-content');
            a.setAttribute('data-turbo-action', 'advance');
        }
        a.innerHTML =
            '<span class="kreezby-sidebar-nav-icon" aria-hidden="true">' + (CHROME_ICONS[item.key] || CHROME_ICONS.home) + '</span>' +
            '<span class="kreezby-sidebar-nav-label">' + item.label + '</span>';
        return a;
    }

    function syncChromeIntoSidebar() {
        var nav = document.querySelector('aside .kreezby-sidebar-nav');
        if (!nav) return;

        nav.querySelectorAll('.kreezby-sidebar-chrome').forEach(function (el) {
            el.remove();
        });
        if (!isPhone()) return;

        var chrome = collectChromeLinks();
        if (!chrome.length) return;

        var existingByFile = {};
        nav.querySelectorAll('a.kreezby-sidebar-nav-item').forEach(function (link) {
            existingByFile[fileOf(link.getAttribute('href'))] = link;
        });

        var insertBefore = nav.firstChild;
        chrome.forEach(function (item) {
            var file = fileOf(item.href);
            var existing = existingByFile[file];
            if (existing) {
                var label = existing.querySelector('.kreezby-sidebar-nav-label');
                if (label && item.key === 'home') label.textContent = item.label || 'Home';
                existing.parentNode.insertBefore(existing, insertBefore);
                insertBefore = existing.nextSibling;
                return;
            }
            var node = makeSidebarItem(item);
            nav.insertBefore(node, insertBefore);
            insertBefore = node.nextSibling;
        });
    }

    function applyMode() {
        placeHamburger();
        if (!isPhone()) {
            closeNav();
            syncChromeIntoSidebar();
            return;
        }
        ensureScrim();
        syncHamburgerPressed();
        syncChromeIntoSidebar();
    }

    function boot() {
        ensureViewport();
        ensureCss();
        applyMode();
    }

    document.addEventListener('click', function (ev) {
        if (!isPhone() || !document.body.classList.contains(OPEN_CLASS)) return;
        var link = ev.target.closest('aside a, .kreezby-sidebar-nav-item');
        if (!link) return;
        setTimeout(closeNav, 50);
    });

    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
        applyMode();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    document.addEventListener('kreezby:page-load', applyMode);
    document.addEventListener('kreezby-admin-sidebar-ready', applyMode);
    document.addEventListener('kreezby-staff-sidebar-ready', applyMode);
    document.addEventListener('kreezby-portal-sidebar-ready', applyMode);

    window.KreezbyMobile = {
        boot: boot,
        openNav: openNav,
        closeNav: closeNav,
        isPhone: isPhone
    };
})();
