/**
 * Maintenance settings data — users, login history, customer upgrades (localStorage prototype).
 * Synced with seed-data.js / data/users-auth.json (password: kreezby123 on server).
 */
(function () {
    'use strict';

    var USERS_KEY = 'kreezby_maintenance_users';
    var LOGIN_HISTORY_KEY = 'kreezby_login_history';
    var USERS_SEED_VERSION = '20261002-real-accounts';
    var USERS_SEED_VERSION_KEY = 'kreezby_users_seed_version';

    var DEFAULT_USERS = {
        admins: [
            { id: 'admin-owner', name: 'Marcela Criselda Ramos', username: 'marcela_admin', role: 'Owner', accountType: 'Head Administrator' },
            { id: 'admin-ops', name: 'Brent Ramos', username: 'brent_admin', role: 'Operation Manager', accountType: 'Head Administrator' },
            { id: 'admin-marketing', name: 'Ailore Embalzado', username: 'ailore_admin', role: 'Marketing', accountType: 'Administrator' }
        ],
        staff: [
            { id: 'staff-imelda', name: 'Imelda Atienza', username: 'imelda_staff', role: 'Staff', accountType: 'Staff', temporaryPassword: 'kreezby123', active: true },
            { id: 'staff-nichole', name: 'Nichole Ramos', username: 'nichole_staff', role: 'Staff', accountType: 'Staff', temporaryPassword: 'kreezby123', active: true }
        ],
        retailers: [
            {"id":"ret-chickn_j_ibaan","name":"Chick'N J Ibaan","username":"chickn_j_ibaan","temporaryPassword":"KzDPJVE2","role":"Retailer","area":"Rosario","pcs":10,"active":true},
            {"id":"ret-sidc_ibaan","name":"SIDC Ibaan","username":"sidc_ibaan","temporaryPassword":"Kz3TUF3M","role":"Retailer","area":"Rosario","pcs":15,"active":true},
            {"id":"ret-balkonahe","name":"Balkonahe","username":"balkonahe","temporaryPassword":"KzP69KXG","role":"Retailer","area":"Rosario","pcs":6,"active":true},
            {"id":"ret-citimart_rosario","name":"Citimart Rosario","username":"citimart_rosario","temporaryPassword":"KzVF555D","role":"Retailer","area":"Rosario","pcs":25,"active":true},
            {"id":"ret-chickn_j_namunga","name":"Chick'N J Namunga","username":"chickn_j_namunga","temporaryPassword":"KzYFRRCQ","role":"Retailer","area":"Rosario","pcs":10,"active":true},
            {"id":"ret-sidc_tiaong","name":"SIDC Tiaong","username":"sidc_tiaong","temporaryPassword":"Kz6F75MA","role":"Retailer","area":"Lucena","pcs":10,"active":true},
            {"id":"ret-mr_fields_coffe","name":"Mr.Fields Coffe+","username":"mr_fields_coffe","temporaryPassword":"KzKTPH5F","role":"Retailer","area":"Lucena","pcs":15,"active":true},
            {"id":"ret-bangihan","name":"Bangihan","username":"bangihan","temporaryPassword":"KzGGMFWT","role":"Retailer","area":"Lucena","pcs":10,"active":true},
            {"id":"ret-girasoles","name":"Girasoles","username":"girasoles","temporaryPassword":"KzBMYZUR","role":"Retailer","area":"Lucena","pcs":10,"active":true},
            {"id":"ret-shell_select_sariaya","name":"Shell Select Sariaya","username":"shell_select_sariaya","temporaryPassword":"KzQL45YY","role":"Retailer","area":"Lucena","pcs":20,"active":true},
            {"id":"ret-kope_right_sariaya","name":"Kope Right Sariaya","username":"kope_right_sariaya","temporaryPassword":"KzVBLEEV","role":"Retailer","area":"Lucena","pcs":20,"active":true},
            {"id":"ret-kope_right_lucena","name":"Kope Right Lucena","username":"kope_right_lucena","temporaryPassword":"Kz6T2FVG","role":"Retailer","area":"Lucena","pcs":10,"active":true},
            {"id":"ret-shell_select_domoit","name":"Shell Select Domoit","username":"shell_select_domoit","temporaryPassword":"KzJ5HWY4","role":"Retailer","area":"Lucena","pcs":20,"active":true},
            {"id":"ret-sidc_san_juan","name":"SIDC San Juan","username":"sidc_san_juan","temporaryPassword":"Kz7K73Z9","role":"Retailer","area":"Lucena","pcs":10,"active":true},
            {"id":"ret-chickn_j_baybayin","name":"Chick'N J Baybayin","username":"chickn_j_baybayin","temporaryPassword":"KzNAQG7W","role":"Retailer","area":"Lucena","pcs":10,"active":true},
            {"id":"ret-matteos_liquiwan","name":"Matteos Liquiwan","username":"matteos_liquiwan","temporaryPassword":"Kz8NDGGS","role":"Retailer","area":"Lucena","pcs":20,"active":true},
            {"id":"ret-yummies","name":"Yummies","username":"yummies","temporaryPassword":"Kz943EEA","role":"Retailer","area":"Lucena","pcs":15,"active":true},
            {"id":"ret-hang_out","name":"Hang Out","username":"hang_out","temporaryPassword":"Kz92Q4QB","role":"Retailer","area":"Rosario","pcs":15,"active":true},
            {"id":"ret-sidc_main","name":"SIDC Main","username":"sidc_main","temporaryPassword":"KzX32H5T","role":"Retailer","area":"Batangas","pcs":15,"active":true},
            {"id":"ret-sidc_soro_soro_ilaya","name":"SIDC Soro-Soro Ilaya","username":"sidc_soro_soro_ilaya","temporaryPassword":"KzK28FQB","role":"Retailer","area":"Batangas","pcs":20,"active":true},
            {"id":"ret-3m","name":"3M","username":"3m","temporaryPassword":"Kz7PYRHG","role":"Retailer","area":"Batangas","pcs":5,"active":true},
            {"id":"ret-jhorjhanes_balagtas","name":"Jhorjhanes Balagtas","username":"jhorjhanes_balagtas","temporaryPassword":"KzQJSY3K","role":"Retailer","area":"Batangas","pcs":30,"active":true},
            {"id":"ret-wanam_sa_bukid_balagtas","name":"Wanam sa Bukid Balagtas","username":"wanam_sa_bukid_balagtas","temporaryPassword":"KzAC3EVV","role":"Retailer","area":"Batangas","pcs":15,"active":true},
            {"id":"ret-aa_lomi_balagtas","name":"AA Lomi Balagtas","username":"aa_lomi_balagtas","temporaryPassword":"KzGSXDM2","role":"Retailer","area":"Batangas","pcs":40,"active":true},
            {"id":"ret-aa_san_pascual","name":"AA San Pascual","username":"aa_san_pascual","temporaryPassword":"Kz4SPAA9","role":"Retailer","area":"Batangas","pcs":10,"active":true},
            {"id":"ret-butch_alangilan","name":"Butch Alangilan","username":"butch_alangilan","temporaryPassword":"KzHSS8EN","role":"Retailer","area":"Batangas","pcs":35,"active":true},
            {"id":"ret-gracias_pasalubong","name":"Gracias Pasalubong","username":"gracias_pasalubong","temporaryPassword":"KzE7VWVV","role":"Retailer","area":"Batangas","pcs":15,"active":true},
            {"id":"ret-shell_select_kumintang_ibaba","name":"Shell Select Kumintang Ibaba","username":"shell_select_kumintang_ibaba","temporaryPassword":"Kz8C3MFF","role":"Retailer","area":"Batangas","pcs":10,"active":true},
            {"id":"ret-sidc_tulo","name":"SIDC Tulo","username":"sidc_tulo","temporaryPassword":"Kz6BP2CN","role":"Retailer","area":"Batangas","pcs":20,"active":true},
            {"id":"ret-sidc_libjo","name":"SIDC Libjo","username":"sidc_libjo","temporaryPassword":"KzCWNEL6","role":"Retailer","area":"Batangas","pcs":30,"active":true},
            {"id":"ret-sidc_pallocan","name":"SIDC Pallocan","username":"sidc_pallocan","temporaryPassword":"Kz6WDYYW","role":"Retailer","area":"Batangas","pcs":10,"active":true},
            {"id":"ret-wanam_sa_bukid_gulod","name":"Wanam sa Bukid Gulod","username":"wanam_sa_bukid_gulod","temporaryPassword":"KzR2YVYB","role":"Retailer","area":"Batangas","pcs":20,"active":true},
            {"id":"ret-wanam_sa_bukid_palengke","name":"Wanam sa Bukid Palengke","username":"wanam_sa_bukid_palengke","temporaryPassword":"KzXWDQUP","role":"Retailer","area":"Batangas","pcs":10,"active":true},
            {"id":"ret-kubo_sa_halamanan_malarayat","name":"Kubo sa Halamanan Malarayat","username":"kubo_sa_halamanan_malarayat","temporaryPassword":"KzZTHUYZ","role":"Retailer","area":"Lipa","pcs":15,"active":true},
            {"id":"ret-lbn_marawoy","name":"LBN Marawoy","username":"lbn_marawoy","temporaryPassword":"KzSZPXS4","role":"Retailer","area":"Lipa","pcs":15,"active":true},
            {"id":"ret-kubo_sa_halamanan_marawoy","name":"Kubo sa Halamanan Marawoy","username":"kubo_sa_halamanan_marawoy","temporaryPassword":"KzD5DAEK","role":"Retailer","area":"Lipa","pcs":10,"active":true},
            {"id":"ret-lucias_cafe_lipa","name":"Lucias Cafe Lipa","username":"lucias_cafe_lipa","temporaryPassword":"Kz545GGL","role":"Retailer","area":"Lipa","pcs":20,"active":true},
            {"id":"ret-citimart_tanauan","name":"Citimart Tanauan","username":"citimart_tanauan","temporaryPassword":"KzSVEEMN","role":"Retailer","area":"Sto. Tomas","pcs":20,"active":true},
            {"id":"ret-lucias_cafe_sto_tomas","name":"Lucias Cafe Sto Tomas","username":"lucias_cafe_sto_tomas","temporaryPassword":"KzPFYPN2","role":"Retailer","area":"Sto. Tomas","pcs":20,"active":true},
            {"id":"ret-jma","name":"JMA","username":"jma","temporaryPassword":"KzLEY8M7","role":"Retailer","area":"Sto. Tomas","pcs":30,"active":true},
            {"id":"ret-rose_and_grace","name":"Rose & Grace","username":"rose_and_grace","temporaryPassword":"KzWLPQYZ","role":"Retailer","area":"Sto. Tomas","pcs":50,"active":true},
            {"id":"ret-dvinias","name":"D'Vinias","username":"dvinias","temporaryPassword":"Kz2BZ776","role":"Retailer","area":"Sto. Tomas","pcs":5,"active":true},
            {"id":"ret-tita_chu","name":"Tita Chu","username":"tita_chu","temporaryPassword":"KzNMEAHV","role":"Retailer","area":"Sto. Tomas","pcs":10,"active":true},
            {"id":"ret-laong_laan","name":"Laong Laan","username":"laong_laan","temporaryPassword":"KzFR9MH7","role":"Retailer","area":"Sto. Tomas","pcs":10,"active":true},
            {"id":"ret-avilles","name":"Avilles","username":"avilles","temporaryPassword":"KzADHCYK","role":"Retailer","area":"Sto. Tomas","pcs":10,"active":true},
            {"id":"ret-sidc_mahabang_parang","name":"SIDC Mahabang Parang","username":"sidc_mahabang_parang","temporaryPassword":"Kz96WUXE","role":"Retailer","area":"Lipa","pcs":20,"active":true},
            {"id":"ret-sidc_san_jose","name":"SIDC San Jose","username":"sidc_san_jose","temporaryPassword":"KzPN4XHD","role":"Retailer","area":"Lipa","pcs":10,"active":true},
            {"id":"ret-banay_banay_eatery","name":"Banay-banay Eatery","username":"banay_banay_eatery","temporaryPassword":"KzRU5QWZ","role":"Retailer","area":"Lipa","pcs":20,"active":true},
            {"id":"ret-aa_lomi_lipa","name":"AA Lomi Lipa","username":"aa_lomi_lipa","temporaryPassword":"KzUXRSHJ","role":"Retailer","area":"Lipa","pcs":10,"active":true},
            {"id":"ret-butch_lipa","name":"Butch Lipa","username":"butch_lipa","temporaryPassword":"KzEZQJM6","role":"Retailer","area":"Lipa","pcs":35,"active":true},
            {"id":"ret-shell_select_tambo","name":"Shell Select Tambo","username":"shell_select_tambo","temporaryPassword":"KzAXTHWA","role":"Retailer","area":"Lipa","pcs":10,"active":true},
            {"id":"ret-shell_select_balintawak","name":"Shell Select Balintawak","username":"shell_select_balintawak","temporaryPassword":"KzKBK2Z3","role":"Retailer","area":"Lipa","pcs":20,"active":true},
            {"id":"ret-lipa_grill_lipa","name":"Lipa Grill Lipa","username":"lipa_grill_lipa","temporaryPassword":"KzEVLXPT","role":"Retailer","area":"Lipa","pcs":50,"active":true},
            {"id":"ret-lipa_grill_san_felipe","name":"Lipa Grill San Felipe","username":"lipa_grill_san_felipe","temporaryPassword":"KzM5S2X5","role":"Retailer","area":"Rosario","pcs":25,"active":true},
            {"id":"ret-aa_lomi_padre_garcia","name":"AA Lomi Padre Garcia","username":"aa_lomi_padre_garcia","temporaryPassword":"Kz9M5874","role":"Retailer","area":"Rosario","pcs":30,"active":true},
            {"id":"ret-chickn_j_padre_garcia","name":"Chick'N J Padre Garcia","username":"chickn_j_padre_garcia","temporaryPassword":"KzSYVFYK","role":"Retailer","area":"Rosario","pcs":10,"active":true},
            {"id":"ret-ben_and_cha","name":"Ben & Cha","username":"ben_and_cha","temporaryPassword":"KzAX6TZ5","role":"Retailer","area":"Rosario","pcs":10,"active":true},
            {"id":"ret-hmm_muzon","name":"HMM Muzon","username":"hmm_muzon","temporaryPassword":"KzR5VXTX","role":"Retailer","area":"Bauan","pcs":10,"active":true},
            {"id":"ret-sidc_bauan","name":"SIDC Bauan","username":"sidc_bauan","temporaryPassword":"Kz498VKK","role":"Retailer","area":"Bauan","pcs":10,"active":true},
            {"id":"ret-sidc_sta_teresita","name":"SIDC Sta. Teresita","username":"sidc_sta_teresita","temporaryPassword":"KzCG6PWX","role":"Retailer","area":"Bauan","pcs":10,"active":true},
            {"id":"ret-aa_lomi_taal","name":"AA Lomi Taal","username":"aa_lomi_taal","temporaryPassword":"KzV8PYKC","role":"Retailer","area":"Bauan","pcs":30,"active":true},
            {"id":"ret-citimart_lemery","name":"Citimart Lemery","username":"citimart_lemery","temporaryPassword":"KzJ8LHZS","role":"Retailer","area":"Bauan","pcs":25,"active":true},
            {"id":"ret-jaytees_acienda","name":"Jaytees Acienda","username":"jaytees_acienda","temporaryPassword":"KzNN354Y","role":"Retailer","area":"Tagaytay","pcs":30,"active":true},
            {"id":"ret-rsm_silvinas","name":"RSM Silvinas","username":"rsm_silvinas","temporaryPassword":"Kz6Q7AGM","role":"Retailer","area":"Tagaytay","pcs":5,"active":true},
            {"id":"ret-pamana","name":"Pamana","username":"pamana","temporaryPassword":"KzZCY53D","role":"Retailer","area":"Tagaytay","pcs":15,"active":true},
            {"id":"ret-jaytees_main","name":"Jaytees Main","username":"jaytees_main","temporaryPassword":"KzQHGE69","role":"Retailer","area":"Tagaytay","pcs":50,"active":true},
            {"id":"ret-balinsasayaw_tagaytay","name":"Balinsasayaw Tagaytay","username":"balinsasayaw_tagaytay","temporaryPassword":"KzRRMQZR","role":"Retailer","area":"Tagaytay","pcs":15,"active":true},
            {"id":"ret-green_ats","name":"Green Ats","username":"green_ats","temporaryPassword":"KzLZDUFU","role":"Retailer","area":"Tagaytay","pcs":10,"active":true},
            {"id":"ret-jaytees_9th","name":"Jaytees 9th","username":"jaytees_9th","temporaryPassword":"KzSNDN6N","role":"Retailer","area":"Tagaytay","pcs":20,"active":true},
            {"id":"ret-citimart_caedo","name":"Citimart Caedo","username":"citimart_caedo","temporaryPassword":"Kz4LMA4X","role":"Retailer","area":"Batangas","pcs":30,"active":true},
            {"id":"ret-citimart_nuciti","name":"Citimart Nuciti","username":"citimart_nuciti","temporaryPassword":"Kz4C6PG4","role":"Retailer","area":"Batangas","pcs":25,"active":true},
            {"id":"ret-citimart_baystar_baymall","name":"Citimart Baystar/Baymall","username":"citimart_baystar_baymall","temporaryPassword":"KzG5RC4Y","role":"Retailer","area":"Batangas","pcs":45,"active":true},
            {"id":"ret-citimart_shop_on_rizal_ave","name":"Citimart Shop on/ Rizal Ave","username":"citimart_shop_on_rizal_ave","temporaryPassword":"KzE42TN7","role":"Retailer","area":"Batangas","pcs":25,"active":true},
            {"id":"ret-citimart_bauan","name":"Citimart Bauan","username":"citimart_bauan","temporaryPassword":"KzMBH4X7","role":"Retailer","area":"Bauan","pcs":50,"active":true},
            {"id":"ret-dyans","name":"Dyan's","username":"dyans","temporaryPassword":"KzYPRRDW","role":"Retailer","area":"Bauan","pcs":5,"active":true},
            {"id":"ret-ofels","name":"Ofels","username":"ofels","temporaryPassword":"KzPSS6M4","role":"Retailer","area":"Bauan","pcs":10,"active":true},
            {"id":"ret-jorjhanes_sta_rita","name":"Jorjhanes Sta. Rita","username":"jorjhanes_sta_rita","temporaryPassword":"KzDXSN9W","role":"Retailer","area":"Bauan","pcs":10,"active":true}
        ],
        wholesalers: [],
        suppliers: [],
        customers: [
            { id: 'cust-maria-santos', user_id: 'cust-maria-santos', name: 'Maria Santos', username: 'maria_santos', email: 'maria.santos@email.com', phone: '09171234567', contact: '09171234567', address: '18 Dolorosa St., Poblacion, Batangas City, Batangas', area: 'Batangas', country: 'Philippines', birthday: '1996-05-12', joined: '2026-01-12', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-bryle-atienza', user_id: 'cust-bryle-atienza', name: 'Bryle Atienza', username: 'bryle_atienza', email: 'bryle.atienza@email.com', phone: '09184561230', contact: '09184561230', address: '27 Evangelista St., Poblacion, Batangas City, Batangas', area: 'Batangas', country: 'Philippines', birthday: '1998-02-08', joined: '2026-02-03', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-kyla-ramos', user_id: 'cust-kyla-ramos', name: 'Kyla Ramos', username: 'kyla_ramos', email: 'kyla.ramos@email.com', phone: '09205551248', contact: '09205551248', address: '14 Rizal Avenue, Brgy. Sabang, Lipa City, Batangas', area: 'Batangas', country: 'Philippines', birthday: '1999-09-19', joined: '2026-02-18', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-ana-reyes', user_id: 'cust-ana-reyes', name: 'Ana Reyes', username: 'ana_reyes', email: 'ana.reyes@email.com', phone: '09175664021', contact: '09175664021', address: '7 Mabini Street, Poblacion, Rosario, Batangas', area: 'Rosario', country: 'Philippines', birthday: '1997-11-03', joined: '2026-03-04', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-mark-cruz', user_id: 'cust-mark-cruz', name: 'Mark Anthony Cruz', username: 'mark_cruz', email: 'mark.cruz@email.com', phone: '09190882176', contact: '09190882176', address: '22 General Luna St., Poblacion, San Juan, Batangas', area: 'Batangas', country: 'Philippines', birthday: '1994-01-30', joined: '2026-03-21', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-christine-bautista', user_id: 'cust-christine-bautista', name: 'Christine Bautista', username: 'christine_bautista', email: 'christine.bautista@email.com', phone: '09217846305', contact: '09217846305', address: '11 Quezon Avenue, Ibabang Dupay, Lucena City, Quezon', area: 'Lucena', country: 'Philippines', birthday: '1995-06-18', joined: '2026-04-09', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-paolo-mendoza', user_id: 'cust-paolo-mendoza', name: 'Paolo Mendoza', username: 'paolo_mendoza', email: 'paolo.mendoza@email.com', phone: '09173221980', contact: '09173221980', address: '9 A. Mabini St., Poblacion 4, Tanauan City, Batangas', area: 'Batangas', country: 'Philippines', birthday: '1993-09-09', joined: '2026-05-14', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-jericho-villanueva', user_id: 'cust-jericho-villanueva', name: 'Jericho Villanueva', username: 'jericho_villanueva', email: 'jericho.villanueva@email.com', phone: '09185550946', contact: '09185550946', address: '31 Burgos Street, Poblacion, Bauan, Batangas', area: 'Batangas', country: 'Philippines', birthday: '1991-12-05', joined: '2026-06-02', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-angela-flores', user_id: 'cust-angela-flores', name: 'Angela Flores', username: 'angela_flores', email: 'angela.flores@email.com', phone: '09206671480', contact: '09206671480', address: '14 National Highway, San Roque, Sto. Tomas, Batangas', area: 'Batangas', country: 'Philippines', birthday: '1999-04-27', joined: '2026-07-11', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true },
            { id: 'cust-nicole-garcia', user_id: 'cust-nicole-garcia', name: 'Nicole Garcia', username: 'nicole_garcia', email: 'nicole.garcia@email.com', phone: '09176778815', contact: '09176778815', address: '6 Rizal Street, Poblacion, Ibaan, Batangas', area: 'Rosario', country: 'Philippines', birthday: '1996-07-16', joined: '2026-08-06', role: 'Customer', accountType: 'Customer', temporaryPassword: 'kreezby123', active: true }
        ]
    };

    var DEFAULT_LOGIN_HISTORY = [];

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
        return 'Retailer';
    }

    function withDictionaryFields(users) {
        ['admins', 'staff', 'retailers', 'customers', 'suppliers'].forEach(function (bucket) {
            (users[bucket] || []).forEach(function (user) {
                if (!user.user_id) user.user_id = user.id || user.username || user.email || user.name;
                if (!user.dictionaryRole) user.dictionaryRole = bucket === 'suppliers' ? 'Supplier' : dictionaryRole(bucket);
                if (bucket !== 'suppliers' && !user.password_hash) user.password_hash = 'ph_' + user.user_id;
                if (typeof user.active !== 'boolean') user.active = true;
            });
        });
        return users;
    }

    function hasRetiredDemoAccounts(users) {
        var demoNames = {
            elena_admin: 1, marco_admin: 1, patricia_admin: 1, jonas_admin: 1,
            claire_staff: 1, ryan_recv: 1, isabel_inv: 1, derek_staff: 1,
            nina_staff: 1, omar_staff: 1, grace_staff: 1
        };
        var demoEmails = {
            'rico@sidc-batangas.com': 1,
            'lisa@makaticorner.com': 1,
            'james@metrobulk.com': 1,
            'carla@visayaswholesale.com': 1,
            'juan@supplier101.com': 1
        };
        var found = false;
        ['admins', 'staff'].forEach(function (bucket) {
            (users[bucket] || []).forEach(function (user) {
                if (demoNames[String(user.username || '').toLowerCase()]) found = true;
            });
        });
        ['customers', 'retailers', 'suppliers'].forEach(function (bucket) {
            (users[bucket] || []).forEach(function (user) {
                if (demoEmails[String(user.email || '').toLowerCase()]) found = true;
            });
        });
        return found;
    }

    function applyRealAccountSeed() {
        var fresh = JSON.parse(JSON.stringify(DEFAULT_USERS));
        saveJson(USERS_KEY, fresh);
        saveJson(LOGIN_HISTORY_KEY, []);
        try {
            localStorage.setItem(USERS_SEED_VERSION_KEY, USERS_SEED_VERSION);
            localStorage.removeItem('kreezby_admin_accounts');
        } catch (e) { /* ignore */ }
        return fresh;
    }

    function usesOfficialStaff(list) {
        var official = DEFAULT_USERS.staff;
        if (!Array.isArray(list) || list.length !== official.length) return false;
        for (var i = 0; i < official.length; i++) {
            if (!list[i] || list[i].id !== official[i].id || list[i].name !== official[i].name) return false;
        }
        return true;
    }

    function mergeMissingRetailers(users) {
        var have = {};
        users.retailers = users.retailers || [];
        users.retailers.forEach(function (row) {
            if (row && row.id) have[row.id] = 1;
        });
        var added = false;
        DEFAULT_USERS.retailers.forEach(function (row) {
            if (row && row.id && !have[row.id]) {
                users.retailers.push(JSON.parse(JSON.stringify(row)));
                added = true;
            }
        });
        if (added) saveJson(USERS_KEY, users);
    }

    function getUsers() {
        var seeded = '';
        try { seeded = localStorage.getItem(USERS_SEED_VERSION_KEY) || ''; } catch (e) { seeded = ''; }
        var users = loadJson(USERS_KEY, DEFAULT_USERS);
        if (seeded !== USERS_SEED_VERSION || hasRetiredDemoAccounts(users)) {
            return withDictionaryFields(applyRealAccountSeed());
        }
        Object.keys(DEFAULT_USERS).forEach(function (bucket) {
            if (!users[bucket]) {
                users[bucket] = JSON.parse(JSON.stringify(DEFAULT_USERS[bucket]));
            }
        });
        if (!usesOfficialStaff(users.staff)) {
            users.staff = JSON.parse(JSON.stringify(DEFAULT_USERS.staff));
            saveJson(USERS_KEY, users);
        }
        mergeMissingRetailers(users);
        if (users.wholesalers && users.wholesalers.length) {
            users.wholesalers = [];
            saveJson(USERS_KEY, users);
        }
        if (importedCustomerList(users.customers)) {
            users.customers = JSON.parse(JSON.stringify(DEFAULT_USERS.customers));
            saveJson(USERS_KEY, users);
        } else {
            fillOfficialCustomerFields(users);
        }
        return withDictionaryFields(users);
    }

    function fillOfficialCustomerFields(users) {
        var byId = {};
        DEFAULT_USERS.customers.forEach(function (row) { byId[row.id] = row; });
        var changed = false;
        (users.customers || []).forEach(function (row) {
            var official = byId[row && row.id];
            if (!official) return;
            ['username', 'email', 'phone', 'contact', 'address', 'area', 'country', 'birthday', 'joined', 'temporaryPassword'].forEach(function (key) {
                if (!row[key] && official[key]) {
                    row[key] = official[key];
                    changed = true;
                }
            });
        });
        if (changed) saveJson(USERS_KEY, users);
    }

    function importedCustomerList(list) {
        if (!Array.isArray(list) || !list.length) return true;
        for (var i = 0; i < list.length; i++) {
            var user = list[i] || {};
            var country = String(user.country || '').toLowerCase();
            var email = String(user.email || '').toLowerCase();
            if (user.dataset) return true;
            if (country && country !== 'philippines') return true;
            if (email.indexOf('@example.') >= 0) return true;
            if (/^cust-\d+$/.test(String(user.id || ''))) return true;
        }
        return false;
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

    function identityMatches(user, q) {
        var fields = [user.email, user.username, user.name, user.user_id, user.id, user.contact];
        for (var i = 0; i < fields.length; i++) {
            if (fields[i] && String(fields[i]).trim().toLowerCase() === q) return true;
        }
        return false;
    }

    function getPasswordForIdentity(identity, userName) {
        var hit = findRecord(identity) || findRecord(userName);
        if (!hit || !hit.user) return '';
        return String(hit.user.temporaryPassword || hit.user.password || '').trim();
    }

    function findUserByIdentity(identity) {
        var q = (identity || '').trim().toLowerCase();
        if (!q) return null;
        var users = getUsers();
        var pools = [
            { type: 'Customer', list: users.customers, match: function (u) { return identityMatches(u, q); }, label: function (u) { return u.name; } },
            { type: 'Retailer', list: users.retailers, match: function (u) { return identityMatches(u, q); }, label: function (u) { return u.name; } },
            { type: 'Staff', list: users.staff, match: function (u) { return identityMatches(u, q); }, label: function (u) { return u.name; } },
            { type: 'Administrator', list: users.admins, match: function (u) { return identityMatches(u, q); }, label: function (u) { return u.name; }, accountType: function (u) { return isHeadAdminAccount(u) ? 'Head Administrator' : 'Administrator'; } }
        ];
        for (var i = 0; i < pools.length; i++) {
            var pool = pools[i];
            for (var j = 0; j < pool.list.length; j++) {
                if (pool.match(pool.list[j])) {
                    return {
                        userName: pool.label(pool.list[j]),
                        accountType: pool.accountType ? pool.accountType(pool.list[j]) : pool.type,
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
        if (targetRole !== 'retailer') {
            return { ok: false, message: 'Invalid upgrade role.' };
        }

        users.customers.splice(idx, 1);

        var newRecord = {
            id: 'ret-' + Date.now(),
            name: customer.name,
            contact: customer.name,
            email: customer.email,
            area: '—',
            upgradedFrom: customer.id,
            phone: customer.phone
        };

        users.retailers.push(newRecord);

        saveUsers(users);
        return {
            ok: true,
            message: customer.name + ' is now a Retailer. Their customer account has been removed.'
        };
    }

    function isActive(user) {
        return !user || user.active !== false;
    }

    function isHeadAdminAccount(user) {
        if (!user) return false;
        if (user.accountType === 'Head Administrator') return true;
        var role = String(user.role || '').toLowerCase();
        if (role === 'owner' || role === 'operation manager' || role === 'operations manager' || role.indexOf('head admin') >= 0) return true;
        var name = String(user.username || user.user_id || user.id || '').toLowerCase();
        return name === 'brent_admin' || name === 'marcela_admin' || name === 'admin-owner' || name === 'admin-ops';
    }

    function findRecord(identity) {
        var q = String(identity || '').trim().toLowerCase();
        if (!q) return null;
        var users = getUsers();
        var buckets = ['customers', 'retailers', 'staff', 'admins'];
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
            return { ok: false, message: 'This account stays active.' };
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
        } else if (bucket === 'retailers') {
            record.username = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('retailer_' + Date.now());
            record.contact = String((fields && fields.contact) || '').trim();
            record.phone = record.contact;
            record.area = String((fields && fields.area) || '').trim();
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
            admins: countActive(users.admins),
            staff: countActive(users.staff),
            suppliers: countActive(users.suppliers)
        };
    }

    function pullAccountsNow() {
        if (location.protocol === 'file:') return;
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/api/accounts', false);
            xhr.timeout = 4000;
            xhr.send();
            if (xhr.status !== 200) return;
            var data = JSON.parse(xhr.responseText);
            var accounts = data && data.accounts;
            if (!accounts) return;
            var users = loadJson(USERS_KEY, {});
            ['admins', 'staff', 'retailers', 'customers'].forEach(function (bucket) {
                if (Array.isArray(accounts[bucket]) && accounts[bucket].length) users[bucket] = accounts[bucket];
            });
            saveJson(USERS_KEY, withDictionaryFields(users));
            try { localStorage.setItem(USERS_SEED_VERSION_KEY, USERS_SEED_VERSION); } catch (e) { /* ignore */ }
        } catch (e) { /* the page keeps the browser copy when the shop server is offline */ }
    }

    pullAccountsNow();

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
        getPasswordForIdentity: getPasswordForIdentity,
        isLoginBlocked: isLoginBlocked,
        setAccountStatus: setAccountStatus,
        isHeadAdminAccount: isHeadAdminAccount,
        createAccount: createAccount,
        exportBackup: exportBackup,
        restoreBackup: restoreBackup,
        DEFAULT_USERS: DEFAULT_USERS
    };
})();
