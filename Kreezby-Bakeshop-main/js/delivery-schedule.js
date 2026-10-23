/**
 * Delivery Schedule on the AI Forecast page.
 * Head admin, admin, and staff set a stop and review upcoming deliveries by area.
 * Now loads store data dynamically from retailer manifest.
 */
(function () {
    'use strict';

    if (window.KreezbyDeliverySchedule && window.KreezbyDeliverySchedule.version === '20261020sched') {
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
            + '@media (max-width:720px){.delivery-stop-table{display:block;overflow-x:auto;}}';
        document.head.appendChild(style);
    }

    function scheduleRows(rows) {
        return rows.filter(function (row) {
            return row && row.id && row.stop;
        }).sort(function (a, b) {
            return String(a.date || '').localeCompare(String(b.date || ''))
                || String(a.area || '').localeCompare(String(b.area || ''))
                || String(a.id).localeCompare(String(b.id));
        });
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
        if (host.getAttribute('data-schedule-version') === '20261020sched' && host.querySelector('form.delivery-schedule__form')) return;
        host.setAttribute('data-schedule-version', '20261020sched');
        ensureStyles();
        var poShell = !!(host.closest && host.closest('#delivery-schedule-master'));
        var rows = readRows();
        var areas = areaCatalog();
        var firstArea = areas[0] ? areas[0].name : '';
        var areaOptions = areas.map(function (area) {
            return '<option value="' + esc(area.name) + '">' + esc(area.name) + '</option>';
        }).join('');
        host.innerHTML = ''
            + '<div class="delivery-schedule">'
            + '<form class="delivery-schedule__form">'
            + '<label>Area<select name="area" required>' + areaOptions + '</select></label>'
            + '<label>Store<select name="stop" required>' + storeOptions(firstArea) + '</select></label>'
            + '<label>Date<input name="date" type="date" required value="' + esc(todayStamp()) + '"></label>'
            + '<label>Pouches<input name="qty" type="number" min="1" required value="24"></label>'
            + '<label>Product<input name="product" readonly value="' + esc(PRODUCT) + ' pouches"></label>'
            + '<label>Payment<select name="payment" required>' + paymentOptions() + '</select></label>'
            + '<button class="delivery-schedule__save' + (poShell ? ' btn-call-to-action' : '') + '" type="submit">Set schedule</button>'
            + '<p class="delivery-schedule__note" hidden></p>'
            + '</form>'
            + '<div class="delivery-schedule__bar">'
            + '<h4>Retailer schedules</h4>'
            + '<span class="delivery-schedule__hint">Click a code to delete that retailer.</span>'
            + '<label>Area <select class="delivery-schedule__filter"><option value="">Every area</option>' + areaOptions + '</select></label>'
            + '<label>Search <input class="delivery-schedule__search" type="search" placeholder="Store"></label>'
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
        var areaSelect = host.querySelector('[name="area"]');
        var stopSelect = host.querySelector('[name="stop"]');
        var note = host.querySelector('.delivery-schedule__note');
        var pendingId = '';

        function codeButton(row) {
            return '<button type="button" class="delivery-schedule__date" data-id="' + esc(row.id) + '">' + esc(row.id) + '</button>';
        }

        function rowById(id) {
            for (var i = 0; i < rows.length; i++) {
                if (rows[i] && rows[i].id === id) return rows[i];
            }
            return null;
        }

        areaSelect.addEventListener('change', function () {
            stopSelect.innerHTML = storeOptions(areaSelect.value);
        });

        function paintPo(visible) {
            if (!visible.length) {
                list.innerHTML = '<div class="po-table-scroll-wrap"><table class="data-display-table delivery-stop-table"><tbody><tr class="po-empty-row"><td colspan="7">No retailer schedules for this filter.</td></tr></tbody></table></div>';
                return;
            }
            var body = visible.map(function (row, index) {
                return '<tr>'
                    + '<td class="po-col-num">' + (index + 1) + '</td>'
                    + '<td>' + codeButton(row) + '</td>'
                    + '<td>' + esc(row.date || '') + '</td>'
                    + '<td>' + esc(row.area) + '</td>'
                    + '<td>' + esc(row.stop) + '</td>'
                    + '<td>' + esc(row.detail) + '</td>'
                    + '<td>' + esc(row.payment || '') + '</td>'
                    + '</tr>';
            }).join('');
            list.innerHTML = '<div class="po-table-scroll-wrap"><table class="data-display-table delivery-stop-table"><thead><tr>'
                + '<th class="po-col-num">#</th><th>Code</th><th>Date</th><th>Area</th><th>Retailer</th><th>Order</th><th>Payment</th>'
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
                return (row.id + ' ' + row.stop + ' ' + row.detail + ' ' + row.payment + ' ' + row.area).toLowerCase().indexOf(query) >= 0;
            });
            var count = document.getElementById('delivery-schedule-count');
            if (count) count.textContent = visible.length ? String(visible.length) : '';
            var summary = document.getElementById('delivery-schedule-summary');
            if (summary) summary.textContent = visible.length ? ('Showing ' + visible.length + (visible.length === 1 ? ' retailer schedule' : ' retailer schedules')) : 'No retailer schedules';
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
                list.innerHTML = '<p>No retailer schedules for this area.</p>';
                markPending();
                return;
            }
            list.innerHTML = order.map(function (area) {
                var stops = groups[area].map(function (row) {
                    return '<tr>'
                        + '<td>' + codeButton(row) + '</td>'
                        + '<td>' + esc(row.date || '') + '</td>'
                        + '<td>' + esc(row.stop) + '</td>'
                        + '<td>' + esc(row.detail) + '</td>'
                        + '<td>' + esc(row.payment || '') + '</td>'
                        + '</tr>';
                }).join('');
                return '<section class="delivery-area">'
                    + '<div class="delivery-area__head"><span>' + esc(area) + '</span><span>' + groups[area].length + ' schedules</span></div>'
                    + '<table class="delivery-stop-table"><thead><tr>'
                    + '<th>Code</th><th>Date</th><th>Retailer</th><th>Order</th><th>Payment</th>'
                    + '</tr></thead><tbody>' + stops + '</tbody></table></section>';
            }).join('');
            markPending();
        }

        host.querySelector('form').addEventListener('submit', function (event) {
            event.preventDefault();
            var data = new FormData(event.currentTarget);
            var qty = String(data.get('qty') || '').trim();
            var area = String(data.get('area') || '');
            var stop = String(data.get('stop') || '').trim();
            var created = {
                id: 'sched-' + Date.now(),
                area: area,
                date: String(data.get('date') || ''),
                stop: stop,
                detail: qty + ' pouches ' + PRODUCT,
                payment: String(data.get('payment') || 'Cash')
            };
            var existingIndex = -1;
            rows.forEach(function (row, index) {
                if (existingIndex >= 0 || !row) return;
                if (String(row.stop || '').toLowerCase() === stop.toLowerCase() && row.area === area) existingIndex = index;
            });
            if (existingIndex >= 0) {
                created.id = rows[existingIndex].id;
                rows[existingIndex] = created;
            } else {
                rows.push(created);
            }
            writeRows(rows);
            if (filter.value && filter.value !== area) filter.value = '';
            if (search.value) search.value = '';
            paint();
            if (note) {
                note.hidden = false;
                note.textContent = stop + ' is scheduled on ' + created.date + '.';
            }
        });
        filter.addEventListener('change', paint);
        search.addEventListener('input', paint);
        list.addEventListener('click', function (event) {
            var button = event.target.closest ? event.target.closest('.delivery-schedule__date') : null;
            if (!button) return;
            var id = button.getAttribute('data-id') || '';
            var row = rowById(id);
            if (!row) return;
            pendingId = id;
            confirmText.textContent = 'Delete ' + row.id + ' · ' + row.stop + '? This removes only that retailer.';
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
            var stop = row.stop;
            var date = row.date;
            rememberRemoved([row.id]);
            rows = rows.filter(function (item) { return !item || item.id !== row.id; });
            writeRows(rows);
            pendingId = '';
            confirmBox.hidden = true;
            paint();
            if (note) {
                note.hidden = false;
                note.textContent = 'Removed ' + stop + ' scheduled on ' + date + '.';
            }
        });
        paint();
    }

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
    window.KreezbyDeliverySchedule = { boot: boot, version: '20261020sched' };
})();
