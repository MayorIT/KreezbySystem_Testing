/**
 * Delivery Schedule on the AI Forecast page.
 * Head admin, admin, and staff set a stop and review upcoming deliveries by area.
 * Now loads store data dynamically from retailer manifest.
 */
(function () {
    'use strict';

    if (window.KreezbyDeliverySchedule && window.KreezbyDeliverySchedule.version === '20261117shops') {
        window.KreezbyDeliverySchedule.boot();
        return;
    }

    var STORE_KEY = 'kreezby_delivery_schedule_v5';
    var REMOVED_KEY = 'kreezby_delivery_schedule_removed_v5';
    var PRODUCT = 'Chocolate Crinkles';
    var PAYMENTS = ['GCash', 'Check', 'Cash', 'Cons'];
    var AREAS = []; // Will be populated from manifest

    var SEED = [];

    function copyRow(row) {
        var copy = {};
        Object.keys(row || {}).forEach(function (key) { copy[key] = row[key]; });
        return copy;
    }

    function seedRows() {
        return SEED.map(copyRow);
    }

    function areaCatalog() {
        if (AREAS && AREAS.length) return AREAS;
        var names = {};
        SEED.forEach(function (row) {
            if (row.area) names[row.area] = true;
        });
        return Object.keys(names).map(function (name) {
            var stores = [];
            SEED.forEach(function (row) {
                if (row.area === name && stores.indexOf(row.stop) < 0) stores.push(row.stop);
            });
            return { name: name, stores: stores };
        });
    }

    function areaByName(name) {
        var areas = areaCatalog();
        for (var i = 0; i < areas.length; i++) {
            if (areas[i].name === name) return areas[i];
        }
        return areas[0] || { name: name || '', stores: [] };
    }

    function removedIds() {
        try {
            var raw = localStorage.getItem(REMOVED_KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function rememberRemoved(ids) {
        var current = removedIds();
        (ids || []).forEach(function (id) {
            if (id && current.indexOf(id) < 0) current.push(id);
        });
        try { localStorage.setItem(REMOVED_KEY, JSON.stringify(current)); } catch (e) { /* ignore */ }
    }

    function readRows() {
        var seed = seedRows();
        var dropped = {};
        removedIds().forEach(function (id) { dropped[id] = true; });
        try {
            var raw = localStorage.getItem(STORE_KEY);
            var parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed)) {
                var kept = [];
                var ids = {};
                parsed.forEach(function (row) {
                    if (!row || !row.id || dropped[row.id] || ids[row.id]) return;
                    ids[row.id] = true;
                    kept.push(row);
                });
                seed.forEach(function (row) {
                    if (!ids[row.id] && !dropped[row.id]) kept.push(copyRow(row));
                });
                return kept;
            }
        } catch (e) { /* use seed */ }
        return seed.filter(function (row) { return !dropped[row.id]; });
    }

    function writeRows(rows) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(rows)); } catch (e) { /* ignore */ }
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function todayStamp() {
        var now = new Date();
        var month = String(now.getMonth() + 1).padStart(2, '0');
        var day = String(now.getDate()).padStart(2, '0');
        return now.getFullYear() + '-' + month + '-' + day;
    }

    function ensureStyles() {
        if (document.getElementById('delivery-schedule-style')) return;
        var style = document.createElement('style');
        style.id = 'delivery-schedule-style';
        style.textContent = ''
            + '.panel-data-card:has(#delivery-schedule){overflow:visible;}'
            + '.delivery-schedule{display:grid;gap:16px;}'
            + '.delivery-schedule__form{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:end;padding:14px;border:1px solid #eadfce;border-radius:12px;background:#fffaf3;}'
            + '.delivery-schedule__form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#5d4037;}'
            + '.delivery-schedule__form input,.delivery-schedule__form select{height:36px;border:1px solid #e6e7eb;border-radius:8px;padding:0 10px;font:inherit;background:#fff;color:#1f1f1f;}'
            + '.delivery-schedule__save{grid-column:1 / -1;justify-self:start;height:36px;border:0;border-radius:999px;padding:0 18px;background:#5d4037;color:#fff;font-weight:700;cursor:pointer;white-space:nowrap;}'
            + '.delivery-schedule__bar{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;}'
            + '.delivery-schedule__bar h4{margin:0;font-size:15px;color:#1f1f1f;}'
            + '.delivery-schedule__bar label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#5d4037;}'
            + '.delivery-schedule__bar input,.delivery-schedule__bar select{height:34px;border:1px solid #e6e7eb;border-radius:8px;padding:0 10px;font:inherit;background:#fff;}'
            + '.delivery-schedule__search{width:180px;max-width:100%;}'
            + '.delivery-schedule__hint{font-size:12px;font-weight:600;color:#7a6558;}'
            + '.delivery-schedule__date{border:0;padding:0;background:transparent;color:#5d4037;font:inherit;font-weight:700;text-decoration:underline;text-underline-offset:2px;cursor:pointer;}'
            + '.delivery-schedule__date:hover,.delivery-schedule__date.is-pending{color:#b42318;}'
            + '.delivery-schedule__confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:1px solid #f3d0cb;border-radius:10px;background:#fff6f5;color:#7a271a;font-size:13px;font-weight:700;}'
            + '.delivery-schedule__confirm[hidden]{display:none;}'
            + '.delivery-schedule__delete{height:34px;border:0;border-radius:999px;padding:0 14px;background:#b42318;color:#fff;font-weight:700;cursor:pointer;}'
            + '.delivery-schedule__delete:hover{background:#8f1d14;}'
            + '.delivery-schedule__confirm-cancel{height:34px;border:1px solid #e6e7eb;border-radius:999px;padding:0 14px;background:#fff;color:#5d4037;font-weight:700;cursor:pointer;}'
            + '.delivery-area{border:1px solid #eadfce;border-radius:12px;overflow-x:auto;background:#fff;}'
            + '.delivery-area__head{display:flex;justify-content:space-between;gap:8px;padding:10px 14px;background:#f8f4ee;font-weight:700;color:#5d4037;}'
            + '.delivery-stop-table{width:100%;border-collapse:collapse;font-size:13px;}'
            + '.delivery-stop-table th{text-align:left;padding:8px 12px;background:#e4c9a3;color:#4e342e;font-weight:700;white-space:nowrap;}'
            + '.delivery-stop-table td{padding:8px 12px;border-top:1px solid #f0e6d8;vertical-align:top;}'
            + '.delivery-schedule__shops{grid-column:1 / -1;display:flex;flex-direction:column;gap:10px;padding:12px 14px;border:1px solid #eadfce;border-radius:10px;background:#fff;}'
            + '.delivery-schedule__shops-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;}'
            + '.delivery-schedule__shops-head strong{font-size:13px;color:#5d4037;}'
            + '.delivery-schedule__shops-count{font-size:12px;font-weight:700;color:#8d6e63;margin-left:8px;}'
            + '.delivery-schedule__shops-tools{display:flex;gap:6px;}'
            + '.delivery-schedule__mini{height:30px;border:1px solid #e0d6ce;border-radius:999px;padding:0 12px;background:#fff;color:#5d4037;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;}'
            + '.delivery-schedule__mini:hover{background:#fff8e1;border-color:#ffca28;}'
            + '.delivery-schedule__shop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;max-height:260px;overflow:auto;padding:2px;}'
            + '.delivery-schedule__form .delivery-schedule__shop{flex-direction:row;align-items:center;gap:10px;padding:9px 12px;border:1px solid #eadfce;border-radius:10px;background:#fffdf9;font-size:13px;font-weight:600;color:#3d2c2a;cursor:pointer;line-height:1.3;}'
            + '.delivery-schedule__form .delivery-schedule__shop input{width:16px;height:16px;padding:0;margin:0;flex:0 0 16px;accent-color:#5d4037;}'
            + '.delivery-schedule__form .delivery-schedule__shop:has(input:checked){border-color:#ffca28;background:#fff8e1;}'
            + '.delivery-schedule__empty{margin:0;font-size:13px;color:#8d6e63;}'
            + '.delivery-schedule__note{grid-column:1 / -1;margin:0;font-size:13px;font-weight:600;color:#2e7d32;}'
            + '.delivery-schedule__note.is-error{color:#b42318;}'
            + '.delivery-schedule__chips{display:flex;flex-wrap:wrap;gap:6px;}'
            + '.delivery-stop-table--shops{table-layout:fixed;min-width:640px;}'
            + '.delivery-stop-table--shops td{vertical-align:middle;}'
            + '#delivery-schedule .delivery-stop-table--shops th:nth-child(1),#delivery-schedule .delivery-stop-table--shops td:nth-child(1){width:130px!important;white-space:nowrap;}'
            + '#delivery-schedule .delivery-stop-table--shops th:nth-child(2),#delivery-schedule .delivery-stop-table--shops td:nth-child(2){width:150px!important;white-space:nowrap;}'
            + '#delivery-schedule .delivery-stop-table--shops th:nth-child(3),#delivery-schedule .delivery-stop-table--shops td:nth-child(3){width:auto!important;}'
            + '#delivery-schedule .delivery-stop-table--shops th:nth-child(4),#delivery-schedule .delivery-stop-table--shops td:nth-child(4){width:130px!important;text-align:right;}'
            + '.delivery-schedule__chip{display:inline-block;white-space:nowrap;padding:3px 10px;border-radius:999px;background:#f8f1e7;border:1px solid #eadfce;font-size:12px;font-weight:600;color:#5d4037;line-height:1.5;}'
            + '.delivery-schedule__chip.is-all{background:#fff;color:#8d6e63;font-style:italic;}'
            + '.delivery-schedule__edit{height:30px;border:1px solid #e0d6ce;border-radius:999px;padding:0 12px;background:#fff;color:#5d4037;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;}'
            + '.delivery-stop-table td.delivery-schedule__actions{white-space:nowrap;width:1%;}'
            + '@media (max-width:720px){.delivery-stop-table{display:block;overflow-x:auto;}.delivery-schedule__shop-grid{grid-template-columns:1fr;}}';
        document.head.appendChild(style);
    }

    // Delivery areas from the 2026 retailer list. A schedule is set for a whole area.
    var AREA_LIST = ['Lucena', 'Batangas', 'Sto. Tomas', 'Lipa', 'Tagaytay', 'Citimart'];

    // Plus areas added in Settings and areas retailer shops were moved to.
    function areaList() {
        var out = AREA_LIST.slice();
        var seen = {};
        function key(v) { return String(v || '').toLowerCase().replace(/\bsanto\b/g, 'sto').replace(/[^a-z0-9]+/g, ''); }
        out.forEach(function (n) { seen[key(n)] = true; });
        function take(name) {
            var label = String(name || '').trim();
            // Batangas City is part of customers' addresses, not a delivery area.
            if (!label || seen[key(label)] || key(label) === 'batangascity') return;
            seen[key(label)] = true;
            out.push(label);
        }
        try { (JSON.parse(localStorage.getItem('kreezby_areas_v1') || '[]') || []).forEach(function (r) { take(r && r.name); }); } catch (e) { /* none */ }
        try { ((JSON.parse(localStorage.getItem('kreezby_maintenance_users') || '{}') || {}).retailers || []).forEach(function (u) { take(u && u.area); }); } catch (e) { /* none */ }
        return out;
    }

    // One row per area and date (older per-store rows of the same area and date show once).
    function scheduleRows(rows) {
        var seen = {};
        return rows.filter(function (row) {
            if (!row || !row.id || !row.area || !row.date) return false;
            var key = row.area + '|' + row.date;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        }).sort(function (a, b) {
            return String(a.date || '').localeCompare(String(b.date || ''))
                || String(a.area || '').localeCompare(String(b.area || ''))
                || String(a.id).localeCompare(String(b.id));
        });
    }

    // ---- Retailer shops per area (same list as Retailer Delivery: Settings › Retailers) ----
    var shopAccounts = [];
    var shopsPromise = null;
    function normArea(v) { return String(v || '').toLowerCase().replace(/&/g, ' and ').replace(/\bsanto\b/g, 'sto').replace(/[^a-z0-9]+/g, ' ').trim(); }
    // Matches an account's area text ("Santo Tomas, Batangas", "LIPA CITY") to a schedule area.
    function areaOfAccount(text) {
        var key = ' ' + normArea(text) + ' ';
        if (!key.trim()) return '';
        var areas = areaList();
        var exact = areas.filter(function (a) { return normArea(a) === key.trim(); })[0];
        if (exact) return exact;
        var found = areas.filter(function (a) { return normArea(a) !== 'batangas'; })
            .concat(areas.filter(function (a) { return normArea(a) === 'batangas'; }))
            .filter(function (a) { return key.indexOf(' ' + normArea(a) + ' ') >= 0; })[0];
        return found || String(text || '').trim();
    }
    function mapShops(list) {
        return (list || []).filter(function (a) { return a && a.name; }).map(function (a) {
            return { id: String(a.id || a._id || a.accountId || a.name), name: String(a.name), area: areaOfAccount(a.area) };
        });
    }
    function cachedShops() {
        if (shopAccounts.length) return shopAccounts;
        try {
            var saved = JSON.parse(localStorage.getItem('kz-dpos-shops') || '[]');
            if (Array.isArray(saved) && saved.length) shopAccounts = mapShops(saved);
        } catch (e) { /* none yet */ }
        if (!shopAccounts.length) {
            try {
                var users = (JSON.parse(localStorage.getItem('kreezby_maintenance_users') || '{}') || {}).retailers || [];
                shopAccounts = mapShops(users.map(function (u) { return { id: u.id || u.email, name: u.storeName || u.shopName || u.name, area: u.area }; }));
            } catch (e) { /* none */ }
        }
        return shopAccounts;
    }
    function loadShops() {
        if (shopsPromise) return shopsPromise;
        var tok = '';
        try { tok = (JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}).token || ''; } catch (e) { tok = ''; }
        if (!tok) return Promise.resolve(cachedShops());
        shopsPromise = fetch('/api/retailer-records?lite=1', { credentials: 'same-origin', cache: 'no-store', headers: { 'X-Kreezby-Token': tok } })
            .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('shops')); })
            .then(function (data) {
                var list = (data && data.accounts) || [];
                if (list.length) {
                    shopAccounts = mapShops(list);
                    try { localStorage.setItem('kz-dpos-shops', JSON.stringify(list)); } catch (e) { /* optional */ }
                }
                return cachedShops();
            })
            .catch(function () { shopsPromise = null; return cachedShops(); });
        return shopsPromise;
    }
    function shopsInArea(area) {
        var key = normArea(area);
        var seen = {};
        return cachedShops().filter(function (s) {
            if (normArea(s.area) !== key || seen[s.id]) return false;
            seen[s.id] = true;
            return true;
        }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    function storeOptions(areaName, selected) {
        return areaByName(areaName).stores.map(function (store) {
            var picked = store === selected ? ' selected' : '';
            return '<option value="' + esc(store) + '"' + picked + '>' + esc(store) + '</option>';
        }).join('');
    }

    function paymentOptions() {
        return PAYMENTS.map(function (name) {
            return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
        }).join('');
    }

    function render(host) {
        if (!host) return;
        if (host.getAttribute('data-schedule-version') === '20261117shops' && host.querySelector('form.delivery-schedule__form')) return;
        host.setAttribute('data-schedule-version', '20261117shops');
        ensureStyles();
        var poShell = !!(host.closest && host.closest('#delivery-schedule-master'));
        var rows = readRows();
        var areaOptions = areaList().map(function (name) {
            return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
        }).join('');
        host.innerHTML = ''
            + '<div class="delivery-schedule">'
            + '<form class="delivery-schedule__form">'
            + '<label>Area<select name="area" required>' + areaOptions + '</select></label>'
            + '<label>Date<input name="date" type="date" required value="' + esc(todayStamp()) + '"></label>'
            + '<div class="delivery-schedule__shops">'
            + '<div class="delivery-schedule__shops-head"><div><strong>Shops scheduled for this day</strong><span class="delivery-schedule__shops-count"></span></div>'
            + '<div class="delivery-schedule__shops-tools"><button type="button" class="delivery-schedule__mini" data-shops="all">Select all</button><button type="button" class="delivery-schedule__mini" data-shops="none">Clear</button></div></div>'
            + '<div class="delivery-schedule__shop-grid"></div>'
            + '</div>'
            + '<button class="delivery-schedule__save' + (poShell ? ' btn-call-to-action' : '') + '" type="submit">Set schedule</button>'
            + '<p class="delivery-schedule__note" hidden></p>'
            + '</form>'
            + '<div class="delivery-schedule__bar">'
            + '<h4>Area schedules</h4>'
            + '<span class="delivery-schedule__hint">Click an area to delete that schedule, or Edit to change its shops.</span>'
            + '<label>Area <select class="delivery-schedule__filter"><option value="">Every area</option>' + areaOptions + '</select></label>'
            + '<label>Search <input class="delivery-schedule__search" type="search" placeholder="Area, shop or date"></label>'
            + '</div>'
            + '<div class="delivery-schedule__confirm" hidden>'
            + '<span class="delivery-schedule__confirm-text"></span>'
            + '<button class="delivery-schedule__delete" type="button">Delete</button>'
            + '<button class="delivery-schedule__confirm-cancel" type="button">Cancel</button>'
            + '</div>'
            + '<div class="delivery-schedule__list"></div>'
            + '</div>';

        var list = host.querySelector('.delivery-schedule__list');
        var filter = host.querySelector('.delivery-schedule__filter');
        var search = host.querySelector('.delivery-schedule__search');
        var confirmBox = host.querySelector('.delivery-schedule__confirm');
        var confirmText = host.querySelector('.delivery-schedule__confirm-text');
        var note = host.querySelector('.delivery-schedule__note');
        var pendingId = '';
        var form = host.querySelector('form.delivery-schedule__form');
        var areaSelect = form.querySelector('select[name="area"]');
        var dateInput = form.querySelector('input[name="date"]');
        var shopGrid = host.querySelector('.delivery-schedule__shop-grid');
        var shopCount = host.querySelector('.delivery-schedule__shops-count');

        function savedFor(area, date) {
            for (var i = 0; i < rows.length; i++) {
                if (rows[i] && rows[i].area === area && rows[i].date === date) return rows[i];
            }
            return null;
        }
        function countShops() {
            var boxes = shopGrid.querySelectorAll('input[type="checkbox"]');
            var on = shopGrid.querySelectorAll('input[type="checkbox"]:checked').length;
            shopCount.textContent = boxes.length ? ('· ' + on + ' of ' + boxes.length + ' selected') : '';
        }
        // Shows the shops of the chosen area as checkboxes. A saved schedule for the same area and
        // date ticks its shops; otherwise every shop starts unticked.
        function paintShops(checkedIds) {
            var area = areaSelect.value;
            var list = shopsInArea(area);
            if (!checkedIds) {
                var saved = savedFor(area, dateInput.value);
                checkedIds = saved && Array.isArray(saved.shops) ? saved.shops.map(function (x) { return x.id; }) : [];
            }
            if (!list.length) {
                shopGrid.innerHTML = '<p class="delivery-schedule__empty">No shops under ' + esc(area) + ' yet. Add or move shops in Settings › Retailers.</p>';
                countShops();
                return;
            }
            shopGrid.innerHTML = list.map(function (shop) {
                var on = checkedIds.indexOf(shop.id) >= 0 ? ' checked' : '';
                return '<label class="delivery-schedule__shop"><input type="checkbox" value="' + esc(shop.id) + '" data-name="' + esc(shop.name) + '"' + on + '><span>' + esc(shop.name) + '</span></label>';
            }).join('');
            countShops();
        }
        function pickedShops() {
            return Array.prototype.map.call(shopGrid.querySelectorAll('input[type="checkbox"]:checked'), function (box) {
                return { id: box.value, name: box.getAttribute('data-name') || '' };
            });
        }
        function shopChips(row) {
            if (!Array.isArray(row.shops) || !row.shops.length) return '<span class="delivery-schedule__chip is-all">All shops in the area</span>';
            return '<div class="delivery-schedule__chips">' + row.shops.map(function (x) {
                return '<span class="delivery-schedule__chip">' + esc(x.name) + '</span>';
            }).join('') + '</div>';
        }
        areaSelect.addEventListener('change', function () { paintShops(); });
        dateInput.addEventListener('change', function () { paintShops(); });
        shopGrid.addEventListener('change', countShops);
        host.querySelector('.delivery-schedule__shops-tools').addEventListener('click', function (event) {
            var b = event.target.closest ? event.target.closest('[data-shops]') : null;
            if (!b) return;
            var on = b.getAttribute('data-shops') === 'all';
            shopGrid.querySelectorAll('input[type="checkbox"]').forEach(function (box) { box.checked = on; });
            countShops();
        });
        paintShops();
        loadShops().then(function () { if (document.body.contains(host)) paintShops(pickedShops().map(function (x) { return x.id; }).length ? pickedShops().map(function (x) { return x.id; }) : null); });

        function codeButton(row) {
            return '<button type="button" class="delivery-schedule__date" data-id="' + esc(row.id) + '">' + esc(row.area) + '</button>';
        }

        function rowById(id) {
            for (var i = 0; i < rows.length; i++) {
                if (rows[i] && rows[i].id === id) return rows[i];
            }
            return null;
        }

        function paintPo(visible) {
            if (!visible.length) {
                list.innerHTML = '<div class="po-table-scroll-wrap"><table class="data-display-table delivery-stop-table"><tbody><tr class="po-empty-row"><td colspan="4">No area schedules for this filter.</td></tr></tbody></table></div>';
                return;
            }
            var body = visible.map(function (row, index) {
                return '<tr>'
                    + '<td style="white-space:nowrap">' + esc(row.date || '') + '</td>'
                    + '<td style="white-space:nowrap">' + codeButton(row) + '</td>'
                    + '<td>' + shopChips(row) + '</td>'
                    + '<td class="delivery-schedule__actions"><button type="button" class="delivery-schedule__edit" data-edit="' + esc(row.id) + '">Edit shops</button></td>'
                    + '</tr>';
            }).join('');
            list.innerHTML = '<div class="po-table-scroll-wrap"><table class="data-display-table delivery-stop-table delivery-stop-table--shops"><colgroup><col style="width:130px"><col style="width:150px"><col><col style="width:130px"></colgroup><thead><tr>'
                + '<th>Date</th><th>Area</th><th>Shops</th><th></th>'
                + '</tr></thead><tbody>' + body + '</tbody></table></div>';
        }

        function markPending() {
            if (!pendingId || !rowById(pendingId)) {
                pendingId = '';
                confirmBox.hidden = true;
                return;
            }
            list.querySelectorAll('.delivery-schedule__date').forEach(function (button) {
                if (button.getAttribute('data-id') === pendingId) button.classList.add('is-pending');
            });
        }

        function paint() {
            var chosen = filter.value;
            var query = search.value.trim().toLowerCase();
            var visible = scheduleRows(rows).filter(function (row) {
                if (chosen && row.area !== chosen) return false;
                if (!query) return true;
                return (row.area + ' ' + row.date + ' ' + (Array.isArray(row.shops) ? row.shops.map(function (x) { return x.name; }).join(' ') : '')).toLowerCase().indexOf(query) >= 0;
            });
            var count = document.getElementById('delivery-schedule-count');
            if (count) count.textContent = visible.length ? String(visible.length) : '';
            var summary = document.getElementById('delivery-schedule-summary');
            if (summary) summary.textContent = visible.length ? ('Showing ' + visible.length + (visible.length === 1 ? ' area schedule' : ' area schedules')) : 'No area schedules';
            if (poShell) {
                paintPo(visible);
                markPending();
                return;
            }
            var groups = {};
            var order = [];
            visible.forEach(function (row) {
                if (!groups[row.area]) {
                    groups[row.area] = [];
                    order.push(row.area);
                }
                groups[row.area].push(row);
            });
            if (!order.length) {
                list.innerHTML = '<p>No schedules for this area.</p>';
                markPending();
                return;
            }
            list.innerHTML = order.map(function (area) {
                var stops = groups[area].map(function (row) {
                    return '<tr>'
                        + '<td>' + esc(row.date || '') + '</td>'
                        + '<td>' + codeButton(row) + '</td>'
                        + '<td>' + shopChips(row) + '</td>'
                        + '<td class="delivery-schedule__actions"><button type="button" class="delivery-schedule__edit" data-edit="' + esc(row.id) + '">Edit shops</button></td>'
                        + '</tr>';
                }).join('');
                return '<section class="delivery-area">'
                    + '<div class="delivery-area__head"><span>' + esc(area) + '</span><span>' + groups[area].length + ' schedules</span></div>'
                    + '<table class="delivery-stop-table delivery-stop-table--shops"><colgroup><col style="width:130px"><col style="width:150px"><col><col style="width:130px"></colgroup><thead><tr>'
                    + '<th>Date</th><th>Area</th><th>Shops</th><th></th>'
                    + '</tr></thead><tbody>' + stops + '</tbody></table></section>';
            }).join('');
            markPending();
        }

        host.querySelector('form').addEventListener('submit', function (event) {
            event.preventDefault();
            var data = new FormData(event.currentTarget);
            var area = String(data.get('area') || '');
            var date = String(data.get('date') || '');
            var shops = pickedShops();
            if (!shops.length) {
                if (note) {
                    note.hidden = false;
                    note.classList.add('is-error');
                    note.textContent = shopGrid.querySelector('input') ? 'Select at least one shop for this day.' : 'There are no shops under ' + area + ' yet.';
                }
                return;
            }
            var existing = savedFor(area, date);
            if (existing) existing.shops = shops;
            else rows.push({ id: 'sched-' + Date.now(), area: area, date: date, shops: shops });
            writeRows(rows);
            if (filter.value && filter.value !== area) filter.value = '';
            if (search.value) search.value = '';
            paint();
            if (note) {
                note.hidden = false;
                note.classList.remove('is-error');
                note.textContent = (existing ? 'Updated: ' : '') + area + ' on ' + date + ' — ' + shops.length + (shops.length === 1 ? ' shop' : ' shops') + ' scheduled.';
            }
        });
        filter.addEventListener('change', paint);
        search.addEventListener('input', paint);
        list.addEventListener('click', function (event) {
            var edit = event.target.closest ? event.target.closest('[data-edit]') : null;
            if (edit) {
                var er = rowById(edit.getAttribute('data-edit'));
                if (!er) return;
                if (!Array.prototype.some.call(areaSelect.options, function (o) { return o.value === er.area; })) {
                    areaSelect.insertAdjacentHTML('beforeend', '<option value="' + esc(er.area) + '">' + esc(er.area) + '</option>');
                }
                areaSelect.value = er.area;
                dateInput.value = er.date;
                paintShops(Array.isArray(er.shops) ? er.shops.map(function (x) { return x.id; }) : shopsInArea(er.area).map(function (x) { return x.id; }));
                if (note) { note.hidden = false; note.classList.remove('is-error'); note.textContent = 'Editing ' + er.area + ' on ' + er.date + '. Change the shops, then press Set schedule.'; }
                if (form.scrollIntoView) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
            var button = event.target.closest ? event.target.closest('.delivery-schedule__date') : null;
            if (!button) return;
            var id = button.getAttribute('data-id') || '';
            var row = rowById(id);
            if (!row) return;
            pendingId = id;
            confirmText.textContent = 'Delete the ' + row.area + ' schedule on ' + row.date + '?';
            confirmBox.hidden = false;
            list.querySelectorAll('.delivery-schedule__date').forEach(function (item) {
                item.classList.toggle('is-pending', item.getAttribute('data-id') === id);
            });
        });
        host.querySelector('.delivery-schedule__confirm-cancel').addEventListener('click', function () {
            pendingId = '';
            confirmBox.hidden = true;
            list.querySelectorAll('.delivery-schedule__date.is-pending').forEach(function (button) {
                button.classList.remove('is-pending');
            });
        });
        host.querySelector('.delivery-schedule__delete').addEventListener('click', function () {
            var row = rowById(pendingId);
            if (!row) {
                pendingId = '';
                confirmBox.hidden = true;
                return;
            }
            var area = row.area;
            var date = row.date;
            var same = function (item) { return item && item.area === area && item.date === date; };
            rememberRemoved(rows.filter(same).map(function (item) { return item.id; }));
            rows = rows.filter(function (item) { return item && !same(item); });
            writeRows(rows);
            pendingId = '';
            confirmBox.hidden = true;
            paint();
            if (note) {
                note.hidden = false;
                note.textContent = 'Removed the ' + area + ' schedule on ' + date + '.';
            }
        });
        paint();
        host.__dsRefresh = function () {
            rows = readRows();
            paint();
            if (!shopGrid.querySelector('input:checked')) paintShops();
        };
    }

    // Another account added or removed a schedule: show it without refreshing.
    document.addEventListener('kreezby:remote-state', function (event) {
        var keys = (event && event.detail && event.detail.keys) || [];
        if (keys.indexOf(STORE_KEY) < 0 && keys.indexOf(REMOVED_KEY) < 0 && keys.indexOf('kreezby_maintenance_users') < 0) return;
        if (keys.indexOf('kreezby_maintenance_users') >= 0) shopsPromise = null;
        document.querySelectorAll('#delivery-schedule').forEach(function (host) {
            if (typeof host.__dsRefresh !== 'function') return;
            if (keys.indexOf('kreezby_maintenance_users') >= 0) loadShops().then(host.__dsRefresh);
            else host.__dsRefresh();
        });
    });

    function initializeFromManifest() {
        // Wait for manifest loader and load areas dynamically
        if (window.KreezbyRetailerManifest && typeof window.KreezbyRetailerManifest.getAreaConfiguration === 'function') {
            return window.KreezbyRetailerManifest.getAreaConfiguration().then(function(areasConfig) {
                AREAS = areasConfig;
                return AREAS;
            }).catch(function(error) {
                console.warn('Failed to load areas from manifest, using fallback:', error);
                // Fallback: create basic area structure from a simple list
                return window.KreezbyRetailerManifest.getStoresByArea().then(function(byArea) {
                    Object.keys(byArea).sort().forEach(function(areaSlug) {
                        AREAS.push({
                            name: window.KreezbyRetailerManifest.getAreaLabel(areaSlug),
                            slug: areaSlug,
                            stores: byArea[areaSlug].map(function(s) { return s.storeName; })
                        });
                    });
                    return AREAS;
                });
            });
        }
        return Promise.resolve(AREAS);
    }

    function boot() {
        function draw() {
            document.querySelectorAll('#delivery-schedule').forEach(function (host) {
                try { render(host); } catch (e) { /* keep the last good list */ }
            });
        }
        if (AREAS && AREAS.length > 0) {
            draw();
            return;
        }
        initializeFromManifest().then(draw, draw);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('content:replaced', boot);
    document.addEventListener('kreezby:page-load', boot);
    window.KreezbyDeliverySchedule = { boot: boot, version: '20261117shops' };
})();
