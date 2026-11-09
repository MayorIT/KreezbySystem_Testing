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
        { code: 'CRK-CHO-P', type: 'finished-product', name: 'Chocolate Crinkles', unit: 'Pouches', qty: 0, cost: 120 },
        { code: 'CRK-ALM-P', type: 'finished-product', name: 'Choco-Almond Crinkles', unit: 'Pouches', qty: 0, cost: 125 },
        { code: 'CRK-LEM-P', type: 'finished-product', name: 'Lemon Crinkles', unit: 'Pouches', qty: 0, cost: 120 },
        { code: 'CRK-BUT-J', type: 'finished-product', name: 'Choco Butternut Crinkles', unit: 'Pouches', qty: 0, cost: 150 },
        { code: 'CRK-MNG-J', type: 'finished-product', name: 'Mango Crinkles', unit: 'Pouches', qty: 0, cost: 150 },
        { code: 'CRK-MEL-P', type: 'finished-product', name: 'Melon Crinkles', unit: 'Pouches', qty: 0, cost: 0 },
        { code: 'CRK-STR-P', type: 'finished-product', name: 'Strawberry Crinkles', unit: 'Pouches', qty: 0, cost: 0 },
        { code: 'CRK-CSH-P', type: 'finished-product', name: 'Choco-Cashew Crinkles', unit: 'Pouches', qty: 0, cost: 0 },
        { code: 'CRK-AST-P', type: 'finished-product', name: 'Assorted Crinkles', unit: 'Pouches', qty: 0, cost: 0 },
        { code: 'CKE-OAT-P', type: 'finished-product', name: 'Oatmeal Cookies', unit: 'Pouches', qty: 0, cost: 0 },
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
        { code: 'PKG-STK-01', type: 'packaging-material', name: 'Stickers (Per Flavor)', unit: 'Quantity', qty: 0, cost: 3 },
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
        if (item && item.type === 'finished-product') return Number(qty) === 1 ? 'Pouch' : 'Pouches';
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
        items.forEach(function (row) {
            if (costs[row.code] != null && costs[row.code] !== '') row.cost = Number(costs[row.code]) || 0;
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
            if (viewMode === 'archive' ? !isArchived : isArchived) return false;
            if (type !== 'all' && item.type !== type) return false;
            if (!query) return true;
            var hay = (item.code + ' ' + item.name + ' ' + item.unit + ' ' + typeLabel(item.type)).toLowerCase();
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
            end: Math.min(start + size, rows.length),
            asset: rows.filter(function (item) { return item.type !== 'finished-product'; }).reduce(function (sum, item) { return sum + (liveQty(item) * (Number(item.cost) || 0)); }, 0)
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

    function buildMenu(item) {
        var menuId = 'stock-act-menu-' + item.code.replace(/[^a-zA-Z0-9-]/g, '');
        return '<div class="action-menu-relative-container" data-kreezby-page-menu>' +
            '<button type="button" class="action-trigger-btn" data-menu="' + menuId + '">Action ▾</button>' +
            '<div class="action-popup-menu" id="' + menuId + '">' +
            '<div class="action-popup-item" data-action="edit" data-stock="' + esc(item.code) + '">Edit</div>' +
            '<div class="action-popup-item" data-action="view" data-stock="' + esc(item.code) + '">View History</div>' +
            '<div class="action-popup-item" data-action="adjust" data-stock="' + esc(item.code) + '">Adjust Stock</div>' +
            (viewMode === 'archive'
                ? '<div class="action-popup-item" data-action="retrieve" data-stock="' + esc(item.code) + '">Retrieve</div>'
                : '<div class="action-popup-item" data-action="archive" data-stock="' + esc(item.code) + '">Archive Item</div>') +
            '</div></div>';
    }

    function renderFooter(info) {
        var footer = document.getElementById('stocks-list-footer');
        var count = document.getElementById('stocks-list-count');
        if (count) {
            count.textContent = viewMode === 'archive'
                ? info.total + (info.total === 1 ? ' archived item' : ' archived items')
                : info.total + (info.total === 1 ? ' item' : ' items');
        }
        if (!footer) return;
        footer.innerHTML =
            '<span>Showing ' + info.start + '–' + info.end + ' of ' + info.total + ' · Assets ' + peso(info.asset) + '</span>' +
            '<div class="po-pager">' +
            '<button type="button" class="po-pager-btn" data-stocks-pager="prev"' + (info.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
            '<span class="po-pager-status">Page ' + info.page + ' of ' + info.pages + '</span>' +
            '<button type="button" class="po-pager-btn" data-stocks-pager="next"' + (info.page >= info.pages ? ' disabled' : '') + '>Next</button>' +
            '</div>';
    }

    function render() {
        var body = document.getElementById('stocks-table-body');
        if (!body || !document.getElementById('stocks-master-list-panel-view')) return;
        var info = pageSlice(visibleItems());
        syncArchiveChrome();
        if (!info.rows.length) {
            body.innerHTML = '<tr class="po-empty-row"><td colspan="9">' +
                (viewMode === 'archive'
                    ? 'No archived items. Use Action, then Archive Item, on the active list.'
                    : 'No stock items match this filter.') +
                '</td></tr>';
        } else {
            body.innerHTML = info.rows.map(function (item, index) {
                var qty = liveQty(item);
                var low = qty <= lowLimit(item.type);
                return '<tr class="stock-row" data-stock-type="' + esc(item.type) + '" data-stock="' + esc(item.code) + '">' +
                    '<td class="po-col-num">' + (info.start + index) + '</td>' +
                    '<td class="po-col-code"><a href="#" class="po-code-link" data-stock="' + esc(item.code) + '">' + esc(item.code) + '</a></td>' +
                    '<td class="po-col-type"><span class="status-pill-badge stock-type-badge ' + esc(item.type) + '">' + esc(typeLabel(item.type)) + '</span></td>' +
                    '<td class="po-col-name">' + esc(item.name) + '</td>' +
                    '<td class="po-col-unit">' + esc(displayUnit(item, qty)) + '</td>' +
                    '<td class="po-col-qty"><span class="inventory-count-text ' + (low ? 'low-warning' : 'high-stock') + '">' + qty + '</span></td>' +
                    '<td class="po-col-cost">' + peso(item.cost) + '</td>' +
                    '<td class="po-col-value">' + peso(qty * (Number(item.cost) || 0)) + '</td>' +
                    '<td class="po-col-action">' + buildMenu(item) + '</td>' +
                    '</tr>';
            }).join('');
        }
        renderFooter(info);
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
            return '<tr><td>' + esc(when) + '</td><td>' + esc(row.type || 'movement') + '</td><td class="po-num">' + esc(row.quantity) + '</td><td>' + balance + '</td><td>' + esc(row.by || '—') + '</td><td>' + esc(row.note || '') + '</td></tr>';
        }).join('') : '<tr class="po-empty-row"><td colspan="6">No movements yet.</td></tr>';
        var content = document.getElementById('stocks-details-content');
        if (content) {
            content.innerHTML =
                '<div class="po-detail-hero"><p class="po-detail-kicker">' + esc(typeLabel(item.type)) + '</p><h4>' + esc(item.name) + '</h4></div>' +
                '<div class="po-detail-facts">' +
                '<div><span>Item code</span><strong>' + esc(item.code) + '</strong></div>' +
                '<div><span>Unit</span><strong>' + esc(displayUnit(item, liveQty(item))) + '</strong></div>' +
                '<div><span>In stock</span><strong>' + liveQty(item) + '</strong></div>' +
                '<div><span>Asset value</span><strong>' + peso(liveQty(item) * (Number(item.cost) || 0)) + '</strong></div>' +
                '</div>' +
                '<h3 class="po-detail-subtitle">Movement history</h3>' +
                '<div class="po-detail-table-wrap"><table class="data-display-table"><thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Balance</th><th>Recorded by</th><th>Note</th></tr></thead><tbody>' +
                lines + '</tbody></table></div>';
        }
        showDetails(item.code);
    }

    function alertAt(code) {
        var alerts = window.KreezbyBrowserAlerts;
        if (alerts && typeof alerts.thresholdFor === 'function') return alerts.thresholdFor(code);
        var item = findItem(code);
        return item ? lowLimit(item.type) : 0;
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
            var unit = String(item.unit || '').toLowerCase() === 'pouches' ? 'pouches' : 'units';
            var onHand = liveQty(item);
            var summary = '<div class="se-summary">'
                + '<div class="se-stat"><span>On hand</span><strong>' + onHand + ' ' + unit + '</strong></div>'
                + (priceEditable ? '<div class="se-stat"><span>Selling price</span><strong>₱' + price.toFixed(2) + '</strong></div>' : '')
                + '<div class="se-stat"><span>Alert at</span><strong>' + current + ' ' + unit + '</strong></div>'
                + '</div>';
            var priceSection = priceEditable
                ? '<section class="se-section">'
                    + '<h5>Selling price</h5>'
                    + '<p class="se-hint">Price per pouch for customers and the Walk-in POS. Retailers stay at ₱140.</p>'
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
        showDetails(item.code);
    }

    function openAdjust(code) {
        var item = findItem(code);
        if (!item) return;
        openCode = code;
        var content = document.getElementById('stocks-details-content');
        var raw = item.type === 'raw-material';
        if (content) {
            content.innerHTML =
                '<div class="po-detail-hero"><p class="po-detail-kicker">' + esc(typeLabel(item.type)) + '</p><h4>' + esc(item.name) + '</h4></div>' +
                '<form id="stocks-edit-form">' +
                (raw
                    ? '<label>Movement<select name="movement"><option value="stock-in">Stock in (received)</option><option value="stock-out">Stock out</option><option value="usage">Used in production</option><option value="waste">Spoiled / waste</option></select></label>' +
                      '<label>Quantity<input name="quantity" type="number" min="1" value="1"></label>' +
                      '<label>Note<input name="note" type="text" placeholder="Supplier, batch or reason (optional)"></label>' +
                      '<p class="po-note">On hand now: ' + liveQty(item) + '</p>'
                    : '<label>New quantity<input name="quantity" type="number" min="0" value="' + liveQty(item) + '"></label>') +
                '<button class="btn-call-to-action" type="submit">Save adjustment</button>' +
                '</form>';
            var form = document.getElementById('stocks-edit-form');
            if (form) {
                form.addEventListener('submit', function (event) {
                    event.preventDefault();
                    saveAdjust(item, form);
                });
            }
        }
        showDetails(item.code);
    }

    function pushLocalHistory(code, row) {
        var data = localStore();
        data.history[code] = data.history[code] || [];
        data.history[code].push(row);
        writeLocal(data);
    }

    function saveAdjust(item, form) {
        var data = new FormData(form);
        var qty = data.get('quantity');
        var dict = window.KreezbyDictionary;
        if (item.type === 'raw-material' && dict && typeof dict.recordMaterialMovement === 'function') {
            var next = dict.recordMaterialMovement(item.name, data.get('movement'), qty, data.get('note'));
            if (next == null) {
                showToast((typeof dict.lastMovementError === 'function' && dict.lastMovementError()) || 'Enter a quantity greater than zero.');
                return;
            }
            showToast(item.name + ' now has ' + next + ' on hand.');
            backToList();
            return;
        }
        if (item.type === 'finished-product' && dict && typeof dict.setProductStock === 'function') {
            var saved = dict.setProductStock(item.name, qty);
            if (saved != null) {
                showToast('Stock for "' + item.name + '" is now ' + saved + '.');
                backToList();
                return;
            }
        }
        var nextQty = Math.max(0, Number(qty) || 0);
        var store = localStore();
        var previous = liveQty(item);
        store.qty[item.code] = nextQty;
        writeLocal(store);
        pushLocalHistory(item.code, {
            type: 'adjustment',
            quantity: nextQty - previous,
            note: 'Count set to ' + nextQty
        });
        showToast('Stock for "' + item.name + '" is now ' + nextQty + '.');
        backToList();
    }

    function archiveItem(code) {
        var item = findItem(code);
        if (!item) return;
        var archived = archivedNames();
        if (archived.indexOf(item.name) < 0) archived.push(item.name);
        try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived)); } catch (e) { /* ignore */ }
        showToast('"' + item.name + '" moved to Archive.');
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
        viewMode = mode === 'archive' ? 'archive' : 'active';
        listPage = 1;
        closeAllMenus();
        render();
        scrollStocksToTop();
    }

    function syncArchiveChrome() {
        var title = document.querySelector('#stocks-master-list-panel-view .po-list-toolbar-title h3');
        var host = document.getElementById('stocks-record-host');
        var archivedCount = catalog().filter(function (item) {
            var archived = archivedNames();
            return archived.indexOf(item.name) >= 0 || archived.indexOf(item.code) >= 0;
        }).length;
        if (title) title.textContent = viewMode === 'archive' ? 'Archived Stocks' : 'List of Stocks';
        if (host) host.hidden = viewMode === 'archive';
        document.querySelectorAll('#stocks-view-switch [data-stocks-view]').forEach(function (btn) {
            var on = btn.getAttribute('data-stocks-view') === viewMode;
            btn.classList.toggle('is-active', on);
            if (btn.getAttribute('data-stocks-view') === 'archive') {
                btn.textContent = archivedCount ? 'Archive (' + archivedCount + ')' : 'Archive';
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
            if (action === 'edit') openEdit(code);
            else if (action === 'view') openHistory(code);
            else if (action === 'adjust') openAdjust(code);
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
