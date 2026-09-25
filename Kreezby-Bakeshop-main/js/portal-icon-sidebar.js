/**
 * Converts legacy sidebar-panel navigation trees into the admin-style icon sidebar
 * (staff role dashboards + retailer store portals).
 */
(function () {
    'use strict';

    var SVG_ATTRS = ' width="18" height="18" style="width:18px;height:18px;display:block;flex-shrink:0"';

    var ICONS = {
        home: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-6h6v6"/></svg>',
        cart: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
        package: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
        layers: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="m12.83 2.18 8 4.5a1 1 0 0 1 0 1.73l-8 4.5a2 2 0 0 1-2 0l-8-4.5a1 1 0 0 1 0-1.73l8-4.5a2 2 0 0 1 2 0Z"/><path d="m2.83 12.18 8 4.5a1 1 0 0 0 1 0l8-4.5"/><path d="m2.83 17.18 8 4.5a1 1 0 0 0 1 0l8-4.5"/></svg>',
        return: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
        boxes: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><path d="m7.5 4.21 4.5 2.6 4.5-2.6"/></svg>',
        sales: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
        chart: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/></svg>',
        bell: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
        activity: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
        mail: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        report: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>'
    };

    var CRITICAL_CSS = [
        'aside.sidebar-panel.kreezby-icon-sidebar{overflow:hidden!important;flex-shrink:0!important}',
        'aside.sidebar-panel.kreezby-icon-sidebar:not(.kreezby-sidebar-ready){visibility:hidden!important;pointer-events:none!important;width:256px!important;min-width:256px!important;max-width:256px!important;background:#424242!important}',
        'body.sidebar-collapsed aside.sidebar-panel.kreezby-icon-sidebar:not(.kreezby-sidebar-ready){width:64px!important;min-width:64px!important;max-width:64px!important}',
        'aside.sidebar-panel.kreezby-icon-sidebar svg{width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;display:block!important}',
        '@media (max-width:900px){aside.sidebar-panel.kreezby-icon-sidebar{position:fixed!important;left:0!important;top:var(--kreezby-admin-header-height,56px)!important;height:calc(100dvh - var(--kreezby-admin-header-height,56px))!important;width:min(280px,86vw)!important;min-width:min(280px,86vw)!important;max-width:min(280px,86vw)!important;transform:translateX(-110%)!important;z-index:1400!important}body.kreezby-nav-open aside.sidebar-panel.kreezby-icon-sidebar{transform:translateX(0)!important;pointer-events:auto!important;visibility:visible!important}}'
    ].join('');

    function moduleRelativeRoot() {
        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'retailer', 'customer', 'wholesaler', 'auth'];
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

    function isPortalPage() {
        var path = (location.pathname || '').toLowerCase();
        return path.indexOf('/staff/') !== -1 || /\/retailer\/[^/]+\//i.test(path);
    }

    function currentFilename() {
        return (location.pathname.split('/').pop() || '').toLowerCase();
    }

    function fileFromHref(href) {
        return ((href || '').split('?')[0].split('#')[0].split('/').pop() || '').toLowerCase();
    }

    function iconForFile(file) {
        if (!file) return 'home';
        if (/^staff-\d+\.html$/.test(file) || /^retailer-/.test(file)) return 'home';
        if (file === 'po-staff.html' || file.indexOf('po-') === 0) return 'cart';
        if (file === 'receive-staff.html' || file.indexOf('receive-') === 0) return 'package';
        if (file === 'bo-staff.html' || file.indexOf('bo-') === 0) return 'layers';
        if (file === 'return-staff.html' || file.indexOf('return-') === 0) return 'return';
        if (file === 'stocks-staff.html' || file.indexOf('stocks-') === 0) return 'boxes';
        if (file.indexOf('saleslist') >= 0 || file.indexOf('dailysales') >= 0) return 'sales';
        if (file.indexOf('aiforecast') >= 0) return 'chart';
        if (file.indexOf('inventoryreport') >= 0) return 'report';
        if (file.indexOf('stocklevel') >= 0) return 'activity';
        if (file.indexOf('alert') >= 0) return 'bell';
        if (file.indexOf('inbox') >= 0) return 'mail';
        return 'home';
    }

    function isInboxHref(href) {
        return /inbox/i.test(fileFromHref(href));
    }

    function turboAttrs(href) {
        if (isInboxHref(href)) return ' data-turbo-frame="_top"';
        if (document.getElementById('kreezby-main-content')) {
            return ' data-turbo-frame="kreezby-main-content" data-turbo-action="advance"';
        }
        return '';
    }

    function ensureCriticalCss() {
        if (document.getElementById('kreezby-portal-icon-sidebar-critical')) return;
        var style = document.createElement('style');
        style.id = 'kreezby-portal-icon-sidebar-critical';
        style.textContent = CRITICAL_CSS;
        document.head.appendChild(style);
    }

    function ensureCss() {
        ensureCriticalCss();
        if (!document.getElementById('kreezby-mobile-style')) {
            var mobile = document.createElement('link');
            mobile.id = 'kreezby-mobile-style';
            mobile.rel = 'stylesheet';
            mobile.href = moduleRelativeRoot() + 'css/shared/kreezby-mobile.css?v=20260925phone9';
            document.head.appendChild(mobile);
        }
        if (document.getElementById('kreezby-portal-icon-sidebar-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-portal-icon-sidebar-style';
        link.rel = 'stylesheet';
        link.href = moduleRelativeRoot() + 'css/shared/admin-icon-sidebar.css';
        document.head.appendChild(link);
    }

    function isRetailerStorePage() {
        return /\/retailer\/[^/]+\//i.test(location.pathname || '');
    }

    function retailerStoreKey() {
        var wrapper = document.querySelector('.system-dashboard-wrapper[data-area][data-slug]');
        if (wrapper) {
            return wrapper.getAttribute('data-area') + '_' + wrapper.getAttribute('data-slug');
        }
        var file = currentFilename();
        var match = file.match(/^(?:retailer|po|receive|bo|return|saleslist|alert)-(.+)\.html$/i);
        return match ? match[1] : '';
    }

    function retailerInboxHref() {
        if (window.KreezbyUserDropdown && typeof window.KreezbyUserDropdown.inboxHref === 'function') {
            return window.KreezbyUserDropdown.inboxHref();
        }
        var path = (location.pathname || '').replace(/\\/g, '/');
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();
        var retailerIdx = -1;
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase() === 'retailer') {
                retailerIdx = i;
                break;
            }
        }
        if (retailerIdx < 0) return 'inbox-retailer.html';
        var depth = parts.length - retailerIdx - 1;
        var prefix = '';
        for (var d = 0; d < depth; d++) prefix += '../';
        return prefix + 'inbox-retailer.html';
    }

    function retailerNavItems(key) {
        if (!key) return [];
        return [
            { href: 'retailer-' + key + '.html', label: 'Dashboard', icon: 'home' },
            { href: 'po-' + key + '.html', label: 'Purchase Order', icon: 'cart' },
            { href: 'bo-' + key + '.html', label: 'Back Order', icon: 'layers' },
            { href: 'return-' + key + '.html', label: 'Return/P.O List', icon: 'return' },
            { href: 'saleslist-' + key + '.html', label: 'Sales List', icon: 'sales' },
            { href: 'alert-' + key + '.html', label: 'Alert', icon: 'bell' },
            { href: retailerInboxHref(), label: 'Inbox', icon: 'mail' }
        ];
    }

    function parseNavFromAside(aside) {
        var links = aside.querySelectorAll('.navigation-tree a, .sidebar-menu-list a');
        if (!links.length) return [];

        return Array.prototype.map.call(links, function (a) {
            var href = a.getAttribute('href') || '';
            var li = a.closest('li');
            return {
                href: href,
                label: (a.textContent || '').trim(),
                icon: iconForFile(fileFromHref(href))
            };
        });
    }

    function getNavItems(aside) {
        if (isRetailerStorePage()) {
            var retailerItems = retailerNavItems(retailerStoreKey());
            if (retailerItems.length) {
                aside._kreezbyNavItems = retailerItems;
                return retailerItems;
            }
        }

        var fresh = parseNavFromAside(aside);
        if (fresh.length) {
            aside._kreezbyNavItems = fresh;
            return fresh;
        }

        return aside._kreezbyNavItems || [];
    }

    function navItem(item, current) {
        var active = fileFromHref(item.href) === current;
        return (
            '<a href="' + item.href + '"' + turboAttrs(item.href) +
            ' class="kreezby-sidebar-nav-item' + (active ? ' is-active' : '') + '">' +
                '<span class="kreezby-sidebar-nav-icon" aria-hidden="true">' + (ICONS[item.icon] || ICONS.home) + '</span>' +
                '<span class="kreezby-sidebar-nav-label">' + item.label + '</span>' +
            '</a>'
        );
    }

    function buildSidebarHtml(items, current) {
        return '<nav class="kreezby-sidebar-nav" aria-label="Portal modules">' +
            items.map(function (item) { return navItem(item, current); }).join('') +
        '</nav>';
    }

    function renderPortalSidebars() {
        if (!isPortalPage()) return;

        ensureCss();
        var current = currentFilename();

        document.querySelectorAll('aside.sidebar-panel').forEach(function (aside) {
            if (aside.classList.contains('dark-sidebar-panel')) return;

            var items = getNavItems(aside);
            if (!items.length) return;

            aside.classList.add('kreezby-icon-sidebar');
            aside.innerHTML = buildSidebarHtml(items, current);
            aside.classList.add('kreezby-sidebar-ready');
        });

        document.dispatchEvent(new CustomEvent('kreezby-portal-sidebar-ready'));
        document.dispatchEvent(new CustomEvent('kreezby-staff-sidebar-ready'));
    }

    if (isPortalPage() && document.querySelector('aside.sidebar-panel')) {
        ensureCriticalCss();
    }

    function boot() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', renderPortalSidebars);
        } else {
            renderPortalSidebars();
        }
        document.addEventListener('kreezby:page-load', renderPortalSidebars);
    }

    boot();

    window.KreezbyPortalIconSidebar = { render: renderPortalSidebars };
})();
