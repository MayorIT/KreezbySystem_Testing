/**
 * Admin module permissions — Head Admin controls which modules each admin can open.
 * Persists in localStorage (key: kreezby_admin_permissions).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezby_admin_permissions';
    var SESSION_ADMIN_KEY = 'kreezby_current_admin';

    var ACCOUNT_STORAGE_KEY = 'kreezby_admin_accounts';

    var SEED_ADMIN_ACCOUNTS = {
        ailore: { id: 'ailore', name: 'Ailore Embalzado', username: 'ailore_admin', role: 'Marketing', folder: 'ailore-embalzado', dashboard: 'admin.html', home: 'admin/admin.html', status: 'active', aliases: ['ailoreadmin'] }
    };

    var ADMIN_PROFILES = {
        ailore: {
            id: 'ailore',
            name: 'Ailore Embalzado',
            username: 'ailore_admin',
            role: 'Marketing',
            dashboard: 'admin.html'
        }
    };

    var TASKS = {
        dashboard: { label: 'Dashboard', page: 'admin.html' },
        bo: { label: 'Back Order', page: 'bo-admin.html' },
        stocks: { label: 'Stocks', page: 'stocks-admin.html' },
        saleslist: { label: 'Sales List', page: 'saleslist-admin.html' },
        pos: { label: 'Point of Sale', page: 'pos-admin.html' },
        ordertracking: { label: 'Order Tracking', page: 'order-tracking-admin.html' },
        aiforecast: { label: 'Insights', page: 'aiforecast_salesanalysis-admin.html' },
        deliveryschedule: { label: 'Delivery Schedule', page: 'deliveryschedule-admin.html' },
        alert: { label: 'Alert', page: 'alert-admin.html' },
        stocklevel: { label: 'Stock Level', page: 'stocklevel-admin.html' },
        maintenance: { label: 'Maintenance', page: 'maintenance-admin.html' },
        inbox: { label: 'Inbox', page: 'inbox-admin.html' },
        issuereports: { label: 'Report Center', page: 'issue-reports-admin.html' }
    };

    var DEFAULT_PERMISSIONS = {
        ailore: ['dashboard', 'saleslist', 'pos', 'aiforecast', 'ordertracking', 'alert', 'inbox', 'deliveryschedule']
    };

    var TASK_ORDER = [
        'dashboard', 'bo', 'stocks',
        'saleslist', 'pos', 'ordertracking', 'aiforecast', 'deliveryschedule', 'alert', 'stocklevel',
        'maintenance', 'inbox', 'issuereports'
    ];

    var PERMISSION_MATRIX_ORDER = TASK_ORDER.filter(function (key) {
        return key !== 'dashboard';
    });

    var PAGE_TO_TASK = {};
    Object.keys(TASKS).forEach(function (taskKey) {
        if (TASKS[taskKey].page) {
            PAGE_TO_TASK[TASKS[taskKey].page.split('/').pop()] = taskKey;
        }
    });
    PAGE_TO_TASK['admin.html'] = 'dashboard';
    PAGE_TO_TASK['issue-reports-headadmin.html'] = 'issuereports';

    function getCurrentPageFilename() {
        return ((location.pathname || '').split('/').pop() || '').split('?')[0];
    }

    function readSession() {
        try {
            return JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function normalizeIdentity(value) {
        return String(value || '').toLowerCase().replace(/[\s_-]/g, '');
    }

    function isHeadAdmin() {
        var session = readSession();
        if (session.accountType === 'Head Administrator') return true;
        var id = normalizeIdentity(session.identity || session.userName);
        return id === 'brentadmin' || id === 'marcelaadmin' || id === 'marcelacriseldaramos' || id === 'criseldaramos' ||
            (id.indexOf('brent') === 0 && id.indexOf('admin') >= 0) ||
            (id.indexOf('marcela') === 0 && id.indexOf('admin') >= 0);
    }

    function knownAdminId(identity) {
        var id = normalizeIdentity(identity);
        if (!id) return '';
        if (id === 'brentadmin' || id === 'brentramos' || id === 'adminops' || id === 'headadmin') return 'admin-ops';
        if (id === 'marcelaadmin' || id === 'marcelacriseldaramos' || id === 'criseldaramos' || id === 'adminowner') return 'admin-owner';
        if (id === 'ailoreadmin' || id === 'ailoreembalzado' || id === 'adminmarketing') return 'ailore';
        return '';
    }

    function inferAdminIdFromIdentity(identity) {
        var id = normalizeIdentity(identity);
        var known = knownAdminId(id);
        if (known) return known;
        var accounts = getAdminAccounts();
        var keys = Object.keys(accounts);
        for (var i = 0; i < keys.length; i++) {
            var profile = accounts[keys[i]];
            if (normalizeIdentity(profile.username) === id || normalizeIdentity(profile.name) === id) {
                return profile.id;
            }
            var aliases = profile.aliases || [];
            for (var a = 0; a < aliases.length; a++) {
                if (normalizeIdentity(aliases[a]) === id) return profile.id;
            }
        }
        if (id.indexOf('ailore') >= 0) return 'ailore';
        return '';
    }

    function getCurrentAdminId() {
        var fromPath = adminIdFromPath();
        if (fromPath) {
            setCurrentAdminId(fromPath);
            return fromPath;
        }
        var session = readSession();
        var inferred = inferAdminIdFromIdentity(session.identity || session.userName || session.name);
        if (inferred) {
            setCurrentAdminId(inferred);
            return inferred;
        }
        try {
            var stored = sessionStorage.getItem(SESSION_ADMIN_KEY);
            if (stored && (knownAdminId(stored) || getAdminAccounts()[stored] || ADMIN_PROFILES[stored])) return stored;
        } catch (e) { /* ignore */ }
        return '';
    }

    function setCurrentAdminId(adminId) {
        if (!adminId) return;
        if (!knownAdminId(adminId) && !getAdminAccounts()[adminId] && !ADMIN_PROFILES[adminId]) return;
        try { sessionStorage.setItem(SESSION_ADMIN_KEY, adminId); } catch (e) { /* ignore */ }
    }

    function slugifyName(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account';
    }

    function permissionIdForAdmin(admin) {
        if (String(admin.username || '') === 'ailore_admin') return 'ailore';
        return String(admin.id || admin.username);
    }

    function databaseAdminAccounts() {
        if (!window.KreezbyMaintenanceSettings || typeof window.KreezbyMaintenanceSettings.getUsers !== 'function') return null;
        var admins = window.KreezbyMaintenanceSettings.getUsers().admins || [];
        if (!admins.length) return null;
        var mapped = {};
        admins.forEach(function (admin) {
            if (!admin || admin.active === false) return;
            var id = permissionIdForAdmin(admin);
            var head = window.KreezbyMaintenanceSettings.isHeadAdminAccount(admin);
            mapped[id] = {
                id: id,
                name: admin.name,
                username: admin.username,
                role: admin.role,
                accountType: admin.accountType,
                folder: slugifyName(admin.name),
                dashboard: head ? 'head_admin.html' : 'admin.html',
                home: head ? 'head_admin/head_admin.html' : 'admin/admin.html',
                status: 'active',
                aliases: [String(admin.username || '').replace(/_/g, '')]
            };
        });
        return Object.keys(mapped).length ? mapped : null;
    }

    function defaultTasksForAdmin(account) {
        if (window.KreezbyMaintenanceSettings && window.KreezbyMaintenanceSettings.isHeadAdminAccount(account)) {
            return TASK_ORDER.slice();
        }
        if (account && (account.id === 'ailore' || account.username === 'ailore_admin')) {
            return DEFAULT_PERMISSIONS.ailore.slice();
        }
        return ['dashboard'];
    }

    function getAdminAccounts() {
        var stored = {};
        try {
            stored = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || '{}') || {};
        } catch (e) { /* ignore */ }
        var fromDatabase = databaseAdminAccounts();
        if (fromDatabase) {
            var live = {};
            Object.keys(fromDatabase).forEach(function (id) {
                live[id] = Object.assign({}, stored[id] || {}, fromDatabase[id]);
                live[id].status = (stored[id] && stored[id].status) || 'active';
            });
            return live;
        }
        var merged = {};
        Object.keys(SEED_ADMIN_ACCOUNTS).forEach(function (id) {
            merged[id] = Object.assign({}, SEED_ADMIN_ACCOUNTS[id], stored[id] || {});
        });
        var retiredDemoAdmins = { elena: 1, marco: 1, patricia: 1, jonas: 1 };
        Object.keys(stored).forEach(function (id) {
            if (retiredDemoAdmins[id]) return;
            if (!merged[id]) merged[id] = stored[id];
        });
        return merged;
    }

    function saveAdminAccounts(all) {
        try { localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
    }

    function adminIdFromPath() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        var match = path.match(/\/admin_names\/([^/]+)\//i);
        if (!match) return '';
        var slug = match[1].toLowerCase();
        var accounts = getAdminAccounts();
        var ids = Object.keys(accounts);
        for (var i = 0; i < ids.length; i++) {
            if (String(accounts[ids[i]].folder || '').toLowerCase() === slug) return ids[i];
        }
        return '';
    }

    function namedAdminPortal() {
        return /\/admin_names\//i.test((location.pathname || '').replace(/\\/g, '/'));
    }

    function getAllPermissions() {
        try {
            var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (!parsed || typeof parsed !== 'object') parsed = {};
            Object.keys(DEFAULT_PERMISSIONS).forEach(function (id) {
                if (!parsed[id]) parsed[id] = DEFAULT_PERMISSIONS[id].slice();
            });
            var accounts = getAdminAccounts();
            Object.keys(accounts).forEach(function (id) {
                if (!parsed[id]) parsed[id] = defaultTasksForAdmin(accounts[id]);
            });
            try {
                if (localStorage.getItem('kreezby_admin_delivery_nav_v1') !== '1') {
                    localStorage.setItem('kreezby_admin_delivery_nav_v1', '1');
                }
                if (localStorage.getItem('kreezby_admin_pos_nav_v1') !== '1') {
                    localStorage.setItem('kreezby_admin_pos_nav_v1', '1');
                }
            } catch (e) { /* ignore */ }
            return parsed;
        } catch (e) {
            return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
        }
    }

    function saveAllPermissions(all) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
    }

    function taskLabel(key) {
        return (TASKS[key] && TASKS[key].label) || key;
    }

    function notifyAccessChange(accountId, before, after) {
        var granted = [];
        var removed = [];
        (after || []).forEach(function (key) {
            if (key !== 'dashboard' && before.indexOf(key) === -1) granted.push(taskLabel(key));
        });
        (before || []).forEach(function (key) {
            if (key !== 'dashboard' && after.indexOf(key) === -1) removed.push(taskLabel(key));
        });
        if (!granted.length && !removed.length) return;
        var title = 'Task access updated';
        var description = 'You can now open ' + granted.join(', ') + '. Access was removed for ' + removed.join(', ') + '.';
        if (granted.length && !removed.length) {
            title = 'Access given';
            description = 'You can now open ' + granted.join(', ') + '.';
        } else if (removed.length && !granted.length) {
            title = 'Access removed';
            description = 'Access was removed for ' + removed.join(', ') + '.';
        }
        var note = {
            id: 'access-' + accountId + '-' + Date.now(),
            title: title,
            description: description,
            source: 'access',
            accountIds: [accountId],
            timestamp: new Date().toISOString(),
            read: false
        };
        if (window.KreezbyNotifications && typeof window.KreezbyNotifications.push === 'function') {
            window.KreezbyNotifications.push(note);
            return;
        }
        try {
            var list = JSON.parse(localStorage.getItem('kreezbyNotifications') || '[]');
            if (!Array.isArray(list)) list = [];
            list.unshift(note);
            localStorage.setItem('kreezbyNotifications', JSON.stringify(list.slice(0, 80)));
        } catch (e) { /* keep the permission save */ }
    }

    function persistAdminAccess(adminId, tasks) {
        if (isOwnerAccountId(adminId)) return TASK_ORDER.slice();
        tasks = normalizeAdminTasks(tasks);
        var all = getAllPermissions();
        var before = (all[adminId] || []).slice();
        all[adminId] = tasks.slice();
        saveAllPermissions(all);
        notifyAccessChange(adminId, before, tasks);
        var settings = window.KreezbyMaintenanceSettings;
        if (settings && typeof settings.getUsers === 'function' && typeof settings.saveUsers === 'function') {
            var users = settings.getUsers();
            (users.admins || []).forEach(function (admin) {
                if (admin && permissionIdForAdmin(admin) === adminId) admin.tasks = tasks.slice();
            });
            settings.saveUsers(users);
        }
        return tasks;
    }

    function checkedAdminTasks(matrixBody) {
        var tasks = ['dashboard'];
        matrixBody.querySelectorAll('input[type="checkbox"]:checked').forEach(function (box) {
            var key = box.getAttribute('data-task');
            if (key && tasks.indexOf(key) === -1) tasks.push(key);
        });
        return normalizeAdminTasks(tasks);
    }

    function showPermissionStatus(root, message) {
        var bar = root.querySelector('.panel-card-title-bar');
        if (!bar) return;
        var status = bar.querySelector('[data-permission-status]');
        if (!status) {
            status = document.createElement('p');
            status.setAttribute('data-permission-status', '1');
            status.className = 'permission-save-status';
            bar.appendChild(status);
        }
        status.textContent = message;
    }

    function getAdminProfile(adminId) {
        var account = getAdminAccounts()[adminId];
        if (account) return account;
        if (ADMIN_PROFILES[adminId]) return ADMIN_PROFILES[adminId];
        var fallbackKeys = Object.keys(getAdminAccounts());
        return fallbackKeys.length ? getAdminAccounts()[fallbackKeys[0]] : { id: '', name: 'Admin', username: '', role: 'Admin', dashboard: 'admin.html' };
    }

    function normalizeAdminTasks(tasks) {
        var normalized = (tasks || []).slice();
        if (normalized.indexOf('dashboard') === -1) normalized.unshift('dashboard');
        return normalized;
    }

    function isOwnerAccount(account) {
        if (!account) return false;
        var role = String(account.role || '').toLowerCase();
        if (role === 'owner') return true;
        var name = String(account.username || account.id || '').toLowerCase();
        return name === 'marcela_admin' || name === 'admin-owner';
    }

    function isOwnerAccountId(adminId) {
        return isOwnerAccount(getAdminAccounts()[adminId]);
    }

    function isOwnerSession() {
        var session = readSession();
        var id = normalizeIdentity(session.identity || session.userName || session.name);
        if (!id) return false;
        if (id === 'marcelaadmin' || id === 'marcelacriseldaramos' || id === 'criseldaramos' || id.indexOf('marcela') === 0) return true;
        var accounts = getAdminAccounts();
        var keys = Object.keys(accounts);
        for (var i = 0; i < keys.length; i++) {
            var account = accounts[keys[i]];
            if (!isOwnerAccount(account)) continue;
            if (normalizeIdentity(account.username) === id || normalizeIdentity(account.name) === id || normalizeIdentity(account.id) === id) return true;
        }
        return false;
    }

    function isHeadAdminAccountId(adminId) {
        var account = getAdminAccounts()[adminId];
        if (!account) return false;
        if (window.KreezbyMaintenanceSettings && typeof window.KreezbyMaintenanceSettings.isHeadAdminAccount === 'function') {
            return window.KreezbyMaintenanceSettings.isHeadAdminAccount(account);
        }
        return account.accountType === 'Head Administrator';
    }

    function withoutReceiving(tasks) {
        return (tasks || []).filter(function (task) { return task !== 'receive'; });
    }

    function getAdminTasks(adminId) {
        if (adminId) {
            if (isOwnerAccountId(adminId)) return TASK_ORDER.slice();
            var named = getAllPermissions();
            return withoutReceiving(named[adminId] || defaultTasksForAdmin(getAdminAccounts()[adminId]) || ['dashboard']);
        }
        if (isOwnerSession() && !namedAdminPortal()) return TASK_ORDER.slice();
        adminId = getCurrentAdminId();
        if (isOwnerAccountId(adminId)) return TASK_ORDER.slice();
        var all = getAllPermissions();
        return withoutReceiving(all[adminId] || defaultTasksForAdmin(getAdminAccounts()[adminId]) || ['dashboard']);
    }

    function adminCanAccessTask(taskKey, adminId) {
        if (taskKey === 'receive') return false;
        if (!taskKey) return true;
        if (isOwnerSession() && !namedAdminPortal()) return true;
        return getAdminTasks(adminId).indexOf(taskKey) !== -1;
    }

    function getTaskForPage(filename) {
        var raw = filename || '';
        if (raw.indexOf('it_kreezby') >= 0) return null;
        var base = raw.split('/').pop().split('?')[0];
        if (base === 'head_admin.html') return 'dashboard';
        var normalized = base.replace(/-headadmin\.html$/, '-admin.html');
        if (PAGE_TO_TASK[base]) return PAGE_TO_TASK[base];
        if (PAGE_TO_TASK[normalized]) return PAGE_TO_TASK[normalized];
        if (base.indexOf('deliveryschedule') === 0) return 'deliveryschedule';
        if (base.indexOf('forecast-') === 0 || base.indexOf('aiforecast_salesanalysis') === 0 || base.indexOf('insight-') === 0) return 'aiforecast';
        if (base.indexOf('stocklevel') === 0) return 'stocklevel';
        return null;
    }

    function getDashboardHref() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (path.indexOf('/head_admin/') !== -1) return 'head_admin.html';
        return 'admin.html';
    }

    function filterDashboardCards() {
        var allowed = isOwnerSession() ? null : getAdminTasks();
        document.querySelectorAll('.dashboard-grid .stat-card').forEach(function (card) {
            var href = (card.getAttribute('href') || '').toLowerCase();
            if (href.indexOf('it_kreezby') >= 0) {
                card.remove();
                return;
            }
            if (!allowed) return;
            var taskKey = getTaskForPage(href);
            if (taskKey && allowed.indexOf(taskKey) === -1) {
                card.style.display = 'none';
            } else {
                card.style.display = '';
            }
        });
    }

    function applyTopNavPermissions() {
        var allowed = getAdminTasks();
        document.querySelectorAll('.top-navbar-node a.top-nav-item, .top-navbar-node a.expandable-nav-tab').forEach(function (link) {
            var href = (link.getAttribute('href') || '').toLowerCase();
            var label = ((link.querySelector('.expandable-nav-tab__label') || link).textContent || '').toLowerCase();
            if ((href.indexOf('maintenance') >= 0 || label.indexOf('maintenance') >= 0) && allowed.indexOf('maintenance') === -1) {
                link.hidden = true;
                link.style.display = 'none';
            }
            if ((href.indexOf('inbox-admin') >= 0 || label === 'inbox') && allowed.indexOf('inbox') === -1) {
                link.hidden = true;
                link.style.display = 'none';
            }
            if (href.indexOf('it_kreezby') >= 0 || label.indexOf('issue reports') >= 0 || label.indexOf('report center') >= 0) {
                link.remove();
            }
        });
    }

    function refreshAdminChrome() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (path.indexOf('/admin/') === -1 && path.indexOf('/admin_names/') === -1 && path.indexOf('/head_admin/') === -1) return;
        filterDashboardCards();
        applyTopNavPermissions();
        if (window.KreezbyAdminSidebar && typeof window.KreezbyAdminSidebar.render === 'function') {
            window.KreezbyAdminSidebar.render();
        }
        document.dispatchEvent(new CustomEvent('kreezby-admin-permissions-ready'));
    }

    function renderPermissionsMatrix(matrixBody, adminId) {
        if (!matrixBody) return;
        var locked = isOwnerAccountId(adminId);
        var allowed = locked ? TASK_ORDER.slice() : (getAllPermissions()[adminId] || DEFAULT_PERMISSIONS[adminId] || ['dashboard']);
        matrixBody.innerHTML = '';
        PERMISSION_MATRIX_ORDER.forEach(function (taskKey) {
            var task = TASKS[taskKey];
            if (!task) return;
            var checked = allowed.indexOf(taskKey) !== -1 ? ' checked' : '';
            var disabled = locked ? ' disabled' : '';
            var row = document.createElement('tr');
            row.innerHTML =
                '<td><div class="permission-task-label">' + task.label + '</div></td>' +
                '<td class="center-align"><label class="checkbox-container">' +
                '<input type="checkbox" data-task="' + taskKey + '"' + checked + disabled + '>' +
                '<span class="custom-checkmark"></span></label></td>';
            matrixBody.appendChild(row);
        });
    }

    function createAdminAccount(fields) {
        var name = String(fields.name || '').trim();
        var username = String(fields.username || '').trim();
        var role = String(fields.role || '').trim();
        if (!name || !username || !role) return { ok: false, message: 'Name, username, and role are required.' };
        var accounts = getAdminAccounts();
        var taken = Object.keys(accounts).some(function (id) {
            return String(accounts[id].username || '').toLowerCase() === username.toLowerCase();
        });
        if (taken) return { ok: false, message: 'That username is already used.' };
        var id = slugifyName(name).replace(/-/g, '');
        var folder = slugifyName(name);
        var n = 2;
        while (accounts[id]) {
            id = slugifyName(name).replace(/-/g, '') + n;
            n += 1;
        }
        while (Object.keys(accounts).some(function (key) { return accounts[key].folder === folder; })) {
            folder = slugifyName(name) + '-' + n;
            n += 1;
        }
        accounts[id] = {
            id: id,
            name: name,
            username: username,
            role: role,
            folder: folder,
            dashboard: 'admin.html',
            home: 'admin/admin.html',
            status: 'active',
            aliases: [],
            portalReady: false
        };
        saveAdminAccounts(accounts);
        var perms = getAllPermissions();
        perms[id] = ['dashboard'];
        saveAllPermissions(perms);
        return { ok: true, id: id, message: name + ' was created with Dashboard only. New accounts are saved and listed immediately.' };
    }

    function setAdminAccountStatus(adminId, status) {
        var accounts = getAdminAccounts();
        if (!accounts[adminId]) return;
        accounts[adminId].status = status;
        saveAdminAccounts(accounts);
    }

    function initPermissionsEditor(root) {
        if (!root) return null;
        var matrixBody = root.querySelector('#permissions-matrix-body');
        var titleEl = root.querySelector('#permissions-panel-title');
        var saveBtn = root.querySelector('#btn-save-permissions');
        var listEl = root.querySelector('[data-account-list]');
        var archivedEl = root.querySelector('[data-archived-list]');
        var archiveBtn = root.querySelector('#btn-archive-admin');
        var createForm = root.querySelector('#admin-account-create');
        if (!matrixBody || !titleEl || !saveBtn) return null;

        var selectedId = 'ailore';

        function activeAccounts() {
            return Object.keys(getAdminAccounts()).filter(function (id) {
                return getAdminAccounts()[id].status !== 'archived';
            });
        }

        function renderLists() {
            if (!listEl) return;
            var accounts = getAdminAccounts();
            if (activeAccounts().indexOf(selectedId) === -1) selectedId = activeAccounts()[0] || '';
            listEl.innerHTML = '';
            activeAccounts().forEach(function (id) {
                var account = accounts[id];
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'role-selection-pill' + (id === selectedId ? ' active-role' : '');
                button.setAttribute('data-admin-id', id);
                button.innerHTML = account.name + '<br><span class="staff-task-hint">' + account.username + ' · ' + account.role + '</span>';
                button.onclick = function () {
                    selectedId = id;
                    renderLists();
                    renderPanel();
                };
                listEl.appendChild(button);
            });
            if (archivedEl) {
                var archived = Object.keys(accounts).filter(function (id) { return accounts[id].status === 'archived'; });
                archivedEl.innerHTML = '';
                if (!archived.length) {
                    archivedEl.innerHTML = '<p class="archived-empty">No archived admins.</p>';
                }
                archived.forEach(function (id) {
                    var account = accounts[id];
                    var row = document.createElement('div');
                    row.className = 'archived-account-row';
                    row.innerHTML = '<span>' + account.name + '</span>';
                    var restore = document.createElement('button');
                    restore.type = 'button';
                    restore.className = 'btn-restore-account';
                    restore.textContent = 'Restore';
                    restore.onclick = function () {
                        setAdminAccountStatus(id, 'active');
                        selectedId = id;
                        renderLists();
                        renderPanel();
                    };
                    row.appendChild(restore);
                    archivedEl.appendChild(row);
                });
            }
        }

        function renderPanel() {
            if (!selectedId) {
                titleEl.textContent = 'No active admin';
                matrixBody.innerHTML = '';
                return;
            }
            var profile = getAdminProfile(selectedId);
            titleEl.textContent = 'Module access — ' + profile.name;
            renderPermissionsMatrix(matrixBody, selectedId);
            if (isOwnerAccountId(selectedId)) {
                showPermissionStatus(root, profile.name + ' keeps every module.');
            }
        }

        function applyCheckedAccess(sourceBox) {
            if (!selectedId || isOwnerAccountId(selectedId)) {
                showPermissionStatus(root, getAdminProfile(selectedId).name + ' keeps every module.');
                return;
            }
            var tasks = persistAdminAccess(selectedId, checkedAdminTasks(matrixBody));
            matrixBody.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
                box.checked = tasks.indexOf(box.getAttribute('data-task')) !== -1;
            });
            var taskKey = sourceBox ? sourceBox.getAttribute('data-task') : '';
            var task = TASKS[taskKey];
            var detail = task
                ? task.label + (sourceBox.checked ? ' is now allowed' : ' is now blocked')
                : 'access updated';
            showPermissionStatus(root, getAdminProfile(selectedId).name + ': ' + detail + '.');
        }

        matrixBody.addEventListener('change', function (event) {
            var box = event.target;
            if (!box || box.type !== 'checkbox' || box.disabled) return;
            applyCheckedAccess(box);
        });

        saveBtn.onclick = function () {
            applyCheckedAccess(null);
        };

        if (archiveBtn) {
            archiveBtn.onclick = function () {
                if (!selectedId) return;
                var name = getAdminProfile(selectedId).name;
                setAdminAccountStatus(selectedId, 'archived');
                renderLists();
                renderPanel();
                alert(name + ' was archived and can no longer sign in.');
            };
        }

        if (createForm) {
            createForm.onsubmit = function (event) {
                event.preventDefault();
                var result = createAdminAccount({
                    name: createForm.elements.name.value,
                    username: createForm.elements.username.value,
                    role: createForm.elements.role.value
                });
                alert(result.message);
                if (!result.ok) return;
                createForm.reset();
                selectedId = result.id;
                renderLists();
                renderPanel();
            };
        }

        renderLists();
        renderPanel();
        return { getSelectedAdminId: function () { return selectedId; } };
    }

    function portalLoginHref() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        var parts = path.split('/').filter(Boolean);
        var roots = ['admin', 'staff', 'head_admin', 'retailer', 'customer', 'admin_names', 'staff_names'];
        var idx = -1;
        var i;
        for (i = parts.length - 1; i >= 0; i--) {
            if (roots.indexOf(parts[i].toLowerCase()) >= 0) { idx = i; break; }
        }
        var prefix = '';
        var depth = idx < 0 ? 1 : (parts.length - idx - 1);
        for (i = 0; i < depth; i++) prefix += '../';
        return prefix + 'auth/log_in.html';
    }

    function guardCurrentPage() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        var onAdmin = path.indexOf('/admin/') !== -1 || path.indexOf('/admin_names/') !== -1;
        var onHead = path.indexOf('/head_admin/') !== -1;
        if (!onAdmin && !onHead) return;
        var sessionType = readSession().accountType || '';
        if (sessionType !== 'Administrator' && sessionType !== 'Head Administrator' && sessionType !== 'IT Support') {
            window.location.replace(portalLoginHref());
            return;
        }
        if (isOwnerSession()) return;
        var filenameEarly = getCurrentPageFilename();
        if (!isHeadAdmin() && (filenameEarly === 'admin_permissions-headadmin.html' || filenameEarly === 'admin-permissions.html' || filenameEarly === 'staff-permissions.html')) {
            window.location.replace(getDashboardHref());
            return;
        }
        var filename = getCurrentPageFilename();
        if (filename === 'report_issue-admin.html') return;
        var taskKey = getTaskForPage(filename);
        if (!taskKey) return;
        if (!adminCanAccessTask(taskKey)) {
            window.location.replace(getDashboardHref());
        }
    }

    function clearDeniedNotice() {
        document.querySelectorAll('.staff-access-denied-banner').forEach(function (el) { el.remove(); });
        try {
            var params = new URLSearchParams(window.location.search);
            if (params.get('denied') !== '1') return;
            params.delete('denied');
            var next = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
            history.replaceState(history.state, '', next);
        } catch (e) { /* leave the address as it is */ }
    }

    window.KreezbyAdminPermissions = {
        ADMIN_PROFILES: ADMIN_PROFILES,
        TASKS: TASKS,
        TASK_ORDER: TASK_ORDER,
        DEFAULT_PERMISSIONS: DEFAULT_PERMISSIONS,
        PERMISSION_MATRIX_ORDER: PERMISSION_MATRIX_ORDER,
        isHeadAdmin: isHeadAdmin,
        isOwnerSession: isOwnerSession,
        getAllPermissions: getAllPermissions,
        saveAllPermissions: saveAllPermissions,
        getCurrentAdminId: getCurrentAdminId,
        setCurrentAdminId: setCurrentAdminId,
        inferAdminIdFromIdentity: inferAdminIdFromIdentity,
        getAdminProfile: getAdminProfile,
        getAdminTasks: getAdminTasks,
        adminCanAccessTask: adminCanAccessTask,
        getTaskForPage: getTaskForPage,
        initPermissionsEditor: initPermissionsEditor,
        refreshAdminChrome: refreshAdminChrome
    };

    function boot() {
        var filename = getCurrentPageFilename();
        var path = (location.pathname || '').replace(/\\/g, '/');
        var isAdminPage = path.indexOf('/admin/') !== -1 || path.indexOf('/admin_names/') !== -1;
        var isHeadPage = path.indexOf('/head_admin/') !== -1;
        var session = readSession();
        if (session.accountType === 'Administrator' || session.accountType === 'Head Administrator') {
            setCurrentAdminId(inferAdminIdFromIdentity(session.identity || session.userName));
        }
        if (isAdminPage || isHeadPage) {
            clearDeniedNotice();
            guardCurrentPage();
            refreshAdminChrome();
        }
        if (filename === 'admin-permissions.html' || filename === 'admin_permissions-headadmin.html' || document.getElementById('admin-permissions-root')) {
            initPermissionsEditor(document.getElementById('admin-permissions-root') || document);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    document.addEventListener('kreezby:page-load', function () {
        if (location.pathname.indexOf('/admin/') !== -1 || location.pathname.indexOf('/head_admin/') !== -1) refreshAdminChrome();
    });
    document.addEventListener('kreezby-admin-sidebar-ready', applyTopNavPermissions);
    document.addEventListener('kreezby:remote-state', function (event) {
        var keys = (event.detail && event.detail.keys) || [];
        if (keys.indexOf(STORAGE_KEY) === -1) return;
        var body = document.getElementById('permissions-matrix-body');
        var active = document.querySelector('[data-account-list] .role-selection-pill.active-role');
        if (body && active) renderPermissionsMatrix(body, active.getAttribute('data-admin-id'));
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (path.indexOf('/admin/') !== -1 || path.indexOf('/admin_names/') !== -1 || path.indexOf('/head_admin/') !== -1) {
            guardCurrentPage();
            refreshAdminChrome();
        }
    });
})();
