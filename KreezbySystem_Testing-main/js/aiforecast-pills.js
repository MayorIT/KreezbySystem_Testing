(function () {
    async function fetchPanel(href) {
        try {
            var res = await fetch(href, { credentials: 'same-origin' });
            if (!res.ok) throw new Error('fetch failed');
            var text = await res.text();
            var parser = new DOMParser();
            var doc = parser.parseFromString(text, 'text/html');
            var remotePanel = doc.querySelector('.panel-data-card');
            return remotePanel ? remotePanel.innerHTML : null;
        } catch (e) {
            return null;
        }
    }

    function filenameOf(url) {
        try {
            return new URL(url, location.href).pathname.split('/').pop();
        } catch (e) {
            return url;
        }
    }

    function syncActivePills(activeHref) {
        var targetFile = activeHref
            ? filenameOf(activeHref)
            : location.pathname.split('/').pop();
        var container = document.querySelector('#ai-filter-pills');
        if (!container) return;

        container.querySelectorAll('.pill').forEach(function (pill) {
            var href = pill.getAttribute('href');
            var isActive = href && filenameOf(href) === targetFile;
            pill.classList.toggle('active', isActive);
        });
    }

    async function loadPanel(href, updateHistory) {
        var panelHTML = await fetchPanel(href);
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
        syncActivePills(href);

        if (updateHistory !== false) {
            try {
                history.pushState({ forecastPanel: href }, '', href);
            } catch (e) {}
        }

        document.dispatchEvent(new Event('content:replaced'));
        document.dispatchEvent(new Event('kreezby:page-load'));
        applySalesAnalysisFilter();
    }

    function formatCount(n) {
        return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function applyPanelFilter(panel) {
        if (!panel) return;
        var table = panel.querySelector('table');
        if (!table) return;
        var query = ((panel.querySelector('.insights-search') || {}).value || '').toLowerCase().trim();
        var size = parseInt((panel.querySelector('.insights-show') || {}).value, 10) || 10;
        var rows = Array.from(table.querySelectorAll('tbody tr'));
        var shown = 0;
        var stock = 0;
        var sales = 0;
        var forecast = 0;
        rows.forEach(function (row) {
            var match = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
            var visible = match && shown < size;
            row.hidden = !visible;
            if (!visible) return;
            shown += 1;
            var num = row.querySelector('.po-col-num');
            if (num) num.textContent = String(shown);
            stock += Number(row.getAttribute('data-stock')) || 0;
            sales += Number(row.getAttribute('data-sales')) || 0;
            forecast += Number(row.getAttribute('data-forecast')) || 0;
        });
        var count = panel.querySelector('.po-list-count');
        if (count) count.textContent = shown ? String(shown) : '';
        var totals = panel.querySelector('#sales-analysis-totals, .insights-totals');
        if (!totals) return;
        if (panel.getAttribute('data-insights-panel') !== 'sales-analysis') {
            if (!totals.getAttribute('data-default')) totals.setAttribute('data-default', totals.textContent);
            if (!shown) totals.textContent = 'No flavors match this search.';
            else if (!query && shown === rows.length) totals.textContent = totals.getAttribute('data-default');
            else totals.textContent = shown + (shown === 1 ? ' flavor' : ' flavors');
            return;
        }
        if (!shown) {
            totals.textContent = 'No flavors match this search.';
            return;
        }
        if (!query && shown === rows.length) {
            totals.textContent = '1,290 stock · 4,880 sales · 4,860 forecast · +0.4% net variance';
            return;
        }
        var net = sales ? ((forecast - sales) / sales) * 100 : 0;
        var netLabel = (net >= 0 ? '+' : '') + net.toFixed(1) + '% net variance';
        totals.textContent = formatCount(stock) + ' stock · ' + formatCount(sales) + ' sales · ' + formatCount(forecast) + ' forecast · ' + netLabel;
    }

    function applySalesAnalysisFilter() {
        var panel = document.querySelector('.insights-panel.is-active') || document.querySelector('[data-insights-panel="sales-analysis"]');
        if (panel) {
            applyPanelFilter(panel);
            return;
        }
        var table = document.getElementById('sales-analysis-table');
        if (!table) return;
        applyPanelFilter(table.closest('.insights-panel') || table.parentNode);
    }

    function requestedTab() {
        try {
            var tab = new URLSearchParams(location.search).get('tab') || '';
            if (tab === 'forecast' || tab === 'management-insight') return tab;
        } catch (e) {}
        return 'sales-analysis';
    }

    function showInsightsTab(key, updateHistory) {
        var master = document.getElementById('sales-analysis-master');
        if (!master || !master.querySelector('.insights-panel')) return false;
        if (key !== 'forecast' && key !== 'management-insight') key = 'sales-analysis';
        master.querySelectorAll('.insights-panel').forEach(function (panel) {
            var on = panel.getAttribute('data-insights-panel') === key;
            panel.classList.toggle('is-active', on);
            panel.hidden = !on;
        });
        master.querySelectorAll('#ai-filter-pills .pill').forEach(function (pill) {
            pill.classList.toggle('active', pill.getAttribute('data-key') === key);
        });
        var active = master.querySelector('.insights-panel.is-active');
        if (active) applyPanelFilter(active);
        if (updateHistory === false) return true;
        var url = 'aiforecast_salesanalysis-headadmin.html';
        if (key !== 'sales-analysis') url += '?tab=' + encodeURIComponent(key);
        try { history.pushState({ insightsTab: key }, '', url); } catch (e) {}
        return true;
    }

    function ensureAnalysisTheme() {
        if (!document.getElementById('sales-analysis-master') && !document.getElementById('ai-filter-pills')) return;
        document.body.classList.add('po-admin-page');
        var theme = document.getElementById('po-theme-sheet');
        if (!theme) {
            theme = document.querySelector('link[rel="stylesheet"][href*="po-theme.css"]');
        }
        if (!theme) {
            theme = document.createElement('link');
            theme.id = 'po-theme-sheet';
            theme.rel = 'stylesheet';
            theme.setAttribute('data-po-owned', '1');
            document.head.appendChild(theme);
        }
        theme.id = 'po-theme-sheet';
        theme.disabled = false;
        theme.href = '../css/pages/admin/po-theme.css?v=20261008layword';
    }

    function bootSalesAnalysis() {
        ensureAnalysisTheme();
        if (document.querySelector('#sales-analysis-master .insights-panel')) {
            showInsightsTab(requestedTab(), false);
            return;
        }
        syncActivePills();
        applySalesAnalysisFilter();
    }

    if (!window.__kreezbyAiPillsBound) {
        window.__kreezbyAiPillsBound = true;
        document.addEventListener('click', function (ev) {
            var target = ev.target.closest ? ev.target.closest('#ai-filter-pills .pill') : null;
            if (!target) return;
            ev.preventDefault();
            var key = target.getAttribute('data-key');
            if (key && showInsightsTab(key)) return;
            var href = target.getAttribute('href');
            if (!href) return;
            syncActivePills(href);
            loadPanel(href);
        });
        document.addEventListener('input', function (ev) {
            var field = ev.target;
            if (!field || !field.classList || !field.classList.contains('insights-search')) return;
            var panel = field.closest ? field.closest('.insights-panel') : null;
            if (panel) applyPanelFilter(panel);
        });
        document.addEventListener('change', function (ev) {
            var field = ev.target;
            if (!field || !field.classList || !field.classList.contains('insights-show')) return;
            var panel = field.closest ? field.closest('.insights-panel') : null;
            if (panel) applyPanelFilter(panel);
        });
        window.addEventListener('popstate', function () {
            if (document.querySelector('#sales-analysis-master .insights-panel')) {
                showInsightsTab(requestedTab(), false);
                return;
            }
            if (!document.querySelector('#ai-filter-pills')) return;
            syncActivePills();
            loadPanel(location.pathname + location.search, false);
        });
        document.addEventListener('kreezby:page-load', bootSalesAnalysis);
    }

    window.KreezbyAiForecastPills = { boot: bootSalesAnalysis, loadPanel: loadPanel, filter: applySalesAnalysisFilter };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootSalesAnalysis);
    } else {
        bootSalesAnalysis();
    }
})();
