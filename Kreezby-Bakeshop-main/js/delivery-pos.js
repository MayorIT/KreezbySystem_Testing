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

    function loadAccounts() {
        if (accountsPromise) return accountsPromise;
        accountsPromise = request('/api/retailer-records').then(function (data) {
            accounts = (data.accounts || []).map(function (a) {
                return { id: a.id, name: a.name, area: a.area || '', source: areaForAccount(a.area), usualPcs: Number(a.usualPcs) || 0, price: Number(a.retailerPrice) || 0 };
            });
            return accounts;
        }).catch(function () {
            accountsPromise = null;
            return [];
        });
        return accountsPromise;
    }

    function loadSheets() {
        return request('/api/sales-list').then(function (data) {
            sheets = (data.dailyReports || []).filter(function (s) { return !s.isTestData; });
            return sheets;
        });
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
        if (document.getElementById('kz-dpos-style')) return;
        var s = document.createElement('style');
        s.id = 'kz-dpos-style';
        s.textContent =
            '.dpos-switch{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}' +
            '.dpos-switch button{border:1px solid #e0d6ce;background:#fff;color:#5d4037;border-radius:999px;padding:9px 18px;font:inherit;font-weight:700;font-size:14px;cursor:pointer}' +
            '.dpos-switch button.is-active{background:#ffca28;border-color:#ffca28;color:#3d2c2a}' +
            '#delivery-pos{padding:20px 22px}' +
            '#delivery-pos h3{margin:0;font-size:18px;color:#3d2c2a}' +
            '#delivery-pos .dpos-sub{margin:4px 0 18px;color:#8a817c;font-size:13px}' +
            '.dpos-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:14px}' +
            '.dpos-grid.four{grid-template-columns:repeat(4,minmax(0,1fr))}' +
            '.dpos-grid.five{grid-template-columns:repeat(5,minmax(0,1fr))}' +
            '.dpos-grid.six{grid-template-columns:repeat(6,minmax(0,1fr))}' +
            '.dpos-calc{margin:-4px 0 14px;padding:9px 12px;border-radius:10px;background:#fff8e1;color:#5d4037;font-size:13px;font-weight:600}' +
            '.dpos-calc[hidden]{display:none}' +
            '.dpos-field{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#5d4037;text-transform:uppercase;letter-spacing:.03em}' +
            '.dpos-field small{font-weight:600;text-transform:none;letter-spacing:0;color:#9a918b}' +
            '.dpos-field input,.dpos-field select{padding:10px 12px;border:1px solid #d7ccc8;border-radius:10px;font:inherit;font-size:15px;text-transform:none;letter-spacing:0;color:#2b241f;background:#fff}' +
            '.dpos-field input:focus,.dpos-field select:focus{outline:2px solid #ffca28;border-color:#ffca28}' +
            '.dpos-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 22px}' +
            '.dpos-save{background:#3d2c2a;color:#fff;border:none;border-radius:10px;padding:11px 22px;font:inherit;font-weight:700;cursor:pointer}' +
            '.dpos-save[disabled]{opacity:.6;cursor:wait}' +
            '.dpos-clear{background:#fff;border:1px solid #d7ccc8;border-radius:10px;padding:10px 16px;font:inherit;cursor:pointer;color:#5d4037}' +
            '.dpos-status{font-size:13px;font-weight:600}.dpos-status.ok{color:#2e7d32}.dpos-status.err{color:#c62828}' +
            '.dpos-list h4{margin:0 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#3e2723}' +
            '.dpos-table{width:100%;border-collapse:collapse;font-size:14px}' +
            '.dpos-table th,.dpos-table td{padding:9px 12px;border-bottom:1px solid #efe6df;text-align:left}' +
            '.dpos-table th{background:#fbf6f2;color:#5d4037;font-size:12px;text-transform:uppercase;letter-spacing:.03em}' +
            '.dpos-table .n{text-align:right;white-space:nowrap}' +
            '.dpos-table tr[data-shop]{cursor:pointer}.dpos-table tr[data-shop]:hover td{background:#fffaf0}' +
            '.dpos-table tr.dpos-unrecorded td{color:#9a8f88;font-style:italic}' +
            '.dpos-empty{color:#8d6e63;padding:14px 0}' +
            '.dpos-grid.dpos-grid-2{grid-template-columns:repeat(2,minmax(0,260px))}' +
            '.dpos-sheet-wrap{overflow-x:auto;border:1px solid #efe6df;border-radius:12px;margin-bottom:14px}' +
            '.dpos-sheet{min-width:980px}.dpos-sheet td{padding:6px 8px;vertical-align:middle}.dpos-sheet th{padding:9px 8px}' +
            '.dpos-sheet input,.dpos-sheet select{width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid #d7ccc8;border-radius:8px;font:inherit;font-size:14px;background:#fff;color:#2b241f}' +
            '.dpos-sheet input[type=number]{width:84px;text-align:right}.dpos-sheet input[data-k=collected]{width:104px}' +
            '.dpos-sheet input:focus,.dpos-sheet select:focus{outline:2px solid #ffca28;border-color:#ffca28}' +
            '.dpos-sheet input:disabled{background:#f5f1ee;color:#b0a7a1}' +
            '.dpos-sheet .dpos-num{color:#9a8f88;width:32px}.dpos-sheet .dpos-shop{font-weight:700;color:#3d2c2a;min-width:180px}' +
            '.dpos-sheet tr.dpos-row-on td{background:#fffbea}' +
            '.dpos-sheet .dpos-price{display:block;font-weight:600;font-size:11px;color:#8d6e63}' +
            '.dpos-sheet tbody tr:hover td{background:#fffaf0}' +
            '@media (max-width:560px){.dpos-grid.dpos-grid-2{grid-template-columns:1fr}}' +
            '@media (max-width:1100px){.dpos-grid.six{grid-template-columns:repeat(3,minmax(0,1fr))}}' +
            '@media (max-width:900px){.dpos-grid,.dpos-grid.four,.dpos-grid.five,.dpos-grid.six{grid-template-columns:1fr 1fr}}' +
            '@media (max-width:560px){.dpos-grid,.dpos-grid.four,.dpos-grid.five,.dpos-grid.six{grid-template-columns:1fr}}';
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
        return '<h3>Retailer Delivery</h3>' +
            '<p class="dpos-sub">Every shop of the area is listed. Type the numbers for the shops delivered to, then press <strong>Save delivery</strong>. Only shops with a number are recorded; they show on the <strong>Retailer</strong> sales list right away.' +
            (full ? ' Collected fills in by itself (COD: today\'s delivery; Consignment: the last delivery) and can be changed.' : '') + '</p>' +
            '<div class="dpos-grid dpos-grid-2">' +
                '<label class="dpos-field">Delivery date<input type="date" data-f="date"></label>' +
                '<label class="dpos-field">Area<select data-f="area">' + AREAS.map(function (a) {
                    return '<option value="' + a.value + '">' + esc(a.label) + '</option>';
                }).join('') + '</select></label>' +
            '</div>' +
            '<div class="dpos-list"><h4 data-list-title>Shops</h4><div data-list><p class="dpos-empty">Loading shops…</p></div></div>' +
            '<div class="dpos-actions">' +
                '<button type="button" class="dpos-save" data-act="save">Save delivery</button>' +
                '<button type="button" class="dpos-clear" data-act="clear">Clear</button>' +
                '<span class="dpos-status" data-status></span>' +
            '</div>';
    }

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
        root.querySelector('[data-list-title]').textContent = 'Shops · ' + areaLabel(field(root, 'area').value) + ' · ' +
            (field(root, 'date').value || '—') + ' · ' + on + ' of ' + rows.length + ' recorded';
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
        host.innerHTML = '<div class="dpos-sheet-wrap"><table class="dpos-table dpos-sheet"><thead><tr><th>#</th><th>Shop</th><th>Terms</th><th class="n">Ordered</th><th class="n">Staff</th><th class="n">Pulled out</th><th class="n">Replaced</th>' +
            (full ? '<th class="n">Expired</th><th class="n">Collected ₱</th>' : '') + '<th>Notes</th></tr></thead><tbody>' +
            rows.map(function (r, i) {
                var e = r.entry && isRecorded(r.entry) ? r.entry : null;
                var terms = e ? entryTerms(e) : 'cons';
                var collected = e && terms !== 'check' && e.collected != null ? e.collected : '';
                return '<tr data-row="' + i + '" data-name="' + esc(r.name) + '" data-id="' + esc(r.id) + '" data-price="' + (r.price || '') + '">' +
                    '<td class="dpos-num">' + (i + 1) + '</td>' +
                    '<td class="dpos-shop">' + esc(r.name) + (full && r.price ? '<small class="dpos-price">' + peso(r.price) + ' / pouch</small>' : '') + '</td>' +
                    '<td><select data-k="terms">' + ['cons', 'cod', 'check'].map(function (t) {
                        return '<option value="' + t + '"' + (t === terms ? ' selected' : '') + '>' + TERM_LABELS[t] + '</option>';
                    }).join('') + '</select></td>' +
                    '<td class="n">' + numInput('ordered', e ? orderedOf(e) : '', r.usual ? String(r.usual) : '') + '</td>' +
                    '<td class="n">' + numInput('staff', e ? e.staff : '') + '</td>' +
                    '<td class="n">' + numInput('pulled', e ? e.po : '') + '</td>' +
                    '<td class="n">' + numInput('replaced', e ? e.replaced : '') + '</td>' +
                    (full ? '<td class="n">' + numInput('expired', e ? e.expired : '') + '</td>' +
                        '<td class="n">' + numInput('collected', collected) + '</td>' : '') +
                    '<td><input type="text" maxlength="100" data-k="notes" value="' + esc(e ? cleanNotes(e.notes) : '') + '" placeholder="Reason / notes"></td>' +
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
        return loadSheets().then(function () {
            renderList(root);
        }).catch(function (err) {
            setStatus(root, (err && err.message) || 'Could not load the route sheets.', 'err');
        });
    }

    function clearForm(root) {
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

        loadSheets().then(function () {
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
                    Promise.all([loadAccounts(), loadSheets().catch(function () { return []; })]).then(function () {
                        var keepArea = field(root, 'area').value;
                        field(root, 'area').innerHTML = AREAS.map(function (a) { return '<option value="' + a.value + '">' + esc(a.label) + '</option>'; }).join('');
                        field(root, 'area').value = keepArea;
                        renderList(root);
                    });
                } else {
                    refresh(root);
                }
            }
        }
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

        field(root, 'area').addEventListener('change', function () { setStatus(root, '', ''); renderList(root); });
        field(root, 'date').addEventListener('change', function () { setStatus(root, '', ''); renderList(root); });
        var list = root.querySelector('[data-list]');
        list.addEventListener('input', function (e) {
            var tr = e.target.closest('tr[data-row]');
            if (!tr) return;
            var k = e.target.getAttribute('data-k');
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
