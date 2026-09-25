/**

 * Canonical admin sidebar — icon nav with collapse (all admin pages).

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

        truck: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
        clipboard: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h5"/></svg>',
        inquiry: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>'

    };



    var NAV = [

        { key: 'dashboard', label: 'Dashboard', href: 'admin.html', icon: 'home' },

        { key: 'po', label: 'Purchase Order', href: 'po-admin.html', icon: 'cart' },

        { key: 'receive', label: 'Receiving', href: 'receive-admin.html', icon: 'package' },

        { key: 'bo', label: 'Back Order', href: 'bo-admin.html', icon: 'layers' },

        { key: 'return', label: 'Return/P.O List', href: 'return-admin.html', icon: 'return' },

        { key: 'stocks', label: 'Stocks', href: 'stocks-admin.html', icon: 'boxes' },

        { key: 'saleslist', label: 'Sales List', href: 'saleslist-admin.html', icon: 'sales' },

        { key: 'ordertracking', label: 'Order Tracking', href: 'order-tracking-admin.html', icon: 'truck' },

        { key: 'aiforecast', label: 'AI Forecast', href: 'aiforecast-admin.html', icon: 'chart' },

        { key: 'alert', label: 'Alert', href: 'alert-admin.html', icon: 'bell' },

        { key: 'stocklevel', label: 'Stock Level', href: 'stocklevel-admin.html', icon: 'activity' }
    ];



    var CRITICAL_CSS = [

        'aside.dark-sidebar-panel{overflow:hidden!important;flex-shrink:0!important}',

        'aside.dark-sidebar-panel:not(.kreezby-sidebar-ready){visibility:hidden!important;pointer-events:none!important;width:256px!important;min-width:256px!important;max-width:256px!important;background:#424242!important}',

        'body.sidebar-collapsed aside.dark-sidebar-panel:not(.kreezby-sidebar-ready){width:64px!important;min-width:64px!important;max-width:64px!important}',

        'aside.dark-sidebar-panel svg{width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;display:block!important}',

        'turbo-frame#kreezby-main-content,.kreezby-turbo-main{display:flex!important;flex:1 1 0%!important;flex-grow:1!important;min-width:0!important;max-width:none!important;width:auto!important}',

        'turbo-frame#kreezby-main-content main.workspace-view-canvas,.kreezby-turbo-main main.workspace-view-canvas{flex:1 1 auto!important;width:100%!important;min-width:0!important;max-width:100%!important}',

        '@media (max-width:900px){aside.dark-sidebar-panel{position:fixed!important;left:0!important;top:var(--kreezby-admin-header-height,56px)!important;height:calc(100dvh - var(--kreezby-admin-header-height,56px))!important;width:min(280px,86vw)!important;min-width:min(280px,86vw)!important;max-width:min(280px,86vw)!important;transform:translateX(-110%)!important;z-index:1400!important}body.kreezby-nav-open aside.dark-sidebar-panel{transform:translateX(0)!important;pointer-events:auto!important;visibility:visible!important}}'

    ].join('');



    function isAdminPage() {

        var path = (location.pathname || '').replace(/\\/g, '/');
        if (path.indexOf('/admin/') !== -1) return true;
        if (path.indexOf('/head_admin/') === -1) return false;
        var file = (path.split('/').pop() || '').toLowerCase().split('?')[0];
        return file !== 'index.html'
            && file !== 'admin-permissions.html'
            && file !== 'staff-permissions.html'
            && file !== 'inquiries.html';

    }

    function isHeadAdminPortal() {
        return (location.pathname || '').replace(/\\/g, '/').indexOf('/head_admin/') !== -1 && isAdminPage();
    }

    function portalHref(href) {
        if (!isHeadAdminPortal()) return href;
        if (href === 'admin.html') return 'head_admin.html';
        if (href === 'index.html' || href === 'inquiries.html') return href;
        return String(href || '').replace(/-admin\.html$/i, '-headadmin.html');
    }



    function ensureCriticalCss() {

        if (document.getElementById('kreezby-admin-icon-sidebar-critical')) return;

        var style = document.createElement('style');

        style.id = 'kreezby-admin-icon-sidebar-critical';

        style.textContent = CRITICAL_CSS;

        document.head.appendChild(style);

    }



    function ensureNavSmooth() {
        if (!document.querySelector('meta[name="view-transition"]')) {
            var meta = document.createElement('meta');
            meta.name = 'view-transition';
            meta.content = 'same-origin';
            (document.head || document.documentElement).appendChild(meta);
        }
        if (!document.getElementById('kreezby-page-transition-style')) {
            var pt = document.createElement('link');
            pt.id = 'kreezby-page-transition-style';
            pt.rel = 'stylesheet';
            pt.href = '../css/shared/kreezby-turbo-nav.css';
            (document.head || document.documentElement).appendChild(pt);
        }
    }



    function ensureCss() {

        ensureCriticalCss();
        ensureNavSmooth();

        if (!document.getElementById('kreezby-mobile-style')) {
            var mobile = document.createElement('link');
            mobile.id = 'kreezby-mobile-style';
            mobile.rel = 'stylesheet';
            mobile.href = '../css/shared/kreezby-mobile.css?v=20260925phone9';
            document.head.appendChild(mobile);
        }

        if (document.getElementById('kreezby-admin-icon-sidebar-style')) return;

        var link = document.createElement('link');

        link.id = 'kreezby-admin-icon-sidebar-style';

        link.rel = 'stylesheet';

        link.href = '../css/shared/admin-icon-sidebar.css';

        document.head.appendChild(link);

    }



    function ensureNotificationStoreLoaded() {

        if (!isAdminPage()) return;

        if (window.KreezbyNotifications) return;

        if (document.getElementById('kreezby-notification-store-script')) return;

        var script = document.createElement('script');

        script.id = 'kreezby-notification-store-script';

        script.src = '../js/notification-store.js';

        script.defer = true;

        document.head.appendChild(script);

    }



    function currentFilename() {

        return (location.pathname.split('/').pop() || '').toLowerCase();

    }



    function activeKeyFor(filename) {

        if (!filename || filename === 'admin.html' || filename === 'head_admin.html') return 'dashboard';

        if (filename.indexOf('stocklevel') === 0) return 'stocklevel';

        if (filename.indexOf('aiforecast') === 0) return 'aiforecast';

        if (filename.indexOf('po-') === 0) return 'po';

        if (filename.indexOf('receive-') === 0) return 'receive';

        if (filename.indexOf('bo-') === 0) return 'bo';

        if (filename.indexOf('return-') === 0) return 'return';

        if (filename.indexOf('stocks-') === 0) return 'stocks';

        if (filename.indexOf('saleslist-') === 0) return 'saleslist';

        if (filename.indexOf('order-tracking-') === 0) return 'ordertracking';

        if (filename.indexOf('alert-') === 0) return 'alert';

        if (filename.indexOf('inbox-') === 0) return 'dashboard';
        if (filename === 'inquiries.html' || filename.indexOf('inquir') === 0) return 'inquiry';

        return '';

    }



    function navItem(item, activeKey) {

        var active = item.key === activeKey;



        var frameAttrs = (item.top || item.href === 'inquiries.html' || item.href === 'index.html')
            ? ' data-turbo="false" data-turbo-frame="_top"'
            : ' data-turbo-frame="kreezby-main-content" data-turbo-action="advance"';

        return (

            '<a href="' + item.href + '"' + frameAttrs + ' class="kreezby-sidebar-nav-item' + (active ? ' is-active' : '') + '">' +

                '<span class="kreezby-sidebar-nav-icon" aria-hidden="true">' + (ICONS[item.icon] || '') + '</span>' +

                '<span class="kreezby-sidebar-nav-label">' + item.label + '</span>' +

            '</a>'

        );

    }



    function allowedNav() {
        var items = NAV.slice();
        if (window.KreezbyAdminPermissions && !window.KreezbyAdminPermissions.isHeadAdmin() && !isHeadAdminPortal()) {
            items = items.filter(function (item) {
                return window.KreezbyAdminPermissions.adminCanAccessTask(item.key);
            });
        }
        if (isHeadAdminPortal()) {
            items.push({ key: 'inquiry', label: 'Inquiry', href: 'inquiries.html', icon: 'inquiry', top: true });
        }
        return items.map(function (item) {
            return {
                key: item.key,
                label: item.label,
                href: portalHref(item.href),
                icon: item.icon,
                top: item.top
            };
        });
    }

    function buildSidebarHtml(activeKey) {

        var navHtml = allowedNav().map(function (item) {

            return navItem(item, activeKey);

        }).join('');



        return (

            '<nav class="kreezby-sidebar-nav" aria-label="Admin modules">' + navHtml + '</nav>'

        );

    }



    function renderAdminSidebar() {

        if (!isAdminPage()) return;



        ensureCss();

        var activeKey = activeKeyFor(currentFilename());



        document.querySelectorAll('aside.dark-sidebar-panel').forEach(function (aside) {

            aside.classList.add('kreezby-icon-sidebar');

            aside.innerHTML = buildSidebarHtml(activeKey);

            aside.classList.add('kreezby-sidebar-ready');

        });



        document.dispatchEvent(new CustomEvent('kreezby-admin-sidebar-ready'));

    }



    if (isAdminPage()) {

        ensureCriticalCss();
        ensureNavSmooth();

        ensureCss();

        ensureNotificationStoreLoaded();

    }



    function bootSidebar() {

        if (document.readyState === 'loading') {

            document.addEventListener('DOMContentLoaded', renderAdminSidebar);

        } else {

            renderAdminSidebar();

        }

        document.addEventListener('kreezby:page-load', renderAdminSidebar);

    }



    bootSidebar();



    window.KreezbyAdminSidebar = { render: renderAdminSidebar, NAV: NAV };

})();


