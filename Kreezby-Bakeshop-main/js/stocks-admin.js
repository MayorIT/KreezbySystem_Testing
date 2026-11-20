/**
 * Head-admin stocks list. Search, paging, recording, and the action menu
 * update the open page. Admin and staff pages keep their own markup.
 */
(function () {
    'use strict';

    var LOCAL_KEY = 'kreezby-stock-local-v1';
    var ARCHIVE_KEY = 'kreezby_archived_stock';
    var DICT_KEY = 'kreezby_data_dictionary_v1';
    var listPage = 1;
    var openCode = '';
    var viewMode = 'active';

    var SEED = [
        { code: 'CRK-CHO-P', type: 'finished-product', name: 'Chocolate Crinkles', unit: 'Pouch', qty: 0, cost: 120 },
        { code: 'CRK-ALM-P', type: 'finished-product', name: 'Choco-Almond Crinkles', unit: 'Pouch', qty: 0, cost: 125 },
        { code: 'CRK-LEM-P', type: 'finished-product', name: 'Lemon Crinkles', unit: 'Pouch', qty: 0, cost: 120 },
        { code: 'CRK-BUT-J', type: 'finished-product', name: 'Choco Butternut Crinkles', unit: 'Pouch', qty: 0, cost: 150 },
        { code: 'CRK-MNG-J', type: 'finished-product', name: 'Mango Crinkles', unit: 'Pouch', qty: 0, cost: 150 },
        { code: 'CRK-MEL-P', type: 'finished-product', name: 'Melon Crinkles', unit: 'Pouch', qty: 0, cost: 0 },
        { code: 'CRK-STR-P', type: 'finished-product', name: 'Strawberry Crinkles', unit: 'Pouch', qty: 0, cost: 0 },
        { code: 'CRK-CSH-P', type: 'finished-product', name: 'Choco-Cashew Crinkles', unit: 'Pouch', qty: 0, cost: 0 },
        { code: 'CRK-AST-P', type: 'finished-product', name: 'Assorted Crinkles', unit: 'Pouch', qty: 0, cost: 0 },
        { code: 'CKE-OAT-P', type: 'finished-product', name: 'Oatmeal Cookies', unit: 'Pouch', qty: 0, cost: 0 },
        { code: 'RM-WFL-01', type: 'raw-material', name: 'Wheat Flour', unit: 'Quantity', qty: 0, cost: 48 },
        { code: 'RM-WSG-01', type: 'raw-material', name: 'White Sugar', unit: 'Quantity', qty: 0, cost: 42 },
        { code: 'RM-OIL-01', type: 'raw-material', name: 'Vegetable Oil', unit: 'Quantity', qty: 0, cost: 95 },
        { code: 'RM-EGG-01', type: 'raw-material', name: 'Egg', unit: 'Quantity', qty: 0, cost: 9 },
        { code: 'RM-COC-01', type: 'raw-material', name: 'Cocoa', unit: 'Quantity', qty: 0, cost: 180 },
        { code: 'RM-BKP-01', type: 'raw-material', name: 'Baking Powder', unit: 'Quantity', qty: 0, cost: 35 },
        { code: 'RM-SLT-01', type: 'raw-material', name: 'Salt', unit: 'Quantity', qty: 0, cost: 18 },
        { code: 'RM-CFS-01', type: 'raw-material', name: 'Confectioner Sugar', unit: 'Quantity', qty: 0, cost: 55 },
        { code: 'RM-PSB-01', type: 'raw-material', name: 'Potassium Sorbate', unit: 'Quantity', qty: 0, cost: 220 },
        { code: 'PKG-SUP-01', type: 'packaging-material', name: 'Stand up pouch', unit: 'Quantity', qty: 0, cost: 12 },
        { code: 'PKG-STK-CHO', type: 'packaging-material', name: 'Stickers (Chocolate)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-ALM', type: 'packaging-material', name: 'Stickers (Choco-Almond)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-CSH', type: 'packaging-material', name: 'Stickers (Choco-Cashew)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-STR', type: 'packaging-material', name: 'Stickers (Strawberry)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-RVL', type: 'packaging-material', name: 'Stickers (Red Velvet)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-LEM', type: 'packaging-material', name: 'Stickers (Lemon)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-MEL', type: 'packaging-material', name: 'Stickers (Melon)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-PAN', type: 'packaging-material', name: 'Stickers (Pandan)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-UBE', type: 'packaging-material', name: 'Stickers (Ube)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-MNG', type: 'packaging-material', name: 'Stickers (Mango)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-BUT', type: 'packaging-material', name: 'Stickers (Choco Butternut)', unit: 'Quantity', qty: 0, cost: 3 },
        { code: 'PKG-STK-AST', type: 'packaging-material', name: 'Stickers (Assorted)', unit: 'Quantity', qty: 0, cost: 3 },
    ];

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function localStore() {
        var data = readJson(LOCAL_KEY, {});
        data.qty = data.qty || {};
        data.history = data.history || {};
        data.extra = data.extra || [];
        return data;
    }

    function writeLocal(data) {
        try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    }

    function archivedNames() {
        var list = readJson(ARCHIVE_KEY, []);
        return Array.isArray(list) ? list : [];
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function peso(amount) {
        var n = Number(amount) || 0;
        return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function displayUnit(item, qty) {
        if (item && item.type === 'finished-product') return 'Pouch'; // one unit name, whatever the count
        return 'Quantity';
    }

    function typeLabel(type) {
        if (type === 'raw-material') return 'Raw Material';
        if (type === 'packaging-material') return 'Packaging Material';
        return 'Finished Product';
    }

    function lowLimit(type) {
        if (type === 'raw-material') return 60;
        if (type === 'packaging-material') return 25;
        return 85;
    }

    function catalog() {
        var items = SEED.map(function (row) {
            return {
                code: row.code,
                type: row.type,
                name: row.name,
                unit: row.unit,
                qty: row.qty,
                cost: row.cost
            };
        });
        var seen = {};
        items.forEach(function (row) { seen[row.code] = true; seen[row.name.toLowerCase()] = true; });
        localStore().extra.forEach(function (row) {
            if (!row || !row.code || seen[row.code]) return;
            seen[row.code] = true;
            items.push(row);
        });
        var dict = readJson(DICT_KEY, {});
        (dict.materials_extra || []).forEach(function (row) {
            if (!row || !row.material_id || seen[row.material_id] || seen[String(row.name || '').toLowerCase()]) return;
            seen[row.material_id] = true;
            items.push({
                code: row.material_id,
                type: row.type === 'packaging-material' || /^PKG-/.test(String(row.material_id)) ? 'packaging-material' : 'raw-material',
                name: row.name,
                unit: 'Quantity',
                qty: Number(row.current_stock) || 0,
                cost: 0
            });
        });
        var costs = localStore().cost || {};
        var dictApi = window.KreezbyDictionary;
        items.forEach(function (row) {
            if (costs[row.code] != null && costs[row.code] !== '') row.cost = Number(costs[row.code]) || 0;
            // Finished products show their selling price per pouch (₱165, ₱200 Choco Butternut, or the saved price).
            if (row.type === 'finished-product' && dictApi && typeof dictApi.productPrice === 'function') {
                var price = dictApi.productPrice(row.name);
                if (price != null && Number(price) > 0) row.cost = Number(price);
            }
        });
        return items;
    }

    function liveQty(item) {
        var dict = window.KreezbyDictionary;
        if (dict && item.type === 'finished-product' && typeof dict.productStock === 'function') {
            var productQty = dict.productStock(item.name);
            if (productQty != null && productQty !== '') return Number(productQty) || 0;
        }
        if (dict && (item.type === 'raw-material' || item.type === 'packaging-material') && typeof dict.materialStock === 'function') {
            var materialQty = dict.materialStock(item.name);
            if (materialQty != null && materialQty !== '') return Number(materialQty) || 0;
        }
        var local = localStore().qty;
        if (local[item.code] != null) return Number(local[item.code]) || 0;
        return Number(item.qty) || 0;
    }

    function visibleItems() {
        var archived = archivedNames();
        var typeFilter = document.getElementById('stocks-type-filter');
        var searchBox = document.getElementById('stocks-search-input');
        var type = typeFilter ? typeFilter.value : 'all';
        var query = searchBox ? String(searchBox.value || '').toLowerCase().trim() : '';
        return catalog().filter(function (item) {
            var isArchived = archived.indexOf(item.name) >= 0 || archived.indexOf(item.code) >= 0;
            if (viewMode === 'archive') {
                // Archive: items put away by hand. Expired stock has its own Expired list.
                if (!isArchived) return false;
            } else if (viewMode === 'expired') {
                if (!hasExpiredStock(item)) return false;
            } else if (isArchived || !hasActiveStock(item)) {
                return false;
            }
            if (type !== 'all' && item.type !== type) return false;
            if (!query) return true;
            var hay = (item.name + ' ' + typeLabel(item.type)).toLowerCase();
            return hay.indexOf(query) >= 0;
        });
    }

    function listPageSize() {
        var size = document.getElementById('stocks-page-size');
        var n = size ? parseInt(size.value, 10) : 25;
        return n > 0 ? n : 25;
    }

    function pageSlice(rows) {
        var size = listPageSize();
        var pages = Math.max(1, Math.ceil(rows.length / size));
        if (listPage > pages) listPage = pages;
        if (listPage < 1) listPage = 1;
        var start = (listPage - 1) * size;
        return {
            rows: rows.slice(start, start + size),
            total: rows.length,
            page: listPage,
            pages: pages,
            start: rows.length ? start + 1 : 0,
            end: Math.min(start + size, rows.length)
        };
    }

    function showToast(message) {
        var msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = 'position:fixed;z-index:10060;left:50%;top:18px;transform:translateX(-50%);background:#263238;color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;';
        document.body.appendChild(msg);
        setTimeout(function () { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 2200);
    }

    function findItem(code) {
        var list = catalog();
        for (var i = 0; i < list.length; i++) {
            if (list[i].code === code) return list[i];
        }
        return null;
    }

    function menuContainerFor(menu) {
        if (!menu || !menu.id) return null;
        var btn = document.querySelector('#stocks-master-list-panel-view .action-trigger-btn[data-menu="' + menu.id + '"]');
        return btn ? btn.closest('.action-menu-relative-container') : null;
    }

    function resetMenuPosition(menu) {
        if (!menu) return;
        menu.style.position = '';
        menu.style.top = '';
        menu.style.right = '';
        menu.style.bottom = '';
        menu.style.left = '';
        menu.style.zIndex = '';
    }

    function reattachMenu(menu) {
        var container = menuContainerFor(menu);
        if (container && menu.parentNode !== container) container.appendChild(menu);
    }

    function closeAllMenus() {
        document.querySelectorAll('#stocks-master-list-panel-view .action-popup-menu, body > .action-popup-menu[id^="stock-act-menu-"]').forEach(function (menu) {
            menu.classList.remove('active', 'flip-up');
            resetMenuPosition(menu);
            reattachMenu(menu);
        });
    }

    function positionOpenMenu(menu, btn) {
        var rect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = 'auto';
        menu.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.bottom = 'auto';
        menu.style.zIndex = '10050';
    }

    function toggleActionMenu(menu, btn) {
        if (!menu) return;
        var willOpen = !menu.classList.contains('active');
        closeAllMenus();
        if (!willOpen) return;
        if (menu.parentNode !== document.body) document.body.appendChild(menu);
        menu.classList.add('active');
        positionOpenMenu(menu, btn);
    }

    // Staff see the stock and its history; Edit (price / alert level) and Retrieve are for head admin and admin.
    function isStaffPage() {
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        return path.indexOf('/staff/') >= 0 || path.indexOf('/staff_names/') >= 0;
    }

    function buildMenu(item) {
        var menuId = 'stock-act-menu-' + item.code.replace(/[^a-zA-Z0-9-]/g, '');
        return '<div class="action-menu-relative-container" data-kreezby-page-menu>' +
            '<button type="button" class="action-trigger-btn" data-menu="' + menuId + '">Action ▾</button>' +
            '<div class="action-popup-menu" id="' + menuId + '">' +
            // Stocks are add-only: no Adjust Stock or delete. Edit changes only the selling price and
            // the alert level, never the quantity. Archive puts an item away (nothing is deleted) and
            // Retrieve brings it back; both are for head admin and admin.
            (isStaffPage() ? '' : '<div class="action-popup-item" data-action="edit" data-stock="' + esc(item.code) + '">Edit</div>') +
            '<div class="action-popup-item" data-action="view" data-stock="' + esc(item.code) + '">View History</div>' +
            (isStaffPage() ? '' : (viewMode === 'archive' && manuallyArchived(item)
                ? '<div class="action-popup-item" data-action="retrieve" data-stock="' + esc(item.code) + '">Retrieve</div>'
                : (viewMode !== 'archive' ? '<div class="action-popup-item" data-action="archive" data-stock="' + esc(item.code) + '">Archive</div>' : ''))) +
            '</div></div>';
    }

    function renderFooter(info) {
        var footer = document.getElementById('stocks-list-footer');
        var count = document.getElementById('stocks-list-count');
        if (count) {
            count.textContent = viewMode === 'archive'
                ? info.total + (info.total === 1 ? ' archived item' : ' archived items')
                : viewMode === 'expired'
                    ? info.total + (info.total === 1 ? ' expired item' : ' expired items')
                    : info.total + (info.total === 1 ? ' item' : ' items');
        }
        if (!footer) return;
        footer.innerHTML =
            '<span>Showing ' + info.start + '–' + info.end + ' of ' + info.total + '</span>' +
            '<div class="po-pager">' +
            '<button type="button" class="po-pager-btn" data-stocks-pager="prev"' + (info.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
            '<span class="po-pager-status">Page ' + info.page + ' of ' + info.pages + '</span>' +
            '<button type="button" class="po-pager-btn" data-stocks-pager="next"' + (info.page >= info.pages ? ' disabled' : '') + '>Next</button>' +
            '</div>';
    }

    // Expired stock moves to the Expired list by itself: a batch (or material) whose expiry date
    // has passed is listed under Expired, never on the Active list. Nothing is deleted.
    function todayIso() {
        var d = new Date();
        var m = d.getMonth() + 1, day = d.getDate();
        return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }

    function isExpired(dateStr) {
        var d = String(dateStr || '').slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(d) && d < todayIso();
    }

    // One table line per batch: the newest batch is "New stock", older batches are "Old stock".
    // Raw and packaging materials stay on one line with their expiry date.
    function allStockLines(item, qty) {
        var dict = window.KreezbyDictionary;
        if (item.type === 'finished-product' && dict && typeof dict.productBatches === 'function') {
            var split = dict.productBatches(item.name);
            var lines = [];
            split.batches.slice().reverse().forEach(function (b) {
                if (!(b.remaining > 0)) return;
                lines.push({ tag: b.is_new ? 'New stock' : 'Old stock', batch: b.batch_number, batchId: b.batch_id, produced: b.production_date, expires: b.expiration_date, qty: b.remaining, expired: isExpired(b.expiration_date) });
            });
            if (split.earlier > 0) lines.push({ tag: lines.length ? 'Old stock' : '', batch: '', produced: '', expires: '', qty: split.earlier, expired: false });
            if (lines.length) return lines;
            return [{ tag: '', batch: '', produced: '', expires: '', qty: qty, expired: false }];
        }
        // Raw and packaging materials have no produced or expiry date on the Inventory, so they never expire here.
        if (noDates(item)) return [{ tag: '', batch: '', produced: '', expires: '', qty: qty, expired: false }];
        var expires = '';
        if (dict && typeof dict.materialByName === 'function') {
            var material = dict.materialByName(item.name);
            if (material && material.expiration_date) expires = material.expiration_date;
        }
        return [{ tag: '', batch: '', produced: '', expires: expires, qty: qty, expired: qty > 0 && isExpired(expires) }];
    }

    function manuallyArchived(item, archived) {
        archived = archived || archivedNames();
        return archived.indexOf(item.name) >= 0 || archived.indexOf(item.code) >= 0;
    }

    // Lines shown for an item in the open view (Active, Expired or Archive).
    function stockLines(item, qty) {
        var lines = allStockLines(item, qty);
        if (viewMode === 'archive') return lines;
        if (viewMode === 'expired') return lines.filter(function (line) { return line.expired; });
        return lines.filter(function (line) { return !line.expired; });
    }

    function hasExpiredStock(item) {
        return allStockLines(item, liveQty(item)).some(function (line) { return line.expired; });
    }

    function hasActiveStock(item) {
        var lines = allStockLines(item, liveQty(item));
        return lines.some(function (line) { return !line.expired; });
    }

    // Expired batches stay out of sales; head admin / admin dispose of them here (logged as waste).
    if (!window.__kzDisposeBound) {
        window.__kzDisposeBound = true;
        document.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest ? e.target.closest('[data-dispose-batch]') : null;
            if (!btn) return;
            e.preventDefault();
            var dict = window.KreezbyDictionary;
            if (!dict || typeof dict.disposeExpiredBatch !== 'function') return;
            var name = btn.getAttribute('data-dispose-name');
            var qty = btn.getAttribute('data-dispose-qty');
            var reason = window.prompt('Dispose of ' + qty + ' expired ' + (qty === '1' ? 'pouch' : 'pouches') + ' of ' + name + '?\nThey are taken out of stock and recorded as waste. Add a note (optional):', 'Expired, thrown away');
            if (reason === null) return;
            var done = dict.disposeExpiredBatch(btn.getAttribute('data-dispose-batch'), reason);
            if (done == null) { window.alert(typeof dict.lastStockError === 'function' ? dict.lastStockError() : 'Could not dispose of the batch.'); return; }
            if (typeof render === 'function') render();
        });
    }

    function render() {
        if (window.__kzStocksViewMode) viewMode = window.__kzStocksViewMode;
        var body = document.getElementById('stocks-table-body');
        if (!body || !document.getElementById('stocks-master-list-panel-view')) return;
        syncArchiveChrome();
        if (syncProductionView()) return;
        var info = pageSlice(visibleItems());
        syncRawColumns();
        if (!info.rows.length) {
            body.innerHTML = '<tr class="po-empty-row"><td colspan="9">' +
                (viewMode === 'archive'
                    ? 'No archived items.'
                    : viewMode === 'expired'
                        ? 'No expired stock. A batch moves here by itself once its expiry date has passed.'
                        : 'No stock items match this filter.') +
                '</td></tr>';
        } else {
            body.innerHTML = info.rows.map(function (item, index) {
                var qty = liveQty(item);
                var low = qty <= lowLimit(item.type);
                var raw = noDates(item);
                return stockLines(item, qty).map(function (line, lineIndex) {
                    var first = lineIndex === 0;
                    var tag = line.expired
                        ? ' <span class="status-pill-badge" style="font-size:10px;padding:1px 7px;margin-left:4px;background:#ffebee;color:#c62828;">Expired</span>'
                        : (line.tag ? ' <span class="status-pill-badge ' + (line.tag === 'New stock' ? 'received' : 'pending') + '" style="font-size:10px;padding:1px 7px;margin-left:4px;">' + line.tag + '</span>' : '');
                    var sub = line.batch ? '<div style="font-size:11px;color:#7a6558;margin-top:2px;">Batch ' + esc(line.batch) + '</div>' : '';
                    if (line.expired && line.batchId && viewMode === 'expired' && !isStaffPage()) {
                        sub += '<button type="button" class="kz-dispose-btn" data-dispose-batch="' + esc(line.batchId) + '" data-dispose-name="' + esc(item.name) + '" data-dispose-qty="' + line.qty + '" ' +
                            'style="margin-top:6px;padding:4px 10px;border-radius:8px;border:1px solid #f3c7c3;background:#fff;color:#b3261e;font:inherit;font-size:12px;font-weight:700;cursor:pointer;">Dispose (record as waste)</button>';
                    }
                    return '<tr class="stock-row' + (first ? '' : ' stock-batch-row') + '" data-stock-type="' + esc(item.type) + '" data-stock="' + esc(item.code) + '">' +
                        '<td class="po-col-num">' + (first ? (info.start + index) : '') + '</td>' +
                        '<td class="po-col-type">' + (first ? '<span class="status-pill-badge stock-type-badge ' + esc(item.type) + '">' + esc(typeLabel(item.type)) + '</span>' : '') + '</td>' +
                        '<td class="po-col-name"><a href="#" class="stock-name-link" data-stock="' + esc(item.code) + '">' + esc(item.name) + '</a>' + tag + sub + '</td>' +
                        '<td class="po-col-date">' + (raw ? '' : esc(line.produced || '—')) + '</td>' +
                        '<td class="po-col-date">' + (raw ? '' : esc(line.expires || '—')) + '</td>' +
                        '<td class="po-col-unit">' + (raw ? '' : esc(displayUnit(item, line.qty))) + '</td>' +
                        '<td class="po-col-qty"><span class="inventory-count-text ' + (low ? 'low-warning' : 'high-stock') + '">' + line.qty + (raw && window.KreezbyProduction && window.KreezbyProduction.unitFor(item.code) ? ' ' + esc(window.KreezbyProduction.unitFor(item.code)) : '') + '</span></td>' +
                        '<td class="po-col-cost">' + peso(item.cost) + '</td>' +
                        '<td class="po-col-action">' + (first ? buildMenu(item) : '') + '</td>' +
                        '</tr>';
                }).join('');
            }).join('');
        }
        renderFooter(info);
    }

    // Raw materials and packaging have no Unit, Produced or Expires.
    function noDates(item) {
        return !!item && (item.type === 'raw-material' || item.type === 'packaging-material');
    }

    // Unit, Produced and Expires are hidden when the list shows only raw materials or only
    // packaging, and left empty on those rows in the mixed list. Items are told apart by their
    // stock type (no item code column).
    function syncRawColumns() {
        var oldStyle = document.getElementById('stocks-raw-cols-style');
        if (oldStyle && oldStyle.getAttribute('data-v') !== '20261117raw2') { oldStyle.parentNode.removeChild(oldStyle); oldStyle = null; }
        if (!oldStyle) {
            var T = 'body.po-admin-page #stocks-orders-table';
            var st = document.createElement('style');
            st.id = 'stocks-raw-cols-style';
            st.setAttribute('data-v', '20261117raw2');
            st.textContent = '#stocks-orders-table.is-raw-only .po-col-date,#stocks-orders-table.is-raw-only .po-col-unit{display:none!important;}'
                + '#stocks-orders-table .po-col-code{display:none!important;}'
                + '#stocks-orders-table .stock-name-link{color:inherit;text-decoration:none;font-weight:inherit;}'
                + '#stocks-orders-table .stock-name-link:hover{text-decoration:underline;text-underline-offset:2px;}'
                // Desktop and tablet: fixed column widths so nothing is squeezed or wrapped mid-value;
                // the list scrolls sideways instead when the screen is narrower than the table.
                + '@media (min-width:901px){'
                + 'body.po-admin-page #stocks-master-list-panel-view .po-table-scroll-wrap{overflow-x:auto!important;}'
                + T + '{table-layout:fixed!important;width:100%!important;min-width:1030px;}'
                + T + '.is-raw-only{min-width:700px;}'
                + T + ' th,' + T + ' td{padding-left:12px!important;padding-right:12px!important;vertical-align:middle!important;}'
                + T + ' th{white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;}'
                + T + ' .po-col-num{width:44px!important;text-align:center!important;}'
                + T + ' .po-col-type{width:190px!important;text-align:left!important;white-space:nowrap!important;}'
                + T + ' .po-col-type .status-pill-badge{white-space:nowrap;overflow:visible;text-overflow:clip;max-width:none;}'
                + T + ' .po-col-name{width:auto!important;min-width:180px;text-align:left!important;line-height:1.35;overflow-wrap:anywhere;}'
                + T + ' .po-col-date{width:112px!important;text-align:left!important;white-space:nowrap!important;font-variant-numeric:tabular-nums;}'
                + T + ' .po-col-unit{width:96px!important;text-align:left!important;white-space:nowrap!important;}'
                + T + ' .po-col-qty{width:92px!important;text-align:right!important;white-space:nowrap!important;font-variant-numeric:tabular-nums;}'
                + T + ' .po-col-cost{width:108px!important;text-align:right!important;white-space:nowrap!important;font-variant-numeric:tabular-nums;}'
                + T + ' .po-col-action{width:116px!important;text-align:center!important;}'
                + T + ' td.po-col-name .status-pill-badge{white-space:nowrap;display:inline-flex;vertical-align:middle;}'
                // Raw materials / packaging only (no Unit, Produced, Expires): spread the space over the
                // remaining columns instead of giving it all to Item Name.
                + T + '.is-raw-only .po-col-num{width:6%!important;}'
                + T + '.is-raw-only .po-col-type{width:20%!important;}'
                + T + '.is-raw-only .po-col-name{width:28%!important;}'
                + T + '.is-raw-only .po-col-qty{width:14%!important;text-align:center!important;}'
                + T + '.is-raw-only .po-col-cost{width:16%!important;text-align:center!important;}'
                + T + '.is-raw-only .po-col-action{width:16%!important;}'
                + '}';
            document.head.appendChild(st);
        }
        var table = document.getElementById('stocks-orders-table');
        var typeFilter = document.getElementById('stocks-type-filter');
        var type = typeFilter ? typeFilter.value : 'all';
        if (table) table.classList.toggle('is-raw-only', type === 'raw-material' || type === 'packaging-material');
    }

    function scrollStocksToTop() {
        window.scrollTo(0, 0);
        var root = document.scrollingElement || document.documentElement;
        if (root) root.scrollTop = 0;
        document.querySelectorAll('#stocks-details-panel .po-details-scroll, #stocks-master-list-panel-view .po-table-scroll-wrap').forEach(function (node) {
            node.scrollTop = 0;
        });
    }

    function historyRows(item) {
        var dict = window.KreezbyDictionary;
        var rows = dict && typeof dict.historyFor === 'function' ? dict.historyFor(item.name) : [];
        var local = localStore().history[item.code] || [];
        return (rows || []).concat(local);
    }

    function showDetails(title) {
        var master = document.getElementById('stocks-master-list-panel-view');
        var details = document.getElementById('stocks-details-panel');
        var heading = document.getElementById('stocks-details-title');
        if (master) master.style.display = 'none';
        if (details) {
            details.classList.add('is-open');
            details.style.display = 'flex';
        }
        if (heading) heading.textContent = title;
        scrollStocksToTop();
    }

    function backToList() {
        var master = document.getElementById('stocks-master-list-panel-view');
        var details = document.getElementById('stocks-details-panel');
        openCode = '';
        if (details) {
            details.classList.remove('is-open');
            details.style.display = 'none';
        }
        if (master) master.style.display = '';
        render();
        scrollStocksToTop();
    }

    function openHistory(code) {
        var item = findItem(code);
        if (!item) return;
        openCode = code;
        var rows = historyRows(item);
        var lines = rows.length ? rows.map(function (row) {
            var when = row.date ? new Date(row.date).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
            var balance = row.before != null ? esc(row.before) + ' → ' + esc(row.after) : '—';
            var typeName = ({ 'stock-in': 'Stock in', 'stock-out': 'Stock out', 'usage': 'Used in production', 'waste': 'Waste / disposed', 'retailer-return': 'Pulled out (not resold)' })[row.type] || row.type || 'movement';
            return '<tr><td>' + esc(when) + '</td><td>' + esc(typeName) + '</td><td class="po-num">' + esc(row.quantity) + '</td><td>' + balance + '</td><td>' + esc(row.by || '—') + '</td><td>' + esc(row.note || '') + '</td></tr>';
        }).join('') : '<tr class="po-empty-row"><td colspan="6">No movements yet.</td></tr>';
        var content = document.getElementById('stocks-details-content');
        if (content) {
            ensureDetailStyles();
            content.innerHTML =
                '<div class="po-detail-hero"><p class="po-detail-kicker">Item details</p><h4>' + esc(item.name) + '</h4></div>' +
                '<div class="po-detail-facts">' +
                '<div class="po-detail-fact"><span>Stock type</span><strong>' + esc(typeLabel(item.type)) + '</strong></div>' +
                (noDates(item) ? '' : '<div class="po-detail-fact"><span>Unit</span><strong>' + esc(displayUnit(item, liveQty(item))) + '</strong></div>') +
                '<div class="po-detail-fact"><span>In stock</span><strong>' + liveQty(item) + '</strong></div>' +
                '</div>' +
                '<h3 class="po-detail-subtitle">Movement history</h3>' +
                '<div class="po-detail-table-wrap"><table class="data-display-table"><thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Balance</th><th>Recorded by</th><th>Note</th></tr></thead><tbody>' +
                lines + '</tbody></table></div>';
        }
        showDetails(item.name);
    }

    function alertAt(code) {
        var alerts = window.KreezbyBrowserAlerts;
        if (alerts && typeof alerts.thresholdFor === 'function') return alerts.thresholdFor(code);
        var item = findItem(code);
        return item ? lowLimit(item.type) : 0;
    }

    function ensureDetailStyles() {
        if (document.getElementById('stocks-detail-style')) return;
        var st = document.createElement('style');
        st.id = 'stocks-detail-style';
        st.textContent = ''
            + '#stocks-details-content .po-detail-hero{display:flex;flex-direction:column;gap:4px;margin:4px 0 16px;}'
            + '#stocks-details-content .po-detail-kicker{margin:0;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8d6e63;}'
            + '#stocks-details-content .po-detail-hero h4{margin:0;font-size:20px;line-height:1.25;color:#3e2723;}'
            + '#stocks-details-content .po-detail-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:0 0 22px;}'
            + '#stocks-details-content .po-detail-fact{display:flex;flex-direction:column;gap:6px;padding:14px 16px;background:#fffaf3;border:1px solid #eadfce;border-radius:12px;min-width:0;}'
            + '#stocks-details-content .po-detail-fact span{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8d6e63;}'
            + '#stocks-details-content .po-detail-fact strong{font-size:17px;line-height:1.3;color:#3e2723;overflow-wrap:anywhere;}'
            + '#stocks-details-content .po-detail-subtitle{margin:0 0 10px;font-size:16px;color:#3e2723;}'
            + '#stocks-details-content .po-detail-table-wrap{width:100%;overflow-x:auto;}'
            + '#stocks-details-content .po-detail-table-wrap th,#stocks-details-content .po-detail-table-wrap td{padding:10px 12px;white-space:nowrap;text-align:left;vertical-align:top;}'
            + '#stocks-details-content .po-detail-table-wrap td:last-child{white-space:normal;min-width:180px;}'
            + '@media (max-width:600px){#stocks-details-content .po-detail-facts{grid-template-columns:1fr 1fr;gap:10px;}#stocks-details-content .po-detail-fact{padding:12px;}#stocks-details-content .po-detail-fact strong{font-size:15px;}}';
        (document.head || document.documentElement).appendChild(st);
    }

    function ensureEditStyles() {
        if (document.getElementById('stocks-edit-style')) return;
        var st = document.createElement('style');
        st.id = 'stocks-edit-style';
        st.textContent = ''
            + '#stocks-edit-form.se-form{display:flex!important;flex-direction:column;gap:16px;width:100%!important;max-width:880px!important;align-self:stretch;box-sizing:border-box;margin-top:14px;}'
            + '.se-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;}'
            + '.se-stat{background:#fffaf3;border:1px solid #eadfce;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;}'
            + '.se-stat span{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8d6e63;}'
            + '.se-stat strong{font-size:18px;color:#3e2723;}'
            + '.se-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}'
            + '.se-section{background:#fff;border:1px solid #eadfce;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;}'
            + '.se-section h5{margin:0;font-size:15px;color:#3e2723;}'
            + '.se-hint{margin:0;font-size:12px;line-height:1.45;color:#7a6558;}'
            + '.se-field{display:flex;flex-direction:column;gap:6px;margin-top:4px;font-size:12px;font-weight:700;color:#5d4037;}'
            + '.se-input{display:flex;align-items:center;height:40px;border:1px solid #e4d8c4;border-radius:10px;background:#fff;overflow:hidden;}'
            + '.se-input:focus-within{border-color:#5d4037;box-shadow:0 0 0 3px rgba(93,64,55,.12);}'
            + '.se-input b{padding:0 12px;height:100%;display:flex;align-items:center;background:#f6efe6;color:#5d4037;font-size:13px;font-weight:700;}'
            + '#stocks-edit-form.se-form .se-input input{flex:1 1 auto!important;width:auto!important;min-width:0!important;height:100%!important;border:0!important;border-radius:0!important;outline:none!important;padding:0 12px!important;font:600 14px/1 inherit;color:#1f1f1f;background:transparent!important;margin:0!important;box-shadow:none!important;}'
            + '.se-actions{display:flex;justify-content:flex-end;gap:10px;}'
            + '.se-cancel{height:40px;padding:0 18px;border:1px solid #c4b4a4;border-radius:10px;background:#fff;color:#5d4037;font-weight:700;font-size:13px;cursor:pointer;}'
            + '.se-cancel:hover{background:#f6efe6;}'
            + '.se-save{height:40px;padding:0 22px;border-radius:10px;}'
            + '#stocks-details-content{width:100%;}'
            + '@media (max-width:600px){.se-actions{flex-direction:column-reverse;}.se-actions button{width:100%;}.se-summary{grid-template-columns:repeat(2,minmax(0,1fr));}}';
        (document.head || document.documentElement).appendChild(st);
    }

    function openEdit(code) {
        var item = findItem(code);
        if (!item) return;
        openCode = code;
        var current = alertAt(code);
        var content = document.getElementById('stocks-details-content');
        var dict = window.KreezbyDictionary;
        // Finished products: head admin and admin can change the selling price here.
        var priceEditable = item.type === 'finished-product' && dict
            && typeof dict.canEditPrice === 'function' && dict.canEditPrice()
            && typeof dict.productPrice === 'function' && dict.productPrice(item.name) != null;
        var price = priceEditable ? Number(dict.productPrice(item.name)) : 0;
        if (content) {
            ensureEditStyles();
            ensureDetailStyles();
            var unit = /^pouch/.test(String(item.unit || '').toLowerCase()) ? 'pouches' : 'units';
            var onHand = liveQty(item);
            var summary = '<div class="se-summary">'
                + '<div class="se-stat"><span>On hand</span><strong>' + onHand + ' ' + unit + '</strong></div>'
                + (priceEditable ? '<div class="se-stat"><span>Selling price</span><strong>₱' + price.toFixed(2) + '</strong></div>' : '')
                + '<div class="se-stat"><span>Alert at</span><strong>' + current + ' ' + unit + '</strong></div>'
                + '</div>';
            var priceSection = priceEditable
                ? '<section class="se-section">'
                    + '<h5>Selling price</h5>'
                    + '<p class="se-hint">Price per pouch for customers and the Walk-in POS. Retailers pay the separate retailer price (₱' + ((dict && typeof dict.retailerPrice === 'function') ? Number(dict.retailerPrice()) : 140).toFixed(2) + '), set in Maintenance &gt; Item List.</p>'
                    + '<label class="se-field"><span>Price per pouch</span>'
                    + '<div class="se-input se-input--prefix"><b>₱</b><input name="price" type="number" min="1" step="0.01" value="' + price.toFixed(2) + '"></div></label>'
                    + '</section>'
                : '';
            var alertSection = '<section class="se-section">'
                + '<h5>Stock alert</h5>'
                + '<p class="se-hint">An alert goes out when ' + esc(item.name) + ' is at or below this number.</p>'
                + '<label class="se-field"><span>Alert at</span>'
                + '<div class="se-input se-input--suffix"><input name="threshold" type="number" min="0" step="1" value="' + current + '"><b>' + unit + '</b></div></label>'
                + '</section>';
            content.innerHTML =
                '<div class="po-detail-hero"><p class="po-detail-kicker">' + esc(typeLabel(item.type)) + '</p><h4>' + esc(item.name) + '</h4></div>' +
                '<form id="stocks-edit-form" class="se-form">' +
                summary +
                '<div class="se-grid">' + priceSection + alertSection + '</div>' +
                (item.type === 'finished-product' && !isStaffPage()
                    ? '<section class="se-section"><h5>Recipe per batch</h5><p class="se-hint">The raw materials one batch of ' + esc(item.name) + ' uses. They come off the Inventory automatically when a batch is prepared in Production.</p>'
                        + '<button type="button" class="se-cancel" data-open-recipe="' + esc(item.code) + '">Open recipe in Production</button></section>'
                    : '') +
                '<div class="se-actions"><button type="button" class="se-cancel" id="stocks-edit-cancel">Cancel</button>' +
                '<button class="btn-call-to-action se-save" type="submit">Save changes</button></div>' +
                '</form>';
            var cancel = document.getElementById('stocks-edit-cancel');
            if (cancel) cancel.addEventListener('click', backToList);
            var form = document.getElementById('stocks-edit-form');
            if (form) {
                form.addEventListener('submit', function (event) {
                    event.preventDefault();
                    var data = new FormData(form);
                    var value = data.get('threshold');
                    var priceChanged = false;
                    if (priceEditable) {
                        var newPrice = Number(data.get('price'));
                        if (!(newPrice > 0)) {
                            showToast('Enter a selling price above ₱0.');
                            return;
                        }
                        if (newPrice !== price) {
                            dict.saveProductFields(item.name, { price: newPrice.toFixed(2) });
                            if (Number(dict.productPrice(item.name)) !== Number(newPrice.toFixed(2))) {
                                showToast('The price for ' + item.name + ' could not be saved.');
                                return;
                            }
                            priceChanged = true;
                        }
                    }
                    var alerts = window.KreezbyBrowserAlerts;
                    if (!alerts || typeof alerts.setItemThreshold !== 'function' || !alerts.setItemThreshold(item.code, value)) {
                        showToast(priceChanged ? item.name + ' is now ₱' + Number(data.get('price')).toFixed(2) + '. Enter an alert quantity of 0 or more.' : 'Enter a quantity of 0 or more.');
                        return;
                    }
                    showToast(priceChanged
                        ? item.name + ' is now ₱' + Number(data.get('price')).toFixed(2) + ' per pouch and alerts at ' + Number(value) + '.'
                        : item.name + ' alerts at ' + Number(value) + '.');
                    backToList();
                });
            }
        }
        showDetails(item.name);
    }

    function archiveItem(code) {
        if (isStaffPage()) return;
        var item = findItem(code);
        if (!item || manuallyArchived(item)) return;
        var ok = window.confirm('Archive "' + item.name + '"?\n\nIt moves to the Archive list and leaves the active list. Its stock and history are kept, and you can bring it back with Retrieve.');
        if (!ok) return;
        var archived = archivedNames();
        archived.push(item.name);
        try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived)); } catch (e) { /* ignore */ }
        showToast('"' + item.name + '" was moved to the Archive.');
        render();
    }

    function retrieveItem(code) {
        var item = findItem(code);
        if (!item) return;
        var archived = archivedNames().filter(function (name) {
            return name !== item.name && name !== item.code;
        });
        try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived)); } catch (e) { /* ignore */ }
        showToast('"' + item.name + '" is back on the active list.');
        render();
    }

    function setViewMode(mode) {
        viewMode = mode === 'archive' || mode === 'expired' || mode === 'production' ? mode : 'active';
        // The page can load this script twice (page + fast navigation); both copies follow one view.
        window.__kzStocksViewMode = viewMode;
        listPage = 1;
        closeAllMenus();
        render();
        scrollStocksToTop();
    }

    // Adds the Expired button between Active and Archive, and Production after them, when the
    // page does not have them yet.
    function ensureExpiredButton() {
        var bar = document.getElementById('stocks-view-switch');
        if (!bar) return;
        // Phone: the four views sit two per row with whole words (no "Expire / d").
        if (!document.getElementById('stocks-view-phone-style')) {
            var ps = document.createElement('style');
            ps.id = 'stocks-view-phone-style';
            ps.textContent = '@media (max-width:900px){#stocks-view-switch{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;border-radius:16px!important;padding:6px!important;height:auto!important}'
                + '#stocks-view-switch .stocks-view-btn{width:100%!important;min-width:0!important;white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important;padding:9px 6px!important;font-size:14px!important;line-height:1.2!important;border-radius:12px!important}'
                + '#stocks-table-body .kz-dispose-btn{width:100%;padding:9px 10px!important}}';
            (document.head || document.documentElement).appendChild(ps);
        }
        if (!bar.querySelector('[data-stocks-view="expired"]')) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'stocks-view-btn';
            btn.setAttribute('data-stocks-view', 'expired');
            btn.textContent = 'Expired';
            var archiveBtn = bar.querySelector('[data-stocks-view="archive"]');
            bar.insertBefore(btn, archiveBtn || null);
        }
        if (!bar.querySelector('[data-stocks-view="production"]')) {
            var prod = document.createElement('button');
            prod.type = 'button';
            prod.className = 'stocks-view-btn';
            prod.setAttribute('data-stocks-view', 'production');
            prod.textContent = 'Production';
            bar.appendChild(prod);
        }
    }

    // Inventory > Production: prepare and finish batches (js/kreezby-production.js).
    function syncProductionView() {
        var panel = document.getElementById('stocks-master-list-panel-view');
        if (!panel) return false;
        var on = viewMode === 'production';
        var body = panel.querySelector('.po-list-body') || panel;
        var host = document.getElementById('stocks-production-host');
        if (on && !host) {
            host = document.createElement('div');
            host.id = 'stocks-production-host';
            body.insertBefore(host, body.firstChild);
        }
        ['.po-table-scroll-wrap', '#stocks-list-footer'].forEach(function (sel) {
            var node = panel.querySelector(sel);
            if (node) node.style.display = on ? 'none' : '';
        });
        ['stocks-page-size', 'stocks-type-filter', 'stocks-search-input'].forEach(function (id) {
            var node = document.getElementById(id);
            var wrap = node && (node.closest('label') || node.closest('.search-field-wrap'));
            if (wrap) wrap.style.display = on ? 'none' : '';
        });
        if (host) host.hidden = !on;
        if (on) {
            var count = document.getElementById('stocks-list-count');
            if (count) count.textContent = '';
            if (window.KreezbyProduction) window.KreezbyProduction.mount(host);
            else {
                host.innerHTML = '<p class="kzp-lead">Loading Production…</p>';
                if (!document.getElementById('kreezby-production-script')) {
                    var s = document.createElement('script');
                    s.id = 'kreezby-production-script';
                    s.src = '../js/kreezby-production.js?v=20261117';
                    s.onload = function () { if (viewMode === 'production' && window.KreezbyProduction) window.KreezbyProduction.mount(host); };
                    document.head.appendChild(s);
                }
            }
        }
        return on;
    }

    function syncArchiveChrome() {
        ensureExpiredButton();
        var title = document.querySelector('#stocks-master-list-panel-view .po-list-toolbar-title h3');
        var host = document.getElementById('stocks-record-host');
        var archived = archivedNames();
        var list = catalog();
        var archivedCount = list.filter(function (item) { return manuallyArchived(item, archived); }).length;
        var expiredCount = list.filter(function (item) { return hasExpiredStock(item); }).length;
        if (title) title.textContent = viewMode === 'archive' ? 'Archived Stocks' : viewMode === 'expired' ? 'Expired Stocks' : viewMode === 'production' ? 'Production' : 'List of Stocks';
        if (host) host.hidden = viewMode !== 'active';
        document.querySelectorAll('#stocks-view-switch [data-stocks-view]').forEach(function (btn) {
            var view = btn.getAttribute('data-stocks-view');
            var on = view === viewMode;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (view === 'archive') btn.textContent = archivedCount ? 'Archive (' + archivedCount + ')' : 'Archive';
            if (view === 'expired') {
                btn.textContent = expiredCount ? 'Expired (' + expiredCount + ')' : 'Expired';
                btn.classList.toggle('has-expired', expiredCount > 0);
            }
        });
    }

    function bindControl(id, eventName, handler) {
        var el = document.getElementById(id);
        if (!el) return;
        if (el.__stocksHandler) el.removeEventListener(eventName, el.__stocksHandler);
        el.__stocksHandler = handler;
        el.addEventListener(eventName, handler);
    }

    function onDocClick(event) {
        if (!document.getElementById('stocks-master-list-panel-view')) return;
        var viewBtn = event.target.closest ? event.target.closest('#stocks-view-switch [data-stocks-view]') : null;
        if (viewBtn) {
            event.preventDefault();
            setViewMode(viewBtn.getAttribute('data-stocks-view'));
            return;
        }
        var pager = event.target.closest ? event.target.closest('[data-stocks-pager]') : null;
        if (pager) {
            if (pager.disabled) return;
            event.preventDefault();
            listPage += pager.getAttribute('data-stocks-pager') === 'next' ? 1 : -1;
            render();
            scrollStocksToTop();
            return;
        }
        var recipeBtn = event.target.closest ? event.target.closest('[data-open-recipe]') : null;
        if (recipeBtn) {
            event.preventDefault();
            var recipeCode = recipeBtn.getAttribute('data-open-recipe');
            backToList();
            setViewMode('production');
            var openIt = function () { if (window.KreezbyProduction) window.KreezbyProduction.openRecipe(recipeCode); };
            if (window.KreezbyProduction) openIt(); else setTimeout(openIt, 600);
            return;
        }
        var actionBtn = event.target.closest ? event.target.closest('#stocks-master-list-panel-view .action-trigger-btn[data-menu]') : null;
        if (actionBtn) {
            event.preventDefault();
            event.stopPropagation();
            toggleActionMenu(document.getElementById(actionBtn.getAttribute('data-menu')), actionBtn);
            return;
        }
        var actionItem = event.target.closest ? event.target.closest('.action-popup-item[data-stock]') : null;
        if (actionItem) {
            event.preventDefault();
            event.stopPropagation();
            var code = actionItem.getAttribute('data-stock');
            var action = actionItem.getAttribute('data-action');
            closeAllMenus();
            if (action === 'edit' && !isStaffPage()) openEdit(code);
            else if (action === 'view') openHistory(code);
            else if (action === 'adjust') showToast('Stock can only be added (Add stock), not changed or deleted.');
            else if (action === 'archive') archiveItem(code);
            else if (action === 'retrieve') retrieveItem(code);
            return;
        }
        var codeLink = event.target.closest ? event.target.closest('#stocks-orders-table a[data-stock]') : null;
        if (codeLink) {
            event.preventDefault();
            closeAllMenus();
            openHistory(codeLink.getAttribute('data-stock'));
            return;
        }
        closeAllMenus();
    }

    function ensureStocksTheme() {
        document.body.classList.add('po-admin-page');
        var root = '../';
        function sheet(id, href) {
            var link = document.getElementById(id);
            if (!link) {
                link = document.createElement('link');
                link.id = id;
                link.rel = 'stylesheet';
                link.setAttribute('data-po-owned', '1');
                document.head.appendChild(link);
            }
            link.disabled = false;
            link.href = href;
        }
        sheet('kreezby-stocks-admin-css', root + 'css/pages/admin/stocks-admin.css');
        sheet('kreezby-po-tabs-css', root + 'css/shared/order-tabbed-layout.css');
        sheet('kreezby-po-expand-css', root + 'css/shared/expandable-nav-tabs.css');
        sheet('po-theme-sheet', root + 'css/pages/admin/po-theme.css?v=20261008lay2');
    }

    function init() {
        if (!document.getElementById('stocks-master-list-panel-view')) return;
        ensureStocksTheme();
        render();
        bindControl('stocks-search-input', 'input', function () {
            listPage = 1;
            render();
            scrollStocksToTop();
        });
        bindControl('stocks-page-size', 'change', function () {
            listPage = 1;
            render();
            scrollStocksToTop();
        });
        bindControl('stocks-type-filter', 'change', function () {
            listPage = 1;
            render();
            scrollStocksToTop();
        });
        bindControl('stocks-details-back-btn', 'click', function (event) {
            event.preventDefault();
            backToList();
        });
        if (window.__kreezbyStocksDocClick) {
            document.removeEventListener('click', window.__kreezbyStocksDocClick, true);
        }
        window.__kreezbyStocksDocClick = onDocClick;
        document.addEventListener('click', window.__kreezbyStocksDocClick, true);
    }

    if (!window.__kreezbyStocksLive) {
        window.__kreezbyStocksLive = function () {
            if (!document.getElementById('stocks-master-list-panel-view')) return;
            var details = document.getElementById('stocks-details-panel');
            if (details && details.style.display === 'flex') {
                if (openCode && document.getElementById('stocks-edit-form')) return;
                if (openCode && document.querySelector('#stocks-details-content .po-detail-table-wrap')) {
                    openHistory(openCode);
                }
                return;
            }
            render();
        };
        document.addEventListener('kreezby:stocks-sync', window.__kreezbyStocksLive);
        window.addEventListener('storage', function (event) {
            if (!event || (event.key !== DICT_KEY && event.key !== ARCHIVE_KEY && event.key !== LOCAL_KEY)) return;
            window.__kreezbyStocksLive();
        });
    }

    window.StocksAdmin = {
        refresh: function () { render(); },
        bind: function () { init(); },
        closeMenus: closeAllMenus,
        openHistory: openHistory
    };

    if (!window.__kreezbyStocksPageHook) {
        window.__kreezbyStocksPageHook = true;
        document.addEventListener('kreezby:page-load', function () {
            if (document.getElementById('stocks-master-list-panel-view')) init();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
