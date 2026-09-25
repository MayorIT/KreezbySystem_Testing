/**
 * Settings panel UI inside Maintenance (login history and accounts).
 */
(function () {
    'use strict';

    var currentSettingsSub = 'login-history';

    var settingsShellHtml = ''
        + '<div class="settings-section-title">System Settings</div>'
        + '<p class="settings-section-desc">Manage user accounts and login activity. Staff and admin module access is controlled by Head Admin.</p>'
        + '<div class="settings-sub-tabs-row" id="settings-sub-tabs">'
        + '<button type="button" class="settings-sub-tab active-sub" data-sub="login-history">Login History</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="customers">Customers</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="retailers">Retailers</button>'
        + '<button type="button" class="settings-sub-tab" data-sub="wholesalers">Wholesalers</button>'
        + '</div>'
        + '<div id="settings-sub-content"></div>';

    function badgeClass(type) {
        var t = (type || '').toLowerCase();
        if (t === 'customer') return 'badge-customer';
        if (t === 'retailer') return 'badge-retailer';
        if (t === 'wholesaler') return 'badge-wholesaler';
        if (t === 'staff') return 'badge-staff';
        return 'badge-admin';
    }

    function renderLoginHistory() {
        var history = window.KreezbyMaintenanceSettings.getLoginHistory();
        var rows = history.map(function (log, i) {
            return '<tr><td>' + (i + 1) + '</td><td><strong>' + log.userName + '</strong></td>'
                + '<td><span class="badge-account-type ' + badgeClass(log.accountType) + '">' + log.accountType + '</span></td>'
                + '<td>' + log.identity + '</td><td>' + log.loggedAt + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Login History</h4>'
            + '<p class="settings-section-desc">Recent sign-ins for all users (customers, retailers, wholesalers, staff, and admin).</p>'
            + '<table class="data-display-table"><thead><tr style="background-color:#5d4037;color:#fff;">'
            + '<th style="width:40px;">#</th><th>Full Name</th><th>Account Type</th><th>Email / Username</th><th>Date &amp; Time</th>'
            + '</tr></thead><tbody>' + (rows || '<tr><td colspan="5">No login records yet.</td></tr>') + '</tbody></table>';
    }

    function renderCustomers() {
        var users = window.KreezbyMaintenanceSettings.getUsers();
        var rows = users.customers.map(function (c, i) {
            return '<tr><td>' + (i + 1) + '</td><td><strong>' + c.name + '</strong></td><td>' + c.email + '</td><td>' + c.phone + '</td>'
                + '<td>' + c.joined + '</td><td>'
                + '<button type="button" class="btn-upgrade" onclick="KreezbyMaintenanceUI.upgradeCustomer(\'' + c.id + '\',\'retailer\')">→ Retailer</button>'
                + '<button type="button" class="btn-upgrade wholesaler" onclick="KreezbyMaintenanceUI.upgradeCustomer(\'' + c.id + '\',\'wholesaler\')">→ Wholesaler</button>'
                + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Customer Accounts</h4>'
            + '<p class="settings-section-desc">Upgrade a customer to retailer or wholesaler. Their customer account will be removed and they receive partner access instead.</p>'
            + '<table class="data-display-table"><thead><tr style="background-color:#5d4037;color:#fff;">'
            + '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Grant Access</th>'
            + '</tr></thead><tbody>' + (rows || '<tr><td colspan="6">No customer accounts.</td></tr>') + '</tbody></table>';
    }

    function renderRetailers() {
        var list = window.KreezbyMaintenanceSettings.getUsers().retailers;
        var rows = list.map(function (r, i) {
            var note = r.upgradedFrom ? '<span style="font-size:11px;color:#7c4dff;">Upgraded from customer</span>' : '—';
            return '<tr><td>' + (i + 1) + '</td><td><strong>' + r.name + '</strong></td><td>' + r.contact + '</td><td>' + r.email + '</td><td>' + r.area + '</td><td>' + note + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Retailer Accounts</h4>'
            + '<p class="settings-section-desc">Partner retailers with inventory and order portal access.</p>'
            + '<table class="data-display-table"><thead><tr style="background-color:#5d4037;color:#fff;">'
            + '<th>#</th><th>Business Name</th><th>Contact</th><th>Email</th><th>Area</th><th>Source</th>'
            + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderWholesalers() {
        var list = window.KreezbyMaintenanceSettings.getUsers().wholesalers;
        var rows = list.map(function (w, i) {
            var note = w.upgradedFrom ? '<span style="font-size:11px;color:#00897b;">Upgraded from customer</span>' : '—';
            return '<tr><td>' + (i + 1) + '</td><td><strong>' + w.name + '</strong></td><td>' + w.contact + '</td><td>' + w.email + '</td><td>' + w.area + '</td><td>' + note + '</td></tr>';
        }).join('');
        return ''
            + '<h4 class="settings-section-title">Wholesaler Accounts</h4>'
            + '<p class="settings-section-desc">Bulk distributors with wholesaler portal access.</p>'
            + '<table class="data-display-table"><thead><tr style="background-color:#5d4037;color:#fff;">'
            + '<th>#</th><th>Business Name</th><th>Contact</th><th>Email</th><th>Area</th><th>Source</th>'
            + '</tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderSettingsSub(subKey) {
        currentSettingsSub = subKey;
        var root = document.getElementById('settings-sub-content');
        if (!root) return;

        document.querySelectorAll('.settings-sub-tab').forEach(function (btn) {
            btn.classList.toggle('active-sub', btn.getAttribute('data-sub') === subKey);
        });

        if (subKey === 'login-history') root.innerHTML = renderLoginHistory();
        else if (subKey === 'customers') root.innerHTML = renderCustomers();
        else if (subKey === 'retailers') root.innerHTML = renderRetailers();
        else if (subKey === 'wholesalers') root.innerHTML = renderWholesalers();
    }

    function initSettingsPanel() {
        var rootWorkspace = document.getElementById('maintenance-grid-workspace-root');
        if (!rootWorkspace) return;
        rootWorkspace.innerHTML = settingsShellHtml.replace(/<motion/g, '<div').replace(/<\/motion>/g, '</div>');

        document.querySelectorAll('.settings-sub-tab').forEach(function (btn) {
            btn.onclick = function () {
                renderSettingsSub(btn.getAttribute('data-sub'));
            };
        });

        renderSettingsSub('login-history');
    }

    function refreshMetrics() {
        if (!window.KreezbyMaintenanceSettings) return;
        var c = KreezbyMaintenanceSettings.getAccountCounts();
        var el;
        el = document.getElementById('metric-customers-count'); if (el) el.textContent = c.customers;
        el = document.getElementById('metric-retailers-count'); if (el) el.textContent = c.retailers;
        el = document.getElementById('metric-wholesalers-count'); if (el) el.textContent = c.wholesalers;
    }

    function upgradeCustomer(customerId, role) {
        var label = role === 'retailer' ? 'Retailer' : 'Wholesaler';
        if (!confirm('Upgrade this customer to ' + label + '?\n\nTheir customer account will be removed. They will only have ' + label.toLowerCase() + ' portal access.')) return;
        var result = KreezbyMaintenanceSettings.upgradeCustomerToRole(customerId, role);
        alert(result.message);
        if (result.ok) {
            refreshMetrics();
            renderSettingsSub('customers');
        }
    }

    window.KreezbyMaintenanceUI = {
        initSettingsPanel: initSettingsPanel,
        refreshMetrics: refreshMetrics,
        upgradeCustomer: upgradeCustomer
    };

    document.addEventListener('DOMContentLoaded', refreshMetrics);
})();
