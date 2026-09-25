/**
 * Renders the IT student Issue Reports Inbox table.
 */
(function () {
    'use strict';

    function isItSupport() {
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
            if (session.accountType === 'IT Support') return true;
            var id = String(session.identity || session.userName || '').toLowerCase().replace(/[\s_-]/g, '');
            return id === 'itkreezby' || id.indexOf('itkreezby') === 0;
        } catch (e) {
            return false;
        }
    }

    function bounceNonIt() {
        if (isItSupport()) return false;
        var session = {};
        try { session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}; } catch (e) { /* ignore */ }
        var type = session.accountType || '';
        var dest = '../auth/log_in.html';
        if (type === 'Head Administrator') dest = '../head_admin/report_issue-headadmin.html';
        else if (type === 'Administrator') dest = '../admin/report_issue-admin.html';
        else if (type === 'Staff') dest = '../staff/report_issue-staff.html';
        else if (type === 'Customer') dest = '../customer/report_issue-customer.html';
        else if (type === 'Retailer') dest = '../retailer/report_issue-retailer.html';
        else if (type === 'Wholesaler') dest = '../wholesaler/report_issue-wholesaler.html';
        window.location.replace(dest);
        return true;
    }

    if (bounceNonIt()) return;

    function statusClass(status) {
        if (status === 'In Progress') return 'status-progress';
        if (status === 'Resolved') return 'status-closed';
        return 'status-new';
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function placeholderDetail() {
        return '<span class="support-card-kicker">Ticket detail</span>' +
            '<h3>Select a report</h3>' +
            '<p>Click a row to read the full issue, contact details, and update status.</p>';
    }

    function boot() {
        if (!window.KreezbyIssueReports) return;
        var tbody = document.getElementById('issue-reports-tbody');
        var empty = document.getElementById('issue-reports-empty');
        var detail = document.getElementById('issue-report-detail');
        if (!tbody) return;
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

        function syncChips() {
            chips.forEach(function (chip) {
                chip.classList.toggle('is-active', (chip.getAttribute('data-status-filter') || '') === statusFilter);
            });
        }

        function render() {
            var allRows = KreezbyIssueReports.list();
            updateStats(allRows);
            var rows = statusFilter
                ? allRows.filter(function (row) { return row.status === statusFilter; })
                : allRows;
            tbody.innerHTML = rows.map(function (row) {
                var selected = row.id === selectedId ? ' is-selected' : '';
                return '<tr class="' + selected.trim() + '" data-issue-id="' + escapeHtml(row.id) + '">' +
                    '<td>' + escapeHtml(row.id) + '</td>' +
                    '<td>' + escapeHtml(row.role) + '</td>' +
                    '<td>' + escapeHtml(row.submittedBy) + '</td>' +
                    '<td>' + escapeHtml(row.issueType) + '</td>' +
                    '<td><span class="status-chip ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td>' +
                    '</tr>';
            }).join('');
            if (empty) empty.hidden = rows.length > 0;
            if (!allRows.length && detail) {
                selectedId = '';
                detail.innerHTML = placeholderDetail();
                return;
            }
            if (selectedId) showDetail(selectedId);
        }

        function showDetail(id) {
            var rows = KreezbyIssueReports.list();
            var row = null;
            rows.forEach(function (item) { if (item.id === id) row = item; });
            if (!row || !detail) return;
            selectedId = id;
            detail.innerHTML =
                '<span class="support-card-kicker">' + escapeHtml(row.role) + '</span>' +
                '<h2>' + escapeHtml(row.id) + '</h2>' +
                '<div class="issue-meta">' +
                    '<p><strong>Received:</strong> ' + escapeHtml(KreezbyIssueReports.formatReceived(row.submittedAt)) + '</p>' +
                    '<p><strong>Issue:</strong> ' + escapeHtml(row.issueType) + '</p>' +
                    '<p><strong>From:</strong> ' + escapeHtml(row.submittedBy) + '</p>' +
                    '<p><strong>Contact:</strong> ' + escapeHtml(row.contact || '—') + '</p>' +
                    '<p><strong>Reference:</strong> ' + escapeHtml(row.reference) + '</p>' +
                    '<p><strong>Priority:</strong> ' + escapeHtml(row.priority) + '</p>' +
                    '<p><strong>Description:</strong><br>' + escapeHtml(row.description || '—') + '</p>' +
                    (row.notes ? '<p><strong>Notes:</strong><br>' + escapeHtml(row.notes) + '</p>' : '') +
                    (row.attachmentName ? '<p><strong>Attachment:</strong> ' + escapeHtml(row.attachmentName) + '</p>' : '') +
                '</div>' +
                '<label class="issue-status-label" for="issue-status-select">Update status</label>' +
                '<select class="issue-status-select" id="issue-status-select">' +
                    '<option value="New"' + (row.status === 'New' ? ' selected' : '') + '>New</option>' +
                    '<option value="In Progress"' + (row.status === 'In Progress' ? ' selected' : '') + '>In Progress</option>' +
                    '<option value="Resolved"' + (row.status === 'Resolved' ? ' selected' : '') + '>Resolved</option>' +
                '</select>';
            var select = document.getElementById('issue-status-select');
            if (select) {
                select.addEventListener('change', function () {
                    KreezbyIssueReports.setStatus(row.id, select.value);
                    render();
                });
            }
            Array.prototype.forEach.call(tbody.querySelectorAll('tr[data-issue-id]'), function (tr) {
                tr.classList.toggle('is-selected', tr.getAttribute('data-issue-id') === id);
            });
        }

        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                statusFilter = chip.getAttribute('data-status-filter') || '';
                syncChips();
                render();
            });
        });

        tbody.addEventListener('click', function (event) {
            var tr = event.target.closest('tr[data-issue-id]');
            if (!tr) return;
            showDetail(tr.getAttribute('data-issue-id'));
        });

        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
