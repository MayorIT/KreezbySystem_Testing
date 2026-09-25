/**
 * Head Admin partnership inquiry inbox.
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

    function placeholderDetail() {
        return '<span class="support-card-kicker">Inquiry detail</span>' +
            '<h3>Select an inquiry</h3>' +
            '<p>Click a row to read the partnership request and update its status.</p>';
    }

    function boot() {
        if (!window.KreezbyPartnerInquiries) return;
        var tbody = document.getElementById('inquiries-tbody');
        var empty = document.getElementById('inquiries-empty');
        var detail = document.getElementById('inquiry-detail');
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
            var allRows = KreezbyPartnerInquiries.list();
            updateStats(allRows);
            var rows = statusFilter
                ? allRows.filter(function (row) { return row.status === statusFilter; })
                : allRows;
            tbody.innerHTML = rows.map(function (row) {
                var selected = row.id === selectedId ? ' is-selected' : '';
                return '<tr class="' + selected.trim() + '" data-inquiry-id="' + escapeHtml(row.id) + '">' +
                    '<td>' + escapeHtml(row.id) + '</td>' +
                    '<td>' + escapeHtml(row.interest) + '</td>' +
                    '<td>' + escapeHtml(row.submittedBy) + '</td>' +
                    '<td>' + escapeHtml(row.businessName || '—') + '</td>' +
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
            var rows = KreezbyPartnerInquiries.list();
            var row = null;
            rows.forEach(function (item) { if (item.id === id) row = item; });
            if (!row || !detail) return;
            selectedId = id;
            detail.innerHTML =
                '<span class="support-card-kicker">' + escapeHtml(row.interest) + '</span>' +
                '<h2>' + escapeHtml(row.id) + '</h2>' +
                '<div class="issue-meta">' +
                    '<p><strong>Received:</strong> ' + escapeHtml(KreezbyPartnerInquiries.formatReceived(row.submittedAt)) + '</p>' +
                    '<p><strong>From:</strong> ' + escapeHtml(row.submittedBy) + '</p>' +
                    '<p><strong>Contact:</strong> ' + escapeHtml(row.contact || '—') + '</p>' +
                    '<p><strong>Business:</strong> ' + escapeHtml(row.businessName || '—') + '</p>' +
                    '<p><strong>Area:</strong> ' + escapeHtml(row.area || '—') + '</p>' +
                    '<p><strong>Message:</strong><br>' + escapeHtml(row.message || '—') + '</p>' +
                '</div>' +
                '<label class="issue-status-label" for="inquiry-status-select">Update status</label>' +
                '<select class="issue-status-select" id="inquiry-status-select">' +
                    '<option value="New"' + (row.status === 'New' ? ' selected' : '') + '>New</option>' +
                    '<option value="In Progress"' + (row.status === 'In Progress' ? ' selected' : '') + '>In Progress</option>' +
                    '<option value="Resolved"' + (row.status === 'Resolved' ? ' selected' : '') + '>Resolved</option>' +
                '</select>';
            var select = document.getElementById('inquiry-status-select');
            if (select) {
                select.addEventListener('change', function () {
                    KreezbyPartnerInquiries.setStatus(row.id, select.value);
                    render();
                });
            }
            Array.prototype.forEach.call(tbody.querySelectorAll('tr[data-inquiry-id]'), function (tr) {
                tr.classList.toggle('is-selected', tr.getAttribute('data-inquiry-id') === id);
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
            var tr = event.target.closest('tr[data-inquiry-id]');
            if (!tr) return;
            showDetail(tr.getAttribute('data-inquiry-id'));
        });

        render();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
