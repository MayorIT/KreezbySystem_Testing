/**
 * Retailer Delivery POS (head admin + admin).
 * Record one shop's delivery: date, area, shop, ordered, pulled out, expired, collected.
 * It is saved into that day's route sheet for the area (POST /api/route-sheets), so it shows
 * on the Sales List right away:
 *   Ordered → Cons · Pulled out → P.O · Expired → expired (shown under P.O) · Collected → Collected
 */
(function () {
    'use strict';

    var AREAS = [
        { value: 'batangas', label: 'Batangas' },
        { value: 'bauan', label: 'Bauan' },
        { value: 'citimart', label: 'Citimart' },
        { value: 'lipa', label: 'Lipa' },
        { value: 'lucena', label: 'Lucena' },
        { value: 'manila', label: 'Manila' },
        { value: 'rosario', label: 'Rosario' },
        { value: 'stotomas', label: 'Sto. Tomas' },
        { value: 'tagaytay', label: 'Tagaytay' }
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

    function loadAccounts() {
        if (accountsPromise) return accountsPromise;
        accountsPromise = request('/api/retailer-records').then(function (data) {
            accounts = (data.accounts || []).map(function (a) {
                return { id: a.id, name: a.name, area: a.area || '', source: areaValueFromLabel(a.area) };
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
            '.dpos-empty{color:#8d6e63;padding:14px 0}' +
            '@media (max-width:900px){.dpos-grid,.dpos-grid.four{grid-template-columns:1fr 1fr}}' +
            '@media (max-width:560px){.dpos-grid,.dpos-grid.four{grid-template-columns:1fr}}';
        document.head.appendChild(s);
    }

    function formHtml() {
        return '<h3>Retailer Delivery</h3>' +
            '<p class="dpos-sub">For retailer shops only. It is saved to that day\'s route sheet and shows on the <strong>Retailer</strong> sales list right away. Walk-in customers are recorded in the Walk-in POS.</p>' +
            '<div class="dpos-grid">' +
                '<label class="dpos-field">Delivery date<input type="date" data-f="date"></label>' +
                '<label class="dpos-field">Area<select data-f="area">' + AREAS.map(function (a) {
                    return '<option value="' + a.value + '">' + esc(a.label) + '</option>';
                }).join('') + '</select></label>' +
                '<label class="dpos-field">Shop<select data-f="shopPick"><option value="">Loading shops…</option></select></label>' +
            '</div>' +
            '<div class="dpos-grid" style="grid-template-columns:1fr">' +
                '<label class="dpos-field">Terms <small>COD: cash is collected on delivery · Consignment: no cash collected yet</small><select data-f="terms"><option value="cod">COD</option><option value="cons">Consignment</option></select></label>' +
            '</div>' +
            '<div class="dpos-grid four">' +
                '<label class="dpos-field">Ordered <small data-terms-hint>pcs · COD</small><input type="number" min="0" step="1" inputmode="numeric" data-f="ordered" placeholder="0"></label>' +
                '<label class="dpos-field">Pulled out <small>pcs · P.O</small><input type="number" min="0" step="1" inputmode="numeric" data-f="pulled" placeholder="0"></label>' +
                '<label class="dpos-field">Expired <small>pcs</small><input type="number" min="0" step="1" inputmode="numeric" data-f="expired" placeholder="0"></label>' +
                '<label class="dpos-field" data-collected-wrap>Collected <small>₱</small><input type="number" min="0" step="0.01" inputmode="decimal" data-f="collected" placeholder="0.00"></label>' +
            '</div>' +
            '<div class="dpos-grid" style="grid-template-columns:1fr">' +
                '<label class="dpos-field">Reason / notes <small>optional — why it was pulled out or expired</small><input type="text" data-f="notes" maxlength="100" placeholder="e.g. damaged pouches, near expiry, slow sales"></label>' +
            '</div>' +
            '<div class="dpos-actions">' +
                '<button type="button" class="dpos-save" data-act="save">Save delivery</button>' +
                '<button type="button" class="dpos-clear" data-act="clear">Clear</button>' +
                '<span class="dpos-status" data-status></span>' +
            '</div>' +
            '<div class="dpos-list"><h4 data-list-title>Deliveries on this date</h4><div data-list></div></div>';
    }

    // COD shops pay cash on delivery (Ordered → COD, Collected counts).
    // Consignment shops pay later (Ordered → Cons, nothing is collected on the day).
    function entryTerms(e) {
        if (num(e.cod) > 0 && !num(e.cons)) return 'cod';
        if (num(e.cons) > 0) return 'cons';
        return num(e.collected) > 0 ? 'cod' : 'cons';
    }

    function orderedOf(e) {
        var t = entryTerms(e);
        var v = t === 'cod' ? e.cod : e.cons;
        return v != null ? v : null;
    }

    function applyTerms(root) {
        var cod = field(root, 'terms').value === 'cod';
        var wrap = root.querySelector('[data-collected-wrap]');
        wrap.hidden = !cod;
        wrap.style.display = cod ? '' : 'none';
        if (!cod) field(root, 'collected').value = '';
        root.querySelector('[data-terms-hint]').textContent = 'pcs · ' + (cod ? 'COD' : 'Consignment');
    }

    function field(root, name) { return root.querySelector('[data-f="' + name + '"]'); }

    function setStatus(root, text, kind) {
        var el = root.querySelector('[data-status]');
        el.textContent = text || '';
        el.className = 'dpos-status' + (kind ? ' ' + kind : '');
    }

    // The shops under an area: retailer accounts in that area, plus every shop already on
    // that area's route sheets. Choosing an area lists them and picks the first one.
    function shopsForArea(area) {
        var byKey = {};
        accounts.forEach(function (a) {
            if (a.source === area) byKey[a.id] = { id: a.id, name: a.name };
        });
        sheets.forEach(function (sheet) {
            if (sheet.source !== area) return;
            (sheet.entries || []).forEach(function (e) {
                if (e.accountId) {
                    var acct = accounts.filter(function (a) { return a.id === e.accountId; })[0];
                    byKey[e.accountId] = { id: e.accountId, name: (acct && acct.name) || e.accountName || e.retailerName };
                } else if (e.retailerName) {
                    var k = 'name:' + cleanName(e.retailerName);
                    var dup = Object.keys(byKey).some(function (id) { return cleanName(byKey[id].name) === cleanName(e.retailerName); });
                    if (!dup) byKey[k] = { id: '', name: e.retailerName };
                }
            });
        });
        return Object.keys(byKey).map(function (k) { return byKey[k]; })
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
            return '<option value="' + i + '" data-id="' + esc(shop.id) + '">' + esc(shop.name) + '</option>';
        }).join('');
        var want = cleanName(keepName || '');
        var idx = 0;
        if (want) list.forEach(function (shop, i) { if (cleanName(shop.name) === want) idx = i; });
        pick.value = String(idx);
    }

    function shopFromInput(root) {
        var pick = field(root, 'shopPick');
        var opt = pick.options[pick.selectedIndex];
        if (!opt || pick.disabled || opt.value === '') return { name: '', accountId: '' };
        return { name: opt.textContent, accountId: opt.getAttribute('data-id') || '' };
    }

    function renderList(root) {
        var date = field(root, 'date').value;
        var area = field(root, 'area').value;
        var sheet = findSheet(date, area);
        root.querySelector('[data-list-title]').textContent = 'Deliveries on ' + (date || '—') + ' · ' + areaLabel(area);
        var host = root.querySelector('[data-list]');
        var entries = sheet ? (sheet.entries || []) : [];
        if (!entries.length) {
            host.innerHTML = '<p class="dpos-empty">No deliveries saved for this date and area yet.</p>';
            return;
        }
        host.innerHTML = '<div style="overflow-x:auto"><table class="dpos-table"><thead><tr><th>Shop</th><th>Terms</th><th class="n">Ordered</th><th class="n">Pulled out</th><th class="n">Expired</th><th class="n">Collected</th><th>Notes</th></tr></thead><tbody>' +
            entries.map(function (e, i) {
                return '<tr data-shop="' + i + '" title="Click to edit"><td>' + esc(e.accountName || e.retailerName) + '</td><td>' + (entryTerms(e) === 'cod' ? 'COD' : 'Consignment') + '</td><td class="n">' + (orderedOf(e) != null ? esc(orderedOf(e)) : '—') +
                    '</td><td class="n">' + (e.po != null ? esc(e.po) : '—') + '</td><td class="n">' + (e.expired != null ? esc(e.expired) : '—') +
                    '</td><td class="n">' + (num(e.collected) ? peso(e.collected) : '—') + '</td><td>' + esc(e.notes || '') + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        host.querySelectorAll('tr[data-shop]').forEach(function (tr) {
            tr.addEventListener('click', function () {
                var e = entries[Number(tr.getAttribute('data-shop'))];
                fillShops(root, e.accountName || e.retailerName || '');
                field(root, 'terms').value = entryTerms(e);
                applyTerms(root);
                field(root, 'ordered').value = orderedOf(e) != null ? orderedOf(e) : '';
                field(root, 'pulled').value = e.po != null ? e.po : '';
                field(root, 'expired').value = e.expired != null ? e.expired : '';
                field(root, 'collected').value = (entryTerms(e) === 'cod' && e.collected != null) ? e.collected : '';
                field(root, 'notes').value = String(e.notes || '').replace(EXPIRED_NOTE, '').replace(/^;\s*/, '').trim();
                setStatus(root, 'Editing ' + (e.accountName || e.retailerName) + ' — change the numbers and save.', '');
            });
        });
    }

    function refresh(root) {
        return loadSheets().then(function () {
            fillShops(root, shopFromInput(root).name);
            renderList(root);
        }).catch(function (err) {
            root.querySelector('[data-list]').innerHTML = '<p class="dpos-empty">' + esc(err.message) + '</p>';
        });
    }

    function clearForm(root) {
        ['ordered', 'pulled', 'expired', 'collected', 'notes'].forEach(function (n) { field(root, n).value = ''; });
    }

    function save(root) {
        var date = field(root, 'date').value;
        var area = field(root, 'area').value;
        var shop = shopFromInput(root);
        var ordered = field(root, 'ordered').value;
        var pulled = field(root, 'pulled').value;
        var expired = field(root, 'expired').value;
        var terms = field(root, 'terms').value === 'cod' ? 'cod' : 'cons';
        var collected = terms === 'cod' ? field(root, 'collected').value : '';
        var reason = field(root, 'notes').value.trim();
        if (!date) return setStatus(root, 'Choose the delivery date.', 'err');
        if (!shop.name) return setStatus(root, 'Pick the shop.', 'err');
        if ([ordered, pulled, expired, collected].every(function (v) { return v === ''; })) {
            return setStatus(root, 'Enter at least one number (ordered, pulled out, expired or collected).', 'err');
        }
        if ([ordered, pulled, expired, collected].some(function (v) { return v !== '' && num(v) < 0; })) {
            return setStatus(root, 'Numbers cannot be negative.', 'err');
        }

        var btn = root.querySelector('[data-act="save"]');
        btn.disabled = true;
        btn.textContent = 'Saving…';
        setStatus(root, '', '');

        loadSheets().then(function () {
            var sheet = findSheet(date, area);
            var original = sheet ? (sheet.entries || []) : [];
            var entries = original.map(rawEntry);
            var idx = -1;
            original.forEach(function (e, i) { if (idx < 0 && sameShop(e, shop)) idx = i; });
            var entry = idx >= 0 ? entries[idx] : { retailerName: shop.name };
            if (shop.accountId) entry.accountId = shop.accountId;

            function put(key, value) {
                if (value === '') delete entry[key];
                else entry[key] = num(value);
            }
            put(terms, ordered);
            put('po', pulled);
            put('expired', expired);
            if (terms === 'cod') {
                put('collected', collected);
            } else if (!num(entry.cod)) {
                // Consignment: nothing is collected, so it must not appear in the POS / sales list.
                delete entry.collected;
            }

            var notes = [];
            if (reason) notes.push(reason);
            else if (entry.notes) {
                var kept = String(entry.notes).replace(EXPIRED_NOTE, '').replace(/^;\s*/, '').trim();
                if (kept) notes.push(kept);
            }
            if (num(expired) > 0) notes.push('Expired: ' + num(expired) + ' pcs');
            if (notes.length) entry.notes = notes.join('; ');
            else delete entry.notes;

            if (idx >= 0) entries[idx] = entry;
            else entries.push(entry);

            var report = {
                id: sheet ? sheet.id : ('pos-' + area + '-' + date.replace(/-/g, '') + '-' + Date.now()),
                reportDate: date,
                source: area,
                areaLabel: (sheet && sheet.areaLabel) || areaLabel(area),
                entries: entries,
                totalExpense: sheet ? (Number(sheet.totalExpense) || 0) : 0
            };
            return request('/api/route-sheets', report).then(function () {
                // The Sales List keeps a copy in this browser tab; drop it so it reloads.
                window.__kreezbySalesListRequest = null;
                if (window.KreezbySales && typeof window.KreezbySales.reloadFromServer === 'function') {
                    window.KreezbySales.reloadFromServer().catch(function () {});
                }
                setStatus(root, 'Saved ' + shop.name + ' to the ' + areaLabel(area) + ' route sheet for ' + date + '.', 'ok');
                clearForm(root);
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
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        return path.indexOf('/admin/') >= 0 || path.indexOf('/head_admin/') >= 0;
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
                        fillShops(root);
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

        field(root, 'area').addEventListener('change', function () { fillShops(root); renderList(root); });
        field(root, 'terms').addEventListener('change', function () { applyTerms(root); });
        applyTerms(root);
        field(root, 'date').addEventListener('change', function () { renderList(root); });
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
