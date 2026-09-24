/**
 * Canonical staff sidebar — icon nav with collapse (staff module pages).
 * Respects per-staff task permissions from staff-permissions.js.
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
        calendar: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
        chart: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/></svg>',
        bell: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
        activity: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
        mail: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        report: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
        clipboard: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h5"/></svg>',
        truck: '<svg viewBox="0 0 24 24"' + SVG_ATTRS + '><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
    };

    var TASK_ICONS = {
        dashboard: 'home',
        po: 'cart',
        receive: 'package',
        bo: 'layers',
        return: 'return',
        stocks: 'boxes',
        saleslist: 'sales',
        dailysales: 'calendar',
        aiforecast: 'chart',
        alert: 'bell',
        stocklevel: 'activity',
        inventoryreport: 'report',
        ordertracking: 'truck',
        inbox: 'mail'
    };

    var FALLBACK_NAV = [
        { key: 'dashboard', label: 'Dashboard', href: 'staff-1.html', icon: 'home' },
        { key: 'po', label: 'Purchase Order', href: 'po-staff.html', icon: 'cart' },
        { key: 'receive', label: 'Receiving', href: 'receive-staff.html', icon: 'package' },
        { key: 'bo', label: 'Back Order', href: 'bo-staff.html', icon: 'layers' },
        { key: 'return', label: 'Return/P.O List', href: 'return-staff.html', icon: 'return' },
        { key: 'stocks', label: 'Stocks', href: 'stocks-staff.html', icon: 'boxes' },
        { key: 'saleslist', label: 'Sales List', href: 'saleslist-staff.html', icon: 'sales' },
        { key: 'aiforecast', label: 'AI Forecast', href: 'aiforecast-staff.html', icon: 'chart' },
        { key: 'alert', label: 'Alert', href: 'alert-staff.html', icon: 'bell' },
        { key: 'stocklevel', label: 'Stock Level', href: 'stocklevel-staff.html', icon: 'activity' },
        { key: 'issuereports', label: 'Issue Reports', href: '../it_kreezby/index.html', icon: 'clipboard' }
    ];

    var CRITICAL_CSS = [
        'aside.dark-sidebar-panel{overflow:hidden!important;flex-shrink:0!important}',
        'aside.dark-sidebar-panel:not(.kreezby-sidebar-ready){width:256px!important;min-width:256px!important;max-width:256px!important;background:#424242!important}',
        'body.sidebar-collapsed aside.dark-sidebar-panel:not(.kreezby-sidebar-ready){width:64px!important;min-width:64px!important;max-width:64px!important}',
        'aside.dark-sidebar-panel svg{width:18px!important;height:18px!important;max-width:18px!important;max-height:18px!important;display:block!important}',
        'turbo-frame#kreezby-main-content,.kreezby-turbo-main{display:flex!important;flex:1 1 0%!important;flex-grow:1!important;min-width:0!important;max-width:none!important;width:auto!important}',
        'turbo-frame#kreezby-main-content main.workspace-view-canvas,.kreezby-turbo-main main.workspace-view-canvas{flex:1 1 auto!important;width:100%!important;min-width:0!important;max-width:100%!important}'
    ].join('');

    function isStaffDarkSidebarPage() {
        if (!document.querySelector('aside.dark-sidebar-panel')) return false;
        var path = (location.pathname || '').replace(/\\/g, '/');
        var file = currentFilename();
        return /\/staff\//i.test(path) || /-staff\.html$/i.test(file) || /^staff-\d+\.html$/i.test(file);
    }

    function moduleRoot() {
        return '../';
    }

    function ensureCriticalCss() {
        if (document.getElementById('kreezby-staff-icon-sidebar-critical')) return;
        var style = document.createElement('style');
        style.id = 'kreezby-staff-icon-sidebar-critical';
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
            pt.href = moduleRoot() + 'css/shared/kreezby-turbo-nav.css';
            (document.head || document.documentElement).appendChild(pt);
        }
    }

    function ensureCss() {
        ensureCriticalCss();
        ensureNavSmooth();
        if (document.getElementById('kreezby-staff-icon-sidebar-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-staff-icon-sidebar-style';
        link.rel = 'stylesheet';
        link.href = moduleRoot() + 'css/shared/admin-icon-sidebar.css';
        document.head.appendChild(link);
    }

    function currentFilename() {
        return (location.pathname.split('/').pop() || '').toLowerCase();
    }

    function isInboxHref(href) {
        return /inbox/i.test((href || '').split('/').pop());
    }

    function isIssueReportsHref(href) {
        return /it_kreezby|report_issue-received-students/i.test(href || '');
    }

    function turboAttrs(href) {
        if (isInboxHref(href) || isIssueReportsHref(href)) return ' data-turbo-frame="_top"';
        if (document.getElementById('kreezby-main-content')) {
            return ' data-turbo-frame="kreezby-main-content" data-turbo-action="advance"';
        }
        return '';
    }

    function buildNavItems() {
        var api = window.KreezbyStaffPermissions;
        if (!api) return FALLBACK_NAV.slice();

        var staffId = api.getCurrentStaffId();
        var allowed = api.getStaffTasks(staffId);
        var dashboardHref = api.getDashboardHref(staffId);
        var items = [];

        var taskOrder = api.TASK_ORDER || [
            'dashboard', 'po', 'receive', 'bo', 'return', 'stocks',
            'saleslist', 'dailysales', 'aiforecast', 'alert', 'ordertracking',
            'stocklevel', 'inventoryreport', 'inbox', 'inbox_retailer'
        ];

        taskOrder.forEach(function (taskKey) {
            if (allowed.indexOf(taskKey) === -1) return;
            if (taskKey === 'inbox' || taskKey === 'inbox_retailer') return;
            var task = api.TASKS[taskKey];
            if (!task) return;
            if (taskKey !== 'dashboard' && !task.page) return;

            var href = taskKey === 'dashboard' ? dashboardHref : task.page;

            items.push({
                key: taskKey,
                label: task.label,
                href: href,
                icon: TASK_ICONS[taskKey] || 'home'
            });
        });

        return items.length ? items.concat([{
            key: 'issuereports',
            label: 'Issue Reports',
            href: '../it_kreezby/index.html',
            icon: 'clipboard'
        }]) : FALLBACK_NAV.slice();
    }

    function activeKeyFor(filename) {
        if (!filename || /^staff-\d+\.html$/.test(filename)) return 'dashboard';
        if (filename === 'inbox-staff.html') return '';
        if (/^inbox-staff-\d+\.html$/.test(filename)) return '';
        if (filename.indexOf('stocklevel') === 0) return 'stocklevel';
        if (filename.indexOf('aiforecast') === 0) return 'aiforecast';
        if (filename === 'po-staff.html') return 'po';
        if (filename === 'receive-staff.html') return 'receive';
        if (filename === 'bo-staff.html') return 'bo';
        if (filename === 'return-staff.html') return 'return';
        if (filename === 'stocks-staff.html') return 'stocks';
        if (filename === 'saleslist-staff.html') return 'saleslist';
        if (filename === 'alert-staff.html') return 'alert';
        if (filename === 'dailysales-staff.html') return 'dailysales';
        if (filename === 'inventoryreport-staff.html') return 'inventoryreport';
        if (filename === 'order-tracking-staff.html') return 'ordertracking';
        if (filename === 'report_issue-received-students.html') return 'issuereports';
        return '';
    }

    function navItem(item, activeKey) {
        var active = item.key === activeKey;
        return (
            '<a href="' + item.href + '"' + turboAttrs(item.href) +
            ' class="kreezby-sidebar-nav-item' + (active ? ' is-active' : '') + '">' +
                '<span class="kreezby-sidebar-nav-icon" aria-hidden="true">' + (ICONS[item.icon] || ICONS.home) + '</span>' +
                '<span class="kreezby-sidebar-nav-label">' + item.label + '</span>' +
            '</a>'
        );
    }

    function buildSidebarHtml(activeKey) {
        var items = buildNavItems();
        return '<nav class="kreezby-sidebar-nav" aria-label="Staff modules">' +
            items.map(function (item) { return navItem(item, activeKey); }).join('') +
        '</nav>';
    }

    function renderStaffSidebar() {
        var asides = document.querySelectorAll('aside.dark-sidebar-panel');
        if (!asides.length) return;
        if (!isStaffDarkSidebarPage()) return;

        ensureCss();
        var activeKey = activeKeyFor(currentFilename());

        asides.forEach(function (aside) {
            aside.classList.add('kreezby-icon-sidebar');
            try {
                aside.innerHTML = buildSidebarHtml(activeKey);
            } catch (err) {
                aside.innerHTML = '<nav class="kreezby-sidebar-nav" aria-label="Staff modules"></nav>';
            }
            aside.classList.add('kreezby-sidebar-ready');
        });

        document.dispatchEvent(new CustomEvent('kreezby-staff-sidebar-ready'));
        document.dispatchEvent(new CustomEvent('kreezby-admin-sidebar-ready'));
    }

    if (isStaffDarkSidebarPage()) {
        ensureCriticalCss();
        ensureNavSmooth();
        ensureCss();
    }

    function bootSidebar() {
        function run() {
            renderStaffSidebar();
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
        window.addEventListener('load', run);
        document.addEventListener('kreezby:page-load', run);
        document.addEventListener('kreezby-staff-permissions-ready', run);
    }

    bootSidebar();

    window.KreezbyStaffSidebar = { render: renderStaffSidebar, buildNavItems: buildNavItems };
})();
