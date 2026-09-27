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
        elena: { id: 'elena', name: 'Elena Morales', username: 'elena_admin', role: 'Operations', folder: 'elena-morales', dashboard: 'admin.html', home: 'admin_names/elena-morales/admin.html', status: 'active', aliases: ['elenaadmin', 'kreezbyadmin', 'admin1'] },
        marco: { id: 'marco', name: 'Marco Del Rosario', username: 'marco_admin', role: 'Inventory', folder: 'marco-del-rosario', dashboard: 'admin.html', home: 'admin_names/marco-del-rosario/admin.html', status: 'active', aliases: ['marcoadmin'] },
        patricia: { id: 'patricia', name: 'Patricia Go', username: 'patricia_admin', role: 'Sales', folder: 'patricia-go', dashboard: 'admin.html', home: 'admin_names/patricia-go/admin.html', status: 'active', aliases: ['patriciaadmin'] },
        jonas: { id: 'jonas', name: 'Jonas Villanueva', username: 'jonas_admin', role: 'Branch', folder: 'jonas-villanueva', dashboard: 'admin.html', home: 'admin_names/jonas-villanueva/admin.html', status: 'active', aliases: ['jonasadmin'] }
    };

    var ADMIN_PROFILES = {
        'elena': {
            id: 'elena',
            name: 'Elena Morales',
            username: 'elena_admin',
            role: 'Operations Administrator',
            dashboard: 'admin.html'
        },
        'marco': {
            id: 'marco',
            name: 'Marco Del Rosario',
            username: 'marco_admin',
            role: 'Inventory Administrator',
            dashboard: 'admin.html'
        },
        'patricia': {
            id: 'patricia',
            name: 'Patricia Go',
            username: 'patricia_admin',
            role: 'Sales Administrator',
            dashboard: 'admin.html'
        },
        'jonas': {
            id: 'jonas',
            name: 'Jonas Villanueva',
            username: 'jonas_admin',
            role: 'Branch Administrator',
            dashboard: 'admin.html'
        }
    };

    var TASKS = {
        dashboard: { label: 'Dashboard', page: 'admin.html' },
        po: { label: 'Purchase Order', page: 'po-admin.html' },
        receive: { label: 'Receiving', page: 'receive-admin.html' },
        bo: { label: 'Back Order', page: 'bo-admin.html' },
        return: { label: 'Return/P.O List', page: 'return-admin.html' },
        stocks: { label: 'Stocks', page: 'stocks-admin.html' },
        saleslist: { label: 'Sales List', page: 'saleslist-admin.html' },
        ordertracking: { label: 'Order Tracking', page: 'order-tracking-admin.html' },
        aiforecast: { label: 'AI Forecast', page: 'aiforecast-admin.html' },
        alert: { label: 'Alert', page: 'alert-admin.html' },
        stocklevel: { label: 'Stock Level', page: 'stocklevel-admin.html' },
        maintenance: { label: 'Maintenance', page: 'maintenance-admin.html' },
        inbox: { label: 'Inbox', page: 'inbox-admin.html' },
        issuereports: { label: 'Issue Reports', page: 'issue-reports-admin.html' }
    };

    var DEFAULT_PERMISSIONS = {
        elena: ['dashboard', 'po', 'receive', 'saleslist', 'ordertracking', 'alert', 'inbox'],
        marco: ['dashboard', 'stocks', 'stocklevel', 'receive', 'alert'],
        patricia: ['dashboard', 'saleslist', 'aiforecast', 'ordertracking', 'alert'],
        jonas: ['dashboard', 'po', 'receive', 'bo', 'return', 'saleslist', 'alert']
    };

    var TASK_ORDER = [
        'dashboard', 'po', 'receive', 'bo', 'return', 'stocks',
        'saleslist', 'ordertracking', 'aiforecast', 'alert', 'stocklevel',
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
        return id === 'brentadmin' || id === 'headadmin' || id.indexOf('brent') === 0 && id.indexOf('admin') >= 0;
    }

    function inferAdminIdFromIdentity(identity) {
        var id = normalizeIdentity(identity);
        if (id.indexOf('marco') >= 0) return 'marco';
        if (id.indexOf('patricia') >= 0) return 'patricia';
        if (id.indexOf('jonas') >= 0) return 'jonas';
        if (id.indexOf('elena') >= 0 || id === 'kreezbyadmin' || id === 'admin1') return 'elena';
        var keys = Object.keys(ADMIN_PROFILES);
        for (var i = 0; i < keys.length; i++) {
            var profile = ADMIN_PROFILES[keys[i]];
            if (normalizeIdentity(profile.username) === id || normalizeIdentity(profile.name) === id) {
                return profile.id;
            }
        }
        return 'elena';
    }

    function getCurrentAdminId() {
        var fromPath = adminIdFromPath();
        if (fromPath) {
            try { sessionStorage.setItem(SESSION_ADMIN_KEY, fromPath); } catch (e) { /* ignore */ }
            return fromPath;
        }
        try {
            var stored = sessionStorage.getItem(SESSION_ADMIN_KEY);
            if (stored && (getAdminAccounts()[stored] || ADMIN_PROFILES[stored])) return stored;
        } catch (e) { /* ignore */ }
        var session = readSession();
        var inferred = inferAdminIdFromIdentity(session.identity || session.userName);
        try { sessionStorage.setItem(SESSION_ADMIN_KEY, inferred); } catch (e) { /* ignore */ }
        return inferred;
    }

    function setCurrentAdminId(adminId) {
        if (!getAdminAccounts()[adminId] && !ADMIN_PROFILES[adminId]) return;
        try { sessionStorage.setItem(SESSION_ADMIN_KEY, adminId); } catch (e) { /* ignore */ }
    }

    function slugifyName(value) {
        return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'account';
    }

    function getAdminAccounts() {
        var stored = {};
        try {
            stored = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || '{}') || {};
        } catch (e) { /* ignore */ }
        var merged = {};
        Object.keys(SEED_ADMIN_ACCOUNTS).forEach(function (id) {
            merged[id] = Object.assign({}, SEED_ADMIN_ACCOUNTS[id], stored[id] || {});
        });
        Object.keys(stored).forEach(function (id) {
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
            return parsed;
        } catch (e) {
            return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
        }
    }

    function saveAllPermissions(all) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch (e) { /* ignore */ }
    }

    function getAdminProfile(adminId) {
        var account = getAdminAccounts()[adminId];
        if (account) return account;
        return ADMIN_PROFILES[adminId] || ADMIN_PROFILES.elena;
    }

    function normalizeAdminTasks(tasks) {
        var normalized = (tasks || []).slice();
        if (normalized.indexOf('dashboard') === -1) normalized.unshift('dashboard');
        return normalized;
    }

    function getAdminTasks(adminId) {
        if (isHeadAdmin() && !namedAdminPortal()) return TASK_ORDER.slice();
        adminId = adminId || getCurrentAdminId();
        var all = getAllPermissions();
        return all[adminId] || ['dashboard'];
    }

    function adminCanAccessTask(taskKey, adminId) {
        if (!taskKey) return true;
        if (isHeadAdmin() && !namedAdminPortal()) return true;
        return getAdminTasks(adminId).indexOf(taskKey) !== -1;
    }

    function getTaskForPage(filename) {
        var raw = filename || '';
        if (raw.indexOf('it_kreezby') >= 0) return null;
        var base = raw.split('/').pop().split('?')[0];
        if (PAGE_TO_TASK[base]) return PAGE_TO_TASK[base];
        if (base.indexOf('aiforecast') === 0) return 'aiforecast';
        if (base.indexOf('stocklevel') === 0) return 'stocklevel';
        return null;
    }

    function getDashboardHref() {
        return 'admin.html';
    }

    function filterDashboardCards() {
        var allowed = isHeadAdmin() ? null : getAdminTasks();
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
            if (href.indexOf('it_kreezby') >= 0 || label.indexOf('issue reports') >= 0) {
                link.remove();
            }
        });
    }

    function refreshAdminChrome() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (path.indexOf('/admin/') === -1 && path.indexOf('/admin_names/') === -1) return;
        filterDashboardCards();
        applyTopNavPermissions();
        if (window.KreezbyAdminSidebar && typeof window.KreezbyAdminSidebar.render === 'function') {
            window.KreezbyAdminSidebar.render();
        }
        document.dispatchEvent(new CustomEvent('kreezby-admin-permissions-ready'));
    }

    function renderPermissionsMatrix(matrixBody, adminId) {
        if (!matrixBody) return;
        var allowed = getAllPermissions()[adminId] || DEFAULT_PERMISSIONS[adminId] || ['dashboard'];
        matrixBody.innerHTML = '';
        PERMISSION_MATRIX_ORDER.forEach(function (taskKey) {
            var task = TASKS[taskKey];
            if (!task) return;
            var checked = allowed.indexOf(taskKey) !== -1 ? ' checked' : '';
            var row = document.createElement('tr');
            row.innerHTML =
                '<td><div class="permission-task-label">' + task.label + '</div></td>' +
                '<td class="center-align"><label class="checkbox-container">' +
                '<input type="checkbox" data-task="' + taskKey + '"' + checked + '>' +
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
            home: 'admin_names/' + folder + '/admin.html',
            status: 'active',
            aliases: [],
            portalReady: false
        };
        saveAdminAccounts(accounts);
        var perms = getAllPermissions();
        perms[id] = ['dashboard'];
        saveAllPermissions(perms);
        return { ok: true, id: id, message: name + ' was created with Dashboard only. The current roster already has a portal folder. New accounts are saved and listed immediately.' };
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

        var selectedId = 'elena';

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
        }

        saveBtn.onclick = function () {
            if (!selectedId) return;
            var tasks = ['dashboard'];
            matrixBody.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
                tasks.push(cb.getAttribute('data-task'));
            });
            tasks = normalizeAdminTasks(tasks);
            var all = getAllPermissions();
            all[selectedId] = tasks;
            saveAllPermissions(all);
            var message = 'Permissions saved for ' + getAdminProfile(selectedId).name + '.';
            if (typeof window.toast === 'function') window.toast(message, 'success');
            else alert(message);
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

    function guardCurrentPage() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (path.indexOf('/admin/') === -1 && path.indexOf('/admin_names/') === -1) return;
        if (isHeadAdmin() && path.indexOf('/admin_names/') === -1) return;
        var filename = getCurrentPageFilename();
        if (filename === 'report_issue-admin.html') return;
        var taskKey = getTaskForPage(filename);
        if (!taskKey) return;
        if (!adminCanAccessTask(taskKey)) {
            window.location.replace(getDashboardHref() + '?denied=1');
        }
    }

    function showDeniedBanner() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('denied') !== '1') return;
        var notice = document.createElement('div');
        notice.className = 'staff-access-denied-banner';
        notice.textContent = 'You do not have permission to open that page. Contact the Head Admin.';
        notice.style.cssText = 'background:#ffebee;color:#c62828;padding:12px 20px;margin-bottom:16px;border-radius:6px;font-size:14px;font-weight:600;';
        var container = document.querySelector('.workspace-view-canvas, .workspace-container');
        if (container && container.firstChild) {
            container.insertBefore(notice, container.firstChild);
        }
    }

    window.KreezbyAdminPermissions = {
        ADMIN_PROFILES: ADMIN_PROFILES,
        TASKS: TASKS,
        TASK_ORDER: TASK_ORDER,
        DEFAULT_PERMISSIONS: DEFAULT_PERMISSIONS,
        PERMISSION_MATRIX_ORDER: PERMISSION_MATRIX_ORDER,
        isHeadAdmin: isHeadAdmin,
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
        var session = readSession();
        if (session.accountType === 'Administrator') {
            setCurrentAdminId(inferAdminIdFromIdentity(session.identity || session.userName));
        }
        if (isAdminPage) {
            guardCurrentPage();
            refreshAdminChrome();
            showDeniedBanner();
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
        if (location.pathname.indexOf('/admin/') !== -1) refreshAdminChrome();
    });
    document.addEventListener('kreezby-admin-sidebar-ready', applyTopNavPermissions);
})();
