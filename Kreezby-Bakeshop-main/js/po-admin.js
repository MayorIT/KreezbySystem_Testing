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
                    editBtn.className = 'btn-viewer-tool brown';
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
        var s = document.getElementById('kreezby-po-portal-style');
        if (!s) {
            s = document.createElement('style');
            s.id = 'kreezby-po-portal-style';
        }
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
            '.action-popup-item-status.is-current{font-weight:700;color:#5d4037;background:#fff6e0}' +
            '.action-popup-menu{max-height:min(70vh,360px);overflow-y:auto;-webkit-overflow-scrolling:touch}' +
            '.action-popup-item.is-current{font-weight:700;color:#5d4037;background:#fff6e0}' +
            '.po-status-link,.recv-status-link{cursor:pointer}' +
            'body[data-kreezby-portal] .retailer-module-host .panel-data-card,' +
            'body[data-kreezby-portal] .panel-data-card,body[data-kreezby-portal] .card-body-padded,' +
            'body[data-kreezby-portal] .data-display-table,body[data-kreezby-portal] table,' +
            'body[data-kreezby-portal] tbody,body[data-kreezby-portal] tr,body[data-kreezby-portal] td,' +
            '#po-retailer-directory-block,#receiving-retailer-directory-panel-view{overflow:visible!important}' +
            '.po-table-scroll-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%}' +
            '.po-table-scroll-wrap table.data-display-table{min-width:720px}' +
            '@media print{' +
            'body.po-printing header,body.po-printing .top-navbar-node,body.po-printing .core-viewport-wrapper,' +
            'body.po-printing turbo-frame,body.po-printing #kreezby-main-content,body.po-printing main,' +
            'body.po-printing aside,body.po-printing .dark-sidebar-panel,body.po-printing .system-modal-backdrop,' +
            'body.po-printing .notification-modal-overlay,body.po-printing .kreezby-nav-scrim{display:none!important;visibility:hidden!important;height:0!important}' +
            'body.po-printing #po-print-receipt-root{display:block!important;visibility:visible!important;position:static!important;width:100%}' +
            'body.po-printing #po-print-receipt-root .po-receipt-logo{display:block!important;visibility:visible!important;height:74px!important}}';
        if (!s.parentNode) document.head.appendChild(s);
    }

    function upgradeRetailerModal() {
        if (document.getElementById('po-modal-code')) return;
        var modal = document.getElementById('purchase-order-modal-node');
        if (!modal) return;
        var host = document.querySelector('.system-dashboard-wrapper');
        var area = host ? (host.getAttribute('data-area') || '') : '';
        var areaNames = {
            batangas: 'Batangas', bauan: 'Bauan', citimart: 'Citimart', lipa: 'Lipa',
            lucena: 'Lucena', manila: 'Manila', rosario: 'Rosario', stotomas: 'Sto. Tomas',
            tagaytay: 'Tagaytay', quezoncity: 'Quezon City', iloilocity: 'Iloilo City'
        };
        var areaLabel = areaNames[area] || (area ? area.charAt(0).toUpperCase() + area.slice(1) : 'Batangas City');
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
            '<table class="data-display-table" style="margin-bottom:20px;"><thead><tr style="background:#5d4037;color:#fff;">' +
            '<th>#</th><th>Item</th><th>Unit</th><th>Qty</th><th>Cost</th><th>Total</th><th>Action</th></tr></thead>' +
            '<tbody id="po-modal-items-injector"></tbody>' +
            '<tfoot><tr style="font-weight:bold;background:#f5f5f5;"><td colspan="5" style="text-align:right;">Grand Total</td>' +
            '<td id="po-modal-grand-total" colspan="2">0.00</td></tr></tfoot></table>' +
            '<div class="form-field-unit"><label for="po-modal-payment">Mode of payment</label><select id="po-modal-payment">' +
            '<option value="gcash">GCash</option><option value="check">Check</option><option value="cash">Cash</option></select></div>' +
            '<div class="form-field-unit" id="po-modal-gcash-wrap"><p style="margin:0 0 8px;color:#374151;">Send the total to the bakeshop GCash <strong>0917 800 1650</strong>. Paste the reference below so we can verify the payment.</p>' +
            '<label for="po-modal-gcash-ref">GCash reference number</label>' +
            '<input type="text" id="po-modal-gcash-ref" inputmode="numeric" maxlength="20" placeholder="From the GCash receipt"></div>' +
            '<div class="form-field-unit" id="po-modal-check-wrap" style="display:none;"><label for="po-modal-check-no">Check number</label>' +
            '<input type="text" id="po-modal-check-no" placeholder="Check number"></div>' +
            '<div class="form-field-unit"><label>Remarks</label><textarea id="po-modal-remarks" style="width:100%;height:60px;"></textarea></div>' +
            '</form></div>' +
            '<div class="modal-action-footer-panel">' +
            '<button type="button" class="btn-modal-cancel" id="po-modal-cancel-btn">Cancel</button>' +
            '<button type="button" class="btn-modal-save" id="po-modal-save-btn">Submit P.O Request</button></div></div>';
        document.getElementById('po-modal-entity').value = retailerStoreName;
        var typeSelect = document.getElementById('po-modal-type');
        if (typeSelect && isWholesalerPortal()) typeSelect.value = 'wholesaler';
        var paySelect = document.getElementById('po-modal-payment');
        if (paySelect) paySelect.addEventListener('change', togglePaymentExtras);
        togglePaymentExtras();
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

    function formatQty(n) {
        var num = Number(n || 0);
        if (!isFinite(num)) return '0';
        if (Math.abs(num - Math.round(num)) < 0.001) return String(Math.round(num));
        return formatMoney(num);
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
            verifyPaymentActionItem(poCode, order) +
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
            return [o.code, o.dateCreated, o.entity, o.status, o.remarks, o.paymentMethod, o.gcashReference, o.checkNumber, SUPPLIER_LABEL].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        if (PAGE_MODE === 'retailer') {
            tbody.innerHTML = rows.map(function (o, i) {
                return '<tr data-po="' + o.code + '" class="po-data-row">' +
                    '<td data-label="#">' + (i + 1) + '</td>' +
                    '<td data-label="Date">' + o.dateCreated + '</td>' +
                    '<td data-label="PO Code"><a href="#" class="po-code-link" data-po="' + o.code + '">' + o.code + '</a></td>' +
                    '<td data-label="Action">' + buildActionMenu(o.code) + '</td>' +
                    '<td data-label="Supplier">' + SUPPLIER_LABEL + '</td>' +
                    '<td data-label="Items">' + (o.items ? o.items.length : 0) + '</td>' +
                    '<td data-label="Status"><span class="status-pill-badge ' + (o.statusClass || 'pending') + ' po-status-link" data-po="' + o.code + '">' + displayStatus(o) + '</span>' + paymentListNote(o) + '</td></tr>';
            }).join('');
            return;
        }
        tbody.innerHTML = rows.map(function (o, i) {
            return '<tr data-po="' + o.code + '" class="po-data-row">' +
                '<td data-label="#">' + (i + 1) + '</td>' +
                '<td data-label="Date">' + o.dateCreated + '</td>' +
                '<td data-label="PO Code"><a href="#" class="po-code-link" data-po="' + o.code + '">' + o.code + '</a></td>' +
                '<td data-label="Account">' + o.entity + '<br><small>' + (o.accountType || (o.entityType === 'wholesaler' ? 'Wholesaler' : o.entityType === 'customer' ? 'Regular Customer' : 'Retailer')) + (o.accountArea || o.area ? ' · ' + (o.accountArea || o.area) : '') + '</small></td>' +
                '<td data-label="Status"><span class="status-pill-badge ' + (o.statusClass || 'pending') + ' po-status-link" data-po="' + o.code + '">' + displayStatus(o) + '</span>' + paymentListNote(o) + '</td>' +
                '<td data-label="Action">' + buildActionMenu(o.code) + '</td></tr>';
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
            return [o.code, o.dateCreated, o.entity, o.status, o.gcashReference, o.shopOrderNumber].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        tbody.innerHTML = rows.map(function (o, i) {
            var payLine = paymentListNote(o);
            return '<tr data-po="' + o.code + '" class="po-data-row">' +
                '<td data-label="#">' + (i + 1) + '</td>' +
                '<td data-label="Date">' + o.dateCreated + '</td>' +
                '<td data-label="PO Code"><a href="#" class="po-code-link" data-po="' + o.code + '">' + o.code + '</a></td>' +
                '<td data-label="Items">' + (o.items ? o.items.length : 0) + '</td>' +
                '<td data-label="Status"><span class="status-pill-badge ' + (o.statusClass || 'pending') + '">' + displayStatus(o) + '</span>' + payLine + '</td>' +
                '<td data-label="Action">' + buildActionMenu(o.code) + '</td></tr>';
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
            '<div class="meta-data-line"><strong>Customer type:</strong> ' + (order.accountType || (order.entityType === 'wholesaler' ? 'Wholesaler' : order.entityType === 'customer' ? 'Regular Customer' : 'Retailer')) + '</div>' +
            '<div class="meta-data-line"><strong>Account:</strong> ' + (order.accountName || order.entity) + '</div>' +
            '<div class="meta-data-line"><strong>Area:</strong> ' + (order.accountArea || order.area || '—') + '</div>' +
            '<div class="meta-data-line"><strong>Remarks:</strong> ' + (order.remarks || '—') + '</div>' +
            tracking +
            courier +
            '</div><div>' +
            '<div class="meta-data-line"><strong>Entity:</strong> ' + order.entity + '</div>' +
            '<div class="meta-data-line"><strong>Status:</strong> <span class="status-pill-badge ' + (order.statusClass || 'pending') + '" style="font-size:11px;">' + displayStatus(order) + '</span></div>' +
            '</div></div>' +
            '<div class="viewer-table-title">Orders Matrix Breakdown</div>' +
            '<table class="data-display-table"><thead><tr style="background:#5d4037;color:#fff;">' +
            '<th>Qty</th><th>Unit</th><th>Item</th><th style="text-align:right;">Cost</th><th style="text-align:right;">Total</th>' +
            '</tr></thead><tbody>' + itemsHtml + '</tbody>' +
            '<tfoot>' +
            '<tr style="font-weight:bold;background:#f5f5f5;"><td colspan="4" style="text-align:right;">Sub Total</td><td style="text-align:right;">' + formatMoney(total) + '</td></tr>' +
            '<tr style="font-weight:bold;background:#eee;"><td colspan="4" style="text-align:right;">Grand Total</td><td style="text-align:right;">' + formatMoney(total) + '</td></tr>' +
            '</tfoot></table>' +
            '<div class="details-dynamic-footer-status">Verification: ' + displayStatus(order) + '</div>' +
            gcashVerificationBlock(order) + '</div>';
    }

    function formatGcashNumber(raw) {
        var digits = String(raw || '09178001650').replace(/\D/g, '');
        if (digits.length === 11) return digits.slice(0, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7);
        return digits || '0917 800 1650';
    }

    function linkedShopOrder(order) {
        if (!order) return null;
        var code = String(order.code || '');
        var shopNumber = String(order.shopOrderNumber || '');
        var found = null;
        try {
            var list = JSON.parse(localStorage.getItem('kreezbyOrders') || '[]');
            if (!Array.isArray(list)) return null;
            list.forEach(function (entry) {
                if (found || !entry) return;
                if (entry.poCode === code || entry.orderNumber === code || entry.orderNumber === shopNumber) found = entry;
            });
        } catch (e) { /* ignore */ }
        return found;
    }

    function normalizePayMethod(raw) {
        var key = String(raw || '').toLowerCase().replace(/[\s-]+/g, '_');
        if (key === 'cod' || key === 'cashondelivery' || key === 'cash_on_delivery') return 'cash_on_delivery';
        if (key === 'cheque') return 'check';
        return key;
    }

    function payMethodTitle(method) {
        if (method === 'gcash') return 'GCash';
        if (method === 'cash_on_delivery') return 'Cash on delivery';
        if (method === 'check') return 'Check';
        if (method === 'cash') return 'Cash';
        return method ? paymentMethodLabel(method) : '';
    }

    function customerPaymentSnapshot(order) {
        var shop = linkedShopOrder(order);
        var method = normalizePayMethod((order && order.paymentMethod) || (shop && shop.paymentMethod) || '');
        var reference = String((order && order.gcashReference) || (shop && shop.gcashReference) || '');
        var checkNumber = String((order && (order.checkNumber || order.chequeNumber)) || (shop && shop.checkNumber) || '');
        var paidTo = String((order && order.gcashPaidTo) || (shop && shop.gcashPaidTo) || '09178001650');
        var failed = (order && (order.paymentStatus === 'failed' || order.paymentFailed === true))
            || (shop && (shop.paymentStatus === 'failed' || shop.paymentFailed === true));
        var verified = false;
        if (failed) verified = false;
        else if (order && order.paymentVerified === true) verified = true;
        else if (order && order.paymentVerified === false) verified = false;
        else verified = !!(shop && shop.paymentVerified === true);
        var known = method === 'gcash' || method === 'cash_on_delivery' || method === 'check' || method === 'cash';
        return {
            method: known ? method : '',
            reference: reference,
            checkNumber: checkNumber,
            paidTo: paidTo,
            verified: verified,
            failed: !!failed,
            label: payMethodTitle(known ? method : ''),
            isGcash: method === 'gcash'
        };
    }

    function isTradeOrder(order) {
        return !!(order && order.entityType && order.entityType !== 'customer');
    }

    function paymentListNote(order) {
        var pay = customerPaymentSnapshot(order);
        var trade = isTradeOrder(order);
        if (!pay.method && !trade) return '';
        var detail = pay.method ? pay.label : 'Payment';
        if (pay.method === 'gcash' && pay.reference) detail += ' ' + pay.reference;
        if (pay.method === 'check' && pay.checkNumber) detail += ' ' + pay.checkNumber;
        var state = pay.failed ? ' · failed transaction' : (pay.verified ? ' · verified' : ' · to verify');
        return '<br><small>' + escHtml(detail) + state + '</small>';
    }

    function verifyPaymentActionItem(poCode, order) {
        if (PAGE_MODE === 'retailer') return '';
        var pay = customerPaymentSnapshot(order);
        var trade = isTradeOrder(order);
        if (pay.verified || pay.failed) return '';
        if (!pay.method && !trade) return '';
        var label = trade ? 'To verify' : 'Verify payment';
        return '<div class="action-popup-item" data-action="verify-payment" data-po="' + poCode + '">' + label + '</div>' +
            (pay.method === 'gcash'
                ? '<div class="action-popup-item" data-action="fail-payment" data-po="' + poCode + '">Payment not received</div>'
                : '');
    }

    function gcashVerificationBlock(order) {
        var pay = customerPaymentSnapshot(order);
        var trade = isTradeOrder(order);
        if (!pay.method && !trade) return '';
        var statusLabel = pay.failed ? 'Failed transaction' : (pay.verified ? 'Verified' : (trade ? 'To verify' : 'Awaiting verification'));
        var lines = '<div class="meta-data-line"><strong>Method:</strong> ' + escHtml(pay.label || 'Not recorded yet') + '</div>';
        if (pay.method === 'gcash') {
            lines += '<div class="meta-data-line"><strong>Paid to:</strong> ' + escHtml(formatGcashNumber(pay.paidTo)) + ' (Kreezby Bakeshop)</div>' +
                '<div class="meta-data-line"><strong>Reference number:</strong> ' + escHtml(pay.reference || 'Not submitted') + '</div>';
        } else if (pay.method === 'check') {
            lines += '<div class="meta-data-line"><strong>Check number:</strong> ' + escHtml(pay.checkNumber || 'Not submitted') + '</div>';
        } else if (pay.method === 'cash_on_delivery') {
            lines += '<div class="meta-data-line"><strong>Collect:</strong> Cash when the order is delivered</div>';
        } else if (pay.method === 'cash') {
            lines += '<div class="meta-data-line"><strong>Collect:</strong> Cash at the shop</div>';
        }
        var action = '';
        if (!pay.verified && !pay.failed && PAGE_MODE !== 'retailer') {
            action = '<button type="button" class="btn-call-to-action" id="payment-verify-btn" style="margin-top:12px;">' + (trade ? 'To verify' : 'Verify payment') + '</button>';
            if (pay.method === 'gcash') {
                action += '<button type="button" class="btn-call-to-action" id="payment-fail-btn" style="margin-top:12px;margin-left:8px;background:#b42318;">Payment not received</button>';
            }
        }
        return '<div class="gcash-verify-card" style="margin-top:18px;padding:16px;border:1px solid #dbe7f5;border-radius:12px;background:#f7fbff;">' +
            '<div class="viewer-table-title" style="margin-top:0;">Payment</div>' +
            lines +
            '<div class="meta-data-line"><strong>Payment check:</strong> ' + statusLabel + '</div>' +
            action + '</div>';
    }

    function markGcashVerified(poCode) {
        var order = PO_ORDERS[poCode];
        if (!order) return;
        var pay = customerPaymentSnapshot(order);
        if (pay.method) order.paymentMethod = pay.method;
        order.paymentVerified = true;
        order.paymentStatus = 'verified';
        saveData();
        var existing = [];
        try { existing = JSON.parse(localStorage.getItem('kreezbyOrders') || '[]'); } catch (e) { existing = []; }
        if (!Array.isArray(existing)) existing = [];
        existing.forEach(function (entry) {
            if (!entry) return;
            if (entry.poCode === order.code || entry.orderNumber === order.code || entry.orderNumber === order.shopOrderNumber) {
                entry.paymentVerified = true;
                entry.paymentStatus = 'verified';
                if (order.gcashReference) entry.gcashReference = order.gcashReference;
                if (order.paymentMethod) entry.paymentMethod = order.paymentMethod;
            }
        });
        try { localStorage.setItem('kreezbyOrders', JSON.stringify(existing)); } catch (e) {}
        if (currentPoCode === poCode) openDetails(poCode);
        refreshTables();
        showToast((pay.label || 'Payment') + ' verified for ' + poCode + '.');
    }

    function notifyPaymentFailed(order) {
        var name = order.accountName || order.entity || 'Customer';
        var code = order.shopOrderNumber || order.code || 'this order';
        var ref = order.gcashReference ? ' Reference ' + order.gcashReference + ' was not found.' : '';
        var description = 'Hi ' + name + ', we did not receive the GCash payment for ' + code + '.' + ref +
            ' This is a failed transaction. Please send the payment again to 0917 800 1650 and submit the new reference number.';
        var note = {
            id: 'n-pay-fail-' + code + '-' + Date.now(),
            title: 'GCash payment not received',
            description: description,
            timestamp: new Date().toISOString(),
            read: false,
            source: 'payment'
        };
        if (window.KreezbyNotifications && typeof window.KreezbyNotifications.push === 'function') {
            window.KreezbyNotifications.push(note);
            return;
        }
        var list = [];
        try { list = JSON.parse(localStorage.getItem('kreezbyNotifications') || '[]'); } catch (e) { list = []; }
        if (!Array.isArray(list)) list = [];
        list.unshift(note);
        try { localStorage.setItem('kreezbyNotifications', JSON.stringify(list)); } catch (e) {}
    }

    function markGcashFailed(poCode) {
        var order = PO_ORDERS[poCode];
        if (!order) return;
        var pay = customerPaymentSnapshot(order);
        if (pay.method !== 'gcash' || pay.failed) return;
        order.paymentMethod = 'gcash';
        order.paymentVerified = false;
        order.paymentFailed = true;
        order.paymentStatus = 'failed';
        if (!order.gcashReference && pay.reference) order.gcashReference = pay.reference;
        saveData();
        var existing = [];
        try { existing = JSON.parse(localStorage.getItem('kreezbyOrders') || '[]'); } catch (e) { existing = []; }
        if (!Array.isArray(existing)) existing = [];
        existing.forEach(function (entry) {
            if (!entry) return;
            if (entry.poCode === order.code || entry.orderNumber === order.code || entry.orderNumber === order.shopOrderNumber) {
                entry.paymentVerified = false;
                entry.paymentFailed = true;
                entry.paymentStatus = 'failed';
                entry.paymentMethod = 'gcash';
            }
        });
        try { localStorage.setItem('kreezbyOrders', JSON.stringify(existing)); } catch (e) {}
        notifyPaymentFailed(order);
        if (currentPoCode === poCode) openDetails(poCode);
        refreshTables();
        showToast('GCash payment marked as a failed transaction. ' + (order.entity || 'The customer') + ' has been notified.');
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
        var prior = null;
        existing.forEach(function (entry) {
            if (!entry || prior) return;
            if (entry.poCode === order.code || entry.orderNumber === order.code || entry.orderNumber === order.shopOrderNumber) prior = entry;
        });
        var statusText = statusMeta(order.statusClass, 'customer').label;
        if (order.statusClass === 'picked-up' || order.statusClass === 'out-for-delivery') statusText = 'Shipped';
        var orderNumber = (prior && prior.orderNumber) || order.shopOrderNumber || order.code || 'PO-CUSTOMER';
        var paymentFailed = order.paymentStatus === 'failed' || order.paymentFailed === true;
        var paymentVerified = !paymentFailed && (order.paymentVerified === true || (order.paymentVerified !== false && prior && prior.paymentVerified === true));
        var mapped = {
            orderNumber: orderNumber,
            poCode: order.code,
            poEntity: order.entity,
            items: {},
            subtotal: orderTotal(order),
            deliveryFee: prior && prior.deliveryFee ? prior.deliveryFee : 0,
            total: prior && prior.total ? prior.total : ('₱' + Number(orderTotal(order)).toFixed(2)),
            paymentMethod: order.paymentMethod || (prior && prior.paymentMethod) || 'cash_on_delivery',
            gcashReference: order.gcashReference || (prior && prior.gcashReference) || '',
            gcashPaidTo: order.gcashPaidTo || (prior && prior.gcashPaidTo) || '',
            paymentStatus: paymentFailed ? 'failed' : (order.paymentStatus || (paymentVerified ? 'verified' : (prior && prior.paymentStatus) || '')),
            paymentFailed: paymentFailed,
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
            paymentVerified: paymentVerified,
            source: 'po-admin',
            accountType: order.accountType || (order.entityType === 'wholesaler' ? 'Wholesaler' : order.entityType === 'customer' ? 'Regular Customer' : 'Retailer'),
            accountName: order.accountName || order.entity || '',
            accountArea: order.accountArea || order.area || ''
        };

        (order.items || []).forEach(function (item, index) {
            mapped.items['po-item-' + index] = {
                name: item.name,
                cost: Number(item.cost) || 0,
                qty: Number(item.qty) || 1
            };
        });

        var filtered = existing.filter(function (entry) {
            if (!entry) return false;
            return !(entry.poCode === order.code || entry.orderNumber === order.code || entry.orderNumber === order.shopOrderNumber || entry.orderNumber === orderNumber);
        });
        filtered.push(mapped);
        localStorage.setItem('kreezbyOrders', JSON.stringify(filtered));
    }

    /* ---- Modal ---- */
    function poModalNode() {
        return document.getElementById('purchase-order-modal-node');
    }

    function openModal() {
        var modal = poModalNode();
        if (!modal) return;
        modal.classList.add('modal-triggered');
    }

    function closeModal() {
        var modal = poModalNode();
        if (modal) modal.classList.remove('modal-triggered');
        editingPoCode = null;
    }

    function ensureSelectValue(id, value) {
        var el = document.getElementById(id);
        if (!el) return;
        var next = value || '';
        if (next) {
            var exists = false;
            Array.prototype.forEach.call(el.options || [], function (opt) {
                if (opt.value === next) exists = true;
            });
            if (!exists) {
                var opt = document.createElement('option');
                opt.value = next;
                opt.textContent = next;
                el.appendChild(opt);
            }
        }
        el.value = next;
    }

    function mountPoModal() {
        var nodes = Array.prototype.slice.call(document.querySelectorAll('[id="purchase-order-modal-node"]'));
        if (!isAdminPoDocument() && PAGE_MODE !== 'retailer') {
            nodes.forEach(function (node) { node.remove(); });
            return null;
        }
        var fresh = null;
        nodes.forEach(function (node) {
            if (node.closest && node.closest('#kreezby-main-content')) fresh = node;
        });
        if (!fresh) fresh = nodes[0] || null;
        nodes.forEach(function (node) {
            if (node !== fresh) node.remove();
        });
        if (fresh && fresh.parentNode !== document.body) document.body.appendChild(fresh);
        return fresh;
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

    function setField(id, value) {
        var el = document.getElementById(id);
        if (el) el.value = value;
    }

    function paymentChoicesFor(type) {
        if (type === 'customer') {
            return [
                { value: 'gcash', label: 'GCash' },
                { value: 'cash_on_delivery', label: 'Cash on delivery' }
            ];
        }
        return [
            { value: 'gcash', label: 'GCash' },
            { value: 'check', label: 'Check' },
            { value: 'cash', label: 'Cash' }
        ];
    }

    function storedPayValue(order, type) {
        var raw = order ? (order.paymentMethod || lookupOrderPayment(order) || '') : '';
        var key = normalizePayMethod(raw);
        if (type === 'customer') {
            if (key === 'cash_on_delivery' || key === 'cash') return 'cash_on_delivery';
            return 'gcash';
        }
        if (key === 'gcash' || key === 'check' || key === 'cash') return key;
        return 'cash';
    }

    function ensureGcashReferenceField() {
        if (document.getElementById('po-modal-gcash-ref')) return;
        var pay = document.getElementById('po-modal-payment');
        if (!pay || !pay.parentNode) return;
        var wrap = document.createElement('div');
        wrap.className = 'form-field-unit';
        wrap.id = 'po-modal-gcash-wrap';
        wrap.innerHTML = '<p style="margin:0 0 8px;color:#374151;">Send the total to the bakeshop GCash <strong>0917 800 1650</strong>. Paste the reference below so we can verify the payment.</p>' +
            '<label for="po-modal-gcash-ref">GCash reference number</label>' +
            '<input type="text" id="po-modal-gcash-ref" inputmode="numeric" maxlength="20" placeholder="From the GCash receipt">';
        var checkInput = document.getElementById('po-modal-check-no');
        var checkWrap = checkInput ? checkInput.parentNode : null;
        if (checkWrap && checkWrap.parentNode) {
            if (!checkWrap.id) checkWrap.id = 'po-modal-check-wrap';
            checkWrap.parentNode.insertBefore(wrap, checkWrap);
        } else if (pay.parentNode.parentNode) {
            pay.parentNode.parentNode.appendChild(wrap);
        }
    }

    function fillPaymentOptions(type, selected) {
        var paySelect = document.getElementById('po-modal-payment');
        if (!paySelect) return;
        var choices = paymentChoicesFor(type);
        paySelect.innerHTML = choices.map(function (choice) {
            return '<option value="' + choice.value + '">' + choice.label + '</option>';
        }).join('');
        var allowed = choices.some(function (choice) { return choice.value === selected; });
        paySelect.value = allowed ? selected : choices[0].value;
        togglePaymentExtras();
    }

    function togglePaymentExtras() {
        var method = (document.getElementById('po-modal-payment') || {}).value || '';
        var gcashWrap = document.getElementById('po-modal-gcash-wrap');
        var checkInput = document.getElementById('po-modal-check-no');
        var checkWrap = document.getElementById('po-modal-check-wrap') || (checkInput ? checkInput.parentNode : null);
        if (checkWrap && !checkWrap.id) checkWrap.id = 'po-modal-check-wrap';
        if (gcashWrap) gcashWrap.style.display = method === 'gcash' ? '' : 'none';
        if (checkWrap) checkWrap.style.display = method === 'check' ? '' : 'none';
    }

    function readModalPaymentMethod(type) {
        var value = (document.getElementById('po-modal-payment') || {}).value || '';
        if (paymentChoicesFor(type).some(function (choice) { return choice.value === value; })) return value;
        return type === 'customer' ? 'gcash' : 'cash';
    }

    function applyModalPaymentProof(payload, type) {
        var method = readModalPaymentMethod(type);
        var gcashRef = String((document.getElementById('po-modal-gcash-ref') || {}).value || '').replace(/\s+/g, '');
        var checkNo = String((document.getElementById('po-modal-check-no') || {}).value || '').trim();
        if (method === 'gcash' && !/^\d{8,20}$/.test(gcashRef)) {
            showToast('Enter the 8 to 20 digit GCash reference number.');
            return false;
        }
        if (method === 'check' && !checkNo) {
            showToast('Enter the check number.');
            return false;
        }
        var previous = editingPoCode ? PO_ORDERS[editingPoCode] : null;
        var sameProof = previous && previous.paymentMethod === method &&
            (method !== 'gcash' || String(previous.gcashReference || '') === gcashRef) &&
            (method !== 'check' || String(previous.checkNumber || '') === checkNo);
        payload.paymentMethod = method;
        payload.gcashReference = method === 'gcash' ? gcashRef : '';
        payload.gcashPaidTo = method === 'gcash' ? '09178001650' : '';
        payload.checkNumber = method === 'check' ? checkNo : '';
        payload.paymentVerified = !!(sameProof && previous.paymentVerified === true);
        payload.paymentStatus = payload.paymentVerified ? 'verified' : 'pending';
        return true;
    }

    function populateModal(order) {
        if (!poModalNode()) return;
        var editing = !!order;
        document.getElementById('po-modal-title').textContent = editing ? 'Edit Purchase Order' : 'Create New Purchase Order';
        var kicker = document.getElementById('po-modal-kicker');
        if (kicker) kicker.textContent = editing ? 'Update this order' : 'New order';
        var saveBtn = document.getElementById('po-modal-save-btn');
        if (saveBtn) saveBtn.textContent = editing ? 'Update Purchase Order' : 'Save Purchase Order';
        var modal = document.getElementById('purchase-order-modal-node');
        if (modal) modal.setAttribute('data-po-mode', editing ? 'edit' : 'create');
        var type = order ? order.entityType : (PAGE_MODE === 'retailer'
            ? (isWholesalerPortal() ? 'wholesaler' : 'retailer')
            : (activeTab === 'customer' ? 'customer' : 'retailer'));
        var code = order ? order.code : generateNextCode(type);
        document.getElementById('po-modal-code').value = code;
        document.getElementById('po-modal-date').value = order ? toDatetimeLocal(order.dateCreated) : nowDatetimeLocal();
        ensureSelectValue('po-modal-area', order ? (order.area || '') : '');
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
        setField('po-modal-status', order ? (order.statusClass || 'pending') : 'pending');
        setField('po-modal-remarks', order ? (order.remarks || '') : '');
        setField('po-modal-tracking', order ? (order.trackingNumber || '') : '');
        setField('po-modal-courier', order ? (order.courier || 'J&T Express Philippines') : 'J&T Express Philippines');
        ensureGcashReferenceField();
        fillPaymentOptions(type, storedPayValue(order, type));
        setField('po-modal-gcash-ref', order ? (order.gcashReference || '') : '');
        setField('po-modal-check-no', order ? (order.checkNumber || order.chequeNumber || '') : '');
        togglePaymentExtras();
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
        mountPoModal();
        populateModal(null);
        openModal();
    }

    function openEditModal(poCode) {
        mountPoModal();
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
        var statusEl = document.getElementById('po-modal-status');
        var statusClass = (statusEl && statusEl.value) || 'pending';
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
            paymentMethod: readModalPaymentMethod(type),
            gcashReference: '',
            gcashPaidTo: '',
            checkNumber: '',
            paymentVerified: false,
            paymentStatus: 'pending',
            items: items
        };
        if (!applyModalPaymentProof(payload, type)) return;

        if (PAGE_MODE === 'retailer') {
            payload.entity = retailerStoreName || payload.entity;
            payload.entityType = isWholesalerPortal() ? 'wholesaler' : 'retailer';
            payload.accountType = isWholesalerPortal() ? 'Wholesaler' : 'Retailer';
            payload.accountName = payload.entity;
            payload.accountArea = payload.area;
        } else if (type === 'customer') {
            payload.accountType = 'Regular Customer';
            payload.accountName = payload.entity;
            payload.accountArea = payload.area;
        }

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

    function escHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function intToWords(n) {
        var ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        var tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        function under100(x) {
            if (x < 20) return ones[x];
            return tens[Math.floor(x / 10)] + (x % 10 ? '-' + ones[x % 10] : '');
        }
        function under1000(x) {
            if (x < 100) return under100(x);
            var rest = x % 100;
            return ones[Math.floor(x / 100)] + ' hundred' + (rest ? ' ' + under100(rest) : '');
        }
        if (!n) return 'zero';
        var parts = [];
        var millions = Math.floor(n / 1000000);
        var thousands = Math.floor((n % 1000000) / 1000);
        var rest = n % 1000;
        if (millions) parts.push(under1000(millions) + ' million');
        if (thousands) parts.push(under1000(thousands) + ' thousand');
        if (rest) parts.push(under1000(rest));
        return parts.join(' ');
    }

    function amountInWords(amount) {
        var n = Math.round(Number(amount || 0) * 100) / 100;
        if (!isFinite(n) || n < 0) n = 0;
        var pesos = Math.floor(n);
        var cents = Math.round((n - pesos) * 100);
        if (cents === 100) { pesos += 1; cents = 0; }
        var phrase = intToWords(pesos) + (pesos === 1 ? ' peso' : ' pesos');
        if (cents) phrase += ' and ' + intToWords(cents) + (cents === 1 ? ' centavo' : ' centavos');
        else phrase += ' only';
        return phrase.charAt(0).toUpperCase() + phrase.slice(1);
    }

    function orderKindLabel(order) {
        if (!order) return 'Retailer order';
        if (order.entityType === 'customer') return 'Customer order';
        if (order.entityType === 'wholesaler') return 'Wholesaler order';
        return 'Retailer order';
    }

    function formatReceiptWhen(str) {
        if (!str) return '';
        var d = new Date(String(str).replace(' ', 'T'));
        if (isNaN(d.getTime())) return String(str);
        return d.toLocaleString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    }

    function kreezbyLogoSrc() {
        var img = document.querySelector('.brand-logo-panel img, .top-navbar-node img');
        if (img && img.src) return img.src;
        return poAssetRoot() + 'assets/logo/kreezby-logo.png';
    }

    function lookupOrderPayment(order) {
        if (!order) return '';
        if (order.paymentMethod) return order.paymentMethod;
        if (order.payment) return order.payment;
        var code = String(order.code || '');
        var found = '';
        ['kreezbyOrders', 'kreezbyCustomerReceipts'].forEach(function (key) {
            if (found) return;
            var list = [];
            try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { list = []; }
            if (!Array.isArray(list)) return;
            list.forEach(function (entry) {
                if (found || !entry) return;
                if (entry.poCode === code || entry.orderNumber === code || entry.receiptNumber === code) {
                    found = entry.paymentMethod || '';
                }
            });
        });
        return found;
    }

    function paymentMethodLabel(raw) {
        var key = String(raw || '').toLowerCase().replace(/[\s_-]+/g, '');
        var labels = {
            gcash: 'GCash',
            cashondelivery: 'Cash on delivery',
            cod: 'Cash on delivery',
            maya: 'Maya',
            mayabank: 'Maya',
            metrobank: 'Metrobank',
            cash: 'Cash',
            cashondelivery: 'Cash on delivery',
            cod: 'Cash on delivery',
            creditcard: 'Credit card',
            card: 'Credit card',
            check: 'Check',
            cheque: 'Check'
        };
        return labels[key] || String(raw || '').trim();
    }

    function receiptPayMarks(order) {
        var raw = lookupOrderPayment(order);
        var method = String(raw || '').toLowerCase().replace(/[\s_-]+/g, '');
        var marks = { cash: false, card: false, check: false, other: false, otherText: '', checkNo: '' };
        if (!method && order && order.entityType !== 'customer') {
            method = 'onaccount';
            raw = 'on_account';
        }
        if (!method) return marks;
        if (method === 'cash' || method === 'cashondelivery' || method === 'cod') {
            marks.cash = true;
        } else if (method === 'creditcard' || method === 'credit' || method === 'card' || method === 'debit' || method === 'debitcard') {
            marks.card = true;
        } else if (method === 'check' || method === 'cheque') {
            marks.check = true;
            marks.checkNo = String((order && (order.checkNumber || order.chequeNumber)) || '');
        } else if (method === 'onaccount' || method === 'account' || method === 'charge') {
            marks.other = true;
            marks.otherText = 'On account';
        } else {
            marks.other = true;
            marks.otherText = paymentMethodLabel(raw);
        }
        return marks;
    }

    function receiptBox(on) {
        return '<span class="po-receipt-box' + (on ? ' is-on' : '') + '">' + (on ? 'X' : '') + '</span>';
    }

    function buildPrintReceiptHtml(order) {
        var subtotal = orderTotal(order);
        var tax = Number(order.tax) || 0;
        var total = subtotal + tax;
        var filled = (order.items || []).map(function (it) {
            var note = it.note ? ' — ' + escHtml(it.note) : '';
            return '<tr><td class="qty">' + escHtml(formatQty(it.qty)) + '</td>' +
                '<td>' + escHtml(it.name || '') + note + '</td>' +
                '<td class="money">' + escHtml(formatMoney(it.cost)) + '</td>' +
                '<td class="money">' + escHtml(formatMoney(it.total)) + '</td></tr>';
        });
        var blank = '<tr><td></td><td></td><td></td><td></td></tr>';
        while (filled.length < 5) filled.push(blank);
        var pay = receiptPayMarks(order);
        return '<article class="po-receipt-sheet">' +
            '<img class="po-receipt-logo" src="' + escHtml(kreezbyLogoSrc()) + '" alt="Kreezby Bakeshop">' +
            '<hr class="po-receipt-rule">' +
            '<h1 class="po-receipt-title">Sales Receipt</h1>' +
            '<hr class="po-receipt-rule">' +
            '<p class="po-receipt-date">Date: <span>' + escHtml(formatReceiptWhen(order.dateCreated)) + '</span></p>' +
            '<p class="po-receipt-sold">Sold to: <span>' + escHtml(order.entity || '') + '</span>' +
            '<span class="po-receipt-no">No. ' + escHtml(order.code || '') + '</span></p>' +
            '<table class="po-receipt-table"><thead><tr>' +
            '<th>Qty.</th><th>Description</th><th>Price</th><th>Amount</th>' +
            '</tr></thead><tbody>' + filled.join('') + '</tbody></table>' +
            '<table class="po-receipt-sum"><tbody>' +
            '<tr><th>Subtotal:</th><td>' + escHtml(formatMoney(subtotal)) + '</td></tr>' +
            '<tr><th>Tax:</th><td>' + escHtml(formatMoney(tax)) + '</td></tr>' +
            '<tr><th>Total:</th><td>' + escHtml(formatMoney(total)) + '</td></tr>' +
            '</tbody></table>' +
            '<div class="po-receipt-pay"><p>Sale Made with:</p>' +
            '<p>' + receiptBox(pay.cash) + ' Cash</p>' +
            '<p>' + receiptBox(pay.card) + ' Credit Card</p>' +
            '<p>' + receiptBox(pay.check) + ' Check, No. <span class="po-receipt-line">' + escHtml(pay.checkNo) + '</span></p>' +
            '<p>' + receiptBox(pay.other) + ' Other <span class="po-receipt-line">' + escHtml(pay.otherText) + '</span></p></div>' +
            (customerPaymentSnapshot(order).reference ? '<p class="po-receipt-date">GCash ref: <span>' + escHtml(customerPaymentSnapshot(order).reference) + '</span></p>' : '') +
            '<p class="po-receipt-foot">Owner\'s copy</p>' +
            '</article>';
    }

    function ensurePrintRoot() {
        var root = document.getElementById('po-print-receipt-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'po-print-receipt-root';
            root.className = 'po-print-receipt-root';
            root.setAttribute('aria-hidden', 'true');
        }
        if (root.parentNode !== document.body) document.body.appendChild(root);
        return root;
    }

    function finishPrint(root) {
        document.body.classList.remove('po-printing');
        if (root) root.innerHTML = '';
        window.removeEventListener('afterprint', window.__kreezbyPoAfterPrint);
        window.__kreezbyPoAfterPrint = null;
    }

    function receiptPrintCss() {
        return '@page{size:A4 portrait;margin:12mm}' +
            'html,body{margin:0;padding:0;background:#fff;color:#111}' +
            'body{font-family:"Times New Roman",Times,serif}' +
            '.po-receipt-sheet{width:auto;margin:0;padding:0;background:#fff;color:#111;border:none}' +
            '.po-receipt-logo{display:block;visibility:visible;height:74px;width:auto;max-width:260px;margin:0 auto 6px;object-fit:contain}' +
            '.po-receipt-rule{border:none;border-top:1px solid #111;margin:0}' +
            '.po-receipt-title{margin:4px 0;color:#111;font-size:16px;font-weight:700;letter-spacing:.22em;text-align:center;text-transform:uppercase}' +
            '.po-receipt-date,.po-receipt-sold{margin:8px 0 0;font-size:13px}' +
            '.po-receipt-date span,.po-receipt-sold span{display:inline-block;min-width:180px;margin-left:8px;border-bottom:1px solid #111;font-weight:700}' +
            '.po-receipt-sold{display:flex;justify-content:space-between;align-items:baseline;gap:16px}' +
            '.po-receipt-no{min-width:140px;margin-left:auto;text-align:right}' +
            '.po-receipt-table,.po-receipt-sum{width:100%;border-collapse:collapse}' +
            '.po-receipt-table{margin-top:10px}' +
            '.po-receipt-table th,.po-receipt-table td,.po-receipt-sum th,.po-receipt-sum td{border:1px solid #111;background:#fff;color:#111;font-size:12px;font-weight:400;text-align:left}' +
            '.po-receipt-table th{padding:6px 8px;font-weight:700;text-align:center}' +
            '.po-receipt-table td{height:18px;padding:2px 6px}' +
            '.po-receipt-table .qty{width:64px;text-align:center}' +
            '.po-receipt-table .money,.po-receipt-table th:nth-child(3),.po-receipt-table th:nth-child(4){width:90px;text-align:right}' +
            '.po-receipt-sum{width:240px;margin:0 0 0 auto}' +
            '.po-receipt-sum th,.po-receipt-sum td{padding:6px 8px;font-weight:700;text-align:right}' +
            '.po-receipt-pay{clear:both;margin-top:10px;font-size:13px}' +
            '.po-receipt-pay p{margin:3px 0}' +
            '.po-receipt-box{display:inline-block;width:16px;height:16px;margin-right:8px;border:1.5px solid #111;vertical-align:-2px;text-align:center;line-height:14px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#111;background:#fff}' +
            '.po-receipt-line{display:inline-block;min-width:140px;border-bottom:1px solid #111}' +
            '.po-receipt-foot{margin:18px 0 0;font-size:12px;text-align:center}';
    }

    function printReceipt(poCode) {
        var order = PO_ORDERS[poCode];
        if (!order) return;
        var frame = document.getElementById('po-print-frame');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = 'po-print-frame';
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;left:0;top:-10000px;width:210mm;height:297mm;border:0;';
            document.body.appendChild(frame);
        }
        var doc = frame.contentWindow.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sales Receipt</title><style>' +
            receiptPrintCss() + '</style></head><body>' + buildPrintReceiptHtml(order) + '</body></html>');
        doc.close();
        var win = frame.contentWindow;
        var logo = doc.querySelector('.po-receipt-logo');
        var go = function () {
            win.focus();
            win.print();
        };
        if (logo && !logo.complete) {
            logo.addEventListener('load', function () { setTimeout(go, 40); }, { once: true });
            logo.addEventListener('error', function () { setTimeout(go, 40); }, { once: true });
        } else {
            setTimeout(go, 80);
        }
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
        if (action === 'verify-payment') { markGcashVerified(poCode); return; }
        if (action === 'fail-payment') { markGcashFailed(poCode); return; }
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
        mountPoModal();
        document.querySelectorAll('.po-order-tab').forEach(function (btn) {
            btn.addEventListener('click', function () { switchTab(btn.getAttribute('data-tab')); });
        });
        var rs = document.getElementById('retailer-search');
        if (rs) rs.addEventListener('input', function () { renderRetailerTable(rs.value); });
        var cs = document.getElementById('customer-search');
        if (cs) cs.addEventListener('input', function () { renderCustomerTable(cs.value); });

        var typeSelect = document.getElementById('po-modal-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', function () {
                fillPaymentOptions(typeSelect.value, (document.getElementById('po-modal-payment') || {}).value);
            });
        }
        var paySelect = document.getElementById('po-modal-payment');
        if (paySelect) paySelect.addEventListener('change', togglePaymentExtras);
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
        var detailsContent = document.getElementById('po-details-content');
        if (detailsContent) {
            detailsContent.addEventListener('click', function (event) {
                var verify = event.target && event.target.closest ? event.target.closest('#payment-verify-btn, #gcash-verify-btn') : null;
                var fail = event.target && event.target.closest ? event.target.closest('#payment-fail-btn') : null;
                if (!currentPoCode) return;
                if (fail) { markGcashFailed(currentPoCode); return; }
                if (!verify) return;
                markGcashVerified(currentPoCode);
            });
        }

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

        if (window.__kreezbyPoKeydown) {
            document.removeEventListener('keydown', window.__kreezbyPoKeydown);
        }
        window.__kreezbyPoKeydown = function (e) {
            if (e.key === 'Escape') {
                closeAllMenus();
                closeModal();
            }
        };
        document.addEventListener('keydown', window.__kreezbyPoKeydown);
    }

    function stripRetiredInboundLegendPills() {
        document.querySelectorAll('.legend-container-box .status-pill-badge').forEach(function (el) {
            var t = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (t === 'received' || t === 'partially received') el.parentNode.removeChild(el);
        });
    }

    function poAssetRoot() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        var match = path.match(/\/(admin|staff|staff_names|admin_names)\//i);
        if (!match) return '../';
        var after = path.slice(path.indexOf(match[0]) + match[0].length);
        var depth = after.split('/').filter(Boolean).length || 1;
        var prefix = '';
        for (var i = 0; i < depth; i++) prefix += '../';
        return prefix;
    }

    function isAdminPoDocument() {
        var page = (location.pathname.split('/').pop() || '').toLowerCase();
        return page === 'po-admin.html' || page === 'po-headadmin.html' || page === 'po-staff.html';
    }

    function poStylesheet(id, href) {
        var file = href.split('/').pop().split('?')[0];
        var link = document.getElementById(id);
        if (!link) {
            link = document.querySelector('link[rel="stylesheet"][href*="' + file + '"]');
            if (link) link.id = id;
        }
        if (!link) {
            link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = href;
            link.setAttribute('data-po-owned', '1');
            document.head.appendChild(link);
            return link;
        }
        link.disabled = false;
        return link;
    }

    function releaseOwnedPoSheets() {
        document.querySelectorAll('link[data-po-owned="1"]').forEach(function (link) {
            link.disabled = true;
        });
    }

    function applyAdminPoTheme() {
        if (!isAdminPoDocument()) {
            document.body.classList.remove('po-admin-page');
            releaseOwnedPoSheets();
            return;
        }
        document.body.classList.add('po-admin-page');
        var root = poAssetRoot();
        poStylesheet('kreezby-po-admin-css', root + 'css/pages/admin/po-admin.css');
        poStylesheet('kreezby-po-tabs-css', root + 'css/shared/order-tabbed-layout.css');
        poStylesheet('kreezby-po-expand-css', root + 'css/shared/expandable-nav-tabs.css');
        var theme = poStylesheet('po-theme-sheet', root + 'css/pages/admin/po-theme.css?v=20260927slip');
        if (theme) {
            theme.href = root + 'css/pages/admin/po-theme.css?v=20260927slip';
            document.head.appendChild(theme);
        }
    }

    function bindPoThemeLock() {
        if (window.__kreezbyPoThemeBound) return;
        window.__kreezbyPoThemeBound = true;
        document.addEventListener('turbo:frame-load', function (event) {
            if (!event.target || event.target.id !== 'kreezby-main-content') return;
            applyAdminPoTheme();
            if (!isAdminPoDocument()) {
                document.querySelectorAll('[id="purchase-order-modal-node"]').forEach(function (node) {
                    node.remove();
                });
            }
        });
    }

    function init() {
        bindPoThemeLock();
        applyAdminPoTheme();
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
