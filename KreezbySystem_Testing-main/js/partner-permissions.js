/**
 * Retailer and customer module access, plus the Head Admin archive dialog.
 * Archived accounts cannot sign in. Reasons: didn't exist, deleted, changed business partner, or other.
 */
(function () {
    'use strict';

    var GROUPS = {
        retailers: {
            bucket: 'retailers',
            storageKey: 'kreezby_retailer_permissions',
            defaults: ['dashboard', 'bo', 'saleslist', 'inbox'],
            matrix: ['bo', 'saleslist', 'inbox'],
            tasks: {
                dashboard: { label: 'Dashboard' },
                bo: { label: 'Back Order' },
                saleslist: { label: 'Sales List' },
                inbox: { label: 'Inbox' }
            },
            empty: 'No retailer accounts yet.',
            hint: function (user) {
                return (user.username || user.email || 'Retailer') + (user.area ? ' · ' + user.area : '');
            }
        },
        customers: {
            bucket: 'customers',
            storageKey: 'kreezby_customer_permissions',
            defaults: ['shop', 'favorites', 'orders', 'profile', 'cart', 'help'],
            matrix: ['favorites', 'orders', 'profile', 'cart', 'help'],
            tasks: {
                shop: { label: 'Shop' },
                favorites: { label: 'Favorites' },
                orders: { label: 'Order Notification' },
                profile: { label: 'My Profile' },
                cart: { label: 'Cart and Checkout' },
                help: { label: 'Help Center' }
            },
            empty: 'No customer accounts yet.',
            hint: function (user) {
                return user.email || user.username || 'Customer';
            }
        }
    };

    var archiveFilter = 'all';
    var pendingArchive = null;

    function settings() {
        return window.KreezbyMaintenanceSettings || null;
    }

    function usersIn(bucket) {
        var api = settings();
        if (!api || typeof api.getUsers !== 'function') return [];
        return (api.getUsers()[bucket] || []).filter(function (user) {
            return user && user.id && user.active !== false && user.archived !== true;
        });
    }

    function readStored(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function tasksFor(group, user) {
        var stored = readStored(group.storageKey);
        if (stored[user.id]) return stored[user.id].slice();
        if (Array.isArray(user.tasks) && user.tasks.length) return user.tasks.slice();
        return group.defaults.slice();
    }

    function persistTasks(group, userId, tasks) {
        var stored = readStored(group.storageKey);
        stored[userId] = tasks.slice();
        try { localStorage.setItem(group.storageKey, JSON.stringify(stored)); } catch (e) { /* ignore */ }
        var api = settings();
        if (api && typeof api.getUsers === 'function' && typeof api.saveUsers === 'function') {
            var users = api.getUsers();
            (users[group.bucket] || []).forEach(function (user) {
                if (user && user.id === userId) user.tasks = tasks.slice();
            });
            api.saveUsers(users);
        }
        return tasks;
    }

    function showStatus(root, message) {
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

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function initGroupEditor(root, groupKey) {
        var group = GROUPS[groupKey];
        if (!root || !group) return;
        var matrixBody = root.querySelector('[data-permissions-matrix]');
        var titleEl = root.querySelector('[data-permissions-title]');
        var saveBtn = root.querySelector('[data-save-permissions]');
        var archiveBtn = root.querySelector('[data-archive-account]');
        var listEl = root.querySelector('[data-account-list]');
        var searchEl = root.querySelector('[data-account-search]');
        if (!matrixBody || !titleEl || !saveBtn || !listEl) return;

        var selectedId = '';

        function visibleUsers() {
            var query = searchEl ? String(searchEl.value || '').trim().toLowerCase() : '';
            return usersIn(group.bucket).filter(function (user) {
                if (!query) return true;
                return (user.name + ' ' + (user.username || '') + ' ' + (user.email || '') + ' ' + (user.area || '')).toLowerCase().indexOf(query) !== -1;
            });
        }

        function renderMatrix(userId) {
            var user = null;
            usersIn(group.bucket).forEach(function (item) {
                if (item.id === userId) user = item;
            });
            var allowed = user ? tasksFor(group, user) : [];
            matrixBody.innerHTML = '';
            group.matrix.forEach(function (taskKey) {
                var task = group.tasks[taskKey];
                var row = document.createElement('tr');
                row.innerHTML =
                    '<td><div class="permission-task-label">' + task.label + '</div></td>' +
                    '<td class="center-align"><label class="checkbox-container">' +
                    '<input type="checkbox" data-task="' + taskKey + '"' + (allowed.indexOf(taskKey) !== -1 ? ' checked' : '') + '>' +
                    '<span class="custom-checkmark"></span></label></td>';
                matrixBody.appendChild(row);
            });
        }

        function renderList() {
            var accounts = visibleUsers();
            if (!accounts.some(function (user) { return user.id === selectedId; })) {
                selectedId = accounts[0] ? accounts[0].id : '';
            }
            listEl.innerHTML = '';
            if (!accounts.length) {
                listEl.innerHTML = '<p class="archived-empty">' + group.empty + '</p>';
            }
            accounts.forEach(function (user) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'role-selection-pill' + (user.id === selectedId ? ' active-role' : '');
                button.innerHTML = escapeHtml(user.name) + '<br><span class="staff-task-hint">' + escapeHtml(group.hint(user)) + '</span>';
                button.onclick = function () {
                    selectedId = user.id;
                    renderList();
                    renderPanel();
                    showStatus(root, '');
                };
                listEl.appendChild(button);
            });
            saveBtn.disabled = !selectedId;
            if (archiveBtn) archiveBtn.disabled = !selectedId;
        }

        function renderPanel() {
            if (!selectedId) {
                titleEl.textContent = group.empty;
                matrixBody.innerHTML = '<tr><td colspan="2">' + group.empty + '</td></tr>';
                return;
            }
            var user = null;
            usersIn(group.bucket).forEach(function (item) {
                if (item.id === selectedId) user = item;
            });
            titleEl.textContent = 'Module access — ' + (user ? user.name : 'Account');
            renderMatrix(selectedId);
        }

        function checkedTasks() {
            var tasks = [group.defaults[0]];
            matrixBody.querySelectorAll('input[type="checkbox"]:checked').forEach(function (box) {
                var key = box.getAttribute('data-task');
                if (key && tasks.indexOf(key) === -1) tasks.push(key);
            });
            return tasks;
        }

        function applyChecked(sourceBox) {
            if (!selectedId) return;
            var tasks = persistTasks(group, selectedId, checkedTasks());
            var user = null;
            usersIn(group.bucket).forEach(function (item) {
                if (item.id === selectedId) user = item;
            });
            matrixBody.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
                box.checked = tasks.indexOf(box.getAttribute('data-task')) !== -1;
            });
            var taskKey = sourceBox ? sourceBox.getAttribute('data-task') : '';
            var task = group.tasks[taskKey];
            var detail = task
                ? task.label + (sourceBox.checked ? ' is now allowed' : ' is now blocked')
                : 'access updated';
            showStatus(root, (user ? user.name : 'Account') + ': ' + detail + '.');
        }

        matrixBody.addEventListener('change', function (event) {
            var box = event.target;
            if (!box || box.type !== 'checkbox') return;
            applyChecked(box);
        });
        saveBtn.onclick = function () { applyChecked(null); };
        if (archiveBtn) {
            archiveBtn.onclick = function () {
                if (!selectedId || !window.KreezbyAccountArchive) return;
                var user = null;
                usersIn(group.bucket).forEach(function (item) {
                    if (item.id === selectedId) user = item;
                });
                if (!user) return;
                window.KreezbyAccountArchive.open({
                    bucket: group.bucket,
                    id: user.id,
                    name: user.name,
                    onDone: function (result) {
                        renderList();
                        renderPanel();
                        if (result && result.message) showStatus(root, result.message);
                    }
                });
            };
        }
        if (searchEl) {
            searchEl.addEventListener('input', function () {
                renderList();
                renderPanel();
            });
        }

        var createForm = root.querySelector('[data-account-create]');
        if (createForm) {
            createForm.addEventListener('submit', function (event) {
                event.preventDefault();
                var api = settings();
                var status = createForm.querySelector('[data-create-status]');
                if (!api || typeof api.createAccount !== 'function') return;
                var result = api.createAccount(group.bucket, {
                    name: createForm.elements.name ? createForm.elements.name.value : '',
                    username: createForm.elements.username ? createForm.elements.username.value : '',
                    email: createForm.elements.email ? createForm.elements.email.value : '',
                    phone: createForm.elements.phone ? createForm.elements.phone.value : '',
                    area: createForm.elements.area ? createForm.elements.area.value : ''
                });
                if (status) status.textContent = result.message || '';
                if (!result.ok) return;
                createForm.reset();
                selectedId = result.id;
                renderList();
                renderPanel();
            });
        }

        renderList();
        renderPanel();
    }

    function refreshArchivedButton() {
        var button = document.getElementById('permissions-tab-archived');
        var api = settings();
        if (!button || !api || typeof api.listArchivedAccounts !== 'function') return;
        var count = api.listArchivedAccounts().length;
        button.textContent = count ? 'Archived (' + count + ')' : 'Archived';
    }

    function renderArchivedPanel() {
        var host = document.getElementById('archived-accounts-list');
        var api = settings();
        if (!host || !api) return;
        var rows = api.listArchivedAccounts().filter(function (row) {
            return archiveFilter === 'all' || row.reason === archiveFilter;
        });
        if (!rows.length) {
            host.innerHTML = '<p class="archived-empty">No archived accounts for this reason. Archive an account that didn\'t exist, was deleted, or changed business partner.</p>';
            return;
        }
        host.innerHTML = '<table class="matrix-table"><thead><tr><th>Account</th><th>Type</th><th>Reason</th><th></th></tr></thead><tbody>' +
            rows.map(function (row) {
                var note = row.note ? '<div class="staff-task-hint">' + escapeHtml(row.note) + '</div>' : '';
                return '<tr><td><strong>' + escapeHtml(row.name) + '</strong><div class="staff-task-hint">' + escapeHtml(row.detail) + '</div></td>' +
                    '<td>' + escapeHtml(row.type) + '</td>' +
                    '<td>' + escapeHtml(row.reasonLabel) + note + '</td>' +
                    '<td class="center-align"><button type="button" class="btn-restore-account" data-restore-bucket="' + escapeHtml(row.bucket) + '" data-restore-id="' + escapeHtml(row.id) + '">Restore</button></td></tr>';
            }).join('') +
            '</tbody></table>';
    }

    function openArchiveDialog(options) {
        pendingArchive = options;
        var dialog = document.getElementById('archive-account-dialog');
        var nameEl = document.getElementById('archive-dialog-name');
        var reasonEl = document.getElementById('archive-reason');
        var noteEl = document.getElementById('archive-note');
        var errorEl = document.getElementById('archive-dialog-error');
        if (!dialog) return;
        if (nameEl) nameEl.textContent = options.name + ' will be hidden from the active list and cannot sign in.';
        if (reasonEl) reasonEl.value = 'missing';
        if (noteEl) noteEl.value = '';
        if (errorEl) errorEl.textContent = '';
        dialog.hidden = false;
    }

    function closeArchiveDialog() {
        pendingArchive = null;
        var dialog = document.getElementById('archive-account-dialog');
        if (dialog) dialog.hidden = true;
    }

    function confirmArchive() {
        var api = settings();
        var errorEl = document.getElementById('archive-dialog-error');
        if (!pendingArchive || !api || typeof api.archiveAccount !== 'function') return;
        var reason = (document.getElementById('archive-reason') || {}).value || '';
        var note = (document.getElementById('archive-note') || {}).value || '';
        var result = api.archiveAccount(pendingArchive.bucket, pendingArchive.id, reason, note);
        if (!result.ok) {
            if (errorEl) errorEl.textContent = result.message;
            return;
        }
        var done = pendingArchive.onDone;
        closeArchiveDialog();
        refreshArchivedButton();
        renderArchivedPanel();
        if (typeof done === 'function') done(result);
    }

    function wireArchiveDialog() {
        var dialog = document.getElementById('archive-account-dialog');
        if (!dialog || dialog.getAttribute('data-wired') === '1') return;
        dialog.setAttribute('data-wired', '1');
        var cancel = document.getElementById('archive-cancel');
        var confirm = document.getElementById('archive-confirm');
        if (cancel) cancel.onclick = closeArchiveDialog;
        if (confirm) confirm.onclick = confirmArchive;
        dialog.addEventListener('click', function (event) {
            if (event.target === dialog) closeArchiveDialog();
        });
        var archivedList = document.getElementById('archived-accounts-list');
        if (archivedList) {
            archivedList.addEventListener('click', function (event) {
                var button = event.target.closest('[data-restore-id]');
                var api = settings();
                if (!button || !api || typeof api.restoreAccount !== 'function') return;
                var result = api.restoreAccount(button.getAttribute('data-restore-bucket'), button.getAttribute('data-restore-id'));
                if (!result.ok) {
                    var note = document.getElementById('archived-restore-status');
                    if (note) note.textContent = result.message;
                    return;
                }
                if (document.getElementById('admin-permissions-root')) {
                    window.location.reload();
                    return;
                }
                refreshArchivedButton();
                renderArchivedPanel();
            });
        }
        document.querySelectorAll('[data-archive-filter]').forEach(function (button) {
            button.addEventListener('click', function () {
                archiveFilter = button.getAttribute('data-archive-filter') || 'all';
                document.querySelectorAll('[data-archive-filter]').forEach(function (item) {
                    item.classList.toggle('is-active', item === button);
                });
                renderArchivedPanel();
            });
        });
    }

    window.KreezbyAccountArchive = {
        open: openArchiveDialog,
        renderPanel: renderArchivedPanel,
        refreshCount: refreshArchivedButton
    };

    function boot() {
        wireArchiveDialog();
        initGroupEditor(document.getElementById('retailer-permissions-root'), 'retailers');
        initGroupEditor(document.getElementById('customer-permissions-root'), 'customers');
        refreshArchivedButton();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
