/**
 * Settings panel UI inside Maintenance (login history and accounts).
 */
(function () {
    'use strict';

    var currentSettingsSub = 'login-history';

    var settingsShellHtml = ''
        + '<div class="settings-section-title">System Settings</div>'
        + '<p class="settings-section-desc">Manage user accounts and login activity. Module access is set from Permissions.</p>'
        + '<div class="settings-sub-tabs-row" id="settings-sub-tabs">'
        + '<button type="button" class="settings-sub-tab active-sub" data-sub="login-history">Login History</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="customers">Customers</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="retailers">Retailers</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="areas">Areas</button>'
        + '</div>'
        + '<form id="settings-search-form" class="kz-settings-tools" data-kreezby-native="1">'
        + '<label class="kz-settings-field"><span>Search</span><input type="search" id="settings-search-input" placeholder="Name, email, area…"></label>'
        + '<label class="kz-settings-field"><span id="settings-filter-label">Filter</span><select id="settings-filter-select"><option value="">All</option></select></label>'
        + '<button type="submit" class="kz-settings-btn" id="settings-search-btn">Search</button>'
        + '<button type="button" class="kz-settings-btn kz-settings-btn--ghost" id="settings-clear-btn">Clear</button>'
        + '<span id="settings-search-count" class="kz-settings-count"></span>'
        + '</form>'
        + '<div id="settings-sub-content"></div>'
        + '<div id="kreezby-backup-tools" style="margin-top:18px;">'
        + '<h4 class="settings-section-title">Backup and restore</h4>'
        + '<p class="settings-section-desc">Download inventory, sales, orders, accounts, and issue reports, or put a saved backup back.</p>'
        + '<button type="button" class="kz-settings-btn" id="kreezby-backup-download">Download backup</button> '
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
        var rows = users.customers.map(function (c, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + c.user_id + '</td><td><strong>' + c.name + '</strong></td><td>' + c.dictionaryRole + '</td><td>Hashed</td><td>' + (c.email || '—') + '</td><td>' + (c.phone || '—') + '</td><td>' + (c.address || '—') + '</td><td>' + (c.area || '—') + '</td><td>' + (c.joined || '—') + '</td><td>'
                + '<button type="button" class="btn-upgrade" onclick="KreezbyMaintenanceUI.upgradeCustomer(\'' + c.id + '\',\'retailer\')">→ Retailer</button>'
                + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Customer Accounts</h4>'
            + '<p class="settings-section-desc">Upgrade a customer to retailer. Their customer account will be removed and they receive partner access instead.</p>'
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
            + '<th>#</th><th>User ID</th><th>Name</th><th>Role</th><th>Password</th><th>Email</th><th>Phone</th><th>Address</th><th>Area</th><th>Joined</th><th>Grant Access</th>'
            + '</tr></thead><tbody>' + (rows || '<tr><td colspan="11">No customer accounts.</td></tr>') + '</tbody></table>';
    }

    function renderRetailers() {
        var list = window.KreezbyMaintenanceSettings.getUsers().retailers;
        var rows = list.map(function (r, i) {
            var note = r.upgradedFrom ? '<span style="font-size:11px;color:#7c4dff;">Upgraded from customer</span>' : '—';
            return '<tr><td>' + (i + 1) + '</td><td>' + r.user_id + '</td><td><strong>' + r.name + '</strong></td><td>' + r.dictionaryRole + '</td><td>Hashed</td><td>' + esc(r.contact || r.phone || '—') + '</td><td>' + esc(r.email || '—') + '</td><td>' + esc(r.area || '—') + '</td><td>' + note + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Retailer Accounts</h4>'
            + '<p class="settings-section-desc">Partner retailers with inventory and order portal access.</p>'
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
            + '<th>#</th><th>User ID</th><th>Business Name</th><th>Role</th><th>Password</th><th>Contact</th><th>Email</th><th>Area</th><th>Source</th>'
            + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    // ---- Areas (Settings > Areas) ---------------------------------------------------------
    var AREAS_KEY = 'kreezby_areas_v1';
    var BASE_AREAS = ['Batangas', 'Bauan', 'Citimart', 'Lipa', 'Lucena', 'Manila', 'Rosario', 'Sto. Tomas', 'Tagaytay'];

    function savedAreas() {
        try {
            var list = JSON.parse(localStorage.getItem(AREAS_KEY) || '[]');
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function areaKey(name) {
        return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    // Delivery areas, areas already on customer/retailer accounts, and areas added here.
    function allAreas() {
        var seen = {};
        var list = [];
        function take(name, source) {
            var label = String(name || '').trim();
            var key = areaKey(label);
            if (!key || seen[key]) return;
            seen[key] = true;
            list.push({ name: label, source: source });
        }
        BASE_AREAS.forEach(function (name) { take(name, 'Delivery area'); });
        savedAreas().forEach(function (row) { take(row && row.name, 'Added in Settings'); });
        if (window.KreezbyMaintenanceSettings) {
            var users = KreezbyMaintenanceSettings.getUsers();
            (users.customers || []).concat(users.retailers || []).forEach(function (u) { take(u.area, 'From accounts'); });
        }
        return list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    function addArea(name) {
        var label = String(name || '').trim().replace(/\s+/g, ' ');
        if (!label) return { ok: false, message: 'Type the area name first.' };
        if (label.length > 60) return { ok: false, message: 'Keep the area name under 60 characters.' };
        var exists = allAreas().some(function (a) { return areaKey(a.name) === areaKey(label); });
        if (exists) return { ok: false, message: label + ' is already on the list.' };
        var list = savedAreas();
        var session = readSession();
        list.push({ name: label, addedAt: new Date().toISOString(), addedBy: session.name || session.username || 'Head Admin' });
        try { localStorage.setItem(AREAS_KEY, JSON.stringify(list)); } catch (e) { return { ok: false, message: 'The area could not be saved.' }; }
        return { ok: true, message: label + ' was added. It can now be picked when adding a customer or retailer.' };
    }

    function renderAreas() {
        var users = window.KreezbyMaintenanceSettings ? KreezbyMaintenanceSettings.getUsers() : {};
        var rows = allAreas().map(function (area, i) {
            var key = areaKey(area.name);
            var customers = (users.customers || []).filter(function (u) { return areaKey(u.area) === key; }).length;
            var retailers = (users.retailers || []).filter(function (u) { return areaKey(u.area) === key; }).length;
            return '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(area.name) + '</strong></td><td>' + esc(area.source) + '</td><td>' + customers + '</td><td>' + retailers + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Areas</h4>'
            + '<p class="settings-section-desc">Areas used for customer and retailer accounts.</p>'
            + '<form id="settings-add-area" data-kreezby-native="1" style="margin:0 0 12px;">'
            + '<label class="kz-settings-field"><span>Area name</span><input name="area" maxlength="60" required placeholder="e.g. San Juan"></label>'
            + '<button type="submit">Add Area</button>'
            + '<span id="settings-area-note" style="font-size:12px;color:#5d4037;"></span>'
            + '</form>'
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
            + '<th>#</th><th>Area</th><th>Source</th><th>Customers</th><th>Retailers</th>'
            + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    // Which column the Filter dropdown filters on, per Settings tab (matched by header text).
    var FILTER_COLUMNS = {
        'login-history': 'Account Type',
        retailers: 'Area',
        areas: 'Source'
    };

    function filterColumnIndex(root) {
        var want = String(FILTER_COLUMNS[currentSettingsSub] || '').toLowerCase();
        var heads = root.querySelectorAll('table thead th');
        for (var i = 0; i < heads.length; i++) {
            if ((heads[i].textContent || '').trim().toLowerCase() === want) return i;
        }
        return -1;
    }

    // Fills the Filter dropdown with the values found in the open table.
    function fillSettingsFilter() {
        var select = document.getElementById('settings-filter-select');
        var label = document.getElementById('settings-filter-label');
        var root = document.getElementById('settings-sub-content');
        if (!select || !root) return;
        var col = filterColumnIndex(root);
        if (label) label.textContent = col >= 0 ? 'Filter by ' + FILTER_COLUMNS[currentSettingsSub] : 'Filter';
        var values = {};
        if (col >= 0) {
            root.querySelectorAll('table tbody tr').forEach(function (tr) {
                var cell = tr.children[col];
                var text = cell ? (cell.textContent || '').trim() : '';
                if (text && text !== '—') values[text] = true;
            });
        }
        select.innerHTML = '<option value="">All</option>' + Object.keys(values).sort().map(function (v) {
            return '<option value="' + esc(v) + '">' + esc(v) + '</option>';
        }).join('');
        select.disabled = col < 0;
        // Tabs without a filter (e.g. Customers) show the search box only.
        var field = select.closest('.kz-settings-field');
        if (field) field.style.display = col < 0 ? 'none' : '';
    }

    // Filters the rows of the table on the open Settings tab by the search text and the filter.
    function applySettingsSearch() {
        var input = document.getElementById('settings-search-input');
        var select = document.getElementById('settings-filter-select');
        var root = document.getElementById('settings-sub-content');
        var count = document.getElementById('settings-search-count');
        if (!input || !root) return;
        var q = String(input.value || '').toLowerCase().trim();
        var pick = select ? select.value : '';
        var col = filterColumnIndex(root);
        var rows = root.querySelectorAll('table tbody tr');
        var shown = 0;
        rows.forEach(function (tr) {
            var cell = col >= 0 ? tr.children[col] : null;
            var okFilter = !pick || (cell && (cell.textContent || '').trim() === pick);
            var okSearch = !q || (tr.textContent || '').toLowerCase().indexOf(q) >= 0;
            var match = okFilter && okSearch;
            tr.style.display = match ? '' : 'none';
            if (match) shown += 1;
        });
        if (count) count.textContent = (q || pick) ? (shown + ' of ' + rows.length + ' shown') : rows.length + ' total';
    }

    function ensureSettingsToolStyles() {
        if (document.getElementById('kz-settings-tools-style')) return;
        var st = document.createElement('style');
        st.id = 'kz-settings-tools-style';
        st.textContent = ''
            + '.kz-settings-tools{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:14px 0;padding:12px 14px;border:1px solid #eadfce;border-radius:12px;background:#fffaf3;}'
            + '.kz-settings-field{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#5d4037;}'
            + '.kz-settings-field input,.kz-settings-field select{height:36px;min-width:200px;padding:0 10px;border:1px solid #e4d8c4;border-radius:8px;background:#fff;font:inherit;font-weight:500;color:#3e2723;}'
            + '.kz-settings-btn{height:36px;padding:0 18px;border:0;border-radius:999px;background:#5d4037;color:#fff;font-weight:700;cursor:pointer;}'
            + '.kz-settings-btn:hover{background:#4e342e;}'
            + '.kz-settings-btn--ghost{background:#fff;color:#5d4037;border:1px solid #c4b4a4;}'
            + '.kz-settings-btn--ghost:hover{background:#f6efe6;}'
            + '.kz-settings-count{font-size:12px;color:#7a6558;align-self:center;}'
            + '#settings-add-area{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;}'
            + '#settings-add-area input{height:36px;min-width:220px;padding:0 10px;border:1px solid #e4d8c4;border-radius:8px;}'
            + '#settings-add-area button{height:36px;padding:0 18px;border:0;border-radius:999px;background:#5d4037;color:#fff;font-weight:700;cursor:pointer;}'
            + '@media (max-width:600px){.kz-settings-field,.kz-settings-field input,.kz-settings-field select{width:100%;min-width:0;}}';
        document.head.appendChild(st);
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
        else if (subKey === 'areas') root.innerHTML = renderAreas();
        fillSettingsFilter();
        applySettingsSearch();
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

        ensureSettingsToolStyles();
        var searchForm = document.getElementById('settings-search-form');
        var searchInput = document.getElementById('settings-search-input');
        var filterSelect = document.getElementById('settings-filter-select');
        var clearBtn = document.getElementById('settings-clear-btn');
        if (searchForm) searchForm.onsubmit = function (ev) { ev.preventDefault(); applySettingsSearch(); };
        if (searchInput) searchInput.oninput = applySettingsSearch;
        if (filterSelect) filterSelect.onchange = applySettingsSearch;
        if (clearBtn) clearBtn.onclick = function () {
            if (searchInput) searchInput.value = '';
            if (filterSelect) filterSelect.value = '';
            applySettingsSearch();
        };
        var subRoot = document.getElementById('settings-sub-content');
        if (subRoot) {
            subRoot.onsubmit = function (ev) {
                var form = ev.target.closest('#settings-add-area');
                if (!form) return;
                ev.preventDefault();
                var result = addArea(form.elements.area.value);
                if (result.ok) {
                    renderSettingsSub('areas');
                }
                var note = document.getElementById('settings-area-note');
                if (note) note.textContent = result.message;
            };
        }

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

    var currentDirectory = 'retailer';
    // Search text and area filter for the open account list; kept while the list re-renders.
    var directorySearch = '';
    var directoryArea = '';

    var DIRECTORY = {
        supplier: { bucket: 'suppliers', title: 'Suppliers', detail: 'Contact', detailOf: function (u) { return u.contact || '—'; }, accountOf: function (u) { return u.email || '—'; } },
        retailer: { bucket: 'retailers', title: 'Retailers', detail: 'Area', detailOf: function (u) { return u.area || '—'; }, accountOf: function (u) { return u.username || u.contact || '—'; } },
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

    function directoryChromeComplete(grid) {
        if (!grid || grid.dataset.kreezbyAccounts !== '1') return false;
        var dirs = ['retailer', 'customer', 'staff', 'admins'];
        for (var i = 0; i < dirs.length; i++) {
            if (!grid.querySelector('[data-maint-dir="' + dirs[i] + '"]')) return false;
        }
        return true;
    }

    function ensureDirectoryChrome() {
        var grid = document.querySelector('.maintenance-overview-grid');
        if (!grid || directoryChromeComplete(grid)) return;
        grid.dataset.kreezbyAccounts = '1';

        grid.querySelectorAll('.overview-card-box').forEach(function (card) {
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
            { dir: 'retailer', id: 'metric-retailers-count', label: 'Retailers', theme: 'blue-theme' },
            { dir: 'customer', id: 'metric-customers-count', label: 'Customers', theme: 'green-theme' },
            { dir: 'staff', id: 'metric-staff-count', label: 'Staff', theme: 'staff-theme' },
            { dir: 'admins', id: 'metric-admins-count', label: 'Admins', theme: 'admin-theme' }
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
            grid.appendChild(card);
        });

        // Staff and Admins open from their cards on top, so they get no duplicate tab here.
        document.querySelectorAll('.maintenance-directory-tabs-row [data-maint-tab="staff"], .maintenance-directory-tabs-row [data-maint-tab="admins"]').forEach(function (btn) {
            btn.remove();
        });

        if (!document.getElementById('kreezby-account-card-style')) {
            var style = document.createElement('style');
            style.id = 'kreezby-account-card-style';
            style.textContent = ''
                + '.maintenance-overview-grid{grid-template-columns:repeat(4,minmax(0,1fr));}'
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
                + '.maint-status-btn:disabled{opacity:.55;cursor:not-allowed;}'
                + '.maint-view-only{font-size:12px;font-weight:700;color:#7a6558;}'
                + '.panel-data-card:has(#maintenance-grid-workspace-root){overflow-x:auto !important;max-width:100%;}'
                + '#maintenance-grid-workspace-root{max-width:100%;overflow-x:auto;}'
                + '#maintenance-grid-workspace-root .data-display-table{width:max-content;min-width:100%;}';
            document.head.appendChild(style);
        }
        ensureSettingsToolStyles();
        if (window.KreezbyExpandingTabs && typeof window.KreezbyExpandingTabs.init === 'function') {
            window.KreezbyExpandingTabs.init();
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

    function areaPicker() {
        return '<label>Area<br><select name="area"><option value="">— choose —</option>' + allAreas().map(function (a) {
            return '<option value="' + esc(a.name) + '">' + esc(a.name) + '</option>';
        }).join('') + '</select></label>';
    }

    function renderDirectory(dir) {
        var spec = DIRECTORY[dir];
        var root = document.getElementById('maintenance-grid-workspace-root');
        if (!spec || !root || !window.KreezbyMaintenanceSettings) return;
        var users = KreezbyMaintenanceSettings.getUsers()[spec.bucket] || [];
        var manage = canManageAccounts();
        // Customers sign up on their own; head admin and admin only monitor the list.
        var monitorOnly = spec.bucket === 'customers';
        var hasArea = spec.bucket === 'retailers';
        var rows = users.map(function (user, index) {
            var on = user.active !== false;
            var locked = spec.bucket === 'admins' && KreezbyMaintenanceSettings.isHeadAdminAccount(user);
            var action = monitorOnly
                ? '<span class="maint-view-only">View only</span>'
                : locked
                ? '<button type="button" class="maint-status-btn is-on" disabled>Protected</button>'
                : '<button type="button" class="maint-status-btn ' + (on ? 'is-off' : 'is-on') + '" data-account-toggle="' + esc(user.id) + '" data-account-bucket="' + spec.bucket + '" data-next-active="' + (on ? '0' : '1') + '"' + (manage ? '' : ' disabled') + '>' + (on ? 'Deactivate' : 'Activate') + '</button>';
            return '<tr class="maint-account-row" data-account-row="' + esc(user.id) + '" data-account-bucket="' + spec.bucket + '" data-account-area="' + esc(user.area || '') + '">'
                + '<td data-label="#">' + (index + 1) + '</td>'
                + '<td data-label="Name"><strong>' + esc(user.name) + '</strong></td>'
                + '<td data-label="' + esc(spec.detail) + '">' + esc(spec.detailOf(user)) + '</td>'
                + '<td data-label="Account">' + esc(spec.accountOf(user)) + '</td>'
                + '<td data-label="Status"><span class="status-pill-badge ' + (on ? 'received' : 'rejected') + '">' + (on ? 'Active' : 'Deactivated') + '</span></td>'
                + '<td data-label="Action">' + action + '</td></tr>';
        }).join('');
        var note = monitorOnly
            ? 'Customers create their own accounts when they sign up. This list is for monitoring only. Select a row to view the customer.'
            : manage
            ? 'Select a row or use Activate / Deactivate. A deactivated account stays on file and cannot log in.'
            : 'You can open every account. Only an authorized account can activate or deactivate it.';
        var createForm = manage && !monitorOnly
            ? '<form id="maint-create-account" data-kreezby-native="1" style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:0 0 14px;">'
                + '<label>Name<br><input name="name" required></label>'
                + (spec.bucket === 'staff' || spec.bucket === 'admins'
                    ? '<label>Username<br><input name="username" required></label><label>Role<br><input name="role" placeholder="Job title"></label>'
                    : (spec.bucket === 'retailers'
                        ? '<label>Contact<br><input name="contact"></label>' + areaPicker()
                        : '<label>Email<br><input name="email" type="email" required></label><label>Contact<br><input name="contact"></label>' + areaPicker()))
                + '<button type="submit">Add account</button></form>'
            : '';
        root.innerHTML = ''
            + '<div class="maint-account-detail" id="maint-account-detail"><p>Select an account to review it.</p></div>'
            + createForm
            + '<div class="datatable-controls-bar"><div>' + esc(spec.title) + '</div></div>'
            + '<p class="settings-section-desc">' + note + '</p>'
            + directoryToolbar(spec, users, hasArea)
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
            + '<th>#</th><th>Name</th><th>' + esc(spec.detail) + '</th><th>Account</th><th>Status</th><th>Action</th>'
            + '</tr></thead><tbody>' + (rows || '<tr class="kreezby-phone-span"><td colspan="6">No accounts in this list.</td></tr>') + '</tbody></table>';
        applyDirectoryFilter();
    }

    // Search bar and area filter shown above an account list (Retailers, Customers, Staff, Admins).
    function directoryToolbar(spec, users, hasArea) {
        var areaOptions = '';
        if (hasArea) {
            var seen = {};
            var names = [];
            allAreas().forEach(function (a) { seen[areaKey(a.name)] = true; names.push(a.name); });
            users.forEach(function (u) {
                var label = String(u.area || '').trim();
                if (label && !seen[areaKey(label)]) { seen[areaKey(label)] = true; names.push(label); }
            });
            names.sort(function (a, b) { return a.localeCompare(b); });
            if (directoryArea && !seen[areaKey(directoryArea)]) directoryArea = '';
            areaOptions = '<label class="kz-settings-field"><span>Filter by Area</span><select id="maint-dir-area">'
                + '<option value="">All areas</option>'
                + names.map(function (n) {
                    return '<option value="' + esc(n) + '"' + (areaKey(n) === areaKey(directoryArea) ? ' selected' : '') + '>' + esc(n) + '</option>';
                }).join('')
                + '</select></label>';
        }
        return '<form id="maint-dir-tools" class="kz-settings-tools" data-kreezby-native="1">'
            + '<label class="kz-settings-field"><span>Search</span><input type="search" id="maint-dir-search" placeholder="Search ' + esc(spec.title.toLowerCase()) + ' by name or account" value="' + esc(directorySearch) + '"></label>'
            + areaOptions
            + '<button type="submit" class="kz-settings-btn">Search</button>'
            + '<button type="button" class="kz-settings-btn kz-settings-btn--ghost" id="maint-dir-clear">Clear</button>'
            + '<span id="maint-dir-count" class="kz-settings-count"></span>'
            + '</form>';
    }

    function applyDirectoryFilter() {
        var root = document.getElementById('maintenance-grid-workspace-root');
        if (!root) return;
        var input = document.getElementById('maint-dir-search');
        var select = document.getElementById('maint-dir-area');
        if (input) directorySearch = input.value || '';
        if (select) directoryArea = select.value || '';
        var q = directorySearch.toLowerCase().trim();
        var area = select ? areaKey(directoryArea) : '';
        var rows = root.querySelectorAll('tr[data-account-row]');
        var shown = 0;
        rows.forEach(function (tr) {
            var okArea = !area || areaKey(tr.getAttribute('data-account-area')) === area;
            var okText = !q || ((tr.textContent || '') + ' ' + (tr.getAttribute('data-account-area') || '')).toLowerCase().indexOf(q) >= 0;
            var match = okArea && okText;
            tr.style.display = match ? '' : 'none';
            if (match) shown += 1;
        });
        var empty = document.getElementById('maint-dir-empty');
        if (empty) empty.remove();
        if (rows.length && !shown) {
            var body = root.querySelector('table.data-display-table tbody');
            if (body) body.insertAdjacentHTML('beforeend', '<tr id="maint-dir-empty"><td colspan="6">No account matches the search or area.</td></tr>');
        }
        var count = document.getElementById('maint-dir-count');
        if (count) count.textContent = (q || area) ? (shown + ' of ' + rows.length + ' shown') : rows.length + ' total';
    }

    // ---- Item List (Maintenance > Item List) ------------------------------------------------
    // Lists every flavor with its selling price. Edit opens the item so head admin / admin can
    // change the price per pouch; the new price is used on the customer menu and in the POS.
    var DICT_SRC = '../js/kreezby-data-dictionary.js?v=20261110stock2';

    function withDictionary(done) {
        if (window.KreezbyDictionary && typeof window.KreezbyDictionary.productCatalog === 'function') {
            done();
            return;
        }
        var existing = document.getElementById('kreezby-maint-dict-script');
        if (existing) {
            existing.addEventListener('load', done);
            return;
        }
        var script = document.createElement('script');
        script.id = 'kreezby-maint-dict-script';
        script.src = DICT_SRC;
        script.onload = done;
        script.onerror = function () {
            var root = document.getElementById('maintenance-grid-workspace-root');
            if (root) root.innerHTML = '<p class="settings-section-desc">The item list could not be loaded. Refresh the page and try again.</p>';
        };
        document.body.appendChild(script);
    }

    function itemRows() {
        var dict = window.KreezbyDictionary;
        return dict && dict.productCatalog ? dict.productCatalog() : [];
    }

    function currentRetailerPrice() {
        var dict = window.KreezbyDictionary;
        return dict && typeof dict.retailerPrice === 'function' ? Number(dict.retailerPrice()) : 140;
    }

    function renderItems(message) {
        var root = document.getElementById('maintenance-grid-workspace-root');
        if (!root) return;
        var retail = currentRetailerPrice();
        var rows = itemRows().map(function (item, i) {
            return '<tr data-item-row="' + esc(item.id) + '">'
                + '<td data-label="#">' + (i + 1) + '</td>'
                + '<td data-label="SKU"><strong>' + esc(item.id) + '</strong></td>'
                + '<td data-label="Flavor">' + esc(item.name) + '</td>'
                + '<td data-label="Packaging">' + esc(item.packaging) + '</td>'
                + '<td data-label="Customer price">₱' + Number(item.price).toFixed(2) + '</td>'
                + '<td data-label="Retailer price">₱' + retail.toFixed(2) + '</td>'
                + '<td data-label="Action"><button type="button" class="maint-status-btn is-on" data-item-edit="' + esc(item.name) + '">Edit</button></td>'
                + '</tr>';
        }).join('');
        root.innerHTML = ''
            + '<div class="maint-account-detail" id="maint-item-detail"><p>' + esc(message || 'Click Edit on an item to change it.') + '</p></div>'
            + '<div class="maint-account-detail" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;">'
            + '<p style="margin:0;"><strong>Retailer price:</strong> ₱' + retail.toFixed(2) + ' per pouch, for every retailer and flavor. It is separate from the customer price.</p>'
            + '<button type="button" class="maint-status-btn is-on" data-retailer-price-edit="1">Edit retailer price</button>'
            + '</div>'
            + '<div class="datatable-controls-bar"><div>Item List</div></div>'
            + '<table class="data-display-table"><thead><tr style="background-color:#e4c9a3;color:#4e342e;">'
            + '<th style="width:50px;">#</th><th>Item SKU Code</th><th>Flavor</th><th>Packaging</th><th>Customer price</th><th>Retailer price</th><th>Action</th>'
            + '</tr></thead><tbody>' + (rows || '<tr><td colspan="7">No items yet.</td></tr>') + '</tbody></table>';
    }

    function openItemEdit(name) {
        var box = document.getElementById('maint-item-detail');
        var dict = window.KreezbyDictionary;
        if (!box || !dict) return;
        var item = itemRows().filter(function (row) { return row.name === name; })[0];
        if (!item) return;
        var canPrice = typeof dict.canEditPrice === 'function' && dict.canEditPrice();
        box.innerHTML = '<form id="maint-item-form" data-kreezby-native="1" data-item-name="' + esc(item.name) + '" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;">'
            + '<label>Item SKU Code<br><input value="' + esc(item.id) + '" readonly></label>'
            + '<label>Flavor<br><input value="' + esc(item.name) + '" readonly></label>'
            + '<label>Packaging<br><input value="' + esc(item.packaging) + '" readonly></label>'
            + (canPrice
                ? '<label>Customer price per pouch (₱)<br><input name="price" type="number" min="1" step="0.01" required value="' + Number(item.price).toFixed(2) + '"></label>'
                    + '<button type="submit">Save changes</button>'
                : '<p>Only head admin and admin can change the price.</p>')
            + '<button type="button" data-item-cancel="1">Cancel</button>'
            + '</form>';
        var input = box.querySelector('input[name="price"]');
        if (input) input.focus();
        var row = document.querySelector('[data-item-row="' + item.id + '"]');
        document.querySelectorAll('[data-item-row]').forEach(function (tr) { tr.style.background = ''; });
        if (row) row.style.background = '#fff4dc';
        if (box.scrollIntoView) box.scrollIntoView({ block: 'nearest' });
    }

    function openRetailerPriceEdit() {
        var box = document.getElementById('maint-item-detail');
        var dict = window.KreezbyDictionary;
        if (!box || !dict) return;
        if (typeof dict.canEditPrice !== 'function' || !dict.canEditPrice()) {
            box.innerHTML = '<p>Only head admin and admin can change the retailer price.</p>';
            return;
        }
        box.innerHTML = '<form id="maint-retailer-price-form" data-kreezby-native="1" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;">'
            + '<label>Retailer price per pouch (₱)<br><input name="retailerPrice" type="number" min="1" step="0.01" required value="' + currentRetailerPrice().toFixed(2) + '"></label>'
            + '<button type="submit">Save retailer price</button>'
            + '<button type="button" data-item-cancel="1">Cancel</button>'
            + '<p style="flex-basis:100%;margin:0;font-size:12px;">Used for retailer delivery collections. Customer prices do not change.</p>'
            + '</form>';
        var input = box.querySelector('input[name="retailerPrice"]');
        if (input) input.focus();
        if (box.scrollIntoView) box.scrollIntoView({ block: 'nearest' });
    }

    function saveRetailerPrice(form) {
        var dict = window.KreezbyDictionary;
        var before = currentRetailerPrice();
        var saved = dict.setRetailerPrice(form.elements.retailerPrice.value);
        if (saved == null) {
            renderItems((dict.lastStockError && dict.lastStockError()) || 'The retailer price could not be saved.');
            return;
        }
        renderItems(saved === before
            ? 'No change: the retailer price is still ₱' + before.toFixed(2) + ' per pouch.'
            : 'Retailer price is now ₱' + saved.toFixed(2) + ' per pouch (was ₱' + before.toFixed(2) + '). Customer prices are unchanged.');
    }

    function saveItemEdit(form) {
        var dict = window.KreezbyDictionary;
        var name = form.getAttribute('data-item-name');
        var price = Number(form.elements.price && form.elements.price.value);
        if (!(price > 0)) {
            form.insertAdjacentHTML('beforeend', '<p>Enter a price above ₱0.</p>');
            return;
        }
        var before = Number(dict.productPrice(name));
        if (before === Number(price.toFixed(2))) {
            renderItems('No change: ' + name + ' is still ₱' + before.toFixed(2) + ' per pouch.');
            return;
        }
        dict.saveProductFields(name, { price: price.toFixed(2) });
        if (Number(dict.productPrice(name)) !== Number(price.toFixed(2))) {
            renderItems('The price for ' + name + ' could not be saved. Try again.');
            return;
        }
        renderItems(name + ' is now ₱' + price.toFixed(2) + ' per pouch (was ₱' + before.toFixed(2) + ').');
    }

    function openItems(tabNode) {
        currentDirectory = '';
        markSelected('', tabNode);
        withDictionary(function () { renderItems(); });
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
            + (user.phone ? '<p>Phone: ' + esc(user.phone) + '</p>' : '')
            + (user.email ? '<p>Email: ' + esc(user.email) + '</p>' : '')
            + (user.address ? '<p>Address: ' + esc(user.address) + '</p>' : '')
            + '<p>Status: ' + (on ? 'Active' : 'Deactivated') + (locked ? ' · This account stays active.' : '') + '</p>'
            + (user.area ? '<p>Area: ' + esc(user.area) + '</p>' : '')
            + (bucket === 'customers' ? '<p>Customer accounts are for monitoring only.</p>' : (manage ? '' : '<p>Only an authorized account can change this.</p>'));
    }

    function toggleAccount(bucket, id, active) {
        var box = document.getElementById('maint-account-detail');
        if (!canManageAccounts()) {
            if (box) box.innerHTML = '<p>Only an authorized account can activate or deactivate accounts.</p>';
            return;
        }
        if (bucket === 'customers') {
            if (box) box.innerHTML = '<p>Customer accounts are for monitoring only.</p>';
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
        if (dir !== currentDirectory) {
            directorySearch = '';
            directoryArea = '';
        }
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
                var retailForm = ev.target.closest('#maint-retailer-price-form');
                if (retailForm) {
                    ev.preventDefault();
                    saveRetailerPrice(retailForm);
                    return;
                }
                var itemForm = ev.target.closest('#maint-item-form');
                if (itemForm) {
                    ev.preventDefault();
                    saveItemEdit(itemForm);
                    return;
                }
                if (ev.target.closest('#maint-dir-tools')) {
                    ev.preventDefault();
                    applyDirectoryFilter();
                    return;
                }
                var form = ev.target.closest('#maint-create-account');
                if (!form || !window.KreezbyMaintenanceSettings || !KreezbyMaintenanceSettings.createAccount) return;
                ev.preventDefault();
                if (currentDirectory === 'customer') {
                    var blocked = document.getElementById('maint-account-detail');
                    if (blocked) blocked.innerHTML = '<p>Customers create their own accounts when they sign up. This list is for monitoring only.</p>';
                    return;
                }
                var result = KreezbyMaintenanceSettings.createAccount(currentDirectory && DIRECTORY[currentDirectory] ? DIRECTORY[currentDirectory].bucket : '', {
                    name: form.elements.name && form.elements.name.value,
                    username: form.elements.username && form.elements.username.value,
                    role: form.elements.role && form.elements.role.value,
                    email: form.elements.email && form.elements.email.value,
                    contact: form.elements.contact && form.elements.contact.value,
                    area: form.elements.area && form.elements.area.value
                });
                if (result.ok) {
                    refreshMetrics();
                    renderDirectory(currentDirectory);
                }
                var box = document.getElementById('maint-account-detail');
                if (box) box.innerHTML = '<p>' + esc(result.message) + '</p>';
            });
            root.addEventListener('input', function (ev) {
                if (ev.target && ev.target.id === 'maint-dir-search') applyDirectoryFilter();
            });
            root.addEventListener('change', function (ev) {
                if (ev.target && ev.target.id === 'maint-dir-area') applyDirectoryFilter();
            });
            root.addEventListener('click', function (ev) {
                if (ev.target.closest('#maint-dir-clear')) {
                    ev.preventDefault();
                    var clearInput = document.getElementById('maint-dir-search');
                    var clearSelect = document.getElementById('maint-dir-area');
                    if (clearInput) clearInput.value = '';
                    if (clearSelect) clearSelect.value = '';
                    applyDirectoryFilter();
                    return;
                }
                if (ev.target.closest('[data-retailer-price-edit]')) {
                    ev.preventDefault();
                    openRetailerPriceEdit();
                    return;
                }
                var itemEdit = ev.target.closest('[data-item-edit]');
                if (itemEdit) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    openItemEdit(itemEdit.getAttribute('data-item-edit'));
                    return;
                }
                if (ev.target.closest('[data-item-cancel]')) {
                    ev.preventDefault();
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
                var row = ev.target.closest('[data-account-row]');
                if (row) showAccountDetail(row.getAttribute('data-account-bucket'), row.getAttribute('data-account-row'));
            });
        }

        if (!window.__kreezbyMaintTabsWrapped) {
            window.__kreezbyMaintTabsWrapped = true;
            var previousTab = window.switchMaintenanceDataTab;
            window.switchMaintenanceDataTab = function (tabNode, directoryKey) {
                if (DIRECTORY[directoryKey]) {
                    openDirectory(directoryKey, tabNode);
                    return;
                }
                if (directoryKey === 'settings') {
                    currentDirectory = '';
                    markSelected('', tabNode);
                    initSettingsPanel();
                    return;
                }
                if (directoryKey === 'items') {
                    openItems(tabNode);
                    return;
                }
                if (typeof previousTab === 'function') previousTab(tabNode, directoryKey);
            };
        }

        window.KreezbyMaintenanceDirectory = openDirectory;
        window.openHeadMaintenanceDirectory = openDirectory;
        openDirectory(currentDirectory || 'retailer');
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
        upgradeCustomer: upgradeCustomer,
        bootDirectory: bootMaintenanceUi
    };

    function bootMaintenanceUi() {
        if (!document.getElementById('maintenance-grid-workspace-root')) return;
        refreshMetrics();
        wireDirectory();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootMaintenanceUi);
    } else {
        bootMaintenanceUi();
    }

    document.addEventListener('kreezby:accounts-ready', function () {
        if (!document.getElementById('maintenance-grid-workspace-root')) return;
        refreshMetrics();
        // Item List and Settings are not account lists: leave them open.
        if (!currentDirectory) return;
        renderDirectory(currentDirectory);
    });

    document.addEventListener('turbo:frame-load', function (event) {
        var frame = event.target;
        if (!frame || frame.id !== 'kreezby-main-content') return;
        if (!frame.querySelector('#maintenance-grid-workspace-root')) return;
        window.setTimeout(bootMaintenanceUi, 0);
    });
})();
