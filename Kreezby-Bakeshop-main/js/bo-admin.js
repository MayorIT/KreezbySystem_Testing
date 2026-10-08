/**
 * Back Order portal — list view, details, action menus (localStorage).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezby-bo-orders-v1';

    var DEFAULT_ORDERS = {
        'BO-0005': {
            code: 'BO-0005', poCode: 'PO-0005', dateCreated: '2021-11-03 16:13',
            entity: 'Retailer 103', entityType: 'retailer', supplier: 'Supplier 103',
            expectedDelivery: 'May 28, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Awaiting fulfillment from supplier.',
            items: [
                { name: 'Item 107', unit: 'Boxes', note: 'Back ordered', ordered: 40, received: 0, backOrder: 40, cost: 180, total: 7200 },
                { name: 'Item 108', unit: 'pcs', note: 'Back ordered', ordered: 25, received: 0, backOrder: 25, cost: 120, total: 3000 }
            ]
        },
        'BO-0004': {
            code: 'BO-0004', poCode: 'PO-0004', dateCreated: '2021-11-03 11:52',
            entity: 'Retailer 102', entityType: 'retailer', supplier: 'Supplier 102',
            expectedDelivery: 'May 25, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Fully fulfilled.',
            items: [{ name: 'Item 106', unit: 'Boxes', note: '', ordered: 20, received: 20, backOrder: 0, cost: 250, total: 5000 }]
        },
        'BO-0003': {
            code: 'BO-0003', poCode: 'PO-0003', dateCreated: '2021-11-03 11:51',
            entity: 'Retailer 102', entityType: 'retailer', supplier: 'Supplier 102',
            expectedDelivery: 'May 24, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Partial delivery received. Some items are back ordered.',
            items: [
                { name: 'Item 102', unit: 'Boxes', note: 'Sample only', ordered: 50, received: 30, backOrder: 20, cost: 200, total: 4000 },
                { name: 'Item 104', unit: 'pcs', note: 'Sample only', ordered: 20, received: 15, backOrder: 5, cost: 205, total: 1025 }
            ]
        },
        'BO-0002': {
            code: 'BO-0002', poCode: 'PO-0002', dateCreated: '2021-11-03 11:20',
            entity: 'Retailer 101', entityType: 'retailer', supplier: 'Supplier 101',
            expectedDelivery: 'May 22, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Complete delivery.',
            items: [{ name: 'Item 101', unit: 'Boxes', note: 'Standard batch', ordered: 100, received: 100, backOrder: 0, cost: 150, total: 15000 }]
        },
        'BO-0001': {
            code: 'BO-0001', poCode: 'PO-0001', dateCreated: '2021-11-03 11:20',
            entity: 'Retailer 101', entityType: 'retailer', supplier: 'Supplier 101',
            expectedDelivery: 'May 21, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Balance pending.',
            items: [{ name: 'Item 105', unit: 'pcs', note: '', ordered: 30, received: 18, backOrder: 12, cost: 95, total: 1140 }]
        },
        'BO-C012': {
            code: 'BO-C012', poCode: 'PO-0012', dateCreated: '2021-11-03 16:10',
            entity: 'Customer 205', entityType: 'customer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'May 30, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Customer pre-order backlog.',
            items: [{ name: 'Chocolate Crinkles', unit: 'Jars', note: '', ordered: 12, received: 0, backOrder: 12, cost: 120, total: 1440 }]
        },
        'BO-C011': {
            code: 'BO-C011', poCode: 'PO-0011', dateCreated: '2021-11-03 15:45',
            entity: 'Customer 201', entityType: 'customer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'May 27, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Fulfilled.',
            items: [{ name: 'Lemon Crinkles', unit: 'PCS', note: '', ordered: 8, received: 8, backOrder: 0, cost: 45, total: 360 }]
        },
        'BO-C010': {
            code: 'BO-C010', poCode: 'PO-0010', dateCreated: '2021-11-03 14:30',
            entity: 'Customer 203', entityType: 'customer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'May 26, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Partial fulfillment.',
            items: [
                { name: 'Choco Almond', unit: 'PCS', note: '', ordered: 10, received: 6, backOrder: 4, cost: 55, total: 220 },
                { name: 'Ube', unit: 'PCS', note: '', ordered: 5, received: 3, backOrder: 2, cost: 45, total: 90 }
            ]
        },
        'BO-C009': {
            code: 'BO-C009', poCode: 'PO-0009', dateCreated: '2021-11-03 13:05',
            entity: 'Customer 202', entityType: 'customer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'May 23, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Complete.',
            items: [{ name: 'Chocolate', unit: 'PCS', note: '', ordered: 15, received: 15, backOrder: 0, cost: 50, total: 750 }]
        },
        'BO-C008': {
            code: 'BO-C008', poCode: 'PO-0008', dateCreated: '2021-11-03 12:20',
            entity: 'Customer 204', entityType: 'customer', supplier: 'Kreezby Bakeshop',
            expectedDelivery: 'May 22, 2024', status: 'PENDING', statusClass: 'pending',
            remarks: 'Awaiting stock.',
            items: [{ name: 'Choco Butternut', unit: 'Jars', note: '', ordered: 6, received: 0, backOrder: 6, cost: 120, total: 720 }]
        }
    };

    var BO_STATUSES = [
        { class: 'pending', label: 'Pending', value: 'PENDING' }
    ];

    var BO_ORDERS = {};
    var currentBoCode = null;
    var menuCounter = 0;
    var PAGE_MODE = null;
    var activeBoTab = 'retailer';
    var listPage = { retailer: 1, customer: 1 };
    var retailerStoreName = '';
    var SUPPLIER_LABEL = 'Kreezby Bakeshop';

    function applyPortalSeed() {
        if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
            window.KreezbyPortalSeed.apply();
        }
    }

    function isWholesalerPortal() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (!/\/retailer\//i.test(path)) return false;
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || 'null');
            return !!(session && session.accountType === 'Wholesaler');
        } catch (e) { return false; }
    }

    function matchesPortalEntity(order) {
        if (PAGE_MODE !== 'retailer' || !retailerStoreName) return true;
        var name = String(retailerStoreName).toLowerCase();
        if (name === 'retailer' || name === 'wholesaler') return true;
        return order && order.entity === retailerStoreName;
    }

    function listBlockId() {
        return PAGE_MODE === 'retailer' ? 'bo-retailer-dashboard-view' : 'bo-master-dashboard-split-view';
    }

    function detailsBlockId() {
        return 'bo-details-inspection-panel-view';
    }

    function detectPageMode() {
        if (document.getElementById('bo-retailer-dashboard-view')) return 'retailer';
        if (document.getElementById('bo-master-dashboard-split-view')) return 'admin';
        return null;
    }

    function ensureTableScrollWrap(containerSelector) {
        var cardBody = document.querySelector(containerSelector + ' .card-body-padded');
        if (!cardBody) return;
        var tables = cardBody.querySelectorAll('table.data-display-table');
        tables.forEach(function (table) {
            if (table.parentNode && table.parentNode.classList.contains('po-table-scroll-wrap')) return;
            if (!table.parentNode) return;
            var wrap = document.createElement('div');
            wrap.className = 'po-table-scroll-wrap';
            table.parentNode.insertBefore(wrap, table);
            wrap.appendChild(table);
        });
    }

    function setupRetailerPage() {
        if (PAGE_MODE !== 'retailer') return;
        document.body.setAttribute('data-kreezby-portal', 'retailer-bo');
        ensureTableScrollWrap('#bo-retailer-dashboard-view');
        var theadRow = document.querySelector('#bo-retailer-dashboard-view table thead tr');
        if (theadRow && !theadRow.getAttribute('data-kreezby-portal-head')) {
            theadRow.setAttribute('data-kreezby-portal-head', '1');
            theadRow.innerHTML = '<th>#</th><th>Date Created</th><th>BO Code</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th>';
        }
        var brand = document.querySelector('.panel-brand');
        var brandName = brand ? brand.textContent.trim() : '';
        var sessionName = '';
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || 'null');
            sessionName = session && session.userName ? String(session.userName) : '';
        } catch (e) { sessionName = ''; }
        var genericBrand = !brandName || brandName.toLowerCase() === 'retailer' || brandName.toLowerCase() === 'wholesaler';
        retailerStoreName = genericBrand ? (sessionName || brandName || 'Retailer') : brandName;
        var tbody = document.querySelector('#bo-retailer-dashboard-view table tbody');
        if (tbody) tbody.id = 'bo-retailer-tbody';
        var search = document.querySelector('#bo-retailer-dashboard-view input[type="text"]');
        if (search) search.id = 'bo-retailer-search';
        var details = document.getElementById(detailsBlockId());
        if (details) {
            var title = details.querySelector('.panel-card-title-bar h3');
            if (title) title.id = 'bo-details-title';
            var sheet = details.querySelector('.details-inspection-sheet, .details-container-view');
            if (sheet) sheet.id = 'bo-details-content';
            var footer = details.querySelector('.details-action-footer-row');
            if (footer) {
                footer.querySelectorAll('button').forEach(function (btn) {
                    var label = (btn.textContent || '').toLowerCase();
                    if (label.indexOf('print') >= 0) btn.id = 'bo-details-print-btn';
                    if (label.indexOf('edit') >= 0) btn.id = 'bo-details-edit-btn';
                    if (label.indexOf('back') >= 0) btn.id = 'bo-details-back-btn';
                });
            }
        }
        if (!document.getElementById('bo-print-root')) {
            var printRoot = document.createElement('div');
            printRoot.id = 'bo-print-root';
            printRoot.className = 'bo-print-root';
            printRoot.setAttribute('aria-hidden', 'true');
            document.body.appendChild(printRoot);
        }
    }

    function switchBoTab(tabName) {
        var tablist = document.querySelector('.bo-order-tabs');
        if (!tablist || !tabName) return;

        if (window.KreezbyTabPanels) {
            activeBoTab = window.KreezbyTabPanels.switch({
                tablist: tablist,
                tabName: tabName,
                prefix: 'bo',
                tabBtnSelector: '.bo-order-tab',
                panelSelector: '.bo-tab-panel'
            }) || tabName;
            scrollBoToTop(activeBoTab);
            return;
        }

        activeBoTab = tabName;
        tablist.querySelectorAll('.bo-order-tab').forEach(function (btn) {
            var on = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        document.querySelectorAll('.bo-tab-panel').forEach(function (panel) {
            panel.classList.toggle('active', panel.id === 'bo-tab-' + tabName);
        });
        scrollBoToTop(tabName);
    }

    function setupAdminPage() {
        if (PAGE_MODE !== 'admin') return;
        if (/\/staff\//i.test(window.location.pathname)) {
            document.body.setAttribute('data-kreezby-portal', 'staff-bo');
        }
        ensureTableScrollWrap('#bo-tab-retailer');
        ensureTableScrollWrap('#bo-tab-customer');
        var details = document.getElementById(detailsBlockId());
        if (details) {
            var title = details.querySelector('.panel-card-title-bar h3');
            if (title) title.id = 'bo-details-title';
            var sheet = details.querySelector('.details-inspection-sheet');
            if (sheet) sheet.id = 'bo-details-content';
            var footer = details.querySelector('.details-action-footer-row');
            if (footer) {
                footer.querySelectorAll('button').forEach(function (btn) {
                    var label = (btn.textContent || '').toLowerCase();
                    if (label.indexOf('print') >= 0) btn.id = 'bo-details-print-btn';
                    if (label.indexOf('edit') >= 0) btn.id = 'bo-details-edit-btn';
                    if (label.indexOf('back') >= 0) btn.id = 'bo-details-back-btn';
                    btn.type = 'button';
                    btn.removeAttribute('onclick');
                });
            }
        }
        if (!document.getElementById('bo-print-root')) {
            var root = document.createElement('div');
            root.id = 'bo-print-root';
            root.className = 'bo-print-root';
            root.setAttribute('aria-hidden', 'true');
            document.body.appendChild(root);
        }

        var tablist = document.querySelector('.bo-order-tabs');
        if (tablist && window.KreezbyTabPanels) {
            window.KreezbyTabPanels.wire(tablist, {
                prefix: 'bo',
                tabBtnSelector: '.bo-order-tab',
                panelSelector: '.bo-tab-panel'
            });
        }
    }

    function injectPrintStyles() {
        if (document.getElementById('kreezby-bo-portal-style')) return;
        var s = document.createElement('style');
        s.id = 'kreezby-bo-portal-style';
        s.textContent =
            '.action-menu-relative-container{position:relative;display:inline-block}' +
            '.action-popup-menu{display:none;position:absolute;right:0;top:100%;margin-top:4px;background:#fff;min-width:180px;' +
            'box-shadow:0 4px 12px rgba(0,0,0,.12);border:1px solid #ddd;border-radius:4px;z-index:300}' +
            '.action-popup-menu.active{display:block}' +
            '.action-popup-menu-wide{min-width:200px}' +
            '.action-popup-item{padding:8px 14px;font-size:13px;color:#333;cursor:pointer;text-align:left}' +
            '.action-popup-item:hover{background:#f5f5f5}' +
            '.action-popup-divider{height:1px;background:#e0e0e0;margin:6px 0}' +
            '.action-popup-item-status{font-size:12px;color:#444}' +
            '.action-popup-item-status.is-current{font-weight:700;color:#1565c0;background:#f3f8ff}' +
            '.action-popup-menu{max-height:min(70vh,360px);overflow-y:auto}' +
            '.bo-status-link{cursor:pointer}' +
            'body:not(.po-admin-page) .po-table-scroll-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%}' +
            'body:not(.po-admin-page) .po-table-scroll-wrap table.data-display-table{min-width:720px}' +
            'body:not(.po-admin-page)[data-kreezby-portal] .retailer-module-host .panel-data-card,' +
            'body:not(.po-admin-page)[data-kreezby-portal] .panel-data-card,body:not(.po-admin-page)[data-kreezby-portal] .card-body-padded,' +
            'body:not(.po-admin-page) #bo-retailer-dashboard-view,body:not(.po-admin-page) #bo-master-dashboard-split-view{overflow:visible!important}' +
            '@media print{body.bo-printing>*:not(#bo-print-root){display:none!important}' +
            '#bo-print-root{display:block!important}}';
        document.head.appendChild(s);
    }

    function loadData() {
        applyPortalSeed();
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            BO_ORDERS = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_ORDERS));
        } catch (e) {
            BO_ORDERS = JSON.parse(JSON.stringify(DEFAULT_ORDERS));
        }
        Object.keys(BO_ORDERS).forEach(function (code) {
            var order = BO_ORDERS[code];
            if (!order) return;
            if (order.statusClass === 'received' || order.statusClass === 'partial') {
                order.statusClass = 'pending';
                order.status = 'PENDING';
            }
        });
    }

    function saveData() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(BO_ORDERS)); } catch (e) {}
    }

    function formatMoney(n) {
        return Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function boTotal(order) {
        return (order.items || []).reduce(function (s, it) { return s + (Number(it.total) || 0); }, 0);
    }

    function statusMeta(statusClass) {
        if (statusClass === 'received' || statusClass === 'partial') statusClass = 'pending';
        for (var i = 0; i < BO_STATUSES.length; i++) {
            if (BO_STATUSES[i].class === statusClass) return BO_STATUSES[i];
        }
        return BO_STATUSES[0];
    }

    function ordersByType(type) {
        return Object.keys(BO_ORDERS).map(function (k) { return BO_ORDERS[k]; }).filter(function (o) {
            if (PAGE_MODE === 'retailer') {
                if (!matchesPortalEntity(o)) return false;
                if (isWholesalerPortal()) return o.entityType === 'wholesaler';
                return o.entityType !== 'customer' && o.entityType !== 'wholesaler';
            }
            return type === 'customer' ? o.entityType === 'customer' : o.entityType !== 'customer';
        }).sort(function (a, b) {
            var d = b.dateCreated.localeCompare(a.dateCreated);
            return d !== 0 ? d : b.code.localeCompare(a.code);
        });
    }

    function showToast(message) {
        var msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = 'position:fixed;z-index:10060;left:50%;top:18px;transform:translateX(-50%);background:#263238;color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;';
        document.body.appendChild(msg);
        setTimeout(function () { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 2200);
    }

    function resetMenuPosition(menu) {
        menu.style.position = '';
        menu.style.top = '';
        menu.style.right = '';
        menu.style.bottom = '';
        menu.style.left = '';
        menu.style.marginTop = '';
        menu.style.zIndex = '';
    }

    function hideMenuBackdrop() {
        var bd = document.getElementById('kreezby-action-menu-backdrop');
        if (bd) bd.remove();
    }

    function showMenuBackdrop() {
        hideMenuBackdrop();
        var bd = document.createElement('div');
        bd.id = 'kreezby-action-menu-backdrop';
        bd.style.cssText = 'position:fixed;inset:0;z-index:4990;background:transparent;cursor:default;';
        bd.addEventListener('click', function () { closeAllMenus(); });
        document.body.appendChild(bd);
    }

    function dockMenuHome(menu) {
        if (!menu._homeMarker) {
            menu._homeMarker = document.createComment('kreezby-menu-home');
            if (menu.parentNode) menu.parentNode.insertBefore(menu._homeMarker, menu);
        }
    }

    function restoreMenuHome(menu) {
        if (menu._homeMarker && menu._homeMarker.parentNode) {
            menu._homeMarker.parentNode.insertBefore(menu, menu._homeMarker.nextSibling);
        }
    }

    function closeAllMenus() {
        document.querySelectorAll('.action-popup-menu').forEach(function (m) {
            m.classList.remove('active', 'flip-up');
            m.style.display = 'none';
            resetMenuPosition(m);
            restoreMenuHome(m);
        });
        hideMenuBackdrop();
    }

    function positionMenu(menu, btn) {
        menu.classList.remove('flip-up');
        resetMenuPosition(menu);
        var rect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = 'auto';
        menu.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
        menu.style.zIndex = '5000';
        if (window.innerHeight - rect.bottom < 260) {
            menu.classList.add('flip-up');
            menu.style.top = 'auto';
            menu.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
        } else {
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.bottom = 'auto';
        }
    }

    function toggleActionMenu(menu, btn) {
        if (menu.classList.contains('active')) {
            closeAllMenus();
            return;
        }
        closeAllMenus();
        dockMenuHome(menu);
        document.body.appendChild(menu);
        menu.classList.add('active');
        menu.style.display = 'block';
        positionMenu(menu, btn);
        menu.style.zIndex = '10050';
        showMenuBackdrop();
    }

    function buildStatusActionItems(boCode, currentClass) {
        if (currentClass === 'received' || currentClass === 'partial') currentClass = 'pending';
        return BO_STATUSES.map(function (s) {
            var current = s.class === currentClass ? ' is-current' : '';
            return '<div class="action-popup-item action-popup-item-status' + current + '" data-action="set-status"' +
                ' data-status-class="' + s.class + '" data-bo="' + boCode + '">' + s.label + '</div>';
        }).join('');
    }

    function buildActionMenu(boCode) {
        menuCounter += 1;
        var menuId = 'bo-act-menu-' + menuCounter;
        var order = BO_ORDERS[boCode];
        return '<div class="action-menu-relative-container" data-kreezby-page-menu>' +
            '<button type="button" class="action-trigger-btn" data-menu="' + menuId + '">Action ▾</button>' +
            '<div class="action-popup-menu action-popup-menu-wide" id="' + menuId + '">' +
            '<div class="action-popup-item" data-action="view" data-bo="' + boCode + '">View Details</div>' +
            '<div class="action-popup-item" data-action="edit" data-bo="' + boCode + '">Edit Record</div>' +
            '<div class="action-popup-item" data-action="print" data-bo="' + boCode + '">Print Report</div>' +
            '<div class="action-popup-divider" aria-hidden="true"></div>' +
            buildStatusActionItems(boCode, order ? order.statusClass : 'pending') +
            '</div></div>';
    }

    function listPageSize(kind) {
        var el = document.getElementById('bo-' + kind + '-page-size');
        var n = parseInt(el && el.value, 10);
        if (n !== 10 && n !== 25 && n !== 50) n = 10;
        return n;
    }

    function pageSlice(rows, kind) {
        var size = listPageSize(kind);
        var pages = Math.max(1, Math.ceil(rows.length / size) || 1);
        if (!listPage[kind] || listPage[kind] < 1) listPage[kind] = 1;
        if (listPage[kind] > pages) listPage[kind] = pages;
        var startIndex = (listPage[kind] - 1) * size;
        return {
            rows: rows.slice(startIndex, startIndex + size),
            total: rows.length,
            page: listPage[kind],
            pages: pages,
            start: rows.length ? startIndex + 1 : 0,
            end: Math.min(rows.length, startIndex + size),
            offset: startIndex
        };
    }

    function renderListFooter(footer, kind, info) {
        if (!footer) return;
        var count = document.getElementById('bo-' + kind + '-count');
        if (count) count.textContent = info.total + (info.total === 1 ? ' order' : ' orders');
        footer.innerHTML =
            '<span>Showing ' + info.start + '–' + info.end + ' of ' + info.total + '</span>' +
            '<div class="po-pager">' +
            '<button type="button" class="po-pager-btn" data-bo-pager="' + kind + '" data-bo-dir="prev"' + (info.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
            '<span class="po-pager-status">Page ' + info.page + ' of ' + info.pages + '</span>' +
            '<button type="button" class="po-pager-btn" data-bo-pager="' + kind + '" data-bo-dir="next"' + (info.page >= info.pages ? ' disabled' : '') + '>Next</button>' +
            '</div>';
    }

    function dateCell(raw) {
        var text = String(raw || '').replace('T', ' ').trim();
        var parts = text.split(/\s+/);
        var day = parts[0] || '—';
        var time = parts.slice(1).join(' ');
        return '<span class="po-date-main">' + esc(day) + '</span>' +
            (time ? '<span class="po-date-time">' + esc(time) + '</span>' : '');
    }

    function typeChipClass(type) {
        var label = String(type || '').toLowerCase();
        if (label.indexOf('whole') >= 0) return 'is-wholesale';
        if (label.indexOf('customer') >= 0) return 'is-customer';
        return 'is-retail';
    }

    function entityCell(name, type, area) {
        return '<span class="po-entity-name">' + esc(name || '—') + '</span><span class="po-entity-meta">' +
            '<span class="po-type-chip ' + typeChipClass(type) + '">' + esc(type || 'Account') + '</span>' +
            (area ? '<span class="po-entity-area">' + esc(area) + '</span>' : '') +
            '</span>';
    }

    function accountLabel(order) {
        if (order.accountType) return order.accountType;
        if (order.entityType === 'wholesaler') return 'Wholesaler';
        if (order.entityType === 'customer') return 'Regular Customer';
        return 'Retailer';
    }

    function adminOrderRow(order, index) {
        var area = order.accountArea || order.area || '';
        var status = statusMeta(order.statusClass);
        return '<tr data-bo="' + esc(order.code) + '" class="bo-data-row po-data-row">' +
            '<td class="po-col-num" data-label="#">' + index + '</td>' +
            '<td class="po-col-date" data-label="Date">' + dateCell(order.dateCreated) + '</td>' +
            '<td class="po-col-code" data-label="PO Code"><a href="#" class="bo-code-link po-code-link" data-bo="' + esc(order.code) + '">' + esc(order.poCode || order.code) + '</a></td>' +
            '<td class="po-col-entity" data-label="Account">' + entityCell(order.entity, accountLabel(order), area) + '</td>' +
            '<td class="po-col-items" data-label="Items"><span class="po-item-count">' + (order.items ? order.items.length : 0) + '</span></td>' +
            '<td class="po-col-status" data-label="Status"><span class="status-pill-badge ' + esc(status.class) + ' bo-status-link po-status-link" data-bo="' + esc(order.code) + '">' + esc(status.label) + '</span></td>' +
            '<td class="po-col-action" data-label="Action">' + buildActionMenu(order.code) + '</td></tr>';
    }

    function renderRetailerTable(filter) {
        var tbody = document.getElementById('bo-retailer-tbody');
        var footer = document.getElementById('bo-retailer-footer');
        if (!tbody) return;
        closeAllMenus();
        var q = (filter || '').toLowerCase().trim();
        var all = ordersByType('retailer');
        var rows = all.filter(function (o) {
            if (!q) return true;
            return [o.code, o.poCode, o.dateCreated, o.entity, o.supplier, o.status, SUPPLIER_LABEL].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        if (PAGE_MODE === 'retailer') {
            tbody.innerHTML = rows.map(function (o, i) {
                return '<tr data-bo="' + o.code + '" class="bo-data-row">' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td>' + o.dateCreated + '</td>' +
                    '<td><a href="#" class="bo-code-link" data-bo="' + o.code + '">' + o.code + '</a></td>' +
                    '<td>' + buildActionMenu(o.code) + '</td>' +
                    '<td>' + (o.supplier || SUPPLIER_LABEL) + '</td>' +
                    '<td>' + (o.items ? o.items.length : 0) + '</td>' +
                    '<td><span class="status-pill-badge ' + o.statusClass + ' bo-status-link" data-bo="' + o.code + '">' + statusMeta(o.statusClass).label + '</span></td></tr>';
            }).join('');
            var note = document.querySelector('#bo-retailer-dashboard-view [data-bo-footer]');
            if (!note) {
                var host = document.querySelector('#bo-retailer-dashboard-view .card-body-padded');
                if (host) {
                    host.querySelectorAll('div').forEach(function (node) {
                        if (note || node.children.length) return;
                        if (/^Showing /i.test((node.textContent || '').trim())) note = node;
                    });
                    if (note) note.setAttribute('data-bo-footer', '1');
                }
            }
            if (note) {
                var total = rows.length;
                note.textContent = total ? ('Showing 1 to ' + total + ' of ' + total + ' entries') : 'Showing 0 entries';
            }
            return;
        }
        var page = pageSlice(rows, 'retailer');
        tbody.innerHTML = page.rows.map(function (o, i) {
            return adminOrderRow(o, page.offset + i + 1);
        }).join('') || '<tr class="po-empty-row"><td colspan="7">No retailer back orders match this search.</td></tr>';
        renderListFooter(footer, 'retailer', page);
    }

    function renderCustomerTable(filter) {
        var tbody = document.getElementById('bo-customer-tbody');
        var footer = document.getElementById('bo-customer-footer');
        if (!tbody) return;
        closeAllMenus();
        var q = (filter || '').toLowerCase().trim();
        var all = ordersByType('customer');
        var rows = all.filter(function (o) {
            if (!q) return true;
            return [o.code, o.poCode, o.dateCreated, o.entity, o.status].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        if (PAGE_MODE === 'retailer') {
            tbody.innerHTML = rows.map(function (o, i) {
                return '<tr data-bo="' + o.code + '" class="bo-data-row">' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td>' + o.dateCreated + '</td>' +
                    '<td><a href="#" class="bo-code-link" data-bo="' + o.code + '">' + o.poCode + '</a></td>' +
                    '<td>' + o.entity + '</td>' +
                    '<td>' + (o.items ? o.items.length : 0) + '</td>' +
                    '<td><span class="status-pill-badge ' + o.statusClass + ' bo-status-link" data-bo="' + o.code + '">' + statusMeta(o.statusClass).label + '</span></td>' +
                    '<td>' + buildActionMenu(o.code) + '</td></tr>';
            }).join('');
            return;
        }
        var page = pageSlice(rows, 'customer');
        tbody.innerHTML = page.rows.map(function (o, i) {
            return adminOrderRow(o, page.offset + i + 1);
        }).join('') || '<tr class="po-empty-row"><td colspan="7">No customer back orders match this search.</td></tr>';
        renderListFooter(footer, 'customer', page);
    }

    function refreshTables() {
        var rs = document.getElementById('bo-retailer-search');
        var cs = document.getElementById('bo-customer-search');
        renderRetailerTable(rs ? rs.value : '');
        renderCustomerTable(cs ? cs.value : '');
    }

    function detailFact(label, value) {
        return '<div class="po-detail-fact"><span>' + esc(label) + '</span><strong>' + esc(value || '—') + '</strong></div>';
    }

    function renderDetailsView(order) {
        var itemsHtml = (order.items || []).map(function (it) {
            return '<tr>' +
                '<td><strong>' + esc(it.name) + '</strong>' + (it.note ? '<br><small>' + esc(it.note) + '</small>' : '') + '</td>' +
                '<td>' + esc(it.unit) + '</td>' +
                '<td class="po-num">' + esc(formatMoney(it.ordered)) + '</td>' +
                '<td class="po-num">' + esc(formatMoney(it.received)) + '</td>' +
                '<td class="po-num">' + esc(formatMoney(it.backOrder)) + '</td>' +
                '<td class="po-num">' + esc(formatMoney(it.cost)) + '</td>' +
                '<td class="po-num">' + esc(formatMoney(it.total)) + '</td></tr>';
        }).join('');
        if (!itemsHtml) itemsHtml = '<tr><td colspan="7" class="po-empty-row">No back ordered items.</td></tr>';
        var total = boTotal(order);
        var status = statusMeta(order.statusClass);
        var backQty = (order.items || []).reduce(function (sum, it) { return sum + (Number(it.backOrder) || 0); }, 0);
        return '<div class="po-detail-hero">' +
            '<div><p class="po-detail-kicker">' + esc(accountLabel(order)) + '</p>' +
            '<p class="po-detail-sub">' + esc(order.entity || '—') + ' · ' + esc(order.dateCreated || '—') + '</p></div>' +
            '<div class="po-detail-hero-side"><span class="status-pill-badge ' + esc(status.class) + '">' + esc(status.label) + '</span>' +
            '<p class="po-detail-total">₱' + esc(formatMoney(total)) + '</p></div></div>' +
            '<div class="po-detail-facts">' +
            detailFact('Back order', order.code) +
            detailFact('PO code', order.poCode) +
            detailFact('Supplier', order.supplier || SUPPLIER_LABEL) +
            detailFact('Expected', order.expectedDelivery) +
            detailFact('Back ordered qty', String(backQty)) +
            '</div>' +
            '<div class="po-detail-remarks"><span>Remarks</span><p>' + esc(order.remarks || '—') + '</p></div>' +
            '<section class="po-detail-section"><h3>Back ordered items</h3>' +
            '<div class="po-detail-table-wrap"><table class="data-display-table"><thead><tr>' +
            '<th>Item</th><th>Unit</th><th>Ordered</th><th>Received</th><th>Back order</th><th>Unit cost</th><th>Total</th>' +
            '</tr></thead><tbody>' + itemsHtml + '</tbody>' +
            '<tfoot><tr><td colspan="6">Back order total</td><td class="po-num">₱' + esc(formatMoney(total)) + '</td></tr></tfoot>' +
            '</table></div></section>';
    }

    function scrollBoToTop(kind) {
        window.scrollTo(0, 0);
        var root = document.scrollingElement || document.documentElement;
        if (root) root.scrollTop = 0;
        var details = document.querySelector('.po-details-scroll');
        if (details) details.scrollTop = 0;
        var wraps = document.querySelectorAll('#bo-tab-' + (kind || activeBoTab) + ' .po-table-scroll-wrap, #bo-tab-' + (kind || activeBoTab) + ' .bo-table-scroll-wrap');
        if (!kind) wraps = document.querySelectorAll('.po-table-scroll-wrap, .bo-table-scroll-wrap');
        wraps.forEach(function (wrap) { wrap.scrollTop = 0; });
    }

    function openDetails(boCode) {
        var order = BO_ORDERS[boCode];
        if (!order) { showToast('Back order not found.'); return; }
        currentBoCode = boCode;
        closeAllMenus();
        var master = document.getElementById(listBlockId());
        var details = document.getElementById(detailsBlockId());
        if (master) master.style.display = 'none';
        if (details) {
            details.classList.add('is-open');
            details.style.display = 'flex';
        }
        var title = document.getElementById('bo-details-title');
        if (title) title.textContent = order.code;
        var content = document.getElementById('bo-details-content');
        if (content) content.innerHTML = renderDetailsView(order);
        scrollBoToTop();
    }

    function backToList() {
        var details = document.getElementById(detailsBlockId());
        var master = document.getElementById(listBlockId());
        if (details) {
            details.classList.remove('is-open');
            details.style.display = 'none';
        }
        if (master) master.style.display = '';
        currentBoCode = null;
        scrollBoToTop(activeBoTab);
    }

    function applyStatus(boCode, statusClass) {
        var order = BO_ORDERS[boCode];
        if (!order) return;
        var meta = statusMeta(statusClass);
        order.statusClass = meta.class;
        order.status = meta.value;
        saveData();
        refreshTables();
        if (currentBoCode === boCode) openDetails(boCode);
        showToast('Status updated to ' + meta.label + '.');
    }

    function printReport(boCode) {
        var order = BO_ORDERS[boCode];
        if (!order) return;
        var root = document.getElementById('bo-print-root');
        if (!root) return;
        root.innerHTML = '<div class="bo-receipt-sheet"><h1>Kreezby Bakeshop</h1><h2>Back Order Report</h2>' +
            '<p><strong>Back Order:</strong> ' + order.code + '</p>' +
            '<p><strong>P.O. Code:</strong> ' + order.poCode + '</p>' +
            '<p><strong>Status:</strong> ' + order.status + '</p>' +
            '<p><strong>Remarks:</strong> ' + (order.remarks || '') + '</p>' +
            '<p>Printed ' + new Date().toLocaleString() + '</p></div>';
        document.body.classList.add('bo-printing');
        window.print();
        setTimeout(function () { document.body.classList.remove('bo-printing'); root.innerHTML = ''; }, 500);
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function startEdit(boCode) {
        openDetails(boCode);
        var order = BO_ORDERS[boCode];
        var content = document.getElementById('bo-details-content');
        if (!order || !content || content.querySelector('#bo-edit-form')) return;
        var options = BO_STATUSES.map(function (status) {
            return '<option value="' + status.class + '"' + (status.class === order.statusClass ? ' selected' : '') + '>' + esc(status.label) + '</option>';
        }).join('');
        content.insertAdjacentHTML('afterbegin',
            '<form id="bo-edit-form" class="po-detail-remarks" data-kreezby-native="1">' +
            '<span>Edit this back order</span>' +
            '<label>Expected delivery<br><input class="po-detail-input" name="expected" value="' + esc(order.expectedDelivery || '') + '"></label>' +
            '<label>Status<br><select class="po-detail-input" name="status">' + options + '</select></label>' +
            '<label>Remarks<br><textarea class="po-detail-input" name="remarks" rows="3">' + esc(order.remarks || '') + '</textarea></label>' +
            '<button class="btn-call-to-action" type="submit">Save changes</button>' +
            '</form>');
    }

    function handleAction(action, boCode, statusClass) {
        closeAllMenus();
        if (action === 'view') { openDetails(boCode); return; }
        if (action === 'edit') { startEdit(boCode); return; }
        if (action === 'set-status' && statusClass) { applyStatus(boCode, statusClass); return; }
        if (action === 'print') { printReport(boCode); }
    }

    function bindControl(el, type, key, handler) {
        if (!el) return;
        if (!el.__boHandlers) el.__boHandlers = {};
        if (el.__boHandlers[key]) el.removeEventListener(type, el.__boHandlers[key]);
        el.__boHandlers[key] = handler;
        el.addEventListener(type, handler);
    }

    function bindEvents() {
        var rs = document.getElementById('bo-retailer-search');
        bindControl(rs, 'input', 'search', function () {
            listPage.retailer = 1;
            renderRetailerTable(rs.value);
            scrollBoToTop('retailer');
        });
        var cs = document.getElementById('bo-customer-search');
        bindControl(cs, 'input', 'search', function () {
            listPage.customer = 1;
            renderCustomerTable(cs.value);
            scrollBoToTop('customer');
        });
        ['retailer', 'customer'].forEach(function (kind) {
            var size = document.getElementById('bo-' + kind + '-page-size');
            bindControl(size, 'change', 'page-size', function () {
                listPage[kind] = 1;
                refreshTables();
                scrollBoToTop(kind);
            });
        });
        document.querySelectorAll('.bo-order-tab').forEach(function (btn) {
            bindControl(btn, 'click', 'tab-scroll', function () {
                scrollBoToTop(btn.getAttribute('data-tab'));
            });
        });
        var printBtn = document.getElementById('bo-details-print-btn');
        bindControl(printBtn, 'click', 'print', function () { if (currentBoCode) printReport(currentBoCode); });
        var editBtn = document.getElementById('bo-details-edit-btn');
        bindControl(editBtn, 'click', 'edit', function () { if (currentBoCode) startEdit(currentBoCode); });
        var detailsPanel = document.getElementById(detailsBlockId());
        if (detailsPanel && detailsPanel.dataset.editBound !== '1') {
            detailsPanel.dataset.editBound = '1';
            detailsPanel.addEventListener('submit', function (ev) {
                var form = ev.target.closest('#bo-edit-form');
                if (!form || !currentBoCode || !BO_ORDERS[currentBoCode]) return;
                ev.preventDefault();
                var order = BO_ORDERS[currentBoCode];
                order.expectedDelivery = form.elements.expected.value.trim();
                order.remarks = form.elements.remarks.value.trim();
                applyStatus(currentBoCode, form.elements.status.value);
                showToast('Saved ' + currentBoCode + '.');
            });
        }
        bindControl(document.getElementById('bo-details-back-btn'), 'click', 'back', backToList);

        var masterSelector = PAGE_MODE === 'retailer' ? '#bo-retailer-dashboard-view' : '#bo-master-dashboard-split-view';

        if (window.__kreezbyBoDocClick) {
            document.removeEventListener('click', window.__kreezbyBoDocClick, true);
        }
        window.__kreezbyBoDocClick = function (e) {
            var master = document.getElementById('bo-master-dashboard-split-view') || document.getElementById('bo-retailer-dashboard-view');
            if (!master || !e.target || !e.target.closest) return;
            var tabBtn = e.target.closest('.bo-order-tab');
            if (tabBtn && master.contains(tabBtn)) {
                switchBoTab(tabBtn.getAttribute('data-tab'));
                return;
            }
            var pager = e.target.closest('[data-bo-pager]');
            if (pager && !pager.disabled) {
                e.preventDefault();
                var kind = pager.getAttribute('data-bo-pager');
                var dir = pager.getAttribute('data-bo-dir');
                listPage[kind] = (listPage[kind] || 1) + (dir === 'next' ? 1 : -1);
                refreshTables();
                scrollBoToTop(kind);
                return;
            }
            var actionBtn = e.target.closest(masterSelector + ' .action-trigger-btn[data-menu]');
            if (actionBtn) {
                e.preventDefault(); e.stopPropagation();
                var menu = document.getElementById(actionBtn.getAttribute('data-menu'));
                if (menu) toggleActionMenu(menu, actionBtn);
                return;
            }
            var actionItem = e.target.closest('.action-popup-item[data-bo]');
            if (actionItem) {
                e.preventDefault(); e.stopPropagation();
                handleAction(
                    actionItem.getAttribute('data-action'),
                    actionItem.getAttribute('data-bo'),
                    actionItem.getAttribute('data-status-class')
                );
                return;
            }
            var boLink = e.target.closest('.bo-code-link, .bo-status-link');
            if (boLink) {
                e.preventDefault(); e.stopPropagation();
                openDetails(boLink.getAttribute('data-bo'));
                return;
            }
            var row = e.target.closest('tr.bo-data-row');
            if (row && !e.target.closest('.action-menu-relative-container, button, a')) {
                openDetails(row.getAttribute('data-bo'));
                return;
            }
            if (!e.target.closest('.action-popup-menu') && !e.target.closest('.action-trigger-btn[data-menu]')) {
                closeAllMenus();
            }
        };
        document.addEventListener('click', window.__kreezbyBoDocClick, true);

        if (!window.__kreezbyBoKey) {
            window.__kreezbyBoKey = function (e) {
                if (e.key === 'Escape') closeAllMenus();
            };
            document.addEventListener('keydown', window.__kreezbyBoKey);
        }
    }

    function stripRetiredInboundLegendPills() {
        document.querySelectorAll('.legend-container-box .status-pill-badge').forEach(function (el) {
            var t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (t === 'received' || t === 'partially received') el.parentNode.removeChild(el);
        });
    }

    function ensureBoTheme() {
        if (PAGE_MODE !== 'admin') return;
        document.body.classList.add('po-admin-page');
        var path = (location.pathname || '').replace(/\\/g, '/');
        var match = path.match(/\/(admin|staff|staff_names|admin_names|head_admin)\//i);
        var root = '../';
        if (match) {
            var after = path.slice(path.indexOf(match[0]) + match[0].length);
            var depth = after.split('/').filter(Boolean).length || 1;
            root = '';
            for (var i = 0; i < depth; i++) root += '../';
        }
        function sheet(id, href) {
            var link = document.getElementById(id);
            if (!link) {
                link = document.createElement('link');
                link.id = id;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.disabled = false;
            if ((link.getAttribute('href') || '').indexOf(href.split('?')[0].split('/').pop()) === -1) link.href = href;
            return link;
        }
        sheet('kreezby-bo-admin-css', root + 'css/pages/admin/bo-admin.css');
        sheet('kreezby-po-tabs-css', root + 'css/shared/order-tabbed-layout.css');
        sheet('kreezby-po-expand-css', root + 'css/shared/expandable-nav-tabs.css');
        var theme = sheet('po-theme-sheet', root + 'css/pages/admin/po-theme.css?v=20261008sls');
        theme.href = root + 'css/pages/admin/po-theme.css?v=20261008sls';
    }

    function init() {
        PAGE_MODE = detectPageMode();
        if (!PAGE_MODE) return;
        ensureBoTheme();
        if (PAGE_MODE === 'retailer') setupRetailerPage();
        else setupAdminPage();
        injectPrintStyles();
        loadData();
        refreshTables();
        bindEvents();
        stripRetiredInboundLegendPills();
        if (!window.__kreezbyBoLiveSync) {
            window.__kreezbyBoLiveSync = true;
            function reloadLive() {
                if (!document.getElementById('bo-master-dashboard-split-view') && !document.getElementById('bo-retailer-dashboard-view')) return;
                loadData();
                refreshTables();
                if (currentBoCode && BO_ORDERS[currentBoCode]) {
                    var content = document.getElementById('bo-details-content');
                    if (content && document.getElementById(detailsBlockId()) && document.getElementById(detailsBlockId()).style.display !== 'none') {
                        content.innerHTML = renderDetailsView(BO_ORDERS[currentBoCode]);
                    }
                }
            }
            document.addEventListener('kreezby:bo-orders-sync', reloadLive);
            window.addEventListener('storage', function (event) {
                if (event.key === STORAGE_KEY) reloadLive();
            });
        }
    }

    window.BoAdmin = {
        openDetails: openDetails,
        backToList: backToList,
        printReport: printReport,
        handleAction: handleAction,
        closeMenus: closeAllMenus,
        bind: init
    };
    window.switchToBackOrderDetailsInspector = function (code) { openDetails(code || currentBoCode); };
    window.switchToBackOrderMasterDashboardView = backToList;

    if (!window.__kreezbyBoPageHook) {
        window.__kreezbyBoPageHook = true;
        document.addEventListener('kreezby:page-load', function () {
            if (document.getElementById('bo-master-dashboard-split-view') || document.getElementById('bo-retailer-dashboard-view')) init();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
