/**
 * Maintenance settings data — users, login history, customer upgrades (localStorage prototype).
 * Synced with seed-data.js / data/users-auth.json (password: kreezby123 on server).
 */
(function () {
    'use strict';

    var USERS_KEY = 'kreezby_maintenance_users';
    var LOGIN_HISTORY_KEY = 'kreezby_login_history';

    var DEFAULT_USERS = {
        admins: [
            { id: 'admin-1', name: 'Brent Ramos', username: 'brent_admin', role: 'System Administrator' },
            { id: 'admin-2', name: 'Elena Morales', username: 'elena_admin', role: 'Operations Administrator' },
            { id: 'admin-3', name: 'Marco Del Rosario', username: 'marco_admin', role: 'Inventory Administrator' },
            { id: 'admin-4', name: 'Patricia Go', username: 'patricia_admin', role: 'Sales Administrator' },
            { id: 'admin-5', name: 'Jonas Villanueva', username: 'jonas_admin', role: 'Branch Administrator' }
        ],
        staff: [
            { id: 'staff-1', name: 'Claire Mendoza', username: 'claire_staff', role: 'Frontline Staff' },
            { id: 'staff-2', name: 'Ryan Santos', username: 'ryan_recv', role: 'Receiving Team' },
            { id: 'staff-3', name: 'Isabel Cruz', username: 'isabel_inv', role: 'Inventory Team' },
            { id: 'staff-4', name: 'Derek Lim', username: 'derek_staff', role: 'Sales Floor Staff' },
            { id: 'staff-5', name: 'Nina Garcia', username: 'nina_staff', role: 'Packaging Staff' },
            { id: 'staff-6', name: 'Omar Reyes', username: 'omar_staff', role: 'Dispatch Staff' },
            { id: 'staff-7', name: 'Grace Tan', username: 'grace_staff', role: 'Customer Service Staff' }
        ],
        retailers: [
            { id: 'ret-1', name: 'SIDC Batangas Hub', contact: 'Rico Mendoza', email: 'rico@sidc-batangas.com', area: 'Batangas City' },
            { id: 'ret-2', name: 'Makati Crinkle Corner', contact: 'Lisa Tan', email: 'lisa@makaticorner.com', area: 'Makati' },
            { id: 'ret-3', name: 'Cavite Sweet Stop', contact: 'Jomar Villar', email: 'jomar@cavitesweet.com', area: 'Imus, Cavite' },
            { id: 'ret-4', name: 'Laguna Treats Depot', contact: 'Hannah Reyes', email: 'hannah@lagunatreats.com', area: 'Calamba' },
            { id: 'ret-5', name: 'Quezon Crinkle Mart', contact: 'Paolo Neri', email: 'paolo@qccrinkle.com', area: 'Lucena City' },
            { id: 'ret-6', name: 'Bulacan Bake Partners', contact: 'Mia Soriano', email: 'mia@bulacanbake.com', area: 'Malolos' },
            { id: 'ret-7', name: 'Pampanga Pastry Lane', contact: 'Ken Bautista', email: 'ken@pampangalane.com', area: 'Angeles City' },
            { id: 'ret-8', name: 'Taguig Snack Studio', contact: 'Yara Domingo', email: 'yara@taguigsnack.com', area: 'Taguig' },
            { id: 'ret-9', name: 'Pasig Oven Outlet', contact: 'Luis Fabian', email: 'luis@pasigoven.com', area: 'Pasig' },
            { id: 'ret-10', name: 'Cebu Island Crinkles', contact: 'Bea Navarro', email: 'bea@cebuiscrinkles.com', area: 'Cebu City' }
        ],
        wholesalers: [
            { id: 'who-1', name: 'Metro Bulk Distributors', contact: 'James Lim', email: 'james@metrobulk.com', area: 'Quezon City' },
            { id: 'who-2', name: 'Visayas Wholesale Hub', contact: 'Carla Mendez', email: 'carla@visayaswholesale.com', area: 'Iloilo City' }
        ],
        suppliers: [
            { id: 'sup-1', name: 'Supplier Hub 101', contact: 'Juan Dela Cruz', email: 'juan@supplier101.com' },
            { id: 'sup-2', name: 'Golden Harvest Milling', contact: 'Flour desk', email: 'orders@goldenharvest.com' },
            { id: 'sup-3', name: 'Dairy Cooperative', contact: 'Butter desk', email: 'supply@dairycoop.com' }
        ],
        customers: [
            { id: 'cust-1', name: 'Maria Santos', email: 'maria.santos@email.com', phone: '09171234567', joined: '2025-08-12' },
            { id: 'cust-2', name: 'Bryle Atienza', email: 'bryle.a@email.com', phone: '09189876543', joined: '2025-11-03' },
            { id: 'cust-3', name: 'Ana Cruz', email: 'ana.cruz@email.com', phone: '09201112233', joined: '2026-01-20' },
            { id: 'cust-4', name: 'Jerome Dela Peña', email: 'jerome.delapena@email.com', phone: '09171112201', joined: '2025-09-05' },
            { id: 'cust-5', name: 'Kyla Ramos', email: 'kyla.ramos@email.com', phone: '09181112202', joined: '2025-10-14' },
            { id: 'cust-6', name: 'Miguel Torres', email: 'miguel.torres@email.com', phone: '09191112203', joined: '2025-12-01' },
            { id: 'cust-7', name: 'Sofia Villanueva', email: 'sofia.v@email.com', phone: '09201112204', joined: '2026-02-18' },
            { id: 'cust-8', name: 'Andre Castillo', email: 'andre.castillo@email.com', phone: '09211112205', joined: '2026-03-02' },
            { id: 'cust-9', name: 'Denise Flores', email: 'denise.flores@email.com', phone: '09221112206', joined: '2026-03-21' },
            { id: 'cust-10', name: 'Harold Ng', email: 'harold.ng@email.com', phone: '09231112207', joined: '2026-04-08' },
            { id: 'cust-11', name: 'Pauline Sy', email: 'pauline.sy@email.com', phone: '09241112208', joined: '2026-04-25' },
            { id: 'cust-12', name: 'Vincent Ong', email: 'vincent.ong@email.com', phone: '09251112209', joined: '2026-05-10' },
            { id: 'cust-13', name: 'Rachelle Bautista', email: 'rachelle.b@email.com', phone: '09261112210', joined: '2026-05-15' },
            { id: 'cust-14', name: 'Enzo Padilla', email: 'enzo.padilla@email.com', phone: '09271112211', joined: '2026-05-18' },
            { id: 'cust-15', name: 'Hazel Domingo', email: 'hazel.domingo@email.com', phone: '09281112212', joined: '2026-05-19' }
        ]
    };

    var DEFAULT_LOGIN_HISTORY = [
        { id: 'log-1', userName: 'Brent Ramos', accountType: 'Administrator', identity: 'brent_admin', loggedAt: '2026-05-19 08:12:04' },
        { id: 'log-2', userName: 'Elena Morales', accountType: 'Administrator', identity: 'elena_admin', loggedAt: '2026-05-19 08:20:11' },
        { id: 'log-3', userName: 'Claire Mendoza', accountType: 'Staff', identity: 'claire_staff', loggedAt: '2026-05-19 08:45:22' },
        { id: 'log-4', userName: 'Ryan Santos', accountType: 'Staff', identity: 'ryan_recv', loggedAt: '2026-05-19 09:02:33' },
        { id: 'log-5', userName: 'Maria Santos', accountType: 'Customer', identity: 'maria.santos@email.com', loggedAt: '2026-05-19 09:01:18' },
        { id: 'log-6', userName: 'SIDC Batangas Hub', accountType: 'Retailer', identity: 'rico@sidc-batangas.com', loggedAt: '2026-05-19 09:30:55' },
        { id: 'log-7', userName: 'Makati Crinkle Corner', accountType: 'Retailer', identity: 'lisa@makaticorner.com', loggedAt: '2026-05-19 10:05:40' },
        { id: 'log-8', userName: 'Kyla Ramos', accountType: 'Customer', identity: 'kyla.ramos@email.com', loggedAt: '2026-05-18 16:20:11' }
    ];

    function loadJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return JSON.parse(JSON.stringify(fallback));
    }

    function saveJson(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function dictionaryRole(bucket) {
        if (bucket === 'admins') return 'Admin';
        if (bucket === 'staff') return 'Staff';
        if (bucket === 'customers') return 'Customer';
        return 'Retailer/Wholesaler';
    }

    function withDictionaryFields(users) {
        ['admins', 'staff', 'retailers', 'wholesalers', 'customers', 'suppliers'].forEach(function (bucket) {
            (users[bucket] || []).forEach(function (user) {
                if (!user.user_id) user.user_id = user.id || user.username || user.email || user.name;
                if (!user.dictionaryRole) user.dictionaryRole = bucket === 'suppliers' ? 'Supplier' : dictionaryRole(bucket);
                if (bucket !== 'suppliers' && !user.password_hash) user.password_hash = 'ph_' + user.user_id;
                if (typeof user.active !== 'boolean') user.active = true;
            });
        });
        return users;
    }

    function getUsers() {
        var users = loadJson(USERS_KEY, DEFAULT_USERS);
        Object.keys(DEFAULT_USERS).forEach(function (bucket) {
            if (!users[bucket] || !users[bucket].length) {
                users[bucket] = JSON.parse(JSON.stringify(DEFAULT_USERS[bucket]));
            }
        });
        return withDictionaryFields(users);
    }

    function saveUsers(users) {
        saveJson(USERS_KEY, users);
    }

    function resetToSeedUsers() {
        saveUsers(JSON.parse(JSON.stringify(DEFAULT_USERS)));
    }

    function getLoginHistory() {
        return loadJson(LOGIN_HISTORY_KEY, DEFAULT_LOGIN_HISTORY);
    }

    function saveLoginHistory(history) {
        saveJson(LOGIN_HISTORY_KEY, history);
    }

    function findUserByIdentity(identity) {
        var q = (identity || '').trim().toLowerCase();
        if (!q) return null;
        var users = getUsers();
        var pools = [
            { type: 'Customer', list: users.customers, match: function (u) { return u.email.toLowerCase() === q || u.name.toLowerCase() === q; }, label: function (u) { return u.name; } },
            { type: 'Retailer', list: users.retailers, match: function (u) { return u.email.toLowerCase() === q || u.name.toLowerCase() === q; }, label: function (u) { return u.name; } },
            { type: 'Wholesaler', list: users.wholesalers, match: function (u) { return u.email.toLowerCase() === q || u.name.toLowerCase() === q; }, label: function (u) { return u.name; } },
            { type: 'Staff', list: users.staff, match: function (u) { return u.username.toLowerCase() === q || u.name.toLowerCase() === q; }, label: function (u) { return u.name; } },
            { type: 'Administrator', list: users.admins, match: function (u) { return u.username.toLowerCase() === q || u.name.toLowerCase() === q; }, label: function (u) { return u.name; } }
        ];
        for (var i = 0; i < pools.length; i++) {
            var pool = pools[i];
            for (var j = 0; j < pool.list.length; j++) {
                if (pool.match(pool.list[j])) {
                    return {
                        userName: pool.label(pool.list[j]),
                        accountType: pool.type,
                        identity: identity
                    };
                }
            }
        }
        return { userName: identity, accountType: 'Unknown', identity: identity };
    }

    function recordLogin(identity) {
        var match = findUserByIdentity(identity);
        var history = getLoginHistory();
        var now = new Date();
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        var loggedAt = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
            ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

        history.unshift({
            id: 'log-' + Date.now(),
            userName: match.userName,
            accountType: match.accountType,
            identity: match.identity,
            loggedAt: loggedAt
        });
        if (history.length > 200) history = history.slice(0, 200);
        saveLoginHistory(history);
    }

    function upgradeCustomerToRole(customerId, targetRole) {
        var users = getUsers();
        var idx = -1;
        var customer = null;
        for (var i = 0; i < users.customers.length; i++) {
            if (users.customers[i].id === customerId) {
                idx = i;
                customer = users.customers[i];
                break;
            }
        }
        if (!customer) return { ok: false, message: 'Customer not found.' };
        if (targetRole !== 'retailer' && targetRole !== 'wholesaler') {
            return { ok: false, message: 'Invalid upgrade role.' };
        }

        users.customers.splice(idx, 1);

        var newRecord = {
            id: (targetRole === 'retailer' ? 'ret-' : 'who-') + Date.now(),
            name: customer.name,
            contact: customer.name,
            email: customer.email,
            area: '—',
            upgradedFrom: customer.id,
            phone: customer.phone
        };

        if (targetRole === 'retailer') {
            users.retailers.push(newRecord);
        } else {
            users.wholesalers.push(newRecord);
        }

        saveUsers(users);
        return {
            ok: true,
            message: customer.name + ' is now a ' + (targetRole === 'retailer' ? 'Retailer' : 'Wholesaler') + '. Their customer account has been removed.'
        };
    }

    function isActive(user) {
        return !user || user.active !== false;
    }

    function isHeadAdminAccount(user) {
        if (!user) return false;
        var name = String(user.username || user.user_id || user.id || '').toLowerCase();
        return name === 'brent_admin' || name === 'admin-1' || user.role === 'System Administrator';
    }

    function findRecord(identity) {
        var q = String(identity || '').trim().toLowerCase();
        if (!q) return null;
        var users = getUsers();
        var buckets = ['customers', 'retailers', 'wholesalers', 'staff', 'admins'];
        for (var b = 0; b < buckets.length; b++) {
            var list = users[buckets[b]] || [];
            for (var i = 0; i < list.length; i++) {
                var user = list[i];
                var fields = [user.email, user.username, user.name, user.user_id, user.id, user.contact];
                for (var f = 0; f < fields.length; f++) {
                    if (fields[f] && String(fields[f]).trim().toLowerCase() === q) {
                        return { bucket: buckets[b], user: user };
                    }
                }
            }
        }
        return null;
    }

    function isLoginBlocked(identity, userName) {
        var hit = findRecord(identity) || findRecord(userName);
        return !!(hit && hit.user.active === false);
    }

    function setAccountStatus(bucket, id, active) {
        var users = getUsers();
        var list = users[bucket];
        if (!list) return { ok: false, message: 'That account group was not found.' };
        var user = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                user = list[i];
                break;
            }
        }
        if (!user) return { ok: false, message: 'Account not found.' };
        if (bucket === 'admins' && isHeadAdminAccount(user) && !active) {
            return { ok: false, message: 'The head admin account stays active.' };
        }
        user.active = !!active;
        saveUsers(users);
        return {
            ok: true,
            message: user.name + (active ? ' is active again.' : ' is deactivated and cannot log in.')
        };
    }

    function countActive(list) {
        var n = 0;
        (list || []).forEach(function (user) {
            if (user.active !== false) n += 1;
        });
        return n;
    }

    function createAccount(bucket, fields) {
        var users = getUsers();
        if (!users[bucket]) return { ok: false, message: 'That account group is not available.' };
        var name = String((fields && fields.name) || '').trim();
        if (!name) return { ok: false, message: 'Name is required.' };
        var record = {
            id: bucket.slice(0, 4) + '-' + Date.now(),
            name: name,
            role: String((fields && fields.role) || dictionaryRole(bucket)),
            active: true
        };
        if (bucket === 'staff' || bucket === 'admins') {
            record.username = String((fields && fields.username) || '').trim().toLowerCase().replace(/\s+/g, '_');
            if (!record.username) return { ok: false, message: 'Username is required.' };
        } else {
            record.email = String((fields && fields.email) || '').trim();
            record.contact = String((fields && fields.contact) || '').trim();
            record.phone = record.contact;
            record.area = String((fields && fields.area) || '').trim();
            if (!record.email) return { ok: false, message: 'Email is required.' };
        }
        users[bucket].push(record);
        saveUsers(withDictionaryFields(users));
        return { ok: true, message: name + ' was added and can be activated or deactivated from this list.', id: record.id };
    }

    var BACKUP_KEYS = [
        'kreezby_data_dictionary_v1',
        'kreezbyOrders',
        'kreezby-po-orders-v1',
        'kreezby-issue-reports-v1',
        'kreezby_maintenance_users',
        'kreezby_admin_permissions',
        'kreezby_staff_permissions',
        'kreezby_login_history',
        'kreezbyNotifications'
    ];

    function exportBackup() {
        var payload = { exportedAt: new Date().toISOString(), records: {} };
        BACKUP_KEYS.forEach(function (key) {
            var raw = localStorage.getItem(key);
            if (raw != null) payload.records[key] = raw;
        });
        return payload;
    }

    function restoreBackup(payload) {
        if (!payload || !payload.records || typeof payload.records !== 'object') {
            return { ok: false, message: 'That file is not a Kreezby backup.' };
        }
        Object.keys(payload.records).forEach(function (key) {
            if (BACKUP_KEYS.indexOf(key) === -1) return;
            localStorage.setItem(key, payload.records[key]);
        });
        return { ok: true, message: 'Backup restored. Reload the page to see the saved records.' };
    }

    function getAccountCounts() {
        var users = getUsers();
        return {
            customers: countActive(users.customers),
            retailers: countActive(users.retailers),
            wholesalers: countActive(users.wholesalers),
            admins: countActive(users.admins),
            staff: countActive(users.staff),
            suppliers: countActive(users.suppliers)
        };
    }

    try { saveUsers(getUsers()); } catch (e) { /* ignore */ }

    window.KreezbyMaintenanceSettings = {
        getUsers: getUsers,
        saveUsers: saveUsers,
        resetToSeedUsers: resetToSeedUsers,
        getLoginHistory: getLoginHistory,
        recordLogin: recordLogin,
        upgradeCustomerToRole: upgradeCustomerToRole,
        getAccountCounts: getAccountCounts,
        findUserByIdentity: findUserByIdentity,
        isLoginBlocked: isLoginBlocked,
        setAccountStatus: setAccountStatus,
        isHeadAdminAccount: isHeadAdminAccount,
        createAccount: createAccount,
        exportBackup: exportBackup,
        restoreBackup: restoreBackup,
        DEFAULT_USERS: DEFAULT_USERS
    };
})();
