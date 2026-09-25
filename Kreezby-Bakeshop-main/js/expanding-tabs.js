/**
 * HTML port of components/ui/expanding-tabs.tsx
 * Icon-only inactive tabs expand to reveal their label.
 */
(function () {
    'use strict';

    if (window.KreezbyExpandingTabsLoaded) return;
    window.KreezbyExpandingTabsLoaded = true;

    var CSS_ID = 'kreezby-expanding-tabs-style';
    var CSS_HREF = 'css/shared/expanding-tabs.css?v=20260925sm';

    var LIST_SELECTOR = [
        '.auth-tabs',
        '.po-order-tabs',
        '.bo-order-tabs',
        '.modal-tabs',
        '.forecast-sub-tabs-row',
        '.maintenance-directory-tabs-row',
        '.report-highlights',
        '.ai-filter-pills',
        '#ai-filter-pills',
        '#stocklevel-filter-pills',
        '.notifications-filter-group'
    ].join(',');

    var TAB_SELECTOR = [
        '.po-order-tab',
        '.bo-order-tab',
        '.auth-tab',
        '.tab-link',
        '.forecast-tab-link',
        '.maintenance-tab-link',
        '.report-highlight-chip',
        '.pill',
        '.notification-filter-btn'
    ].join(',');

    var ICONS = {
        envelope: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
        calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
        bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
        search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
        user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>',
        users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M2.5 19c1-3.2 3.6-5 6.5-5s5.5 1.8 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M15.2 19c.4-1.8 1.6-3.2 3.3-4"/></svg>',
        lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
        store: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9 5 4h14l2 5"/><path d="M3 9h18v11H3z"/><path d="M9 20v-6h6v6"/></svg>',
        truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v10H3z"/><path d="M14 11h4l3 3v3h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
        package: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8 12 3l9 5v11l-9 5-9-5z"/><path d="M12 13V3M3 8l9 5 9-5"/></svg>',
        map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13.5 9.5 18 19 7"/></svg>',
        clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>',
        star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 14.7 9l6 .9-4.4 4.3 1 5.9L12 17.8 6.7 20.1l1-5.9L3.3 9.9 9.3 9z"/></svg>',
        list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h13M8 12h13M8 17h13"/><circle cx="4" cy="7" r="1.2"/><circle cx="4" cy="12" r="1.2"/><circle cx="4" cy="17" r="1.2"/></svg>',
        chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M7 16v-5M12 16V7M17 16v-8"/></svg>',
        trend: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 10 11l4 4 7-8"/><path d="M15 7h6v6"/></svg>',
        trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 5M16 6h3a3 3 0 0 1-3 5"/><path d="M12 14v3M8 21h8"/></svg>',
        spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M12 17v4M4.9 6.5l2.8 2.8M16.3 14.7l2.8 2.8M3 12h4M17 12h4M4.9 17.5l2.8-2.8M16.3 9.3l2.8-2.8"/></svg>',
        gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"/></svg>',
        card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/></svg>',
        inbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
        cookie: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="14" cy="9" r="1"/><circle cx="13" cy="14" r="1"/></svg>',
        default: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>'
    };

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

    function ensureCss() {
        if (document.getElementById(CSS_ID)) return;
        var link = document.createElement('link');
        link.id = CSS_ID;
        link.rel = 'stylesheet';
        link.href = moduleRelativeRoot() + CSS_HREF;
        document.head.appendChild(link);
    }

    function pickIcon(label, el) {
        var text = String(label || '').toLowerCase();
        var href = ((el && el.getAttribute('href')) || '').toLowerCase();
        var key = ((el && (el.getAttribute('data-tab') || el.getAttribute('data-auth-tab') || el.getAttribute('data-key') || el.getAttribute('data-filter') || el.getAttribute('data-status-filter') || el.getAttribute('data-issue-type'))) || '').toLowerCase();
        var blob = text + ' ' + href + ' ' + key;

        if (/log\s*in|sign\s*in|login/.test(blob)) return ICONS.lock;
        if (/sign\s*up|create account/.test(blob)) return ICONS.users;
        if (/retailer/.test(blob)) return ICONS.store;
        if (/customer|profile/.test(blob)) return ICONS.user;
        if (/supplier|wholesaler/.test(blob)) return ICONS.truck;
        if (/address/.test(blob)) return ICONS.map;
        if (/password|security/.test(blob)) return ICONS.lock;
        if (/all (order|ticket)/.test(blob) || blob.indexOf('all ') === 0) return ICONS.list;
        if (/process/.test(blob)) return ICONS.clock;
        if (/ship|dispatch|delivery/.test(blob)) return ICONS.truck;
        if (/complete|resolved/.test(blob)) return ICONS.check;
        if (/review|favorite|star/.test(blob)) return ICONS.star;
        if (/inbox|mail/.test(blob)) return ICONS.inbox;
        if (/calendar/.test(blob)) return ICONS.calendar;
        if (/alert|bell/.test(blob)) return ICONS.bell;
        if (/search/.test(blob)) return ICONS.search;
        if (/outlook|forecast|spark/.test(blob)) return ICONS.spark;
        if (/trend/.test(blob)) return ICONS.trend;
        if (/sales|analysis|chart/.test(blob)) return ICONS.chart;
        if (/inventory|stock|item list/.test(blob)) return ICONS.package;
        if (/best selling|trophy/.test(blob)) return ICONS.trophy;
        if (/setting/.test(blob)) return ICONS.gear;
        if (/new\b/.test(blob)) return ICONS.spark;
        if (/progress/.test(blob)) return ICONS.clock;
        if (/order concern|order status/.test(blob)) return ICONS.package;
        if (/payment|refund/.test(blob)) return ICONS.card;
        if (/quality|product/.test(blob)) return ICONS.cookie;
        if (/crinkle/.test(blob)) return ICONS.cookie;
        if (/jar/.test(blob)) return ICONS.package;
        if (/maintenance/.test(blob)) return ICONS.gear;
        return ICONS.default;
    }

    function tabLabel(el) {
        var existing = el.querySelector('.expanding-tab__label');
        if (existing) return (existing.textContent || '').trim();
        var title = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
        var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return text || title;
    }

    function isOn(el) {
        return el.classList.contains('active')
            || el.classList.contains('is-active')
            || el.classList.contains('active-tab')
            || el.getAttribute('aria-selected') === 'true';
    }

    function enhanceTab(el) {
        if (!el || el.dataset.expandingReady === '1') return;
        var label = tabLabel(el);
        if (!label) return;

        el.dataset.expandingReady = '1';
        el.classList.add('expanding-tab');
        if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label);
        if (!el.getAttribute('role') && el.closest('[role="tablist"]')) {
            el.setAttribute('role', 'tab');
        }

        el.textContent = '';

        var icon = document.createElement('span');
        icon.className = 'expanding-tab__icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = pickIcon(label, el);

        var text = document.createElement('span');
        text.className = 'expanding-tab__label';
        text.textContent = label;

        el.appendChild(icon);
        el.appendChild(text);
    }

    function syncList(list) {
        var tabs = list.querySelectorAll('.expanding-tab');
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            var on = isOn(tab);
            if (tab.classList.contains('is-expanded') !== on) {
                tab.classList.toggle('is-expanded', on);
            }
        }
    }

    function isDarkList(list) {
        return list.classList.contains('auth-tabs')
            || !!list.closest('.auth-card, .auth-shell, .top-navbar-node');
    }

    function bindList(list) {
        if (list.dataset.expandingBound === '1') return;
        list.dataset.expandingBound = '1';

        list.addEventListener('click', function () {
            requestAnimationFrame(function () { syncList(list); });
        });

        if (typeof MutationObserver === 'undefined') return;
        var obs = new MutationObserver(function (mutations) {
            var needsEnhance = false;
            var needsSync = false;
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'childList' && m.addedNodes.length) {
                    needsEnhance = true;
                    continue;
                }
                if (m.type !== 'attributes') continue;
                var t = m.target;
                if (!t || !t.classList || !t.classList.contains('expanding-tab')) continue;
                if (m.attributeName === 'aria-selected' || isOn(t) !== t.classList.contains('is-expanded')) {
                    needsSync = true;
                }
            }
            if (needsEnhance) enhanceList(list);
            else if (needsSync) syncList(list);
        });
        obs.observe(list, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'aria-selected']
        });
    }

    function enhanceList(list) {
        if (!list) return;
        list.classList.add('expanding-tabs');
        if (isDarkList(list)) list.classList.add('expanding-tabs--on-dark');
        if (!list.getAttribute('role') && (list.classList.contains('auth-tabs') || list.classList.contains('po-order-tabs') || list.classList.contains('bo-order-tabs') || list.classList.contains('modal-tabs'))) {
            list.setAttribute('role', 'tablist');
        }

        Array.prototype.slice.call(list.querySelectorAll(TAB_SELECTOR)).forEach(enhanceTab);
        bindList(list);
        syncList(list);
    }

    function collectLists() {
        var seen = [];
        document.querySelectorAll(LIST_SELECTOR).forEach(function (el) {
            if (seen.indexOf(el) < 0) seen.push(el);
        });
        document.querySelectorAll('.forecast-tab-link, .maintenance-tab-link').forEach(function (tab) {
            var parent = tab.parentElement;
            if (parent && seen.indexOf(parent) < 0) seen.push(parent);
        });
        return seen;
    }

    function init() {
        ensureCss();
        collectLists().forEach(enhanceList);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('kreezby:page-load', init);
    document.addEventListener('kreezby-staff-permissions-ready', init);

    window.KreezbyExpandingTabs = { init: init };
})();
