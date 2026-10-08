/**
 * Partnership / wholesale inquiries from the checkout ad landing page.
 * Head Admin reads these in head_admin/inquiries.html.
 */
(function (root) {
    'use strict';

    var STORAGE_KEY = 'kreezby-partner-inquiries-v1';

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
            id: entry.id || ('INQ-' + Date.now()),
            submittedBy: entry.submittedBy || entry.fullName || 'Unknown',
            contact: entry.contact || entry.email || '',
            businessName: entry.businessName || '',
            interest: entry.interest || 'Retailer',
            area: entry.area || '',
            message: entry.message || entry.description || '',
            status: status,
            submittedAt: entry.submittedAt || new Date().toISOString()
        };
    }

    function list() {
        var rows = readRaw().map(normalize).filter(Boolean);
        rows.sort(function (a, b) {
            return String(b.submittedAt).localeCompare(String(a.submittedAt));
        });
        writeRaw(rows);
        return clone(rows);
    }

    function add(entry) {
        var row = normalize(entry);
        var rows = list();
        rows.unshift(row);
        writeRaw(rows);
        return clone(row);
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

    root.KreezbyPartnerInquiries = {
        STORAGE_KEY: STORAGE_KEY,
        add: add,
        list: list,
        setStatus: setStatus,
        formatReceived: formatReceived
    };
})(window);
