/**
 * Smooth navigation — native browser transitions, no click interception.
 */
(function () {
    'use strict';

    if (window.KreezbyPageTransitionLoaded) return;
    window.KreezbyPageTransitionLoaded = true;

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

    function cleanupLegacyGlitches() {
        try { sessionStorage.removeItem('kreezby-nav-active'); } catch (e) {}
        var prep = document.getElementById('kreezby-page-enter-prep');
        if (prep) prep.remove();
        document.documentElement.classList.remove('kreezby-nav-pending');
        if (document.body) {
            document.body.classList.remove('kreezby-page-enter', 'kreezby-page-exit');
        }
        document.querySelectorAll('.kreezby-nav-overlay').forEach(function (el) {
            el.remove();
        });
    }

    function ensureViewTransitionMeta() {
        if (document.querySelector('meta[name="view-transition"]')) return;
        var meta = document.createElement('meta');
        meta.name = 'view-transition';
        meta.content = 'same-origin';
        (document.head || document.documentElement).appendChild(meta);
    }

    function ensureCss() {
        if (!document.getElementById('kreezby-page-transition-critical')) {
            var critical = document.createElement('style');
            critical.id = 'kreezby-page-transition-critical';
            critical.textContent = 'html{background-color:#f4f6f9}';
            (document.head || document.documentElement).appendChild(critical);
        }
        if (document.getElementById('kreezby-page-transition-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-page-transition-style';
        link.rel = 'stylesheet';
        link.href = moduleRelativeRoot() + 'css/shared/page-transition.css?v=20260925sm';
        (document.head || document.documentElement).appendChild(link);
    }

    function ensureMobile() {
        if (!document.getElementById('kreezby-mobile-style')) {
            var css = document.createElement('link');
            css.id = 'kreezby-mobile-style';
            css.rel = 'stylesheet';
            css.href = moduleRelativeRoot() + 'css/shared/kreezby-mobile.css?v=20260925phone9';
            (document.head || document.documentElement).appendChild(css);
        }
        if (window.KreezbyMobileLoaded || document.getElementById('kreezby-mobile-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-mobile-script';
        s.src = moduleRelativeRoot() + 'js/kreezby-mobile.js?v=20260925phone9';
        s.defer = true;
        (document.head || document.documentElement).appendChild(s);
    }

    function boot() {
        cleanupLegacyGlitches();
        ensureViewTransitionMeta();
        ensureCss();
        ensureMobile();
    }

    window.KreezbyNavSmooth = { boot: boot };

    window.KreezbyPageTransition = {
        navigateTo: function (url) {
            if (url) window.location.href = url;
        }
    };

    boot();
})();
