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
            accountId: entry.accountId || '',
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

    // ---- Who is reporting: always the signed-in account, never a typed or made-up name ----
    var ROLE_LABELS = {
        'Head Administrator': 'Head Admin',
        'Administrator': 'Admin',
        'Admin': 'Admin',
        'Staff': 'Staff',
        'Retailer': 'Retailer',
        'Customer': 'Customer',
        'Regular Customer': 'Customer'
    };
    var ROLE_BUCKETS = {
        'Head Administrator': 'admins', 'Administrator': 'admins', 'Admin': 'admins',
        'Staff': 'staff', 'Retailer': 'retailers', 'Customer': 'customers', 'Regular Customer': 'customers'
    };

    function readSession() {
        try {
            var s = JSON.parse(localStorage.getItem('kreezby_session') || '{}');
            return s && typeof s === 'object' ? s : {};
        } catch (e) { return {}; }
    }

    function lower(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

    // The account record of the signed-in user, from the shared account list.
    function findAccount(session) {
        var bucket = ROLE_BUCKETS[session.accountType];
        if (!bucket) return null;
        try {
            var users = JSON.parse(localStorage.getItem('kreezby_maintenance_users') || '{}');
            var rows = users && Array.isArray(users[bucket]) ? users[bucket] : [];
            var keys = [session.accountId, session.customerId, session.identity, session.username, session.email]
                .map(lower).filter(Boolean);
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i] || {};
                var rowKeys = [row.id, row.user_id, row.username, row.email, row.contact]
                    .map(lower).filter(Boolean);
                for (var k = 0; k < rowKeys.length; k++) {
                    if (keys.indexOf(rowKeys[k]) !== -1) return row;
                }
            }
        } catch (e) { /* use the session only */ }
        return null;
    }

    function currentReporter() {
        var session = readSession();
        var name = String(session.userName || '').trim();
        if (!name || !session.accountType) return null;
        var account = findAccount(session) || {};
        return {
            name: name,
            role: ROLE_LABELS[session.accountType] || session.accountType,
            contact: String(session.email || account.email || account.contact || account.phone || session.identity || '').trim(),
            accountId: String(session.accountId || session.customerId || account.id || account.user_id || session.identity || '')
        };
    }

    // Fill the report form with the signed-in account so the name cannot be changed.
    function fillReportForm() {
        var reporter = currentReporter();
        if (!reporter) return;
        document.querySelectorAll('form.report-form, form#customer-issue-form, form[data-issue-form]').forEach(function (form) {
            var nameInput = form.querySelector('[name="fullName"]');
            var storeInput = form.querySelector('[name="storeName"]');
            var contactInput = form.querySelector('[name="email"]') || form.querySelector('[name="contact"]');
            [nameInput, storeInput].forEach(function (input) {
                if (!input) return;
                input.value = reporter.name;
                input.readOnly = true;
                input.title = 'Filled from the account you are signed in with.';
            });
            if (contactInput && reporter.contact) {
                var fitsEmail = contactInput.type !== 'email' || /@/.test(reporter.contact);
                if (fitsEmail && !contactInput.value) contactInput.value = reporter.contact;
            }
        });
    }

    if (root.document) {
        if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', fillReportForm);
        else fillReportForm();
    }

    function add(entry) {
        // Whoever is signed in is the reporter, whatever was typed in the form.
        var reporter = currentReporter();
        if (reporter && entry && typeof entry === 'object') {
            entry.submittedBy = reporter.name;
            entry.accountId = reporter.accountId;
            if (!entry.role || entry.role === 'User') entry.role = reporter.role;
            if (reporter.contact) entry.contact = reporter.contact;
        }
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
        var roots = ['admin', 'staff', 'admin_names', 'staff_names', 'retailer', 'customer', 'auth'];
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
        currentReporter: currentReporter,
        setStatus: setStatus,
        formatReceived: formatReceived,
        inboxHref: inboxHref
    };
})(window);
