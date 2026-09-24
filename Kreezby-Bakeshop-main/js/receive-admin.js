/**
 * Receiving admin — list view, details, edit modals (localStorage).
 */
(function () {
    'use strict';

    if (window.__KreezbyReceiveAdminBooted) return;
    window.__KreezbyReceiveAdminBooted = true;

    var STORAGE_KEY = 'kreezby-recv-receipts-v1';

    var DEFAULT_RECEIPTS = {
        'recv-102': {
            id: 'recv-102', supplier: 'Supplier 102', sourceType: 'Supplier', dateReceived: '2024-05-20 10:30',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Awaiting Delivery',
            poOrigin: 'PO-0002', reference: '', subTotal: 30250,
            lineItems: [
                { qty: 100, unit: 'Boxes', name: 'Item 102', note: 'Sample only', cost: 200, total: 20000 },
                { qty: 205, unit: 'pcs', name: 'Item 104', note: 'Sample only', cost: 50, total: 10250 }
            ]
        },
        'recv-101': {
            id: 'recv-101', supplier: 'Retailer 101', sourceType: 'Retailer', dateReceived: '2024-05-18 14:15',
            type: 'Returned Order', status: 'PENDING', statusClass: 'pending', remarks: 'Awaiting Delivery',
            poOrigin: 'PO-0001', reference: '', subTotal: 45200,
            lineItems: [
                { qty: 100, unit: 'Boxes', name: 'Item 101', note: 'Standard batch', cost: 150, total: 15000 },
                { qty: 120, unit: 'Boxes', name: 'Item 103', note: 'Restock', cost: 180, total: 21600 },
                { qty: 43, unit: 'pcs', name: 'Item 105', note: 'Add-on units', cost: 200, total: 8600 }
            ]
        },
        'recv-103': {
            id: 'recv-103', supplier: 'Customer 301', sourceType: 'Customer', dateReceived: '2024-05-15 09:05',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Awaiting Delivery',
            poOrigin: 'PO-0003', reference: '', subTotal: 12500,
            lineItems: [{ qty: 50, unit: 'Boxes', name: 'Item 106', note: 'Full delivery', cost: 250, total: 12500 }]
        },
        'recv-105': {
            id: 'recv-105', supplier: 'Metro Bulk Distributors', sourceType: 'Wholesaler', dateReceived: '2024-05-12 11:45',
            type: 'Supply', status: 'PENDING', statusClass: 'pending', remarks: 'Awaiting Delivery',
            poOrigin: 'PO-0005', reference: '', subTotal: 0, lineItems: []
        },
        'recv-104': {
            id: 'recv-104', supplier: 'Supplier 104', sourceType: 'Supplier', dateReceived: '2024-05-10 16:20',
            type: 'Returned Order', status: 'PENDING', statusClass: 'pending', remarks: 'Awaiting Delivery',
            poOrigin: 'PO-0004', reference: '', subTotal: 18750,
            lineItems: [
                { qty: 75, unit: 'Boxes', name: 'Item 107', note: 'Partial batch', cost: 150, total: 11250 },
                { qty: 50, unit: 'pcs', name: 'Item 108', note: 'Partial batch', cost: 150, total: 7500 }
            ]
        }
    };

    var RECV_STATUSES = [
        { class: 'pending', label: 'Pending', value: 'PENDING' }
    ];

    var RECV_SOURCE_TYPES = ['Supplier', 'Retailer', 'Customer', 'Wholesaler'];

    var RECEIPTS = {};
    var currentReceiptId = null;
    var editingReceiptId = null;
    var menuCounter = 0;
    var activeReceiveSource = 'Supplier';

    var PAGE_MODE = null;
    var RETAILER_SUPPLIER = 'Kreezby Bakeshop';
    var retailerStoreName = '';

    function applyPortalSeed() {
        if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
            window.KreezbyPortalSeed.apply();
        }
    }

    function matchesPortalEntity(receipt) {
        if (PAGE_MODE !== 'retailer' || !retailerStoreName) return true;
        return receipt.entity === retailerStoreName || receipt.supplier === retailerStoreName;
    }

    function masterBlockId() {
        return PAGE_MODE === 'retailer' ? 'receiving-retailer-directory-panel-view' : 'receiving-master-directory-panel-view';
    }

    function detailsBlockId() {
        return PAGE_MODE === 'retailer' ? 'receiving-retailer-details-viewer-block' : 'receiving-details-inspector-panel-view';
    }

    function detectPageMode() {
        if (document.getElementById('receiving-retailer-directory-panel-view')) return 'retailer';
        if (document.getElementById('receiving-master-directory-panel-view')) return 'admin';
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
        document.body.setAttribute('data-kreezby-portal', 'retailer-receive');
        ensureTableScrollWrap('#receiving-retailer-directory-panel-view');
        var theadRow = document.querySelector('#receiving-retailer-directory-panel-view table thead tr');
        if (theadRow && !theadRow.getAttribute('data-kreezby-portal-head')) {
            theadRow.setAttribute('data-kreezby-portal-head', '1');
            theadRow.innerHTML = '<th>#</th><th>Date Received</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th><th>Remarks</th>';
        }
        var brand = document.querySelector('.panel-brand');
        retailerStoreName = brand ? brand.textContent.trim() : '';
        var master = document.getElementById('receiving-retailer-directory-panel-view');
        if (master) {
            var tbody = master.querySelector('table.data-display-table tbody');
            if (tbody) tbody.id = 'receiving-supplies-tbody';
            var search = master.querySelector('input[type="text"]');
            if (search) search.id = 'receiving-search';
            var createBtn = master.querySelector('.btn-call-to-action');
            if (createBtn) {
                createBtn.id = 'recv-create-btn';
                createBtn.removeAttribute('onclick');
                createBtn.type = 'button';
            }
        }
        var details = document.getElementById('receiving-retailer-details-viewer-block');
        if (details) {
            var title = details.querySelector('.panel-card-title-bar h3');
            if (title) title.id = 'receiving-details-title';
            var sheet = details.querySelector('.details-inspection-sheet, .details-container-view');
            if (sheet) sheet.id = 'receiving-details-content';
            else if (!document.getElementById('receiving-details-content')) {
                var cardBody = details.querySelector('.card-body-padded');
                if (cardBody) {
                    var content = document.createElement('div');
                    content.id = 'receiving-details-content';
                    cardBody.insertBefore(content, cardBody.firstChild);
                }
            }
            var footer = details.querySelector('.details-action-footer-row');
            if (footer) {
                footer.querySelectorAll('button').forEach(function (btn) {
                    var label = (btn.textContent || '').toLowerCase();
                    if (label.indexOf('print') >= 0) btn.id = 'recv-details-print-btn';
                    if (label.indexOf('edit') >= 0) btn.id = 'recv-details-edit-btn';
                    if (label.indexOf('back') >= 0) btn.id = 'recv-details-back-btn';
                });
                if (!document.getElementById('recv-details-edit-btn')) {
                    var editBtn = document.createElement('button');
                    editBtn.type = 'button';
                    editBtn.className = 'btn-viewer-tool blue';
                    editBtn.id = 'recv-details-edit-btn';
                    editBtn.textContent = 'Edit Summary';
                    var backBtn = document.getElementById('recv-details-back-btn');
                    footer.insertBefore(editBtn, backBtn || null);
                }
            }
        }
        if (!document.getElementById('recv-print-root')) {
            var printRoot = document.createElement('div');
            printRoot.id = 'recv-print-root';
            printRoot.className = 'recv-print-root';
            printRoot.setAttribute('aria-hidden', 'true');
            document.body.appendChild(printRoot);
        }
        upgradeRetailerModal();
    }

    function injectPrintStyles() {
        if (document.getElementById('kreezby-recv-portal-style')) return;
        var s = document.createElement('style');
        s.id = 'kreezby-recv-portal-style';
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
            '.recv-status-link{cursor:pointer}' +
            'body[data-kreezby-portal] .retailer-module-host .panel-data-card,' +
            'body[data-kreezby-portal] .panel-data-card,body[data-kreezby-portal] .card-body-padded,' +
            'body[data-kreezby-portal] .data-display-table,body[data-kreezby-portal] table,' +
            'body[data-kreezby-portal] tbody,body[data-kreezby-portal] tr,body[data-kreezby-portal] td,' +
            '#receiving-retailer-directory-panel-view,#receiving-master-directory-panel-view{overflow:visible!important}' +
            '.po-table-scroll-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;width:100%}' +
            '.po-table-scroll-wrap table.data-display-table{min-width:720px}' +
            '@media print{body.recv-printing>*:not(#recv-print-root){display:none!important}' +
            '#recv-print-root{display:block!important}body.recv-printing #recv-print-root{position:static;width:100%}}';
        document.head.appendChild(s);
    }

    function upgradeRetailerModal() {
        if (document.getElementById('recv-modal-supplier')) return;
        var modal = document.getElementById('create-received-modal-overlay');
        if (!modal) return;
        modal.innerHTML = '<div class="form-modal-box">' +
            '<div class="modal-form-header"><h2 id="recv-modal-title">Log Batch Verification</h2>' +
            '<button type="button" style="background:none;border:none;font-size:16px;cursor:pointer;" id="recv-modal-close-btn">✕</button></div>' +
            '<div class="modal-form-body"><form id="received-form-node" onsubmit="return false;">' +
            '<div class="form-inputs-row-grid">' +
            '<div class="form-field-unit"><label>Supplier *</label><input type="text" id="recv-modal-supplier" value="' + RETAILER_SUPPLIER + '" readonly required></div>' +
            '<div class="form-field-unit"><label>Date Received *</label><input type="datetime-local" id="recv-modal-date" required></div>' +
            '<div class="form-field-unit"><label>P.O. Origin</label><input type="text" id="recv-modal-po-origin" placeholder="e.g. PO-0001"></div>' +
            '<div class="form-field-unit"><label>Type *</label><select id="recv-modal-type"><option value="Supply">Supply</option><option value="Returned Order">Returned Order</option></select></div>' +
            '<div class="form-field-unit"><label>Status *</label><select id="recv-modal-status"><option value="pending">Pending</option></select></div>' +
            '<div class="form-field-unit"><label>Reference</label><input type="text" id="recv-modal-reference"></div></div>' +
            '<div class="item-builder-sub-header"><span>■</span> Items Received</div>' +
            '<div class="item-entry-builder-bar">' +
            '<div class="form-field-unit"><label>Item</label><select id="item-picker-flavor">' +
            '<option value="">Select item</option><option value="Chocolate" data-cost="50.00">Chocolate</option>' +
            '<option value="Lemon" data-cost="45.00">Lemon</option><option value="Choco-Almond" data-cost="55.00">Choco-Almond</option></select></div>' +
            '<div class="form-field-unit"><label>Unit</label><input type="text" id="item-picker-unit" value="PCS"></div>' +
            '<div class="form-field-unit"><label>Qty</label><input type="number" id="item-picker-qty" min="1"></div>' +
            '<div class="form-field-unit"><label>Unit Cost</label><input type="number" id="item-picker-cost" step="0.01"></div>' +
            '<button type="button" class="btn-call-to-action" style="background:#00897b;" id="recv-modal-add-item-btn">Add Item +</button></div>' +
            '<table class="data-display-table"><thead><tr style="background:#00796b;color:#fff;">' +
            '<th>#</th><th>Item</th><th>Unit</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Action</th></tr></thead>' +
            '<tbody id="received-modal-rows-injector"></tbody>' +
            '<tfoot><tr style="font-weight:bold;background:#e0e0e0;"><td colspan="5" style="text-align:right;">Total</td>' +
            '<td id="recv-modal-grand-total" colspan="2">0.00</td></tr></tfoot></table>' +
            '<div class="form-field-unit"><label>Remarks</label><textarea id="recv-modal-remarks" style="width:100%;height:50px;"></textarea></div>' +
            '</form></div>' +
            '<div class="modal-action-footer-panel">' +
            '<button type="button" class="btn-modal-cancel" id="recv-modal-cancel-btn">Cancel</button>' +
            '<button type="button" class="btn-modal-save" id="recv-modal-save-btn">Save Received Supply</button></div></div>';
    }

    function loadData() {
        applyPortalSeed();
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            RECEIPTS = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_RECEIPTS));
        } catch (e) {
            RECEIPTS = JSON.parse(JSON.stringify(DEFAULT_RECEIPTS));
        }
        Object.keys(RECEIPTS).forEach(function (k) {
            var receipt = RECEIPTS[k];
            if (receipt && (receipt.statusClass === 'received' || receipt.statusClass === 'partial')) {
                receipt.statusClass = 'pending';
                receipt.status = 'PENDING';
            }
            syncReceiptDerived(RECEIPTS[k]);
        });
    }

    function saveData() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(RECEIPTS)); } catch (e) {}
    }

    function formatMoney(n) {
        return Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function statusMeta(statusClass) {
        if (statusClass === 'received' || statusClass === 'partial') statusClass = 'pending';
        for (var i = 0; i < RECV_STATUSES.length; i++) {
            if (RECV_STATUSES[i].class === statusClass) return RECV_STATUSES[i];
        }
        return RECV_STATUSES[0];
    }

    function statusLabel(receipt) {
        return statusMeta(receipt.statusClass).label;
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

    function dateDisplay(str) {
        if (!str) return '';
        var d = new Date(str.replace(' ', 'T'));
        if (isNaN(d.getTime())) return str;
        return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    }

    function recalcLine(item) {
        item.qty = Number(item.qty) || 0;
        item.cost = Number(item.cost) || 0;
        item.total = item.qty * item.cost;
        return item;
    }

    function receiptTotal(receipt) {
        return (receipt.lineItems || []).reduce(function (s, it) { return s + (Number(it.total) || 0); }, 0);
    }

    function normalizeSourceType(value) {
        var normalized = String(value || 'Supplier').trim();
        return RECV_SOURCE_TYPES.indexOf(normalized) >= 0 ? normalized : 'Supplier';
    }

    function syncReceiptDerived(receipt) {
        receipt.subTotal = receiptTotal(receipt);
        receipt.items = receipt.lineItems ? receipt.lineItems.length : 0;
        receipt.dateDisplay = dateDisplay(receipt.dateReceived);
        receipt.sourceType = normalizeSourceType(receipt.sourceType);
    }

    function generateNextId() {
        var max = 0;
        Object.keys(RECEIPTS).forEach(function (k) {
            var n = parseInt(String(k).replace(/\D/g, ''), 10) || 0;
            if (n > max) max = n;
        });
        return 'recv-' + (max + 1);
    }

    function showToast(message) {
        var msg = document.createElement('div');
        msg.textContent = message;
        msg.className = 'recv-toast-notice';
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

    function buildStatusActionItems(receiptId, currentClass) {
        if (currentClass === 'received' || currentClass === 'partial') currentClass = 'pending';
        return RECV_STATUSES.map(function (s) {
            var current = s.class === currentClass ? ' is-current' : '';
            return '<div class="action-popup-item action-popup-item-status' + current + '" data-action="set-status"' +
                ' data-status-class="' + s.class + '" data-receive-id="' + receiptId + '">' + s.label + '</div>';
        }).join('');
    }

    function buildActionMenu(receiptId) {
        menuCounter += 1;
        var menuId = 'recv-act-menu-' + menuCounter;
        var receipt = RECEIPTS[receiptId];
        return '<div class="action-menu-relative-container" data-kreezby-page-menu>' +
            '<button type="button" class="action-trigger-btn" data-menu="' + menuId + '">Action ▾</button>' +
            '<div class="action-popup-menu action-popup-menu-wide" id="' + menuId + '">' +
            '<div class="action-popup-item" data-action="view" data-receive-id="' + receiptId + '">View Receiving Slip</div>' +
            '<div class="action-popup-item" data-action="edit" data-receive-id="' + receiptId + '">Edit Record</div>' +
            '<div class="action-popup-item" data-action="print" data-receive-id="' + receiptId + '">Print Batch Sheet</div>' +
            '<div class="action-popup-divider" aria-hidden="true"></div>' +
            buildStatusActionItems(receiptId, receipt ? receipt.statusClass : 'pending') +
            '</div></div>';
    }

    function currentReceiveSource() {
        var tab = document.querySelector('.recv-source-tab.active, .po-order-tab.active[data-source]');
        if (tab) return tab.getAttribute('data-source') || activeReceiveSource;
        return activeReceiveSource;
    }

    function renderTable(filter) {
        var tbody = document.getElementById('receiving-supplies-tbody');
        var footer = document.getElementById('receiving-supplies-footer');
        if (!tbody) return;
        var selectedSource = currentReceiveSource();
        var q = (filter || '').toLowerCase().trim();
        var list = Object.keys(RECEIPTS).map(function (k) { return RECEIPTS[k]; })
            .sort(function (a, b) { return b.dateReceived.localeCompare(a.dateReceived); });
        var scoped = list.filter(function (r) { return matchesPortalEntity(r); });
        var rows = scoped.filter(function (r) {
            var sourceType = normalizeSourceType(r.sourceType);
            if (PAGE_MODE !== 'retailer' && sourceType !== selectedSource) return false;
            if (!q) return true;
            return [r.supplier, r.entity, sourceType, r.dateReceived, r.status, r.remarks, r.poOrigin].join(' ').toLowerCase().indexOf(q) >= 0;
        });
        tbody.innerHTML = rows.map(function (r, i) {
            var typeLabel = r.type || 'Supply';
            var sourceType = normalizeSourceType(r.sourceType);
            if (PAGE_MODE === 'retailer') {
                return '<tr data-receive-id="' + r.id + '" class="recv-data-row">' +
                    '<td>' + (i + 1) + '</td>' +
                    '<td>' + r.dateReceived + '</td>' +
                    '<td>' + buildActionMenu(r.id) + '</td>' +
                    '<td><strong>' + r.supplier + '</strong></td>' +
                    '<td>' + r.items + '</td>' +
                    '<td><span class="status-pill-badge ' + r.statusClass + ' recv-status-link" data-receive-id="' + r.id + '">' + statusLabel(r) + '</span></td>' +
                    '<td>' + r.remarks + '</td></tr>';
            }
            return '<tr data-receive-id="' + r.id + '" class="recv-data-row">' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + r.dateReceived + '</td>' +
                '<td><strong>' + r.supplier + '</strong></td>' +
                '<td>' + sourceType + '</td>' +
                '<td>' + typeLabel + '</td>' +
                '<td>' + r.items + '</td>' +
                '<td><span class="status-pill-badge ' + r.statusClass + ' recv-status-link" data-receive-id="' + r.id + '">' + statusLabel(r) + '</span></td>' +
                '<td>' + r.remarks + '</td>' +
                '<td>' + buildActionMenu(r.id) + '</td></tr>';
        }).join('');
        if (footer) footer.textContent = 'Showing ' + rows.length + ' of ' + scoped.length + ' entries — sorted newest first (by date received)';
    }

    function renderDetailsView(receipt) {
        function renderItemTable(items, title) {
            var rowsHtml = (items || []).map(function (it) {
                return '<tr>' +
                    '<td>' + formatMoney(it.qty) + '</td>' +
                    '<td>' + it.unit + '</td>' +
                    '<td><strong>' + it.name + '</strong>' + (it.note ? '<br><small style="color:#666;">' + it.note + '</small>' : '') + '</td>' +
                    '<td style="text-align:right;">' + formatMoney(it.cost) + '</td>' +
                    '<td style="text-align:right;">' + formatMoney(it.total) + '</td></tr>';
            }).join('');
            if (!rowsHtml) rowsHtml = '<tr><td colspan="5" style="text-align:center;color:#888;">No items in this section.</td></tr>';
            var total = (items || []).reduce(function (sum, it) { return sum + (Number(it.total) || 0); }, 0);
            return '<div style="margin-top:18px;">' +
                '<div style="font-size:15px;font-weight:700;margin-bottom:10px;color:#1a237e;">■ ' + title + '</div>' +
                '<table class="data-display-table"><thead><tr style="background:#1a237e;color:white;">' +
                '<th>Qty</th><th>Unit</th><th>Item</th><th style="text-align:right;">Unit Cost</th><th style="text-align:right;">Total</th>' +
                '</tr></thead><tbody>' + rowsHtml + '</tbody>' +
                '<tfoot><tr style="background:#f5f5f5;font-weight:bold;">' +
                '<td colspan="4" style="text-align:right;">Section Total</td>' +
                '<td style="text-align:right;">₱' + formatMoney(total) + '</td>' +
                '</tr></tfoot></table></div>';
        }

        var type = receipt.type || 'Supply';
        var supplyItems = [];
        var returnedItems = [];
        (receipt.lineItems || []).forEach(function (it) {
            if ((it.type || type) === 'Returned Order') returnedItems.push(it);
            else supplyItems.push(it);
        });

        return '<div class="details-container-view">' +
            '<div class="details-header-meta-block">' +
            '<div>' +
            '<div class="meta-data-line"><strong>Supplier / Entity:</strong> ' + receipt.supplier + '</div>' +
            '<div class="meta-data-line"><strong>Source Type:</strong> ' + normalizeSourceType(receipt.sourceType) + '</div>' +
            '<div class="meta-data-line"><strong>Date Received:</strong> ' + receipt.dateReceived + '</div>' +
            '<div class="meta-data-line"><strong>Type:</strong> ' + type + '</div>' +
            '<div class="meta-data-line"><strong>Reference:</strong> ' + (receipt.reference || '—') + '</div>' +
            '</div><div>' +
            '<div class="meta-data-line"><strong>Status:</strong> <span class="status-pill-badge ' + receipt.statusClass + '" style="font-size:11px;">' + statusLabel(receipt) + '</span></div>' +
            '<div class="meta-data-line"><strong>Remarks:</strong> ' + receipt.remarks + '</div>' +
            '</div><div style="border-left:1px dashed #ccc;padding-left:20px;">' +
            '<div class="meta-data-line"><strong>P.O. Origin:</strong> ' + receipt.poOrigin + '</div>' +
            '<div class="meta-data-line"><strong>Sub Total:</strong> ₱' + formatMoney(receipt.subTotal) + '</div>' +
            '</div></div>' +
            renderItemTable(supplyItems, 'Supply Items') +
            renderItemTable(returnedItems, 'Returned Order Items') +
            '</div>';
    }

    function openDetails(receiptId) {
        var receipt = RECEIPTS[receiptId];
        if (!receipt) { showToast('Receipt not found.'); return; }
        currentReceiptId = receiptId;
        document.getElementById(masterBlockId()).style.display = 'none';
        document.getElementById(detailsBlockId()).style.display = 'block';
        document.getElementById('receiving-details-title').textContent = 'Received Order Details — ' + receipt.supplier;
        document.getElementById('receiving-details-content').innerHTML = renderDetailsView(receipt);
        showToast('View ready for ' + receipt.supplier + '.');
    }

    function backToList() {
        document.getElementById(detailsBlockId()).style.display = 'none';
        document.getElementById(masterBlockId()).style.display = 'block';
        currentReceiptId = null;
    }

    function applyStatus(receiptId, statusClass) {
        var receipt = RECEIPTS[receiptId];
        if (!receipt) return;
        receipt.statusClass = statusClass;
        receipt.status = statusMeta(statusClass).value;
        if (statusClass === 'pending') receipt.remarks = 'Awaiting Delivery';
        saveData();
        renderTable(document.getElementById('receiving-search') ? document.getElementById('receiving-search').value : '');
        if (currentReceiptId === receiptId) openDetails(receiptId);
        showToast(receipt.supplier + ' set to ' + statusMeta(statusClass).label + '.');
    }

    /* ---- Modal ---- */
    function openModal() {
        document.getElementById('create-received-modal-overlay').classList.add('modal-triggered');
    }

    function closeModal() {
        document.getElementById('create-received-modal-overlay').classList.remove('modal-triggered');
        editingReceiptId = null;
    }

    function recalcModalTotals() {
        var total = 0;
        document.querySelectorAll('#received-modal-rows-injector tr').forEach(function (tr) {
            var qty = parseFloat(tr.querySelector('.mod-qty').value) || 0;
            var cost = parseFloat(tr.querySelector('.mod-cost').value) || 0;
            var line = qty * cost;
            total += line;
            tr.querySelector('.mod-total').textContent = formatMoney(line);
        });
        var gt = document.getElementById('recv-modal-grand-total');
        if (gt) gt.textContent = formatMoney(total);
    }

    function addModalItemRow(item) {
        item = item || { name: '', unit: 'PCS', qty: 1, cost: 0 };
        var tbody = document.getElementById('received-modal-rows-injector');
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (tbody.children.length + 1) + '</td>' +
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

    function populateModal(receipt) {
        document.getElementById('recv-modal-title').textContent = receipt ? 'Edit Received Supply' : 'Create New Received Supply';
        document.getElementById('recv-modal-supplier').value = receipt ? receipt.supplier : (PAGE_MODE === 'retailer' ? RETAILER_SUPPLIER : '');
        document.getElementById('recv-modal-date').value = receipt ? toDatetimeLocal(receipt.dateReceived) : nowDatetimeLocal();
        document.getElementById('recv-modal-po-origin').value = receipt ? receipt.poOrigin : '';
        document.getElementById('recv-modal-source-type').value = receipt ? normalizeSourceType(receipt.sourceType) : 'Supplier';
        document.getElementById('recv-modal-type').value = receipt ? (receipt.type || 'Supply') : 'Supply';
        document.getElementById('recv-modal-status').value = receipt ? receipt.statusClass : 'pending';
        document.getElementById('recv-modal-reference').value = receipt ? (receipt.reference || '') : '';
        document.getElementById('recv-modal-remarks').value = receipt ? receipt.remarks : '';
        var tbody = document.getElementById('received-modal-rows-injector');
        tbody.innerHTML = '';
        if (receipt && receipt.lineItems && receipt.lineItems.length) {
            receipt.lineItems.forEach(function (it) { addModalItemRow(it); });
        } else {
            addModalItemRow({ name: 'Chocolate', unit: 'PCS', qty: 10, cost: 50 });
        }
        editingReceiptId = receipt ? receipt.id : null;
    }

    function openCreateModal() {
        populateModal(null);
        openModal();
    }

    function openEditModal(receiptId) {
        var receipt = receiptId ? RECEIPTS[receiptId] : (currentReceiptId ? RECEIPTS[currentReceiptId] : null);
        if (!receipt) { openCreateModal(); return; }
        populateModal(receipt);
        openModal();
    }

    function appendFromBuilder() {
        var picker = document.getElementById('item-picker-flavor');
        var name = picker.value;
        if (!name) { showToast('Pick an item flavor first.'); return; }
        var opt = picker.options[picker.selectedIndex];
        addModalItemRow({
            name: name,
            unit: document.getElementById('item-picker-unit').value || 'PCS',
            qty: parseFloat(document.getElementById('item-picker-qty').value) || 1,
            cost: parseFloat(document.getElementById('item-picker-cost').value) || parseFloat(opt.getAttribute('data-cost')) || 0
        });
        document.getElementById('item-picker-qty').value = '';
        document.getElementById('item-picker-cost').value = '';
        picker.value = '';
    }

    function saveModal() {
        var supplier = document.getElementById('recv-modal-supplier').value.trim();
        if (!supplier) { showToast('Supplier is required.'); return; }
        var lineItems = [];
        document.querySelectorAll('#received-modal-rows-injector tr').forEach(function (tr) {
            lineItems.push(recalcLine({
                name: tr.querySelector('.mod-name').value.trim(),
                unit: tr.querySelector('.mod-unit').value.trim(),
                qty: tr.querySelector('.mod-qty').value,
                cost: tr.querySelector('.mod-cost').value,
                note: ''
            }));
        });
        var statusClass = document.getElementById('recv-modal-status').value;
        var entryType = document.getElementById('recv-modal-type').value || 'Supply';
        var sourceType = normalizeSourceType(document.getElementById('recv-modal-source-type').value);
        var id = editingReceiptId || generateNextId();
        var payload = {
            id: id,
            supplier: supplier,
            sourceType: sourceType,
            dateReceived: fromDatetimeLocal(document.getElementById('recv-modal-date').value),
            type: entryType,
            statusClass: statusClass,
            status: statusMeta(statusClass).value,
            remarks: document.getElementById('recv-modal-remarks').value.trim(),
            poOrigin: document.getElementById('recv-modal-po-origin').value.trim(),
            reference: document.getElementById('recv-modal-reference').value.trim(),
            lineItems: lineItems
        };
        syncReceiptDerived(payload);
        RECEIPTS[id] = payload;
        saveData();
        closeModal();
        renderTable(document.getElementById('receiving-search') ? document.getElementById('receiving-search').value : '');
        if (currentReceiptId === id) openDetails(id);
        showToast('Received supply saved: ' + supplier);
    }

    function buildPrintHtml(receipt) {
        var rows = (receipt.lineItems || []).map(function (it) {
            return '<tr><td>' + formatMoney(it.qty) + '</td><td>' + it.unit + '</td>' +
                '<td>' + it.name + (it.note ? ' (' + it.note + ')' : '') + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.cost) + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.total) + '</td></tr>';
        }).join('');
        if (!rows) rows = '<tr><td colspan="5" style="text-align:center;">No items.</td></tr>';
        return '<div class="recv-print-sheet"><div class="recv-print-header"><h1>Kreezby Bakeshop</h1><p>Receiving Batch Sheet</p></div>' +
            '<div class="recv-print-meta"><p><strong>Supplier:</strong> ' + receipt.supplier + '</p>' +
            '<p><strong>Date Received:</strong> ' + receipt.dateDisplay + '</p>' +
            '<p><strong>Status:</strong> ' + receipt.status + '</p>' +
            '<p><strong>P.O. Origin:</strong> ' + receipt.poOrigin + '</p>' +
            '<p><strong>Remarks:</strong> ' + receipt.remarks + '</p></div>' +
            '<table class="recv-print-table"><thead><tr><th>Qty</th><th>Unit</th><th>Item</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody>' +
            '<tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold;">Total Bill Value</td>' +
            '<td style="text-align:right;font-weight:bold;">₱' + formatMoney(receipt.subTotal) + '</td></tr></tfoot></table>' +
            '<p class="recv-print-verify">Verification: ' + receipt.status + ' — Printed ' + new Date().toLocaleString() + '</p></div>';
    }

    function printBatchSheet(receiptId) {
        var receipt = RECEIPTS[receiptId || currentReceiptId];
        if (!receipt) return;
        var root = document.getElementById('recv-print-root');
        root.innerHTML = buildPrintHtml(receipt);
        document.body.classList.add('recv-printing');
        window.print();
        setTimeout(function () { document.body.classList.remove('recv-printing'); root.innerHTML = ''; }, 500);
    }

    function handleAction(action, receiptId, statusClass) {
        closeAllMenus();
        if (action === 'view') { openDetails(receiptId); return; }
        if (action === 'edit') { openEditModal(receiptId); return; }
        if (action === 'set-status' && statusClass) { applyStatus(receiptId, statusClass); return; }
        if (action === 'print') { printBatchSheet(receiptId); }
    }

    function bindEvents() {
        var search = document.getElementById('receiving-search');
        if (search) search.addEventListener('input', function () { renderTable(search.value); });

        document.querySelectorAll('.po-order-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.po-order-tab').forEach(function (btn) {
                    btn.classList.toggle('active', btn === tab);
                    btn.setAttribute('aria-selected', btn === tab ? 'true' : 'false');
                });
                activeReceiveSource = tab.getAttribute('data-source') || 'Supplier';
                renderTable(search ? search.value : '');
            });
        });

        var createBtn = document.getElementById('recv-create-btn');
        if (createBtn) createBtn.addEventListener('click', openCreateModal);
        var closeBtn = document.getElementById('recv-modal-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        var cancelBtn = document.getElementById('recv-modal-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        var saveBtn = document.getElementById('recv-modal-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', saveModal);
        var addItemBtn = document.getElementById('recv-modal-add-item-btn');
        if (addItemBtn) addItemBtn.addEventListener('click', appendFromBuilder);
        var editBtn = document.getElementById('recv-details-edit-btn');
        if (editBtn) editBtn.addEventListener('click', function () { openEditModal(currentReceiptId); });
        var backBtn = document.getElementById('recv-details-back-btn');
        if (backBtn) backBtn.addEventListener('click', backToList);
        var printBtn = document.getElementById('recv-details-print-btn');
        if (printBtn) printBtn.addEventListener('click', function () { printBatchSheet(currentReceiptId); });

        var flavorPicker = document.getElementById('item-picker-flavor');
        if (flavorPicker) {
            flavorPicker.addEventListener('change', function () {
                var opt = flavorPicker.options[flavorPicker.selectedIndex];
                document.getElementById('item-picker-cost').value = opt.getAttribute('data-cost') || '';
            });
        }

        var masterSelector = PAGE_MODE === 'retailer' ? '#receiving-retailer-directory-panel-view' : '#receiving-master-directory-panel-view';

        if (window.__kreezbyRecvDocClick) {
            document.removeEventListener('click', window.__kreezbyRecvDocClick, true);
        }
        window.__kreezbyRecvDocClick = function (e) {
            var actionBtn = e.target.closest(masterSelector + ' .action-trigger-btn[data-menu]');
            if (actionBtn) {
                e.preventDefault(); e.stopPropagation();
                var menu = document.getElementById(actionBtn.getAttribute('data-menu'));
                if (menu) toggleActionMenu(menu, actionBtn);
                return;
            }
            var actionItem = e.target.closest('.action-popup-item[data-receive-id]');
            if (actionItem && actionItem.closest('.action-popup-menu')) {
                e.preventDefault(); e.stopPropagation();
                handleAction(
                    actionItem.getAttribute('data-action'),
                    actionItem.getAttribute('data-receive-id'),
                    actionItem.getAttribute('data-status-class')
                );
                return;
            }
            var statusLink = e.target.closest('.recv-status-link');
            if (statusLink) {
                e.preventDefault(); e.stopPropagation();
                openDetails(statusLink.getAttribute('data-receive-id'));
                return;
            }
            var row = e.target.closest('tr.recv-data-row');
            if (row && !e.target.closest('.action-menu-relative-container, button, a')) {
                openDetails(row.getAttribute('data-receive-id'));
                return;
            }
            if (!e.target.closest('.action-popup-menu') && !e.target.closest('.action-trigger-btn[data-menu]')) {
                closeAllMenus();
            }
        };
        document.addEventListener('click', window.__kreezbyRecvDocClick, true);

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
            document.body.setAttribute('data-kreezby-portal', 'staff-receive');
        }
        setupRetailerPage();
        injectPrintStyles();
        loadData();
        renderTable();
        bindEvents();
        stripRetiredInboundLegendPills();
    }

    window.ReceiveAdmin = {
        openDetails: openDetails,
        printBatchSheet: printBatchSheet,
        openEditModal: openEditModal,
        openCreateModal: openCreateModal,
        closeModal: closeModal,
        backToList: backToList,
        handleAction: handleAction,
        closeMenus: closeAllMenus
    };
    window.switchToReceivedDetailsInspectorSheet = function (id) { openDetails(id || currentReceiptId || 'recv-102'); };
    window.switchToReceivedMasterListingView = backToList;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
