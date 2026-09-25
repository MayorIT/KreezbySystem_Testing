/**
 * Injects lucide-style icons into dashboard stat cards (admin, staff, retailer).
 */
(function () {
    'use strict';

    var SVG_ATTRS = ' width="22" height="22" viewBox="0 0 24 24" style="width:22px;height:22px;display:block"';

    var ICONS = {
        home: '<svg' + SVG_ATTRS + '><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-6h6v6"/></svg>',
        cart: '<svg' + SVG_ATTRS + '><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
        package: '<svg' + SVG_ATTRS + '><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
        layers: '<svg' + SVG_ATTRS + '><path d="m12.83 2.18 8 4.5a1 1 0 0 1 0 1.73l-8 4.5a2 2 0 0 1-2 0l-8-4.5a1 1 0 0 1 0-1.73l8-4.5a2 2 0 0 1 2 0Z"/><path d="m2.83 12.18 8 4.5a1 1 0 0 0 1 0l8-4.5"/><path d="m2.83 17.18 8 4.5a1 1 0 0 0 1 0l8-4.5"/></svg>',
        return: '<svg' + SVG_ATTRS + '><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
        boxes: '<svg' + SVG_ATTRS + '><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/><path d="m7.5 4.21 4.5 2.6 4.5-2.6"/></svg>',
        sales: '<svg' + SVG_ATTRS + '><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
        calendar: '<svg' + SVG_ATTRS + '><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
        chart: '<svg' + SVG_ATTRS + '><path d="M3 3v18h18"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-3"/></svg>',
        bell: '<svg' + SVG_ATTRS + '><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
        activity: '<svg' + SVG_ATTRS + '><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
        mail: '<svg' + SVG_ATTRS + '><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        report: '<svg' + SVG_ATTRS + '><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>',
        truck: '<svg' + SVG_ATTRS + '><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
    };

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

    function ensureCss() {
        if (document.getElementById('kreezby-dashboard-stat-icons-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-dashboard-stat-icons-style';
        link.rel = 'stylesheet';
        link.href = moduleRelativeRoot() + 'css/shared/dashboard-stat-icons.css';
        document.head.appendChild(link);
    }

    function fileFromHref(href) {
        return ((href || '').split('?')[0].split('#')[0].split('/').pop() || '').toLowerCase();
    }

    function iconForHref(href) {
        var file = fileFromHref(href);
        if (!file) return 'home';
        if (/^staff-\d+\.html$/.test(file) || /^retailer-/.test(file) || file === 'admin.html' || file === 'head_admin.html') return 'home';
        if (file === 'po-staff.html' || file === 'po-admin.html' || file.indexOf('po-') === 0) return 'cart';
        if (file === 'receive-staff.html' || file === 'receive-admin.html' || file.indexOf('receive-') === 0) return 'package';
        if (file === 'bo-staff.html' || file === 'bo-admin.html' || file.indexOf('bo-') === 0) return 'layers';
        if (file === 'return-staff.html' || file === 'return-admin.html' || file.indexOf('return-') === 0) return 'return';
        if (file === 'stocks-staff.html' || file === 'stocks-admin.html' || file.indexOf('stocks-') === 0) return 'boxes';
        if (file.indexOf('saleslist') >= 0) return 'sales';
        if (file.indexOf('dailysales') >= 0) return 'calendar';
        if (file.indexOf('aiforecast') >= 0) return 'chart';
        if (file.indexOf('inventoryreport') >= 0) return 'report';
        if (file.indexOf('stocklevel') >= 0) return 'activity';
        if (file.indexOf('alert') >= 0) return 'bell';
        if (file.indexOf('order-tracking') >= 0) return 'truck';
        if (file.indexOf('inbox') >= 0) return 'mail';
        return 'home';
    }

    function applyDashboardIcons(root) {
        var scope = root || document;
        if (!scope.querySelector) return;

        scope.querySelectorAll('.dashboard-grid .stat-card[href], a.stat-card[href]').forEach(function (card) {
            var href = card.getAttribute('href') || '';
            var key = iconForHref(href);

            card.setAttribute('data-stat-icon', key);
            card.classList.add('has-stat-icon');

            var iconEl = card.querySelector('.stat-card-icon');
            if (!iconEl) {
                iconEl = document.createElement('span');
                iconEl.className = 'stat-card-icon';
                iconEl.setAttribute('aria-hidden', 'true');
                card.insertBefore(iconEl, card.firstChild);
            }

            iconEl.innerHTML = ICONS[key] || ICONS.home;
        });
    }

    function onPageReady(event) {
        ensureCss();
        var frame = event && event.detail && event.detail.frame;
        applyDashboardIcons(frame || document);
    }

    function boot() {
        ensureCss();
        applyDashboardIcons(document);
        document.addEventListener('kreezby:page-load', onPageReady);
        document.addEventListener('turbo:frame-load', function (event) {
            if (event.target && event.target.id === 'kreezby-main-content') {
                ensureCss();
                applyDashboardIcons(event.target);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.KreezbyDashboardIcons = { apply: applyDashboardIcons, iconForHref: iconForHref };
})();
