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
    var listPage = 1;

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
            return list.filter(function (r) { return r.entityType !== 'wholesaler'; }).sort(function (a, b) {
                var d = b.dateCreated.localeCompare(a.dateCreated);
                return d !== 0 ? d : b.code.localeCompare(a.code);
            });
        }
        return list.filter(function (r) {
            return type === 'customer' ? r.entityType === 'customer' : (r.entityType !== 'customer' && r.entityType !== 'wholesaler');
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
        if (menu.parentNode !== document.body) document.body.appendChild(menu);
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

    function listPageSize() {
        var size = document.getElementById('return-page-size');
        var n = size ? parseInt(size.value, 10) : 10;
        return n > 0 ? n : 10;
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
        if (label.indexOf('customer') >= 0) return 'is-customer';
        return 'is-retail';
    }

    function typeLabel(type) {
        if (type === 'customer') return 'Customer';
        return 'Retailer';
    }

    function renderListFooter(footer, info) {
        if (!footer) return;
        var count = document.getElementById('return-list-count');
        if (count) count.textContent = info.total + (info.total === 1 ? ' return' : ' returns');
        footer.innerHTML =
            '<span>Showing ' + info.start + '–' + info.end + ' of ' + info.total + '</span>' +
            '<div class="po-pager">' +
            '<button type="button" class="po-pager-btn" data-return-pager="prev"' + (info.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
            '<span class="po-pager-status">Page ' + info.page + ' of ' + info.pages + '</span>' +
            '<button type="button" class="po-pager-btn" data-return-pager="next"' + (info.page >= info.pages ? ' disabled' : '') + '>Next</button>' +
            '</div>';
    }

    function scrollReturnToTop() {
        window.scrollTo(0, 0);
        var root = document.scrollingElement || document.documentElement;
        if (root) root.scrollTop = 0;
        document.querySelectorAll('.po-details-scroll, .po-table-scroll-wrap').forEach(function (node) {
            node.scrollTop = 0;
        });
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
        var page = pageSlice(rows);
        if (!page.rows.length) {
            tbody.innerHTML = '<tr class="po-empty-row"><td colspan="8">No returns match this search.</td></tr>';
        } else {
            tbody.innerHTML = page.rows.map(function (r, i) {
                var status = statusMeta(r.statusClass);
                return '<tr data-return="' + esc(r.code) + '" class="return-data-row po-data-row">' +
                    '<td class="po-col-num">' + (page.start + i) + '</td>' +
                    '<td class="po-col-date">' + dateCell(r.dateCreated) + '</td>' +
                    '<td class="po-col-code"><a href="#" class="return-code-link po-code-link" data-return="' + esc(r.code) + '">' + esc(r.code) + '</a></td>' +
                    '<td class="po-col-origin"><span class="po-entity-name">' + esc(r.poOrigin || '—') + '</span></td>' +
                    '<td class="po-col-entity"><span class="po-entity-name">' + esc(r.entity || '—') + '</span><span class="po-entity-meta"><span class="po-type-chip ' + typeChipClass(r.entityType) + '">' + esc(typeLabel(r.entityType)) + '</span></span></td>' +
                    '<td class="po-col-items"><span class="po-item-count">' + (r.items ? r.items.length : 0) + '</span></td>' +
                    '<td class="po-col-status"><span class="status-pill-badge ' + esc(status.class) + ' return-status-link po-status-link" data-return="' + esc(r.code) + '">' + esc(status.label) + '</span></td>' +
                    '<td class="po-col-action">' + buildActionMenu(r.code) + '</td></tr>';
            }).join('');
        }
        renderListFooter(footer, page);
    }

    function refreshTables() {
        var rs = document.getElementById('return-retailer-search');
        var cs = document.getElementById('return-customer-search');
        renderTable('retailer', rs ? rs.value : '');
        renderTable('customer', cs ? cs.value : '');
    }

    function detailFact(label, value) {
        return '<div class="po-detail-fact"><span>' + esc(label) + '</span><strong>' + value + '</strong></div>';
    }

    function renderDetailsView(record) {
        var itemsHtml = (record.items || []).map(function (it) {
            return '<tr>' +
                '<td class="po-num">' + esc(formatMoney(it.qty)) + '</td>' +
                '<td>' + esc(it.unit) + '</td>' +
                '<td><strong>' + esc(it.name) + '</strong>' + (it.note ? '<br><small>' + esc(it.note) + '</small>' : '') + '</td>' +
                '<td class="po-num">' + esc(formatMoney(it.cost)) + '</td>' +
                '<td class="po-num">' + esc(formatMoney(it.total)) + '</td></tr>';
        }).join('');
        if (!itemsHtml) itemsHtml = '<tr><td colspan="5">No returned items logged.</td></tr>';
        var total = returnTotal(record);
        var status = statusMeta(record.statusClass);
        return '<div class="po-detail-hero">' +
            '<div><p class="po-detail-kicker">' + esc(typeLabel(record.entityType)) + '</p>' +
            '<h4>' + esc(record.entity || '—') + '</h4>' +
            '<p class="po-detail-sub">' + esc(record.dateCreated || '') + '</p></div>' +
            '<div class="po-detail-total"><span>Return value</span><strong>₱' + esc(formatMoney(total)) + '</strong></div></div>' +
            '<div class="po-detail-facts">' +
            detailFact('Return code', esc(record.code)) +
            detailFact('P.O. origin', esc(record.poOrigin || '—')) +
            detailFact('Status', '<span class="status-pill-badge ' + esc(status.class) + '">' + esc(status.label) + '</span>') +
            detailFact('Items', esc(String((record.items || []).length))) +
            '</div>' +
            '<div class="po-detail-remarks"><span>Reason for return</span><p>' + esc(record.reason || '—') + '</p></div>' +
            '<h3 class="po-detail-section">Returned items</h3>' +
            '<div class="po-detail-table-wrap"><table class="data-display-table po-detail-table"><thead><tr>' +
            '<th>Qty</th><th>Unit</th><th>Product</th><th>Unit cost</th><th>Total</th>' +
            '</tr></thead><tbody>' + itemsHtml + '</tbody><tfoot><tr><td colspan="4">Total</td><td class="po-num">₱' + esc(formatMoney(total)) + '</td></tr></tfoot></table></div>';
    }

    function openDetails(returnCode) {
        closeAllMenus();
        var record = RETURNS[returnCode];
        if (!record) { showToast('Return record not found.'); return; }
        currentReturnCode = returnCode;
        var master = document.getElementById(listBlockId());
        var details = document.getElementById(detailsBlockId());
        if (master) master.style.display = 'none';
        if (details) {
            details.classList.add('is-open');
            details.style.display = 'flex';
        }
        var title = document.getElementById('return-details-title');
        if (title) title.textContent = record.code;
        var content = document.getElementById('return-details-content');
        if (content) content.innerHTML = renderDetailsView(record);
        scrollReturnToTop();
    }

    function backToList() {
        closeAllMenus();
        var details = document.getElementById(detailsBlockId());
        var master = document.getElementById(listBlockId());
        if (details) {
            details.classList.remove('is-open');
            details.style.display = 'none';
        }
        if (master) master.style.display = '';
        scrollReturnToTop();
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

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function startEdit(returnCode) {
        openDetails(returnCode);
        var record = RETURNS[returnCode];
        var content = document.getElementById('return-details-content');
        if (!record || !content || content.querySelector('#return-edit-form')) return;
        var options = RETURN_STATUSES.map(function (status) {
            return '<option value="' + status.class + '"' + (status.class === record.statusClass ? ' selected' : '') + '>' + esc(status.label) + '</option>';
        }).join('');
        content.insertAdjacentHTML('afterbegin',
            '<form id="return-edit-form" class="po-detail-remarks" data-kreezby-native="1">' +
            '<span>Edit this return</span>' +
            '<label>Status<br><select class="po-detail-input" name="status">' + options + '</select></label>' +
            '<label>Reason<br><textarea class="po-detail-input" name="reason" rows="3">' + esc(record.reason || '') + '</textarea></label>' +
            '<button class="btn-call-to-action" type="submit">Save changes</button>' +
            '</form>');
    }

    function handleAction(action, returnCode, statusClass) {
        closeAllMenus();
        if (action === 'view') { openDetails(returnCode); return; }
        if (action === 'edit') { startEdit(returnCode); return; }
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

        var details = document.getElementById(detailsBlockId());
        if (details) {
            var title = details.querySelector('.panel-card-title-bar h3');
            if (title) title.id = 'return-details-title';
            var sheet = details.querySelector('.details-inspection-sheet');
            if (sheet) sheet.id = 'return-details-content';
            var footer = details.querySelector('.details-action-footer-row');
            if (footer) {
                footer.querySelectorAll('button').forEach(function (btn) {
                    var label = (btn.textContent || '').toLowerCase();
                    if (label.indexOf('print') >= 0) {
                        btn.id = 'return-details-print-btn';
                        btn.type = 'button';
                        btn.removeAttribute('onclick');
                    }
                    if (label.indexOf('back') >= 0) {
                        btn.id = 'return-details-back-btn';
                        btn.type = 'button';
                        btn.removeAttribute('onclick');
                    }
                });
            }
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
                'body:not(.po-admin-page) #returns-master-list-panel-view,' +
                'body:not(.po-admin-page) #returns-master-list-panel-view .panel-data-card,' +
                'body:not(.po-admin-page) #returns-master-list-panel-view .card-body-padded,' +
                'body:not(.po-admin-page) #returns-master-list-panel-view .po-table-scroll-wrap,' +
                'body:not(.po-admin-page) #returns-master-list-panel-view .data-display-table,' +
                'body:not(.po-admin-page) #returns-master-list-panel-view td{overflow:visible!important}' +
                '@media print{body.return-printing>*:not(#return-print-root){display:none!important}' +
                '#return-print-root{display:block!important}}';

        removeMenuBackdrops();
        purgeOrphanMenus();
        closeAllMenus();
    }

    function bindControl(el, type, key, handler) {
        if (!el) return;
        if (!el.__returnHandlers) el.__returnHandlers = {};
        if (el.__returnHandlers[key]) el.removeEventListener(type, el.__returnHandlers[key]);
        el.__returnHandlers[key] = handler;
        el.addEventListener(type, handler);
    }

    function bindEvents() {
        var rs = document.getElementById('return-retailer-search');
        bindControl(rs, 'input', 'search', function () {
            listPage = 1;
            renderTable('retailer', rs.value);
            scrollReturnToTop();
        });
        var cs = document.getElementById('return-customer-search');
        bindControl(cs, 'input', 'search', function () {
            listPage = 1;
            renderTable('customer', cs.value);
            scrollReturnToTop();
        });
        bindControl(document.getElementById('return-page-size'), 'change', 'page-size', function () {
            listPage = 1;
            refreshTables();
            scrollReturnToTop();
        });
        bindControl(document.getElementById('return-details-print-btn'), 'click', 'print', function () {
            if (currentReturnCode) printReturnSlip(currentReturnCode);
        });
        bindControl(document.getElementById('return-details-edit-btn'), 'click', 'edit', function () {
            if (currentReturnCode) startEdit(currentReturnCode);
        });
        bindControl(document.getElementById('return-details-back-btn'), 'click', 'back', backToList);
        var detailsPanel = document.getElementById(detailsBlockId());
        if (detailsPanel && detailsPanel.dataset.editBound !== '1') {
            detailsPanel.dataset.editBound = '1';
            detailsPanel.addEventListener('submit', function (ev) {
                var form = ev.target.closest('#return-edit-form');
                if (!form || !currentReturnCode || !RETURNS[currentReturnCode]) return;
                ev.preventDefault();
                RETURNS[currentReturnCode].reason = form.elements.reason.value.trim();
                applyStatus(currentReturnCode, form.elements.status.value);
                showToast('Saved ' + currentReturnCode + '.');
            });
        }

        if (window.__kreezbyReturnDocClick) {
            document.removeEventListener('click', window.__kreezbyReturnDocClick, true);
        }
        window.__kreezbyReturnDocClick = function (e) {
            if (!document.getElementById('returns-master-list-panel-view')) return;
            var pager = e.target.closest('[data-return-pager]');
            if (pager && !pager.disabled) {
                e.preventDefault();
                listPage += pager.getAttribute('data-return-pager') === 'next' ? 1 : -1;
                refreshTables();
                scrollReturnToTop();
                return;
            }
            var actionBtn = e.target.closest('#returns-master-list-panel-view .action-trigger-btn[data-menu]');
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

    function ensureReturnTheme() {
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
            link.href = href;
            return link;
        }
        sheet('kreezby-return-admin-css', root + 'css/pages/admin/return-admin.css');
        sheet('kreezby-po-tabs-css', root + 'css/shared/order-tabbed-layout.css');
        sheet('kreezby-po-expand-css', root + 'css/shared/expandable-nav-tabs.css');
        sheet('po-theme-sheet', root + 'css/pages/admin/po-theme.css?v=20261008sls');
    }

    function init() {
        if (!document.getElementById(listBlockId())) return;
        ensureReturnTheme();
        setupPage();
        loadData();
        refreshTables();
        bindEvents();
        if (!window.__kreezbyReturnLiveSync) {
            window.__kreezbyReturnLiveSync = true;
            function reloadLive() {
                if (!document.getElementById('returns-master-list-panel-view')) return;
                loadData();
                refreshTables();
                if (currentReturnCode && RETURNS[currentReturnCode]) {
                    var content = document.getElementById('return-details-content');
                    var details = document.getElementById(detailsBlockId());
                    if (content && details && details.style.display !== 'none') content.innerHTML = renderDetailsView(RETURNS[currentReturnCode]);
                }
            }
            document.addEventListener('kreezby:return-records-sync', reloadLive);
            window.addEventListener('storage', function (event) {
                if (event.key === STORAGE_KEY) reloadLive();
            });
        }
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
