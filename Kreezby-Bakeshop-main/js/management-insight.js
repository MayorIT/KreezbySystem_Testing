/**
 * Management Insight: one note per flavor for stock, recommended stock, and recent sales.
 * Refresh asks the server for wording. The numbers always come from shop records.
 */
(function () {
    'use strict';

    var requestId = 0;
    var STYLE_ID = 'management-insight-row-style';

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''
            + '#management-insight-table .mi-col-flavor{width:40%;}'
            + 'body.po-admin-page #management-insight-table td:first-child{white-space:normal;text-align:left;}'
            + 'body.po-admin-page #management-insight-table th:nth-child(n+2),body.po-admin-page #management-insight-table td:nth-child(n+2){text-align:center;}'
            + '#management-insight-table .mi-insight{display:block;margin-top:6px;font-size:12px;font-weight:600;line-height:1.45;color:#5d4037;}'
            + '#management-insight-status{margin-left:10px;font-size:13px;font-weight:700;color:#5d4037;}';
        document.head.appendChild(style);
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function count(value) {
        var number = Number(value);
        if (!isFinite(number)) return '0';
        return Math.round(number).toLocaleString('en-PH');
    }

    function productsFromSnapshot(snapshot) {
        return (snapshot && snapshot.products) || [];
    }

    function insightText(row) {
        var stock = Number(row.stock) || 0;
        var recommended = Number(row.recommendedStock) || 0;
        var sales = Number(row.recentSales) || 0;
        var position = stock < recommended
            ? 'Stock is below the recommended stock.'
            : stock > recommended
                ? 'Stock is above the recommended stock.'
                : 'Stock matches the recommended stock.';
        return 'Stock is ' + count(stock) + '. Recommended stock is ' + count(recommended) + '. Recent sales are ' + count(sales) + '. ' + position;
    }

    function setBody(text) {
        var body = document.getElementById('management-insight-body');
        if (!body) return;
        body.textContent = text;
        body.setAttribute('data-default', text);
    }

    function setStatus(text) {
        var button = document.getElementById('management-insight-refresh');
        if (!button) return;
        var note = document.getElementById('management-insight-status');
        if (!note) {
            note = document.createElement('span');
            note.id = 'management-insight-status';
            button.insertAdjacentElement('afterend', note);
        }
        note.textContent = text || '';
    }

    function setBusy(busy) {
        var button = document.getElementById('management-insight-refresh');
        if (!button) return;
        button.disabled = busy;
        button.textContent = busy ? 'Writing…' : 'Refresh';
    }

    function currentSnapshot() {
        var dict = window.KreezbyDictionary;
        if (!dict || typeof dict.insightSnapshot !== 'function') return null;
        return dict.insightSnapshot();
    }

    function paintTable(snapshot) {
        var table = document.getElementById('management-insight-table');
        if (!table) return;
        var body = table.querySelector('tbody');
        if (!body) return;
        ensureStyle();
        var actionCol = table.querySelector('.mi-col-action');
        if (actionCol) actionCol.remove();
        var headCells = table.querySelectorAll('thead th');
        if (headCells.length > 4) headCells[headCells.length - 1].remove();
        var products = productsFromSnapshot(snapshot);
        if (!products.length) {
            body.innerHTML = '<tr><td colspan="4">No flavor records yet.</td></tr>';
            setBody('There is not enough sales or stock data yet.');
            return;
        }
        body.innerHTML = products.map(function (row) {
            var stock = Number(row.stock) || 0;
            var recommended = Number(row.recommendedStock) || 0;
            var sales = Number(row.recentSales) || 0;
            return '<tr data-flavor="' + esc(row.name) + '" data-stock="' + stock + '" data-sales="' + sales + '">'
                + '<td class="sa-flavor" data-label="Flavor"><strong>' + esc(row.name) + '</strong>'
                + '<span class="mi-insight">' + esc(insightText(row)) + '</span></td>'
                + '<td class="sa-num" data-label="Stock">' + count(stock) + '</td>'
                + '<td class="sa-num" data-label="Recommended stock">' + count(recommended) + '</td>'
                + '<td class="sa-num" data-label="Recent sales">' + count(sales) + '</td></tr>';
        }).join('');
        setBody(products.map(insightText).join(' '));
    }

    function applyRemoteInsights(list) {
        if (!list || !list.length) return;
        var byName = {};
        list.forEach(function (item) {
            if (item && item.name && item.text) byName[String(item.name).toLowerCase()] = item.text;
        });
        var lines = [];
        document.querySelectorAll('#management-insight-table tbody tr').forEach(function (row) {
            var name = row.getAttribute('data-flavor') || '';
            var text = byName[name.toLowerCase()];
            var slot = row.querySelector('.mi-insight');
            if (text && slot) slot.textContent = text;
            if (slot) lines.push(slot.textContent);
        });
        if (lines.length) setBody(lines.join(' '));
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
        if (!document.getElementById('management-insight-body') && !document.getElementById('management-insight-table')) return;
        var snapshot = currentSnapshot();
        if (!snapshot) {
            setStatus('Shop records are still loading. Try again in a moment.');
            return;
        }
        if (!document.querySelector('#management-insight-table tbody tr[data-flavor]')) paintTable(snapshot);
        var id = ++requestId;
        setBusy(true);
        setStatus('Writing…');
        fetch('/api/management-insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snapshot: snapshot })
        }).then(function (res) {
            return res.json().then(function (data) {
                return { status: res.status, data: data || {} };
            });
        }).then(function (result) {
            if (id !== requestId) return;
            var insights = result.data && result.data.insights;
            if (insights && insights.length) {
                applyRemoteInsights(insights);
                setStatus('Updated from GPT-4o mini');
                return;
            }
            if (result.data && result.data.insight) {
                setBody(result.data.insight);
                setStatus('Updated from GPT-4o mini');
                return;
            }
            setStatus((result.data && result.data.error) || 'The note could not be written just now.');
        }).catch(function () {
            if (id !== requestId) return;
            setStatus('The note could not be written just now.');
        }).then(function () {
            if (id === requestId) setBusy(false);
        });
    }

    function boot() {
        var button = document.getElementById('management-insight-refresh');
        if (button && button.getAttribute('data-bound') !== '1') {
            button.setAttribute('data-bound', '1');
            button.addEventListener('click', loadInsight);
        }
        whenReady(function () {
            var snapshot = currentSnapshot();
            if (snapshot) paintTable(snapshot);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
    document.addEventListener('content:replaced', boot);
})();
