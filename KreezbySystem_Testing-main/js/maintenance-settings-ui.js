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
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
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
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
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
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
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
            'metric-admins-count': c.admins,
            'metric-suppliers-count': c.suppliers
        };
        Object.keys(map).forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = map[id];
        });
    }

    var currentDirectory = 'supplier';

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

    function isHeadAdminPage() {
        return (window.location.pathname || '').toLowerCase().indexOf('/head_admin/') >= 0;
    }

    function ensureDirectoryChrome() {
        var grid = document.querySelector('.maintenance-overview-grid');
        if (!grid || grid.dataset.kreezbyAccounts === '1') return;
        grid.dataset.kreezbyAccounts = '1';

        var specs = [
            { dir: 'supplier', id: 'metric-suppliers-count', label: 'Active Suppliers', theme: '' },
            { dir: 'retailer', id: 'metric-retailers-count', label: 'Retailers', theme: 'blue-theme' },
            { dir: 'customer', id: 'metric-customers-count', label: 'Customers', theme: 'green-theme' },
            { dir: 'staff', id: 'metric-staff-count', label: 'Staff', theme: 'staff-theme' },
            { dir: 'admins', id: 'metric-admins-count', label: 'Admins', theme: 'admin-theme' }
        ];
        if (isHeadAdminPage()) {
            specs = specs.filter(function (spec) {
                return spec.dir === 'retailer' || spec.dir === 'customer';
            });
            grid.querySelectorAll('.overview-card-box').forEach(function (card) {
                var metric = card.querySelector('[id]');
                var metricId = metric ? metric.id : '';
                var label = ((card.querySelector('label') || {}).textContent || '').toLowerCase();
                if (metricId === 'metric-suppliers-count' || label.indexOf('supplier') >= 0) {
                    card.remove();
                }
            });
            var supplierTab = document.querySelector('.maintenance-directory-tabs-row [onclick*="\'supplier\'"]');
            if (supplierTab) supplierTab.remove();
        }

        specs.forEach(function (spec) {
            var card = grid.querySelector('[data-maint-dir="' + spec.dir + '"]');
            if (!card) {
                var span = document.getElementById(spec.id);
                card = span ? span.closest('.overview-card-box') : null;
            }
            if (!card) {
                card = document.createElement('button');
                card.type = 'button';
                card.className = 'overview-card-box ' + spec.theme;
                card.innerHTML = '<label>' + spec.label + '</label><span id="' + spec.id + '">0</span>';
                grid.appendChild(card);
            } else if (card.tagName !== 'BUTTON') {
                card.setAttribute('role', 'button');
                card.tabIndex = 0;
            }
            card.classList.add('is-account-card');
            if (spec.theme) card.classList.add(spec.theme);
            card.setAttribute('data-maint-dir', spec.dir);
            card.setAttribute('aria-label', 'Open ' + spec.label);
        });

        var row = document.querySelector('.maintenance-directory-tabs-row');
        if (!isHeadAdminPage() && row && !row.querySelector('[data-maint-tab="staff"]')) {
            ['staff', 'admins'].forEach(function (dir) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'maintenance-tab-link';
                btn.setAttribute('data-maint-tab', dir);
                btn.textContent = DIRECTORY[dir].title;
                var settings = row.querySelector('[onclick*="settings"]');
                if (settings) row.insertBefore(btn, settings);
                else row.appendChild(btn);
                btn.addEventListener('click', function () {
                    openDirectory(dir, btn);
                });
            });
        }

        if (!document.getElementById('kreezby-account-card-style')) {
            var style = document.createElement('style');
            style.id = 'kreezby-account-card-style';
            style.textContent = ''
                + '.maintenance-overview-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));}'
                + '.overview-card-box.is-account-card{cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%;}'
                + '.overview-card-box.is-account-card:hover,.overview-card-box.is-selected{box-shadow:0 2px 10px rgba(93,64,55,.12);}'
                + '.overview-card-box.is-selected{outline:2px solid #5d4037;}'
                + '.overview-card-box.teal-theme{border-left-color:#00897b;}'
                + '.overview-card-box.staff-theme{border-left-color:#6d4c41;}'
                + '.overview-card-box.admin-theme{border-left-color:#1565c0;}'
                + '.maint-account-row{cursor:pointer;}'
                + '.maint-account-detail{margin:0 0 14px;padding:12px 14px;border:1px solid #eadfce;border-radius:12px;background:#fffaf3;}'
                + '.maint-account-detail p{margin:0 0 8px;}'
                + '.maint-status-btn{border:0;border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer;}'
                + '.maint-status-btn.is-off{background:#c62828;color:#fff;}'
                + '.maint-status-btn.is-on{background:#2e7d32;color:#fff;}'
                + '.maint-status-btn:disabled{opacity:.55;cursor:not-allowed;}';
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

    function renderDirectory(dir) {
        var spec = DIRECTORY[dir];
        var root = document.getElementById('maintenance-grid-workspace-root');
        if (!spec || !root || !window.KreezbyMaintenanceSettings) return;
        var users = (KreezbyMaintenanceSettings.getUsers()[spec.bucket] || []).filter(function (user) {
            return !user.archived;
        });
        var manage = canManageAccounts();
        var rows = users.map(function (user, index) {
            var on = user.active !== false;
            var locked = spec.bucket === 'admins' && KreezbyMaintenanceSettings.isHeadAdminAccount(user);
            var action = locked
                ? '<button type="button" class="maint-status-btn is-on" disabled>Head admin</button>'
                : '<button type="button" class="maint-status-btn ' + (on ? 'is-off' : 'is-on') + '" data-account-toggle="' + esc(user.id) + '" data-account-bucket="' + spec.bucket + '" data-next-active="' + (on ? '0' : '1') + '"' + (manage ? '' : ' disabled') + '>' + (on ? 'Deactivate' : 'Activate') + '</button>';
            return '<tr class="maint-account-row" data-account-row="' + esc(user.id) + '" data-account-bucket="' + spec.bucket + '">'
                + '<td data-label="#">' + (index + 1) + '</td>'
                + '<td data-label="Name"><strong>' + esc(user.name) + '</strong></td>'
                + '<td data-label="' + esc(spec.detail) + '">' + esc(spec.detailOf(user)) + '</td>'
                + '<td data-label="Account">' + esc(spec.accountOf(user)) + '</td>'
                + '<td data-label="Status"><span class="status-pill-badge ' + (on ? 'received' : 'rejected') + '">' + (on ? 'Active' : 'Deactivated') + '</span></td>'
                + '<td data-label="Action">' + action + '</td></tr>';
        }).join('');
        var note = manage
            ? 'Select a row or use Activate / Deactivate. A deactivated account stays on file and cannot log in.'
            : 'You can open every account. Only an admin or head admin can activate or deactivate it.';
        var createForm = manage
            ? '<form id="maint-create-account" data-kreezby-native="1" style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:0 0 14px;">'
                + '<label>Name<br><input name="name" required></label>'
                + (spec.bucket === 'staff' || spec.bucket === 'admins'
                    ? '<label>Username<br><input name="username" required></label><label>Role<br><input name="role" placeholder="Job title"></label>'
                    : '<label>Email<br><input name="email" type="email" required></label><label>Contact<br><input name="contact"></label>')
                + '<button type="submit">Add account</button></form>'
            : '';
        root.innerHTML = ''
            + '<div class="maint-account-detail" id="maint-account-detail"><p>Select an account to review it.</p></div>'
            + createForm
            + '<div class="datatable-controls-bar"><div>' + esc(spec.title) + '</div></div>'
            + '<p class="settings-section-desc">' + note + '</p>'
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
            + '<th>#</th><th>Name</th><th>' + esc(spec.detail) + '</th><th>Account</th><th>Status</th><th>Action</th>'
            + '</tr></thead><tbody>' + (rows || '<tr class="kreezby-phone-span"><td colspan="6">No accounts in this list.</td></tr>') + '</tbody></table>';
    }

    function showAccountDetail(bucket, id) {
        var box = document.getElementById('maint-account-detail');
        var users = KreezbyMaintenanceSettings.getUsers()[bucket] || [];
        var user = null;
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === id) user = users[i];
        }
        if (!box || !user) return;
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

    function openDirectory(dir, tabNode) {
        if (!DIRECTORY[dir]) return;
        currentDirectory = dir;
        markSelected(dir, tabNode);
        renderDirectory(dir);
        if (!isHeadAdminPage()) {
            var root = document.getElementById('maintenance-grid-workspace-root');
            if (root && root.scrollIntoView) root.scrollIntoView({ block: 'nearest' });
        }
    }

    function wireDirectory() {
        if (!document.getElementById('maintenance-grid-workspace-root')) return;
        ensureDirectoryChrome();
        refreshMetrics();

        document.querySelectorAll('.overview-card-box[data-maint-dir]').forEach(function (card) {
            if (card.dataset.kreezbyBound === '1') return;
            card.dataset.kreezbyBound = '1';
            if (isHeadAdminPage()) return;
            function go() { openDirectory(card.getAttribute('data-maint-dir')); }
            card.addEventListener('click', go);
            card.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    go();
                }
            });
        });

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
                var toggle = ev.target.closest('[data-account-toggle]');
                if (toggle) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    toggleAccount(toggle.getAttribute('data-account-bucket'), toggle.getAttribute('data-account-toggle'), toggle.getAttribute('data-next-active') === '1');
                    return;
                }
                var row = ev.target.closest('[data-account-row]');
                if (row) showAccountDetail(row.getAttribute('data-account-bucket'), row.getAttribute('data-account-row'));
            });
        }

        var previous = window.switchMaintenanceDataTab;
        window.switchMaintenanceDataTab = function (tabNode, directoryKey) {
            if (DIRECTORY[directoryKey]) {
                openDirectory(directoryKey, tabNode);
                return;
            }
            if (typeof previous === 'function') previous(tabNode, directoryKey);
        };

        window.KreezbyMaintenanceDirectory = openDirectory;
        if (isHeadAdminPage()) openDirectory('retailer');
        else openDirectory('supplier');
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

    window.KreezbyMaintenanceUI = {
        initSettingsPanel: initSettingsPanel,
        refreshMetrics: refreshMetrics,
        upgradeCustomer: upgradeCustomer
    };

    function bootMaintenanceUi() {
        refreshMetrics();
        wireDirectory();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootMaintenanceUi);
    } else {
        bootMaintenanceUi();
    }
})();
