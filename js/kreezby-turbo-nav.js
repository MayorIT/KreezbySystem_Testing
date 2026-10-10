/**
 * Facebook-style navigation: Turbo Frame swaps main content only.
 * Header + sidebar stay put; content crossfades smoothly.
 */
(function () {
    'use strict';

    if (window.KreezbyTurboNavLoaded) return;

    var FRAME_ID = 'kreezby-main-content';
    var TURBO_SRC = 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.13/dist/turbo.es2017-umd.js';

    function moduleRelativeRoot() {
        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'admin_names', 'staff_names', 'retailer', 'customer', 'auth', 'head_admin'];
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

    function ensureMeta() {
        if (!document.querySelector('meta[name="view-transition"]')) {
            var meta = document.createElement('meta');
            meta.name = 'view-transition';
            meta.content = 'same-origin';
            (document.head || document.documentElement).appendChild(meta);
        }
    }

    function ensureNavCss() {
        if (!document.getElementById('kreezby-turbo-nav-style')) {
            var link = document.createElement('link');
            link.id = 'kreezby-turbo-nav-style';
            link.rel = 'stylesheet';
            link.href = moduleRelativeRoot() + 'css/shared/kreezby-turbo-nav.css';
            (document.head || document.documentElement).appendChild(link);
        }
        if (!document.getElementById('kreezby-mobile-style')) {
            var mobile = document.createElement('link');
            mobile.id = 'kreezby-mobile-style';
            mobile.rel = 'stylesheet';
            mobile.href = moduleRelativeRoot() + 'css/shared/kreezby-mobile.css?v=20260927sheet';
            (document.head || document.documentElement).appendChild(mobile);
        }
        if (window.KreezbyMobileLoaded || document.getElementById('kreezby-mobile-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-mobile-script';
        s.src = moduleRelativeRoot() + 'js/kreezby-mobile.js?v=20261005tabs';
        s.defer = true;
        (document.head || document.documentElement).appendChild(s);
    }

    function isModulePage() {
        return /\/(admin|head_admin|staff|retailer|customer)\//i.test(window.location.pathname || '');
    }

    function isCustomerShopPage(href) {
        try {
            var file = new URL(href || window.location.href, window.location.href).pathname.split('/').pop() || '';
            return /^(customer|customer_guest|checkout-customer)\.html$/i.test(file);
        } catch (e) {
            return /(customer|customer_guest|checkout-customer)\.html/i.test(href || '');
        }
    }

    function onRetailerArea() {
        return /\/retailer\//i.test(window.location.pathname || '');
    }

    function isRetailerAreaHref(href) {
        try {
            return /\/retailer\//i.test(new URL(href, window.location.href).pathname || '');
        } catch (e) {
            return /\/retailer\//i.test(href || '');
        }
    }

    function isInboxPage(href) {
        try {
            var file = new URL(href, window.location.href).pathname.split('/').pop() || '';
            return /inbox/i.test(file);
        } catch (e) {
            return /inbox/i.test(href || '');
        }
    }

    function isStaffInboxHref(href) {
        try {
            var file = new URL(href, window.location.href).pathname.split('/').pop() || '';
            return /^inbox-staff(-\d+)?\.html$/i.test(file);
        } catch (e) {
            return /inbox-staff(-\d+)?\.html/i.test(href || '');
        }
    }

    function isStaffDashboardHref(href) {
        try {
            var file = new URL(href, window.location.href).pathname.split('/').pop() || '';
            return file === 'staff.html' || /^staff-\d+\.html$/i.test(file);
        } catch (e) {
            return /(^|\/)staff\.html/i.test(href || '') || /staff-\d+\.html/i.test(href || '');
        }
    }

    function standaloneInboxDocument() {
        return document.documentElement.getAttribute('data-kreezby-shell') === 'inbox';
    }

    function leavingInboxForDashboard(link) {
        return standaloneInboxDocument() && isStaffDashboardHref(link && link.href);
    }

    function isReportIssuePage(href) {
        try {
            var pathName = new URL(href, window.location.href).pathname || '';
            var file = pathName.split('/').pop() || '';
            return /report_issue/i.test(file) || /it_kreezby/i.test(pathName);
        } catch (e) {
            return /report_issue/i.test(href || '') || /it_kreezby/i.test(href || '');
        }
    }

    function isHeadAdminShellPage(href) {
        try {
            var pathName = new URL(href, window.location.href).pathname || '';
            return /\/head_admin\/(index|inquiries|inquiries-headadmin|admin-permissions|admin_permissions-headadmin|staff-permissions)\.html$/i.test(pathName);
        } catch (e) {
            return /head_admin\/(index|inquiries|inquiries-headadmin|admin-permissions|admin_permissions-headadmin|staff-permissions)\.html/i.test(href || '');
        }
    }

    function shouldTurboLink(link) {
        if (!link || !link.href) return false;
        if (link.dataset.turbo === 'false') return false;
        if (onRetailerArea() && isRetailerAreaHref(link.href)) return false;
        if (isInboxPage(link.href) && !isStaffInboxHref(link.href)) return false;
        if (leavingInboxForDashboard(link)) return false;
        if (isReportIssuePage(link.href)) return false;
        if (isCustomerShopPage(link.href)) return false;
        if (isHeadAdminShellPage(link.href)) return false;
        if (link.target && link.target !== '_self') return false;
        if (link.hasAttribute('download')) return false;
        if (link.closest('.user-dropdown-menu')) return false;
        if (link.closest('.action-popup-menu')) return false;
        if (link.closest('.notification-popover-panel')) return false;
        var href = link.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#' || href.indexOf('javascript:') === 0) return false;
        if (href.indexOf('log_in') >= 0) return false;
        try {
            var url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return false;
            if (!/\.html?$/i.test(url.pathname) &&
                url.pathname.indexOf('/admin/') === -1 &&
                url.pathname.indexOf('/head_admin/') === -1 &&
                url.pathname.indexOf('/staff/') === -1 &&
                url.pathname.indexOf('/retailer/') === -1) return false;
        } catch (e) {
            return false;
        }
        return true;
    }

    function markTurboLinks(root) {
        (root || document).querySelectorAll('a[href]').forEach(function (link) {
            if (!link.href) return;

            if ((onRetailerArea() && isRetailerAreaHref(link.href)) || (isInboxPage(link.href) && !isStaffInboxHref(link.href)) || leavingInboxForDashboard(link) || isReportIssuePage(link.href) || isCustomerShopPage(link.href) || isHeadAdminShellPage(link.href)) {
                link.setAttribute('data-turbo', 'false');
                link.setAttribute('data-turbo-frame', '_top');
                link.removeAttribute('data-turbo-action');
                return;
            }

            if (!shouldTurboLink(link)) return;
            if (!document.getElementById(FRAME_ID)) return;
            link.setAttribute('data-turbo-frame', FRAME_ID);
            link.setAttribute('data-turbo-action', 'advance');
        });
    }

    function prefetchHref(href) {
        if (!href || window.__kreezbyPrefetched === undefined) window.__kreezbyPrefetched = {};
        if (window.__kreezbyPrefetched[href]) return;
        window.__kreezbyPrefetched[href] = true;
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        link.as = 'document';
        document.head.appendChild(link);
    }

    function wirePrefetch() {
        document.addEventListener('mouseover', function (e) {
            var link = e.target.closest('a[href]');
            if (!link || !shouldTurboLink(link)) return;
            prefetchHref(link.href);
        }, true);
    }

    var PAGE_MODULES = {
        'receive-admin.html': { src: 'receive-admin.js', flag: '__KreezbyReceiveAdminBooted' },
        'po-admin.html': { src: 'po-admin.js', flag: '__KreezbyPoAdminBooted' },
        'bo-admin.html': { src: 'bo-admin.js', flag: '__KreezbyBoAdminBooted' },
        'return-admin.html': { src: 'return-admin.js', flag: '__KreezbyReturnAdminBooted' },
        'receive-staff.html': { src: 'receive-admin.js', flag: '__KreezbyReceiveAdminBooted' },
        'po-staff.html': { src: 'po-admin.js', flag: '__KreezbyPoAdminBooted' },
        'bo-staff.html': { src: 'bo-admin.js', flag: '__KreezbyBoAdminBooted' },
        'return-staff.html': { src: 'return-admin.js', flag: '__KreezbyReturnAdminBooted' }
    };

    var PAGE_MODULE_PREFIXES = [
        { prefix: 'receive-', src: 'receive-admin.js', flag: '__KreezbyReceiveAdminBooted' },
        { prefix: 'po-', src: 'po-admin.js', flag: '__KreezbyPoAdminBooted' },
        { prefix: 'bo-', src: 'bo-admin.js', flag: '__KreezbyBoAdminBooted' },
        { prefix: 'return-', src: 'return-admin.js', flag: '__KreezbyReturnAdminBooted' },
        { prefix: 'stocks-', src: 'stocks-admin.js', flag: '__KreezbyStocksAdminBooted' },
        { prefix: 'order-tracking-', src: 'order-tracking.js', flag: '__KreezbyOrderTrackingBooted' }
    ];

    function currentPageName() {
        return (location.pathname.split('/').pop() || '').toLowerCase();
    }

    function resolvePageModule(page) {
        if (PAGE_MODULES[page]) return PAGE_MODULES[page];
        if (page.indexOf('retailer/') >= 0 || page.indexOf('\\retailer\\') >= 0) {
            page = page.split(/[/\\]/).pop() || page;
        }
        var i;
        for (i = 0; i < PAGE_MODULE_PREFIXES.length; i++) {
            if (page.indexOf(PAGE_MODULE_PREFIXES[i].prefix) === 0) {
                return PAGE_MODULE_PREFIXES[i];
            }
        }
        return null;
    }

    function moduleFromFrame(frame) {
        if (!frame || !frame.querySelector) return null;
        if (frame.querySelector('#alert-master')) {
            return { src: 'alert-admin.js', flag: '__KreezbyAlertAdminBooted' };
        }
        if (frame.querySelector('#stocks-master-list-panel-view')) {
            return { src: 'stocks-admin.js', flag: '__KreezbyStocksAdminBooted' };
        }
        if (frame.querySelector('#ot-master-list-panel, [data-order-tracking-page]')) {
            return { src: 'order-tracking.js', flag: '__KreezbyOrderTrackingBooted' };
        }
        if (frame.querySelector('#returns-master-list-panel-view')) {
            return { src: 'return-admin.js', flag: '__KreezbyReturnAdminBooted' };
        }
        if (frame.querySelector('#bo-master-dashboard-split-view, #bo-retailer-dashboard-view')) {
            return { src: 'bo-admin.js', flag: '__KreezbyBoAdminBooted' };
        }
        if (frame.querySelector('#po-master-lists-container-block, #po-retailer-directory-block')) {
            return { src: 'po-admin.js', flag: '__KreezbyPoAdminBooted' };
        }
        return null;
    }

    function activatePageScripts() {
        var page = currentPageName();
        var frame = document.getElementById(FRAME_ID);
        var mod = moduleFromFrame(frame) || resolvePageModule(page);
        if (!mod) return;

        if (mod.flag && window[mod.flag]) {
            try { delete window[mod.flag]; } catch (e) { window[mod.flag] = false; }
        }

        var id = 'kreezby-page-script-' + mod.src.replace(/\.js$/, '');
        var existing = document.getElementById(id);
        if (existing) existing.remove();

        var s = document.createElement('script');
        s.id = id;
        s.src = moduleRelativeRoot() + 'js/' + mod.src + '?v=' + Date.now();
        s.async = false;
        document.body.appendChild(s);
    }

    function ensureInboxStyles() {
        var frame = document.getElementById(FRAME_ID);
        if (!frame || !frame.querySelector('[data-inbox-role]')) return;

        var root = moduleRelativeRoot();
        var path = (window.location.pathname || '').toLowerCase();
        var sheets = [root + 'css/shared/inbox-chat-layout.css'];

        if (path.indexOf('/customer/') >= 0) {
            sheets.push(root + 'css/pages/customer/inbox-customer.css');
        } else if (path.indexOf('/staff/') < 0) {
            sheets.push(root + 'css/pages/admin/inbox-admin.css');
        }

        sheets.forEach(function (href) {
            var name = href.split('/').pop();
            if (document.querySelector('link[href*="' + name + '"]')) return;
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
        });
    }

    function bootStaffInbox(scope) {
        if (!/\/staff\//i.test(window.location.pathname || '')) return;
        if (!scope || !scope.querySelector('[data-inbox-role="staff"]')) return;

        function run() {
            if (window.KreezbyStaffInbox && typeof window.KreezbyStaffInbox.init === 'function') {
                window.KreezbyStaffInbox.init();
            }
        }

        if (window.KreezbyStaffInbox) {
            run();
            return;
        }

        var existing = document.getElementById('kreezby-inbox-staff-script');
        if (existing) {
            existing.addEventListener('load', run, { once: true });
            return;
        }

        var script = document.createElement('script');
        script.id = 'kreezby-inbox-staff-script';
        script.src = moduleRelativeRoot() + 'js/inbox-staff.js?v=20261005tabs2';
        script.onload = run;
        document.body.appendChild(script);
    }

    function initInboxIfNeeded(frame) {
        var scope = frame || document;
        if (!scope.querySelector('[data-inbox-role]')) return;
        ensureInboxStyles();

        function afterChat() {
            if (window.KreezbyInboxChat) {
                scope.querySelectorAll('[data-inbox-role]').forEach(function (el) {
                    if (!el.querySelector('#inbox-contact-list')) {
                        window.KreezbyInboxChat.initRoot(el);
                    }
                });
            }
            bootStaffInbox(scope);
        }

        if (!window.KreezbyInboxChat) {
            var root = moduleRelativeRoot();
            var existing = document.getElementById('kreezby-inbox-chat-script');
            if (existing) {
                existing.addEventListener('load', afterChat, { once: true });
                return;
            }
            var s = document.createElement('script');
            s.id = 'kreezby-inbox-chat-script';
            s.src = root + 'js/inbox-chat.js?v=20261009camera';
            s.onload = afterChat;
            document.body.appendChild(s);
            return;
        }

        afterChat();
    }

    function ensureStylesheet(href) {
        var name = href.split('/').pop();
        if (document.querySelector('link[rel="stylesheet"][href*="' + name + '"]')) return;
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }

    function ensurePageStyles() {
        var page = currentPageName();
        if (!page) return;
        var root = moduleRelativeRoot();
        var path = (window.location.pathname || '').toLowerCase();
        var area = 'admin';
        if (path.indexOf('/staff/') >= 0) area = 'staff';
        else if (path.indexOf('/retailer/') >= 0) area = 'retailer';

        if (page.indexOf('stocklevel') === 0) {
            var cssName = page.replace('.html', '.css');
            if (path.indexOf('/head_admin/') >= 0) {
                cssName = page.replace(/-headadmin\.html$/i, '-admin.css');
                ensureStylesheet(root + 'css/pages/admin/' + cssName);
            } else {
                ensureStylesheet(root + 'css/pages/' + area + '/' + cssName);
            }
        }

        if (area === 'retailer' && path.indexOf('/retailer/') >= 0) {
            var slug = page.replace('.html', '.css');
            var parts = path.split('/').filter(Boolean);
            var retailerIdx = -1;
            for (var ri = 0; ri < parts.length; ri++) {
                if (parts[ri].toLowerCase() === 'retailer') { retailerIdx = ri; break; }
            }
            if (retailerIdx >= 0 && parts.length > retailerIdx + 2 && parts[retailerIdx + 1].toLowerCase() !== 'portal') {
                var storeFolder = parts[retailerIdx + 2];
                ensureStylesheet(root + 'css/pages/retailer/' + storeFolder + '/' + slug);
            }
        }
    }

    function loadScript(src, id, onload) {
        var existing = document.getElementById(id);
        if (existing) {
            if (existing.getAttribute('data-kreezby-loading') === '1') {
                if (onload) existing.addEventListener('load', function () { onload(); }, { once: true });
                return;
            }
            if (onload) onload();
            return;
        }
        var s = document.createElement('script');
        s.id = id;
        s.src = src;
        s.async = true;
        s.setAttribute('data-kreezby-loading', '1');
        s.onload = function () {
            s.removeAttribute('data-kreezby-loading');
            s.setAttribute('data-loaded', '1');
            if (onload) onload();
        };
        document.body.appendChild(s);
    }

    function warmSalesList() {
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        if (!/\/(staff|admin|head_admin)\//i.test(path)) return;
        if (window.__kreezbySalesWarm) return;
        window.__kreezbySalesWarm = true;
        var root = moduleRelativeRoot();
        loadScript(root + 'js/kreezby-sales-fake-admin.js?v=20260929areas', 'kreezby-sales-fake-admin-script-d', function () {
            loadScript(root + 'js/kreezby-sales-data.js?v=20261004fast3', 'kreezby-sales-data-script-d', function () {
                loadScript(root + 'js/sales-sheet-editor.js?v=20261008sls', 'kreezby-sales-sheet-editor-script', function () {
                    loadScript(root + 'js/sales-list-renderer.js?v=20261008act', 'kreezby-sales-list-renderer-script-act', function () {
                        if (window.KreezbySales && typeof window.KreezbySales.load === 'function') {
                            window.KreezbySales.load();
                        }
                    });
                });
            });
        });
    }

    function activateStockLevel(frame) {
        var scope = frame || document;
        if (!scope.querySelector('#stocklevel-dashboard-root')) return;

        ensurePageStyles();
        var root = moduleRelativeRoot();

        function bootStockLevel() {
            if (window.KreezbyStockLevelPills) window.KreezbyStockLevelPills.boot();
            if (window.KreezbyStockLevelDashboard) window.KreezbyStockLevelDashboard.boot();
        }

        if (window.KreezbyStockLevelDashboard && window.KreezbyStockLevelPills) {
            bootStockLevel();
            return;
        }

        loadScript(root + 'js/stocklevel-dashboard.js', 'kreezby-stocklevel-dashboard-script', function () {
            loadScript(root + 'js/stocklevel-pills.js', 'kreezby-stocklevel-pills-script', bootStockLevel);
        });
    }

    function activateAiForecast(frame) {
        var scope = frame || document;
        if (!scope.querySelector('#ai-filter-pills, .forecast-pill-nav, #sales-analysis-master')) return;
        function boot() {
            if (window.KreezbyAiForecastPills && typeof window.KreezbyAiForecastPills.boot === 'function') {
                try { window.KreezbyAiForecastPills.boot(); } catch (e) {}
            }
        }
        if (window.KreezbyAiForecastPills) {
            boot();
            return;
        }
        loadScript(moduleRelativeRoot() + 'js/aiforecast-pills.js?v=20261011insights', 'kreezby-aiforecast-pills-script-word', boot);
    }

    function activateSalesList(frame) {
        var scope = frame || document;
        if (!scope.querySelector('#saleslist-retailer-page, #retailer-sales-panel, #bauan-route-sheets-wrap, #bauan-retailer-sales-tbody')) return;

        var root = moduleRelativeRoot();
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        var isAdmin = /\/admin\//i.test(path) || /\/head_admin\//i.test(path);
        var isRetailer = /\/retailer\//i.test(path);
        var wantsRouteSheet = !!scope.querySelector('#bauan-route-sheets-wrap');

        function bootSalesUi() {
            if (!window.KreezbySalesListRenderer) return;
            try {
                if (typeof window.KreezbySalesListRenderer.bindPage === 'function') {
                    window.KreezbySalesListRenderer.bindPage();
                }
                if (scope.querySelector('#saleslist-retailer-page') && window.KreezbySalesListRenderer.initRetailerSalesListPage) {
                    window.KreezbySalesListRenderer.initRetailerSalesListPage();
                } else if (scope.querySelector('#retailer-sales-panel') && window.KreezbySalesListRenderer.initRetailerPage) {
                    window.KreezbySalesListRenderer.initRetailerPage();
                }
                if (scope.querySelector('#bauan-route-sheets-wrap, #bauan-retailer-sales-tbody') && window.KreezbySalesListRenderer.initAdminStaffPage) {
                    window.KreezbySalesListRenderer.initAdminStaffPage();
                }
            } catch (e) {}
        }

        function afterDataReady() {
            var api = window.KreezbySales;
            if (api && typeof api.reload === 'function' && window.KREEZBY_ADMIN_TEST_SALES) {
                api.reload().then(bootSalesUi);
                return;
            }
            if (api && typeof api.load === 'function') {
                api.load().then(bootSalesUi);
                return;
            }
            bootSalesUi();
        }

        function loadRenderer() {
            loadScript(root + 'js/sales-sheet-editor.js?v=20261008sls', 'kreezby-sales-sheet-editor-script', function () {
                loadScript(root + 'js/sales-list-renderer.js?v=20261008act', 'kreezby-sales-list-renderer-script-act', afterDataReady);
            });
        }

        if (isRetailer && !wantsRouteSheet) {
            loadScript(root + 'js/kreezby-sales-retailer.js', 'kreezby-sales-retailer-script', loadRenderer);
            return;
        }

        function loadAdminStaffData() {
            loadScript(root + 'js/kreezby-sales-data.js?v=20261004fast3', 'kreezby-sales-data-script-d', loadRenderer);
        }

        if (isAdmin || wantsRouteSheet) {
            loadScript(root + 'js/kreezby-sales-fake-admin.js?v=20260929areas', 'kreezby-sales-fake-admin-script-d', loadAdminStaffData);
            return;
        }

        loadAdminStaffData();
    }

    function syncPurchaseOrderTheme() {
        var frame = document.getElementById(FRAME_ID);
        var onPo = !!(frame && frame.querySelector('#stocklevel-master, #alert-master, #delivery-schedule-master, #sales-analysis-master, #ai-filter-pills, #ot-master-list-panel, #saleslist-master-directory-panel-view, #stocks-master-list-panel-view, #returns-master-list-panel-view, #bo-master-dashboard-split-view, #bo-retailer-dashboard-view, #po-master-lists-container-block, #po-retailer-directory-block, #maintenance-grid-workspace-root'));
        if (!frame || !frame.querySelector('main, .workspace-view-canvas, .panel-data-card')) {
            var page = currentPageName();
            onPo = page === 'po-admin.html' || page === 'po-headadmin.html' || page === 'po-staff.html' ||
                page === 'bo-admin.html' || page === 'bo-headadmin.html' || page === 'bo-staff.html' ||
                page === 'return-admin.html' || page === 'return-headadmin.html' || page === 'return-staff.html' ||
                page === 'stocks-admin.html' || page === 'stocks-headadmin.html' || page === 'stocks-staff.html' ||
                page === 'saleslist-admin.html' || page === 'saleslist-headadmin.html' || page === 'saleslist-staff.html' ||
                page === 'order-tracking-admin.html' || page === 'order-tracking-headadmin.html' || page === 'order-tracking-staff.html' ||
                page === 'aiforecast_salesanalysis-admin.html' || page === 'aiforecast_salesanalysis-headadmin.html' || page === 'aiforecast_salesanalysis-staff.html' ||
                page === 'forecast-admin.html' || page === 'forecast-headadmin.html' || page === 'forecast-staff.html' ||
                page === 'insight-admin.html' || page === 'insight-headadmin.html' || page === 'insight-staff.html' ||
                page === 'deliveryschedule-admin.html' || page === 'deliveryschedule-headadmin.html' || page === 'deliveryschedule-staff.html' ||
                page === 'alert-admin.html' || page === 'alert-headadmin.html' || page === 'alert-staff.html' ||
                page.indexOf('stocklevel-') === 0 ||
                page === 'maintenance-admin.html' || page === 'maintenance-headadmin.html' ||
                page === 'maintenance-staff.html';
        }
        document.body.classList.toggle('po-admin-page', onPo);
        if (!onPo) {
            document.querySelectorAll('link[data-po-owned="1"]').forEach(function (link) {
                link.disabled = true;
            });
            return;
        }
        var root = moduleRelativeRoot();
        var themeHref = root + 'css/pages/admin/po-theme.css?v=20261011insight2';
        var theme = document.getElementById('po-theme-sheet');
        if (!theme) {
            theme = document.querySelector('link[rel="stylesheet"][href*="po-theme.css"]');
        }
        if (!theme) {
            theme = document.createElement('link');
            theme.id = 'po-theme-sheet';
            theme.rel = 'stylesheet';
            theme.setAttribute('data-po-owned', '1');
        }
        theme.id = 'po-theme-sheet';
        theme.disabled = false;
        theme.href = themeHref;
        document.head.appendChild(theme);
    }

    function onFrameLoad(event) {
        var frame = event.target;
        if (!frame || frame.id !== FRAME_ID) return;

        syncPurchaseOrderTheme();
        markTurboLinks(frame);
        loadScript(moduleRelativeRoot() + 'js/kreezby-seed-portal-data.js?v=20261005rnote', 'kreezby-seed-portal-data-script', function () {
            if (window.KreezbyPortalSeed) window.KreezbyPortalSeed.apply();
            activatePageScripts();
            ensurePageStyles();
            activateStockLevel(frame);
            activateAiForecast(frame);
            activateSalesList(frame);
            initInboxIfNeeded(frame);
            document.dispatchEvent(new CustomEvent('kreezby:page-load', { detail: { frame: frame } }));
            document.dispatchEvent(new CustomEvent('kreezby-admin-sidebar-ready'));
            document.dispatchEvent(new CustomEvent('kreezby-staff-sidebar-ready'));

            if (window.KreezbyMaintenanceUI && frame.querySelector('#maintenance-grid-workspace-root')) {
                try {
                    if (typeof window.KreezbyMaintenanceUI.boot === 'function') window.KreezbyMaintenanceUI.boot();
                } catch (e) {}
            }
            if (window.KreezbyActionMenu && typeof window.KreezbyActionMenu.scan === 'function') {
                try { window.KreezbyActionMenu.scan(frame); } catch (e2) {}
            }
            if (window.KreezbyDeliverySchedule && frame.querySelector('#delivery-schedule')) {
                try { window.KreezbyDeliverySchedule.boot(); } catch (e3) {}
            }
            if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.fillDashboardCounts === 'function') {
                window.KreezbyPortalSeed.fillDashboardCounts();
            }
        });
    }

    function configureTurbo() {
        if (!window.Turbo) return;

        window.KreezbyTurboNavLoaded = true;
        Turbo.config.drive.progressBarDelay = 500;

        document.addEventListener('turbo:frame-load', onFrameLoad);

        document.addEventListener('turbo:before-frame-render', function (event) {
            if (!event.target || event.target.id !== FRAME_ID) return;
            event.target.classList.add('is-kreezby-leaving');
        });

        document.addEventListener('turbo:frame-render', function (event) {
            if (!event.target || event.target.id !== FRAME_ID) return;
            event.target.classList.remove('is-kreezby-leaving');
        });

        markTurboLinks(document);
        wirePrefetch();
        warmSalesList();
    }

    function loadTurbo(callback) {
        if (window.Turbo) {
            callback();
            return;
        }
        if (document.getElementById('kreezby-turbo-script')) {
            document.getElementById('kreezby-turbo-script').addEventListener('load', callback, { once: true });
            return;
        }
        var script = document.createElement('script');
        script.id = 'kreezby-turbo-script';
        script.src = TURBO_SRC;
        script.async = false;
        script.onload = callback;
        script.onerror = function () {
            window.KreezbyTurboNavLoaded = true;
            markTurboLinks(document);
            wirePrefetch();
        };
        document.head.appendChild(script);
    }

    function boot() {
        if (!isModulePage()) return;
        if (isCustomerShopPage()) return;
        ensureMeta();
        ensureNavCss();
        loadTurbo(configureTurbo);
    }

    window.KreezbyTurboNav = {
        boot: boot,
        markLinks: markTurboLinks,
        FRAME_ID: FRAME_ID
    };

    boot();
})();
