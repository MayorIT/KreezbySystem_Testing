/**
 * Stock Level filter pills — local view switch on the head-admin shell,
 * page swap on the older admin and staff pages.
 */
(function () {
    'use strict';

    var VIEWS = [
        { key: 'units', label: 'Total Stock Units', slug: 'stocklevel' },
        { key: 'value', label: 'Total Value of Stock', slug: 'stocklevel-value' },
        { key: 'capacity', label: 'Stock Capacity', slug: 'stocklevel-capacity' },
        { key: 'weeks', label: 'Weeks of Stock', slug: 'stocklevel-weeks' },
        { key: 'health', label: 'Stock Health', slug: 'stocklevel-health' },
        { key: 'alerts', label: 'Low Stock Alerts', slug: 'stocklevel-alerts' },
        { key: 'category', label: 'Stock by Category', slug: 'stocklevel-category' },
        { key: 'slow', label: 'Slow Moving Stock', slug: 'stocklevel-slow' },
        { key: 'chart', label: 'Stock Value vs Sales', slug: 'stocklevel-chart' }
    ];

    function roleSuffix() {
        if (location.pathname.indexOf('/staff/') !== -1) return 'staff';
        if (location.pathname.indexOf('/head_admin/') !== -1) return 'headadmin';
        return 'admin';
    }

    function hrefFor(slug) {
        return slug + '-' + roleSuffix() + '.html';
    }

    function filenameOf(url) {
        try {
            return (new URL(url, location.href)).pathname.split('/').pop();
        } catch (e) {
            return url;
        }
    }

    function requestedView() {
        try {
            var view = new URLSearchParams(location.search).get('view') || '';
            if (VIEWS.some(function (item) { return item.key === view; })) return view;
        } catch (e) {}
        var root = document.getElementById('stocklevel-dashboard-root');
        return (root && root.getAttribute('data-view')) || 'units';
    }

    function labelFor(key) {
        var found = VIEWS.filter(function (item) { return item.key === key; })[0];
        return found ? found.label : 'Stock Level';
    }

    function buildPills(container) {
        var currentFile = location.pathname.split('/').pop();
        var shell = !!document.getElementById('stocklevel-master');
        var activeKey = shell ? requestedView() : '';
        container.innerHTML = VIEWS.map(function (view) {
            var href = shell
                ? ('stocklevel-' + roleSuffix() + '.html' + (view.key === 'units' ? '' : ('?view=' + view.key)))
                : hrefFor(view.slug);
            var active = shell ? (view.key === activeKey) : (href === currentFile);
            return '<a class="pill po-order-tab' + (active ? ' active' : '') + '" href="' + href + '" data-key="' + view.key + '" role="tab">' + view.label + '</a>';
        }).join('');
    }

    function initPills() {
        document.querySelectorAll('#stocklevel-filter-pills').forEach(function (container) {
            buildPills(container);
            var pills = Array.from(container.querySelectorAll('.pill'));
            if (document.getElementById('stocklevel-master')) return;
            var currentFile = location.pathname.split('/').pop();
            var found = pills.some(function (pill) {
                return filenameOf(pill.getAttribute('href')) === currentFile;
            });
            if (!found && pills[0]) pills[0].classList.add('active');
        });
    }

    function applyRowFilter() {
        var field = document.getElementById('stocklevel-search');
        var root = document.getElementById('stocklevel-dashboard-root');
        if (!field || !root) return;
        var query = (field.value || '').toLowerCase().trim();
        var shown = 0;
        var rows = root.querySelectorAll('tbody tr');
        rows.forEach(function (row) {
            var match = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
            row.hidden = !match;
            if (match) shown += 1;
        });
        var count = document.getElementById('stocklevel-count');
        if (count) count.textContent = rows.length ? String(shown) : '';
    }

    function showView(key, updateHistory) {
        var root = document.getElementById('stocklevel-dashboard-root');
        var master = document.getElementById('stocklevel-master');
        if (!root || !master) return false;
        if (!VIEWS.some(function (item) { return item.key === key; })) key = 'units';
        root.setAttribute('data-view', key);
        master.querySelectorAll('#stocklevel-filter-pills .pill').forEach(function (pill) {
            var on = pill.getAttribute('data-key') === key;
            pill.classList.toggle('active', on);
            pill.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var title = document.getElementById('stocklevel-title');
        if (title) title.textContent = labelFor(key);
        if (window.KreezbyStockLevelDashboard && window.KreezbyStockLevelDashboard.render) {
            window.KreezbyStockLevelDashboard.render(root);
        }
        applyRowFilter();
        if (updateHistory === false) return true;
        var url = 'stocklevel-' + roleSuffix() + '.html';
        if (key !== 'units') url += '?view=' + encodeURIComponent(key);
        try { history.pushState({ stockView: key }, '', url); } catch (e) {}
        return true;
    }

    async function fetchPanel(href) {
        try {
            var res = await fetch(href, { credentials: 'same-origin' });
            if (!res.ok) throw new Error('fetch failed');
            var text = await res.text();
            var doc = new DOMParser().parseFromString(text, 'text/html');
            var remotePanel = doc.querySelector('.panel-data-card');
            return remotePanel ? remotePanel.innerHTML : null;
        } catch (e) {
            return null;
        }
    }

    function onPillClick(ev) {
        var target = ev.target && ev.target.closest ? ev.target.closest('#stocklevel-filter-pills .pill') : null;
        if (!target) return;
        var key = target.getAttribute('data-key');
        if (document.getElementById('stocklevel-master') && showView(key)) {
            ev.preventDefault();
            ev.stopPropagation();
            return;
        }
        ev.preventDefault();
        var href = target.getAttribute('href');
        if (!href) return;
        var container = document.getElementById('stocklevel-filter-pills');
        if (!container) return;
        container.querySelectorAll('.pill').forEach(function (pill) {
            pill.classList.toggle('active', pill === target);
        });
        fetchPanel(href).then(function (panelHTML) {
            if (panelHTML === null) {
                location.href = href;
                return;
            }
            var existing = document.querySelector('.panel-data-card');
            if (!existing) {
                location.href = href;
                return;
            }
            existing.innerHTML = panelHTML;
            try { history.pushState({}, '', href); } catch (e) {}
            initPills();
            document.dispatchEvent(new Event('content:replaced'));
        });
    }

    function onSearch(ev) {
        if (!ev.target || ev.target.id !== 'stocklevel-search') return;
        applyRowFilter();
    }

    function onPop() {
        if (!document.getElementById('stocklevel-master')) return;
        showView(requestedView(), false);
    }

    function wirePillClicks() {
        if (window.__kreezbyStockPillClick) document.removeEventListener('click', window.__kreezbyStockPillClick, true);
        if (window.__kreezbyStockSearch) document.removeEventListener('input', window.__kreezbyStockSearch);
        window.__kreezbyStockPillClick = onPillClick;
        window.__kreezbyStockSearch = onSearch;
        document.addEventListener('click', onPillClick, true);
        document.addEventListener('input', onSearch);
        if (!window.__kreezbyStockPop) {
            window.__kreezbyStockPop = true;
            window.addEventListener('popstate', onPop);
        }
    }

    function bootPills() {
        if (!document.querySelector('#stocklevel-filter-pills')) return;
        initPills();
        wirePillClicks();
        if (document.getElementById('stocklevel-master')) showView(requestedView(), false);
    }

    document.addEventListener('DOMContentLoaded', bootPills);
    document.addEventListener('content:replaced', bootPills);
    document.addEventListener('kreezby:page-load', bootPills);
    document.addEventListener('turbo:frame-load', function (event) {
        if (event.target && event.target.id === 'kreezby-main-content') bootPills();
    });

    window.KreezbyStockLevelPills = { boot: bootPills, init: initPills, show: showView };
})();
