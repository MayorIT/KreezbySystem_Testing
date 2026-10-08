/**
 * Phone chrome for customer pages: search, categories, bottom tabs.
 */
(function () {
    'use strict';

    if (window.KreezbyPhoneShopLoaded) return;
    window.KreezbyPhoneShopLoaded = true;

    var SEARCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    var TAB_ICONS = {
        home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>',
        mall: '<svg viewBox="0 0 24 24"><path d="M4 7h16v13H4z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg>',
        help: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        cart: '<svg viewBox="0 0 24 24"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>',
        me: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>'
    };
    var CAT_ICONS = {
        pouch: '<svg viewBox="0 0 24 24"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>',
        jar: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="13" rx="2"/><path d="M9 7V5h6v2"/><path d="M9 12h6"/></svg>',
        deals: '<svg viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.9 4.9 2.8 2.8"/><path d="m16.3 16.3 2.8 2.8"/><circle cx="12" cy="12" r="4"/></svg>',
        help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17h.01"/></svg>'
    };

    function fileName() {
        return ((location.pathname || '').split('/').pop() || '').toLowerCase().split('?')[0];
    }

    function isCustomerPage() {
        return /\/customer\//i.test(location.pathname || '');
    }

    function isShopPage() {
        var file = fileName();
        return file === 'customer.html' || file === 'customer_guest.html' || file === '';
    }

    function isGuest() {
        return fileName() === 'customer_guest.html';
    }

    function shopHref() {
        return isGuest() ? 'customer_guest.html' : 'customer.html';
    }

    function ensureCss() {
        if (document.getElementById('kreezby-customer-phone-shop-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-customer-phone-shop-style';
        link.rel = 'stylesheet';
        link.href = '../css/shared/customer-phone-shop.css?v=20260925phone4';
        document.head.appendChild(link);
        requestAnimationFrame(function () {
            document.head.appendChild(link);
        });
    }

    function ensureSearch() {
        if (!isShopPage()) return;
        var header = document.querySelector('header, .site-header, .top-navbar-node');
        if (!header || header.querySelector('.shop-search')) return;

        var label = document.createElement('label');
        label.className = 'shop-search';
        label.setAttribute('aria-label', 'Search products');
        label.innerHTML = SEARCH_SVG + '<input type="search" placeholder="Search Kreezby crinkles" autocomplete="off">';

        var logo = header.querySelector('.logo-area, .brand-logo-panel');
        if (logo && logo.nextSibling) header.insertBefore(label, logo.nextSibling);
        else header.insertBefore(label, header.firstChild);

        var input = label.querySelector('input');
        input.addEventListener('input', function () {
            filterCards(input.value);
        });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                var first = document.querySelector('.shop-category__grid .flavor-card:not([hidden])');
                if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    function filterCards(query) {
        var q = String(query || '').trim().toLowerCase();
        document.querySelectorAll('.shop-category').forEach(function (section) {
            var any = false;
            section.querySelectorAll('.flavor-card').forEach(function (card) {
                var title = ((card.querySelector('.flavor-card__title') || {}).textContent || '').toLowerCase();
                var variant = ((card.querySelector('.flavor-card__description') || {}).textContent || '').toLowerCase();
                var show = !q || title.indexOf(q) >= 0 || variant.indexOf(q) >= 0;
                card.hidden = !show;
                card.style.display = show ? '' : 'none';
                if (show) any = true;
            });
            section.style.display = any || !q ? '' : 'none';
        });
    }

    function ensureCategories() {
        if (!isShopPage()) return;
        if (document.querySelector('.shop-cats')) return;
        var host = document.querySelector('.content-workspace') || document.querySelector('.main-layout');
        if (!host) return;

        var nav = document.createElement('nav');
        nav.className = 'shop-cats';
        nav.setAttribute('aria-label', 'Shop shortcuts');
        nav.innerHTML =
            catButton('pouch', 'Pouches', '.shop-category--pouch-favorites') +
            catButton('jar', 'Jars', '.shop-category--jar-specials') +
            catButton('deals', 'Deals', '.pricing-banner') +
            catButton('help', 'Help', isGuest() ? '../auth/log_in.html' : 'inbox-customer.html');
        host.insertBefore(nav, host.firstChild);

        nav.addEventListener('click', function (event) {
            var btn = event.target.closest('button[data-jump]');
            if (!btn) return;
            var jump = btn.getAttribute('data-jump') || '';
            if (jump.indexOf('.html') >= 0) {
                location.href = jump;
                return;
            }
            var target = document.querySelector(jump);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            nav.querySelectorAll('button').forEach(function (el) {
                el.classList.toggle('is-active', el === btn);
            });
        });
    }

    function catButton(key, label, jump) {
        return '<button type="button" data-jump="' + jump + '">' +
            '<span class="shop-cats__icon">' + (CAT_ICONS[key] || '') + '</span>' +
            '<span>' + label + '</span></button>';
    }

    function ensureTabbar() {
        if (document.querySelector('.shop-tabbar')) return;

        var file = fileName();
        var homeHref = shopHref();
        var helpHref = isGuest() ? '../auth/log_in.html' : 'inbox-customer.html';
        var meHref = isGuest() ? '../auth/log_in.html' : '';
        var onShop = isShopPage();
        var onHelp = file === 'inbox-customer.html' || file === 'report_issue-customer.html';
        var onCheckout = file === 'checkout-customer.html';

        var nav = document.createElement('nav');
        nav.className = 'shop-tabbar';
        nav.setAttribute('aria-label', 'Customer shortcuts');
        nav.innerHTML =
            tabLink('home', 'Home', homeHref, onShop) +
            tabLink('mall', 'Shop', homeHref + '#catalog-heading', false) +
            tabLink('help', 'Help', helpHref, onHelp) +
            tabButton('cart', 'Cart', onCheckout) +
            tabLink('me', 'Me', meHref, false);

        document.body.appendChild(nav);

        nav.addEventListener('click', function (event) {
            var cartBtn = event.target.closest('[data-shop-cart]');
            if (cartBtn) {
                event.preventDefault();
                if (typeof window.toggleCartSidebar === 'function') {
                    window.toggleCartSidebar();
                } else if (file !== 'checkout-customer.html') {
                    location.href = isGuest() ? '../auth/log_in.html' : 'checkout-customer.html';
                }
                return;
            }
            var meBtn = event.target.closest('[data-shop-me]');
            if (meBtn) {
                event.preventDefault();
                if (isGuest()) {
                    location.href = '../auth/log_in.html';
                    return;
                }
                var profile = document.querySelector('.profile-trigger-btn, [data-nav="profile"]');
                if (profile) profile.click();
                else if (typeof window.openModal === 'function') window.openModal('profile-settings-modal');
            }
        });
    }

    function tabLink(key, label, href, active) {
        var extra = key === 'me' && !href ? ' data-shop-me' : '';
        var tag = key === 'me' && !href ? 'button type="button"' : 'a href="' + href + '"';
        var close = key === 'me' && !href ? '</button>' : '</a>';
        return '<' + tag + extra + ' class="' + (active ? 'is-active' : '') + '">' +
            TAB_ICONS[key] + '<span>' + label + '</span>' + close;
    }

    function tabButton(key, label, active) {
        return '<button type="button" data-shop-cart class="' + (active ? 'is-active' : '') + '">' +
            TAB_ICONS[key] + '<span>' + label + '</span>' +
            '<span class="shop-tabbar__badge" id="shop-cart-badge" hidden>0</span></button>';
    }

    function syncCartBadge() {
        var badge = document.getElementById('shop-cart-badge');
        var source = document.getElementById('global-cart-count');
        if (!badge) return;
        var text = source && !source.hidden ? (source.textContent || '').trim() : '';
        var count = parseInt(text, 10);
        if (!count) {
            try {
                var cart = JSON.parse(localStorage.getItem('kreezbyCart') || '[]');
                count = Array.isArray(cart) ? cart.reduce(function (sum, item) {
                    return sum + (Number(item.qty || item.quantity) || 0);
                }, 0) : 0;
            } catch (e) {
                count = 0;
            }
        }
        if (count > 0) {
            badge.hidden = false;
            badge.textContent = String(count);
        } else {
            badge.hidden = true;
        }
    }

    function ensurePageTitle() {
        if (isShopPage()) {
            document.documentElement.classList.add('kreezby-phone-shop-home');
            document.body.classList.add('kreezby-phone-shop-home');
            return;
        }
        var header = document.querySelector('header, .site-header, .top-navbar-node, .customer-inbox-header, .customer-report-header');
        if (!header || header.querySelector('.shop-page-title')) return;
        var titles = {
            'checkout-customer.html': 'Checkout',
            'inbox-customer.html': 'Help',
            'report_issue-customer.html': 'Report Issue',
            'become-a-partner.html': 'Partner'
        };
        var title = titles[fileName()];
        if (!title) return;
        var el = document.createElement('div');
        el.className = 'shop-page-title';
        el.textContent = title;
        var logo = header.querySelector('.logo-area, .brand-logo-panel');
        var back = header.querySelector('.back-btn');
        if (logo && logo.nextSibling) header.insertBefore(el, logo.nextSibling);
        else if (back) header.insertBefore(el, back);
        else header.insertBefore(el, header.firstChild);
    }

    function boot() {
        if (!isCustomerPage()) return;
        document.documentElement.classList.add('kreezby-phone-shop');
        document.body.classList.add('kreezby-phone-shop');
        ensureCss();
        ensurePageTitle();
        ensureSearch();
        ensureCategories();
        ensureTabbar();
        syncCartBadge();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    document.addEventListener('kreezby:page-load', boot);
    window.addEventListener('storage', syncCartBadge);
    setInterval(syncCartBadge, 1500);
})();
