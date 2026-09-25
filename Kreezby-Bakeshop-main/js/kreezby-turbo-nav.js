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

        var roots = ['admin', 'staff', 'retailer', 'customer', 'wholesaler', 'auth', 'head_admin'];
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
        if (document.getElementById('kreezby-turbo-nav-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-turbo-nav-style';
        link.rel = 'stylesheet';
        link.href = moduleRelativeRoot() + 'css/shared/kreezby-turbo-nav.css';
        (document.head || document.documentElement).appendChild(link);
    }

    function isModulePage() {
        return /\/(admin|head_admin|staff|retailer|customer|wholesaler)\//i.test(window.location.pathname || '');
    }

    function isCustomerShopPage(href) {
        try {
            var file = new URL(href || window.location.href, window.location.href).pathname.split('/').pop() || '';
            return /^(customer|customer_guest|checkout-customer)\.html$/i.test(file);
        } catch (e) {
            return /(customer|customer_guest|checkout-customer)\.html/i.test(href || '');
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

    function isReportIssuePage(href) {
        try {
            var pathName = new URL(href, window.location.href).pathname || '';
            var file = pathName.split('/').pop() || '';
            return /report_issue/i.test(file) || /it_kreezby/i.test(pathName);
        } catch (e) {
            return /report_issue/i.test(href || '') || /it_kreezby/i.test(href || '');
        }
    }

    function shouldTurboLink(link) {
        if (!link || !link.href) return false;
        if (link.dataset.turbo === 'false') return false;
        if (isInboxPage(link.href)) return false;
        if (isReportIssuePage(link.href)) return false;
        if (isCustomerShopPage(link.href)) return false;
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

            if (isInboxPage(link.href) || isReportIssuePage(link.href) || isCustomerShopPage(link.href)) {
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
        { prefix: 'return-', src: 'return-admin.js', flag: '__KreezbyReturnAdminBooted' }
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

    function activatePageScripts() {
        var page = currentPageName();
        var mod = resolvePageModule(page);
        if (!mod) return;

        if (mod.flag && window[mod.flag]) {
            try { delete window[mod.flag]; } catch (e) { window[mod.flag] = false; }
        }

        var id = 'kreezby-page-script-' + page.replace(/\.html$/, '');
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

        if (path.indexOf('/staff/') >= 0) {
            sheets.push(root + 'css/pages/staff/inbox-staff.css');
        } else if (path.indexOf('/customer/') >= 0) {
            sheets.push(root + 'css/pages/customer/inbox-customer.css');
        } else {
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

    function initInboxIfNeeded(frame) {
        var scope = frame || document;
        if (!scope.querySelector('[data-inbox-role]')) return;
        ensureInboxStyles();

        if (!window.KreezbyInboxChat) {
            var root = moduleRelativeRoot();
            if (document.getElementById('kreezby-inbox-chat-script')) return;
            var s = document.createElement('script');
            s.id = 'kreezby-inbox-chat-script';
            s.src = root + 'js/inbox-chat.js?v=' + Date.now();
            s.onload = function () {
                if (window.KreezbyInboxChat) window.KreezbyInboxChat.init();
            };
            document.body.appendChild(s);
            return;
        }

        scope.querySelectorAll('[data-inbox-role]').forEach(function (el) {
            if (!el.querySelector('#inbox-contact-list')) {
                window.KreezbyInboxChat.initRoot(el);
            }
        });
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
            if (retailerIdx >= 0 && parts.length > retailerIdx + 2) {
                var storeFolder = parts[retailerIdx + 2];
                ensureStylesheet(root + 'css/pages/retailer/' + storeFolder + '/' + slug);
            }
        }
    }

    function loadScript(src, id, onload) {
        if (document.getElementById(id)) {
            if (onload) onload();
            return;
        }
        var s = document.createElement('script');
        s.id = id;
        s.src = src;
        s.async = false;
        if (onload) s.onload = onload;
        document.body.appendChild(s);
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
        if (!scope.querySelector('#ai-filter-pills, .forecast-pill-nav')) return;
        if (window.KreezbyAiForecastPills && typeof window.KreezbyAiForecastPills.boot === 'function') {
            try { window.KreezbyAiForecastPills.boot(); } catch (e) {}
        }
    }

    function activateSalesList(frame) {
        var scope = frame || document;
        if (!scope.querySelector('#saleslist-retailer-page, #retailer-sales-panel, #bauan-route-sheets-wrap, #bauan-retailer-sales-tbody')) return;

        var root = moduleRelativeRoot();
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        var isAdmin = /\/admin\//i.test(path) || /\/head_admin\//i.test(path);
        var isRetailer = /\/retailer\//i.test(path);

        function bootSalesUi() {
            if (!window.KreezbySalesListRenderer) return;
            try {
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
            if (api && typeof api.reload === 'function' && isAdmin && window.KREEZBY_ADMIN_TEST_SALES) {
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
            loadScript(root + 'js/sales-sheet-editor.js?v=20260920d', 'kreezby-sales-sheet-editor-script', function () {
                loadScript(root + 'js/sales-list-renderer.js?v=20260920d', 'kreezby-sales-list-renderer-script-d', afterDataReady);
            });
        }

        if (isRetailer) {
            loadScript(root + 'js/kreezby-sales-retailer.js', 'kreezby-sales-retailer-script', loadRenderer);
            return;
        }

        function loadAdminStaffData() {
            loadScript(root + 'js/kreezby-sales-data.js?v=20260920d', 'kreezby-sales-data-script-d', loadRenderer);
        }

        if (isAdmin) {
            loadScript(root + 'js/kreezby-sales-fake-admin.js?v=20260920d', 'kreezby-sales-fake-admin-script-d', loadAdminStaffData);
            return;
        }

        loadAdminStaffData();
    }

    function onFrameLoad(event) {
        var frame = event.target;
        if (!frame || frame.id !== FRAME_ID) return;

        markTurboLinks(frame);
        loadScript(moduleRelativeRoot() + 'js/kreezby-seed-portal-data.js?v=20260924c', 'kreezby-seed-portal-data-script', function () {
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
                try { window.KreezbyMaintenanceUI.initSettingsPanel(); } catch (e) {}
            }
            if (window.KreezbyActionMenu && typeof window.KreezbyActionMenu.scan === 'function') {
                try { window.KreezbyActionMenu.scan(frame); } catch (e2) {}
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
            if (event.target.id !== FRAME_ID) return;

            var defaultRender = event.detail.render;
            if (!document.startViewTransition) return;

            event.detail.render = function (current, next) {
                return new Promise(function (resolve) {
                    document.startViewTransition(function () {
                        Promise.resolve(defaultRender(current, next)).then(resolve);
                    });
                });
            };
        });

        markTurboLinks(document);
        wirePrefetch();
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
