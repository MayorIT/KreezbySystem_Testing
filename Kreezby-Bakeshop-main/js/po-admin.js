/**
 * Purchase Order admin — list view, details, edit modals (localStorage).
 */
(function () {
    'use strict';

    if (window.__KreezbyPoAdminBooted) return;
    window.__KreezbyPoAdminBooted = true;

    var STORAGE_KEY = 'kreezby-po-orders-v1';

    var DEFAULT_ORDERS = {
        'PO-0001': {
            code: 'PO-0001', dateCreated: '2021-11-03 11:20', entity: 'Retailer 101',
            entityType: 'retailer', area: 'Batangas City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Standard replenishment order',
            items: [{ qty: 100, unit: 'Boxes', name: 'Item 101', note: 'Standard batch', cost: 150, total: 15000 }]
        },
        'PO-0002': {
            code: 'PO-0002', dateCreated: '2021-11-03 11:50', entity: 'Retailer 102',
            entityType: 'retailer', area: 'Lipa City', status: 'PENDING', statusClass: 'pending',
            remarks: 'Sample PO Only',
            items: [
                { qty: 300, unit: 'Boxes', name: 'Item 102', note: 'Sample only', cost: 200, total: 60000 },
                { qty: 200, unit: 'pcs', name: 'Item 104', note: 'Sample only', cost: 205, total: 41000 }
            ]
        },
        'PO-C001': {
            code: 'PO-C001', dateCreated: '2021-11-03 11:50', entity: 'Bryle Atienza',
            entityType: 'customer', area: 'Lipa City', status: 'PROCESSING', statusClass: 'pending',
            remarks: 'Customer walk-in order',
            items: [
                { qty: 10, unit: 'PCS', name: 'Chocolate', note: 'Crinkles', cost: 50, total: 500 },
                { qty: 5, unit: 'PCS', name: 'Lemon', note: 'Crinkles', cost: 45, total: 225 }
            ]
        },
        'PO-C002': {
            code: 'PO-C002', dateCreated: '2021-11-03 11:20', entity: 'Maria Santos',
            entityType: 'customer', area: 'Batangas City', status: 'PROCESSING', statusClass: 'pending',
            remarks: 'Pre-order pickup',
            items: [{ qty: 8, unit: 'Jars', name: 'Choco Butternut', note: '', cost: 120, total: 960 }]
        }
    };

    var PO_ORDERS = {};
    var currentPoCode = null;
    var editingPoCode = null;
    var menuCounter = 0;
    var activeTab = 'retailer';

    var PAGE_MODE = null;
    var retailerStoreName = '';
    var SUPPLIER_LABEL = 'Kreezby Bakeshop';

    function applyPortalSeed() {
        if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
            window.KreezbyPortalSeed.apply();
        }
    }

    function isWholesalerPortal() {
        return /\/wholesaler\//i.test((location.pathname || '').replace(/\\/g, '/'));
    }

    function matchesPortalEntity(order) {
        if (PAGE_MODE !== 'retailer' || !retailerStoreName) return true;
        return order && order.entity === retailerStoreName;
    }

    function masterBlockId() {
        return PAGE_MODE === 'retailer' ? 'po-retailer-directory-block' : 'po-master-lists-container-block';
    }

    function detailsBlockId() {
        return PAGE_MODE === 'retailer' ? 'po-retailer-details-viewer-block' : 'po-details-viewer-container-block';
    }

    function retailerPortalTbody() {
        return document.querySelector('#po-retailer-directory-block table.data-display-table tbody');
    }

    function detectPageMode() {
        if (document.getElementById('po-retailer-directory-block')) return 'retailer';
        if (document.getElementById('po-master-lists-container-block')) return 'admin';
        return null;
    }

    function ensureTableScrollWrap(containerSelector) {
        var cardBody = document.querySelector(containerSelector + ' .card-body-padded');
        if (!cardBody || cardBody.querySelector('.po-table-scroll-wrap')) return;
        var table = cardBody.querySelector('table.data-display-table');
        if (!table || !table.parentNode) return;
        var wrap = document.createElement('div');
        wrap.className = 'po-table-scroll-wrap';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
    }

    function setupRetailerPage() {
        if (PAGE_MODE !== 'retailer') return;
        document.body.setAttribute('data-kreezby-portal', 'retailer-po');
        ensureTableScrollWrap('#po-retailer-directory-block');
        var theadRow = document.querySelector('#po-retailer-directory-block table thead tr');
        if (theadRow && !theadRow.getAttribute('data-kreezby-portal-head')) {
            theadRow.setAttribute('data-kreezby-portal-head', '1');
            theadRow.innerHTML = '<th>#</th><th>Date Created</th><th>PO Code</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th>';
        }
        var brand = document.querySelector('.panel-brand');
        retailerStoreName = brand ? brand.textContent.trim() : 'Retailer';
        var tbody = retailerPortalTbody();
        if (tbody) tbody.id = 'retailer-orders-tbody';
        var search = document.querySelector('#po-retailer-directory-block input[type="text"]');
        if (search) search.id = 'retailer-search';
        var createBtn = document.querySelector('#po-retailer-directory-block .btn-call-to-action');
        if (createBtn) {
            createBtn.id = 'po-create-retailer-btn';
            createBtn.removeAttribute('onclick');
            createBtn.type = 'button';
        }
        var details = document.getElementById('po-retailer-details-viewer-block');
        if (details) {
            var title = details.querySelector('.panel-card-title-bar h3');
            if (title) title.id = 'po-details-title';
            var staticView = details.querySelector('.details-container-view');
            if (staticView) staticView.id = 'po-details-content';
            else if (!document.getElementById('po-details-content')) {
                var cardBody = details.querySelector('.card-body-padded');
                if (cardBody) {
                    var content = document.createElement('div');
                    content.id = 'po-details-content';
                    cardBody.insertBefore(content, cardBody.firstChild);
                }
            }
            var footer = details.querySelector('.details-action-footer-row');
            if (footer) {
                footer.querySelectorAll('button').forEach(function (btn) {
                    var label = (btn.textContent || '').toLowerCase();
                    if (label.indexOf('print') >= 0) btn.id = 'po-details-print-btn';
                    if (label.indexOf('edit') >= 0) btn.id = 'po-details-edit-btn';
                    if (label.indexOf('back') >= 0) btn.id = 'po-details-back-btn';
                });
                if (!document.getElementById('po-details-edit-btn')) {
                    var editBtn = document.createElement('button');
                    editBtn.type = 'button';
                    editBtn.className = 'btn-viewer-tool blue';
                    editBtn.id = 'po-details-edit-btn';
                    editBtn.textContent = 'Edit Record';
                    var backBtn = document.getElementById('po-details-back-btn');
                    footer.insertBefore(editBtn, backBtn || null);
                }
            }
        }
        if (!document.getElementById('po-print-receipt-root')) {
            var printRoot = document.createElement('div');
            printRoot.id = 'po-print-receipt-root';
            printRoot.className = 'po-print-receipt-root';
            printRoot.setAttribute('aria-hidden', 'true');
            document.body.appendChild(printRoot);
        }
        upgradeRetailerModal();
    }

    function injectPrintStyles() {
        if (document.getElementById('kreezby-po-portal-style')) return;
        var s = document.createElement('style');
        s.id = 'kreezby-po-portal-style';
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
            '.action-popup-menu{max-height:min(70vh,360px);overflow-y:auto;-webkit-overflow-scrolling:touch}' +
            '.action-popup-item.is-current{font-weight:700;color:#1565c0;background:#f3f8ff}' +
            '.po-status-link,.recv-status-link{cursor:pointer}' +
            'body[data-kreezby-portal] .retailer-module-host .panel-data-card,' +
            'body[data-kreezby-portal] .panel-data-card,body[data-kreezby-portal] .card-body-padded,' +
            'body[data-kreezby-portal] .data-display-table,body[data-kreezby-portal] table,' +
            'body[data-kreezby-portal] tbody,body[data-kreezby-portal] tr,body[data-kreezby-portal] td,' +
            '#po-retailer-directory-block,#receiving-retailer-directory-panel-view{overflow:visible!important}' +
            '.po-table-scroll-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%}' +
            '.po-table-scroll-wrap table.data-display-table{min-width:720px}' +
            '@media print{body.po-printing>*:not(#po-print-receipt-root){display:none!important}' +
            '#po-print-receipt-root{display:block!important}body.po-printing #po-print-receipt-root{position:static;width:100%}}';
        document.head.appendChild(s);
    }

    function upgradeRetailerModal() {
        if (document.getElementById('po-modal-code')) return;
        var modal = document.getElementById('purchase-order-modal-node');
        if (!modal) return;
        var host = document.querySelector('.system-dashboard-wrapper');
        var area = host ? (host.getAttribute('data-area') || '') : '';
        var areaLabel = area ? area.charAt(0).toUpperCase() + area.slice(1) : 'Batangas City';
        modal.innerHTML = '<div class="form-modal-box">' +
            '<div class="modal-form-header"><h2 id="po-modal-title">Create New Purchase Order Request</h2>' +
            '<button type="button" style="background:none;border:none;font-size:16px;cursor:pointer;" id="po-modal-close-btn">✕</button></div>' +
            '<div class="modal-form-body"><form id="po-form-element" onsubmit="return false;">' +
            '<div class="form-inputs-row-grid">' +
            '<div class="form-field-unit"><label>PO Code *</label><input type="text" id="po-modal-code" readonly></div>' +
            '<div class="form-field-unit"><label>Date Created *</label><input type="datetime-local" id="po-modal-date" required></div>' +
            '<div class="form-field-unit"><label>Area *</label><select id="po-modal-area" required><option value="' + areaLabel + '">' + areaLabel + '</option></select></div>' +
            '<div class="form-field-unit"><label>Retailer / Entity *</label><input type="text" id="po-modal-entity" required readonly></div>' +
            '<div class="form-field-unit" style="display:none;"><select id="po-modal-type"><option value="retailer">retailer</option><option value="wholesaler">wholesaler</option></select></div>' +
            '<div class="form-field-unit"><label>Status *</label><select id="po-modal-status"><option value="pending">Pending</option></select></div>' +
            '</div>' +
            '<div class="item-builder-sub-header"><span>■</span> Item Form</div>' +
            '<div class="item-entry-builder-bar">' +
            '<div class="form-field-unit"><label>Flavor</label><select id="builder-flavor-picker">' +
            '<option value="">Please select a flavor</option>' +
            '<option value="Chocolate" data-rate="50.00">Chocolate</option>' +
            '<option value="Lemon" data-rate="45.00">Lemon</option>' +
            '<option value="Choco Almond" data-rate="55.00">Choco Almond</option></select></div>' +
            '<div class="form-field-unit"><label>Unit</label><input type="text" id="builder-unit-input" value="PCS"></div>' +
            '<div class="form-field-unit"><label>Qty</label><input type="number" id="builder-qty-input" min="1"></div>' +
            '<button type="button" class="btn-call-to-action" style="background:#00897b;" id="po-modal-add-item-btn">Add Item +</button></div>' +
            '<table class="data-display-table" style="margin-bottom:20px;"><thead><tr style="background:#1a237e;color:#fff;">' +
            '<th>#</th><th>Item</th><th>Unit</th><th>Qty</th><th>Cost</th><th>Total</th><th>Action</th></tr></thead>' +
            '<tbody id="po-modal-items-injector"></tbody>' +
            '<tfoot><tr style="font-weight:bold;background:#f5f5f5;"><td colspan="5" style="text-align:right;">Grand Total</td>' +
            '<td id="po-modal-grand-total" colspan="2">0.00</td></tr></tfoot></table>' +
            '<div class="form-field-unit"><label>Remarks</label><textarea id="po-modal-remarks" style="width:100%;height:60px;"></textarea></div>' +
            '</form></div>' +
            '<div class="modal-action-footer-panel">' +
            '<button type="button" class="btn-modal-cancel" id="po-modal-cancel-btn">Cancel</button>' +
            '<button type="button" class="btn-modal-save" id="po-modal-save-btn">Submit P.O Request</button></div></div>';
        document.getElementById('po-modal-entity').value = retailerStoreName;
    }

    function loadData() {
        applyPortalSeed();
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            PO_ORDERS = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_ORDERS));
        } catch (e) {
            PO_ORDERS = JSON.parse(JSON.stringify(DEFAULT_ORDERS));
        }
        Object.keys(PO_ORDERS).forEach(function (code) {
            var order = PO_ORDERS[code];
            if (!order) return;
            if (order.statusClass === 'received' || order.statusClass === 'partial') {
                order.statusClass = 'pending';
                order.status = order.entityType === 'customer' ? 'PROCESSING' : 'PENDING';
            }
        });
    }

    function saveData() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(PO_ORDERS)); } catch (e) {}
    }

    function formatMoney(n) {
        return Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function orderTotal(order) {
        return (order.items || []).reduce(function (s, it) { return s + (Number(it.total) || 0); }, 0);
    }

    function recalcItem(item) {
        item.qty = Number(item.qty) || 0;
        item.cost = Number(item.cost) || 0;
        item.total = item.qty * item.cost;
        return item;
    }

    var TRADE_STATUSES = [
        { class: 'pending', label: 'Pending', value: 'PENDING' },
        { class: 'packed', label: 'Packed', value: 'PACKED' },
        { class: 'ready-for-dispatch', label: 'Ready for Dispatch', value: 'READY FOR DISPATCH' },
        { class: 'out-for-delivery', label: 'Out for Delivery', value: 'OUT FOR DELIVERY' },
        { class: 'completed', label: 'Delivered', value: 'DELIVERED' }
    ];

    var CUSTOMER_STATUSES = [
        { class: 'pending', label: 'Processing', value: 'PROCESSING' },
        { class: 'shipped', label: 'Shipped', value: 'SHIPPED' },
        { class: 'completed', label: 'Completed', value: 'COMPLETED' }
    ];

    var PORTAL_TRADE_STATUSES = [
        { class: 'pending', label: 'Pending', value: 'PENDING' }
    ];

    function statusListForOrder(order) {
        if (PAGE_MODE === 'retailer') return PORTAL_TRADE_STATUSES.slice();
        if (order && order.entityType === 'customer') return CUSTOMER_STATUSES.slice();
        return TRADE_STATUSES.slice();
    }

    function lookupStatus(list, statusClass) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].class === statusClass) return list[i];
        }
        return null;
    }

    function statusMeta(statusClass, entityType) {
        if (statusClass === 'received' || statusClass === 'partial') {
            statusClass = 'pending';
        }
        var primary = entityType === 'customer' ? CUSTOMER_STATUSES : TRADE_STATUSES;
        return lookupStatus(primary, statusClass)
            || lookupStatus(TRADE_STATUSES, statusClass)
            || lookupStatus(CUSTOMER_STATUSES, statusClass)
            || lookupStatus(PORTAL_TRADE_STATUSES, statusClass)
            || primary[0];
    }

    function displayStatus(order) {
        if (!order) return 'Pending';
        return statusMeta(order.statusClass, order.entityType).label;
    }

    function toDatetimeLocal(str) {
        if (!str) return '';
        return str.replace(' ', 'T').slice(0, 16);
    }

    function fromDatetimeLocal(str) {
        if (!str) return '';
        return str.replace('T', ' ').slice(0, 16);
    }

    function nowDatetimeLocal() {
        var d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    function nowDisplay() {
        return new Date().toLocaleString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true, year: 'numeric', month: 'short', day: 'numeric' });
    }

    function generateNextCode(entityType) {
        var prefix = 'PO-';
        if (entityType === 'customer') prefix = 'PO-C';
        else if (entityType === 'wholesaler') prefix = 'WPO-';
        var max = 0;
        Object.keys(PO_ORDERS).forEach(function (k) {
            var o = PO_ORDERS[k];
            if (entityType === 'customer' && o.entityType !== 'customer') return;
            if (entityType === 'wholesaler' && o.entityType !== 'wholesaler') return;
            if (entityType !== 'customer' && entityType !== 'wholesaler' && (o.entityType === 'customer' || o.entityType === 'wholesaler')) return;
            var num = parseInt(String(o.code).replace(/\D/g, ''), 10) || 0;
            if (num > max) max = num;
        });
        var next = String(max + 1).padStart(4, '0');
        return prefix + next;
    }

    function showToast(message) {
        var msg = document.createElement('div');
        msg.textContent = message;
        msg.className = 'po-toast-notice';
        document.body.appendChild(msg);
        setTimeout(function () { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 2200);
    }

    function ordersByType(type) {
        return Object.keys(PO_ORDERS).map(function (k) { return PO_ORDERS[k]; }).filter(function (o) {
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

    function buildStatusActionItems(poCode, order) {
        var currentClass = order ? (order.statusClass || 'pending') : 'pending';
        if (order && (currentClass === 'received' || currentClass === 'partial')) {
            currentClass = 'pending';
        }
        var list = statusListForOrder(order);
        if (order && !lookupStatus(list, currentClass) && currentClass !== 'received' && currentClass !== 'partial') {
            list.push(statusMeta(currentClass, order.entityType));
        }
        return list.map(function (s) {
            var current = s.class === currentClass ? ' is-current' : '';
            return '<div class="action-popup-item action-popup-item-status' + current + '" data-action="set-status"' +
                ' data-status-class="' + s.class + '" data-po="' + poCode + '">' + s.label + '</div>';
        }).join('');
    }

    function buildActionMenu(poCode) {
        menuCounter += 1;
        var menuId = 'po-act-menu-' + menuCounter;
        var order = PO_ORDERS[poCode];
        return '<div class="action-menu-relative-container" data-kreezby-page-menu>' +
            '<button type="button" class="action-trigger-btn" data-menu="' + menuId + '">Action ▾</button>' +
            '<div class="action-popup-menu action-popup-menu-wide" id="' + menuId + '">' +
            '<div class="action-popup-item" data-action="view" data-po="' + poCode + '">View Details</div>' +
            '<div class="action-popup-item" data-action="edit" data-po="' + poCode + '">Edit Order</div>' +
            '<div class="action-popup-item" data-action="print" data-po="' + poCode + '">Print Receipt</div>' +
            '<div class="action-popup-divider" aria-hidden="true"></div>' +
            buildStatusActionItems(poCode, order) + '</div></div>';
    }

    function renderRetailerTable(filter) {
        var tbody = document.getElementById('retailer-orders-tbody');
        var footer = document.getElementById('retailer-orders-footer');
        if (!tbody) return;
        var q = (filter || '').toLowerCase().trim();
        var all = ordersByType('retailer');
        var rows = all.filter(function (o) {
            if (!q) return true;
            return [o.code, o.dateCreated, o.entity, o.status, o.remarks, SUPPLIER_LABEL].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        if (PAGE_MODE === 'retailer') {
            tbody.innerHTML = rows.map(function (o, i) {
                return '<tr data-po="' + o.code + '" class="po-data-row">' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td>' + o.dateCreated + '</td>' +
                    '<td><a href="#" class="po-code-link" data-po="' + o.code + '">' + o.code + '</a></td>' +
                    '<td>' + buildActionMenu(o.code) + '</td>' +
                    '<td>' + SUPPLIER_LABEL + '</td>' +
                    '<td>' + (o.items ? o.items.length : 0) + '</td>' +
                    '<td><span class="status-pill-badge ' + (o.statusClass || 'pending') + ' po-status-link" data-po="' + o.code + '">' + displayStatus(o) + '</span></td></tr>';
            }).join('');
            return;
        }
        tbody.innerHTML = rows.map(function (o, i) {
            return '<tr data-po="' + o.code + '" class="po-data-row">' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + o.dateCreated + '</td>' +
                '<td><a href="#" class="po-code-link" data-po="' + o.code + '">' + o.code + '</a></td>' +
                '<td>' + o.entity + '</td>' +
                '<td><span class="status-pill-badge ' + (o.statusClass || 'pending') + ' po-status-link" data-po="' + o.code + '">' + displayStatus(o) + '</span></td>' +
                '<td>' + buildActionMenu(o.code) + '</td></tr>';
        }).join('');
        if (footer) footer.textContent = 'Showing ' + rows.length + ' of ' + all.length + ' entries — sorted newest first (by date & PO code)';
    }

    function renderCustomerTable(filter) {
        var tbody = document.getElementById('customer-orders-tbody');
        var footer = document.getElementById('customer-orders-footer');
        if (!tbody) return;
        var q = (filter || '').toLowerCase().trim();
        var all = ordersByType('customer');
        var rows = all.filter(function (o) {
            if (!q) return true;
            return [o.code, o.dateCreated, o.entity, o.status].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        tbody.innerHTML = rows.map(function (o, i) {
            return '<tr data-po="' + o.code + '" class="po-data-row">' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + o.dateCreated + '</td>' +
                '<td><a href="#" class="po-code-link" data-po="' + o.code + '">' + o.code + '</a></td>' +
                '<td>' + (o.items ? o.items.length : 0) + '</td>' +
                '<td><span class="status-pill-badge ' + (o.statusClass || 'pending') + '">' + displayStatus(o) + '</span></td>' +
                '<td>' + buildActionMenu(o.code) + '</td></tr>';
        }).join('');
        if (footer) footer.textContent = 'Showing ' + rows.length + ' of ' + all.length + ' entries — sorted newest first (by date & PO code)';
    }

    function renderDetailsView(order) {
        var total = orderTotal(order);
        var itemsHtml = (order.items || []).map(function (it) {
            return '<tr>' +
                '<td>' + formatMoney(it.qty) + '</td>' +
                '<td>' + it.unit + '</td>' +
                '<td><strong>' + it.name + '</strong>' + (it.note ? '<br><small style="color:#666;">' + it.note + '</small>' : '') + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.cost) + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.total) + '</td></tr>';
        }).join('');
        if (!itemsHtml) itemsHtml = '<tr><td colspan="5" style="text-align:center;color:#888;">No items on this order.</td></tr>';
        var tracking = order.trackingNumber ? ('<div class="meta-data-line"><strong>Tracking Number:</strong> ' + order.trackingNumber + '</div>') : '<div class="meta-data-line"><strong>Tracking Number:</strong> Not set</div>';
        var courier = order.courier ? ('<div class="meta-data-line"><strong>Courier:</strong> ' + order.courier + '</div>') : '';

        return '<div class="details-container-view">' +
            '<div class="details-header-meta-block">' +
            '<div>' +
            '<div class="meta-data-line"><strong>P.O. Code:</strong> ' + order.code + '</div>' +
            '<div class="meta-data-line"><strong>Date Created:</strong> ' + order.dateCreated + '</div>' +
            '<div class="meta-data-line"><strong>Area:</strong> ' + (order.area || '—') + '</div>' +
            '<div class="meta-data-line"><strong>Remarks:</strong> ' + (order.remarks || '—') + '</div>' +
            tracking +
            courier +
            '</div><div>' +
            '<div class="meta-data-line"><strong>Entity:</strong> ' + order.entity + '</div>' +
            '<div class="meta-data-line"><strong>Status:</strong> <span class="status-pill-badge ' + (order.statusClass || 'pending') + '" style="font-size:11px;">' + displayStatus(order) + '</span></div>' +
            '</div></div>' +
            '<div class="viewer-table-title">Orders Matrix Breakdown</div>' +
            '<table class="data-display-table"><thead><tr style="background:#1a237e;color:#fff;">' +
            '<th>Qty</th><th>Unit</th><th>Item</th><th style="text-align:right;">Cost</th><th style="text-align:right;">Total</th>' +
            '</tr></thead><tbody>' + itemsHtml + '</tbody>' +
            '<tfoot>' +
            '<tr style="font-weight:bold;background:#f5f5f5;"><td colspan="4" style="text-align:right;">Sub Total</td><td style="text-align:right;">' + formatMoney(total) + '</td></tr>' +
            '<tr style="font-weight:bold;background:#eee;"><td colspan="4" style="text-align:right;">Grand Total</td><td style="text-align:right;">' + formatMoney(total) + '</td></tr>' +
            '</tfoot></table>' +
            '<div class="details-dynamic-footer-status">Verification: ' + displayStatus(order) + '</div></div>';
    }

    function openDetails(poCode) {
        var order = PO_ORDERS[poCode];
        if (!order) { showToast('Order not found.'); return; }
        currentPoCode = poCode;
        document.getElementById(masterBlockId()).style.display = 'none';
        document.getElementById(detailsBlockId()).style.display = 'block';
        document.getElementById('po-details-title').textContent = 'Purchase Order Details - ' + poCode;
        document.getElementById('po-details-content').innerHTML = renderDetailsView(order);
        showToast('View ready for ' + poCode + '.');
    }

    function backToList() {
        document.getElementById(detailsBlockId()).style.display = 'none';
        document.getElementById(masterBlockId()).style.display = 'block';
        currentPoCode = null;
    }

    function refreshTables() {
        var rs = document.getElementById('retailer-search');
        renderRetailerTable(rs ? rs.value : '');
        if (PAGE_MODE !== 'retailer') {
            var cs = document.getElementById('customer-search');
            renderCustomerTable(cs ? cs.value : '');
        }
    }

    function applyStatus(poCode, statusClass) {
        var order = PO_ORDERS[poCode];
        if (!order) return;
        var meta = statusMeta(statusClass, order.entityType);
        order.statusClass = meta.class;
        order.status = meta.value;
        saveData();
        syncCustomerOrderFromPo(order);
        refreshTables();
        if (currentPoCode === poCode) openDetails(poCode);
        showToast(poCode + ' set to ' + meta.label + '.');
    }

    function persistTrackingNotice(order, trackingNumber, courierName) {
        if (!order) return;
        if (trackingNumber) {
            order.trackingNumber = trackingNumber.trim();
        }
        if (courierName) {
            order.courier = courierName.trim();
        }
        if (!order.courier) {
            order.courier = 'J&T Express Philippines';
        }
        saveData();
        syncCustomerOrderFromPo(order);
    }

    function syncCustomerOrderFromPo(order) {
        if (!order || order.entityType !== 'customer') return;
        var existing = [];
        try {
            existing = JSON.parse(localStorage.getItem('kreezbyOrders') || '[]');
        } catch (e) {
            existing = [];
        }
        var statusText = statusMeta(order.statusClass, 'customer').label;
        if (order.statusClass === 'picked-up' || order.statusClass === 'out-for-delivery') statusText = 'Shipped';
        var orderNumber = order.code || 'PO-CUSTOMER';
        var mapped = {
            orderNumber: orderNumber,
            poCode: order.code,
            poEntity: order.entity,
            items: {},
            subtotal: orderTotal(order),
            deliveryFee: 0,
            total: '₱' + Number(orderTotal(order)).toFixed(2),
            paymentMethod: 'cash_on_delivery',
            shippingInfo: {
                fullName: order.entity,
                phone: '',
                address: order.area || '',
                notes: order.remarks || ''
            },
            status: statusText,
            trackingNumber: order.trackingNumber || '',
            carrier: order.courier || 'J&T Express Philippines',
            staffNotes: order.remarks || '',
            date: new Date().toISOString(),
            statusUpdatedAt: new Date().toISOString(),
            shippedAt: (statusText === 'Shipped' && order.trackingNumber) ? new Date().toISOString() : undefined,
            paymentVerified: true,
            source: 'po-admin'
        };

        (order.items || []).forEach(function (item, index) {
            mapped.items['po-item-' + index] = {
                name: item.name,
                cost: Number(item.cost) || 0,
                qty: Number(item.qty) || 1
            };
        });

        var filtered = existing.filter(function (entry) {
            return !(entry.poCode === order.code || entry.orderNumber === order.code);
        });
        filtered.push(mapped);
        localStorage.setItem('kreezbyOrders', JSON.stringify(filtered));
    }

    /* ---- Modal ---- */
    function openModal() {
        document.getElementById('purchase-order-modal-node').classList.add('modal-triggered');
    }

    function closeModal() {
        document.getElementById('purchase-order-modal-node').classList.remove('modal-triggered');
        editingPoCode = null;
    }

    function recalcModalTotals() {
        var total = 0;
        document.querySelectorAll('#po-modal-items-injector tr').forEach(function (tr) {
            var qty = parseFloat(tr.querySelector('.mod-qty').value) || 0;
            var cost = parseFloat(tr.querySelector('.mod-cost').value) || 0;
            var line = qty * cost;
            total += line;
            tr.querySelector('.mod-total').textContent = formatMoney(line);
        });
        var gt = document.getElementById('po-modal-grand-total');
        if (gt) gt.textContent = formatMoney(total);
    }

    function addModalItemRow(item) {
        item = item || { name: '', unit: 'PCS', qty: 1, cost: 0 };
        var tbody = document.getElementById('po-modal-items-injector');
        var idx = tbody.children.length + 1;
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + idx + '</td>' +
            '<td><input class="mod-name" value="' + (item.name || '') + '"></td>' +
            '<td><input class="mod-unit" value="' + (item.unit || 'PCS') + '"></td>' +
            '<td><input class="mod-qty" type="number" step="0.01" value="' + (item.qty || 1) + '"></td>' +
            '<td><input class="mod-cost" type="number" step="0.01" value="' + (item.cost || 0) + '"></td>' +
            '<td class="mod-total">0.00</td>' +
            '<td><span class="trash-action-icon mod-del">🗑</span></td>';
        tbody.appendChild(tr);
        tr.querySelectorAll('.mod-qty, .mod-cost').forEach(function (el) { el.addEventListener('input', recalcModalTotals); });
        tr.querySelector('.mod-del').onclick = function () { tr.remove(); recalcModalTotals(); };
        recalcModalTotals();
    }

    function populateModal(order) {
        document.getElementById('po-modal-title').textContent = order ? 'Edit Purchase Order' : 'Create New Purchase Order';
        var type = order ? order.entityType : (PAGE_MODE === 'retailer'
            ? (isWholesalerPortal() ? 'wholesaler' : 'retailer')
            : (activeTab === 'customer' ? 'customer' : 'retailer'));
        var code = order ? order.code : generateNextCode(type);
        document.getElementById('po-modal-code').value = code;
        document.getElementById('po-modal-date').value = order ? toDatetimeLocal(order.dateCreated) : nowDatetimeLocal();
        document.getElementById('po-modal-area').value = order ? (order.area || '') : '';
        document.getElementById('po-modal-entity').value = order ? order.entity : (PAGE_MODE === 'retailer' ? retailerStoreName : '');
        var typeSelect = document.getElementById('po-modal-type');
        if (typeSelect) {
            if (type === 'wholesaler' && !typeSelect.querySelector('option[value="wholesaler"]')) {
                var whoOpt = document.createElement('option');
                whoOpt.value = 'wholesaler';
                whoOpt.textContent = 'Wholesaler Order';
                typeSelect.appendChild(whoOpt);
            }
            typeSelect.value = type === 'customer' ? 'customer' : (type === 'wholesaler' ? 'wholesaler' : 'retailer');
        }
        document.getElementById('po-modal-status').value = order ? (order.statusClass || 'pending') : 'pending';
        document.getElementById('po-modal-remarks').value = order ? (order.remarks || '') : '';
        document.getElementById('po-modal-tracking').value = order ? (order.trackingNumber || '') : '';
        document.getElementById('po-modal-courier').value = order ? (order.courier || 'J&T Express Philippines') : 'J&T Express Philippines';
        var tbody = document.getElementById('po-modal-items-injector');
        tbody.innerHTML = '';
        if (order && order.items && order.items.length) {
            order.items.forEach(function (it) { addModalItemRow(it); });
        } else {
            addModalItemRow({ name: 'Chocolate', unit: 'PCS', qty: 10, cost: 50 });
        }
        editingPoCode = order ? order.code : null;
    }

    function openCreateModal(tab) {
        activeTab = tab || activeTab;
        populateModal(null);
        openModal();
    }

    function openEditModal(poCode) {
        var order = poCode ? PO_ORDERS[poCode] : (currentPoCode ? PO_ORDERS[currentPoCode] : null);
        if (!order) { openCreateModal(); return; }
        populateModal(order);
        openModal();
    }

    function appendFromBuilder() {
        var sel = document.getElementById('builder-flavor-picker');
        var opt = sel.options[sel.selectedIndex];
        var name = sel.value;
        if (!name) { showToast('Pick a flavor first.'); return; }
        addModalItemRow({
            name: name,
            unit: document.getElementById('builder-unit-input').value || 'PCS',
            qty: parseFloat(document.getElementById('builder-qty-input').value) || 1,
            cost: parseFloat(opt.getAttribute('data-rate')) || 0
        });
        document.getElementById('builder-qty-input').value = '';
        sel.value = '';
    }

    function saveModal() {
        var code = document.getElementById('po-modal-code').value.trim();
        var type = (document.getElementById('po-modal-type') || {}).value || (isWholesalerPortal() ? 'wholesaler' : 'retailer');
        var statusClass = document.getElementById('po-modal-status').value;
        var trackingNumber = (document.getElementById('po-modal-tracking') || {}).value || '';
        var courierName = (document.getElementById('po-modal-courier') || {}).value || 'J&T Express Philippines';
        var items = [];
        document.querySelectorAll('#po-modal-items-injector tr').forEach(function (tr) {
            items.push(recalcItem({
                name: tr.querySelector('.mod-name').value.trim(),
                unit: tr.querySelector('.mod-unit').value.trim(),
                qty: tr.querySelector('.mod-qty').value,
                cost: tr.querySelector('.mod-cost').value,
                note: ''
            }));
        });
        if (!document.getElementById('po-modal-entity').value.trim()) {
            showToast('Entity name is required.'); return;
        }
        if (!items.length) { showToast('Add at least one item.'); return; }

        var payload = {
            code: code,
            dateCreated: fromDatetimeLocal(document.getElementById('po-modal-date').value),
            entity: document.getElementById('po-modal-entity').value.trim(),
            entityType: type,
            area: document.getElementById('po-modal-area').value,
            statusClass: statusClass,
            status: statusMeta(statusClass, type).value,
            remarks: document.getElementById('po-modal-remarks').value.trim(),
            trackingNumber: trackingNumber.trim(),
            courier: courierName.trim() || 'J&T Express Philippines',
            items: items
        };

        if (editingPoCode && editingPoCode !== code) delete PO_ORDERS[editingPoCode];
        PO_ORDERS[code] = payload;
        persistTrackingNotice(payload, payload.trackingNumber, payload.courier);
        saveData();
        closeModal();
        refreshTables();
        if (currentPoCode === editingPoCode || currentPoCode === code) openDetails(code);
        showToast('Purchase order saved: ' + code);
        document.dispatchEvent(new CustomEvent('kreezby:activity', {
            detail: {
                title: 'Purchase Order Saved',
                description: 'PO ' + code + ' was submitted',
                source: 'po'
            }
        }));
    }

    function buildPrintReceiptHtml(order) {
        var total = orderTotal(order);
        var rows = (order.items || []).map(function (it) {
            return '<tr><td>' + formatMoney(it.qty) + '</td><td>' + it.unit + '</td>' +
                '<td>' + it.name + (it.note ? ' (' + it.note + ')' : '') + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.cost) + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.total) + '</td></tr>';
        }).join('');
        return '<div class="po-receipt-sheet"><div class="po-receipt-header"><h1>Kreezby Bakeshop</h1><p>Purchase Order Receipt</p></div>' +
            '<div class="po-receipt-meta"><p><strong>P.O. Code:</strong> ' + order.code + '</p>' +
            '<p><strong>Date Created:</strong> ' + order.dateCreated + '</p>' +
            '<p><strong>Entity:</strong> ' + order.entity + '</p>' +
            '<p><strong>Status:</strong> ' + order.status + '</p>' +
            '<p><strong>Remarks:</strong> ' + (order.remarks || '') + '</p></div>' +
            '<table class="po-receipt-table"><thead><tr><th>Qty</th><th>Unit</th><th>Item</th><th>Cost</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody>' +
            '<tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Grand Total</td>' +
            '<td style="text-align:right;font-weight:bold;">' + formatMoney(total) + '</td></tr></tfoot></table>' +
            '<p class="po-receipt-verify">Verification: ' + order.status + ' — Printed ' + new Date().toLocaleString() + '</p></div>';
    }

    function printReceipt(poCode) {
        var order = PO_ORDERS[poCode];
        if (!order) return;
        var root = document.getElementById('po-print-receipt-root');
        root.innerHTML = buildPrintReceiptHtml(order);
        document.body.classList.add('po-printing');
        window.print();
        setTimeout(function () { document.body.classList.remove('po-printing'); root.innerHTML = ''; }, 500);
    }

    function switchTab(tabName) {
        var tablist = document.querySelector('.po-order-tabs');
        if (window.KreezbyTabPanels && tablist) {
            activeTab = window.KreezbyTabPanels.switch({
                tablist: tablist,
                tabName: tabName,
                prefix: 'po',
                tabBtnSelector: '.po-order-tab',
                panelSelector: '.po-tab-panel'
            }) || tabName;
            return;
        }

        activeTab = tabName;
        document.querySelectorAll('.po-order-tab').forEach(function (btn) {
            var on = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        document.querySelectorAll('.po-tab-panel').forEach(function (p) { p.classList.remove('active'); });
        var panel = document.getElementById('po-tab-' + tabName);
        if (panel) panel.classList.add('active');
    }

    function handleAction(action, poCode, statusClass) {
        closeAllMenus();
        if (action === 'view') { openDetails(poCode); return; }
        if (action === 'edit') { openEditModal(poCode); return; }
        if (action === 'print') { printReceipt(poCode); return; }
        var mapped = {
            'mark-packed': 'packed',
            'mark-ready-for-dispatch': 'ready-for-dispatch',
            'mark-shipped': 'shipped',
            'mark-picked-up': 'shipped',
            'mark-out-for-delivery': 'out-for-delivery',
            'mark-delivered': 'completed'
        };
        if (action === 'set-status' && statusClass) {
            applyStatus(poCode, statusClass);
            return;
        }
        if (mapped[action]) applyStatus(poCode, mapped[action]);
    }

    function bindEvents() {
        document.querySelectorAll('.po-order-tab').forEach(function (btn) {
            btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
        });
        var rs = document.getElementById('retailer-search');
        if (rs) rs.addEventListener('input', function () { renderRetailerTable(rs.value); });
        var cs = document.getElementById('customer-search');
        if (cs) cs.addEventListener('input', function () { renderCustomerTable(cs.value); });

        var createRetailer = document.getElementById('po-create-retailer-btn');
        if (createRetailer) createRetailer.addEventListener('click', function () { openCreateModal('retailer'); });
        var createCustomer = document.getElementById('po-create-customer-btn');
        if (createCustomer) createCustomer.addEventListener('click', function () { openCreateModal('customer'); });
        var closeBtn = document.getElementById('po-modal-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        var cancelBtn = document.getElementById('po-modal-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        var saveBtn = document.getElementById('po-modal-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', saveModal);
        var addItemBtn = document.getElementById('po-modal-add-item-btn');
        if (addItemBtn) addItemBtn.addEventListener('click', appendFromBuilder);
        var editBtn = document.getElementById('po-details-edit-btn');
        if (editBtn) editBtn.addEventListener('click', function () { openEditModal(currentPoCode); });
        var backBtn = document.getElementById('po-details-back-btn');
        if (backBtn) backBtn.addEventListener('click', backToList);
        var printBtn = document.getElementById('po-details-print-btn');
        if (printBtn) printBtn.addEventListener('click', function () { if (currentPoCode) printReceipt(currentPoCode); });

        var masterSelector = PAGE_MODE === 'retailer' ? '#po-retailer-directory-block' : '#po-master-lists-container-block';

        if (window.__kreezbyPoDocClick) {
            document.removeEventListener('click', window.__kreezbyPoDocClick, true);
        }
        window.__kreezbyPoDocClick = function (e) {
            var actionBtn = e.target.closest(masterSelector + ' .action-trigger-btn[data-menu]');
            if (actionBtn) {
                e.preventDefault(); e.stopPropagation();
                var menu = document.getElementById(actionBtn.getAttribute('data-menu'));
                if (menu) toggleActionMenu(menu, actionBtn);
                return;
            }
            var actionItem = e.target.closest('.action-popup-item[data-po]');
            if (actionItem) {
                e.preventDefault(); e.stopPropagation();
                handleAction(
                    actionItem.getAttribute('data-action'),
                    actionItem.getAttribute('data-po'),
                    actionItem.getAttribute('data-status-class')
                );
                return;
            }
            var poLink = e.target.closest('.po-code-link, .po-status-link');
            if (poLink) {
                e.preventDefault(); e.stopPropagation();
                openDetails(poLink.getAttribute('data-po'));
                return;
            }
            var row = e.target.closest('tr.po-data-row');
            if (row && !e.target.closest('.action-menu-relative-container, button, a')) {
                openDetails(row.getAttribute('data-po'));
                return;
            }
            if (!e.target.closest('.action-popup-menu') && !e.target.closest('.action-trigger-btn[data-menu]')) {
                closeAllMenus();
            }
        };
        document.addEventListener('click', window.__kreezbyPoDocClick, true);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllMenus();
        });
    }

    function stripRetiredInboundLegendPills() {
        document.querySelectorAll('.legend-container-box .status-pill-badge').forEach(function (el) {
            var t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (t === 'received' || t === 'partially received') el.parentNode.removeChild(el);
        });
    }

    function init() {
        PAGE_MODE = detectPageMode();
        if (!PAGE_MODE) return;
        if (PAGE_MODE === 'admin' && /\/staff\//i.test(window.location.pathname)) {
            document.body.setAttribute('data-kreezby-portal', 'staff-po');
        }
        setupRetailerPage();
        injectPrintStyles();
        loadData();
        refreshTables();
        bindEvents();
        stripRetiredInboundLegendPills();
    }

    window.PoAdmin = {
        openDetails: openDetails,
        printReceipt: printReceipt,
        openEditModal: openEditModal,
        openCreateModal: openCreateModal,
        closeModal: closeModal,
        backToList: backToList,
        handleAction: handleAction,
        closeMenus: closeAllMenus
    };
    window.switchToDetailsViewPane = function (c) { openDetails(c || currentPoCode); };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
