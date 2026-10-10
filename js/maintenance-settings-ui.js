/**
 * Settings panel UI inside Maintenance (login history and accounts).
 */
(function () {
    'use strict';

    var currentSettingsSub = 'login-history';

    var settingsShellHtml = ''
        + '<div class="settings-section-title">System Settings</div>'
        + '<p class="settings-section-desc">Manage user accounts and login activity. Staff and admin module access is controlled by Head Admin.</p>'
        + '<div class="settings-sub-tabs-row" id="settings-sub-tabs">'
        + '<button type="button" class="settings-sub-tab active-sub" data-sub="login-history">Login History</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="customers">Customers</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="retailers">Retailers</button>'
        + '</div>'
        + '<div id="settings-sub-content"></div>'
        + '<div id="kreezby-backup-tools" style="margin-top:18px;">'
        + '<h4 class="settings-section-title">Backup and restore</h4>'
        + '<p class="settings-section-desc">Download inventory, sales, orders, accounts, and issue reports, or put a saved backup back.</p>'
        + '<button type="button" id="kreezby-backup-download">Download backup</button> '
        + '<label style="margin-left:8px;">Restore backup <input type="file" id="kreezby-backup-file" accept="application/json,.json"></label>'
        + '<p id="kreezby-backup-note" style="margin-top:8px;"></p></div>';

    function badgeClass(type) {
        var t = (type || '').toLowerCase();
        if (t === 'customer') return 'badge-customer';
        if (t === 'retailer') return 'badge-retailer';
        if (t === 'staff') return 'badge-staff';
        return 'badge-admin';
    }

    function renderLoginHistory() {
        var history = window.KreezbyMaintenanceSettings.getLoginHistory();
        var rows = history.map(function (log, i) {
            return '<tr><td>' + (i + 1) + '</td><td><strong>' + log.userName + '</strong></td>'
                + '<td><span class="badge-account-type ' + badgeClass(log.accountType) + '">' + log.accountType + '</span></td>'
                + '<td>' + log.identity + '</td><td>' + log.loggedAt + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Login History</h4>'
            + '<p class="settings-section-desc">Recent sign-ins for all users (customers, retailers, staff, and admin).</p>'
            + '<table class="data-display-table"><thead><tr>'
            + '<th style="width:40px;">#</th><th>Full Name</th><th>Account Type</th><th>Email / Username</th><th>Date &amp; Time</th>'
            + '</tr></thead><tbody>' + (rows || '<tr><td colspan="5">No login records yet.</td></tr>') + '</tbody></table>';
    }

    function renderCustomers() {
        var users = window.KreezbyMaintenanceSettings.getUsers();
        var rows = users.customers.filter(function (c) { return !c.archived; }).map(function (c, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + c.user_id + '</td><td><strong>' + c.name + '</strong></td><td>' + c.dictionaryRole + '</td><td>Hashed</td><td>' + c.email + '</td><td>' + c.phone + '</td>'
                + '<td>' + c.joined + '</td><td>'
                + '<button type="button" class="btn-upgrade" onclick="KreezbyMaintenanceUI.upgradeCustomer(\'' + c.id + '\',\'retailer\')">→ Retailer</button>'
                + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Customer Accounts</h4>'
            + '<p class="settings-section-desc">Upgrade a customer to retailer. The old customer account is archived as a changed business partner.</p>'
            + '<table class="data-display-table"><thead><tr>'
            + '<th>#</th><th>User ID</th><th>Name</th><th>Role</th><th>Password</th><th>Email</th><th>Phone</th><th>Joined</th><th>Grant Access</th>'
            + '</tr></thead><tbody>' + (rows || '<tr><td colspan="9">No customer accounts.</td></tr>') + '</tbody></table>';
    }

    function renderRetailers() {
        var list = window.KreezbyMaintenanceSettings.getUsers().retailers.filter(function (r) { return !r.archived; });
        var rows = list.map(function (r, i) {
            var note = r.upgradedFrom ? '<span style="font-size:11px;color:#7c4dff;">Upgraded from customer</span>' : '—';
            return '<tr><td>' + (i + 1) + '</td><td>' + r.user_id + '</td><td><strong>' + r.name + '</strong></td><td>' + r.dictionaryRole + '</td><td>Hashed</td><td>' + r.contact + '</td><td>' + r.email + '</td><td>' + r.area + '</td><td>' + note + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Retailer Accounts</h4>'
            + '<p class="settings-section-desc">Partner retailers with inventory and order portal access.</p>'
            + '<table class="data-display-table"><thead><tr>'
            + '<th>#</th><th>User ID</th><th>Business Name</th><th>Role</th><th>Password</th><th>Contact</th><th>Email</th><th>Area</th><th>Source</th>'
            + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderSettingsSub(subKey) {
        currentSettingsSub = subKey;
        var root = document.getElementById('settings-sub-content');
        if (!root) return;

        document.querySelectorAll('.settings-sub-tab').forEach(function (btn) {
            btn.classList.toggle('active-sub', btn.getAttribute('data-sub') === subKey);
        });

        if (subKey === 'login-history') root.innerHTML = renderLoginHistory();
        else if (subKey === 'customers') root.innerHTML = renderCustomers();
        else if (subKey === 'retailers') root.innerHTML = renderRetailers();
    }

    function initSettingsPanel() {
        var rootWorkspace = document.getElementById('maintenance-grid-workspace-root');
        if (!rootWorkspace) return;
        rootWorkspace.innerHTML = settingsShellHtml.replace(/<motion/g, '<div').replace(/<\/motion>/g, '</div>');
        rootWorkspace.setAttribute('data-maint-live', '1');

        document.querySelectorAll('.settings-sub-tab').forEach(function (btn) {
            btn.onclick = function () {
                renderSettingsSub(btn.getAttribute('data-sub'));
            };
        });

        renderSettingsSub('login-history');
        var download = document.getElementById('kreezby-backup-download');
        var file = document.getElementById('kreezby-backup-file');
        var note = document.getElementById('kreezby-backup-note');
        if (download && window.KreezbyMaintenanceSettings && KreezbyMaintenanceSettings.exportBackup) {
            download.onclick = function () {
                var blob = new Blob([JSON.stringify(KreezbyMaintenanceSettings.exportBackup(), null, 2)], { type: 'application/json' });
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'kreezby-backup.json';
                link.click();
                URL.revokeObjectURL(link.href);
                if (note) note.textContent = 'Backup downloaded. Keep the file somewhere safe.';
            };
        }
        if (file && window.KreezbyMaintenanceSettings && KreezbyMaintenanceSettings.restoreBackup) {
            file.onchange = function () {
                var chosen = file.files && file.files[0];
                if (!chosen) return;
                var reader = new FileReader();
                reader.onload = function () {
                    var result;
                    try {
                        result = KreezbyMaintenanceSettings.restoreBackup(JSON.parse(String(reader.result || '{}')));
                    } catch (e) {
                        result = { ok: false, message: 'That file could not be read.' };
                    }
                    if (note) note.textContent = result.message;
                    if (result.ok) window.location.reload();
                };
                reader.readAsText(chosen);
            };
        }
    }

    function refreshMetrics() {
        if (!window.KreezbyMaintenanceSettings) return;
        var c = KreezbyMaintenanceSettings.getAccountCounts();
        var map = {
            'metric-customers-count': c.customers,
            'metric-retailers-count': c.retailers,
            'metric-staff-count': c.staff,
            'metric-admins-count': c.admins
        };
        Object.keys(map).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = map[id];
        });
    }

    var currentDirectory = 'retailer';

    var DIRECTORY = {
        supplier: { bucket: 'suppliers', title: 'Suppliers', detail: 'Contact', detailOf: function (u) { return u.contact || '—'; }, accountOf: function (u) { return u.email || '—'; } },
        retailer: { bucket: 'retailers', title: 'Retailers', detail: 'Area', detailOf: function (u) { return u.area || '—'; }, accountOf: function (u) { return u.email || '—'; } },
        customer: { bucket: 'customers', title: 'Customers', detail: 'Phone', detailOf: function (u) { return u.phone || '—'; }, accountOf: function (u) { return u.email || '—'; } },
        staff: { bucket: 'staff', title: 'Staff', detail: 'Job', detailOf: function (u) { return u.role || '—'; }, accountOf: function (u) { return u.username || '—'; } },
        admins: { bucket: 'admins', title: 'Admins', detail: 'Job', detailOf: function (u) { return u.role || '—'; }, accountOf: function (u) { return u.username || '—'; } }
    };

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function readSession() {
        try {
            return JSON.parse(localStorage.getItem('kreezby_session') || '{}');
        } catch (e) {
            return {};
        }
    }

    function canManageAccounts() {
        var session = readSession();
        var type = session.accountType || '';
        if (type === 'Staff' || type === 'Customer' || type === 'Retailer' || type === 'Regular Customer') {
            return false;
        }
        if (type === 'Head Administrator' || type === 'Administrator' || type === 'Admin') return true;
        var path = (window.location.pathname || '').toLowerCase();
        return path.indexOf('/head_admin/') >= 0 || path.indexOf('/admin/') >= 0;
    }

    function ensureDirectoryChrome() {
        var grid = document.querySelector('.maintenance-overview-grid');
        if (!grid || grid.dataset.kreezbyAccounts === '1') return;
        grid.dataset.kreezbyAccounts = '1';

        document.querySelectorAll('.overview-card-box').forEach(function (card) {
            var metric = card.querySelector('[id]');
            var metricId = metric ? metric.id : '';
            var label = ((card.querySelector('label, .overview-card-label') || {}).textContent || '').toLowerCase();
            var dir = (card.getAttribute('data-maint-dir') || '').toLowerCase();
            if (dir === 'supplier' || metricId === 'metric-suppliers-count' || label.indexOf('supplier') >= 0) card.remove();
        });
        document.querySelectorAll('.maintenance-directory-tabs-row .maintenance-tab-link').forEach(function (btn) {
            var tab = (btn.getAttribute('data-maint-tab') || '').toLowerCase();
            var click = (btn.getAttribute('onclick') || '').toLowerCase();
            var label = (btn.textContent || '').toLowerCase();
            if (tab === 'supplier' || click.indexOf('supplier') >= 0 || label.indexOf('supplier') >= 0) btn.remove();
        });

        var specs = [
            { dir: 'retailer', id: 'metric-retailers-count', label: 'Retailers', theme: '' },
            { dir: 'customer', id: 'metric-customers-count', label: 'Customers', theme: '' },
            { dir: 'staff', id: 'metric-staff-count', label: 'Staff', theme: '' },
            { dir: 'admins', id: 'metric-admins-count', label: 'Admins', theme: '' }
        ];

        specs.forEach(function (spec) {
            var card = grid.querySelector('[data-maint-dir="' + spec.dir + '"]');
            if (!card) {
                var span = document.getElementById(spec.id);
                card = span ? span.closest('.overview-card-box') : null;
            }
            if (!card) {
                card = document.createElement('button');
                card.type = 'button';
                card.className = 'overview-card-box';
                card.innerHTML = '<span class="overview-card-label">' + spec.label + '</span><span id="' + spec.id + '">0</span>';
                grid.appendChild(card);
            } else if (card.tagName !== 'BUTTON') {
                card.setAttribute('role', 'button');
                card.tabIndex = 0;
            }
            card.classList.add('is-account-card');
            card.setAttribute('data-maint-dir', spec.dir);
            card.setAttribute('aria-label', 'Open ' + spec.label);
        });

        var row = document.querySelector('.maintenance-directory-tabs-row');
        if (row) {
            ['staff', 'admins', 'items', 'settings'].forEach(function (dir) {
                if (row.querySelector('[data-maint-tab="' + dir + '"]')) return;
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'maintenance-tab-link';
                btn.setAttribute('data-maint-tab', dir);
                btn.textContent = dir === 'items' ? 'Item List' : (dir === 'settings' ? 'Settings' : DIRECTORY[dir].title);
                row.appendChild(btn);
            });
        }

        if (!document.getElementById('kreezby-account-card-style')) {
            var style = document.createElement('style');
            style.id = 'kreezby-account-card-style';
            style.textContent = '.overview-card-box.is-account-card{cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%;}'
                + '.maint-account-row{cursor:pointer;}';
            document.head.appendChild(style);
        }
    }

    function markSelected(dir, tabNode) {
        document.querySelectorAll('.overview-card-box[data-maint-dir]').forEach(function (card) {
            card.classList.toggle('is-selected', card.getAttribute('data-maint-dir') === dir);
        });
        var row = document.querySelector('.maintenance-directory-tabs-row');
        if (!row) return;
        row.querySelectorAll('.maintenance-tab-link').forEach(function (btn) {
            btn.classList.remove('active-tab');
        });
        if (tabNode) tabNode.classList.add('active-tab');
        else {
            var match = row.querySelector('[data-maint-tab="' + dir + '"]') || row.querySelector('[onclick*="' + dir + '"]');
            if (match) match.classList.add('active-tab');
        }
    }

    var DIRECTORY_VIEW = {
        supplier: {
            add: 'Supplier',
            modal: 'Supplier',
            headers: ['#', 'Supplier Name', 'Contact Person', 'Email', 'Action'],
            cells: function (user) {
                return [user.name, user.contact || '—', user.email || '—'];
            }
        },
        retailer: {
            add: 'Retailer',
            modal: 'Retailer',
            headers: ['#', 'Retailer Branch Name', 'Area Location', 'Sync Connection', 'Action'],
            cells: function (user, on) {
                var sync = '<span class="status-pill-badge ' + (on ? 'received' : 'rejected') + '">' + (on ? 'ACTIVE SYNC' : 'INACTIVE') + '</span>';
                return [user.name, user.area || '—', sync];
            }
        },
        customer: {
            add: 'Customer',
            modal: 'Customer',
            headers: ['#', 'Customer Name', 'Phone', 'Email', 'Action'],
            cells: function (user) {
                return [user.name, user.phone || user.contact || '—', user.email || '—'];
            }
        },
        staff: {
            add: 'Staff',
            modal: 'User Account',
            headers: ['#', 'Account Name', 'Username', 'Assigned Role', 'Action'],
            cells: function (user) {
                return [user.name, user.username || '—', user.role || '—'];
            }
        },
        admins: {
            add: 'Admin',
            modal: 'User Account',
            headers: ['#', 'Account Name', 'Username', 'Assigned Role', 'Action'],
            cells: function (user) {
                return [user.name, user.username || '—', user.role || '—'];
            }
        }
    };

    var directoryPageSize = 10;
    var directoryPage = 0;
    var currentPanel = 'directory';
    var pendingSave = '';
    var ITEM_KEY = 'kreezby-maintenance-items-v1';
    var DEFAULT_ITEMS = [
        { id: 'CRK-CHO-P', name: 'Chocolate Crinkles', pack: 'Pouch (8 Pcs)', rate: 165 },
        { id: 'CRK-ALM-P', name: 'Choco-Almond Crinkles', pack: 'Pouch (8 Pcs)', rate: 175 },
        { id: 'CRK-LEM-P', name: 'Lemon Crinkles', pack: 'Pouch (8 Pcs)', rate: 155 },
        { id: 'CRK-BUT-J', name: 'Choco Butternut Crinkles', pack: 'Jar (250g Container)', rate: 210 },
        { id: 'CRK-MNG-J', name: 'Mango Crinkles', pack: 'Jar (250g Container)', rate: 190 },
        { id: 'CRK-UBE-P', name: 'Ube Crinkles', pack: 'Pouch (8 Pcs)', rate: 170 }
    ];

    function loadItems() {
        try {
            var raw = localStorage.getItem(ITEM_KEY);
            if (raw != null) {
                var saved = JSON.parse(raw);
                if (Array.isArray(saved)) return saved;
            }
        } catch (e) {}
        return DEFAULT_ITEMS.map(function (item) { return Object.assign({}, item); });
    }

    function saveItems(list) {
        localStorage.setItem(ITEM_KEY, JSON.stringify(list));
    }

    function pageWindow(total) {
        var pages = Math.max(1, Math.ceil(total / directoryPageSize) || 1);
        if (directoryPage >= pages) directoryPage = pages - 1;
        if (directoryPage < 0) directoryPage = 0;
        var start = directoryPage * directoryPageSize;
        return { start: start, end: Math.min(total, start + directoryPageSize), pages: pages, total: total };
    }

    function pagerHtml(info) {
        var from = info.total ? info.start + 1 : 0;
        return '<div class="maint-pager"><span>Showing ' + from + '–' + info.end + ' of ' + info.total + '</span>'
            + '<div class="maint-pager-nav">'
            + '<button type="button" id="maint-page-prev"' + (directoryPage <= 0 ? ' disabled' : '') + '>Previous</button>'
            + '<button type="button" id="maint-page-next"' + (directoryPage >= info.pages - 1 ? ' disabled' : '') + '>Next</button>'
            + '</div></div>';
    }

    function bindPager(rerender) {
        var prev = document.getElementById('maint-page-prev');
        var next = document.getElementById('maint-page-next');
        if (prev) prev.onclick = function () {
            if (directoryPage <= 0) return;
            directoryPage -= 1;
            rerender();
        };
        if (next) next.onclick = function () {
            directoryPage += 1;
            rerender();
        };
    }

    function bindPageSize(rerender) {
        var sizeSelect = document.getElementById('maint-page-size');
        if (!sizeSelect) return;
        sizeSelect.onchange = function () {
            directoryPageSize = Number(sizeSelect.value) || 10;
            directoryPage = 0;
            rerender();
        };
    }

    function actionMenu(user, spec, on, manage) {
        var locked = spec.bucket === 'admins' && KreezbyMaintenanceSettings.isHeadAdminAccount(user);
        if (locked) {
            return '<button type="button" class="maint-action-btn" disabled>Head admin</button>';
        }
        var next = on ? '0' : '1';
        var verb = on ? 'Deactivate' : 'Activate';
        var danger = on ? ' is-danger' : '';
        var disabled = manage ? '' : ' disabled';
        return '<div class="maint-action">'
            + '<button type="button" class="maint-action-btn" data-maint-menu="' + esc(user.id) + '">Action ▾</button>'
            + '<div class="maint-action-menu" hidden>'
            + '<button type="button" data-account-view="' + esc(user.id) + '" data-account-bucket="' + spec.bucket + '">View</button>'
            + '<button type="button" class="' + danger.trim() + '" data-account-toggle="' + esc(user.id) + '" data-account-bucket="' + spec.bucket + '" data-next-active="' + next + '"' + disabled + '>' + verb + '</button>'
            + '</div></div>';
    }

    function renderDirectory(dir) {
        var spec = DIRECTORY[dir];
        var view = DIRECTORY_VIEW[dir];
        var root = document.getElementById('maintenance-grid-workspace-root');
        if (!spec || !view || !root || !window.KreezbyMaintenanceSettings) return;
        var users = (KreezbyMaintenanceSettings.getUsers()[spec.bucket] || []).filter(function (user) {
            return !user.archived;
        });
        var manage = canManageAccounts();
        var info = pageWindow(users.length);
        var shown = users.slice(info.start, info.end);
        var rows = shown.map(function (user, index) {
            var on = user.active !== false;
            var cells = view.cells(user, on).map(function (value, cellIndex) {
                var text = cellIndex === 0 ? '<strong>' + esc(value) + '</strong>' : value;
                if (cellIndex === 0) return '<td data-label="' + esc(view.headers[1]) + '">' + text + '</td>';
                if (String(value).indexOf('<span') === 0) return '<td data-label="' + esc(view.headers[cellIndex + 1]) + '">' + value + '</td>';
                return '<td data-label="' + esc(view.headers[cellIndex + 1]) + '">' + esc(value) + '</td>';
            }).join('');
            return '<tr class="maint-account-row" data-account-row="' + esc(user.id) + '" data-account-bucket="' + spec.bucket + '">'
                + '<td data-label="#">' + (info.start + index + 1) + '</td>'
                + cells
                + '<td data-label="Action">' + actionMenu(user, spec, on, manage) + '</td></tr>';
        }).join('');
        var sizeOptions = [10, 25, 50].map(function (size) {
            return '<option' + (size === directoryPageSize ? ' selected' : '') + '>' + size + '</option>';
        }).join('');
        var addButton = manage
            ? '<button type="button" class="btn-add-item" id="maint-add-account">+ Add New ' + esc(view.add) + '</button>'
            : '';
        root.innerHTML = ''
            + '<div class="maintenance-sub-view">'
            + '<div id="maint-account-detail" class="maint-account-detail" hidden></div>'
            + '<div class="datatable-controls-bar"><div>Show <select id="maint-page-size">' + sizeOptions + '</select> entries</div>' + addButton + '</div>'
            + '<table class="data-display-table"><thead><tr>'
            + view.headers.map(function (header) { return '<th>' + esc(header) + '</th>'; }).join('')
            + '</tr></thead><tbody>' + (rows || '<tr class="kreezby-phone-span"><td colspan="' + view.headers.length + '">No accounts in this list.</td></tr>') + '</tbody></table>'
            + pagerHtml(info)
            + '</div>';
        root.setAttribute('data-maint-live', '1');
        bindPageSize(function () { renderDirectory(currentDirectory); });
        bindPager(function () { renderDirectory(currentDirectory); });
        var addBtn = document.getElementById('maint-add-account');
        if (addBtn && typeof window.toggleMaintenanceFormModal === 'function') {
            addBtn.onclick = function () {
                pendingSave = currentDirectory;
                window.toggleMaintenanceFormModal(true, view.modal || view.add);
            };
        }
    }

    function renderItems(tabNode) {
        currentPanel = 'items';
        var row = document.querySelector('.maintenance-directory-tabs-row');
        var tab = tabNode || (row && row.querySelector('[data-maint-tab="items"]'));
        markSelected('', tab);
        var root = document.getElementById('maintenance-grid-workspace-root');
        if (!root) return;
        var items = loadItems();
        var info = pageWindow(items.length);
        var shown = items.slice(info.start, info.end);
        var manage = canManageAccounts();
        var rows = shown.map(function (item, index) {
            var menu = '<div class="maint-action">'
                + '<button type="button" class="maint-action-btn" data-maint-menu="' + esc(item.id) + '">Action ▾</button>'
                + '<div class="maint-action-menu" hidden>'
                + '<button type="button" data-item-view="' + esc(item.id) + '">View</button>'
                + (manage ? '<button type="button" class="is-danger" data-item-remove="' + esc(item.id) + '">Remove</button>' : '')
                + '</div></div>';
            return '<tr><td>' + (info.start + index + 1) + '</td><td>' + esc(item.id) + '</td><td><strong>' + esc(item.name) + '</strong></td><td>' + esc(item.pack || '—') + '</td><td>' + esc(item.rate) + '</td><td>' + menu + '</td></tr>';
        }).join('');
        var sizeOptions = [10, 25, 50].map(function (size) {
            return '<option' + (size === directoryPageSize ? ' selected' : '') + '>' + size + '</option>';
        }).join('');
        var addButton = manage ? '<button type="button" class="btn-add-item" id="maint-add-item">+ Add New Flavor Item</button>' : '';
        root.innerHTML = ''
            + '<div class="maintenance-sub-view">'
            + '<div id="maint-account-detail" class="maint-account-detail" hidden></div>'
            + '<div class="datatable-controls-bar"><div>Show <select id="maint-page-size">' + sizeOptions + '</select> entries</div>' + addButton + '</div>'
            + '<table class="data-display-table"><thead><tr><th>#</th><th>Item SKU Code</th><th>Flavor Item Description</th><th>Packaging Variant</th><th>Base Rate</th><th>Action</th></tr></thead><tbody>'
            + (rows || '<tr><td colspan="6">No flavor items yet.</td></tr>')
            + '</tbody></table>' + pagerHtml(info) + '</div>';
        root.setAttribute('data-maint-live', '1');
        bindPageSize(renderItems);
        bindPager(renderItems);
        var addBtn = document.getElementById('maint-add-item');
        if (addBtn && typeof window.toggleMaintenanceFormModal === 'function') {
            addBtn.onclick = function () {
                pendingSave = 'item';
                window.toggleMaintenanceFormModal(true, 'Flavor Item');
            };
        }
    }

    function saveFlavorItem(fields) {
        var sku = String(fields.sku || '').trim();
        var name = String(fields.name || '').trim();
        var rate = Number(fields.rate);
        if (!sku || !name) return { ok: false, message: 'SKU and flavor name are required.' };
        if (!isFinite(rate) || rate <= 0) return { ok: false, message: 'Base rate must be greater than zero.' };
        var items = loadItems();
        var duplicate = items.some(function (item) { return String(item.id).toLowerCase() === sku.toLowerCase(); });
        if (duplicate) return { ok: false, message: 'That SKU is already in the item list.' };
        items.push({ id: sku, name: name, pack: fields.pack || 'Pouch (8 Pcs)', rate: rate });
        saveItems(items);
        return { ok: true, message: name + ' was added to the item list.' };
    }

    function showItemDetail(id) {
        var box = document.getElementById('maint-account-detail');
        var item = null;
        loadItems().forEach(function (row) { if (row.id === id) item = row; });
        if (!box || !item) return;
        box.hidden = false;
        box.innerHTML = '<p><strong>' + esc(item.name) + '</strong> · ' + esc(item.id) + '</p>'
            + '<p>Packaging: ' + esc(item.pack || '—') + '</p>'
            + '<p>Base rate: ₱' + esc(item.rate) + '</p>';
    }

    function readModalFields() {
        var root = document.getElementById('dynamic-form-fields-injector');
        var fields = {};
        if (!root) return fields;
        root.querySelectorAll('.form-field-unit').forEach(function (unit) {
            var label = ((unit.querySelector('label') || {}).textContent || '').toLowerCase();
            var input = unit.querySelector('input, select');
            var value = input ? String(input.value || '').trim() : '';
            if (label.indexOf('sku') >= 0) fields.sku = value;
            else if (label.indexOf('flavor') >= 0) fields.name = value;
            else if (label.indexOf('packaging') >= 0) fields.pack = value;
            else if (label.indexOf('rate') >= 0 || label.indexOf('cost') >= 0) fields.rate = value;
            else if (label.indexOf('branch') >= 0 || label.indexOf('customer name') >= 0 || label.indexOf('supplier name') >= 0 || label.indexOf('employee') >= 0 || label.indexOf('full') >= 0) fields.name = value;
            else if (label.indexOf('area') >= 0 || label.indexOf('location') >= 0) fields.area = value;
            else if (label.indexOf('phone') >= 0 || label.indexOf('contact') >= 0) fields.contact = value;
            else if (label.indexOf('email') >= 0) fields.email = value;
            else if (label.indexOf('username') >= 0) fields.username = value;
            else if (label.indexOf('role') >= 0) fields.role = value;
            else if (!fields.name) fields.name = value;
        });
        if (!fields.username && !fields.email && fields.name) {
            fields.username = fields.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        }
        return fields;
    }

    function showAccountDetail(bucket, id) {
        var box = document.getElementById('maint-account-detail');
        var users = KreezbyMaintenanceSettings.getUsers()[bucket] || [];
        var user = null;
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === id) user = users[i];
        }
        if (!box || !user) return;
        box.hidden = false;
        var on = user.active !== false;
        var manage = canManageAccounts();
        var locked = bucket === 'admins' && KreezbyMaintenanceSettings.isHeadAdminAccount(user);
        box.innerHTML = '<p><strong>' + esc(user.name) + '</strong> · ' + esc(user.dictionaryRole || bucket) + '</p>'
            + '<p>Status: ' + (on ? 'Active' : 'Deactivated') + (locked ? ' · Head admin stays active.' : '') + '</p>'
            + (manage ? '' : '<p>Only an admin or head admin can change this.</p>');
    }

    function toggleAccount(bucket, id, active) {
        var box = document.getElementById('maint-account-detail');
        if (!canManageAccounts()) {
            if (box) box.innerHTML = '<p>Only an admin or head admin can activate or deactivate accounts.</p>';
            return;
        }
        var result = KreezbyMaintenanceSettings.setAccountStatus(bucket, id, active);
        refreshMetrics();
        renderDirectory(currentDirectory);
        showAccountDetail(bucket, id);
        box = document.getElementById('maint-account-detail');
        if (box && result && result.message) {
            box.insertAdjacentHTML('beforeend', '<p>' + esc(result.message) + '</p>');
        }
    }

    function placeActionMenu(menu, menuBtn) {
        menu.hidden = false;
        var rect = menuBtn.getBoundingClientRect();
        var width = menu.offsetWidth || 160;
        menu.style.position = 'fixed';
        menu.style.top = Math.round(rect.bottom + 4) + 'px';
        menu.style.left = Math.max(8, Math.round(rect.right - width)) + 'px';
        menu.style.right = 'auto';
        menu.style.zIndex = '4000';
    }

    function openDirectory(dir, tabNode) {
        if (!DIRECTORY[dir]) return;
        if (dir !== currentDirectory || currentPanel !== 'directory') directoryPage = 0;
        currentDirectory = dir;
        currentPanel = 'directory';
        markSelected(dir, tabNode);
        renderDirectory(dir);
    }

    function openSettings(tabNode) {
        currentPanel = 'settings';
        var row = document.querySelector('.maintenance-directory-tabs-row');
        markSelected('', tabNode || (row && row.querySelector('[data-maint-tab="settings"]')));
        initSettingsPanel();
    }

    function wireDirectory() {
        if (!document.getElementById('maintenance-grid-workspace-root')) return;
        ensureDirectoryChrome();
        refreshMetrics();

        if (!window.__kreezbyMaintDelegate) {
            window.__kreezbyMaintDelegate = true;
            document.addEventListener('click', function (ev) {
                var target = ev.target;
                if (!target || !target.closest) return;
                var tab = target.closest('.maintenance-directory-tabs-row .maintenance-tab-link');
                if (tab) {
                    var key = tab.getAttribute('data-maint-tab');
                    if (!key || !document.getElementById('maintenance-grid-workspace-root')) return;
                    if (DIRECTORY[key]) openDirectory(key, tab);
                    else if (key === 'items') renderItems(tab);
                    else if (key === 'settings') openSettings(tab);
                    return;
                }
                var card = target.closest('.maintenance-overview-grid .overview-card-box[data-maint-dir]');
                if (card && document.getElementById('maintenance-grid-workspace-root')) {
                    openDirectory(card.getAttribute('data-maint-dir'));
                }
            }, true);
        }

        var root = document.getElementById('maintenance-grid-workspace-root');
        if (root && root.dataset.kreezbyAccountClicks !== '1') {
            root.dataset.kreezbyAccountClicks = '1';
            root.addEventListener('submit', function (ev) {
                var form = ev.target.closest('#maint-create-account');
                if (!form || !window.KreezbyMaintenanceSettings || !KreezbyMaintenanceSettings.createAccount) return;
                ev.preventDefault();
                var result = KreezbyMaintenanceSettings.createAccount(currentDirectory && DIRECTORY[currentDirectory] ? DIRECTORY[currentDirectory].bucket : '', {
                    name: form.elements.name && form.elements.name.value,
                    username: form.elements.username && form.elements.username.value,
                    role: form.elements.role && form.elements.role.value,
                    email: form.elements.email && form.elements.email.value,
                    contact: form.elements.contact && form.elements.contact.value
                });
                if (result.ok) {
                    refreshMetrics();
                    renderDirectory(currentDirectory);
                }
                var box = document.getElementById('maint-account-detail');
                if (box) box.innerHTML = '<p>' + esc(result.message) + '</p>';
            });
            root.addEventListener('click', function (ev) {
                var menuBtn = ev.target.closest('[data-maint-menu]');
                if (menuBtn) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    var menu = menuBtn.parentNode ? menuBtn.parentNode.querySelector('.maint-action-menu') : null;
                    var willOpen = menu && menu.hidden;
                    root.querySelectorAll('.maint-action-menu').forEach(function (node) { node.hidden = true; });
                    if (menu && willOpen) placeActionMenu(menu, menuBtn);
                    return;
                }
                root.querySelectorAll('.maint-action-menu').forEach(function (node) { node.hidden = true; });
                var viewBtn = ev.target.closest('[data-account-view]');
                if (viewBtn) {
                    ev.preventDefault();
                    showAccountDetail(viewBtn.getAttribute('data-account-bucket'), viewBtn.getAttribute('data-account-view'));
                    return;
                }
                var itemView = ev.target.closest('[data-item-view]');
                if (itemView) {
                    ev.preventDefault();
                    showItemDetail(itemView.getAttribute('data-item-view'));
                    return;
                }
                var itemRemove = ev.target.closest('[data-item-remove]');
                if (itemRemove) {
                    ev.preventDefault();
                    if (!canManageAccounts()) return;
                    var itemId = itemRemove.getAttribute('data-item-remove');
                    var removed = null;
                    loadItems().forEach(function (item) { if (item.id === itemId) removed = item; });
                    if (!removed) return;
                    if (!window.confirm('Remove ' + removed.name + ' from the item list?')) return;
                    saveItems(loadItems().filter(function (item) { return item.id !== itemId; }));
                    renderItems();
                    return;
                }
                var toggle = ev.target.closest('[data-account-toggle]');
                if (toggle) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    toggleAccount(toggle.getAttribute('data-account-bucket'), toggle.getAttribute('data-account-toggle'), toggle.getAttribute('data-next-active') === '1');
                    return;
                }
                if (ev.target.closest('.maint-action')) return;
                var row = ev.target.closest('[data-account-row]');
                if (row) showAccountDetail(row.getAttribute('data-account-bucket'), row.getAttribute('data-account-row'));
            });
        }

        if (!window.__kreezbyMaintDocClick) {
            window.__kreezbyMaintDocClick = true;
            document.addEventListener('click', function (ev) {
                if (ev.target.closest && ev.target.closest('.maint-action')) return;
                document.querySelectorAll('.maint-action-menu').forEach(function (node) { node.hidden = true; });
            });
        }

        var currentSave = window.handleFormSubmissionSave;
        if (!currentSave || !currentSave.__kreezbyMaintSave) {
            var priorSave = currentSave;
            var wrappedSave = function () {
                var title = ((document.getElementById('modal-title-injector') || {}).textContent || '');
                if (pendingSave === 'item' || title.indexOf('Flavor Item') >= 0) {
                    var itemResult = saveFlavorItem(readModalFields());
                    if (!itemResult.ok) {
                        alert(itemResult.message);
                        return;
                    }
                    if (typeof window.toggleMaintenanceFormModal === 'function') window.toggleMaintenanceFormModal(false);
                    pendingSave = '';
                    renderItems();
                    var itemBox = document.getElementById('maint-account-detail');
                    if (itemBox) {
                        itemBox.hidden = false;
                        itemBox.innerHTML = '<p>' + esc(itemResult.message) + '</p>';
                    }
                    return;
                }
                var saveKey = DIRECTORY[pendingSave] ? pendingSave : currentDirectory;
                var view = DIRECTORY_VIEW[saveKey];
                var modalName = view ? (view.modal || view.add) : '';
                if (!view || !DIRECTORY[saveKey] || title.indexOf(modalName) < 0) {
                    if (typeof priorSave === 'function') priorSave();
                    return;
                }
                var result = KreezbyMaintenanceSettings.createAccount(DIRECTORY[saveKey].bucket, readModalFields());
                if (!result.ok) {
                    alert(result.message);
                    return;
                }
                if (typeof window.toggleMaintenanceFormModal === 'function') window.toggleMaintenanceFormModal(false);
                pendingSave = '';
                refreshMetrics();
                currentDirectory = saveKey;
                currentPanel = 'directory';
                var savedUsers = (KreezbyMaintenanceSettings.getUsers()[DIRECTORY[saveKey].bucket] || []).filter(function (user) {
                    return !user.archived;
                });
                directoryPage = Math.max(0, Math.ceil(savedUsers.length / directoryPageSize) - 1);
                markSelected(saveKey);
                renderDirectory(saveKey);
                var box = document.getElementById('maint-account-detail');
                if (box) {
                    box.hidden = false;
                    box.innerHTML = '<p>' + esc(result.message) + '</p>';
                }
            };
            wrappedSave.__kreezbyMaintSave = true;
            window.handleFormSubmissionSave = wrappedSave;
        }

        var currentTabSwitch = window.switchMaintenanceDataTab;
        if (currentTabSwitch && !currentTabSwitch.__kreezbyMaintWrapped) {
            var previous = currentTabSwitch;
            var wrapped = function (tabNode, directoryKey) {
                if (directoryKey === 'items') {
                    renderItems(tabNode);
                    return;
                }
                if (directoryKey === 'settings') {
                    openSettings(tabNode);
                    return;
                }
                if (DIRECTORY[directoryKey]) {
                    openDirectory(directoryKey, tabNode);
                    return;
                }
                if (typeof previous === 'function') previous(tabNode, directoryKey);
            };
            wrapped.__kreezbyMaintWrapped = true;
            window.switchMaintenanceDataTab = wrapped;
        }

        window.KreezbyMaintenanceDirectory = openDirectory;
        if (root && root.getAttribute('data-maint-live') !== '1') {
            openDirectory('retailer');
        }
    }

    function openTab(directoryKey, tabNode) {
        if (DIRECTORY[directoryKey]) openDirectory(directoryKey, tabNode);
        else if (directoryKey === 'items') renderItems(tabNode);
        else if (directoryKey === 'settings') openSettings(tabNode);
    }

    function upgradeCustomer(customerId, role) {
        if (role !== 'retailer') return;
        if (!confirm('Upgrade this customer to Retailer?\n\nTheir customer account will be removed. They will only have retailer portal access.')) return;
        var result = KreezbyMaintenanceSettings.upgradeCustomerToRole(customerId, role);
        alert(result.message);
        if (result.ok) {
            refreshMetrics();
            renderSettingsSub('customers');
        }
    }

    function bootMaintenanceUi() {
        if (!document.getElementById('maintenance-grid-workspace-root')) return;
        refreshMetrics();
        wireDirectory();
    }

    window.KreezbyMaintenanceUI = {
        version: '20261010nosupplier',
        initSettingsPanel: initSettingsPanel,
        refreshMetrics: refreshMetrics,
        upgradeCustomer: upgradeCustomer,
        openTab: openTab,
        boot: bootMaintenanceUi
    };

    if (!window.__kreezbyMaintPageLoad) {
        window.__kreezbyMaintPageLoad = true;
        document.addEventListener('kreezby:page-load', function () {
            if (window.KreezbyMaintenanceUI && document.getElementById('maintenance-grid-workspace-root')) {
                window.KreezbyMaintenanceUI.boot();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootMaintenanceUi);
    } else {
        bootMaintenanceUi();
    }
})();
