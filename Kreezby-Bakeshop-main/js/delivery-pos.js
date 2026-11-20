/**
 * Retailer Delivery POS (head admin, admin and staff).
 * Record one shop's delivery: date, area, shop, ordered, pulled out, replaced, expired, collected.
 * Expired and Collected are for head admin and admin only; staff record ordered, pulled out
 * and replaced, and a staff save keeps whatever expired / collected values were already there.
 * It is saved into that day's route sheet for the area (POST /api/route-sheets), so it shows
 * on the Sales List right away:
 *   Ordered → Cons · Pulled out → P.O · Expired → expired (shown under P.O) · Collected → Collected
 */
(function () {
    'use strict';

    // Delivery routes from the 2026 retailer list. (Older Bauan, Manila and Rosario route sheets
    // stay in the Sales List; their shops now belong to these routes.)
    var AREAS = [
        { value: 'lucena', label: 'Lucena' },
        { value: 'batangas', label: 'Batangas' },
        { value: 'stotomas', label: 'Sto. Tomas' },
        { value: 'lipa', label: 'Lipa' },
        { value: 'tagaytay', label: 'Tagaytay' },
        { value: 'citimart', label: 'Citimart' }
    ];
    var KEEP_FIELDS = ['notes', 'accountReceivable', 'cons', 'cod', 'staff', 'check', 'f', 'po', 'replaced', 'expired', 'collected'];
    var EXPIRED_NOTE = /(^|;\s*)Expired: \d+(\.\d+)? pcs/;

    var accounts = [];
    var accountsPromise = null;
    var sheets = [];

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function num(v) {
        var n = Number(String(v == null ? '' : v).replace(/[^\d.-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function peso(n) {
        return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function cleanName(v) {
        return String(v || '').toLowerCase().replace(/&/g, ' and ').replace(/'/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function areaLabel(value) {
        var a = AREAS.filter(function (x) { return x.value === value; })[0];
        return a ? a.label : value;
    }

    // Account areas can be written many ways ("Sto. Tomas", "Santo Tomas, Batangas", "LIPA CITY").
    function areaValueFromLabel(label) {
        var key = ' ' + cleanName(label).replace(/\bsanto\b/g, 'sto') + ' ';
        if (!key.trim()) return '';
        var exact = AREAS.filter(function (x) { return cleanName(x.label) === key.trim() || x.value === key.trim().replace(/\s+/g, ''); })[0];
        if (exact) return exact.value;
        // Most specific first, so "Sto. Tomas, Batangas" is Sto. Tomas and not Batangas.
        var found = AREAS.filter(function (x) { return x.value !== 'batangas'; }).concat(AREAS.filter(function (x) { return x.value === 'batangas'; }))
            .filter(function (x) { return key.indexOf(' ' + cleanName(x.label) + ' ') >= 0 || key.replace(/\s+/g, '').indexOf(x.value) >= 0; })[0];
        return found ? found.value : '';
    }

    function today() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function token() {
        try { return (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { return ''; }
    }

    function request(url, body) {
        var t = token();
        if (!t) return Promise.reject(new Error('Please log out and log in again, then try again.'));
        var opts = { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Kreezby-Token': t } };
        if (body) {
            opts.method = 'POST';
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        return fetch(url, opts).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (res.status === 401) throw new Error('Please log out and log in again, then try again.');
                if (!res.ok || (data && data.ok === false)) throw new Error((data && data.error) || ('Request failed (' + res.status + ').'));
                return data;
            });
        });
    }

    // An area set in Settings that is not one of the routes above (a shop moved for an
    // unexpected delivery line) is added to the Area list.
    function areaForAccount(label) {
        var text = String(label || '').trim();
        if (!text) return '';
        var known = areaValueFromLabel(text);
        if (known) return known;
        var value = cleanName(text).replace(/\s+/g, '');
        if (!value) return '';
        if (!AREAS.some(function (x) { return x.value === value; })) AREAS.push({ value: value, label: text });
        return value;
    }

    // The shop list is kept in this browser too, so Retailer Delivery shows the shops at once and
    // then updates from the server.
    var SHOPS_CACHE = 'kz-dpos-shops';
    function mapAccounts(list) {
        return (list || []).map(function (a) {
            return { id: a.id, name: a.name, area: a.area || '', source: areaForAccount(a.area), usualPcs: Number(a.usualPcs) || 0, price: Number(a.retailerPrice) || 0 };
        });
    }
    function cachedAccounts() {
        if (accounts.length) return accounts;
        try {
            var saved = JSON.parse(localStorage.getItem(SHOPS_CACHE) || '[]');
            if (Array.isArray(saved) && saved.length) accounts = mapAccounts(saved);
        } catch (e) { /* no copy yet */ }
        return accounts;
    }

    function loadAccounts() {
        if (accountsPromise) return accountsPromise;
        accountsPromise = request('/api/retailer-records?lite=1').then(function (data) {
            accounts = mapAccounts(data.accounts);
            try { localStorage.setItem(SHOPS_CACHE, JSON.stringify(data.accounts || [])); } catch (e) { /* optional */ }
            return accounts;
        }).catch(function () {
            accountsPromise = null;
            return [];
        });
        return accountsPromise;
    }

    // Only recent route sheets are needed: the chosen date's sheet and each shop's last delivery
    // (for consignment collections), so sheets from 120 days before the date are loaded.
    var sheetsFrom = '';
    function windowStart(date) {
        var d = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date + 'T00:00:00') : new Date();
        d.setDate(d.getDate() - 120);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function loadSheets(date) {
        var from = windowStart(date);
        return request('/api/sales-list?from=' + from).then(function (data) {
            sheets = (data.dailyReports || []).filter(function (s) { return !s.isTestData; });
            sheetsFrom = from;
            return sheets;
        });
    }
    function sheetsCover(date) {
        return !!sheetsFrom && windowStart(date) >= sheetsFrom;
    }

    function findSheet(date, source) {
        return sheets.filter(function (s) { return s.reportDate === date && s.source === source; })[0] || null;
    }

    function rawEntry(e) {
        var row = { retailerName: e.retailerName };
        if (e.accountId) row.accountId = e.accountId;
        if (e.retailerSlug) row.retailerSlug = e.retailerSlug;
        KEEP_FIELDS.forEach(function (f) {
            if (e[f] !== undefined && e[f] !== null && e[f] !== '') row[f] = e[f];
        });
        return row;
    }

    function sameShop(entry, shop) {
        if (shop.accountId && entry.accountId) return entry.accountId === shop.accountId;
        var key = cleanName(shop.name);
        return cleanName(entry.retailerName) === key || cleanName(entry.accountName) === key;
    }

    function injectStyle() {
        var old = document.getElementById('kz-dpos-style');
        if (old && old.getAttribute('data-v') === '20261117layout') return;
        if (old) old.parentNode.removeChild(old);
        var s = document.createElement('style');
        s.id = 'kz-dpos-style';
        s.setAttribute('data-v', '20261117layout');
        s.textContent =
            '.dpos-switch{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}' +
            '.dpos-switch button{border:1px solid #e0d6ce;background:#fff;color:#5d4037;border-radius:999px;padding:9px 18px;font:inherit;font-weight:700;font-size:14px;cursor:pointer;white-space:nowrap}' +
            '.dpos-switch button.is-active{background:#ffca28;border-color:#ffca28;color:#3d2c2a}' +
            '#delivery-pos{padding:22px 24px;min-width:0;box-sizing:border-box}' +
            '#delivery-pos *{box-sizing:border-box}' +
            /* Header */
            '#delivery-pos .dpos-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px}' +
            '#delivery-pos h3{margin:0;font-size:20px;line-height:1.25;color:#3d2c2a}' +
            '#delivery-pos .dpos-sub{margin:6px 0 0;max-width:760px;color:#7d726c;font-size:13px;line-height:1.55}' +
            /* Toolbar: date, area, recorded count */
            '#delivery-pos .dpos-toolbar{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;padding:14px 16px;margin-bottom:16px;border:1px solid #efe6df;border-radius:14px;background:#fffaf4}' +
            '#delivery-pos .dpos-field{display:flex;flex-direction:column;gap:6px;width:220px;max-width:100%;font-size:12px;font-weight:700;color:#5d4037;text-transform:uppercase;letter-spacing:.04em}' +
            '#delivery-pos .dpos-field input,#delivery-pos .dpos-field select{width:100%;height:42px;padding:0 12px;border:1px solid #d7ccc8;border-radius:10px;font:inherit;font-size:15px;text-transform:none;letter-spacing:0;color:#2b241f;background:#fff}' +
            '#delivery-pos .dpos-field input:focus,#delivery-pos .dpos-field select:focus{outline:2px solid #ffca28;border-color:#ffca28}' +
            '#delivery-pos .dpos-recorded{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:2px;padding:6px 14px;border-radius:12px;background:#fff;border:1px solid #efe6df;min-width:150px}' +
            '#delivery-pos .dpos-recorded strong{font-size:20px;line-height:1.1;color:#3d2c2a}' +
            '#delivery-pos .dpos-recorded span{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8d6e63;white-space:nowrap}' +
            '#delivery-pos .dpos-ledger{margin-top:18px}' +
            '#delivery-pos .dpos-ledger table{border-collapse:collapse;font:inherit;font-size:13.5px;color:#3e2723;background:#fff}' +
            '#delivery-pos .dpos-ledger th{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:#6d4c41;background:#faf5f0;text-align:left;padding:9px 12px;border-bottom:1px solid #efe6df;white-space:nowrap}' +
            '#delivery-pos .dpos-ledger td{padding:9px 12px;border-bottom:1px solid #f3ece6;vertical-align:middle;white-space:nowrap}' +
            '#delivery-pos .dpos-ledger th.n,#delivery-pos .dpos-ledger td.n{text-align:right;font-variant-numeric:tabular-nums}' +
            '#delivery-pos .dpos-ledger td.dpos-shop{white-space:normal;min-width:180px;font-weight:600}' +
            '#delivery-pos .dpos-ledger td.dpos-shop small{display:block;font-weight:400;color:#8d6e63;font-size:12px}' +
            '#delivery-pos .dpos-ledger .dpos-ledger-detail>td{background:#fffaf5;padding:4px 12px 12px}' +
            '#delivery-pos .dpos-ledger .dpos-ledger-detail table{background:#fffaf5}' +
            '#delivery-pos .dpos-list h4{margin:0 0 10px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#3e2723;line-height:1.4}' +
            '#delivery-pos .dpos-empty{color:#8d6e63;padding:18px;border:1px dashed #e0d6ce;border-radius:12px;text-align:center;margin:0}' +
            /* Sheet: fixed column widths so nothing is squeezed; scrolls sideways when the screen is narrow */
            '#delivery-pos .dpos-sheet-wrap{overflow-x:auto;border:1px solid #efe6df;border-radius:14px;margin-bottom:16px;background:#fff;-webkit-overflow-scrolling:touch}' +
            '#delivery-pos table.dpos-sheet{width:100%;border:0!important;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:14px;margin:0}' +
            '#delivery-pos .dpos-sheet th,#delivery-pos .dpos-sheet td{padding:10px 8px;border:0!important;border-bottom:1px solid #f1e9e3!important;text-align:left;vertical-align:middle;background:#fff}' +
            '#delivery-pos .dpos-sheet tbody tr:last-child td{border-bottom:0!important}' +
            '#delivery-pos .dpos-sheet thead th{position:sticky;top:0;z-index:2;background:#fbf6f2;color:#5d4037;font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
            '#delivery-pos .dpos-sheet thead tr.dpos-group th{padding:8px 8px 4px;border-bottom:0!important;font-size:10.5px;color:#a1887f;text-align:center}' +
            '#delivery-pos .dpos-sheet thead tr.dpos-group th.dpos-g{border-bottom:2px solid #f3dca4!important}' +
            '#delivery-pos .dpos-sheet .n{text-align:center}' +
            '#delivery-pos .dpos-sheet .dpos-num{color:#9a8f88;text-align:center;font-variant-numeric:tabular-nums}' +
            '#delivery-pos .dpos-sheet .dpos-shop{font-weight:700;color:#3d2c2a;line-height:1.35;overflow-wrap:anywhere}' +
            '#delivery-pos .dpos-sheet .dpos-price{display:block;margin-top:2px;font-weight:600;font-size:11.5px;color:#8d6e63}' +
            /* Keep # and Shop visible while scrolling sideways */
            '#delivery-pos .dpos-sheet .dpos-stick1{position:sticky;left:0;z-index:1}' +
            '#delivery-pos .dpos-sheet .dpos-stick2{position:sticky;left:44px;z-index:1;box-shadow:1px 0 0 #efe6df}' +
            '#delivery-pos .dpos-sheet thead .dpos-stick1,#delivery-pos .dpos-sheet thead .dpos-stick2{z-index:3}' +
            '#delivery-pos .dpos-sheet input,#delivery-pos .dpos-sheet select{display:block;width:100%;min-width:0;height:38px;margin:0;padding:0 8px;border:1px solid #d7ccc8;border-radius:9px;font:inherit;font-size:14px;background:#fff;color:#2b241f}' +
            '#delivery-pos .dpos-sheet select{padding-right:4px;text-overflow:ellipsis}' +
            '#delivery-pos .dpos-sheet input[type=number]{text-align:center;font-variant-numeric:tabular-nums;-moz-appearance:textfield}' +
            '#delivery-pos .dpos-sheet input[type=number]::-webkit-outer-spin-button,#delivery-pos .dpos-sheet input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}' +
            '#delivery-pos .dpos-sheet input:focus,#delivery-pos .dpos-sheet select:focus{outline:2px solid #ffca28;border-color:#ffca28}' +
            '#delivery-pos .dpos-sheet input:disabled{background:#f5f1ee;color:#b0a7a1;border-color:#ece5e1}' +
            '#delivery-pos .dpos-sheet tbody tr:hover td{background:#fffaf0}' +
            '#delivery-pos .dpos-sheet tbody tr.dpos-row-on td{background:#fff8dc}' +
            '#delivery-pos .dpos-sheet tbody tr.dpos-row-on td.dpos-stick1{box-shadow:inset 3px 0 0 #ffca28}' +
            /* Move shop (head admin / admin) */
            '#delivery-pos .dpos-move-open{align-self:flex-end;height:42px;padding:0 16px;border:1px solid #d7ccc8;border-radius:10px;background:#fff;color:#5d4037;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}' +
            '#delivery-pos .dpos-move-open:hover,#delivery-pos .dpos-move-open.is-open{border-color:#ffca28;background:#fff8e1}' +
            '#delivery-pos .dpos-move{margin:-6px 0 16px;padding:14px 16px;border:1px solid #f3dca4;border-radius:14px;background:#fffdf5}' +
            '#delivery-pos .dpos-move[hidden]{display:none}' +
            '#delivery-pos .dpos-move-head{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}' +
            '#delivery-pos .dpos-move-head strong{font-size:14px;color:#3d2c2a}' +
            '#delivery-pos .dpos-move-head span{font-size:12.5px;color:#7d726c;line-height:1.45}' +
            '#delivery-pos .dpos-move-fields{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}' +
            '#delivery-pos .dpos-move-fields .dpos-field{width:240px}' +
            '#delivery-pos .dpos-move .dpos-status{margin:8px 0 0;min-height:0}' +
            /* Actions */
            '#delivery-pos .dpos-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0;padding-top:4px}' +
            '#delivery-pos .dpos-save{height:44px;background:#3d2c2a;color:#fff;border:none;border-radius:10px;padding:0 24px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}' +
            '#delivery-pos .dpos-save[disabled]{opacity:.6;cursor:wait}' +
            '#delivery-pos .dpos-clear{height:44px;background:#fff;border:1px solid #d7ccc8;border-radius:10px;padding:0 18px;font:inherit;font-weight:600;cursor:pointer;color:#5d4037;white-space:nowrap}' +
            '#delivery-pos .dpos-status{flex:1 1 240px;font-size:13px;font-weight:600;line-height:1.45}#delivery-pos .dpos-status.ok{color:#2e7d32}#delivery-pos .dpos-status.err{color:#c62828}' +
            /* Phone: each shop becomes its own card instead of a squeezed table row */
            '@media (max-width:720px){' +
                '#delivery-pos{padding:16px 14px}' +
                '#delivery-pos h3{font-size:18px}' +
                '#delivery-pos .dpos-toolbar{padding:12px;gap:10px}' +
                '#delivery-pos .dpos-field{width:calc(50% - 5px)}' +
                '#delivery-pos .dpos-recorded{margin-left:0;width:100%;flex-direction:row;justify-content:space-between;align-items:center}' +
                '#delivery-pos .dpos-move-open{width:100%}' +
                '#delivery-pos .dpos-move-fields .dpos-field{width:100%}' +
                '#delivery-pos .dpos-move-fields button{flex:1 1 auto}' +
                '#delivery-pos .dpos-sheet-wrap{overflow:visible;border:0!important;box-shadow:none!important;background:transparent;border-radius:0}' +
                '#delivery-pos table.dpos-sheet,#delivery-pos .dpos-sheet tbody{display:block;width:100%!important;min-width:0!important}' +
                '#delivery-pos .dpos-sheet colgroup,#delivery-pos .dpos-sheet thead{display:none}' +
                '#delivery-pos .dpos-sheet tbody tr{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;padding:14px;margin-bottom:12px;border:1px solid #efe6df;border-radius:14px;background:#fff}' +
                '#delivery-pos .dpos-sheet tbody tr.dpos-row-on{border-color:#ffca28;background:#fffbea}' +
                '#delivery-pos .dpos-sheet tbody td,#delivery-pos .dpos-sheet tbody tr.dpos-row-on td,#delivery-pos .dpos-sheet tbody tr:hover td{display:block;position:static;padding:0;border:0!important;background:transparent;box-shadow:none;text-align:left}' +
                '#delivery-pos .dpos-sheet tbody td[data-label]::before{content:attr(data-label);display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#8d6e63}' +
                '#delivery-pos .dpos-sheet td.dpos-num{display:none}' +
                '#delivery-pos .dpos-sheet tbody td.dpos-stick2,#delivery-pos .dpos-sheet tbody td.n{box-shadow:none!important;text-align:left}' +
                '#delivery-pos table.dpos-sheet{border:0!important;box-shadow:none!important;outline:0!important}' +
                '#delivery-pos .dpos-sheet td.dpos-shop{grid-column:1 / -1;font-size:15px;padding-bottom:8px;border-bottom:1px solid #f1e9e3!important}' +
                '#delivery-pos .dpos-sheet td.dpos-terms,#delivery-pos .dpos-sheet td.dpos-notes{grid-column:1 / -1}' +
                '#delivery-pos .dpos-sheet input,#delivery-pos .dpos-sheet select{height:42px;font-size:16px}' +
                '#delivery-pos .dpos-actions{position:sticky;bottom:0;z-index:4;margin:0 -14px -16px;padding:12px 14px;background:#fff;border-top:1px solid #efe6df}' +
                '#delivery-pos .dpos-save{flex:1 1 auto}' +
            '}' +
            '@media (max-width:420px){#delivery-pos .dpos-field{width:100%}}';
        document.head.appendChild(s);
    }

    function pagePath() {
        return (location.pathname || '').replace(/\\/g, '/').toLowerCase();
    }

    // Head admin and admin record Expired and Collected; staff do not see them.
    function canRecordMoney() {
        var path = pagePath();
        return path.indexOf('/admin/') >= 0 || path.indexOf('/head_admin/') >= 0;
    }

    function formHtml() {
        var full = canRecordMoney();
        return '<div class="dpos-head"><div>' +
                '<h3>Retailer Delivery</h3>' +
                '<p class="dpos-sub">Every shop of the area is listed. Type the numbers for the shops delivered to, then press <strong>Save delivery</strong>. Only shops with a number are recorded; they show on the <strong>Retailer</strong> sales list right away.' +
                (full ? ' Collected fills in by itself (COD: today\'s delivery; Consignment: the last delivery) and can be changed. Check is paid by check on delivery, so nothing is collected.' : '') + '</p>' +
            '</div></div>' +
            '<div class="dpos-toolbar">' +
                '<label class="dpos-field">Delivery date<input type="date" data-f="date"></label>' +
                '<label class="dpos-field">Area<select data-f="area">' + AREAS.map(function (a) {
                    return '<option value="' + a.value + '">' + esc(a.label) + '</option>';
                }).join('') + '</select></label>' +
                (full ? '<button type="button" class="dpos-move-open" data-act="move-open">Move shop to another area</button>' : '') +
                '<div class="dpos-recorded" aria-live="polite"><span>Shops recorded</span><strong data-recorded>0 of 0</strong></div>' +
            '</div>' +
            (full ? '<div class="dpos-move" data-move hidden>' +
                '<div class="dpos-move-head"><strong>Move a shop to another area</strong><span>The shop shows under its new area right away (Retailer Delivery, Delivery Schedule and Settings). Past deliveries stay in the area they were delivered in.</span></div>' +
                '<div class="dpos-move-fields">' +
                    '<label class="dpos-field">Shop<select data-move-shop></select></label>' +
                    '<label class="dpos-field">Move to<select data-move-area></select></label>' +
                    '<button type="button" class="dpos-save" data-act="move-save">Move shop</button>' +
                    '<button type="button" class="dpos-clear" data-act="move-cancel">Cancel</button>' +
                '</div>' +
                '<p class="dpos-status" data-move-status></p>' +
            '</div>' : '') +
            '<div class="dpos-list"><h4 data-list-title>Shops</h4><div data-list><p class="dpos-empty">Loading shops…</p></div></div>' +
            (full ? '<div class="dpos-list dpos-ledger" data-ledger></div>' : '') +
            '<div class="dpos-actions">' +
                '<button type="button" class="dpos-save" data-act="save">Save delivery</button>' +
                '<button type="button" class="dpos-clear" data-act="clear">Clear</button>' +
                '<span class="dpos-status" data-status></span>' +
            '</div>';
    }

    var TERM_LABELS = { cod: 'COD', cons: 'Consignment', check: 'Check' };
    var TERM_KEYS = ['cons', 'cod', 'check'];

    function readTerms(value) {
        return value === 'cod' || value === 'check' ? value : 'cons';
    }

    function entryTerms(e) {
        if (num(e.cod) > 0 && !num(e.cons)) return 'cod';
        if (num(e.cons) > 0) return 'cons';
        if (num(e.check) > 0) return 'check';
        return num(e.collected) > 0 ? 'cod' : 'cons';
    }

    function orderedOf(e) {
        var v = e[entryTerms(e)];
        return v != null ? v : null;
    }

    // One retailer price per pouch for every shop: ₱140 unless head admin / admin changed it
    // (Maintenance > Item List > Edit retailer price). Separate from the customer price.
    function retailerPrice() {
        var dict = window.KreezbyDictionary;
        var price = dict && typeof dict.retailerPrice === 'function' ? Number(dict.retailerPrice()) : 0;
        return price > 0 ? price : 140;
    }
    var COLLECT_NOTE = /(^|;\s*)Collection for (\d{4}-\d{2}-\d{2}) delivery[^;]*/;

    function deliveredQty(e) {
        return (num(e.cons) || 0) + (num(e.cod) || 0) + (num(e.check) || 0);
    }

    // The shop's most recent delivery before this date (any area sheet it appears on).
    function lastDelivery(root) {
        var date = field(root, 'date').value;
        var shop = shopFromInput(root);
        if (!date || !shop.name) return null;
        var best = null;
        sheets.forEach(function (sheet) {
            if (!sheet.reportDate || sheet.reportDate >= date) return;
            (sheet.entries || []).forEach(function (e) {
                if (!sameShop(e, shop)) return;
                var qty = deliveredQty(e);
                if (!qty) return;
                if (!best || sheet.reportDate > best.date) best = { date: sheet.reportDate, qty: qty };
            });
        });
        return best;
    }

    // Works out Collected from the rule above. Returns { amount, text, forDate }.
    function computeCollection(root) {
        var terms = readTerms(field(root, 'terms').value);
        var price = retailerPrice();
        var pulled = num(field(root, 'pulled').value);
        var priceText = peso(price).replace('.00', '');
        if (terms === 'cod') {
            var ordered = num(field(root, 'ordered').value);
            var codQty = Math.max(0, ordered - pulled);
            return { amount: codQty * price, forDate: '',
                text: 'COD collection today: (' + ordered + ' delivered − ' + pulled + ' pulled out) × ' + priceText + ' = ' + peso(codQty * price) };
        }
        if (terms === 'cons') {
            var last = lastDelivery(root);
            if (!last) return { amount: 0, forDate: '', text: 'First consignment delivery for this shop — nothing to collect yet.' };
            var qty = Math.max(0, last.qty - pulled);
            return { amount: qty * price, forDate: last.date,
                text: 'Collection for the ' + last.date + ' delivery: (' + last.qty + ' delivered − ' + pulled + ' pulled out) × ' + priceText + ' = ' + peso(qty * price) };
        }
        return { amount: 0, forDate: '', text: '' };
    }

    function updateCollection(root) {
        var terms = readTerms(field(root, 'terms').value);
        if (!field(root, 'collected')) return;
        if (terms === 'check') return;
        var c = computeCollection(root);
        var input = field(root, 'collected');
        if (input.dataset.manual !== '1') input.value = c.amount ? String(Math.round(c.amount * 100) / 100) : '';
    }

    function applyTerms(root) {
        var terms = readTerms(field(root, 'terms').value);
        var collects = terms !== 'check';
        root.querySelectorAll('[data-collected-wrap]').forEach(function (wrap) {
            wrap.hidden = !collects;
            wrap.style.display = collects ? '' : 'none';
        });
        if (!collects && field(root, 'collected')) {
            field(root, 'collected').value = '';
            field(root, 'collected').dataset.manual = '';
        }
        root.querySelector('[data-terms-hint]').textContent = 'pcs · ' + TERM_LABELS[terms];
        updateCollection(root);
    }

    function field(root, name) { return root.querySelector('[data-f="' + name + '"]'); }

    // The shop's usual order from the 2026 retailer list, shown as a hint in Ordered.
    function showUsualPcs(root) {
        var pick = field(root, 'shopPick');
        var ordered = field(root, 'ordered');
        if (!pick || !ordered) return;
        var opt = pick.options[pick.selectedIndex];
        var usual = opt ? Number(opt.getAttribute('data-usual')) || 0 : 0;
        ordered.placeholder = usual ? 'Usual: ' + usual : '0';
    }

    function setStatus(root, text, kind) {
        var el = root.querySelector('[data-status]');
        el.textContent = text || '';
        el.className = 'dpos-status' + (kind ? ' ' + kind : '');
    }

    // The shops under an area: the retailer accounts in that area (the 2026 retailer list).
    // Shops that only appear on old route sheets are not offered for new deliveries.
    function shopsForArea(area) {
        return accounts.filter(function (a) { return a.source === area; })
            .map(function (a) { return { id: a.id, name: a.name, usualPcs: a.usualPcs || 0, price: a.price || 0 }; })
            .sort(function (x, y) { return x.name.localeCompare(y.name); });
    }

    function fillShops(root, keepName) {
        var area = field(root, 'area').value;
        var list = shopsForArea(area);
        var pick = field(root, 'shopPick');
        if (!list.length) {
            pick.innerHTML = '<option value="">No shops under ' + esc(areaLabel(area)) + ' yet</option>';
            pick.disabled = true;
            return;
        }
        pick.disabled = false;
        pick.innerHTML = list.map(function (shop, i) {
            return '<option value="' + i + '" data-id="' + esc(shop.id) + '" data-usual="' + (shop.usualPcs || '') + '">' + esc(shop.name) + '</option>';
        }).join('');
        var want = cleanName(keepName || '');
        var idx = 0;
        if (want) list.forEach(function (shop, i) { if (cleanName(shop.name) === want) idx = i; });
        pick.value = String(idx);
        showUsualPcs(root);
    }

    function shopFromInput(root) {
        var pick = field(root, 'shopPick');
        var opt = pick.options[pick.selectedIndex];
        if (!opt || pick.disabled || opt.value === '') return { name: '', accountId: '' };
        return { name: opt.textContent, accountId: opt.getAttribute('data-id') || '' };
    }

    // A shop counts as recorded only when a number was entered for it.
    var NUMBER_FIELDS = ['accountReceivable', 'cons', 'cod', 'staff', 'check', 'f', 'po', 'replaced', 'expired', 'collected'];
    function isRecorded(e) {
        return !!e && NUMBER_FIELDS.some(function (f) { return e[f] !== undefined && e[f] !== null && String(e[f]).trim() !== ''; });
    }

    function cleanNotes(text) {
        return String(text || '').replace(EXPIRED_NOTE, '').replace(COLLECT_NOTE, '').replace(/^;\s*/, '').trim();
    }

    // The shop's most recent delivery before this date (any area sheet it appears on).
    function lastDeliveryFor(date, shop) {
        if (!date || !shop.name) return null;
        var best = null;
        sheets.forEach(function (sheet) {
            if (!sheet.reportDate || sheet.reportDate >= date) return;
            (sheet.entries || []).forEach(function (e) {
                if (!sameShop(e, shop)) return;
                var qty = deliveredQty(e);
                if (!qty) return;
                if (!best || sheet.reportDate > best.date) best = { date: sheet.reportDate, qty: qty };
            });
        });
        return best;
    }

    // Collected for one row (same rule as before): COD = (ordered − pulled out) × price;
    // Consignment = (last delivery − pulled out) × price; Check = nothing.
    function rowCollection(root, tr) {
        var terms = readTerms(rowInput(tr, 'terms').value);
        var price = Number(tr.getAttribute('data-price')) || retailerPrice();
        var pulled = num(rowInput(tr, 'pulled').value);
        if (terms === 'cod') return { amount: Math.max(0, num(rowInput(tr, 'ordered').value) - pulled) * price, forDate: '' };
        if (terms === 'cons') {
            var last = lastDeliveryFor(field(root, 'date').value, rowShop(tr));
            if (!last) return { amount: 0, forDate: '' };
            return { amount: Math.max(0, last.qty - pulled) * price, forDate: last.date };
        }
        return { amount: 0, forDate: '' };
    }

    function rowInput(tr, key) { return tr.querySelector('[data-k="' + key + '"]'); }
    function rowShop(tr) { return { name: tr.getAttribute('data-name') || '', accountId: tr.getAttribute('data-id') || '' }; }

    function updateRowCollected(root, tr) {
        var input = rowInput(tr, 'collected');
        if (!input) return;
        var terms = readTerms(rowInput(tr, 'terms').value);
        // Check: the check is the payment, handed over on delivery, so nothing is collected in cash.
        input.disabled = terms === 'check';
        if (terms === 'check') { input.value = ''; input.dataset.manual = ''; return; }
        if (input.dataset.manual === '1') return;
        var hasQty = rowInput(tr, 'ordered').value !== '' || rowInput(tr, 'pulled').value !== '';
        var c = hasQty ? rowCollection(root, tr) : { amount: 0 };
        input.value = c.amount ? String(Math.round(c.amount * 100) / 100) : '';
    }

    function markRow(tr) {
        var any = Array.prototype.some.call(tr.querySelectorAll('input[type="number"]'), function (i) { return i.value !== ''; });
        tr.classList.toggle('dpos-row-on', any);
    }

    function updateCount(root) {
        var rows = root.querySelectorAll('tr[data-row]');
        var on = root.querySelectorAll('tr[data-row].dpos-row-on').length;
        root.querySelector('[data-list-title]').textContent = 'Shops · ' + areaLabel(field(root, 'area').value) + ' · ' + (field(root, 'date').value || '—');
        var rec = root.querySelector('[data-recorded]');
        if (rec) rec.textContent = on + ' of ' + rows.length;
    }

    function numInput(key, value, placeholder) {
        return '<input type="number" min="0" step="' + (key === 'collected' ? '0.01' : '1') + '" inputmode="' + (key === 'collected' ? 'decimal' : 'numeric') +
            '" data-k="' + key + '" value="' + (value == null ? '' : esc(value)) + '" placeholder="' + esc(placeholder || '') + '">';
    }

    // Every shop of the area as an input row, filled in from the saved sheet for this date.
    function renderList(root) {
        var date = field(root, 'date').value;
        var area = field(root, 'area').value;
        var sheet = findSheet(date, area);
        var saved = sheet ? (sheet.entries || []) : [];
        var full = canRecordMoney();
        var rows = shopsForArea(area).map(function (shop) {
            var s = { name: shop.name, accountId: shop.id };
            var e = saved.filter(function (x) { return sameShop(x, s); })[0] || null;
            return { name: shop.name, id: shop.id, usual: shop.usualPcs || 0, price: shop.price || 0, entry: e };
        });
        saved.forEach(function (e) {
            var name = e.accountName || e.retailerName;
            if (rows.some(function (r) { return sameShop(e, { name: r.name, accountId: r.id }); })) return;
            rows.push({ name: name, id: e.accountId || '', usual: 0, entry: e });
        });
        var host = root.querySelector('[data-list]');
        if (!rows.length) {
            host.innerHTML = '<p class="dpos-empty">No shops under ' + esc(areaLabel(area)) + ' yet. Move or add shops in Settings › Retailers.</p>';
            updateCount(root);
            return;
        }
        // Fixed column widths (px) so the terms, numbers and notes are never squeezed.
        var cols = [44, 230, 148, 96, 96, 108, 104].concat(full ? [96, 132] : []).concat([220]);
        var tableWidth = cols.reduce(function (t, w) { return t + w; }, 0);
        var qtyCount = full ? 5 : 4;
        host.innerHTML = '<div class="dpos-sheet-wrap"><table class="dpos-table dpos-sheet" style="min-width:' + tableWidth + 'px">' +
            '<colgroup>' + cols.map(function (w) { return '<col style="width:' + w + 'px">'; }).join('') + '</colgroup>' +
            '<thead><tr class="dpos-group"><th class="dpos-stick1"></th><th class="dpos-stick2"></th><th></th>' +
                '<th class="dpos-g" colspan="' + qtyCount + '">Quantity (pcs)</th>' +
                (full ? '<th class="dpos-g">Payment</th>' : '') + '<th></th></tr>' +
            '<tr><th class="dpos-stick1 n">#</th><th class="dpos-stick2">Shop</th><th>Terms</th>' +
                '<th class="n">Ordered</th><th class="n">Staff</th><th class="n">Pulled out</th><th class="n">Replaced</th>' +
                (full ? '<th class="n">Expired</th><th class="n">Collected (₱)</th>' : '') + '<th>Notes</th></tr></thead><tbody>' +
            rows.map(function (r, i) {
                var e = r.entry && isRecorded(r.entry) ? r.entry : null;
                var terms = e ? entryTerms(e) : 'cons';
                var collected = e && terms !== 'check' && e.collected != null ? e.collected : '';
                return '<tr data-row="' + i + '" data-name="' + esc(r.name) + '" data-id="' + esc(r.id) + '" data-price="' + (r.price || '') + '">' +
                    '<td class="dpos-num dpos-stick1">' + (i + 1) + '</td>' +
                    '<td class="dpos-shop dpos-stick2">' + esc(r.name) + (full && r.price ? '<small class="dpos-price">' + peso(r.price) + ' / pouch</small>' : '') + '</td>' +
                    '<td class="dpos-terms" data-label="Terms"><select data-k="terms" aria-label="Terms">' + ['cons', 'cod', 'check'].map(function (t) {
                        return '<option value="' + t + '"' + (t === terms ? ' selected' : '') + '>' + TERM_LABELS[t] + '</option>';
                    }).join('') + '</select></td>' +
                    '<td class="n" data-label="Ordered">' + numInput('ordered', e ? orderedOf(e) : '', r.usual ? String(r.usual) : '') + '</td>' +
                    '<td class="n" data-label="Staff">' + numInput('staff', e ? e.staff : '') + '</td>' +
                    '<td class="n" data-label="Pulled out">' + numInput('pulled', e ? e.po : '') + '</td>' +
                    '<td class="n" data-label="Replaced">' + numInput('replaced', e ? e.replaced : '') + '</td>' +
                    (full ? '<td class="n" data-label="Expired">' + numInput('expired', e ? e.expired : '') + '</td>' +
                        '<td class="n" data-label="Collected (₱)">' + numInput('collected', collected) + '</td>' : '') +
                    '<td class="dpos-notes" data-label="Notes"><input type="text" maxlength="100" data-k="notes" value="' + esc(e ? cleanNotes(e.notes) : '') + '" placeholder="Reason / notes" aria-label="Notes"></td>' +
                    '</tr>';
            }).join('') + '</tbody></table></div>';
        host.querySelectorAll('tr[data-row]').forEach(function (tr) {
            var collected = rowInput(tr, 'collected');
            if (collected && collected.value !== '') collected.dataset.manual = '1';
            if (collected) collected.disabled = readTerms(rowInput(tr, 'terms').value) === 'check';
            markRow(tr);
        });
        updateCount(root);
        renderLedger(root);
    }

    /* ---- Shop balances: sales, collections and outstanding per shop ----
       Worked out from the saved route sheets (nothing is typed twice):
         Delivered  = pouches left at the shop (Cons + COD + Check).
         Replaced   = new pouches swapped for pouches the shop already paid for (consignment) that went old:
                      no charge and no new sale, but they still leave the Inventory. Staff are not sold to the shop.
         Sold       = COD / Check: delivered − pulled out on the same visit.
                      Consignment: the last consignment delivery − pulled out on this visit (paid at the next visit).
         Sales (₱)  = Sold × the shop's retailer price.
         Collected  = cash or check received on that visit.
         Outstanding = Sales − Collected, carried from visit to visit.
         On consignment = the last consignment delivery, still at the shop and not yet billed. */
    function shopPrice(shop) {
        var a = accounts.filter(function (x) {
            return (shop.accountId && x.id === shop.accountId) || cleanName(x.name) === cleanName(shop.name);
        })[0];
        return a && a.price > 0 ? a.price : retailerPrice();
    }

    function shopLedger(shop, upto) {
        var price = shopPrice(shop);
        var visits = [];
        sheets.slice().sort(function (a, b) { return String(a.reportDate).localeCompare(String(b.reportDate)); }).forEach(function (sheet) {
            if (!sheet.reportDate || (upto && sheet.reportDate > upto)) return;
            (sheet.entries || []).forEach(function (e) {
                if (sameShop(e, shop) && isRecorded(e)) visits.push({ date: sheet.reportDate, e: e });
            });
        });
        var consAtShop = 0, balance = 0;
        var t = { delivered: 0, pulled: 0, replaced: 0, sold: 0, sales: 0, collected: 0 };
        var rows = visits.map(function (v) {
            var e = v.e;
            var terms = entryTerms(e);
            var delivered = deliveredQty(e);
            var pulled = num(e.po);
            var sold = terms === 'cons' ? Math.max(0, consAtShop - pulled) : Math.max(0, delivered - pulled);
            if (terms === 'cons') consAtShop = delivered;
            else if (delivered) consAtShop = 0;
            var sales = Math.round(sold * price * 100) / 100;
            // Check: the check handed over on delivery pays the pouches sold in full.
            var collected = terms === 'check' ? sales : num(e.collected);
            balance = Math.round((balance + sales - collected) * 100) / 100;
            t.delivered += delivered; t.pulled += pulled; t.replaced += num(e.replaced);
            t.sold += sold; t.sales += sales; t.collected += collected;
            return { date: v.date, terms: terms, delivered: delivered, pulled: pulled, replaced: num(e.replaced),
                sold: sold, sales: sales, collected: collected, balance: balance };
        });
        return { price: price, rows: rows, totals: t, balance: balance, onConsignment: consAtShop };
    }

    function renderLedger(root) {
        var host = root.querySelector('[data-ledger]');
        if (!host) return;
        var area = field(root, 'area').value;
        var date = field(root, 'date').value;
        var shops = shopsForArea(area).map(function (s) { return { name: s.name, accountId: s.id }; });
        if (!shops.length) { host.innerHTML = ''; return; }
        var open = host.getAttribute('data-open') || '';
        var sum = { sales: 0, collected: 0, balance: 0, onCons: 0 };
        var body = shops.map(function (shop, i) {
            var l = shopLedger(shop, date);
            if (!l.rows.length) return '';
            var last = l.rows[l.rows.length - 1];
            sum.sales += l.totals.sales; sum.collected += l.totals.collected; sum.balance += l.balance; sum.onCons += l.onConsignment;
            var key = String(shop.accountId || cleanName(shop.name));
            var html = '<tr>' +
                '<td class="dpos-shop">' + esc(shop.name) + '<small class="dpos-price">' + peso(l.price) + ' / pouch · ' + l.rows.length + ' visit' + (l.rows.length === 1 ? '' : 's') + '</small></td>' +
                '<td>' + esc(TERM_LABELS[last.terms]) + '</td>' +
                '<td class="n">' + l.totals.delivered + '</td>' +
                '<td class="n">' + l.totals.pulled + '</td>' +
                '<td class="n">' + l.totals.sold + '</td>' +
                '<td class="n">' + l.onConsignment + '</td>' +
                '<td class="n">' + peso(l.totals.sales) + '</td>' +
                '<td class="n">' + peso(l.totals.collected) + '</td>' +
                '<td class="n"><strong style="color:' + (l.balance > 0.009 ? '#b3261e' : (l.balance < -0.009 ? '#1a56b0' : '#2e7d32')) + '">' + peso(l.balance) + '</strong></td>' +
                '<td><button type="button" class="dpos-clear" style="height:34px;padding:0 12px" data-ledger-open="' + esc(key) + '">' + (open === key ? 'Hide' : 'Statement') + '</button></td>' +
                '</tr>';
            if (open === key) {
                html += '<tr class="dpos-ledger-detail"><td colspan="10"><table class="dpos-table" style="width:100%;margin:4px 0 10px;background:#fffaf5">' +
                    '<thead><tr><th>Date</th><th>Terms</th><th class="n">Delivered</th><th class="n">Replaced</th><th class="n">Pulled out</th><th class="n">Sold</th>' +
                    '<th class="n">Sales (₱)</th><th class="n">Collected (₱)</th><th class="n">Outstanding (₱)</th></tr></thead><tbody>' +
                    l.rows.map(function (r) {
                        return '<tr><td>' + esc(r.date) + '</td><td>' + esc(TERM_LABELS[r.terms]) + '</td><td class="n">' + r.delivered + '</td><td class="n">' + r.replaced +
                            '</td><td class="n">' + r.pulled + '</td><td class="n">' + r.sold + '</td><td class="n">' + peso(r.sales) + '</td><td class="n">' + peso(r.collected) +
                            '</td><td class="n"><strong>' + peso(r.balance) + '</strong></td></tr>';
                    }).join('') + '</tbody></table></td></tr>';
            }
            return html;
        }).join('');
        host.innerHTML = '<h4>Shop balances · ' + esc(areaLabel(area)) + ' · ' + esc(sheetsFrom || '') + ' to ' + esc(date || '') + '</h4>' +
            '<p class="dpos-sub" style="margin:0 0 10px">Sales = pouches sold × retailer price (COD and Check: on delivery; Consignment: at the next visit). ' +
            'Collected = cash received (Check: the check given on delivery pays in full). Outstanding = Sales − Collected. On consignment = pouches still at the shop, billed at the next visit. Replaced = new pouches swapped for pouches the shop already paid for, so they are not charged again; enter them only under Replaced, not Pulled out. Staff pouches are not sales to the shop.</p>' +
            (body ? '<div class="dpos-sheet-wrap"><table class="dpos-table" style="min-width:1020px;width:100%">' +
                '<thead><tr><th>Shop</th><th>Terms</th><th class="n">Delivered</th><th class="n">Pulled out</th><th class="n">Sold</th><th class="n">On consignment</th>' +
                '<th class="n">Sales (₱)</th><th class="n">Collected (₱)</th><th class="n">Outstanding (₱)</th><th></th></tr></thead><tbody>' + body +
                '<tr style="font-weight:800;border-top:2px solid #d7ccc8"><td colspan="5" style="text-align:right">Area total</td><td class="n">' + sum.onCons + '</td><td class="n">' + peso(sum.sales) +
                '</td><td class="n">' + peso(sum.collected) + '</td><td class="n">' + peso(sum.balance) + '</td><td></td></tr>' +
                '</tbody></table></div>'
                : '<p class="dpos-empty">No deliveries recorded for these shops yet.</p>');
        host.querySelectorAll('[data-ledger-open]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var k = btn.getAttribute('data-ledger-open');
                host.setAttribute('data-open', host.getAttribute('data-open') === k ? '' : k);
                renderLedger(root);
            });
        });
    }

    function refresh(root) {
        return loadSheets(field(root, 'date').value).then(function () {
            root.dataset.dirty = '';
            renderList(root);
        }).catch(function (err) {
            setStatus(root, (err && err.message) || 'Could not load the route sheets.', 'err');
        });
    }

    function clearForm(root) {
        root.dataset.dirty = '';
        root.querySelectorAll('tr[data-row]').forEach(function (tr) {
            tr.querySelectorAll('input').forEach(function (i) { i.value = ''; i.dataset.manual = ''; });
            markRow(tr);
        });
        updateCount(root);
    }

    // Builds the sheet entry for one row, or null when no number was entered (not recorded).
    function entryFromRow(root, tr, oldEntry, full) {
        var v = function (k) { var i = rowInput(tr, k); return i ? String(i.value).trim() : ''; };
        var terms = readTerms(v('terms'));
        var ordered = v('ordered'), staffQty = v('staff'), pulled = v('pulled'), replaced = v('replaced');
        var expired = full ? v('expired') : '';
        var collected = full && terms !== 'check' ? v('collected') : '';
        var shown = [ordered, staffQty, pulled, replaced, expired, collected];
        if (shown.some(function (x) { return x !== '' && num(x) < 0; })) throw new Error('Numbers cannot be negative (' + rowShop(tr).name + ').');
        var hiddenKept = !full && oldEntry && (num(oldEntry.expired) > 0 || num(oldEntry.collected) > 0);
        if (shown.every(function (x) { return x === ''; }) && !hiddenKept) return null;

        var shop = rowShop(tr);
        var entry = oldEntry ? rawEntry(oldEntry) : { retailerName: shop.name };
        if (shop.accountId) entry.accountId = shop.accountId;
        function put(key, value) {
            if (value === '') delete entry[key];
            else entry[key] = num(value);
        }
        TERM_KEYS.forEach(function (k) { if (k !== terms) delete entry[k]; });
        put(terms, ordered);
        put('staff', staffQty);
        put('po', pulled);
        put('replaced', replaced);
        if (full) {
            put('expired', expired);
            if (terms === 'check') delete entry.collected;
            else put('collected', collected);
        }
        var notes = [];
        var reason = v('notes');
        if (reason) notes.push(reason);
        var expiredQty = full ? num(expired) : num(entry.expired);
        if (expiredQty > 0) notes.push('Expired: ' + expiredQty + ' pcs');
        if (full && terms === 'cons' && num(collected) > 0) {
            var c = rowCollection(root, tr);
            if (c.forDate) notes.push('Collection for ' + c.forDate + ' delivery');
        } else if (!full && oldEntry && oldEntry.notes) {
            var keptCollect = String(oldEntry.notes).match(COLLECT_NOTE);
            if (keptCollect) notes.push(keptCollect[0].replace(/^;\s*/, ''));
        }
        if (notes.length) entry.notes = notes.join('; ');
        else delete entry.notes;
        return entry;
    }

    function save(root) {
        var date = field(root, 'date').value;
        var area = field(root, 'area').value;
        if (!date) return setStatus(root, 'Choose the delivery date.', 'err');
        var full = canRecordMoney();
        var trs = Array.prototype.slice.call(root.querySelectorAll('tr[data-row]'));
        if (!trs.length) return setStatus(root, 'There are no shops under this area.', 'err');

        var btn = root.querySelector('[data-act="save"]');
        btn.disabled = true;
        btn.textContent = 'Saving…';
        setStatus(root, '', '');

        loadSheets(date).then(function () {
            var sheet = findSheet(date, area);
            var original = sheet ? (sheet.entries || []) : [];
            var used = {};
            var entries = [];
            trs.forEach(function (tr) {
                var shop = rowShop(tr);
                var idx = -1;
                original.forEach(function (e, i) { if (idx < 0 && !used[i] && sameShop(e, shop)) idx = i; });
                if (idx >= 0) used[idx] = true;
                var entry = entryFromRow(root, tr, idx >= 0 ? original[idx] : null, full);
                if (entry) entries.push(entry);
            });
            // Rows on the sheet that are not shops of this area stay as they are.
            original.forEach(function (e, i) { if (!used[i] && isRecorded(e)) entries.push(rawEntry(e)); });
            if (!entries.length && !sheet) throw new Error('Enter numbers for at least one shop.');
            var report = {
                id: sheet ? sheet.id : ('pos-' + area + '-' + date.replace(/-/g, '') + '-' + Date.now()),
                reportDate: date,
                source: area,
                areaLabel: (sheet && sheet.areaLabel) || areaLabel(area),
                entries: entries,
                totalExpense: sheet ? (Number(sheet.totalExpense) || 0) : 0
            };
            return request('/api/route-sheets', report).then(function () {
                var stockText = '';
                try { stockText = syncDeliveryStock(report.id, !!sheet, original, entries, report.areaLabel, date); } catch (e) { stockText = ''; }
                window.__kreezbySalesListRequest = null;
                if (window.KreezbySales && typeof window.KreezbySales.reloadFromServer === 'function') {
                    window.KreezbySales.reloadFromServer().catch(function () {});
                }
                setStatus(root, 'Saved ' + entries.length + ' shop' + (entries.length === 1 ? '' : 's') + ' to the ' + areaLabel(area) + ' route sheet for ' + date + '.' + stockText, 'ok');
                return refresh(root);
            });
        }).catch(function (err) {
            setStatus(root, (err && err.message) || 'Could not save the delivery.', 'err');
        }).then(function () {
            btn.disabled = false;
            btn.textContent = 'Save delivery';
        });
    }

    // ---- Finished stock out for retailer deliveries ----
    // Retailers receive Chocolate Crinkles. Pouches delivered (Cons / COD / Check) plus pouches
    // given as replacements leave the finished stock when the delivery is saved. What a saved
    // sheet already took out is remembered, so saving it again only takes out (or puts back)
    // the difference. Pulled-out pouches are returns from the shops and are not put back on sale.
    var DELIVERY_PRODUCT = 'Chocolate Crinkles';
    var DELIVERY_STOCK_KEY = 'kreezby_delivery_stock_v1';
    function deliveryOut(entries) {
        return (entries || []).reduce(function (t, e) { return t + deliveredQty(e) + (num(e.replaced) || 0); }, 0);
    }
    function readDeliveryStock() {
        try { var m = JSON.parse(localStorage.getItem(DELIVERY_STOCK_KEY) || '{}'); return m && typeof m === 'object' ? m : {}; } catch (e) { return {}; }
    }
    // Returns a short text for the status line, or '' when nothing changed.
    function syncDeliveryStock(sheetId, existedBefore, previousEntries, entries, areaText, date) {
        var dict = window.KreezbyDictionary;
        var map = readDeliveryStock();
        var already = map[sheetId];
        // A sheet saved before this was added: what it delivered was never taken out, and its
        // pouches are long gone, so only changes from now on count.
        if (already == null) already = existedBefore ? deliveryOut(previousEntries) : 0;
        var now = deliveryOut(entries);
        var diff = now - already;
        // Pulled out (and expired among them) are logged as retailer returns, by difference too.
        var retKey = sheetId + ':returned';
        var pulledNow = 0, expiredNow = 0;
        (entries || []).forEach(function (e) { pulledNow += num(e.po); expiredNow += num(e.expired); });
        var pulledBefore = map[retKey] != null ? map[retKey] : (existedBefore ? (previousEntries || []).reduce(function (s, e) { return s + num(e.po); }, 0) : 0);
        if (pulledNow !== pulledBefore && dict && typeof dict.recordRetailerReturn === 'function') {
            var change = pulledNow - pulledBefore;
            dict.recordRetailerReturn(DELIVERY_PRODUCT, change, change > 0 ? expiredNow : 0, change > 0
                ? change + ' pouches pulled out from ' + areaText + ' retailers on ' + date + ', kept out of sellable stock'
                : 'Pulled-out count for ' + areaText + ' on ' + date + ' corrected (' + change + ')');
            map[retKey] = pulledNow;
            try { localStorage.setItem(DELIVERY_STOCK_KEY, JSON.stringify(map)); } catch (e) { /* optional */ }
        }
        if (diff && dict && typeof dict.recordDeliveryStock === 'function') {
            var left = dict.recordDeliveryStock(DELIVERY_PRODUCT, diff, diff > 0
                ? diff + ' pouches delivered to ' + areaText + ' retailers on ' + date + ' (incl. replacements)'
                : 'Returned: ' + areaText + ' delivery on ' + date + ' was corrected (' + (-diff) + ' pouches)');
            if (left == null) return '';
            map[sheetId] = now;
            try { localStorage.setItem(DELIVERY_STOCK_KEY, JSON.stringify(map)); } catch (e) { /* optional */ }
            return diff > 0
                ? ' ' + diff + ' pouches of ' + DELIVERY_PRODUCT + ' taken out of the Inventory (' + left + ' left).'
                : ' ' + (-diff) + ' pouches of ' + DELIVERY_PRODUCT + ' put back on the Inventory (' + left + ' on hand).';
        }
        if (map[sheetId] !== now) {
            map[sheetId] = now;
            try { localStorage.setItem(DELIVERY_STOCK_KEY, JSON.stringify(map)); } catch (e) { /* optional */ }
        }
        return '';
    }

    function isAllowedPage() {
        var path = pagePath();
        return path.indexOf('/admin/') >= 0 || path.indexOf('/head_admin/') >= 0 || path.indexOf('/staff/') >= 0;
    }

    function mount() {
        var pos = document.getElementById('pos-master');
        if (!pos || !isAllowedPage() || document.getElementById('delivery-pos')) return;
        injectStyle();

        var switcher = document.createElement('div');
        switcher.className = 'dpos-switch';
        switcher.setAttribute('role', 'tablist');
        switcher.innerHTML =
            '<button type="button" data-mode="walkin" role="tab">Walk-in POS</button>' +
            '<button type="button" data-mode="delivery" role="tab">Retailer Delivery</button>';
        pos.parentNode.insertBefore(switcher, pos);

        var root = document.createElement('div');
        root.id = 'delivery-pos';
        root.className = 'panel-data-card';
        root.innerHTML = formHtml();
        root.hidden = true;
        pos.parentNode.insertBefore(root, pos.nextSibling);

        field(root, 'date').value = today();
        var mode = 'walkin';
        try { mode = sessionStorage.getItem('kreezby-pos-mode') || 'walkin'; } catch (e) { mode = 'walkin'; }

        function setVisible(el, on) {
            el.hidden = !on;
            if (on) el.style.removeProperty('display');
            else el.style.setProperty('display', 'none', 'important');
        }

        function show(next) {
            mode = next;
            setVisible(pos, next === 'walkin');
            setVisible(root, next === 'delivery');
            switcher.querySelectorAll('button').forEach(function (b) {
                var on = b.getAttribute('data-mode') === next;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            try { sessionStorage.setItem('kreezby-pos-mode', next); } catch (e) { /* ignore */ }
            if (next === 'delivery') {
                // Shops and route sheets are only fetched once Retailer Delivery is opened.
                if (!root.dataset.loaded) {
                    root.dataset.loaded = '1';
                    // Shops show at once (saved copy or the preload below); saved numbers fill in
                    // as soon as the route sheets arrive.
                    paintAreas();
                    if (accounts.length) renderList(root);
                    preload.then(function () {
                        paintAreas();
                        if (root.dataset.dirty !== '1') renderList(root);
                        if (movePanel && !movePanel.hidden) fillMove();
                    });
                } else if (root.dataset.dirty !== '1') {
                    refresh(root);
                }
            }
        }
        function paintAreas() {
            var keepArea = field(root, 'area').value;
            field(root, 'area').innerHTML = AREAS.map(function (a) { return '<option value="' + a.value + '">' + esc(a.label) + '</option>'; }).join('');
            field(root, 'area').value = keepArea || (AREAS[0] && AREAS[0].value) || '';
        }
        // Load shops and recent route sheets as soon as the POS page opens, before the
        // Retailer Delivery tab is clicked.
        cachedAccounts();
        var preload = Promise.all([
            loadAccounts(),
            loadSheets(field(root, 'date').value).catch(function () { return []; })
        ]);
        switcher.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-mode]');
            if (b) show(b.getAttribute('data-mode'));
        });
        // A shop moved to another area in Settings shows under its new area right away.
        function areaOptionsHtml() {
            return AREAS.map(function (a) { return '<option value="' + a.value + '">' + esc(a.label) + '</option>'; }).join('');
        }
        document.addEventListener('kreezby:remote-state', function (event) {
            var keys = (event && event.detail && event.detail.keys) || [];
            if (keys.indexOf('kreezby_maintenance_users') === -1 || !root.dataset.loaded || !document.body.contains(root)) return;
            if (root.querySelector('tr[data-row].dpos-row-on')) return; // keep numbers being typed
            var keepArea = field(root, 'area').value;
            accountsPromise = null;
            loadAccounts().then(function () {
                field(root, 'area').innerHTML = areaOptionsHtml();
                field(root, 'area').value = keepArea;
                renderList(root);
            });
        });

        // ---- Move a shop to another area (head admin and admin) ----
        var movePanel = root.querySelector('[data-move]');
        function moveStatus(text, kind) {
            var el = root.querySelector('[data-move-status]');
            if (!el) return;
            el.textContent = text || '';
            el.className = 'dpos-status' + (kind ? ' ' + kind : '');
        }
        // Delivery areas, plus areas added in Settings (not Batangas City: it is not a delivery area).
        function moveAreaNames() {
            var names = AREAS.map(function (a) { return a.label; });
            var seen = {};
            names.forEach(function (n) { seen[cleanName(n).replace(/\bsanto\b/g, 'sto').replace(/\s+/g, '')] = true; });
            try {
                (JSON.parse(localStorage.getItem('kreezby_areas_v1') || '[]') || []).forEach(function (r) {
                    var label = String((r && r.name) || '').trim();
                    var k = cleanName(label).replace(/\bsanto\b/g, 'sto').replace(/\s+/g, '');
                    if (!label || seen[k] || k === 'batangascity') return;
                    seen[k] = true;
                    names.push(label);
                });
            } catch (e) { /* none */ }
            return names;
        }
        function fillMove() {
            if (!movePanel) return;
            var area = field(root, 'area').value;
            var shops = shopsForArea(area);
            var shopSel = root.querySelector('[data-move-shop]');
            var keep = shopSel.value;
            shopSel.innerHTML = shops.length
                ? shops.map(function (s) { return '<option value="' + esc(s.id) + '" data-name="' + esc(s.name) + '">' + esc(s.name) + '</option>'; }).join('')
                : '<option value="">No shops under ' + esc(areaLabel(area)) + '</option>';
            if (keep && shops.some(function (s) { return s.id === keep; })) shopSel.value = keep;
            shopSel.disabled = !shops.length;
            var here = cleanName(areaLabel(area));
            root.querySelector('[data-move-area]').innerHTML = moveAreaNames().filter(function (n) { return cleanName(n) !== here; })
                .map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
            root.querySelector('[data-act="move-save"]').disabled = !shops.length;
        }
        function toggleMove(open) {
            if (!movePanel) return;
            movePanel.hidden = !open;
            var btn = root.querySelector('[data-act="move-open"]');
            if (btn) btn.classList.toggle('is-open', open);
            moveStatus('', '');
            if (open) fillMove();
        }
        if (movePanel) {
            root.querySelector('[data-act="move-open"]').addEventListener('click', function () { toggleMove(movePanel.hidden); });
            root.querySelector('[data-act="move-cancel"]').addEventListener('click', function () { toggleMove(false); });
            root.querySelector('[data-act="move-save"]').addEventListener('click', function () {
                var shopSel = root.querySelector('[data-move-shop]');
                var opt = shopSel.options[shopSel.selectedIndex];
                var toArea = root.querySelector('[data-move-area]').value;
                if (!opt || !opt.value) return moveStatus('Choose the shop to move.', 'err');
                if (!toArea) return moveStatus('Choose the area to move the shop to.', 'err');
                var shopName = opt.getAttribute('data-name') || opt.textContent;
                if (root.querySelector('tr[data-row].dpos-row-on') && !window.confirm('Numbers typed on this screen that are not saved yet will be cleared. Move ' + shopName + ' to ' + toArea + '?')) return;
                var btn = this;
                btn.disabled = true;
                btn.textContent = 'Moving…';
                moveStatus('', '');
                request('/api/move-retailer', { accountId: opt.value, name: shopName, area: toArea }).then(function (data) {
                    var toValue = areaForAccount(data.to || toArea);
                    accounts.forEach(function (a) {
                        if (a.id === opt.value || cleanName(a.name) === cleanName(shopName)) { a.area = data.to || toArea; a.source = toValue; }
                    });
                    try {
                        var saved = JSON.parse(localStorage.getItem(SHOPS_CACHE) || '[]');
                        if (Array.isArray(saved)) {
                            saved.forEach(function (a) { if (a && (a.id === opt.value || cleanName(a.name) === cleanName(shopName))) a.area = data.to || toArea; });
                            localStorage.setItem(SHOPS_CACHE, JSON.stringify(saved));
                        }
                    } catch (e) { /* optional */ }
                    accountsPromise = null;
                    var keepArea = field(root, 'area').value;
                    field(root, 'area').innerHTML = AREAS.map(function (a) { return '<option value="' + a.value + '">' + esc(a.label) + '</option>'; }).join('');
                    field(root, 'area').value = keepArea;
                    root.dataset.dirty = '';
                    renderList(root);
                    fillMove();
                    moveStatus(shopName + ' was moved from ' + (data.from || areaLabel(keepArea)) + ' to ' + (data.to || toArea) + '.', 'ok');
                }).catch(function (err) {
                    moveStatus((err && err.message) || 'Could not move the shop.', 'err');
                }).then(function () {
                    btn.disabled = false;
                    btn.textContent = 'Move shop';
                });
            });
        }

        field(root, 'area').addEventListener('change', function () { setStatus(root, '', ''); root.dataset.dirty = ''; renderList(root); if (movePanel && !movePanel.hidden) { moveStatus('', ''); fillMove(); } });
        field(root, 'date').addEventListener('change', function () {
            setStatus(root, '', '');
            root.dataset.dirty = '';
            renderList(root);
            // A date further back than the loaded sheets: fetch that window too.
            if (!sheetsCover(field(root, 'date').value)) refresh(root);
        });
        var list = root.querySelector('[data-list]');
        list.addEventListener('input', function (e) {
            var tr = e.target.closest('tr[data-row]');
            if (!tr) return;
            var k = e.target.getAttribute('data-k');
            root.dataset.dirty = '1';
            if (k === 'collected') e.target.dataset.manual = e.target.value === '' ? '' : '1';
            if (k === 'ordered' || k === 'pulled') updateRowCollected(root, tr);
            markRow(tr);
            updateCount(root);
        });
        list.addEventListener('change', function (e) {
            var tr = e.target.closest('tr[data-row]');
            if (!tr || e.target.getAttribute('data-k') !== 'terms') return;
            var c = rowInput(tr, 'collected');
            if (c) c.dataset.manual = '';
            updateRowCollected(root, tr);
            markRow(tr);
            updateCount(root);
        });
        root.querySelector('[data-act="save"]').addEventListener('click', function () { save(root); });
        root.querySelector('[data-act="clear"]').addEventListener('click', function () { clearForm(root); setStatus(root, '', ''); });

        show(mode);
    }

    window.KreezbyDeliveryPos = { boot: mount };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
    document.addEventListener('turbo:frame-load', mount);
    document.addEventListener('kreezby:page-load', mount);
})();
