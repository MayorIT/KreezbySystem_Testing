/**
 * Return / P.O List — list view, details, action menus (localStorage).
 */
(function () {
    'use strict';

    if (window.__KreezbyReturnAdminBooted) return;
    window.__KreezbyReturnAdminBooted = true;

    var STORAGE_KEY = 'kreezby-return-records-v1';

    var DEFAULT_RETURNS = {
        'RET-0001': {
            code: 'RET-0001', poOrigin: 'PO-0002', dateCreated: '2021-11-03 16:13',
            entity: 'Retailer 102', entityType: 'retailer', status: 'RETURNED', statusClass: 'rejected',
            reason: 'Damaged item container packaging seals identified during delivery receiving validation loops.',
            items: [
                { qty: 300, unit: 'Boxes', name: 'Item 102', note: 'Sample validation package details notes text', cost: 200, total: 60000 },
                { qty: 200, unit: 'pcs', name: 'Item 104', note: 'Sample validation package details notes text', cost: 205, total: 41000 }
            ]
        },
        'RET-0002': {
            code: 'RET-0002', poOrigin: 'PO-0005', dateCreated: '2021-11-02 11:45',
            entity: 'Customer 401', entityType: 'customer', status: 'RETURNED', statusClass: 'rejected',
            reason: 'Customer reported damaged packaging on delivery.',
            items: [
                { qty: 1, unit: 'Jars', name: 'Choco Butternut', note: 'Seal broken', cost: 120, total: 120 }
            ]
        }
    };

    var RETURN_STATUSES = [
        { class: 'rejected', label: 'Returned', value: 'RETURNED' },
        { class: 'pending', label: 'Pending Review', value: 'PENDING REVIEW' },
        { class: 'partial', label: 'Partially Processed', value: 'PARTIALLY PROCESSED' },
        { class: 'received', label: 'Processed', value: 'PROCESSED' }
    ];

    var RETURNS = {};
    var currentReturnCode = null;

    function removeMenuBackdrops() {
        document.querySelectorAll('#kreezby-action-menu-backdrop').forEach(function (bd) {
            bd.remove();
        });
    }

    function listBlockId() {
        return 'returns-master-list-panel-view';
    }

    function detailsBlockId() {
        return 'returns-details-inspector-panel-view';
    }

    function loadData() {
        if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
            window.KreezbyPortalSeed.apply();
        }
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            RETURNS = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_RETURNS));
        } catch (e) {
            RETURNS = JSON.parse(JSON.stringify(DEFAULT_RETURNS));
        }
    }

    function saveData() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(RETURNS)); } catch (e) {}
    }

    function formatMoney(n) {
        return Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function returnTotal(record) {
        return (record.items || []).reduce(function (s, it) { return s + (Number(it.total) || 0); }, 0);
    }

    function statusMeta(statusClass) {
        for (var i = 0; i < RETURN_STATUSES.length; i++) {
            if (RETURN_STATUSES[i].class === statusClass) return RETURN_STATUSES[i];
        }
        return RETURN_STATUSES[0];
    }

    function returnsByType(type) {
        var list = Object.keys(RETURNS).map(function (k) { return RETURNS[k]; });
        if (type !== 'customer' && !document.getElementById('return-tab-customer') && !document.getElementById('return-customer-tbody')) {
            return list.sort(function (a, b) {
                var d = b.dateCreated.localeCompare(a.dateCreated);
                return d !== 0 ? d : b.code.localeCompare(a.code);
            });
        }
        return list.filter(function (r) {
            return type === 'customer' ? r.entityType === 'customer' : r.entityType !== 'customer';
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

    function menuContainerFor(menu) {
        if (!menu || !menu.id) return null;
        var btn = document.querySelector('#returns-master-list-panel-view .action-trigger-btn[data-menu="' + menu.id + '"]');
        return btn ? btn.closest('.action-menu-relative-container') : null;
    }

    function purgeOrphanMenus() {
        document.body.querySelectorAll('.action-popup-menu[id^="return-act-menu-"]').forEach(function (menu) {
            var container = menuContainerFor(menu);
            if (container) {
                container.appendChild(menu);
            } else {
                menu.remove();
            }
        });
        removeMenuBackdrops();
    }

    function reattachMenu(menu) {
        var container = menuContainerFor(menu);
        if (container && menu.parentNode !== container) {
            container.appendChild(menu);
        }
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

    function positionOpenMenu(menu, btn) {
        if (!menu || !btn) return;
        var rect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = 'auto';
        menu.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.bottom = 'auto';
        menu.style.zIndex = '10050';
    }

    function closeAllMenus() {
        document.querySelectorAll('#returns-master-list-panel-view .action-popup-menu, body .action-popup-menu[id^="return-act-menu-"]').forEach(function (m) {
            m.classList.remove('active', 'flip-up');
            resetMenuPosition(m);
            reattachMenu(m);
        });
        purgeOrphanMenus();
    }

    function toggleActionMenu(menu, btn) {
        if (!menu) return;
        var willOpen = !menu.classList.contains('active');
        closeAllMenus();
        if (!willOpen) return;
        reattachMenu(menu);
        menu.classList.add('active');
        positionOpenMenu(menu, btn);
    }

    function buildStatusActionItems(returnCode, currentClass) {
        return RETURN_STATUSES.map(function (s) {
            var current = s.class === currentClass ? ' is-current' : '';
            return '<div class="action-popup-item action-popup-item-status' + current + '" data-action="set-status"' +
                ' data-status-class="' + s.class + '" data-return="' + returnCode + '">' + s.label + '</div>';
        }).join('');
    }

    function buildActionMenu(returnCode) {
        var menuId = 'return-act-menu-' + String(returnCode).replace(/[^a-zA-Z0-9-]/g, '');
        var record = RETURNS[returnCode];
        return '<div class="action-menu-relative-container" data-kreezby-page-menu>' +
            '<button type="button" class="action-trigger-btn" data-menu="' + menuId + '">Action ▾</button>' +
            '<div class="action-popup-menu action-popup-menu-wide" id="' + menuId + '">' +
            '<div class="action-popup-item" data-action="view" data-return="' + returnCode + '">View Details</div>' +
            '<div class="action-popup-item" data-action="edit" data-return="' + returnCode + '">Edit Record</div>' +
            '<div class="action-popup-item" data-action="print" data-return="' + returnCode + '">Print Return Slip</div>' +
            '<div class="action-popup-divider" aria-hidden="true"></div>' +
            buildStatusActionItems(returnCode, record ? record.statusClass : 'rejected') +
            '</div></div>';
    }

    function entityColumnLabel(type) {
        return type === 'customer' ? 'Customer' : 'Retailer / Entity';
    }

    function renderTable(type, filter) {
        closeAllMenus();
        var tbodyId = type === 'customer' ? 'return-customer-tbody' : 'return-retailer-tbody';
        var footerId = type === 'customer' ? 'return-customer-footer' : 'return-retailer-footer';
        var tbody = document.getElementById(tbodyId);
        var footer = document.getElementById(footerId);
        if (!tbody) return;

        var q = (filter || '').toLowerCase().trim();
        var all = returnsByType(type);
        var rows = all.filter(function (r) {
            if (!q) return true;
            return [r.code, r.poOrigin, r.dateCreated, r.entity, r.status, r.reason].join(' ').toLowerCase().indexOf(q) >= 0;
        });

        tbody.innerHTML = rows.map(function (r, i) {
            return '<tr data-return="' + r.code + '" class="return-data-row">' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + r.dateCreated + '</td>' +
                '<td><a href="#" class="return-code-link" data-return="' + r.code + '">' + r.code + '</a></td>' +
                '<td><strong>' + r.poOrigin + '</strong></td>' +
                '<td>' + r.entity + '</td>' +
                '<td>' + (r.items ? r.items.length : 0) + '</td>' +
                '<td><span class="status-pill-badge ' + r.statusClass + ' return-status-link" data-return="' + r.code + '">' + statusMeta(r.statusClass).label + '</span></td>' +
                '<td>' + buildActionMenu(r.code) + '</td></tr>';
        }).join('');

        if (footer) {
            footer.textContent = 'Showing ' + rows.length + ' of ' + all.length + ' entries — sorted newest first (by date & return code)';
        }
    }

    function refreshTables() {
        var rs = document.getElementById('return-retailer-search');
        var cs = document.getElementById('return-customer-search');
        renderTable('retailer', rs ? rs.value : '');
        renderTable('customer', cs ? cs.value : '');
    }

    function renderDetailsView(record) {
        var itemsHtml = (record.items || []).map(function (it) {
            return '<tr>' +
                '<td>' + formatMoney(it.qty) + '</td>' +
                '<td>' + it.unit + '</td>' +
                '<td><strong>' + it.name + '</strong>' + (it.note ? '<br><small style="color:#666;">' + it.note + '</small>' : '') + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.cost) + '</td>' +
                '<td style="text-align:right;">' + formatMoney(it.total) + '</td></tr>';
        }).join('');
        if (!itemsHtml) itemsHtml = '<tr><td colspan="5" style="text-align:center;color:#888;">No returned items logged.</td></tr>';

        var total = returnTotal(record);
        return '<div class="details-inspection-sheet">' +
            '<div class="details-header-meta-block">' +
            '<div>' +
            '<div class="meta-data-line"><strong>Return Code:</strong> ' + record.code + '</div>' +
            '<div class="meta-data-line"><strong>P.O. Origin:</strong> ' + record.poOrigin + '</div>' +
            '<div class="meta-data-line"><strong>Date Stamped:</strong> ' + record.dateCreated + '</div>' +
            '</div><div>' +
            '<div class="meta-data-line"><strong>Returnee Entity:</strong> ' + record.entity + '</div>' +
            '<div class="meta-data-line"><strong>Status Marker:</strong> <span class="status-pill-badge ' + record.statusClass + '" style="font-size:11px;">' + statusMeta(record.statusClass).label + '</span></div>' +
            '<div class="meta-data-line"><strong>Grand Total:</strong> ₱' + formatMoney(total) + '</div>' +
            '</div><div style="border-left:1px dashed #ccc;padding-left:20px;">' +
            '<div class="meta-data-line"><strong>Reason for Return:</strong></div>' +
            '<div class="meta-data-line" style="color:#c62828;font-style:italic;font-weight:600;">"' + (record.reason || '—') + '"</div>' +
            '</div></div>' +
            '<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:#1a237e;">■ Damaged Product Disposals & Audit Log Breakdown</div>' +
            '<table class="data-display-table"><thead><tr style="background:#1a237e;color:white;">' +
            '<th>Qty Returned</th><th>Unit Type</th><th>Product Flavor Description</th>' +
            '<th style="text-align:right;">Unit Rate Cost</th><th style="text-align:right;">Total Evaluated Loss</th>' +
            '</tr></thead><tbody>' + itemsHtml + '</tbody>' +
            '<tfoot><tr style="font-weight:bold;background:#f5f5f5;"><td colspan="4" style="text-align:right;">Sub Total:</td>' +
            '<td style="text-align:right;">' + formatMoney(total) + '</td></tr>' +
            '<tr style="font-weight:bold;background:#eeeeee;"><td colspan="4" style="text-align:right;">Total Refund/Credit Equivalency Value:</td>' +
            '<td style="text-align:right;color:#b71c1c;">₱' + formatMoney(total) + '</td></tr></tfoot></table></div>';
    }

    function openDetails(returnCode) {
        closeAllMenus();
        var record = RETURNS[returnCode];
        if (!record) { showToast('Return record not found.'); return; }
        currentReturnCode = returnCode;
        document.getElementById(listBlockId()).style.display = 'none';
        document.getElementById(detailsBlockId()).style.display = 'block';
        var title = document.getElementById('return-details-title');
        if (title) title.textContent = 'Return Details - ' + record.code;
        var content = document.getElementById('return-details-content');
        if (content) content.innerHTML = renderDetailsView(record);
    }

    function backToList() {
        closeAllMenus();
        document.getElementById(detailsBlockId()).style.display = 'none';
        document.getElementById(listBlockId()).style.display = '';
        currentReturnCode = null;
    }

    function applyStatus(returnCode, statusClass) {
        var record = RETURNS[returnCode];
        if (!record) return;
        var meta = statusMeta(statusClass);
        record.statusClass = meta.class;
        record.status = meta.value;
        saveData();
        refreshTables();
        if (currentReturnCode === returnCode) openDetails(returnCode);
        showToast('Status updated to ' + meta.label + '.');
    }

    function printReturnSlip(returnCode) {
        var record = RETURNS[returnCode];
        if (!record) return;
        var root = document.getElementById('return-print-root');
        if (!root) return;
        root.innerHTML = '<div class="return-receipt-sheet"><h1>Kreezby Bakeshop</h1><h2>Return Slip</h2>' +
            '<p><strong>Return Code:</strong> ' + record.code + '</p>' +
            '<p><strong>P.O. Origin:</strong> ' + record.poOrigin + '</p>' +
            '<p><strong>Entity:</strong> ' + record.entity + '</p>' +
            '<p><strong>Status:</strong> ' + record.status + '</p>' +
            '<p><strong>Reason:</strong> ' + (record.reason || '') + '</p>' +
            '<p>Printed ' + new Date().toLocaleString() + '</p></div>';
        document.body.classList.add('return-printing');
        window.print();
        setTimeout(function () { document.body.classList.remove('return-printing'); root.innerHTML = ''; }, 500);
    }

    function handleAction(action, returnCode, statusClass) {
        closeAllMenus();
        if (action === 'view') { openDetails(returnCode); return; }
        if (action === 'edit') { openDetails(returnCode); showToast('Edit return record from the details panel.'); return; }
        if (action === 'set-status' && statusClass) { applyStatus(returnCode, statusClass); return; }
        if (action === 'print') { printReturnSlip(returnCode); }
    }

    function setupPage() {
        if (/\/staff\//i.test(window.location.pathname)) {
            document.body.setAttribute('data-kreezby-portal', 'staff-return');
        } else {
            document.body.setAttribute('data-kreezby-portal', 'admin-return');
        }

        var rs = document.querySelector('#return-tab-retailer input[type="text"]');
        if (rs) rs.id = 'return-retailer-search';
        var cs = document.querySelector('#return-tab-customer input[type="text"]');
        if (cs) cs.id = 'return-customer-search';

        var master = document.getElementById('returns-master-list-panel-view');
        if (master) {
            var tbody = master.querySelector('table.data-display-table tbody');
            if (tbody && !tbody.id) tbody.id = 'return-retailer-tbody';
            var search = master.querySelector('input[type="text"]');
            if (search && !search.id) search.id = 'return-retailer-search';
        }

        if (!document.getElementById('return-print-root')) {
            var root = document.createElement('div');
            root.id = 'return-print-root';
            root.className = 'return-print-root';
            root.setAttribute('aria-hidden', 'true');
            document.body.appendChild(root);
        }

        var styleEl = document.getElementById('kreezby-return-portal-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'kreezby-return-portal-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent =
                '.action-menu-relative-container{position:relative;display:inline-block}' +
                '.action-popup-menu{display:none;position:absolute;right:0;top:100%;margin-top:4px;background:#fff;min-width:180px;' +
                'box-shadow:0 4px 12px rgba(0,0,0,.12);border:1px solid #ddd;border-radius:4px;z-index:5000;max-height:min(70vh,360px);overflow-y:auto;pointer-events:auto}' +
                '.action-popup-menu:not(.active){pointer-events:none!important}' +
                '.action-popup-menu.active{display:block!important}' +
                '.action-popup-menu-wide{min-width:200px}' +
                '.action-popup-item{padding:8px 14px;font-size:13px;color:#333;cursor:pointer;text-align:left}' +
                '.action-popup-item:hover{background:#f5f5f5}' +
                '.action-popup-divider{height:1px;background:#e0e0e0;margin:6px 0}' +
                '.action-popup-item-status{font-size:12px;color:#444}' +
                '.action-popup-item-status.is-current{font-weight:700;color:#1565c0;background:#f3f8ff}' +
                '.return-code-link,.return-status-link{cursor:pointer}' +
                '#returns-master-list-panel-view,#returns-master-list-panel-view .panel-data-card,' +
                '#returns-master-list-panel-view .card-body-padded,#returns-master-list-panel-view .po-table-scroll-wrap,' +
                '#returns-master-list-panel-view .data-display-table,#returns-master-list-panel-view td{overflow:visible!important}' +
                '@media print{body.return-printing>*:not(#return-print-root){display:none!important}' +
                '#return-print-root{display:block!important}}';

        removeMenuBackdrops();
        purgeOrphanMenus();
        closeAllMenus();
    }

    function bindEvents() {
        var rs = document.getElementById('return-retailer-search');
        if (rs) rs.addEventListener('input', function () { renderTable('retailer', rs.value); });
        var cs = document.getElementById('return-customer-search');
        if (cs) cs.addEventListener('input', function () { renderTable('customer', cs.value); });

        var printBtn = document.getElementById('return-details-print-btn');
        if (printBtn) printBtn.addEventListener('click', function () { if (currentReturnCode) printReturnSlip(currentReturnCode); });
        var editBtn = document.getElementById('return-details-edit-btn');
        if (editBtn) editBtn.addEventListener('click', function () { showToast('Return record edit window active...'); });
        var backBtn = document.getElementById('return-details-back-btn');
        if (backBtn) backBtn.addEventListener('click', backToList);

        if (window.__kreezbyReturnDocClick) {
            document.removeEventListener('click', window.__kreezbyReturnDocClick, true);
        }
        window.__kreezbyReturnDocClick = function (e) {
            var actionBtn = e.target.closest('.action-trigger-btn[data-menu]');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                var menu = document.getElementById(actionBtn.getAttribute('data-menu'));
                if (menu) toggleActionMenu(menu, actionBtn);
                return;
            }

            var actionItem = e.target.closest('.action-popup-item[data-return]');
            if (actionItem && actionItem.closest('.action-popup-menu')) {
                e.preventDefault();
                e.stopPropagation();
                handleAction(
                    actionItem.getAttribute('data-action'),
                    actionItem.getAttribute('data-return'),
                    actionItem.getAttribute('data-status-class')
                );
                return;
            }

            var returnLink = e.target.closest('.return-code-link, .return-status-link');
            if (returnLink) {
                e.preventDefault();
                e.stopPropagation();
                closeAllMenus();
                openDetails(returnLink.getAttribute('data-return'));
                return;
            }

            var row = e.target.closest('tr.return-data-row');
            if (row && !e.target.closest('.action-menu-relative-container, button, a')) {
                closeAllMenus();
                openDetails(row.getAttribute('data-return'));
                return;
            }

            if (!e.target.closest('.action-popup-menu') && !e.target.closest('.action-trigger-btn[data-menu]')) {
                closeAllMenus();
            }
        };
        document.addEventListener('click', window.__kreezbyReturnDocClick, true);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAllMenus();
        });
    }

    function init() {
        if (!document.getElementById(listBlockId())) return;
        setupPage();
        loadData();
        refreshTables();
        bindEvents();
    }

    window.ReturnAdmin = {
        openDetails: openDetails,
        backToList: backToList,
        printReturnSlip: printReturnSlip,
        handleAction: handleAction,
        closeMenus: closeAllMenus
    };
    window.switchToReturnDetailsInspectorView = function (code) { openDetails(code || currentReturnCode || 'RET-0001'); };
    window.switchToReturnsMasterListView = backToList;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
