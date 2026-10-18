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

    function session() {
        return readJson('kreezby_session', {});
    }

    function portalKind() {
        var path = (window.location.pathname || '').replace(/\\/g, '/');
        if (/\/head_admin\//i.test(path)) return 'head';
        if (/\/staff\//i.test(path)) return 'staff';
        return 'admin';
    }

    function identityMatches(user, query) {
        if (!user || !query) return false;
        var fields = [user.email, user.username, user.name, user.user_id, user.id, user.contact];
        return fields.some(function (field) {
            return field && String(field).trim().toLowerCase() === query;
        });
    }

    function findAccount() {
        var api = window.KreezbyMaintenanceSettings;
        if (!api || typeof api.getUsers !== 'function') return null;
        var current = session();
        var query = String(current.identity || current.userName || '').trim().toLowerCase();
        if (!query) return null;
        var users = api.getUsers();
        var buckets = ['admins', 'staff'];
        var b;
        var i;
        for (b = 0; b < buckets.length; b++) {
            var list = users[buckets[b]] || [];
            for (i = 0; i < list.length; i++) {
                if (list[i] && list[i].archived) continue;
                if (identityMatches(list[i], query)) return { bucket: buckets[b], user: list[i] };
            }
        }
        return null;
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
        var user = account ? account.user : {};
        var current = session();
        var name = document.getElementById('profile-full-name');
        var username = document.getElementById('profile-username');
        var email = document.getElementById('profile-email');
        var phone = document.getElementById('profile-phone');
        var role = document.getElementById('profile-role');
        var department = document.getElementById('profile-department');
        var threshold = document.getElementById('profile-threshold');
        if (name) name.value = user.name || current.userName || '';
        if (username) username.value = user.username || current.identity || '';
        if (email) email.value = user.email || '';
        if (phone) phone.value = user.phone || user.contact || '';
        if (role) role.value = roleLabel(user);
        if (department) {
            department.value = user.department || '';
            var wrap = document.getElementById('profile-department-wrap');
            if (wrap) wrap.hidden = portalKind() !== 'staff' && !user.department;
        }
        if (threshold && window.KreezbyBrowserAlerts) threshold.value = String(window.KreezbyBrowserAlerts.settings().shop);
        paintAvatar(user);
        paintIdentity(user, current);
        var locked = !account;
        [name, email, phone].forEach(function (field) { if (field) field.disabled = locked; });
        var note = document.getElementById('profile-account-note');
        if (note) {
            note.hidden = !!account;
            note.textContent = document.getElementById('profile-full-name')
                ? 'Sign in to save a name, email, and photo.'
                : 'Sign in to save the photo.';
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
        if (!window.KreezbyBrowserAlerts) return 'Notifications are still loading.';
        var state = window.KreezbyBrowserAlerts.permission();
        if (state === 'granted') return 'This browser can notify this device. Chrome, Edge, Firefox, and Safari each ask once on each device.';
        if (state === 'denied') return 'This browser is blocking notifications. Allow them in the browser site settings, then come back to this page.';
        if (state === 'unsupported') return 'This browser does not support system notifications.';
        return 'Notifications are off in this browser until you allow them.';
    }

    function renderPermission() {
        var node = document.getElementById('profile-notify-state');
        if (node) node.textContent = permissionText();
    }

    function setStatus(message) {
        var node = document.getElementById('profile-status');
        if (node) node.textContent = message || '';
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
        var api = window.KreezbyMaintenanceSettings;
        var account = findAccount();
        var nameField = document.getElementById('profile-full-name');
        var emailField = document.getElementById('profile-email');
        var phoneField = document.getElementById('profile-phone');
        var photoOnly = !nameField && !emailField && !phoneField;
        if (!api || !account) {
            setStatus(photoOnly
                ? 'Sign in to save the photo.'
                : 'Sign in to save name and contact details.');
            return;
        }
        var users = api.getUsers();
        var list = users[account.bucket] || [];
        var index = -1;
        var i;
        for (i = 0; i < list.length; i++) {
            if (list[i] && list[i].id === account.user.id) index = i;
        }
        if (index < 0) {
            setStatus('This account could not be updated.');
            return;
        }
        var next = Object.assign({}, list[index]);
        if (!photoOnly) {
            var name = (nameField.value || '').trim();
            var email = emailField ? (emailField.value || '').trim() : '';
            var phone = phoneField ? (phoneField.value || '').trim() : '';
            if (!name) {
                setStatus('Enter a full name.');
                return;
            }
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setStatus('Enter a valid email, or leave it blank.');
                return;
            }
            next.name = name;
            next.email = email;
            next.phone = phone;
            next.contact = phone;
        }
        if (avatarDataUrl) next.avatarDataUrl = avatarDataUrl;
        else if (photoOnly) {
            setStatus('Choose a photo first.');
            return;
        }
        list[index] = next;
        users[account.bucket] = list;
        api.saveUsers(users);
        if (!photoOnly) {
            try {
                var current = session();
                current.userName = next.name;
                localStorage.setItem('kreezby_session', JSON.stringify(current));
            } catch (e) { /* session stays as it was */ }
        }
        setStatus(photoOnly ? 'Photo saved.' : 'Profile saved.');
        fill(findAccount());
    }

    function bind() {
        var root = document.getElementById('portal-profile');
        if (!root) return;
        fill(findAccount());
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

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();
