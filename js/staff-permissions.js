/**
 * Staff task permissions — Head Admin controls which hamburger items each staff can access.
 * Permissions persist in localStorage (key: kreezby_staff_permissions).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezby_staff_permissions';
    var SESSION_STAFF_KEY = 'kreezby_current_staff';

    var STAFF_PROFILES = {
        'staff-1': {
            id: 'staff-1',
            name: 'Claire (Staff 1)',
            role: 'Frontline Staff',
            welcome: 'Frontline Staff',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        },
        'staff-2': {
            id: 'staff-2',
            name: 'Staff 2',
            role: 'Receiving Team',
            welcome: 'Receiving Team',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        },
        'staff-3': {
            id: 'staff-3',
            name: 'Staff 3',
            role: 'Inventory Team',
            welcome: 'Inventory Team',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        },
        'staff-4': {
            id: 'staff-4',
            name: 'Derek Lim (Staff 4)',
            role: 'Sales Floor Staff',
            welcome: 'Sales Floor Staff',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        },
        'staff-5': {
            id: 'staff-5',
            name: 'Nina Garcia (Staff 5)',
            role: 'Packaging Staff',
            welcome: 'Packaging Staff',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        },
        'staff-6': {
            id: 'staff-6',
            name: 'Omar Reyes (Staff 6)',
            role: 'Dispatch Staff',
            welcome: 'Dispatch Staff',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        },
        'staff-7': {
            id: 'staff-7',
            name: 'Grace Tan (Staff 7)',
            role: 'Customer Service Staff',
            welcome: 'Customer Service',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        }
    };

    var TASKS = {
        dashboard: { label: 'Dashboard', page: 'staff.html' },
        po: { label: 'Purchase Order', page: 'po-staff.html' },
        receive: { label: 'Receiving', page: 'receive-staff.html' },
        bo: { label: 'Back Order', page: 'bo-staff.html' },
        return: { label: 'Return/P.O List', page: 'return-staff.html' },
        stocks: { label: 'Stocks', page: 'stocks-staff.html' },
        saleslist: { label: 'Sales List', page: 'saleslist-staff.html' },
        dailysales: { label: 'Daily Sales', page: 'dailysales-staff.html' },
        alert: { label: 'Alert', page: 'alert-staff.html' },
        stocklevel: { label: 'Stock Level', page: 'stocklevel-staff.html' },
        inventoryreport: { label: 'Report', page: 'inventoryreport-staff.html' },
        aiforecast: { label: 'Insights', page: 'aiforecast_salesanalysis-staff.html' },
        deliveryschedule: { label: 'Delivery Schedule', page: 'deliveryschedule-staff.html' },
        ordertracking: {
            label: 'Order Tracking',
            page: 'order-tracking-staff.html',
            hint: 'Update customer order status and J&T Express tracking IDs.'
        },
        inbox: {
            label: 'Inbox',
            page: null,
            hint: 'Open the inbox page for internal and staff conversations.'
        },
        inbox_retailer: {
            label: 'Inbox — Retailer Chats',
            page: null,
            hint: 'View and reply to retailer partner messages. Requires Inbox access.'
        }
    };

    var DEFAULT_PERMISSIONS = {
        'staff-1': ['dashboard', 'saleslist', 'dailysales', 'alert', 'ordertracking', 'inbox', 'deliveryschedule'],
        'staff-2': ['dashboard', 'po', 'receive', 'bo', 'return', 'alert', 'deliveryschedule'],
        'staff-3': ['dashboard', 'stocks', 'stocklevel', 'inventoryreport', 'alert', 'deliveryschedule'],
        'staff-4': ['dashboard', 'saleslist', 'dailysales', 'aiforecast', 'alert', 'deliveryschedule'],
        'staff-5': ['dashboard', 'stocks', 'stocklevel', 'alert', 'deliveryschedule'],
        'staff-6': ['dashboard', 'receive', 'bo', 'return', 'alert', 'ordertracking', 'deliveryschedule'],
        'staff-7': ['dashboard', 'inbox', 'inbox_retailer', 'saleslist', 'alert', 'ordertracking', 'deliveryschedule']
    };

    var TASK_ORDER = [
        'dashboard', 'po', 'receive', 'bo', 'return', 'stocks',
        'saleslist', 'dailysales', 'aiforecast', 'deliveryschedule', 'alert', 'ordertracking',
        'stocklevel', 'inventoryreport', 'inbox', 'inbox_retailer'
    ];

    var PERMISSION_MATRIX_ORDER = TASK_ORDER.filter(function (key) {
        return key !== 'dashboard';
    });

    var PAGE_TO_TASK = {};
    Object.keys(TASKS).forEach(function (taskKey) {
        if (TASKS[taskKey].page) {
            PAGE_TO_TASK[TASKS[taskKey].page] = taskKey;
        }
    });
    PAGE_TO_TASK['staff.html'] = 'dashboard';
    PAGE_TO_TASK['report_issue-staff.html'] = null;
    PAGE_TO_TASK['deliveryschedule-staff.html'] = 'deliveryschedule';
    PAGE_TO_TASK['aiforecast_salesanalysis-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['forecast-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['insight-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['stocklevel-value-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-capacity-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-weeks-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-health-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-alerts-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-category-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-slow-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-chart-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['order-tracking-staff.html'] = 'ordertracking';
    for (var inboxN = 1; inboxN <= 7; inboxN++) {
        PAGE_TO_TASK['inbox-staff-' + inboxN + '.html'] = 'inbox';
    }
    PAGE_TO_TASK['inbox-staff.html'] = 'inbox';

    function getStoredPermissions() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    function grantDeliverySchedule(stored) {
        if (!stored) return stored;
        try {
            if (localStorage.getItem('kreezby_staff_delivery_nav_v1') === '1') return stored;
        } catch (e) { return stored; }
        Object.keys(stored).forEach(function (id) {
            if (Array.isArray(stored[id]) && stored[id].indexOf('deliveryschedule') === -1) {
                stored[id].push('deliveryschedule');
            }
        });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            localStorage.setItem('kreezby_staff_delivery_nav_v1', '1');
        } catch (e) { /* ignore */ }
        return stored;
    }

    function readUsersBlob() {
        if (window.KreezbyMaintenanceSettings && typeof window.KreezbyMaintenanceSettings.getUsers === 'function') {
            return window.KreezbyMaintenanceSettings.getUsers();
        }
        try {
            return JSON.parse(localStorage.getItem('kreezby_maintenance_users') || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function accountStaffList() {
        return (readUsersBlob().staff || []).filter(function (staff) {
            return staff && staff.id && staff.active !== false && staff.archived !== true;
        });
    }

    function sessionStaffId() {
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
            if (session.accountType !== 'Staff') return '';
            var id = String(session.identity || session.userName || '').trim().toLowerCase();
            if (!id) return '';
            var accounts = accountStaffList();
            for (var i = 0; i < accounts.length; i++) {
                var staff = accounts[i];
                if (String(staff.id || '').toLowerCase() === id) return staff.id;
                if (String(staff.username || '').toLowerCase() === id) return staff.id;
                if (String(staff.name || '').toLowerCase() === id) return staff.id;
            }
        } catch (e) { /* ignore */ }
        return '';
    }

    function tasksForStaff(staff) {
        var text = (String(staff.department || '') + ' ' + String(staff.role || '')).toLowerCase();
        if (text.indexOf('sales') >= 0) {
            return ['dashboard', 'saleslist', 'dailysales', 'aiforecast', 'alert', 'deliveryschedule'];
        }
        if (text.indexOf('software') >= 0 || text.indexOf('it') >= 0) {
            return ['dashboard', 'stocks', 'alert', 'inbox', 'deliveryschedule'];
        }
        if (text.indexOf('production') >= 0) {
            return ['dashboard', 'po', 'receive', 'stocks', 'stocklevel', 'alert', 'deliveryschedule'];
        }
        if (text.indexOf('admin') >= 0 || text.indexOf('executive') >= 0) {
            return ['dashboard', 'po', 'saleslist', 'alert', 'inbox', 'deliveryschedule'];
        }
        return ['dashboard', 'alert', 'deliveryschedule'];
    }

    function getAllPermissions() {
        var stored = grantDeliverySchedule(getStoredPermissions()) || {};
        var merged = {};
        var accounts = accountStaffList();
        if (accounts.length) {
            accounts.forEach(function (staff) {
                if (stored[staff.id]) merged[staff.id] = stored[staff.id].slice();
                else if (Array.isArray(staff.tasks) && staff.tasks.length) merged[staff.id] = staff.tasks.slice();
                else merged[staff.id] = tasksForStaff(staff);
            });
            return merged;
        }
        Object.keys(STAFF_PROFILES).forEach(function (staffId) {
            merged[staffId] = stored[staffId]
                ? stored[staffId].slice()
                : (DEFAULT_PERMISSIONS[staffId] || ['dashboard']).slice();
        });
        return merged;
    }

    function saveAllPermissions(perms) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
    }

    function persistStaffAccess(staffId, tasks) {
        tasks = normalizeStaffTasks(tasks);
        var all = getAllPermissions();
        all[staffId] = tasks.slice();
        saveAllPermissions(all);
        var settings = window.KreezbyMaintenanceSettings;
        if (settings && typeof settings.getUsers === 'function' && typeof settings.saveUsers === 'function') {
            var users = settings.getUsers();
            (users.staff || []).forEach(function (staff) {
                if (staff && staff.id === staffId) staff.tasks = tasks.slice();
            });
            settings.saveUsers(users);
        }
        return tasks;
    }

    function checkedTasks(matrixBody) {
        var tasks = ['dashboard'];
        matrixBody.querySelectorAll('input[type="checkbox"]:checked').forEach(function (box) {
            var key = box.getAttribute('data-task');
            if (key && tasks.indexOf(key) === -1) tasks.push(key);
        });
        return normalizeStaffTasks(tasks);
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

    function getCurrentStaffId() {
        var stored = '';
        try { stored = sessionStorage.getItem(SESSION_STAFF_KEY) || ''; } catch (e) { stored = ''; }
        var accounts = accountStaffList();
        var known = false;
        if (stored) {
            known = !!STAFF_PROFILES[stored] || accounts.some(function (staff) { return staff.id === stored; });
            if (!known) {
                var saved = getStoredPermissions();
                known = !!(saved && saved[stored]);
            }
        }
        if (stored && known) return stored;
        var fromSession = sessionStaffId();
        if (fromSession) {
            try { sessionStorage.setItem(SESSION_STAFF_KEY, fromSession); } catch (e) { /* ignore */ }
            return fromSession;
        }
        if (accounts.length) return accounts[0].id;
        return 'staff-1';
    }

    function setCurrentStaffId(staffId) {
        sessionStorage.setItem(SESSION_STAFF_KEY, staffId);
        if (document.readyState !== 'loading') {
            refreshStaffChrome();
        }
    }

    function inferStaffIdFromPage() {
        var filename = (window.location.pathname.split('/').pop() || '').split('?')[0];
        var inboxMatch = filename.match(/^inbox-staff-(\d+)\.html$/);
        if (inboxMatch) return 'staff-' + inboxMatch[1];
        var match = filename.match(/^staff-(\d+)\.html$/);
        return match ? 'staff-' + match[1] : null;
    }

    function getCurrentPageFilename() {
        return (window.location.pathname.split('/').pop() || '').split('?')[0];
    }

    function isTaskActive(taskKey, currentFile, currentTask) {
        if (taskKey === 'dashboard') {
            return /^staff-\d+\.html$/.test(currentFile) || currentFile === 'staff.html';
        }
        if (taskKey === 'inbox') {
            return /^inbox-staff(-\d+)?\.html$/.test(currentFile);
        }
        return taskKey === currentTask;
    }

    function getStaffProfile(staffId) {
        if (STAFF_PROFILES[staffId]) return STAFF_PROFILES[staffId];
        var accounts = accountStaffList();
        for (var i = 0; i < accounts.length; i++) {
            if (accounts[i].id === staffId) {
                return {
                    id: accounts[i].id,
                    name: accounts[i].name,
                    role: accounts[i].role || 'Staff',
                    welcome: accounts[i].department || accounts[i].role || 'Staff',
                    dashboard: 'staff.html',
                    inbox: 'inbox-staff.html'
                };
            }
        }
        if (accounts.length) return getStaffProfile(accounts[0].id);
        return STAFF_PROFILES['staff-1'];
    }

    function getStaffTasks(staffId) {
        staffId = staffId || getCurrentStaffId();
        var all = getAllPermissions();
        return all[staffId] || ['dashboard'];
    }

    function normalizeStaffTasks(tasks) {
        var normalized = (tasks || []).slice();
        if (normalized.indexOf('dashboard') === -1) {
            normalized.unshift('dashboard');
        }
        if (normalized.indexOf('inbox_retailer') !== -1 && normalized.indexOf('inbox') === -1) {
            normalized.push('inbox');
        }
        return normalized;
    }

    function staffCanAccessTask(taskKey, staffId) {
        if (!taskKey) return true;
        return getStaffTasks(staffId).indexOf(taskKey) !== -1;
    }

    function staffCanAccessRetailerInbox(staffId) {
        staffId = staffId || getCurrentStaffId();
        var allowed = getStaffTasks(staffId);
        return allowed.indexOf('inbox') !== -1 && allowed.indexOf('inbox_retailer') !== -1;
    }

    function getTaskForPage(filename) {
        var base = filename.split('/').pop().split('?')[0];
        return PAGE_TO_TASK[base] || null;
    }

    function getDashboardHref(staffId) {
        return getStaffProfile(staffId).dashboard;
    }

    function getInboxHref(staffId) {
        staffId = staffId || getCurrentStaffId();
        var profile = getStaffProfile(staffId);
        return profile.inbox || 'inbox-staff.html';
    }

    function renderStaffSidebar() {
        var staffId = getCurrentStaffId();
        var allowed = getStaffTasks(staffId);
        var dashboardHref = getDashboardHref(staffId);
        var currentFile = getCurrentPageFilename();
        var currentTask = getTaskForPage(currentFile);

        document.querySelectorAll('.navigation-tree, .sidebar-menu-list').forEach(function (ul) {
            var itemClass = ul.classList.contains('sidebar-menu-list') ? 'menu-node-item' : 'tree-node';
            var items = [];

            TASK_ORDER.forEach(function (taskKey) {
                if (allowed.indexOf(taskKey) === -1) return;
                if (taskKey === 'inbox' || taskKey === 'inbox_retailer') return;
                var task = TASKS[taskKey];
                if (!task) return;
                if (taskKey !== 'dashboard' && !task.page) return;

                var href = taskKey === 'dashboard' ? dashboardHref : task.page;
                var turboAttr = '';
                var active = isTaskActive(taskKey, currentFile, currentTask);
                items.push(
                    '<li class="' + itemClass + (active ? ' active' : '') + '">' +
                    '<a href="' + href + '"' + turboAttr + '>' + task.label + '</a>' +
                    '</li>'
                );
            });

            ul.innerHTML = items.join('');
        });
    }

    function updateStaffHeader() {
        var staffId = getCurrentStaffId();
        var dashboardHref = getDashboardHref(staffId);
        var profile = getStaffProfile(staffId);

        document.querySelectorAll(
            'a.home-badge[href="staff.html"], a.home-badge[href*="staff-"], a[href="staff.html"].btn-secondary'
        ).forEach(function (link) {
            link.setAttribute('href', dashboardHref);
        });

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (right) {
            right.querySelectorAll('a[data-staff-inbox], a.top-nav-item').forEach(function (link) {
                var label = (link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
                var href = (link.getAttribute('href') || '').toLowerCase();
                if (link.hasAttribute('data-staff-inbox') || label === 'inbox' || href.indexOf('inbox') !== -1) {
                    link.remove();
                }
            });

            if (!right.querySelector('.notification-pill') && !right.querySelector('.notification-popover-root')) {
                var pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'notification-pill';
                pill.setAttribute('aria-label', 'Notifications');
                var dropdown = right.querySelector('.user-dropdown');
                right.insertBefore(pill, dropdown || null);
            }
        }

        var trigger = document.getElementById('user-dropdown-trigger');
        if (trigger) {
            trigger.textContent = profile.name + ' \u25be';
        }

        var welcome = document.querySelector('.admin-home h2');
        if (welcome) {
            welcome.textContent = 'Welcome, ' + (profile.welcome || profile.role || 'Staff');
        }
        if (getCurrentPageFilename() === 'staff.html') {
            document.title = 'Kreezby Bakeshop - ' + (profile.role || 'Staff') + ' Dashboard';
        }

        document.querySelectorAll('.user-dropdown-pill').forEach(function (pill) {
            if (pill.id === 'user-dropdown-trigger') return;
            if (/staff|admin/i.test(pill.textContent)) {
                pill.textContent = profile.name + ' \u25be';
            }
        });

        if (window.KreezbyUserDropdown && typeof window.KreezbyUserDropdown.init === 'function') {
            window.KreezbyUserDropdown.init();
        }
        if (window.KreezbyNavbarSlide && typeof window.KreezbyNavbarSlide.init === 'function') {
            window.KreezbyNavbarSlide.init();
        }
    }

    function refreshStaffChrome() {
        renderStaffSidebar();
        updateStaffHeader();
        filterDashboardCards();
        if (window.KreezbyStaffSidebar && typeof window.KreezbyStaffSidebar.render === 'function') {
            window.KreezbyStaffSidebar.render();
        }
        document.dispatchEvent(new CustomEvent('kreezby-staff-permissions-ready'));
    }

    function applySidebarPermissions() {
        refreshStaffChrome();
    }

    function filterDashboardCards() {
        var staffId = getCurrentStaffId();
        var allowed = getStaffTasks(staffId);

        document.querySelectorAll('.dashboard-grid .stat-card').forEach(function (card) {
            var href = card.getAttribute('href');
            if (!href) return;
            var taskKey = getTaskForPage(href);
            if (taskKey === 'inbox' || taskKey === 'inbox_retailer') {
                card.style.display = 'none';
                return;
            }
            if (taskKey && allowed.indexOf(taskKey) === -1) {
                card.style.display = 'none';
            } else {
                card.style.display = '';
            }
        });
    }

    function renderPermissionsMatrix(matrixBody, staffId) {
        if (!matrixBody) return;
        var allowed = getStaffTasks(staffId);
        matrixBody.innerHTML = '';

        PERMISSION_MATRIX_ORDER.forEach(function (taskKey) {
            var task = TASKS[taskKey];
            if (!task) return;

            var checked = allowed.indexOf(taskKey) !== -1 ? ' checked' : '';
            var hint = task.hint
                ? '<div class="permission-task-hint">' + task.hint + '</div>'
                : '';
            var row = document.createElement('tr');
            row.innerHTML =
                '<td><div class="permission-task-label">' + task.label + '</div>' + hint + '</td>' +
                '<td class="center-align"><label class="checkbox-container">' +
                '<input type="checkbox" data-task="' + taskKey + '"' + checked + '>' +
                '<span class="custom-checkmark"></span></label></td>';
            matrixBody.appendChild(row);
        });
    }

    function initPermissionsEditor(root) {
        if (!root) return null;

        var matrixBody = root.querySelector('#staff-permissions-matrix-body, #permissions-matrix-body');
        var titleEl = root.querySelector('#staff-permissions-panel-title, #permissions-panel-title');
        var saveBtn = root.querySelector('#staff-btn-save-permissions, #btn-save-permissions');
        if (!matrixBody || !titleEl || !saveBtn) return null;

        var listEl = root.querySelector('[data-account-list]');
        var searchEl = root.querySelector('[data-account-search]');
        var archiveBtn = root.querySelector('#staff-btn-archive');
        var selectedStaffPermissionsId = '';

        function visibleAccounts() {
            var query = searchEl ? String(searchEl.value || '').trim().toLowerCase() : '';
            return accountStaffList().filter(function (staff) {
                if (!query) return true;
                return (staff.name + ' ' + (staff.username || '') + ' ' + (staff.role || '')).toLowerCase().indexOf(query) !== -1;
            });
        }

        function renderAccounts() {
            var accounts = visibleAccounts();
            if (listEl) {
                listEl.innerHTML = '';
                if (!accounts.length) {
                    listEl.innerHTML = '<p class="archived-empty">No staff accounts yet.</p>';
                }
                accounts.forEach(function (staff) {
                    var button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'role-selection-pill' + (staff.id === selectedStaffPermissionsId ? ' active-role' : '');
                    button.setAttribute('data-staff-id', staff.id);
                    button.innerHTML = staff.name + '<br><span class="staff-task-hint">' +
                        (staff.username || '') + ' · ' + (staff.role || 'Staff') + '</span>';
                    button.onclick = function () {
                        selectedStaffPermissionsId = staff.id;
                        renderAccounts();
                        renderPanel();
                        showPermissionStatus(root, '');
                    };
                    listEl.appendChild(button);
                });
            }
            if (!accounts.some(function (staff) { return staff.id === selectedStaffPermissionsId; })) {
                selectedStaffPermissionsId = accounts[0] ? accounts[0].id : '';
                if (listEl) {
                    var first = listEl.querySelector('.role-selection-pill');
                    if (first) first.classList.add('active-role');
                }
            }
            saveBtn.disabled = !selectedStaffPermissionsId;
            if (archiveBtn) archiveBtn.disabled = !selectedStaffPermissionsId;
        }

        function renderPanel() {
            if (!selectedStaffPermissionsId) {
                titleEl.textContent = 'No staff accounts';
                matrixBody.innerHTML = '<tr><td colspan="2">No staff accounts yet.</td></tr>';
                return;
            }
            var profile = getStaffProfile(selectedStaffPermissionsId);
            titleEl.textContent = 'Task Access — ' + profile.name;
            renderPermissionsMatrix(matrixBody, selectedStaffPermissionsId);
        }

        if (searchEl) {
            searchEl.addEventListener('input', function () {
                renderAccounts();
                renderPanel();
            });
        }

        if (archiveBtn) {
            archiveBtn.onclick = function () {
                var archive = window.KreezbyAccountArchive;
                if (!selectedStaffPermissionsId || !archive) return;
                var profile = getStaffProfile(selectedStaffPermissionsId);
                archive.open({
                    bucket: 'staff',
                    id: selectedStaffPermissionsId,
                    name: profile.name,
                    onDone: function (result) {
                        renderAccounts();
                        renderPanel();
                        if (result && result.message) showPermissionStatus(root, result.message);
                    }
                });
            };
        }

        renderAccounts();

        function applyCheckedAccess(sourceBox) {
            var tasks = persistStaffAccess(selectedStaffPermissionsId, checkedTasks(matrixBody));
            var profile = getStaffProfile(selectedStaffPermissionsId);
            var taskKey = sourceBox ? sourceBox.getAttribute('data-task') : '';
            var task = TASKS[taskKey];
            var stillOn = tasks.indexOf(taskKey) !== -1;
            var detail = 'access updated';
            if (task && sourceBox && !sourceBox.checked && stillOn) {
                detail = task.label + ' stays allowed because Retailer Chats needs Inbox';
            } else if (task && sourceBox) {
                detail = task.label + (sourceBox.checked ? ' is now allowed' : ' is now blocked');
            }
            matrixBody.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
                box.checked = tasks.indexOf(box.getAttribute('data-task')) !== -1;
            });
            showPermissionStatus(root, profile.name + ': ' + detail + '.');
            return tasks;
        }

        matrixBody.addEventListener('change', function (event) {
            var box = event.target;
            if (!box || box.type !== 'checkbox') return;
            applyCheckedAccess(box);
        });

        saveBtn.onclick = function () {
            applyCheckedAccess(null);
        };

        renderPanel();
        return { getSelectedStaffId: function () { return selectedStaffPermissionsId; } };
    }

    function guardCurrentPage() {
        var path = window.location.pathname;
        var filename = path.split('/').pop() || '';
        if (filename.indexOf('-staff.html') === -1 && filename.indexOf('staff-') !== 0 && !/^inbox-staff(-\d+)?\.html$/i.test(filename)) {
            return;
        }
        if (filename === 'report_issue-staff.html' || filename === 'issue-reports-staff.html') return;

        var taskKey = getTaskForPage(filename);
        if (!taskKey) return;

        var staffId = getCurrentStaffId();
        if (!staffCanAccessTask(taskKey, staffId)) {
            window.location.replace(getDashboardHref(staffId) + '?denied=1');
        }
    }

    window.KreezbyStaffPermissions = {
        STAFF_PROFILES: STAFF_PROFILES,
        TASKS: TASKS,
        TASK_ORDER: TASK_ORDER,
        DEFAULT_PERMISSIONS: DEFAULT_PERMISSIONS,
        getAllPermissions: getAllPermissions,
        saveAllPermissions: saveAllPermissions,
        getCurrentStaffId: getCurrentStaffId,
        setCurrentStaffId: setCurrentStaffId,
        getStaffProfile: getStaffProfile,
        getStaffTasks: getStaffTasks,
        staffCanAccessTask: staffCanAccessTask,
        staffCanAccessRetailerInbox: staffCanAccessRetailerInbox,
        normalizeStaffTasks: normalizeStaffTasks,
        renderPermissionsMatrix: renderPermissionsMatrix,
        initPermissionsEditor: initPermissionsEditor,
        PERMISSION_MATRIX_ORDER: PERMISSION_MATRIX_ORDER,
        getDashboardHref: getDashboardHref,
        getInboxHref: getInboxHref,
        applySidebarPermissions: applySidebarPermissions,
        renderStaffSidebar: renderStaffSidebar,
        updateStaffHeader: updateStaffHeader,
        refreshStaffChrome: refreshStaffChrome,
        filterDashboardCards: filterDashboardCards
    };

    document.addEventListener('kreezby:page-load', function () {
        if (!/\/staff\//i.test(window.location.pathname || '')) return;
        updateStaffHeader();
        if (getCurrentPageFilename() === 'staff.html') {
            var profile = getStaffProfile(getCurrentStaffId());
            var title = 'Kreezby Bakeshop - ' + (profile.role || 'Staff') + ' Dashboard';
            requestAnimationFrame(function () { document.title = title; });
        }
    });

    document.addEventListener('DOMContentLoaded', function () {
        // Only enforce permissions UI/redirects on staff pages.
        // Admin pages may embed the permissions editor, and should not have their nav rewritten.
        var filename = getCurrentPageFilename();
        var isStaffPage = filename.indexOf('-staff.html') !== -1 || filename.indexOf('staff-') === 0 || filename === 'staff.html' || /^inbox-staff(-\d+)?\.html$/i.test(filename);
        if (isStaffPage) {
            var inferred = inferStaffIdFromPage();
            if (inferred) {
                sessionStorage.setItem(SESSION_STAFF_KEY, inferred);
            }
            guardCurrentPage();
            refreshStaffChrome();
        }

        var params = new URLSearchParams(window.location.search);
        if (params.get('denied') === '1') {
            var notice = document.createElement('div');
            notice.className = 'staff-access-denied-banner';
            notice.textContent = 'You do not have permission to open that page. Contact the Head Admin.';
            notice.style.cssText = 'background:#ffebee;color:#c62828;padding:12px 20px;margin-bottom:16px;border-radius:6px;font-size:14px;font-weight:600;';
            var container = document.querySelector('.workspace-container, .workspace-view-canvas, .workspace-canvas');
            if (container && container.firstChild) {
                container.insertBefore(notice, container.firstChild);
            }
        }
    });
})();
