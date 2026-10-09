/**
 * Badge counts for the shared customer shop header on pages other than the guest shop.
 */
(function () {
    'use strict';

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function setBadge(id, count) {
        var badge = document.getElementById(id);
        if (!badge) return;
        var total = Number(count) || 0;
        badge.hidden = total <= 0;
        badge.textContent = String(total);
    }

    function syncBadges() {
        var favorites = readJson('kreezbyCustomerFavoritesV1', []);
        setBadge('favorites-trigger-badge', Array.isArray(favorites) ? favorites.length : 0);

        var cart = readJson('kreezbyCart', {});
        var units = 0;
        if (cart && typeof cart === 'object' && !Array.isArray(cart)) {
            Object.keys(cart).forEach(function (id) {
                units += Number((cart[id] && cart[id].qty) || 0);
            });
        }
        setBadge('global-cart-count', units);
    }

    function boot() {
        syncBadges();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.addEventListener('storage', syncBadges);
    window.addEventListener('pageshow', syncBadges);
})();
