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
            dashboard: 'staff-1.html',
            inbox: 'inbox-staff-1.html'
        },
        'staff-2': {
            id: 'staff-2',
            name: 'Staff 2',
            role: 'Receiving Team',
            dashboard: 'staff-2.html',
            inbox: 'inbox-staff-2.html'
        },
        'staff-3': {
            id: 'staff-3',
            name: 'Staff 3',
            role: 'Inventory Team',
            dashboard: 'staff-3.html',
            inbox: 'inbox-staff-3.html'
        },
        'staff-4': {
            id: 'staff-4',
            name: 'Derek Lim (Staff 4)',
            role: 'Sales Floor Staff',
            dashboard: 'staff-4.html',
            inbox: 'inbox-staff-4.html'
        },
        'staff-5': {
            id: 'staff-5',
            name: 'Nina Garcia (Staff 5)',
            role: 'Packaging Staff',
            dashboard: 'staff-5.html',
            inbox: 'inbox-staff-5.html'
        },
        'staff-6': {
            id: 'staff-6',
            name: 'Omar Reyes (Staff 6)',
            role: 'Dispatch Staff',
            dashboard: 'staff-6.html',
            inbox: 'inbox-staff-6.html'
        },
        'staff-7': {
            id: 'staff-7',
            name: 'Grace Tan (Staff 7)',
            role: 'Customer Service Staff',
            dashboard: 'staff-7.html',
            inbox: 'inbox-staff-7.html'
        }
    };

    var TASKS = {
        dashboard: { label: 'Dashboard', page: 'staff-1.html' },
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
        aiforecast: { label: 'AI Forecast', page: 'aiforecast-staff.html' },
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
        'staff-1': ['dashboard', 'saleslist', 'dailysales', 'alert', 'ordertracking', 'inbox'],
        'staff-2': ['dashboard', 'po', 'receive', 'bo', 'return', 'alert'],
        'staff-3': ['dashboard', 'stocks', 'stocklevel', 'inventoryreport', 'alert'],
        'staff-4': ['dashboard', 'saleslist', 'dailysales', 'aiforecast', 'alert'],
        'staff-5': ['dashboard', 'stocks', 'stocklevel', 'alert'],
        'staff-6': ['dashboard', 'receive', 'bo', 'return', 'alert', 'ordertracking'],
        'staff-7': ['dashboard', 'inbox', 'inbox_retailer', 'saleslist', 'alert', 'ordertracking']
    };

    var TASK_ORDER = [
        'dashboard', 'po', 'receive', 'bo', 'return', 'stocks',
        'saleslist', 'dailysales', 'aiforecast', 'alert', 'ordertracking',
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
    PAGE_TO_TASK['staff-1.html'] = 'dashboard';
    PAGE_TO_TASK['staff-2.html'] = 'dashboard';
    PAGE_TO_TASK['staff-3.html'] = 'dashboard';
    PAGE_TO_TASK['staff-4.html'] = 'dashboard';
    PAGE_TO_TASK['staff-5.html'] = 'dashboard';
    PAGE_TO_TASK['staff-6.html'] = 'dashboard';
    PAGE_TO_TASK['staff-7.html'] = 'dashboard';
    PAGE_TO_TASK['report_issue-staff.html'] = null;
    PAGE_TO_TASK['report_issue-received-students.html'] = null;
    PAGE_TO_TASK['aiforecast_salestrend-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['aiforecast_salesanalysis-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['aiforecast_inventoryreport-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['aiforecast_deliveryoverview-staff.html'] = 'aiforecast';
    PAGE_TO_TASK['aiforecast_bestselling-staff.html'] = 'aiforecast';
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

    function getAllPermissions() {
        var stored = getStoredPermissions();
        var merged = {};
        Object.keys(STAFF_PROFILES).forEach(function (staffId) {
            merged[staffId] = (stored && stored[staffId])
                ? stored[staffId].slice()
                : (DEFAULT_PERMISSIONS[staffId] || ['dashboard']).slice();
        });
        return merged;
    }

    function saveAllPermissions(perms) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(perms));
    }

    function getCurrentStaffId() {
        return sessionStorage.getItem(SESSION_STAFF_KEY) || 'staff-1';
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
        return STAFF_PROFILES[staffId] || STAFF_PROFILES['staff-1'];
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
        return profile.inbox || 'inbox-staff-1.html';
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
        var allowed = getStaffTasks(staffId);

        document.querySelectorAll(
            'a.home-badge[href="staff.html"], a.home-badge[href*="staff-"], a[href="staff.html"].btn-secondary'
        ).forEach(function (link) {
            link.setAttribute('href', dashboardHref);
        });

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (right) {
            var inboxLink = right.querySelector('a[data-staff-inbox]');
            if (allowed.indexOf('inbox') === -1) {
                if (inboxLink) inboxLink.remove();
            } else {
                if (!inboxLink) {
                    inboxLink = document.createElement('a');
                    inboxLink.className = 'top-nav-item';
                    inboxLink.setAttribute('data-staff-inbox', '1');
                    inboxLink.setAttribute('data-turbo-frame', '_top');
                    var home = right.querySelector('a.home-badge');
                    if (home && home.nextSibling) {
                        home.parentNode.insertBefore(inboxLink, home.nextSibling);
                    } else {
                        var anchor = right.querySelector('.notification-pill, .user-dropdown');
                        right.insertBefore(inboxLink, anchor || null);
                    }
                }
                inboxLink.href = getInboxHref(staffId);
                inboxLink.textContent = 'Inbox';
                var navWrap = right.querySelector('.expandable-nav-tabs');
                if (navWrap && !navWrap.contains(inboxLink)) {
                    navWrap.appendChild(inboxLink);
                }
            }

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

        var pills = root.querySelectorAll('.role-selection-pill');
        var matrixBody = root.querySelector('#permissions-matrix-body');
        var titleEl = root.querySelector('#permissions-panel-title');
        var saveBtn = root.querySelector('#btn-save-permissions');
        if (!matrixBody || !titleEl || !saveBtn) return null;

        var selectedStaffPermissionsId = 'staff-1';
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
            };
        });

        saveBtn.onclick = function () {
            var tasks = ['dashboard'];
            matrixBody.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
                tasks.push(cb.getAttribute('data-task'));
            });
            tasks = normalizeStaffTasks(tasks);
            var all = getAllPermissions();
            all[selectedStaffPermissionsId] = tasks;
            saveAllPermissions(all);
            alert('Permissions saved for ' + getStaffProfile(selectedStaffPermissionsId).name + '.');
            renderPanel();
        };

        renderPanel();
        return { getSelectedStaffId: function () { return selectedStaffPermissionsId; } };
    }

    function guardCurrentPage() {
        var path = window.location.pathname;
        var filename = path.split('/').pop() || '';
        if (filename.indexOf('-staff.html') === -1 && filename.indexOf('staff-') !== 0) {
            return;
        }
        if (filename === 'report_issue-staff.html') return;
        if (filename === 'report_issue-received-students.html') return;

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

    document.addEventListener('DOMContentLoaded', function () {
        // Only enforce permissions UI/redirects on staff pages.
        // Admin pages may embed the permissions editor, and should not have their nav rewritten.
        var filename = getCurrentPageFilename();
        var isStaffPage = filename.indexOf('-staff.html') !== -1 || filename.indexOf('staff-') === 0 || filename === 'staff.html';
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
