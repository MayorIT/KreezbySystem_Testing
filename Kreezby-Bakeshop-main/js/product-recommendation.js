/**
 * Bake recommendation from GPT-4o mini.
 * Based on available finished products, and pending orders.
 * The API key stays on the server.
 */
(function () {
    'use strict';

    var requestId = 0;
    var startedForBody = null;

    function esc(value) {
        var node = document.createElement('div');
        node.textContent = value == null ? '' : String(value);
        return node.innerHTML;
    }

    function setBody(text) {
        var body = document.getElementById('product-recommendation-body');
        if (body) body.textContent = text;
    }

    function setBusy(busy) {
        var button = document.getElementById('product-recommendation-refresh');
        if (!button) return;
        button.disabled = busy;
        button.textContent = busy ? 'Writing…' : 'Refresh';
    }

    function panelVisible() {
        var panel = document.querySelector('[data-insights-panel="product-recommendation"]');
        if (!panel) return !!document.getElementById('product-recommendation-body');
        return !panel.hidden;
    }

    function renderTable(snapshot) {
        var host = document.getElementById('product-recommendation-table');
        if (!host) return;
        var products = (snapshot && snapshot.products) || [];
        if (!products.length) {
            host.innerHTML = '';
            return;
        }
        host.innerHTML = ''
            + '<table class="data-display-table product-recommendation-table">'
            + '<thead><tr><th>#</th><th>Flavor</th><th>Finished Stock</th><th>Pending Orders</th><th>Bake</th></tr></thead><tbody>'
            + products.map(function (row, index) {
                var bake = Number(row.suggestedBake) || 0;
                return '<tr><td class="po-col-num">' + (index + 1) + '</td>'
                    + '<td class="sa-flavor"><strong>' + esc(row.name) + '</strong></td>'
                    + '<td class="sa-num">' + esc(row.finishedStock) + '</td>'
                    + '<td class="sa-num">' + esc(row.pendingOrders) + '</td>'
                    + '<td class="sa-num">' + (bake > 0 ? ('Bake ' + esc(bake)) : 'Covered') + '</td></tr>';
            }).join('')
            + '</tbody></table>'
            + '<p class="product-recommendation-note">Based on available finished products, and pending orders.</p>';
    }

    function whenReady(done) {
        var tries = 0;
        (function tick() {
            if (window.KreezbyDictionary && typeof window.KreezbyDictionary.productRecommendationSnapshot === 'function') {
                done();
                return;
            }
            if (tries++ > 40) {
                done();
                return;
            }
            setTimeout(tick, 100);
        })();
    }

    function loadRecommendation() {
        var body = document.getElementById('product-recommendation-body');
        if (!body && !document.getElementById('product-recommendation')) return;
        var id = ++requestId;
        setBusy(true);
        setBody('Checking available finished products and pending orders…');
        whenReady(function () {
            if (id !== requestId) return;
            var dict = window.KreezbyDictionary;
            if (!dict || typeof dict.productRecommendationSnapshot !== 'function') {
                setBody('Shop records are still loading. Refresh this note in a moment.');
                setBusy(false);
                return;
            }
            var snapshot = dict.productRecommendationSnapshot();
            renderTable(snapshot);
            if (!snapshot.products || !snapshot.products.length) {
                setBody('There is not enough finished product or pending order data yet to recommend a bake.');
                setBusy(false);
                return;
            }
            fetch('/api/product-recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ snapshot: snapshot })
            }).then(function (res) {
                return res.json().then(function (data) {
                    return { data: data || {} };
                });
            }).then(function (result) {
                if (id !== requestId) return;
                if (result.data && result.data.recommendation) {
                    setBody(result.data.recommendation);
                    return;
                }
                setBody((result.data && result.data.error) || 'The production recommendation could not be written just now.');
            }).catch(function () {
                if (id !== requestId) return;
                setBody('The production recommendation could not be written just now.');
            }).then(function () {
                if (id === requestId) setBusy(false);
            });
        });
    }

    function maybeLoad() {
        var body = document.getElementById('product-recommendation-body');
        if (!body || !panelVisible()) return;
        if (startedForBody === body) return;
        startedForBody = body;
        loadRecommendation();
    }

    function boot() {
        var button = document.getElementById('product-recommendation-refresh');
        if (button && button.getAttribute('data-bound') !== '1') {
            button.setAttribute('data-bound', '1');
            button.addEventListener('click', function () {
                startedForBody = document.getElementById('product-recommendation-body');
                loadRecommendation();
            });
        }
        maybeLoad();
    }

    document.addEventListener('kreezby:insights-tab', function (event) {
        if (!event.detail || event.detail.key !== 'product-recommendation') return;
        maybeLoad();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
    document.addEventListener('content:replaced', boot);

    window.KreezbyProductRecommendation = { boot: boot };
})();
