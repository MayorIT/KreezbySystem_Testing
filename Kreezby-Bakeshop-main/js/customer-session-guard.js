/**
 * Keeps the saved customer profile (name, email, number, address) tied to the signed-in customer.
 * A profile left on this browser by another account is replaced with the signed-in customer's own
 * details, and any half-finished QR payment form from the other account is dropped.
 */
(function () {
    'use strict';
    try {
        var session = JSON.parse(localStorage.getItem('kreezby_session') || 'null') || {};
        var type = String(session.accountType || '');
        if (type !== 'Customer' && type !== 'Regular Customer') return;
        var owner = String(session.customerId || session.accountId || '').trim() ||
            String(session.identity || session.userName || '').trim().toLowerCase();
        if (!owner) return;
        var profile = {};
        try { profile = JSON.parse(localStorage.getItem('kreezbyCustomerProfile') || '{}') || {}; } catch (e) { profile = {}; }
        var profileOwner = String(profile.accountId || profile.ownerKey || '').trim();
        if (profileOwner === owner) return;

        var phone = String(session.phone || '').trim();
        if (phone.indexOf('@') >= 0) phone = '';
        var address = String(session.address || '').trim();
        var fresh = {
            accountId: String(session.customerId || session.accountId || ''),
            ownerKey: owner,
            username: '',
            fullName: String(session.userName || ''),
            email: String(session.email || ''),
            contactNumber: phone,
            defaultAddress: address,
            addresses: address ? [{ id: 'addr-home', label: 'Home', address: address }] : [],
            avatarDataUrl: '',
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('kreezbyCustomerProfile', JSON.stringify(fresh));
        try { sessionStorage.removeItem('kreezbyPaymongoCheckout'); } catch (e1) { /* ignore */ }
        try { localStorage.removeItem('kreezbyCart'); } catch (e2) { /* ignore */ }
    } catch (error) { /* never block the page */ }
})();
