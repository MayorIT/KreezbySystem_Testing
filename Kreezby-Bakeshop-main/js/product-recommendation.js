/**
 * Bake recommendation from GPT-4o mini.
 * Based on available finished products, and pending orders.
 * The API key stays on the server.
 * The last saved recommendation is shown when the page opens. A new one is written only when the
 * Refresh button is clicked or a new sale was recorded since the saved one.
 */
(function () {
    'use strict';

    var requestId = 0;

    function sessionToken() {
        try { return (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { return ''; }
    }

    // The "View History" button and window come from ai-output-history.js. Pages opened through
    // the fast page switch load this file on its own, so it brings the history script along.
    (function loadHistoryScript() {
        if (window.KreezbyAiHistory || document.getElementById('kreezby-ai-history-script')) return;
        var me = document.currentScript && document.currentScript.src;
        var src = me ? me.replace(/product-recommendation\.js(\?.*)?$/, 'ai-output-history.js?v=20261113ai') : '../js/ai-output-history.js?v=20261113ai';
        var s = document.createElement('script');
        s.id = 'kreezby-ai-history-script';
        s.src = src;
        (document.body || document.head).appendChild(s);
    })();

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

    // A short code for "which sales exist". It changes only when a sale is added, changed or removed.
    function currentSalesKey() {
        var dict = window.KreezbyDictionary;
        var rows = dict && typeof dict.salesTransactions === 'function' ? dict.salesTransactions() : [];
        var text = rows.map(function (r) {
            var qty = Number(r.quantity_sold);
            return [r.product_id, String(r.sales_date || '').slice(0, 19), isFinite(qty) ? qty : 0, r.transaction_id || r.sales_id || r.order_id || r.id || ''].join('|');
        }).sort().join('\n');
        var h = 5381;
        for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
        return 's' + rows.length + '-' + (h >>> 0).toString(36);
    }

    function authHeaders() {
        var headers = { 'Content-Type': 'application/json' };
        var token = sessionToken();
        // Lets the server note who generated this recommendation in the AI output history.
        if (token) headers['X-Kreezby-Token'] = token;
        return headers;
    }

    // ---------- saved recommendation ----------
    // Opening the page shows the last saved recommendation. A new one is written only on Refresh,
    // or when a new sale was recorded since the saved one.
    var saved = { text: '', at: null, by: null, salesKey: '', error: '' };
    var savedLoaded = false;
    var savedLoading = null;
    var busy = false;
    var busyTrigger = '';
    var checkTimer = null;

    function stamp(date) {
        if (!date) return '';
        var d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function renderMeta() {
        var body = document.getElementById('product-recommendation-body');
        if (!body) return;
        var meta = document.getElementById('product-recommendation-meta');
        if (!meta) {
            meta = document.createElement('p');
            meta.id = 'product-recommendation-meta';
            meta.className = 'product-recommendation-note';
            meta.style.margin = '8px 0 0';
            body.insertAdjacentElement('afterend', meta);
        }
        var parts = [];
        if (busy) parts.push(busyTrigger === 'new-sales' ? 'New sales recorded · writing a new recommendation…' : 'Writing a new recommendation…');
        else if (saved.text) parts.push(saved.salesKey && saved.salesKey !== currentSalesKey() ? 'New sales recorded' : 'Up to date with sales');
        if (saved.at) {
            var who = saved.by && saved.by.name ? ' by ' + saved.by.name + (saved.by.role ? ' (' + saved.by.role + ')' : '') : '';
            parts.push('Written ' + stamp(saved.at) + who);
        }
        meta.textContent = parts.join(' · ');
    }

    function show() {
        var dict = window.KreezbyDictionary;
        if (dict && typeof dict.productRecommendationSnapshot === 'function') renderTable(dict.productRecommendationSnapshot());
        if (saved.text) setBody(saved.error ? saved.text + ' ' + saved.error : saved.text);
        setBusy(busy);
        renderMeta();
    }

    function adopt(record, key) {
        saved.text = record.recommendation || record.shownOutput || '';
        saved.at = record.createdAt ? new Date(record.createdAt) : new Date();
        saved.by = record.generatedBy || null;
        saved.salesKey = record.salesKey || key || '';
        saved.error = record.error || '';
    }

    function loadSaved() {
        if (savedLoaded) return Promise.resolve();
        if (savedLoading) return savedLoading;
        savedLoading = fetch('/api/ai-latest?module=production-recommendation', { headers: authHeaders() })
            .then(function (res) { return res.json().catch(function () { return {}; }); })
            .then(function (data) {
                if (data && data.ok && data.record && data.record.shownOutput && !saved.text) adopt(data.record);
            })
            .catch(function () { /* nothing saved can be read; a new one is written below */ })
            .then(function () { savedLoaded = true; savedLoading = null; show(); });
        return savedLoading;
    }

    // trigger: "manual" (Refresh), "new-sales" or "first".
    function generate(trigger) {
        var body = document.getElementById('product-recommendation-body');
        if (!body && !document.getElementById('product-recommendation')) return;
        var id = ++requestId;
        busy = true;
        busyTrigger = trigger;
        if (!saved.text) setBody('Checking available finished products and pending orders…');
        show();
        whenReady(function () {
            if (id !== requestId) return;
            var dict = window.KreezbyDictionary;
            if (!dict || typeof dict.productRecommendationSnapshot !== 'function') {
                setBody('Shop records are still loading. Refresh this note in a moment.');
                busy = false;
                show();
                return;
            }
            var snapshot = dict.productRecommendationSnapshot();
            renderTable(snapshot);
            if (!snapshot.products || !snapshot.products.length) {
                setBody('There is not enough finished product or pending order data yet to recommend a bake.');
                busy = false;
                show();
                return;
            }
            var key = currentSalesKey();
            var fetchOpts = {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ snapshot: snapshot, salesKey: key, trigger: trigger })
            };
            if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) fetchOpts.signal = AbortSignal.timeout(22000);
            fetch('/api/product-recommendation', fetchOpts).then(function (res) {
                return res.json().catch(function () { return {}; });
            }).then(function (data) {
                if (id !== requestId) return;
                if (data && data.recommendation) {
                    adopt(data, key);
                    if (data.historyId && !data.reused) {
                        document.dispatchEvent(new CustomEvent('kreezby:ai-history-changed', { detail: { module: 'production-recommendation' } }));
                    }
                    return;
                }
                if (!saved.text) setBody((data && data.error) || 'The production recommendation could not be written just now.');
            }).catch(function () {
                if (id !== requestId) return;
                if (!saved.text) setBody('The production recommendation could not be written just now.');
            }).then(function () {
                if (id !== requestId) return;
                busy = false;
                show();
            });
        });
    }

    // Writes a new recommendation only when there is none yet, or the sales changed since the saved one.
    function checkForNewSales() {
        if (!panelVisible() || !savedLoaded || busy) return;
        if (!saved.text) { generate('first'); return; }
        if (saved.salesKey !== currentSalesKey()) generate('new-sales');
    }

    function scheduleCheck(delay) {
        if (checkTimer) clearTimeout(checkTimer);
        checkTimer = setTimeout(function () { checkTimer = null; checkForNewSales(); }, delay);
    }

    function maybeLoad() {
        var body = document.getElementById('product-recommendation-body');
        if (!body || !panelVisible()) return;
        whenReady(function () {
            show();
            loadSaved().then(function () { scheduleCheck(2000); });
        });
    }

    function boot() {
        var button = document.getElementById('product-recommendation-refresh');
        if (button && button.getAttribute('data-bound') !== '1') {
            button.setAttribute('data-bound', '1');
            button.addEventListener('click', function () {
                if (busy) return;
                generate('manual');
            });
        }
        maybeLoad();
    }

    // New records: the table updates right away; the written recommendation only if a sale was added.
    function onRecords() {
        var body = document.getElementById('product-recommendation-body');
        if (!body) return;
        show();
        if (savedLoaded) scheduleCheck(2500);
    }
    document.addEventListener('kreezby:remote-state', onRecords);
    document.addEventListener('kreezby:stocks-sync', onRecords);

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
