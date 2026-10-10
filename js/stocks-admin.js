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
        { code: 'CRK-CHO-P', type: 'finished-product', name: 'Chocolate Crinkles', unit: 'Pouch (8 Pcs)', qty: 450, cost: 120 },
        { code: 'CRK-ALM-P', type: 'finished-product', name: 'Choco-Almond Crinkles', unit: 'Pouch (8 Pcs)', qty: 320, cost: 125 },
        { code: 'CRK-LEM-P', type: 'finished-product', name: 'Lemon Crinkles', unit: 'Pouch (8 Pcs)', qty: 85, cost: 120 },
        { code: 'CRK-BUT-J', type: 'finished-product', name: 'Choco Butternut Crinkles', unit: 'Jar (250g Container)', qty: 210, cost: 150 },
        { code: 'CRK-MNG-J', type: 'finished-product', name: 'Mango Crinkles', unit: 'Jar (250g Container)', qty: 45, cost: 150 },
        { code: 'RM-FLR-01', type: 'raw-material', name: 'All-Purpose Flour', unit: '25 kg Sack', qty: 120, cost: 850 },
        { code: 'RM-COC-01', type: 'raw-material', name: 'Cocoa Powder', unit: '5 kg Bag', qty: 45, cost: 1200 },
        { code: 'RM-SUG-01', type: 'raw-material', name: 'Granulated Sugar', unit: '50 kg Sack', qty: 80, cost: 620 },
        { code: 'RM-BUT-01', type: 'raw-material', name: 'Unsalted Butter', unit: '2.5 kg Block', qty: 60, cost: 280 },
        { code: 'PKG-POU-01', type: 'packaging-material', name: 'Crinkle Pouch (8 Pcs)', unit: 'Roll (500 pcs)', qty: 35, cost: 450 },
        { code: 'PKG-JAR-01', type: 'packaging-material', name: '250g Glass Jar with Lid', unit: 'Carton (24 pcs)', qty: 18, cost: 960 },
        { code: 'PKG-LBL-01', type: 'packaging-material', name: 'Product Label Sticker', unit: 'Roll (1,000 labels)', qty: 12, cost: 350 },
        { code: 'PKG-BOX-01', type: 'packaging-material', name: 'Corrugated Shipping Box', unit: 'Bundle (50 pcs)', qty: 25, cost: 420 }
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
                type: 'raw-material',
                name: row.name,
                unit: 'Recorded material',
                qty: Number(row.current_stock) || 0,
                cost: 0
            });
        });
        return items;
    }

    function liveQty(item) {
        var dict = window.KreezbyDictionary;
        if (dict && item.type === 'finished-product' && typeof dict.productStock === 'function') {
            var productQty = dict.productStock(item.name);
            if (productQty != null && productQty !== '') return Number(productQty) || 0;
        }
        if (dict && item.type === 'raw-material' && typeof dict.materialStock === 'function') {
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
            asset: rows.reduce(function (sum, item) { return sum + (liveQty(item) * (Number(item.cost) || 0)); }, 0)
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
                    '<td class="po-col-unit">' + esc(item.unit) + '</td>' +
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
            return '<tr><td>' + esc(row.type || 'movement') + '</td><td class="po-num">' + esc(row.quantity) + '</td><td>' + esc(row.note || '') + '</td></tr>';
        }).join('') : '<tr class="po-empty-row"><td colspan="3">No movements yet.</td></tr>';
        var content = document.getElementById('stocks-details-content');
        if (content) {
            content.innerHTML =
                '<div class="po-detail-hero"><p class="po-detail-kicker">' + esc(typeLabel(item.type)) + '</p><h4>' + esc(item.name) + '</h4></div>' +
                '<div class="po-detail-facts">' +
                '<div><span>Item code</span><strong>' + esc(item.code) + '</strong></div>' +
                '<div><span>Unit</span><strong>' + esc(item.unit) + '</strong></div>' +
                '<div><span>In stock</span><strong>' + liveQty(item) + '</strong></div>' +
                '<div><span>Asset value</span><strong>' + peso(liveQty(item) * (Number(item.cost) || 0)) + '</strong></div>' +
                '</div>' +
                '<h3 class="po-detail-subtitle">Movement history</h3>' +
                '<div class="po-detail-table-wrap"><table class="data-display-table"><thead><tr><th>Type</th><th>Quantity</th><th>Note</th></tr></thead><tbody>' +
                lines + '</tbody></table></div>';
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
                    ? '<label>Movement<select name="movement"><option>stock-in</option><option>stock-out</option><option>usage</option></select></label>' +
                      '<label>Quantity<input name="quantity" type="number" min="1" value="1"></label>'
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
            var next = dict.recordMaterialMovement(item.name, data.get('movement'), qty);
            if (next == null) {
                showToast('Enter a quantity greater than zero.');
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
            if (action === 'view') openHistory(code);
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
