/**
 * Staff task permissions — Head Admin controls which hamburger items each staff can access.
 * Permissions persist in localStorage (key: kreezby_staff_permissions).
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezby_staff_permissions';
    var SESSION_STAFF_KEY = 'kreezby_current_staff';

    var STAFF_PROFILES = {
        'staff-imelda': {
            id: 'staff-imelda',
            name: 'Imelda Atienza',
            role: 'Staff',
            welcome: 'Staff',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        },
        'staff-nichole': {
            id: 'staff-nichole',
            name: 'Nichole Ramos',
            role: 'Staff',
            welcome: 'Staff',
            dashboard: 'staff.html',
            inbox: 'inbox-staff.html'
        }
    };

    var TASKS = {
        dashboard: { label: 'Dashboard', page: 'staff.html' },
        bo: { label: 'Back Order', page: 'bo-staff.html' },
        stocks: { label: 'Stocks', page: 'stocks-staff.html' },
        saleslist: { label: 'Sales List', page: 'saleslist-staff.html' },
        pos: { label: 'Point of Sale', page: 'pos-staff.html' },
        dailysales: { label: 'Daily Sales', page: 'dailysales-staff.html' },
        alert: { label: 'Alert', page: 'alert-staff.html' },
        stocklevel: { label: 'Stock Level', page: 'stocklevel-staff.html' },
        inventoryreport: { label: 'Inventory Report', page: 'inventoryreport-staff.html' },
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
        'staff-imelda': ['dashboard', 'bo', 'stocks', 'saleslist', 'pos', 'dailysales', 'aiforecast', 'deliveryschedule', 'alert', 'ordertracking', 'stocklevel', 'inventoryreport', 'inbox', 'inbox_retailer'],
        'staff-nichole': ['dashboard', 'bo', 'stocks', 'saleslist', 'pos', 'dailysales', 'aiforecast', 'deliveryschedule', 'alert', 'ordertracking', 'stocklevel', 'inventoryreport', 'inbox', 'inbox_retailer']
    };

    var TASK_ORDER = [
        'dashboard', 'bo', 'stocks',
        'saleslist', 'pos', 'dailysales', 'aiforecast', 'deliveryschedule', 'alert', 'ordertracking',
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
    PAGE_TO_TASK['stocklevel-value-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-alerts-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-slow-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['stocklevel-chart-staff.html'] = 'stocklevel';
    PAGE_TO_TASK['order-tracking-staff.html'] = 'ordertracking';
    for (var inboxN = 1; inboxN <= 7; inboxN++) {
        PAGE_TO_TASK['inbox-staff-' + inboxN + '.html'] = 'inbox';
    }
    PAGE_TO_TASK['inbox-staff.html'] = 'inbox';
    PAGE_TO_TASK['insight-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['forecast-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['profile-staff.html'] = null;

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
        try {
            if (localStorage.getItem('kreezby_staff_delivery_nav_v1') !== '1') {
                localStorage.setItem('kreezby_staff_delivery_nav_v1', '1');
            }
        } catch (e) { /* ignore */ }
        return grantPos(stored);
    }

    function grantPos(stored) {
        try {
            if (localStorage.getItem('kreezby_staff_pos_nav_v1') !== '1') {
                localStorage.setItem('kreezby_staff_pos_nav_v1', '1');
            }
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
            return staff && staff.id && staff.active !== false;
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
            if (id.indexOf('imelda') >= 0) return 'staff-imelda';
            if (id.indexOf('nichole') >= 0) return 'staff-nichole';
        } catch (e) { /* ignore */ }
        return '';
    }

    function tasksForStaff(staff) {
        var text = (String(staff.department || '') + ' ' + String(staff.role || '')).toLowerCase();
        if (text.indexOf('sales') >= 0) {
            return ['dashboard', 'saleslist', 'pos', 'dailysales', 'aiforecast', 'alert', 'deliveryschedule'];
        }
        if (text.indexOf('software') >= 0 || text.indexOf('it') >= 0) {
            return ['dashboard', 'stocks', 'pos', 'alert', 'inbox', 'deliveryschedule'];
        }
        if (text.indexOf('production') >= 0) {
            return ['dashboard', 'stocks', 'pos', 'stocklevel', 'alert', 'deliveryschedule'];
        }
        if (text.indexOf('admin') >= 0 || text.indexOf('executive') >= 0) {
            return ['dashboard', 'saleslist', 'pos', 'alert', 'inbox', 'deliveryschedule'];
        }
        return ['dashboard', 'pos', 'alert', 'deliveryschedule'];
    }

    function pruneStoredPermissions(stored) {
        if (!stored) return stored;
        var allowed = {};
        accountStaffList().forEach(function (staff) { allowed[staff.id] = 1; });
        Object.keys(STAFF_PROFILES).forEach(function (id) { allowed[id] = 1; });
        var changed = false;
        Object.keys(stored).forEach(function (id) {
            if (!allowed[id]) {
                delete stored[id];
                changed = true;
            }
        });
        if (changed) saveAllPermissions(stored);
        return stored;
    }

    function getAllPermissions() {
        var stored = pruneStoredPermissions(grantDeliverySchedule(getStoredPermissions())) || {};
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

    function persistStaffAccess(staffId, tasks) {
        tasks = normalizeStaffTasks(tasks);
        var all = getAllPermissions();
        var before = (all[staffId] || []).slice();
        all[staffId] = tasks.slice();
        saveAllPermissions(all);
        notifyAccessChange(staffId, before, tasks);
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
        if (/\/staff\//i.test(window.location.pathname || '')) return '';
        if (accounts.length) return accounts[0].id;
        return 'staff-imelda';
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
        return STAFF_PROFILES['staff-imelda'];
    }

    function getStaffTasks(staffId) {
        staffId = staffId || getCurrentStaffId();
        var all = getAllPermissions();
        return normalizeStaffTasks(all[staffId] || ['dashboard']);
    }

    function normalizeStaffTasks(tasks) {
        var normalized = (tasks || []).slice();
        if (normalized.indexOf('dashboard') === -1) {
            normalized.unshift('dashboard');
        }
        if (normalized.indexOf('inbox_retailer') !== -1 && normalized.indexOf('inbox') === -1) {
            normalized.push('inbox');
        }
        return normalized.filter(function (task) { return task !== 'receive'; });
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
        if (Object.prototype.hasOwnProperty.call(PAGE_TO_TASK, base)) return PAGE_TO_TASK[base];
        if (base.indexOf('insight-') === 0 || base.indexOf('forecast-') === 0 || base.indexOf('aiforecast_') === 0) return 'aiforecast';
        if (base.indexOf('stocklevel') === 0) return 'stocklevel';
        return null;
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
            welcome.textContent = profile.name ? ('Welcome, ' + profile.name) : 'Welcome';
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

        var host = root.querySelector('.roles-navigator-card');
        var accounts = accountStaffList();
        if (host && accounts.length) {
            host.querySelectorAll('.archived-empty, .role-selection-pill').forEach(function (node) { node.remove(); });
            accounts.forEach(function (staff, index) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'role-selection-pill' + (index === 0 ? ' active-role' : '');
                button.setAttribute('data-staff-id', staff.id);
                button.innerHTML = staff.name + '<br><span class="staff-task-hint">' +
                    (staff.username || '') + ' · ' + (staff.role || 'Staff') + '</span>';
                host.appendChild(button);
            });
        }
        var pills = root.querySelectorAll('.role-selection-pill');
        if (!pills.length) {
            titleEl.textContent = 'No staff accounts';
            matrixBody.innerHTML = '<tr><td colspan="2">No staff accounts yet.</td></tr>';
            saveBtn.disabled = true;
            return null;
        }

        var selectedStaffPermissionsId = pills[0].getAttribute('data-staff-id') || 'staff-imelda';
        var activePill = root.querySelector('.role-selection-pill.active-role');
        if (activePill) {
            selectedStaffPermissionsId = activePill.getAttribute('data-staff-id') || selectedStaffPermissionsId;
        }

        function renderPanel() {
            var profile = getStaffProfile(selectedStaffPermissionsId);
            titleEl.textContent = 'Task Access — ' + profile.name;
            renderPermissionsMatrix(matrixBody, selectedStaffPermissionsId);
        }

        pills.forEach(function (pill) {
            pill.onclick = function () {
                pills.forEach(function (p) { p.classList.remove('active-role'); });
                pill.classList.add('active-role');
                selectedStaffPermissionsId = pill.getAttribute('data-staff-id');
                renderPanel();
                showPermissionStatus(root, '');
            };
        });

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

    function portalLoginHref() {
        var path = (window.location.pathname || '').replace(/\\/g, '/');
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
        var path = window.location.pathname;
        var filename = path.split('/').pop() || '';
        if (filename.indexOf('-staff.html') === -1 && filename.indexOf('staff-') !== 0 && !/^inbox-staff(-\d+)?\.html$/i.test(filename)) {
            return;
        }
        if (filename === 'report_issue-staff.html') return;
        if (filename === 'receive-staff.html') {
            window.location.replace(getDashboardHref(getCurrentStaffId()));
            return;
        }

        var staffId = getCurrentStaffId();
        if (!staffId) {
            window.location.replace(portalLoginHref());
            return;
        }
        var taskKey = getTaskForPage(filename);
        if (!taskKey) {
            if (filename === 'profile-staff.html') return;
            window.location.replace(getDashboardHref(staffId));
            return;
        }
        if (!staffCanAccessTask(taskKey, staffId)) {
            window.location.replace(getDashboardHref(staffId));
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
        clearDeniedNotice();
        if (isStaffPage) {
            var inferred = inferStaffIdFromPage();
            if (inferred) {
                sessionStorage.setItem(SESSION_STAFF_KEY, inferred);
            }
            guardCurrentPage();
            refreshStaffChrome();
        }
    });

    document.addEventListener('kreezby:remote-state', function (event) {
        var keys = (event.detail && event.detail.keys) || [];
        if (keys.indexOf(STORAGE_KEY) === -1) return;
        var body = document.getElementById('staff-permissions-matrix-body');
        var active = document.querySelector('#staff-permissions-root .role-selection-pill.active-role');
        if (body && active) renderPermissionsMatrix(body, active.getAttribute('data-staff-id'));
        var filename = getCurrentPageFilename();
        var isStaffPage = filename.indexOf('-staff.html') !== -1 || filename.indexOf('staff-') === 0 || filename === 'staff.html' || /^inbox-staff(-\d+)?\.html$/i.test(filename);
        if (isStaffPage) {
            guardCurrentPage();
            refreshStaffChrome();
        }
    });
})();
