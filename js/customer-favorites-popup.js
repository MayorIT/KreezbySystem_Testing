/**
 * Opens Favorites as a popup on pages that do not already host the shop modal.
 * Keeps Help Center, checkout, report issue, and partner pages in place.
 */
(function () {
    'use strict';

    if (document.getElementById('favorites-modal')) return;

    var STORAGE_KEY = 'kreezbyCustomerFavoritesV1';
    var CART_KEY = 'kreezbyCart';
    var CATALOG = [
        { id: 'flavor-choc', name: 'Chocolate Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/chocolate.jpg' },
        { id: 'flavor-almond', name: 'Choco-Almond Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/choco-almond.jpg' },
        { id: 'flavor-cashew', name: 'Choco-Cashew Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/choco-cashew.jpg' },
        { id: 'flavor-straw', name: 'Strawberry Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/strawberry.jpg' },
        { id: 'flavor-velvet', name: 'Red Velvet Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/redvelvet.jpg' },
        { id: 'flavor-lemon', name: 'Lemon Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/lemon.jpg' },
        { id: 'flavor-melon', name: 'Melon Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/melon.jpg' },
        { id: 'flavor-pandan', name: 'Pandan Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/pandan.jpg' },
        { id: 'flavor-ube', name: 'Ube Crinkles', variant: 'Pouch (8 Pcs)', cost: 165, img: 'flavors/ube.jpg' },
        { id: 'flavor-assorted', name: 'Assorted Crinkles', variant: 'Pouch (250g)', cost: 165, img: 'flavors/assorted.jpg' },
        { id: 'flavor-mango', name: 'Mango Crinkles', variant: 'Jar (250g Container)', cost: 165, img: 'flavors/mango.jpg' },
        { id: 'flavor-butternut', name: 'Choco Butternut Crinkles', variant: 'Jar (250g Container)', cost: 200, img: 'flavors/chocobutternut.jpg' }
    ];

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function savedProducts() {
        var ids = readJson(STORAGE_KEY, []);
        if (!Array.isArray(ids)) return [];
        return ids.map(function (id) {
            return CATALOG.find(function (item) { return item.id === id; });
        }).filter(Boolean);
    }

    function ensurePopup() {
        var existing = document.getElementById('kreezby-favorites-popup');
        if (existing) return existing;

        var overlay = document.createElement('div');
        overlay.id = 'kreezby-favorites-popup';
        overlay.innerHTML =
            '<div class="favorites-popup" role="dialog" aria-modal="true" aria-labelledby="kreezby-favorites-title">' +
                '<div class="favorites-popup__header">' +
                    '<div>' +
                        '<h2 id="kreezby-favorites-title">Favorites</h2>' +
                        '<p>Your saved Kreezby picks in one place.</p>' +
                    '</div>' +
                    '<button type="button" class="favorites-popup__close" data-favorites-close aria-label="Close">✕</button>' +
                '</div>' +
                '<div class="favorites-popup__body">' +
                    '<div class="favorites-popup__tabs modal-tabs" id="kreezby-popup-tabs" role="tablist" hidden></div>' +
                    '<div id="kreezby-favorites-feed"></div>' +
                '</div>' +
            '</div>';
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay || event.target.closest('[data-favorites-close]')) {
                closePopup();
            }
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function render() {
        var feed = document.getElementById('kreezby-favorites-feed');
        if (!feed) return;
        var products = savedProducts();
        if (!products.length) {
            feed.innerHTML = '<div class="favorites-popup__empty"><strong>No saved orders in this tab</strong><span>Tap the heart icon beside any price to save an order for fast reorder.</span></div>';
            return;
        }
        feed.innerHTML = products.map(function (product) {
            return '<article class="favorites-popup__card">' +
                '<img src="' + product.img + '" alt="' + product.name + '">' +
                '<div>' +
                    '<div class="favorites-popup__meta"><span>Saved pick</span><strong>₱' + product.cost.toFixed(2) + '</strong></div>' +
                    '<h3>' + product.name + '</h3>' +
                    '<p>' + product.variant + '. Ready for reorder anytime from your Favorites.</p>' +
                '</div>' +
                '<button type="button" class="favorites-popup__reorder" data-reorder="' + product.id + '">Reorder now</button>' +
            '</article>';
        }).join('');
    }

    function addToCart(productId) {
        var product = CATALOG.find(function (item) { return item.id === productId; });
        if (!product) return;
        var cart = readJson(CART_KEY, {});
        if (!cart || typeof cart !== 'object' || Array.isArray(cart)) cart = {};
        if (cart[productId]) cart[productId].qty += 1;
        else cart[productId] = {
            name: product.name,
            cost: product.cost,
            variant: product.variant,
            img: product.img,
            qty: 1
        };
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        var badge = document.getElementById('global-cart-count');
        if (badge) {
            var units = Object.keys(cart).reduce(function (sum, id) {
                return sum + Number((cart[id] && cart[id].qty) || 0);
            }, 0);
            badge.hidden = units <= 0;
            badge.textContent = String(units);
        }
    }

    function customerName() {
        try {
            var session = JSON.parse(localStorage.getItem('kreezby_session') || '{}');
            if (session && session.userName) return String(session.userName).trim();
        } catch (err) { /* ignore */ }
        var profile = readProfile();
        return profile.fullName || '';
    }

    function readProfile() {
        var saved = readJson('kreezbyCustomerProfile', {});
        return {
            username: saved.username || 'maria_santos',
            fullName: saved.fullName || 'Maria Santos',
            email: saved.email || 'maria.santos@email.com',
            contactNumber: saved.contactNumber || '09171234567',
            defaultAddress: saved.defaultAddress || '18 Dolorosa St., Poblacion, Batangas City',
            addresses: Array.isArray(saved.addresses) ? saved.addresses : []
        };
    }

    function readOrders() {
        var orders = readJson('kreezbyOrders', []);
        if (!Array.isArray(orders)) return [];
        var name = customerName().toLowerCase();
        if (!name) return orders;
        return orders.filter(function (order) {
            var shipName = (((order.shippingInfo || {}).fullName) || order.poEntity || '').toLowerCase();
            return shipName === name;
        });
    }

    function readCartEntries() {
        var cart = readJson(CART_KEY, {});
        if (!cart || typeof cart !== 'object' || Array.isArray(cart)) return [];
        return Object.keys(cart).map(function (id) {
            var item = cart[id] || {};
            return {
                id: id,
                name: item.name || 'Crinkles',
                variant: item.variant || '',
                cost: Number(item.cost) || 0,
                qty: Number(item.qty) || 0,
                img: item.img || ''
            };
        }).filter(function (item) { return item.qty > 0; });
    }

    function money(amount) {
        return '₱' + (Number(amount) || 0).toFixed(2);
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function orderWhen(order) {
        var raw = order.date || order.statusUpdatedAt || order.createdAt;
        if (!raw) return '';
        var dt = new Date(raw);
        if (Number.isNaN(dt.getTime())) return '';
        return dt.toLocaleString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function orderNeedsReview(order) {
        return !!(order && order.status === 'Completed' && !order.customerReview);
    }

    function orderMatches(order, filter) {
        if (filter === 'all') return true;
        if (filter === 'to-review') return orderNeedsReview(order);
        return String(order.status || '').toLowerCase() === String(filter || '').toLowerCase();
    }

    function renderOrders(filter) {
        var orders = readOrders().slice().reverse().filter(function (order) {
            return orderMatches(order, filter || 'all');
        });
        if (!orders.length) {
            return '<div class="favorites-popup__empty"><strong>No orders in this tab</strong><span>Orders that match this status will show up here.</span></div>';
        }
        return orders.map(function (order) {
            var items = order.items && typeof order.items === 'object' ? Object.keys(order.items).map(function (id) {
                return order.items[id] || {};
            }) : [];
            var first = items[0] || {};
            var image = first.img ? '<img src="' + escapeHtml(first.img) + '" alt="' + escapeHtml(first.name || 'Order item') + '">' : '';
            var names = items.map(function (item) { return item.name; }).filter(Boolean);
            var label = names.length > 1 ? names[0] + ' +' + (names.length - 1) + ' more' : (names[0] || '');
            return '<article class="favorites-popup__card">' + image +
                '<div>' +
                    '<div class="favorites-popup__meta"><span>' + escapeHtml(order.status || 'Processing') + '</span><strong>' + escapeHtml(order.total || '') + '</strong></div>' +
                    '<h3>' + escapeHtml(order.orderNumber || 'Order') + '</h3>' +
                    '<p>' + escapeHtml([orderWhen(order), label, order.trackingNumber ? 'Tracking ' + order.trackingNumber : ''].filter(Boolean).join(' · ')) + '</p>' +
                '</div>' +
            '</article>';
        }).join('');
    }

    function profileAddresses(profile) {
        if (Array.isArray(profile.addresses) && profile.addresses.length) return profile.addresses;
        if (profile.defaultAddress) {
            return [{ id: 'addr-default', label: 'Home', address: profile.defaultAddress }];
        }
        return [];
    }

    function renderProfile(tab) {
        var profile = readProfile();
        if (tab === 'addresses') {
            var rows = profileAddresses(profile);
            if (!rows.length) {
                return '<div class="favorites-popup__empty"><strong>No saved addresses</strong><span>Add a delivery address from My Profile on the ordering home.</span></div>';
            }
            return '<div class="favorites-popup__profile">' + rows.map(function (entry) {
                var isDefault = entry.address === profile.defaultAddress;
                return '<div class="favorites-popup__field">' +
                    '<span>' + escapeHtml(entry.label || 'Address') + (isDefault ? ' · Default' : '') + '</span>' +
                    '<strong>' + escapeHtml(entry.address || '') + '</strong>' +
                '</div>';
            }).join('') + '</div>';
        }
        if (tab === 'password') {
            var security = readJson('kreezbyCustomerSecurity', {});
            var updated = 'Last updated: Never';
            if (security && security.updatedAt) {
                var dt = new Date(security.updatedAt);
                updated = Number.isNaN(dt.getTime()) ? 'Last updated: Recently' : 'Last updated: ' + dt.toLocaleString('en-PH', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            }
            return '<form class="favorites-popup__profile" id="kreezby-popup-password" autocomplete="off">' +
                '<label class="favorites-popup__field">Current Password<input type="password" name="current" autocomplete="current-password"></label>' +
                '<label class="favorites-popup__field">New Password<input type="password" name="next" autocomplete="new-password"></label>' +
                '<label class="favorites-popup__field">Confirm New Password<input type="password" name="confirm" autocomplete="new-password"></label>' +
                '<p class="favorites-popup__note" id="kreezby-popup-password-status">' + escapeHtml(updated) + '</p>' +
                '<button type="submit" class="favorites-popup__checkout">Update Password</button>' +
            '</form>';
        }
        return '<div class="favorites-popup__profile">' +
            '<div class="favorites-popup__field"><span>Full name</span><strong>' + escapeHtml(profile.fullName) + '</strong></div>' +
            '<div class="favorites-popup__field"><span>Username</span><strong>@' + escapeHtml(profile.username) + '</strong></div>' +
            '<div class="favorites-popup__field"><span>Contact number</span><strong>' + escapeHtml(profile.contactNumber) + '</strong></div>' +
            '<div class="favorites-popup__field"><span>Email</span><strong>' + escapeHtml(profile.email) + '</strong></div>' +
            '<div class="favorites-popup__field"><span>Default shipping address</span><strong>' + escapeHtml(profile.defaultAddress) + '</strong></div>' +
        '</div>';
    }

    function renderCart() {
        var items = readCartEntries();
        if (!items.length) {
            return '<div class="favorites-popup__empty"><strong>Your shopping cart is empty</strong><span>Add crinkles to see them here.</span></div>';
        }
        var count = 0;
        var total = 0;
        var cards = items.map(function (item) {
            count += item.qty;
            total += item.cost * item.qty;
            var image = item.img ? '<img src="' + item.img + '" alt="' + item.name + '">' : '';
            return '<article class="favorites-popup__card">' + image +
                '<div>' +
                    '<div class="favorites-popup__meta"><span>' + item.qty + ' × ' + item.variant + '</span><strong>' + money(item.cost * item.qty) + '</strong></div>' +
                    '<h3>' + item.name + '</h3>' +
                '</div>' +
            '</article>';
        }).join('');
        var checkout = /checkout-customer\.html$/i.test(location.pathname)
            ? ''
            : '<a class="favorites-popup__checkout" href="checkout-customer.html">Proceed to checkout · ' + count + ' items · ' + money(total) + '</a>';
        return cards + checkout;
    }

    var TABS = {
        favorites: [{ id: 'saved', label: 'Saved Picks' }],
        orders: [
            { id: 'all', label: 'All Orders' },
            { id: 'processing', label: 'Processing' },
            { id: 'shipped', label: 'Shipped' },
            { id: 'completed', label: 'Completed' },
            { id: 'to-review', label: 'To Review' }
        ],
        profile: [
            { id: 'info', label: 'Profile Information' },
            { id: 'addresses', label: 'Addresses' },
            { id: 'password', label: 'Change Password' }
        ],
        cart: []
    };

    var PANELS = {
        favorites: {
            title: 'Favorites',
            subtitle: 'Your saved Kreezby picks in one place.'
        },
        orders: {
            title: 'Order Notification',
            subtitle: 'Updates for the orders saved on this device.'
        },
        profile: {
            title: 'Account Settings',
            subtitle: 'The account saved on this device.'
        },
        cart: {
            title: 'Cart',
            subtitle: 'Review items before checkout.'
        }
    };

    var activePanel = 'favorites';
    var activeTab = { favorites: 'saved', orders: 'all', profile: 'info' };

    function currentTab(name) {
        var tabs = TABS[name] || [];
        if (!tabs.length) return '';
        var chosen = activeTab[name];
        var match = tabs.some(function (tab) { return tab.id === chosen; });
        if (!match) chosen = tabs[0].id;
        activeTab[name] = chosen;
        return chosen;
    }

    function paintFeed() {
        var feed = document.getElementById('kreezby-favorites-feed');
        if (!feed) return;
        var tab = currentTab(activePanel);
        if (activePanel === 'favorites') render();
        else if (activePanel === 'orders') feed.innerHTML = renderOrders(tab);
        else if (activePanel === 'profile') feed.innerHTML = renderProfile(tab);
        else if (activePanel === 'cart') feed.innerHTML = renderCart();
    }

    function renderTabRow(name) {
        var row = document.getElementById('kreezby-popup-tabs');
        if (!row) return;
        var tabs = TABS[name] || [];
        if (!tabs.length) {
            row.hidden = true;
            row.innerHTML = '';
            return;
        }
        var chosen = currentTab(name);
        row.hidden = false;
        row.innerHTML = tabs.map(function (tab) {
            return '<button type="button" class="tab-link' + (tab.id === chosen ? ' active' : '') + '" data-popup-tab="' + tab.id + '" role="tab">' + tab.label + '</button>';
        }).join('');
        if (window.KreezbyExpandingTabs) window.KreezbyExpandingTabs.init();
    }

    function openPanel(name) {
        var panel = PANELS[name] || PANELS.favorites;
        activePanel = PANELS[name] ? name : 'favorites';
        var overlay = ensurePopup();
        overlay.querySelector('h2').textContent = panel.title;
        overlay.querySelector('.favorites-popup__header p').textContent = panel.subtitle;
        renderTabRow(activePanel);
        paintFeed();
        overlay.classList.add('is-open');
        document.body.classList.add('favorites-popup-open');
    }

    function openPopup() {
        openPanel('favorites');
    }

    function closePopup() {
        var overlay = document.getElementById('kreezby-favorites-popup');
        if (overlay) overlay.classList.remove('is-open');
        document.body.classList.remove('favorites-popup-open');
    }

    function identityKey(value) {
        return String(value || '').trim().toLowerCase().replace(/[\s._-]+/g, '');
    }

    function storedPassword() {
        var security = readJson('kreezbyCustomerSecurity', {});
        if (security && security.password) return String(security.password).trim();
        var profile = readProfile();
        var creds = readJson('kreezbyAuthCredentials', {});
        var keys = ['customer', 'customer1', 'maria.santos@email.com', 'Maria Santos', profile.username, profile.email, profile.fullName];
        for (var i = 0; i < keys.length; i += 1) {
            var key = identityKey(keys[i]);
            if (key && creds[key] && creds[key].password) return String(creds[key].password).trim();
        }
        return 'kreezby123';
    }

    function savePopupPassword(form) {
        var status = document.getElementById('kreezby-popup-password-status');
        function note(message, isError) {
            if (!status) return;
            status.textContent = message;
            status.classList.toggle('is-error', Boolean(isError));
        }
        var current = String(form.current.value || '').trim();
        var next = String(form.next.value || '').trim();
        var confirmValue = String(form.confirm.value || '').trim();
        var expected = storedPassword();
        if (!current) return note('Please enter your current password.', true);
        if (current !== expected) return note('Current password is incorrect.', true);
        if (next.length < 6) return note('New password must be at least 6 characters.', true);
        if (next !== confirmValue) return note('New password and confirm password do not match.', true);
        if (next === expected) return note('New password must be different from current password.', true);
        var updatedAt = new Date().toISOString();
        localStorage.setItem('kreezbyCustomerSecurity', JSON.stringify({ password: next, updatedAt: updatedAt }));
        var profile = readProfile();
        var creds = readJson('kreezbyAuthCredentials', {});
        ['customer', 'customer1', 'maria.santos@email.com', 'Maria Santos', profile.username, profile.email, profile.fullName].forEach(function (alias) {
            var key = identityKey(alias);
            if (!key) return;
            creds[key] = { password: next, accountType: 'Customer', updatedAt: updatedAt };
        });
        localStorage.setItem('kreezbyAuthCredentials', JSON.stringify(creds));
        form.reset();
        note('Password updated successfully.', false);
    }

    function bind() {
        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('[data-nav="favorites"], [data-nav="orders"], [data-nav="profile"], [data-nav="cart"]');
            if (!trigger || !PANELS[trigger.getAttribute('data-nav')]) return;
            event.preventDefault();
            event.stopPropagation();
            openPanel(trigger.getAttribute('data-nav'));
        }, true);

        document.addEventListener('click', function (event) {
            var tab = event.target.closest('[data-popup-tab]');
            if (!tab || !tab.closest('#kreezby-favorites-popup')) return;
            event.preventDefault();
            activeTab[activePanel] = tab.getAttribute('data-popup-tab');
            var row = tab.parentElement;
            if (row) {
                row.querySelectorAll('.tab-link').forEach(function (el) {
                    el.classList.toggle('active', el === tab);
                });
            }
            paintFeed();
        });

        document.addEventListener('click', function (event) {
            var reorder = event.target.closest('[data-reorder]');
            if (!reorder || !reorder.closest('#kreezby-favorites-popup')) return;
            addToCart(reorder.getAttribute('data-reorder'));
            reorder.textContent = 'Added to cart';
        });

        document.addEventListener('submit', function (event) {
            var form = event.target;
            if (!form || form.id !== 'kreezby-popup-password') return;
            event.preventDefault();
            savePopupPassword(form);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') closePopup();
        });
    }

    window.KreezbyFavoritesPopup = { open: openPopup, close: closePopup };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();
