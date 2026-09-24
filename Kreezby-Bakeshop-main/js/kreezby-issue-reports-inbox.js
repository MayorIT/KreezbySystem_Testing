/**
 * Renders the IT student Issue Reports Inbox table.
 */
(function () {
    'use strict';

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

    function boot() {
        if (!window.KreezbyIssueReports) return;
        var tbody = document.getElementById('issue-reports-tbody');
        var empty = document.getElementById('issue-reports-empty');
        var detail = document.getElementById('issue-report-detail');
        if (!tbody) return;
        var selectedId = '';

        function render() {
            var rows = KreezbyIssueReports.list();
            tbody.innerHTML = rows.map(function (row) {
                return '<tr data-issue-id="' + escapeHtml(row.id) + '">' +
                    '<td>' + escapeHtml(row.id) + '</td>' +
                    '<td>' + escapeHtml(row.role) + '</td>' +
                    '<td>' + escapeHtml(row.submittedBy) + '</td>' +
                    '<td>' + escapeHtml(row.issueType) + '</td>' +
                    '<td>' + escapeHtml(row.reference) + '</td>' +
                    '<td>' + escapeHtml(KreezbyIssueReports.formatReceived(row.submittedAt)) + '</td>' +
                    '<td><span class="status-chip ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td>' +
                    '</tr>';
            }).join('');
            if (empty) empty.hidden = rows.length > 0;
            if (!rows.length && detail) detail.hidden = true;
            if (selectedId) showDetail(selectedId);
        }

        function showDetail(id) {
            var rows = KreezbyIssueReports.list();
            var row = null;
            rows.forEach(function (item) { if (item.id === id) row = item; });
            if (!row || !detail) return;
            selectedId = id;
            detail.hidden = false;
            detail.innerHTML =
                '<h2>' + escapeHtml(row.id) + ' — ' + escapeHtml(row.issueType) + '</h2>' +
                '<p><strong>From:</strong> ' + escapeHtml(row.submittedBy) + ' (' + escapeHtml(row.role) + ')</p>' +
                '<p><strong>Contact:</strong> ' + escapeHtml(row.contact || '—') + '</p>' +
                '<p><strong>Reference:</strong> ' + escapeHtml(row.reference) + '</p>' +
                '<p><strong>Priority:</strong> ' + escapeHtml(row.priority) + '</p>' +
                '<p><strong>Description:</strong><br>' + escapeHtml(row.description || '—') + '</p>' +
                (row.notes ? '<p><strong>Notes:</strong><br>' + escapeHtml(row.notes) + '</p>' : '') +
                (row.attachmentName ? '<p><strong>Attachment:</strong> ' + escapeHtml(row.attachmentName) + '</p>' : '') +
                '<label for="issue-status-select"><strong>Update status</strong></label>' +
                '<select id="issue-status-select">' +
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
        }

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
