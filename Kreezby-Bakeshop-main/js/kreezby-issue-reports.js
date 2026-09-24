/**
 * Shared issue-report store for every portal.
 * User forms write here; IT students read them in it_kreezby/index.html.
 */
(function (root) {
    'use strict';

    var STORAGE_KEY = 'kreezby-issue-reports-v1';
    var CUSTOMER_LEGACY_KEY = 'kreezbyCustomerIssueReports';

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function readRaw() {
        try {
            var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function writeRaw(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    }

    function formatReceived(iso) {
        var d = iso ? new Date(iso) : new Date();
        if (isNaN(d.getTime())) return String(iso || '');
        return d.toLocaleString('en-PH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    }

    function normalize(entry) {
        if (!entry || typeof entry !== 'object') return null;
        var status = String(entry.status || 'New');
        if (status === 'Closed') status = 'Resolved';
        return {
            id: entry.id || ('ISS-' + Date.now()),
            role: entry.role || 'User',
            submittedBy: entry.submittedBy || entry.fullName || 'Unknown',
            contact: entry.contact || entry.email || '',
            issueType: entry.issueType || 'Other',
            reference: entry.reference || entry.orderNumber || entry.affectedArea || entry.branch || '—',
            description: entry.description || '',
            notes: entry.notes || entry.steps || '',
            attachmentName: entry.attachmentName || '',
            priority: entry.priority || 'Normal',
            status: status,
            submittedAt: entry.submittedAt || new Date().toISOString()
        };
    }

    function importLegacyCustomerReports(list) {
        var existingIds = {};
        list.forEach(function (item) { existingIds[item.id] = true; });
        try {
            var legacy = JSON.parse(localStorage.getItem(CUSTOMER_LEGACY_KEY) || '[]');
            if (!Array.isArray(legacy)) return list;
            legacy.forEach(function (item) {
                var mapped = normalize({
                    id: item.id,
                    role: 'Customer',
                    submittedBy: item.fullName,
                    contact: item.contact,
                    issueType: item.issueType,
                    reference: item.orderNumber,
                    description: item.description,
                    notes: item.notes,
                    attachmentName: item.attachmentName,
                    status: 'New',
                    submittedAt: item.submittedAt
                });
                if (mapped && !existingIds[mapped.id]) {
                    list.push(mapped);
                    existingIds[mapped.id] = true;
                }
            });
        } catch (e) { /* ignore */ }
        return list;
    }

    function list() {
        var rows = importLegacyCustomerReports(readRaw().map(normalize).filter(Boolean));
        rows.sort(function (a, b) {
            return String(b.submittedAt).localeCompare(String(a.submittedAt));
        });
        writeRaw(rows);
        return clone(rows);
    }

    function add(entry) {
        var report = normalize(entry);
        var rows = list();
        rows.unshift(report);
        writeRaw(rows);
        return clone(report);
    }

    function setStatus(id, status) {
        var rows = list();
        var found = null;
        rows.forEach(function (row) {
            if (row.id === id) {
                row.status = status || row.status;
                found = row;
            }
        });
        writeRaw(rows);
        return found ? clone(found) : null;
    }

    function inboxHref() {
        var path = ((root.location && root.location.pathname) || '').replace(/\\/g, '/').toLowerCase();
        if (path.indexOf('/it_kreezby/') >= 0) return 'index.html';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();
        var depth = 0;
        var roots = ['admin', 'staff', 'retailer', 'customer', 'wholesaler', 'auth'];
        for (var i = parts.length - 1; i >= 0; i--) {
            if (roots.indexOf(parts[i]) >= 0) {
                depth = parts.length - i - 1;
                break;
            }
        }
        var prefix = '';
        for (var d = 0; d <= depth; d++) prefix += '../';
        return prefix + 'it_kreezby/index.html';
    }

    root.KreezbyIssueReports = {
        STORAGE_KEY: STORAGE_KEY,
        add: add,
        list: list,
        setStatus: setStatus,
        formatReceived: formatReceived,
        inboxHref: inboxHref
    };
})(window);
