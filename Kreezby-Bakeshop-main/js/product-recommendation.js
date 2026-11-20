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

    function ensureStyle() {
        if (document.getElementById('production-rec-style')) return;
        var style = document.createElement('style');
        style.id = 'production-rec-style';
        style.textContent = ''
            + '.pr-card{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:6px 18px;margin-top:12px;}'
            + '.pr-sec{display:grid;grid-template-columns:140px minmax(0,1fr);gap:6px 18px;padding:14px 0;border-bottom:1px solid #f1e7dc;}'
            + '.pr-sec:last-child{border-bottom:0;}'
            + '.pr-sec h4{margin:0;font-size:14px;font-weight:700;color:#5d4037;line-height:1.5;}'
            + '.pr-sec p{margin:0;font-size:14px;line-height:1.55;color:#3e2723;}'
            + '.pr-sec p.pr-wait{color:#7a6558;font-size:13px;}'
            + '.pr-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}'
            + '.pr-chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;background:#fffaf3;border:1px solid #f0e4d2;font-size:12px;color:#5d4037;white-space:nowrap;}'
            + '.pr-chip.ok{background:#e8f5e9;border-color:#c8e6c9;color:#2e7d32;}.pr-chip.warn{background:#fff3e0;border-color:#ffe0b2;color:#e65100;}.pr-chip.bad{background:#ffebee;border-color:#ffcdd2;color:#c62828;}'
            + '.pr-note{margin:10px 2px 0;font-size:12px;line-height:1.5;color:#7a6558;}'
            + '.pr-busy{opacity:.55;}'
            + '#product-recommendation-body:empty{display:none;}'
            + '@media (max-width:600px){.pr-card{padding:4px 14px;}.pr-sec{grid-template-columns:minmax(0,1fr);gap:4px;padding:12px 0;}.pr-chip{white-space:normal;}}';
        document.head.appendChild(style);
    }

    function short(name) {
        return String(name || '').replace(/\s*Crinkles$/i, '');
    }

    function chip(label, cls) {
        return '<span class="pr-chip' + (cls ? ' ' + cls : '') + '">' + esc(label) + '</span>';
    }

    function section(label, sentence, chips) {
        var text = sentence
            ? '<p>' + esc(sentence) + '</p>'
            : '<p class="pr-wait">' + (busy ? 'GPT-4o mini is writing this part…' : 'Loading the saved recommendation…') + '</p>';
        return '<section class="pr-sec"><h4>' + label + '</h4><div>' + text
            + '<div class="pr-chips">' + chips.filter(Boolean).join('') + '</div></div></section>';
    }

    // Sales, stock and packaging figures come from the system's formula; the sentences from GPT-4o mini.
    function renderSections(snapshot) {
        var host = document.getElementById('product-recommendation-table');
        if (!host) return;
        var products = (snapshot && snapshot.products) || [];
        if (!products.length) {
            host.innerHTML = '';
            return;
        }
        ensureStyle();
        var sum = function (key) { return products.reduce(function (t, r) { return t + (Number(r[key]) || 0); }, 0); };
        var toBake = products.filter(function (r) { return Number(r.suggestedBake) > 0; })
            .sort(function (a, b) { return (Number(b.suggestedBake) || 0) - (Number(a.suggestedBake) || 0); });
        var covered = products.filter(function (r) { return !(Number(r.suggestedBake) > 0); });
        var shortPack = toBake.filter(function (r) { return Number(r.packagingShort) > 0; });
        var totalBake = Number(snapshot.totalBake) || toBake.reduce(function (t, r) { return t + Number(r.suggestedBake); }, 0);
        var expired = sum('expiredStock');

        var bakeChips = toBake.map(function (r) { return chip(short(r.name) + ': bake ' + r.suggestedBake, 'warn'); });
        if (covered.length) bakeChips.push(chip('Covered: ' + covered.map(function (r) { return short(r.name); }).join(', '), 'ok'));
        if (totalBake) bakeChips.push(chip('Total ' + totalBake + ' pouches · about ' + (snapshot.daysNeeded || 1) + ' day(s)'));

        var stockChips = [
            chip(sum('finishedStock') + ' good stock'),
            chip(sum('pendingStillToCover') + ' orders to cover'),
            chip(sum('retailerDeliveries') + ' for retailers (7 days)'),
            expired ? chip(expired + ' expired, not counted', 'bad') : ''
        ];

        var packChips = shortPack.length
            ? shortPack.map(function (r) { return chip(short(r.name) + ': short by ' + r.packagingShort, 'bad'); })
            : [chip(totalBake ? 'Enough packaging' : 'Not needed', totalBake ? 'ok' : '')];

        var text = saved.sections;
        host.innerHTML = '<div class="pr-card' + (busy && text ? ' pr-busy' : '') + '">'
            + section('What to bake', text ? text.bake : null, bakeChips)
            + section('Stock and orders', text ? text.stock : null, stockChips)
            + section('Packaging', text ? text.packaging : null, packChips)
            + '</div>'
            + (saved.error && text ? '<p class="pr-note">' + esc(saved.error) + ' The system\'s own wording is shown.</p>' : '')
            + '<p class="pr-note">Bake amounts are calculated by the system: customer orders to cover + retailer deliveries in the next 7 days − good stock (expired pouches are never counted). '
            + 'The sentences are written by GPT-4o mini from those numbers and checked against them. The AI cannot change any number or record.</p>';
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
    var saved = { text: '', sections: null, at: null, by: null, salesKey: '', error: '' };
    var savedLoaded = false;
    var savedLoading = null;
    var busy = false;
    var busyTrigger = '';
    var checkTimer = null;
    var failure = '';   // why the last request could not write a recommendation

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
        var hasProducts = false;
        if (dict && typeof dict.productRecommendationSnapshot === 'function') {
            var snap = dict.productRecommendationSnapshot();
            hasProducts = !!(snap && snap.products && snap.products.length);
            renderSections(snap);
        }
        // The sentences sit inside the three sections; this line is only for status messages.
        if (hasProducts) setBody(!saved.sections && failure ? failure : '');
        setBusy(busy);
        renderMeta();
    }

    function adopt(record, key) {
        saved.text = record.recommendation || record.shownOutput || '';
        // An older saved recommendation is one paragraph with no sections; a new one is written for it.
        var sec = record.sections || record.shown || null;
        saved.sections = sec && sec.bake ? sec : null;
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
            renderSections(snapshot);
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
                    failure = '';
                    adopt(data, key);
                    if (data.historyId && !data.reused) {
                        document.dispatchEvent(new CustomEvent('kreezby:ai-history-changed', { detail: { module: 'production-recommendation' } }));
                    }
                    return;
                }
                failure = (data && data.error) || 'The production recommendation could not be written just now.';
                if (!saved.text) setBody(failure);
            }).catch(function () {
                if (id !== requestId) return;
                failure = 'The production recommendation could not be written just now.';
                if (!saved.text) setBody(failure);
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
        else if (!saved.sections) generate('manual');
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
