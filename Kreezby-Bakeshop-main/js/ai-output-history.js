/**
 * AI Output History (Insights > Management Insight and Production Recommendation).
 * Adds a "View History" button beside each Refresh button. The history window lists every saved
 * output with the exact data it was based on, so the researchers can judge whether each output is
 * factually consistent with that data.
 *
 *   AI Consistency Rate (%) = (Factually Consistent Outputs / Total Outputs Evaluated) x 100
 *
 * Only outputs marked "Factually consistent" or "Not consistent" count as evaluated. The system
 * number check is shown to help the reviewer but is never counted in the rate.
 * Head admin and admin accounts can evaluate; staff can view.
 */
(function () {
    'use strict';

    if (window.KreezbyAiHistory) return;

    var STYLE_ID = 'ai-history-style';
    var MODULES = {
        'management-insight': 'Management Insight',
        'production-recommendation': 'Production Recommendation'
    };
    var view = {
        module: 'management-insight',
        from: '',
        to: '',
        status: '',
        data: null,
        openId: null,
        loading: false,
        error: ''
    };
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

    function pctText(value) {
        return value == null ? '—' : Number(value).toFixed(2) + '%';
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
            + '.aih-btn.good{background:#2e7d32;border-color:#2e7d32;color:#fff;}'
            + '.aih-btn.bad{background:#c62828;border-color:#c62828;color:#fff;}'
            + '.aih-btn:disabled{opacity:.5;cursor:not-allowed;}'
            + '.aih-tabs{display:flex;gap:6px;flex-wrap:wrap;}'
            + '.aih-tab{border:1px solid #d7c4ae;background:#fff;border-radius:999px;padding:6px 13px;font-weight:700;font-size:12.5px;color:#5d4037;cursor:pointer;}'
            + '.aih-tab.on{background:#5d4037;color:#fff;border-color:#5d4037;}'
            + '.aih-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:12px 0;}'
            + '.aih-filters label{display:grid;gap:3px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#8d6e63;}'
            + '.aih-filters input,.aih-filters select{border:1px solid #d7c4ae;border-radius:8px;padding:6px 8px;font-size:13px;color:#3e2723;background:#fff;}'
            + '.aih-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 10px;}'
            + '.aih-stat{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:10px 12px;}'
            + '.aih-stat small{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#8d6e63;}'
            + '.aih-stat strong{display:block;font-size:22px;margin-top:2px;}'
            + '.aih-stat em{display:block;font-style:normal;font-size:11.5px;color:#7a6558;margin-top:2px;}'
            + '.aih-stat.rate{background:#fff8ec;border-color:#e7c98f;}'
            + '.aih-formula{background:#fff;border:1px dashed #d7c4ae;border-radius:10px;padding:9px 12px;margin:0 0 10px;line-height:1.5;}'
            + '.aih-formula b{color:#4e342e;}'
            + '.aih-def{background:#fff;border:1px solid #eadfce;border-radius:10px;padding:10px 12px;margin:0 0 12px;}'
            + '.aih-def h4{margin:0 0 4px;font-size:13px;}'
            + '.aih-def p{margin:0;white-space:pre-wrap;line-height:1.5;}'
            + '.aih-def textarea,.aih-review textarea{width:100%;box-sizing:border-box;min-height:80px;border:1px solid #d7c4ae;border-radius:8px;padding:8px;font:inherit;margin:6px 0;}'
            + '.aih-muted{color:#8d6e63;}'
            + '.aih-table-wrap{overflow:auto;border:1px solid #eadfce;border-radius:12px;background:#fff;}'
            + '.aih-table{width:100%;border-collapse:collapse;font-size:12.5px;}'
            + '.aih-table th,.aih-table td{padding:8px 10px;border-bottom:1px solid #f2e9dc;text-align:left;vertical-align:top;}'
            + '.aih-table th{background:#fbf6f2;color:#5d4037;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;position:sticky;top:0;}'
            + '.aih-table td.n,.aih-table th.n{text-align:right;}'
            + '.aih-excerpt{max-width:420px;color:#4e342e;}'
            + '.aih-tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;}'
            + '.aih-tag.ok{background:#e8f5e9;color:#2e7d32;}.aih-tag.bad{background:#ffebee;color:#c62828;}.aih-tag.wait{background:#f3ece4;color:#6d4c41;}.aih-tag.info{background:#e3f2fd;color:#1565c0;}.aih-tag.warn{background:#fff3e0;color:#e65100;}'
            + '.aih-detail{display:grid;gap:12px;}'
            + '.aih-box{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:12px 14px;}'
            + '.aih-box h4{margin:0 0 8px;font-size:13.5px;}'
            + '.aih-box pre{white-space:pre-wrap;word-break:break-word;margin:0;font:inherit;line-height:1.55;}'
            + '.aih-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;}'
            + '.aih-meta div small{display:block;font-size:10.5px;font-weight:700;text-transform:uppercase;color:#8d6e63;}'
            + '.aih-kv{display:grid;grid-template-columns:max-content 1fr;gap:4px 14px;margin:0 0 8px;}'
            + '.aih-kv dt{font-weight:700;color:#6d4c41;}.aih-kv dd{margin:0;}'
            + '.aih-sub{font-size:11px;font-weight:700;text-transform:uppercase;color:#8d6e63;margin:10px 0 4px;}'
            + '.aih-choice{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0;}'
            + '.aih-choice label{display:flex;align-items:center;gap:6px;border:1px solid #d7c4ae;border-radius:9px;padding:7px 12px;cursor:pointer;font-weight:700;}'
            + '.aih-error{background:#ffebee;color:#c62828;border-radius:10px;padding:10px 12px;margin:0 0 10px;}'
            + '.aih-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;}'
            + '@media (max-width:800px){.aih-two{grid-template-columns:1fr;}.aih-panel{padding:14px;}}';
        document.head.appendChild(style);
    }

    // ---------- data ----------
    function dayStart(value) {
        if (!value) return '';
        var d = new Date(value + 'T00:00:00');
        return isNaN(d.getTime()) ? '' : d.getTime();
    }

    function dayEnd(value) {
        if (!value) return '';
        var d = new Date(value + 'T23:59:59.999');
        return isNaN(d.getTime()) ? '' : d.getTime();
    }

    function query(limit) {
        var params = ['module=' + encodeURIComponent(view.module === 'all' ? '' : view.module)];
        if (view.from) params.push('from=' + dayStart(view.from));
        if (view.to) params.push('to=' + dayEnd(view.to));
        if (view.status) params.push('status=' + encodeURIComponent(view.status));
        params.push('limit=' + (limit || 300));
        return '/api/ai-history?' + params.join('&');
    }

    function load() {
        var t = token();
        if (!t) {
            view.error = 'Please log out and log in again to see the AI output history.';
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

    function post(path, body) {
        return fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Kreezby-Token': token() },
            body: JSON.stringify(body)
        }).then(function (res) { return res.json().catch(function () { return {}; }); });
    }

    function findRecord(id) {
        var list = (view.data && view.data.records) || [];
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }

    // ---------- small renderers ----------
    function verdictTag(record) {
        var v = record.review && record.review.verdict;
        if (v === 'consistent') return '<span class="aih-tag ok">Factually consistent</span>';
        if (v === 'inconsistent') return '<span class="aih-tag bad">Not consistent</span>';
        return '<span class="aih-tag wait">Not yet evaluated</span>';
    }

    function checkTag(record) {
        var c = record.autoCheck;
        if (!c) return '<span class="aih-tag info">No check</span>';
        return c.passed
            ? '<span class="aih-tag ok">All numbers found</span>'
            : '<span class="aih-tag warn">Needs a closer look</span>';
    }

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

    // Shows any input data in a readable way: lists of rows become tables, groups become label/value pairs.
    function renderData(value, depth) {
        depth = depth || 0;
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
                var v = value[k];
                if (v && typeof v === 'object') nested.push(k);
                else simple.push(k);
            });
            var html = '';
            if (simple.length) {
                html += '<dl class="aih-kv">' + simple.map(function (k) {
                    return '<dt>' + esc(labelFor(k)) + '</dt><dd>' + cell(value[k]) + '</dd>';
                }).join('') + '</dl>';
            }
            nested.forEach(function (k) {
                html += '<div class="aih-sub">' + esc(labelFor(k)) + '</div>' + renderData(value[k], depth + 1);
            });
            return html || '<p class="aih-muted">None</p>';
        }
        return '<p>' + cell(value) + '</p>';
    }

    var LABELS = {
        asOf: 'As of', periods: 'Periods used', shortDays: 'Short period (days)', longDays: 'Long period (days)', previousDays: 'Previous period (days)',
        totals: 'Totals', sold7: 'Sold (7 days)', sold30: 'Sold (30 days)', soldPrev30: 'Sold (previous 30 days)', changePct: 'Change (%)',
        revenue30: 'Sales value (30 days, ₱)', stock: 'Stock on hand', flavors: 'Flavors', name: 'Name', price: 'Price (₱)',
        sharePct: 'Share of sales (%)', perDay: 'Sold per day', daysCover: 'Days of stock', daysLeft: 'Days left (min. 1)',
        stockState: 'Stock state', flavorStates: 'Flavor stock states', outOfStock: 'Out of stock', low: 'Low', healthy: 'Healthy', other: 'Other',
        alerts: 'Alerts', expired: 'Expired batches', nearExpiry: 'Near expiry batches', lowMaterials: 'Low raw/packaging materials',
        products: 'Products', finishedStock: 'Finished stock', pendingOrders: 'Pending orders', pendingStillToCover: 'Pending still to cover',
        suggestedBake: 'Suggested bake', note: 'Note'
    };

    function labelFor(key) {
        return LABELS[key] || String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (c) { return c.toUpperCase(); });
    }

    // ---------- views ----------
    function statsHtml(data) {
        var s = data.stats;
        var rateLine = s.evaluated
            ? '(' + s.consistent + ' &divide; ' + s.evaluated + ') &times; 100 = <b>' + pctText(s.rate) + '</b>'
            : 'No outputs have been evaluated yet in this selection.';
        var perModule = '';
        if (view.module === 'all') {
            perModule = '<div class="aih-stats">' + Object.keys(s.byModule).map(function (key) {
                var m = s.byModule[key];
                return '<div class="aih-stat"><small>' + esc(m.label) + '</small><strong>' + pctText(m.rate) + '</strong><em>' + m.consistent + ' consistent of ' + m.evaluated + ' evaluated &middot; ' + m.total + ' outputs</em></div>';
            }).join('') + '</div>';
        }
        return '<div class="aih-stats">'
            + '<div class="aih-stat"><small>Outputs saved</small><strong>' + s.total + '</strong><em>in this selection</em></div>'
            + '<div class="aih-stat"><small>Total outputs evaluated</small><strong>' + s.evaluated + '</strong><em>' + s.notEvaluated + ' not yet evaluated</em></div>'
            + '<div class="aih-stat"><small>Factually consistent</small><strong class="" style="color:#2e7d32">' + s.consistent + '</strong><em>outputs</em></div>'
            + '<div class="aih-stat"><small>Not consistent</small><strong style="color:#c62828">' + s.inconsistent + '</strong><em>outputs</em></div>'
            + '<div class="aih-stat rate"><small>AI Consistency Rate</small><strong>' + pctText(s.rate) + '</strong><em>' + (view.module === 'all' ? 'both modules' : esc(MODULES[view.module])) + '</em></div>'
            + '</div>'
            + perModule
            + '<div class="aih-formula"><b>AI Consistency Rate (%)</b> = (Factually Consistent Outputs &divide; Total Outputs Evaluated) &times; 100 &nbsp;&rarr;&nbsp; ' + rateLine
            + '<br><span class="aih-muted">System number check (helper only, not part of the rate): ' + s.autoPassed + ' of ' + s.autoChecked + ' outputs had every number found in their input data.</span></div>';
    }

    function definitionHtml(data) {
        var def = data.definition || {};
        var editing = view.editingDefinition;
        var html = '<div class="aih-def"><h4>How an output counts as factually consistent (set by the researchers)</h4>';
        if (editing) {
            html += '<textarea id="aih-def-text" placeholder="Example: An output is factually consistent when every number, product name and stock condition it states matches the input data shown for that output, and it makes no claim the data does not support.">' + esc(def.text || '') + '</textarea>'
                + '<button type="button" class="aih-btn primary" data-aih="save-def">Save Definition</button> '
                + '<button type="button" class="aih-btn" data-aih="cancel-def">Cancel</button>';
        } else {
            html += def.text
                ? '<p>' + esc(def.text) + '</p><p class="aih-muted" style="margin-top:6px;">Last saved ' + esc(when(def.updatedAt)) + (def.updatedBy ? ' by ' + esc(def.updatedBy.name) : '') + '. Each evaluation keeps a copy of the definition used at that time.</p>'
                : '<p class="aih-muted">No definition saved yet. ' + (data.canReview ? 'Click Edit Definition to write how an output qualifies as consistent.' : 'A head admin or admin account can add it.') + '</p>';
            if (data.canReview) html += '<p style="margin-top:8px;"><button type="button" class="aih-btn" data-aih="edit-def">Edit Definition</button></p>';
        }
        return html + '</div>';
    }

    function listHtml(data) {
        var rows = data.records || [];
        if (!rows.length) return '<p class="aih-muted">No outputs match this selection yet. Outputs are saved each time the insight or recommendation is generated.</p>';
        return '<div class="aih-table-wrap"><table class="aih-table"><thead><tr>'
            + '<th>#</th><th>Date &amp; time</th><th>Module</th><th>Generated by</th><th>Engine</th><th>Output</th><th>Number check</th><th>Evaluation</th><th>Action</th>'
            + '</tr></thead><tbody>'
            + rows.map(function (r, i) {
                var by = r.generatedBy || {};
                return '<tr>'
                    + '<td class="n">' + (i + 1) + '</td>'
                    + '<td style="white-space:nowrap">' + esc(when(r.createdAt)) + '</td>'
                    + '<td>' + esc(r.moduleLabel || MODULES[r.module] || r.module) + '</td>'
                    + '<td>' + esc(by.name || '—') + (by.role ? '<br><span class="aih-muted">' + esc(by.role) + '</span>' : '') + '</td>'
                    + '<td>' + esc(r.engine || '') + (r.usedFallback ? '<br><span class="aih-tag warn">Computed text shown</span>' : '') + '</td>'
                    + '<td class="aih-excerpt">' + esc(excerpt(r.rawOutput || r.shownOutput, 170)) + '</td>'
                    + '<td>' + checkTag(r) + '</td>'
                    + '<td>' + verdictTag(r) + (r.review && r.review.reviewer ? '<br><span class="aih-muted">' + esc(r.review.reviewer.name) + '</span>' : '') + '</td>'
                    + '<td><button type="button" class="aih-btn" data-aih="open" data-id="' + esc(r.id) + '">' + (data.canReview && !(r.review && r.review.verdict) ? 'Evaluate' : 'View') + '</button></td>'
                    + '</tr>';
            }).join('')
            + '</tbody></table></div>'
            + (rows.length >= 300 ? '<p class="aih-muted">Showing the latest 300. Narrow the dates to see older outputs, or use Export CSV for all of them.</p>' : '');
    }

    function detailHtml(record, canReview) {
        var by = record.generatedBy || {};
        var review = record.review;
        var c = record.autoCheck || {};
        var html = '<div class="aih-detail">'
            + '<div><button type="button" class="aih-btn" data-aih="back">&larr; Back to List</button></div>'
            + '<div class="aih-box aih-meta">'
            + '<div><small>Module</small>' + esc(record.moduleLabel || MODULES[record.module]) + '</div>'
            + '<div><small>Generated</small>' + esc(when(record.createdAt)) + '</div>'
            + '<div><small>Generated by</small>' + esc(by.name || '—') + (by.role ? ' (' + esc(by.role) + ')' : '') + '</div>'
            + '<div><small>Engine</small>' + esc(record.engine || '') + '</div>'
            + '<div><small>Output ID</small>' + esc(record.id) + '</div>'
            + '</div>';

        html += '<div class="aih-two">'
            + '<div class="aih-box"><h4>Input data (what the output was based on)</h4>' + renderData(record.inputData) + '</div>'
            + '<div class="aih-box"><h4>' + (record.usedFallback ? 'AI output (word for word)' : 'Output') + '</h4><pre>' + esc(record.rawOutput || record.shownOutput) + '</pre>';
        if (record.usedFallback) {
            html += '<div class="aih-sub">Shown to the user instead</div><pre>' + esc(record.shownOutput) + '</pre>'
                + '<p class="aih-muted" style="margin-top:6px;">The system replaced the AI text with its own computed text because the AI text did not pass the system check. Evaluate the AI text above.</p>';
        }
        html += '</div></div>';

        html += '<div class="aih-box"><h4>System number check ' + checkTag(record) + '</h4>'
            + '<p style="margin:0;">' + esc(c.numbersFound || 0) + ' number(s) found in the output. '
            + (c.unsupportedNumbers && c.unsupportedNumbers.length
                ? 'Not found in the input data: <b>' + esc(c.unsupportedNumbers.join(', ')) + '</b>.'
                : 'Every number appears in the input data.') + '</p>'
            + (c.notes && c.notes.length ? '<ul style="margin:6px 0 0;padding-left:18px;">' + c.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '')
            + '<p class="aih-muted" style="margin:6px 0 0;">This check only helps the reviewer. A number can be correctly worked out from the data (e.g. a total) and still be listed here. Only the evaluation below counts in the AI Consistency Rate.</p></div>';

        html += '<div class="aih-box aih-review"><h4>Evaluation ' + verdictTag(record) + '</h4>';
        if (review && review.verdict) {
            html += '<p style="margin:0 0 6px;">Evaluated by <b>' + esc(review.reviewer ? review.reviewer.name : '—') + '</b>'
                + (review.reviewer && review.reviewer.role ? ' (' + esc(review.reviewer.role) + ')' : '') + ' on ' + esc(when(review.reviewedAt)) + '.</p>'
                + (review.notes ? '<p style="margin:0 0 6px;white-space:pre-wrap;"><b>Notes:</b> ' + esc(review.notes) + '</p>' : '')
                + (review.definitionUsed ? '<p class="aih-muted" style="margin:0 0 6px;white-space:pre-wrap;"><b>Definition used:</b> ' + esc(review.definitionUsed) + '</p>' : '');
        }
        if (canReview) {
            var v = review && review.verdict;
            html += '<div class="aih-choice">'
                + '<label><input type="radio" name="aih-verdict" value="consistent"' + (v === 'consistent' ? ' checked' : '') + '> Factually consistent</label>'
                + '<label><input type="radio" name="aih-verdict" value="inconsistent"' + (v === 'inconsistent' ? ' checked' : '') + '> Not consistent</label>'
                + '</div>'
                + '<textarea id="aih-notes" placeholder="Notes: which statement matches or does not match the input data">' + esc(review ? review.notes : '') + '</textarea>'
                + '<button type="button" class="aih-btn primary" data-aih="save-review" data-id="' + esc(record.id) + '">Save Evaluation</button> '
                + (v ? '<button type="button" class="aih-btn" data-aih="clear-review" data-id="' + esc(record.id) + '">Clear Evaluation</button>' : '')
                + '<span id="aih-review-msg" class="aih-muted" style="margin-left:8px;"></span>';
        } else {
            html += '<p class="aih-muted" style="margin:0;">Only head admin and admin accounts can evaluate outputs.</p>';
        }
        html += '</div></div>';
        return html;
    }

    function draw() {
        if (!overlay) return;
        var data = view.data;
        var html = '<div class="aih-panel" role="dialog" aria-modal="true" aria-label="AI Output History">'
            + '<div class="aih-top"><h2>AI Output History</h2>'
            + '<div class="aih-tabs" role="tablist">'
            + ['management-insight', 'production-recommendation', 'all'].map(function (key) {
                var label = key === 'all' ? 'Both Modules' : MODULES[key];
                return '<button type="button" class="aih-tab' + (view.module === key ? ' on' : '') + '" data-aih="module" data-key="' + key + '">' + label + '</button>';
            }).join('')
            + '</div>'
            + '<button type="button" class="aih-btn" data-aih="close">Close</button></div>';

        if (view.openId && data) {
            var record = findRecord(view.openId);
            html += record ? detailHtml(record, data.canReview) : '<p class="aih-muted">That output is no longer in the list.</p>';
            overlay.innerHTML = html + '</div>';
            return;
        }

        html += '<div class="aih-filters">'
            + '<label>From<input type="date" data-aih-field="from" value="' + esc(view.from) + '"></label>'
            + '<label>To<input type="date" data-aih-field="to" value="' + esc(view.to) + '"></label>'
            + '<label>Show<select data-aih-field="status">'
            + [['', 'All outputs'], ['pending', 'Not yet evaluated'], ['consistent', 'Factually consistent'], ['inconsistent', 'Not consistent']].map(function (o) {
                return '<option value="' + o[0] + '"' + (view.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('')
            + '</select></label>'
            + '<button type="button" class="aih-btn" data-aih="reload">Refresh List</button>'
            + '<button type="button" class="aih-btn" data-aih="clear-filters">Clear Filters</button>'
            + '<button type="button" class="aih-btn primary" data-aih="export">Export CSV</button>'
            + '</div>';

        if (view.error) html += '<div class="aih-error">' + esc(view.error) + '</div>';
        if (view.loading && !data) html += '<p class="aih-muted">Loading the history…</p>';
        if (data) {
            html += statsHtml(data) + definitionHtml(data) + listHtml(data);
        }
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
                var s = data.stats;
                var lines = [];
                lines.push(['AI Output History', view.module === 'all' ? 'Both modules' : MODULES[view.module]].map(csvValue).join(','));
                lines.push(['Exported', new Date().toLocaleString('en-PH')].map(csvValue).join(','));
                lines.push(['Formula', data.formula].map(csvValue).join(','));
                lines.push(['Factually consistent outputs', s.consistent].map(csvValue).join(','));
                lines.push(['Total outputs evaluated', s.evaluated].map(csvValue).join(','));
                lines.push(['AI Consistency Rate (%)', s.rate == null ? '' : s.rate].map(csvValue).join(','));
                lines.push(['Definition', (data.definition && data.definition.text) || ''].map(csvValue).join(','));
                lines.push('');
                var head = ['Output ID', 'Date & time', 'Module', 'Generated by', 'Role', 'Engine', 'Output (AI text)', 'Shown to user', 'Computed text shown instead', 'Number check passed', 'Numbers not in input', 'Evaluation', 'Evaluated by', 'Evaluated on', 'Notes', 'Definition used', 'Input data (JSON)'];
                lines.push(head.map(csvValue).join(','));
                (data.records || []).forEach(function (r) {
                    var rv = r.review || {};
                    lines.push([
                        r.id, when(r.createdAt), r.moduleLabel, (r.generatedBy || {}).name, (r.generatedBy || {}).role, r.engine,
                        r.rawOutput, r.shownOutput, r.usedFallback ? 'Yes' : 'No',
                        r.autoCheck && r.autoCheck.passed ? 'Yes' : 'No',
                        r.autoCheck && r.autoCheck.unsupportedNumbers ? r.autoCheck.unsupportedNumbers.join(' ') : '',
                        rv.verdict === 'consistent' ? 'Factually consistent' : rv.verdict === 'inconsistent' ? 'Not consistent' : 'Not yet evaluated',
                        rv.reviewer ? rv.reviewer.name : '', rv.reviewedAt ? when(rv.reviewedAt) : '', rv.notes || '', rv.definitionUsed || '',
                        r.inputData
                    ].map(csvValue).join(','));
                });
                var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'kreezby-ai-output-history-' + new Date().toISOString().slice(0, 10) + '.csv';
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
            })
            .catch(function () {
                view.error = 'The export could not be made just now.';
                draw();
            });
    }

    function saveReview(id, verdict) {
        var msg = document.getElementById('aih-review-msg');
        if (verdict !== 'clear') {
            var picked = overlay.querySelector('input[name="aih-verdict"]:checked');
            if (!picked) {
                if (msg) msg.textContent = 'Choose Factually consistent or Not consistent first.';
                return;
            }
            verdict = picked.value;
        }
        var notesEl = document.getElementById('aih-notes');
        if (msg) msg.textContent = 'Saving…';
        post('/api/ai-history/review', { id: id, verdict: verdict, notes: notesEl ? notesEl.value : '' }).then(function (res) {
            if (!res || !res.ok) {
                if (msg) msg.textContent = (res && res.error) || 'The evaluation could not be saved.';
                return;
            }
            // Reload so the counts and the rate use the saved evaluation.
            load().then(function () {
                view.openId = id;
                draw();
                var m = document.getElementById('aih-review-msg');
                if (m) m.textContent = 'Saved.';
            });
        }).catch(function () {
            if (msg) msg.textContent = 'The evaluation could not be saved just now.';
        });
    }

    function saveDefinition() {
        var el = document.getElementById('aih-def-text');
        post('/api/ai-history/definition', { text: el ? el.value : '' }).then(function (res) {
            if (!res || !res.ok) {
                view.error = (res && res.error) || 'The definition could not be saved.';
                draw();
                return;
            }
            view.editingDefinition = false;
            if (view.data) view.data.definition = res.definition;
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
        else if (act === 'clear-filters') { view.from = ''; view.to = ''; view.status = ''; load(); }
        else if (act === 'export') exportCsv();
        else if (act === 'open') { view.openId = btn.getAttribute('data-id'); draw(); overlay.scrollTop = 0; }
        else if (act === 'back') { view.openId = null; draw(); }
        else if (act === 'save-review') saveReview(btn.getAttribute('data-id'), 'set');
        else if (act === 'clear-review') saveReview(btn.getAttribute('data-id'), 'clear');
        else if (act === 'edit-def') { view.editingDefinition = true; draw(); }
        else if (act === 'cancel-def') { view.editingDefinition = false; draw(); }
        else if (act === 'save-def') saveDefinition();
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
        view.editingDefinition = false;
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
            btn.title = 'Saved outputs and the AI Consistency Rate';
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
