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
        inquiry: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>',
        gear: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"/></svg>',
        mail: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        flag: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
        tag: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M12 2H2v10l9.3 9.3a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8z"/><circle cx="7" cy="7" r="1.2"/></svg>',
        spark: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M12 3l1.6 4.8L18.5 9.5 13.6 11 12 16l-1.6-5L6.5 9.5 11.4 7.8z"/><path d="M18 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>',
        users: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'

    };



    var NAV = [

        { key: 'dashboard', label: 'Dashboard', href: 'admin.html', icon: 'home' },

        { key: 'saleslist', label: 'Sales', href: 'saleslist-admin.html', icon: 'chart' },

        { key: 'bo', label: 'Orders', href: 'bo-admin.html', icon: 'clipboard' },

        { key: 'ordertracking', label: 'Order Tracking', href: 'order-tracking-admin.html', icon: 'truck' },

        { key: 'pos', label: 'Point of Sale', href: 'pos-admin.html', icon: 'cart' },


        { key: 'stocklevel', label: 'Inventory', href: 'stocklevel-admin.html', icon: 'boxes', children: [
            { key: 'stock-level', label: 'Stock Level', href: 'stocklevel-admin.html' },
            { key: 'stock-value', label: 'Total Value of Stock', href: 'stocklevel-value-admin.html' },
            { key: 'stock-slow', label: 'Slow Moving Stock', href: 'stocklevel-slow-admin.html' },
            { key: 'stock-alerts', label: 'Low Stock Alerts', href: 'stocklevel-alerts-admin.html' },
            { key: 'stock-chart', label: 'Stock Value vs Sales', href: 'stocklevel-chart-admin.html' }
        ] },

        { key: 'stocks', label: 'Products', href: 'stocks-admin.html', icon: 'tag' },

        { key: 'deliveryschedule', label: 'Deliveries', href: 'deliveryschedule-admin.html', icon: 'truck' },

        { key: 'alert', label: 'Alerts', href: 'alert-admin.html', icon: 'bell' },

        { key: 'aiforecast', label: 'AI Insights', href: 'aiforecast_salesanalysis-admin.html', icon: 'spark', children: [
            { key: 'sales-analysis', label: 'Sales Analysis', href: 'aiforecast_salesanalysis-admin.html' },
            { key: 'management-insight', label: 'Management Insight', href: 'insight-admin.html' },
            { key: 'product-recommendation', label: 'Production Recommendation', href: 'aiforecast_salesanalysis-admin.html?tab=product-recommendation' }
        ] },

        { key: 'issuereports', label: 'Reports', href: 'issue-reports-admin.html', icon: 'flag' },

        { key: 'inbox', label: 'Inbox', href: 'inbox-admin.html', icon: 'mail' }
    ];



    var CRITICAL_CSS = [

        'aside.dark-sidebar-panel{overflow:hidden!important;flex-shrink:0!important}',

        'aside.dark-sidebar-panel:not(.kreezby-sidebar-ready){visibility:hidden!important;pointer-events:none!important;position:fixed!important;transform:translateX(-110%)!important;width:256px!important;min-width:0!important;max-width:256px!important;background:#424242!important}',

        'body aside.dark-sidebar-panel.kreezby-sidebar-ready,body.sidebar-collapsed aside.dark-sidebar-panel.kreezby-sidebar-ready{position:fixed!important;left:0!important;top:var(--kreezby-admin-header-height,60px)!important;height:calc(100vh - var(--kreezby-admin-header-height,60px))!important;width:256px!important;min-width:256px!important;max-width:256px!important;transform:translateX(-110%)!important;pointer-events:none!important;z-index:1400!important}',

        'body.kreezby-nav-open aside.dark-sidebar-panel.kreezby-sidebar-ready,body.kreezby-nav-open.sidebar-collapsed aside.dark-sidebar-panel.kreezby-sidebar-ready{transform:translateX(0)!important;pointer-events:auto!important;visibility:visible!important}',

        'aside.dark-sidebar-panel svg{width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;display:block!important}',

        'turbo-frame#kreezby-main-content,.kreezby-turbo-main{display:flex!important;flex:1 1 0%!important;flex-grow:1!important;min-width:0!important;max-width:none!important;width:auto!important}',

        'turbo-frame#kreezby-main-content main.workspace-view-canvas,.kreezby-turbo-main main.workspace-view-canvas{flex:1 1 auto!important;width:100%!important;min-width:0!important;max-width:100%!important}',

        '@media (max-width:900px){aside.dark-sidebar-panel{position:fixed!important;left:0!important;top:var(--kreezby-admin-header-height,56px)!important;height:calc(100dvh - var(--kreezby-admin-header-height,56px))!important;width:min(280px,86vw)!important;min-width:min(280px,86vw)!important;max-width:min(280px,86vw)!important;transform:translateX(-110%)!important;z-index:1400!important}body.kreezby-nav-open aside.dark-sidebar-panel{transform:translateX(0)!important;pointer-events:auto!important;visibility:visible!important}}',

        '.kreezby-sidebar-nav-item.is-active,.kreezby-sidebar-nav-item.is-active:hover{background:#ffca28!important;color:#1f1f1f!important;box-shadow:inset 4px 0 0 #e6a800!important}.kreezby-sidebar-nav-item.is-active .kreezby-sidebar-nav-label{color:#1f1f1f!important;font-weight:800!important}.kreezby-sidebar-nav-item.is-active .kreezby-sidebar-nav-icon svg,.kreezby-sidebar-nav-item.is-active .kreezby-sidebar-nav-icon svg *{stroke:#1f1f1f!important}',

        '.kreezby-sidebar-sub{margin:0 8px 8px 0!important}',

        '.kreezby-sidebar-sub a{display:flex!important;align-items:center!important;min-height:36px!important;padding:8px 10px 8px 48px!important}'

    ].join('');



    function assetPrefix() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (/\/admin_names\/[^/]+\//i.test(path) || /\/staff_names\/[^/]+\//i.test(path)) return '../../';
        return '../';
    }

    function isAdminPage() {

        var path = (location.pathname || '').replace(/\\/g, '/');
        if (/\/admin_names\//i.test(path)) return true;
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
        if (href === 'inquiries.html') return 'inquiries-headadmin.html';
        if (href === 'index.html') return href;
        return String(href || '').replace(/-admin\.html(?=$|[?#])/i, '-headadmin.html');
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
            pt.href = assetPrefix() + 'css/shared/kreezby-turbo-nav.css';
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
            mobile.href = assetPrefix() + 'css/shared/kreezby-mobile.css?v=20261021menu';
            document.head.appendChild(mobile);
        }

        if (!document.getElementById('kreezby-admin-table-frame')) {
            var tables = document.createElement('link');
            tables.id = 'kreezby-admin-table-frame';
            tables.rel = 'stylesheet';
            tables.href = assetPrefix() + 'css/shared/admin-table-frame.css?v=20261005frame';
            document.head.appendChild(tables);
        }

        if (document.getElementById('kreezby-admin-icon-sidebar-style')) return;

        var link = document.createElement('link');

        link.id = 'kreezby-admin-icon-sidebar-style';

        link.rel = 'stylesheet';

        link.href = assetPrefix() + 'css/shared/admin-icon-sidebar.css?v=20261005insights';

        document.head.appendChild(link);

    }



    function ensureNotificationStoreLoaded() {

        if (!isAdminPage()) return;

        if (window.KreezbyNotifications) return;

        if (document.getElementById('kreezby-notification-store-script')) return;

        var script = document.createElement('script');

        script.id = 'kreezby-notification-store-script';

        script.src = assetPrefix() + 'js/notification-store.js?v=20261020access';

        script.defer = true;

        script.addEventListener('load', function () {
            renderAdminSidebar();
            updateNotificationBadges();
        });
        document.head.appendChild(script);

    }



    function currentFilename() {

        return (location.pathname.split('/').pop() || '').toLowerCase();

    }



    function activeKeyFor(filename) {

        if (!filename || filename === 'admin.html' || filename === 'head_admin.html') return 'dashboard';

        if (filename.indexOf('stocklevel') === 0) return 'stocklevel';

        if (filename.indexOf('deliveryschedule') === 0) return 'deliveryschedule';

        if (filename.indexOf('forecast-') === 0 || filename.indexOf('aiforecast_salesanalysis') === 0 || filename.indexOf('insight-') === 0) return 'aiforecast';


        if (filename.indexOf('bo-') === 0) return 'bo';

        if (filename.indexOf('return-') === 0) return 'return';

        if (filename.indexOf('stocks-') === 0) return 'stocks';

        if (filename.indexOf('saleslist-') === 0) return 'saleslist';

        if (filename.indexOf('pos-') === 0) return 'pos';

        if (filename.indexOf('order-tracking-') === 0) return 'ordertracking';

        if (filename.indexOf('alert-') === 0) return 'alert';

        if (filename.indexOf('profile-') === 0) return 'profile';

        if (filename.indexOf('maintenance') === 0) return 'maintenance';

        if (filename.indexOf('inbox-') === 0) return 'inbox';
        if (filename.indexOf('issue-reports-') === 0) return 'issuereports';
        if (filename === 'inquiries.html' || filename.indexOf('inquir') === 0) return 'inquiry';
        if (filename === 'admin_permissions-headadmin.html' || filename === 'admin-permissions.html' || filename === 'staff-permissions.html') return 'adminpermissions';

        return '';

    }



    function frameAttrsFor() {
        return ' data-turbo="false" data-turbo-frame="_top"';
    }

    function navItem(item, activeKey) {
        var frameAttrs = frameAttrsFor(item);
        var filename = currentFilename();
        var badge = notificationBadge(item.key);
        var childrenHtml = '';
        if (item.children && item.children.length) {
            childrenHtml = '<div class="kreezby-sidebar-sub">' + item.children.map(function (child) {
                var file = String(child.href || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
                var childTab = '';
                var currentTab = '';
                var query = String(child.href || '').split('?')[1] || '';
                var match = query.match(/(?:^|&)tab=([^&]+)/);
                if (match) childTab = decodeURIComponent(match[1]);
                try { currentTab = new URLSearchParams(location.search).get('tab') || ''; } catch (e) {}
                var on = file === filename && childTab === currentTab;
                return '<a href="' + child.href + '"' + frameAttrsFor(child) + (on ? ' aria-current="page" class="is-active"' : '') + '>' + child.label + '</a>';
            }).join('') + '</div>';
            var open = item.key === activeKey;
            return (
                '<div class="kreezby-sidebar-group' + (open ? ' is-open' : '') + '">' +
                    '<a href="' + item.href + '"' + frameAttrs + (open ? ' aria-current="page"' : '') + ' class="kreezby-sidebar-nav-item' + (open ? ' is-active' : '') + '">' +
                        '<span class="kreezby-sidebar-nav-icon" aria-hidden="true">' + (ICONS[item.icon] || '') + '</span>' +
                        '<span class="kreezby-sidebar-nav-label">' + item.label + '</span>' + badge +
                    '</a>' +
                    childrenHtml +
                '</div>'
            );
        }

        var active = item.key === activeKey;
        return (
            '<a href="' + item.href + '"' + frameAttrs + (active ? ' aria-current="page"' : '') + ' class="kreezby-sidebar-nav-item' + (active ? ' is-active' : '') + '">' +
                '<span class="kreezby-sidebar-nav-icon" aria-hidden="true">' + (ICONS[item.icon] || '') + '</span>' +
                '<span class="kreezby-sidebar-nav-label">' + item.label + '</span>' + badge +
            '</a>'
        );
    }

    function notificationBadge(taskKey) {
        var api = window.KreezbyNotifications;
        if (!api || typeof api.getUnreadCountForTask !== 'function') return '';
        var count = api.getUnreadCountForTask(taskKey);
        return count ? '<span class="kreezby-sidebar-notification-badge" data-notification-task="' + taskKey + '">' + (count > 99 ? '99+' : count) + '</span>' : '';
    }

    function updateNotificationBadges() {
        var api = window.KreezbyNotifications;
        if (!api || typeof api.getUnreadCountForTask !== 'function') return;
        document.querySelectorAll('.kreezby-sidebar-notification-badge[data-notification-task]').forEach(function (badge) {
            var count = api.getUnreadCountForTask(badge.getAttribute('data-notification-task'));
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.hidden = count === 0;
        });
    }



    function issueReportsHref() {
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        if (path.indexOf('/head_admin/') >= 0) return 'issue-reports-headadmin.html';
        if (path.indexOf('/admin_names/') >= 0) return '../../admin/issue-reports-admin.html';
        return 'issue-reports-admin.html';
    }

    function viewerHasFullAccess() {
        var api = window.KreezbyAdminPermissions;
        if (api && typeof api.isOwnerSession === 'function') return api.isOwnerSession();
        return isHeadAdminPortal();
    }

    function canSeeIssueReports() {
        if (isHeadAdminPortal() && viewerHasFullAccess()) return true;
        var api = window.KreezbyAdminPermissions;
        if (!api) return false;
        if (typeof api.isHeadAdmin === 'function' && api.isHeadAdmin()) return true;
        return api.adminCanAccessTask('issuereports');
    }

    function fullMenu() {
        return !/\/admin_names\//i.test((location.pathname || '').replace(/\\/g, '/'));
    }

    function allowedNav() {
        var items = NAV.slice();
        var api = window.KreezbyAdminPermissions;
        var openMenu = fullMenu() || viewerHasFullAccess() || isHeadAdminPortal();
        if (api && !openMenu) {
            items = items.filter(function (item) {
                if (item.key === 'dashboard') return true;
                if (item.key === 'issuereports') return canSeeIssueReports();
                return api.adminCanAccessTask(item.key);
            });
        }
        if (!items.some(function (item) { return item.key === 'issuereports'; }) && canSeeIssueReports()) {
            items.push({ key: 'issuereports', label: 'Reports', href: 'issue-reports-admin.html', icon: 'flag' });
        }
        if (openMenu && isHeadAdminPortal()) {
            items.push({ key: 'inquiry', label: 'Inquiry', href: 'inquiries-headadmin.html', icon: 'inquiry', top: true });
            items.push({ key: 'adminpermissions', label: 'Users', href: 'admin_permissions-headadmin.html', icon: 'users', top: true });
            items.push({ key: 'profile', label: 'Profile', href: 'profile-headadmin.html', icon: 'users', top: true });
            items.push({ key: 'maintenance', label: 'Settings', href: 'maintenance-headadmin.html', icon: 'gear' });
        } else if (openMenu) {
            items.push({ key: 'maintenance', label: 'Users', href: 'maintenance-admin.html', icon: 'users' });
            items.push({ key: 'profile', label: 'Settings', href: 'profile-admin.html', icon: 'gear', top: true });
        } else {
            items.push({ key: 'profile', label: 'Settings', href: 'profile-admin.html', icon: 'gear', top: true });
        }
        return items.map(function (item) {
            var next = {
                key: item.key,
                label: item.label,
                href: item.key === 'issuereports' ? issueReportsHref() : portalHref(item.href),
                icon: item.icon,
                top: item.top
            };
            if (item.children) {
                next.children = item.children.map(function (child) {
                    return {
                        key: child.key,
                        label: child.label,
                        href: portalHref(child.href)
                    };
                });
            }
            return next;
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



    function syncHeaderOffset() {
        var header = document.querySelector('header.top-navbar-node');
        if (!header) return;
        var height = Math.ceil(header.getBoundingClientRect().height);
        if (height > 0) document.documentElement.style.setProperty('--kreezby-admin-header-height', height + 'px');
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

        updateNotificationBadges();
        syncHeaderOffset();

        document.dispatchEvent(new CustomEvent('kreezby-admin-sidebar-ready'));

    }



    if (isAdminPage()) {

        ensureCriticalCss();
        ensureNavSmooth();

        ensureCss();

        ensureNotificationStoreLoaded();
        document.addEventListener('kreezby:notification-change', updateNotificationBadges);
        window.addEventListener('load', updateNotificationBadges);

    }



    function bootSidebar() {

        if (document.readyState === 'loading') {

            document.addEventListener('DOMContentLoaded', renderAdminSidebar);

        } else {

            renderAdminSidebar();

        }

        document.addEventListener('kreezby:page-load', renderAdminSidebar);
        document.addEventListener('kreezby-admin-permissions-ready', renderAdminSidebar);
        window.addEventListener('resize', syncHeaderOffset);
        window.addEventListener('load', syncHeaderOffset);

    }



    bootSidebar();



    function ensureDeliverySchedule() {
        if (window.KreezbyDeliverySchedule) {
            window.KreezbyDeliverySchedule.boot();
            return;
        }
        if (document.getElementById('kreezby-delivery-schedule-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-delivery-schedule-script';
        s.src = assetPrefix() + 'js/delivery-schedule.js?v=20261020sched';
        s.onload = function () {
            if (window.KreezbyDeliverySchedule) window.KreezbyDeliverySchedule.boot();
        };
        document.body.appendChild(s);
    }

    ensureDeliverySchedule();
    document.addEventListener('kreezby:page-load', ensureDeliverySchedule);

    window.KreezbyAdminSidebar = { render: renderAdminSidebar, NAV: NAV };

})();
