/**
 * Keeps wholesaler module pages linked to the active wholesaler dashboard.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezby_wholesaler_home';
    var DIRECTORY = 'wholesaler/wholesaler-directory.html';
    var DEFAULT_HOME = 'wholesaler-quezoncity_metrobulkdistributors.html';
    var PORTAL_PATTERN = /^wholesaler-[a-z0-9]+_[a-z0-9]+\.html$/i;

    function currentFile() {
        return (location.pathname || '').split('/').pop() || '';
    }

    function isWholesalerPortalPage(file) {
        return PORTAL_PATTERN.test(file);
    }

    function rememberHome(url) {
        if (!url || !isWholesalerPortalPage(url)) return;
        try {
            localStorage.setItem(STORAGE_KEY, url);
        } catch (err) { /* ignore */ }
    }

    function getStoredHome() {
        try {
            var stored = localStorage.getItem(STORAGE_KEY);
            if (stored && isWholesalerPortalPage(stored)) return stored;
        } catch (err) { /* ignore */ }
        return null;
    }

    function resolveHomeUrl() {
        var file = currentFile();
        if (isWholesalerPortalPage(file)) {
            rememberHome(file);
            return file;
        }
        return getStoredHome() || DEFAULT_HOME;
    }

    function patchHomeLinks() {
        var home = resolveHomeUrl();
        document.querySelectorAll('a.home-badge, .navigation-tree a[href^="wholesaler-"]').forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (href.indexOf('wholesaler-') === 0 && href.indexOf('wholesaler-directory') === -1) {
                if (isWholesalerPortalPage(href.split('/').pop())) return;
            }
        });
        document.querySelectorAll('a.home-badge').forEach(function (a) {
            a.setAttribute('href', home);
        });
    }

    function init() {
        var file = currentFile();
        if (isWholesalerPortalPage(file)) {
            rememberHome(file);
        }
        patchHomeLinks();
        if (window.KreezbyPortalSeed) {
            window.KreezbyPortalSeed.apply();
            if (typeof window.KreezbyPortalSeed.fillDashboardCounts === 'function') {
                window.KreezbyPortalSeed.fillDashboardCounts();
            }
            if (typeof window.KreezbyPortalSeed.fillWholesalerSales === 'function') {
                window.KreezbyPortalSeed.fillWholesalerSales();
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.KreezbyWholesalerNav = {
        DIRECTORY: DIRECTORY,
        resolveHomeUrl: resolveHomeUrl,
        rememberHome: rememberHome
    };
})();
