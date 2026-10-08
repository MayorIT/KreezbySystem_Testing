/**
 * Owner note from GPT-4o mini: sales, inventory, and demand in plain language.
 * Shown as the Management Insight choice inside Insights.
 * The API key stays on the server.
 */
(function () {
    'use strict';

    var requestId = 0;

    function setBody(text) {
        var body = document.getElementById('management-insight-body');
        if (body) body.textContent = text;
    }

    function setBusy(busy) {
        var button = document.getElementById('management-insight-refresh');
        if (!button) return;
        button.disabled = busy;
        button.textContent = busy ? 'Writing…' : 'Refresh';
    }

    function whenReady(done) {
        var tries = 0;
        (function tick() {
            if (window.KreezbyDictionary && typeof window.KreezbyDictionary.insightSnapshot === 'function') {
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

    function loadInsight() {
        if (!document.getElementById('management-insight-body') && !document.getElementById('management-insight')) return;
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.insightSnapshot !== 'function') {
            setBody('Shop records are still loading. Refresh this note in a moment.');
            return;
        }
        var id = ++requestId;
        setBusy(true);
        setBody('Reading sales, stock, and demand…');
        fetch('/api/management-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snapshot: dict.insightSnapshot() })
        }).then(function (res) {
            return res.json().then(function (data) {
                return { data: data || {} };
            });
        }).then(function (result) {
            if (id !== requestId) return;
            if (result.data && result.data.insight) {
                setBody(result.data.insight);
                return;
            }
            setBody((result.data && result.data.error) || 'The management insight could not be written just now.');
        }).catch(function () {
            if (id !== requestId) return;
            setBody('The management insight could not be written just now.');
        }).then(function () {
            if (id === requestId) setBusy(false);
        });
    }

    function boot() {
        var button = document.getElementById('management-insight-refresh');
        if (!button) return;
        if (button.getAttribute('data-bound') !== '1') {
            button.setAttribute('data-bound', '1');
            button.addEventListener('click', loadInsight);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
    document.addEventListener('content:replaced', boot);
})();
