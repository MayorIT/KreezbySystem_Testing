/**
 * Issue-report inbox for Head Admin, and for admins granted Issue Reports.
 */
(function () {
    'use strict';

    function readSession() {
        try {
            return JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
        } catch (e) {
            return {};
        }
    }

    function viewerMayOpen() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        var session = readSession();
        var type = session.accountType || '';
        var api = window.KreezbyAdminPermissions;
        if (api && api.isHeadAdmin()) return true;
        if (type === 'Head Administrator') return true;
        if (!type && path.indexOf('/head_admin/') >= 0) return true;
        if (api && api.adminCanAccessTask('issuereports')) return true;
        return false;
    }

    function deny() {
        var path = (location.pathname || '').replace(/\\/g, '/');
        if (path.indexOf('/head_admin/') >= 0) {
            window.location.replace('head_admin.html');
            return;
        }
        if (path.indexOf('/admin_names/') >= 0) {
            window.location.replace('admin.html?denied=1');
            return;
        }
        window.location.replace('admin.html?denied=1');
    }

    if (!viewerMayOpen()) {
        deny();
        return;
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function statusClass(status) {
        if (status === 'In Progress') return 'status-progress';
        if (status === 'Resolved') return 'status-closed';
        return 'status-new';
    }

    function boot() {
        if (!window.KreezbyIssueReports) return;
        var tbody = document.getElementById('received-issues-tbody');
        var empty = document.getElementById('received-issues-empty');
        var detail = document.getElementById('received-issue-detail');
        if (!tbody || !detail) return;

        var selectedId = '';
        var statusFilter = '';
        var chips = document.querySelectorAll('[data-status-filter]');
        var statNew = document.getElementById('stat-new');
        var statProgress = document.getElementById('stat-progress');
        var statResolved = document.getElementById('stat-resolved');

        function updateStats(rows) {
            var counts = { New: 0, 'In Progress': 0, Resolved: 0 };
            rows.forEach(function (row) {
                if (counts[row.status] != null) counts[row.status] += 1;
            });
            if (statNew) statNew.textContent = String(counts.New);
            if (statProgress) statProgress.textContent = String(counts['In Progress']);
            if (statResolved) statResolved.textContent = String(counts.Resolved);
        }

        function placeholder() {
            detail.innerHTML =
                '<span class="support-card-kicker">Report detail</span>' +
                '<h3>Select a report</h3>' +
                '<p>Choose a row to read the issue and update its status.</p>';
        }

        function renderDetail(row) {
            if (!row) {
                placeholder();
                return;
            }
            detail.innerHTML =
                '<span class="support-card-kicker">' + escapeHtml(row.id) + '</span>' +
                '<h3>' + escapeHtml(row.issueType) + '</h3>' +
                '<p><strong>' + escapeHtml(row.submittedBy) + '</strong> · ' + escapeHtml(row.role) + '</p>' +
                '<p>' + escapeHtml(row.contact) + '</p>' +
                '<p>Priority: ' + escapeHtml(row.priority) + '</p>' +
                '<p>Reference: ' + escapeHtml(row.reference) + '</p>' +
                '<p>' + escapeHtml(row.description) + '</p>' +
                (row.notes ? '<p>' + escapeHtml(row.notes) + '</p>' : '') +
                '<p>Received ' + escapeHtml(KreezbyIssueReports.formatReceived(row.submittedAt)) + '</p>' +
                '<div class="form-actions">' +
                    '<button type="button" data-set-status="New">New</button>' +
                    '<button type="button" data-set-status="In Progress">In Progress</button>' +
                    '<button type="button" data-set-status="Resolved">Resolved</button>' +
                '</div>';
            detail.querySelectorAll('[data-set-status]').forEach(function (button) {
                button.addEventListener('click', function () {
                    KreezbyIssueReports.setStatus(row.id, button.getAttribute('data-set-status'));
                    render();
                });
            });
        }

        function render() {
            var rows = KreezbyIssueReports.list();
            updateStats(rows);
            var visible = rows.filter(function (row) {
                return !statusFilter || row.status === statusFilter;
            });
            tbody.innerHTML = visible.map(function (row) {
                return '<tr data-id="' + escapeHtml(row.id) + '"' + (row.id === selectedId ? ' class="is-selected"' : '') + '>' +
                    '<td>' + escapeHtml(row.id) + '</td>' +
                    '<td>' + escapeHtml(row.issueType) + '</td>' +
                    '<td>' + escapeHtml(row.submittedBy) + '</td>' +
                    '<td>' + escapeHtml(row.role) + '</td>' +
                    '<td><span class="' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td>' +
                '</tr>';
            }).join('');
            if (empty) empty.hidden = visible.length > 0;
            var selected = null;
            rows.forEach(function (row) {
                if (row.id === selectedId) selected = row;
            });
            if (selectedId && !selected) selectedId = '';
            renderDetail(selected);
            tbody.querySelectorAll('tr').forEach(function (tr) {
                tr.addEventListener('click', function () {
                    selectedId = tr.getAttribute('data-id') || '';
                    render();
                });
            });
        }

        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                statusFilter = chip.getAttribute('data-status-filter') || '';
                chips.forEach(function (other) {
                    other.classList.toggle('is-active', other === chip);
                });
                render();
            });
        });

        placeholder();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
