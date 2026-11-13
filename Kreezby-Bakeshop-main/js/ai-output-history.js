/**
 * Output History (Insights > Management Insight and Production Recommendation).
 * Adds a "View History" button beside each Refresh button. The history window lists every
 * generated output with its date, who generated it, and the data it was based on.
 */
(function () {
    'use strict';

    if (window.KreezbyAiHistory) return;

    var STYLE_ID = 'ai-history-style';
    var MODULES = {
        'management-insight': 'Management Insight',
        'production-recommendation': 'Production Recommendation'
    };
    var view = { module: 'management-insight', from: '', to: '', data: null, openId: null, loading: false, error: '' };
    var overlay = null;

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function token() {
        try { return (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { return ''; }
    }

    function when(value) {
        var d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = ''
            + '.aih-open-btn{margin-left:8px;}'
            + '.aih-overlay{position:fixed;inset:0;z-index:9000;background:rgba(40,24,16,.45);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto;}'
            + '.aih-panel{background:#fffdf9;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);width:100%;max-width:1180px;padding:18px 20px 22px;color:#3e2723;font-size:13px;}'
            + '.aih-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;}'
            + '.aih-top h2{margin:0;font-size:19px;}'
            + '.aih-btn{border:1px solid #d7c4ae;background:#fff;color:#4e342e;border-radius:9px;padding:7px 13px;font-weight:700;font-size:12.5px;cursor:pointer;}'
            + '.aih-btn:hover{background:#fbf3e8;}'
            + '.aih-btn.primary{background:#5d4037;color:#fff;border-color:#5d4037;}'
            + '.aih-btn.primary:hover{background:#4e342e;}'
            + '.aih-tabs{display:flex;gap:6px;flex-wrap:wrap;}'
            + '.aih-tab{border:1px solid #d7c4ae;background:#fff;border-radius:999px;padding:6px 13px;font-weight:700;font-size:12.5px;color:#5d4037;cursor:pointer;}'
            + '.aih-tab.on{background:#5d4037;color:#fff;border-color:#5d4037;}'
            + '.aih-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:12px 0;}'
            + '.aih-filters label{display:grid;gap:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8d6e63;}'
            + '.aih-filters input{border:1px solid #d7c4ae;border-radius:8px;padding:6px 8px;font-size:13px;color:#3e2723;background:#fff;}'
            + '.aih-count{margin:0 0 8px;color:#6d4c41;font-weight:700;}'
            + '.aih-muted{color:#8d6e63;}'
            + '.aih-table-wrap{overflow:auto;border:1px solid #eadfce;border-radius:12px;background:#fff;}'
            + '.aih-table{width:100%;border-collapse:collapse;font-size:12.5px;}'
            + '.aih-table th,.aih-table td{padding:8px 10px;border-bottom:1px solid #f2e9dc;text-align:left;vertical-align:top;}'
            + '.aih-table th{background:#fbf6f2;color:#5d4037;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;position:sticky;top:0;}'
            + '.aih-table td.n,.aih-table th.n{text-align:right;}'
            + '.aih-excerpt{max-width:480px;color:#4e342e;}'
            + '.aih-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;background:#fff3e0;color:#e65100;}'
            + '.aih-detail{display:grid;gap:12px;}'
            + '.aih-box{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:12px 14px;}'
            + '.aih-box h4{margin:0 0 8px;font-size:13.5px;}'
            + '.aih-box pre{white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;line-height:1.55;}'
            + '.aih-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;}'
            + '.aih-meta div small{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;color:#8d6e63;}'
            + '.aih-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:0 0 8px;}'
            + '.aih-kv dt{font-weight:700;color:#6d4c41;}.aih-kv dd{margin:0;}'
            + '.aih-sub{font-size:11px;font-weight:700;text-transform:uppercase;color:#8d6e63;margin:10px 0 4px;}'
            + '.aih-error{background:#ffebee;color:#c62828;border-radius:10px;padding:10px 12px;margin:0 0 10px;}'
            + '.aih-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;}'
            + '@media (max-width:800px){.aih-two{grid-template-columns:1fr;}.aih-panel{padding:14px;}}';
        document.head.appendChild(style);
    }

    // ---------- data ----------
    function dayStart(value) {
        var d = new Date(value + 'T00:00:00');
        return isNaN(d.getTime()) ? '' : d.getTime();
    }

    function dayEnd(value) {
        var d = new Date(value + 'T23:59:59.999');
        return isNaN(d.getTime()) ? '' : d.getTime();
    }

    function query(limit) {
        var params = ['module=' + encodeURIComponent(view.module === 'all' ? '' : view.module)];
        if (view.from) params.push('from=' + dayStart(view.from));
        if (view.to) params.push('to=' + dayEnd(view.to));
        params.push('limit=' + (limit || 300));
        return '/api/ai-history?' + params.join('&');
    }

    function load() {
        var t = token();
        if (!t) {
            view.error = 'Please log out and log in again to see the output history.';
            view.data = null;
            draw();
            return Promise.resolve();
        }
        view.loading = true;
        view.error = '';
        draw();
        return fetch(query(), { cache: 'no-store', headers: { 'X-Kreezby-Token': t } })
            .then(function (res) { return res.json().catch(function () { return {}; }); })
            .then(function (data) {
                view.loading = false;
                if (!data || !data.ok) {
                    view.error = (data && data.error) || 'The history could not be loaded just now.';
                    view.data = null;
                } else {
                    view.data = data;
                }
                draw();
            })
            .catch(function () {
                view.loading = false;
                view.error = 'The history could not be loaded just now. Check the connection and try again.';
                draw();
            });
    }

    function findRecord(id) {
        var list = (view.data && view.data.records) || [];
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }

    // ---------- renderers ----------
    function excerpt(text, max) {
        var s = String(text || '').replace(/\s+/g, ' ').trim();
        return s.length > max ? s.slice(0, max - 1) + '…' : s;
    }

    function cell(value) {
        if (value == null || value === '') return '<span class="aih-muted">—</span>';
        if (typeof value === 'number') return esc(value.toLocaleString('en-PH'));
        if (typeof value === 'object') return esc(JSON.stringify(value));
        return esc(value);
    }

    var LABELS = {
        asOf: 'As of', periods: 'Periods used', shortDays: 'Short period (days)', longDays: 'Long period (days)', previousDays: 'Previous period (days)',
        totals: 'Totals', sold7: 'Sold (7 days)', sold30: 'Sold (30 days)', soldPrev30: 'Sold (previous 30 days)', changePct: 'Change (%)',
        revenue30: 'Sales value (30 days, ₱)', stock: 'Stock on hand', flavors: 'Flavors', name: 'Name', price: 'Price (₱)',
        sharePct: 'Share of sales (%)', perDay: 'Sold per day', daysCover: 'Days of stock', daysLeft: 'Days left',
        stockState: 'Stock state', flavorStates: 'Flavor stock states', outOfStock: 'Out of stock', low: 'Low', healthy: 'Healthy', other: 'Other',
        alerts: 'Alerts', expired: 'Expired batches', nearExpiry: 'Near expiry batches', lowMaterials: 'Low raw/packaging materials',
        products: 'Products', finishedStock: 'Finished stock', pendingOrders: 'Pending orders', pendingStillToCover: 'Pending still to cover',
        suggestedBake: 'Suggested bake', note: 'Note'
    };

    function labelFor(key) {
        return LABELS[key] || String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (c) { return c.toUpperCase(); });
    }

    // Lists of rows become tables; groups become label/value pairs.
    function renderData(value) {
        if (Array.isArray(value)) {
            if (!value.length) return '<p class="aih-muted">None</p>';
            if (value.every(function (r) { return r && typeof r === 'object' && !Array.isArray(r); })) {
                var cols = [];
                value.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
                return '<div class="aih-table-wrap"><table class="aih-table"><thead><tr>'
                    + cols.map(function (c) { return '<th>' + esc(labelFor(c)) + '</th>'; }).join('')
                    + '</tr></thead><tbody>'
                    + value.map(function (r) {
                        return '<tr>' + cols.map(function (c) { return '<td' + (typeof r[c] === 'number' ? ' class="n"' : '') + '>' + cell(r[c]) + '</td>'; }).join('') + '</tr>';
                    }).join('')
                    + '</tbody></table></div>';
            }
            return '<ul style="margin:0;padding-left:18px;">' + value.map(function (v) { return '<li>' + cell(v) + '</li>'; }).join('') + '</ul>';
        }
        if (value && typeof value === 'object') {
            var simple = [];
            var nested = [];
            Object.keys(value).forEach(function (k) {
                if (value[k] && typeof value[k] === 'object') nested.push(k);
                else simple.push(k);
            });
            var html = '';
            if (simple.length) {
                html += '<dl class="aih-kv">' + simple.map(function (k) {
                    return '<dt>' + esc(labelFor(k)) + '</dt><dd>' + cell(value[k]) + '</dd>';
                }).join('') + '</dl>';
            }
            nested.forEach(function (k) {
                html += '<div class="aih-sub">' + esc(labelFor(k)) + '</div>' + renderData(value[k]);
            });
            return html || '<p class="aih-muted">None</p>';
        }
        return '<p>' + cell(value) + '</p>';
    }

    function listHtml(data) {
        var rows = data.records || [];
        if (!rows.length) return '<p class="aih-muted">No outputs saved yet for this selection. An output is saved each time the insight or recommendation is generated.</p>';
        return '<p class="aih-count">' + data.total + ' output' + (data.total === 1 ? '' : 's') + '</p>'
            + '<div class="aih-table-wrap"><table class="aih-table"><thead><tr>'
            + '<th>#</th><th>Date &amp; time</th><th>Module</th><th>Generated by</th><th>Engine</th><th>Output</th><th>Action</th>'
            + '</tr></thead><tbody>'
            + rows.map(function (r, i) {
                var by = r.generatedBy || {};
                return '<tr>'
                    + '<td class="n">' + (i + 1) + '</td>'
                    + '<td style="white-space:nowrap">' + esc(when(r.createdAt)) + '</td>'
                    + '<td>' + esc(r.moduleLabel || MODULES[r.module] || r.module) + '</td>'
                    + '<td>' + esc(by.name || '—') + (by.role ? '<br><span class="aih-muted">' + esc(by.role) + '</span>' : '') + '</td>'
                    + '<td>' + esc(r.engine || '') + (r.usedFallback ? '<br><span class="aih-tag">System text shown</span>' : '') + '</td>'
                    + '<td class="aih-excerpt">' + esc(excerpt(r.rawOutput || r.shownOutput, 200)) + '</td>'
                    + '<td><button type="button" class="aih-btn" data-aih="open" data-id="' + esc(r.id) + '">View</button></td>'
                    + '</tr>';
            }).join('')
            + '</tbody></table></div>'
            + (data.total > rows.length ? '<p class="aih-muted">Showing the latest ' + rows.length + '. Narrow the dates to see older outputs, or use Export CSV.</p>' : '');
    }

    function detailHtml(record) {
        var by = record.generatedBy || {};
        var html = '<div class="aih-detail">'
            + '<div><button type="button" class="aih-btn" data-aih="back">&larr; Back to List</button></div>'
            + '<div class="aih-box aih-meta">'
            + '<div><small>Module</small>' + esc(record.moduleLabel || MODULES[record.module]) + '</div>'
            + '<div><small>Generated</small>' + esc(when(record.createdAt)) + '</div>'
            + '<div><small>Generated by</small>' + esc(by.name || '—') + (by.role ? ' (' + esc(by.role) + ')' : '') + '</div>'
            + '<div><small>Engine</small>' + esc(record.engine || '') + '</div>'
            + '<div><small>Output ID</small>' + esc(record.id) + '</div>'
            + '</div>'
            + '<div class="aih-two">'
            + '<div class="aih-box"><h4>Input data (what the output was based on)</h4>' + renderData(record.inputData) + '</div>'
            + '<div class="aih-box"><h4>' + (record.usedFallback ? 'AI output (word for word)' : 'Output') + '</h4><pre>' + esc(record.rawOutput || record.shownOutput) + '</pre>';
        if (record.usedFallback) {
            html += '<div class="aih-sub">Shown to the user instead</div><pre>' + esc(record.shownOutput) + '</pre>'
                + '<p class="aih-muted" style="margin-top:6px;">The AI text did not match the shop figures, so the system showed its own text instead.</p>';
        }
        return html + '</div></div></div>';
    }

    function draw() {
        if (!overlay) return;
        var data = view.data;
        var html = '<div class="aih-panel" role="dialog" aria-modal="true" aria-label="Output History">'
            + '<div class="aih-top"><h2>Output History</h2>'
            + '<div class="aih-tabs" role="tablist">'
            + ['management-insight', 'production-recommendation', 'all'].map(function (key) {
                var label = key === 'all' ? 'Both' : MODULES[key];
                return '<button type="button" class="aih-tab' + (view.module === key ? ' on' : '') + '" data-aih="module" data-key="' + key + '">' + label + '</button>';
            }).join('')
            + '</div>'
            + '<button type="button" class="aih-btn" data-aih="close">Close</button></div>';

        if (view.openId && data) {
            var record = findRecord(view.openId);
            overlay.innerHTML = html + (record ? detailHtml(record) : '<p class="aih-muted">That output is no longer in the list.</p>') + '</div>';
            return;
        }

        html += '<div class="aih-filters">'
            + '<label>From<input type="date" data-aih-field="from" value="' + esc(view.from) + '"></label>'
            + '<label>To<input type="date" data-aih-field="to" value="' + esc(view.to) + '"></label>'
            + '<button type="button" class="aih-btn" data-aih="reload">Refresh List</button>'
            + '<button type="button" class="aih-btn" data-aih="clear-filters">Clear Filters</button>'
            + '<button type="button" class="aih-btn primary" data-aih="export">Export CSV</button>'
            + '</div>';
        if (view.error) html += '<div class="aih-error">' + esc(view.error) + '</div>';
        if (view.loading && !data) html += '<p class="aih-muted">Loading the history…</p>';
        if (data) html += listHtml(data);
        overlay.innerHTML = html + '</div>';
    }

    // ---------- actions ----------
    function csvValue(value) {
        var s = value == null ? '' : (typeof value === 'object' ? JSON.stringify(value) : String(value));
        return '"' + s.replace(/"/g, '""') + '"';
    }

    function exportCsv() {
        var t = token();
        if (!t) return;
        fetch(query(2000), { cache: 'no-store', headers: { 'X-Kreezby-Token': t } })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (!data || !data.ok) {
                    view.error = (data && data.error) || 'The export could not be made.';
                    draw();
                    return;
                }
                var lines = [['Output ID', 'Date & time', 'Module', 'Generated by', 'Role', 'Engine', 'Output', 'Shown to user', 'System text shown instead', 'Input data (JSON)'].map(csvValue).join(',')];
                (data.records || []).forEach(function (r) {
                    var by = r.generatedBy || {};
                    lines.push([r.id, when(r.createdAt), r.moduleLabel, by.name, by.role, r.engine, r.rawOutput, r.shownOutput, r.usedFallback ? 'Yes' : 'No', r.inputData].map(csvValue).join(','));
                });
                var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'kreezby-output-history-' + new Date().toISOString().slice(0, 10) + '.csv';
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
            })
            .catch(function () {
                view.error = 'The export could not be made just now.';
                draw();
            });
    }

    function onClick(event) {
        if (event.target === overlay) { close(); return; }
        var btn = event.target.closest('[data-aih]');
        if (!btn) return;
        var act = btn.getAttribute('data-aih');
        if (act === 'close') close();
        else if (act === 'module') { view.module = btn.getAttribute('data-key'); view.openId = null; load(); }
        else if (act === 'reload') load();
        else if (act === 'clear-filters') { view.from = ''; view.to = ''; load(); }
        else if (act === 'export') exportCsv();
        else if (act === 'open') { view.openId = btn.getAttribute('data-id'); draw(); overlay.scrollTop = 0; }
        else if (act === 'back') { view.openId = null; draw(); }
    }

    function onChange(event) {
        var field = event.target.getAttribute && event.target.getAttribute('data-aih-field');
        if (!field) return;
        view[field] = event.target.value;
        load();
    }

    function onKey(event) {
        if (event.key === 'Escape' && overlay) close();
    }

    function open(module) {
        ensureStyle();
        view.module = MODULES[module] ? module : 'management-insight';
        view.openId = null;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'aih-overlay';
            overlay.addEventListener('click', onClick);
            overlay.addEventListener('change', onChange);
            document.addEventListener('keydown', onKey);
            document.body.appendChild(overlay);
        }
        draw();
        load();
    }

    function close() {
        if (!overlay) return;
        overlay.remove();
        overlay = null;
        document.removeEventListener('keydown', onKey);
    }

    // ---------- the "View History" buttons ----------
    function addButtons() {
        ensureStyle();
        [['management-insight-refresh', 'management-insight'], ['product-recommendation-refresh', 'production-recommendation']].forEach(function (pair) {
            var refresh = document.getElementById(pair[0]);
            if (!refresh) return;
            var id = 'ai-history-btn-' + pair[1];
            if (document.getElementById(id)) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.id = id;
            btn.className = (refresh.className || 'btn-call-to-action') + ' aih-open-btn';
            btn.textContent = 'View History';
            btn.title = 'Previously generated outputs';
            btn.addEventListener('click', function () { open(pair[1]); });
            refresh.insertAdjacentElement('afterend', btn);
        });
    }

    // A new output was saved while the window is open: show it.
    document.addEventListener('kreezby:ai-history-changed', function () {
        if (overlay && !view.openId) load();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButtons);
    else addButtons();
    document.addEventListener('kreezby:page-load', addButtons);
    document.addEventListener('content:replaced', addButtons);
    document.addEventListener('kreezby:insights-tab', addButtons);

    window.KreezbyAiHistory = { open: open, addButtons: addButtons };
})();
