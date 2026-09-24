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

    function getUsers() {
        return loadJson(USERS_KEY, DEFAULT_USERS);
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

    function getAccountCounts() {
        var users = getUsers();
        return {
            customers: users.customers.length,
            retailers: users.retailers.length,
            wholesalers: users.wholesalers.length,
            admins: users.admins.length,
            staff: users.staff.length
        };
    }

    window.KreezbyMaintenanceSettings = {
        getUsers: getUsers,
        saveUsers: saveUsers,
        resetToSeedUsers: resetToSeedUsers,
        getLoginHistory: getLoginHistory,
        recordLogin: recordLogin,
        upgradeCustomerToRole: upgradeCustomerToRole,
        getAccountCounts: getAccountCounts,
        findUserByIdentity: findUserByIdentity,
        DEFAULT_USERS: DEFAULT_USERS
    };
})();
