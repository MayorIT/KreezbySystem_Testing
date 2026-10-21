/**
 * Profile for head admin, admin, and staff.
 */
(function () {
    'use strict';

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function rawSession() {
        return readJson('kreezby_session', {});
    }

    // The signed-in account only counts on the portal it belongs to
    // (retailer on retailer, staff on staff, head admin on head admin ...).
    function session() {
        return findAccount() ? rawSession() : {};
    }

    function portalKind() {
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        if (/\/head_admin\//i.test(path)) return 'head';
        if (/\/staff\//i.test(path)) return 'staff';
        if (/\/retailer\//i.test(path)) return 'retailer';
        return 'admin';
    }

    function defaultRole() {
        var kind = portalKind();
        return kind === 'head' ? 'Head Admin' : kind === 'staff' ? 'Staff' : kind === 'retailer' ? 'Retailer' : 'Admin';
    }

    // Profile details are kept per sign-in on this device, so every account
    // (including head admin and retailers) can edit them even without a user record.
    var PROFILES_KEY = 'kreezby_portal_profiles';

    function profileKey() {
        var account = findAccount();
        return portalKind() + ':' + (account ? String(account.user.username || account.user.id || '').toLowerCase() : '_guest');
    }

    function readOverlay() {
        var all = readJson(PROFILES_KEY, {});
        return (all && all[profileKey()]) || {};
    }

    function writeOverlay(data) {
        var all = readJson(PROFILES_KEY, {}) || {};
        var key = profileKey();
        all[key] = Object.assign({}, all[key], data);
        try {
            localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
            return true;
        } catch (e) {
            return false;
        }
    }

    function applyHeaderName(name) {
        if (!name) return;
        document.querySelectorAll('#user-dropdown-trigger').forEach(function (node) {
            var nm = node.querySelector('.kz-pill-name');
            if (nm) nm.textContent = name; else node.textContent = name + ' \u25be';
        });
        document.querySelectorAll('.admin-home h2').forEach(function (node) { node.textContent = 'Welcome, ' + name; });
        document.querySelectorAll('[data-staff-name], [data-person]').forEach(function (node) { node.textContent = name; });
        document.querySelectorAll('[data-initials]').forEach(function (node) { node.textContent = initials(name); });
        document.dispatchEvent(new CustomEvent('kreezby:profile-saved', { detail: { name: name } }));
    }

    function identityMatches(user, query) {
        if (!user || !query) return false;
        var fields = [user.email, user.username, user.name, user.user_id, user.id, user.contact];
        return fields.some(function (field) {
            return field && String(field).trim().toLowerCase() === query;
        });
    }

    function isHeadAccount(user) {
        return /head|owner/i.test(String((user && user.accountType) || '') + ' ' + String((user && user.role) || ''));
    }

    function belongsToPortal(bucket, user) {
        var kind = portalKind();
        if (kind === 'staff') return bucket === 'staff';
        if (kind === 'retailer') return bucket === 'retailers';
        if (bucket !== 'admins') return false;
        return kind === 'head' ? isHeadAccount(user) : !isHeadAccount(user);
    }

    function readUsers() {
        var api = window.KreezbyMaintenanceSettings;
        if (api && typeof api.getUsers === 'function') {
            try { return api.getUsers() || {}; } catch (e) { /* fall back to storage */ }
        }
        return readJson('kreezby_maintenance_users', {}) || {};
    }

    function findAccount() {
        var current = rawSession();
        var query = String(current.identity || current.userName || '').trim().toLowerCase();
        if (!query) return null;
        var users = readUsers();
        var found = null;
        ['admins', 'staff', 'retailers'].forEach(function (bucket) {
            (users[bucket] || []).forEach(function (user) {
                if (!user || user.archived || !belongsToPortal(bucket, user) || !identityMatches(user, query)) return;
                var exact = String(user.username || '').trim().toLowerCase() === query;
                if (!found || (exact && !found.exact)) found = { bucket: bucket, user: user, exact: exact };
            });
        });
        return found;
    }

    function roleLabel(user) {
        var role = user && user.role ? String(user.role).trim() : '';
        if (!role || /^(head\s*)?admin(istrator)?$|^staff$/i.test(role)) return '';
        return role;
    }

    function paintIdentity(user, current) {
        var display = document.getElementById('profile-display-name');
        var chip = document.getElementById('profile-role-chip');
        var handle = document.getElementById('profile-handle');
        var fallback = 'Account';
        var name = (user && (user.name || user.username)) || (current && (current.userName || current.identity)) || fallback;
        if (display) {
            display.textContent = name;
            display.dataset.fallback = fallback;
        }
        if (chip) {
            var label = roleLabel(user || {});
            chip.textContent = label;
            chip.hidden = !label;
        }
        if (handle) {
            var raw = String((user && (user.username || user.email)) || (current && current.identity) || '').trim();
            if (!raw || raw === name) {
                handle.hidden = true;
                handle.textContent = '';
            } else {
                handle.hidden = false;
                handle.textContent = raw.indexOf('@') >= 0 ? raw : '@' + raw;
            }
        }
    }

    function initials(name) {
        var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return 'K';
        return (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : '')).toUpperCase();
    }

    function paintAvatar(user) {
        var box = document.getElementById('profile-avatar-preview');
        if (!box) return;
        if (user && user.avatarDataUrl) {
            box.style.backgroundImage = 'url("' + String(user.avatarDataUrl).replace(/"/g, '') + '")';
            box.textContent = '';
            return;
        }
        box.style.backgroundImage = '';
        box.textContent = initials(user && (user.name || user.username));
    }

    function fill(account) {
        var user = Object.assign({}, account ? account.user : {}, readOverlay());
        var current = session();
        var name = document.getElementById('profile-full-name');
        var username = document.getElementById('profile-username');
        var email = document.getElementById('profile-email');
        var phone = document.getElementById('profile-phone');
        var address = document.getElementById('profile-address');
        var role = document.getElementById('profile-role');
        var department = document.getElementById('profile-department');
        var threshold = document.getElementById('profile-threshold');
        if (name) name.value = user.name || current.userName || '';
        if (username) username.value = (account && account.user.username) || '';
        if (email) email.value = user.email || '';
        if (phone) phone.value = user.phone || user.contact || '';
        if (address) address.value = user.address || '';
        if (role) role.value = roleLabel(user) || defaultRole();
        if (department) {
            department.value = user.department || '';
            var wrap = document.getElementById('profile-department-wrap');
            if (wrap) wrap.hidden = portalKind() !== 'staff' && !user.department;
        }
        if (threshold && window.KreezbyBrowserAlerts) threshold.value = String(window.KreezbyBrowserAlerts.settings().shop);
        paintAvatar(user);
        paintIdentity(user, current);
        var note = document.getElementById('profile-account-note');
        if (note) {
            note.hidden = !!account;
            note.textContent = 'No account for this portal is signed in here. Changes are saved on this device only.';
        }
        renderOverrides();
        renderPermission();
    }

    function renderOverrides() {
        var list = document.getElementById('profile-overrides');
        if (!list || !window.KreezbyBrowserAlerts) return;
        var items = window.KreezbyBrowserAlerts.settings().items || {};
        var codes = Object.keys(items);
        if (!codes.length) {
            list.innerHTML = '<li>No item has its own threshold. Every item uses the number above.</li>';
            return;
        }
        list.innerHTML = codes.map(function (code) {
            return '<li>' + code + ': alert at ' + items[code] + ' or below '
                + '<button type="button" class="secondary" data-clear-threshold="' + code + '">Use shop threshold</button></li>';
        }).join('');
    }

    function permissionText() {
        return 'Threshold alerts turn on by themselves for Admin, Head Admin, and Staff. They show in the notification bell and on the Alert page.';
    }

    function renderPermission() {
        var node = document.getElementById('profile-notify-state');
        if (node) node.textContent = permissionText();
    }

    function setStatus(message) {
        var node = document.getElementById('profile-status');
        if (!node) return;
        node.textContent = message || '';
        node.style.color = message && !/saved/i.test(message) ? '#c62828' : '';
    }

    function compressImage(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onerror = function () { reject(new Error('photo')); };
            reader.onload = function () {
                var image = new Image();
                image.onload = function () {
                    var size = 160;
                    var canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    var ctx = canvas.getContext('2d');
                    var scale = Math.max(size / image.width, size / image.height);
                    var width = image.width * scale;
                    var height = image.height * scale;
                    ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.72));
                };
                image.onerror = function () { reject(new Error('photo')); };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function saveThreshold() {
        var threshold = document.getElementById('profile-threshold');
        if (!threshold || !window.KreezbyBrowserAlerts) return true;
        if (window.KreezbyBrowserAlerts.setShopThreshold(threshold.value)) return true;
        setStatus('Enter a threshold of 0 or more.');
        return false;
    }

    function saveProfile(avatarDataUrl) {
        if (!saveThreshold()) return;
        var nameField = document.getElementById('profile-full-name');
        var emailField = document.getElementById('profile-email');
        var phoneField = document.getElementById('profile-phone');
        var addressField = document.getElementById('profile-address');
        var data = {};
        if (nameField) {
            var name = (nameField.value || '').trim();
            if (!name) {
                setStatus('Enter a full name.');
                return;
            }
            data.name = name;
        }
        if (emailField) {
            var email = (emailField.value || '').trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setStatus('Enter a valid email, or leave it blank.');
                return;
            }
            data.email = email;
        }
        if (phoneField) data.phone = (phoneField.value || '').trim();
        if (addressField) data.address = (addressField.value || '').trim();
        if (avatarDataUrl) data.avatarDataUrl = avatarDataUrl;
        if (!Object.keys(data).length) {
            setStatus('Choose a photo first.');
            return;
        }
        if (!writeOverlay(data)) {
            setStatus('Could not save. Browser storage is full or blocked.');
            return;
        }

        // Also update the account record when this sign-in has one.
        var api = window.KreezbyMaintenanceSettings;
        var account = api ? findAccount() : null;
        if (api && account) {
            var users = api.getUsers();
            var list = users[account.bucket] || [];
            for (var i = 0; i < list.length; i++) {
                if (list[i] && list[i].id === account.user.id) {
                    var next = Object.assign({}, list[i]);
                    if (data.name !== undefined) next.name = data.name;
                    if (data.email !== undefined) next.email = data.email;
                    if (data.phone !== undefined) { next.phone = data.phone; next.contact = data.phone; }
                    if (data.address !== undefined) next.address = data.address;
                    if (data.avatarDataUrl) next.avatarDataUrl = data.avatarDataUrl;
                    list[i] = next;
                }
            }
            users[account.bucket] = list;
            try { api.saveUsers(users); } catch (e) { /* overlay already saved */ }
        }

        if (data.name && account) {
            try {
                var current = rawSession();
                current.userName = data.name;
                localStorage.setItem('kreezby_session', JSON.stringify(current));
            } catch (e) { /* session stays as it was */ }
        }
        if (data.name) applyHeaderName(data.name);
        setStatus('Profile saved.');
        fill(account);
    }

    function bind() {
        var root = document.getElementById('portal-profile');
        if (!root) return;
        fill(findAccount());
        if (root.dataset.profileBound === '1') return;
        root.dataset.profileBound = '1';
        var tries = 0;
        var timer = setInterval(function () {
            tries += 1;
            if (!window.KreezbyBrowserAlerts && tries < 30) return;
            clearInterval(timer);
            var threshold = document.getElementById('profile-threshold');
            if (threshold && window.KreezbyBrowserAlerts && document.activeElement !== threshold) {
                threshold.value = String(window.KreezbyBrowserAlerts.settings().shop);
            }
            renderOverrides();
            renderPermission();
        }, 100);
        var nameField = document.getElementById('profile-full-name');
        if (nameField) {
            nameField.addEventListener('input', function () {
                var display = document.getElementById('profile-display-name');
                if (!display) return;
                display.textContent = nameField.value.trim() || display.dataset.fallback || '';
            });
        }
        var save = document.getElementById('profile-save');
        var file = document.getElementById('profile-avatar-input');
        var pendingAvatar = '';
        if (file) {
            file.addEventListener('change', function () {
                var chosen = file.files && file.files[0];
                if (!chosen) return;
                compressImage(chosen).then(function (url) {
                    pendingAvatar = url;
                    paintAvatar({ avatarDataUrl: url, name: (document.getElementById('profile-full-name') || {}).value });
                }).catch(function () {
                    setStatus('That photo could not be used. Choose a JPG or PNG.');
                });
            });
        }
        if (save) {
            save.addEventListener('click', function () {
                saveProfile(pendingAvatar);
                pendingAvatar = '';
            });
        }
        var allow = document.getElementById('profile-notify-btn');
        if (allow) {
            allow.addEventListener('click', function () {
                if (!window.KreezbyBrowserAlerts) return;
                window.KreezbyBrowserAlerts.requestPermission().then(renderPermission);
            });
        }
        var test = document.getElementById('profile-test-btn');
        if (test) {
            test.addEventListener('click', function () {
                if (!window.KreezbyBrowserAlerts) return;
                window.KreezbyBrowserAlerts.sendTest();
                renderPermission();
            });
        }
        root.addEventListener('click', function (event) {
            var button = event.target.closest('[data-clear-threshold]');
            if (!button || !window.KreezbyBrowserAlerts) return;
            window.KreezbyBrowserAlerts.clearItemThreshold(button.getAttribute('data-clear-threshold'));
            renderOverrides();
        });
        document.addEventListener('kreezby:notify-permission', renderPermission);
    }

    window.KreezbyPortalProfile = { bind: bind, refresh: function () { fill(findAccount()); } };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();
