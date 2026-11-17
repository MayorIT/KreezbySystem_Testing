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
                (full ? ' Collected fills in by itself (COD: today\'s delivery; Consignment: the last delivery) and can be changed.' : '') + '</p>' +
            '</div></div>' +
            '<div class="dpos-toolbar">' +
                '<label class="dpos-field">Delivery date<input type="date" data-f="date"></label>' +
                '<label class="dpos-field">Area<select data-f="area">' + AREAS.map(function (a) {
                    return '<option value="' + a.value + '">' + esc(a.label) + '</option>';
                }).join('') + '</select></label>' +
                '<div class="dpos-recorded" aria-live="polite"><span>Shops recorded</span><strong data-recorded>0 of 0</strong></div>' +
            '</div>' +
            '<div class="dpos-list"><h4 data-list-title>Shops</h4><div data-list><p class="dpos-empty">Loading shops…</p></div></div>' +
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
                window.__kreezbySalesListRequest = null;
                if (window.KreezbySales && typeof window.KreezbySales.reloadFromServer === 'function') {
                    window.KreezbySales.reloadFromServer().catch(function () {});
                }
                setStatus(root, 'Saved ' + entries.length + ' shop' + (entries.length === 1 ? '' : 's') + ' to the ' + areaLabel(area) + ' route sheet for ' + date + '.', 'ok');
                return refresh(root);
            });
        }).catch(function (err) {
            setStatus(root, (err && err.message) || 'Could not save the delivery.', 'err');
        }).then(function () {
            btn.disabled = false;
            btn.textContent = 'Save delivery';
        });
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

        field(root, 'area').addEventListener('change', function () { setStatus(root, '', ''); root.dataset.dirty = ''; renderList(root); });
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
