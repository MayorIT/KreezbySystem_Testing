/**
 * Kreezby Bakeshop — shared UI runtime (buttons, forms, menus, notifications).
 */
(function () {
  'use strict';

  var floatingMenuEl = null;

  function appRootPrefix() {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('/auth/') >= 0) return '../';
    return '';
  }

  function loginReturnTarget() {
    try {
      var value = new URLSearchParams(location.search || '').get('returnTo');
      if (!value || value.charAt(0) !== '/' || value.indexOf('//') === 0) return '';
      if (value.indexOf('/admin/') === -1 && value.indexOf('/head_admin/') === -1 &&
          value.indexOf('/customer/') === -1) return '';
      return value;
    } catch (e) {
      return '';
    }
  }

  function isAuthPage() {
    var path = (location.pathname || '').toLowerCase();
    return path.indexOf('/auth/') >= 0 ||
      path.indexOf('log_in') >= 0 ||
      path.indexOf('sign_up') >= 0 ||
      path.indexOf('start.html') >= 0 ||
      path === '/' ||
      path.endsWith('/start');
  }

  window.KreezbyApp = {
    toast: toast,
    postAction: postAction,
    postJson: postJson,
    closeModals: closeAllModals,
    openNotifications: openNotificationModal,
    loginRedirect: loginRedirectForType,
    resolveLogin: resolveLoginIdentity
  };

  function ensureToastStyles() {
    if (document.getElementById('kreezby-toast-styles')) return;
    var style = document.createElement('style');
    style.id = 'kreezby-toast-styles';
    style.textContent =
      '#kreezby-toast-host{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:360px}' +
      '.kreezby-toast{padding:14px 18px;border-radius:10px;color:#fff;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.18)}' +
      '.kreezby-toast.success{background:#2e7d32}.kreezby-toast.info{background:#1565c0}' +
      '.kreezby-toast.warn{background:#e65100}.kreezby-toast.error{background:#c62828}' +
      '.kreezby-floating-menu{position:absolute;z-index:500;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,.12);min-width:150px}' +
      '.kreezby-floating-menu button{display:block;width:100%;text-align:left;padding:8px 14px;border:none;background:#fff;font-size:13px;cursor:pointer}' +
      '.kreezby-floating-menu button:hover{background:#f5f5f5}' +
      '.kreezby-floating-menu button.danger{color:#c62828;border-top:1px solid #eee}';
    document.head.appendChild(style);
  }

  function toast(message, type) {
    ensureToastStyles();
    var host = document.getElementById('kreezby-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'kreezby-toast-host';
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
    el.className = 'kreezby-toast ' + (type || 'info');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  var DEMO_PASSWORD = 'kreezby123';

  /** Real staff sign-ins — normalized key (lowercase, no spaces/dashes) */
  var LOGIN_ALIASES = {
    marcelaadmin: {
      userName: 'Criselda Ramos',
      accountType: 'Head Administrator',
      redirectUrl: 'head_admin/head_admin.html'
    },
    brentadmin: {
      userName: 'Brent Ramos',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    ailoreadmin: {
      userName: 'Ailore Embalzado',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    headadmin: {
      userName: 'Criselda Ramos',
      accountType: 'Head Administrator',
      redirectUrl: 'head_admin/head_admin.html'
    },
    kreezbyadmin: {
      userName: 'Elena Morales',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    admin1: {
      userName: 'Elena Morales',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    elenaadmin: {
      userName: 'Elena Morales',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    marcoadmin: {
      userName: 'Marco Del Rosario',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    patriciaadmin: {
      userName: 'Patricia Go',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    jonasadmin: {
      userName: 'Jonas Villanueva',
      accountType: 'Administrator',
      redirectUrl: 'admin/admin.html'
    },
    itkreezby: {
      userName: 'IT Kreezby',
      accountType: 'IT Support',
      redirectUrl: 'it_kreezby/index.html'
    },
    it: {
      userName: 'IT Kreezby',
      accountType: 'IT Support',
      redirectUrl: 'it_kreezby/index.html'
    },
    imeldastaff: {
      userName: 'Imelda Atienza',
      accountType: 'Staff',
      redirectUrl: 'staff/staff.html'
    },
    imeldaatienza: {
      userName: 'Imelda Atienza',
      accountType: 'Staff',
      redirectUrl: 'staff/staff.html'
    },
    nicholestaff: {
      userName: 'Nichole Ramos',
      accountType: 'Staff',
      redirectUrl: 'staff/staff.html'
    },
    nicholeramos: {
      userName: 'Nichole Ramos',
      accountType: 'Staff',
      redirectUrl: 'staff/staff.html'
    },
    guest: {
      userName: 'Guest Customer',
      accountType: 'Customer',
      redirectUrl: 'customer/customer.html'
    }
  };

  function normalizeLoginKey(identity) {
    return String(identity || '').trim().toLowerCase().replace(/[\s._-]+/g, '');
  }

  function loadJsonSafe(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function resolveExpectedPassword(identity, resolved) {
    var creds = loadJsonSafe('kreezbyAuthCredentials', {});
    var lookupKeys = [
      normalizeLoginKey(identity),
      normalizeLoginKey(resolved && resolved.identity),
      normalizeLoginKey(resolved && resolved.userName)
    ].filter(Boolean);

    for (var i = 0; i < lookupKeys.length; i++) {
      var key = lookupKeys[i];
      if (creds[key] && creds[key].password) {
        return String(creds[key].password);
      }
    }

    if (window.KreezbyMaintenanceSettings && typeof KreezbyMaintenanceSettings.getPasswordForIdentity === 'function') {
      var accountPassword = KreezbyMaintenanceSettings.getPasswordForIdentity(identity, resolved && resolved.userName);
      if (accountPassword) return accountPassword;
    }

    return DEMO_PASSWORD;
  }

  function findLocalCustomer(identity) {
    var q = String(identity || '').trim().toLowerCase();
    if (!q || !window.KreezbyMaintenanceSettings) return null;
    var list = (KreezbyMaintenanceSettings.getUsers().customers) || [];
    for (var i = 0; i < list.length; i++) {
      var u = list[i] || {};
      var fields = [u.email, u.username, u.name, u.user_id, u.id, u.contact];
      for (var j = 0; j < fields.length; j++) {
        if (fields[j] && String(fields[j]).trim().toLowerCase() === q) return u;
      }
    }
    return null;
  }

  // The customer site reads one profile blob; make it belong to the account that just logged in.
  function applyCustomerProfile(acct, fallbackName) {
    try {
      var id = String(acct.id || acct.user_id || '');
      var current = {};
      try { current = JSON.parse(localStorage.getItem('kreezbyCustomerProfile') || '{}') || {}; } catch (e0) { current = {}; }
      if (id && current.accountId === id) return;
      var address = acct.address || '';
      var profile = {
        accountId: id,
        username: acct.username || '',
        fullName: acct.name || fallbackName || '',
        email: acct.email || '',
        contactNumber: acct.phone || acct.contact || '',
        defaultAddress: address,
        addresses: address ? [{ id: 'addr-' + (id || 'home'), label: 'Home', address: address }] : [],
        avatarDataUrl: '',
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('kreezbyCustomerProfile', JSON.stringify(profile));
    } catch (e) { /* ignore */ }
  }

  function mongoLogin(identity, password, attempt) {
    if (!window.fetch) return Promise.resolve(null);
    attempt = attempt || 0;
    return fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: identity, password: password })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        body = body || {};
        body.status = res.status;
        if (res.status === 503 && attempt < 4) {
          return new Promise(function (resolve) {
            setTimeout(function () { resolve(mongoLogin(identity, password, attempt + 1)); }, 700 * (attempt + 1));
          });
        }
        return body;
      });
    }).catch(function () {
      if (attempt < 4) {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(mongoLogin(identity, password, attempt + 1)); }, 700 * (attempt + 1));
        });
      }
      return null;
    });
  }

  function resolveLoginIdentity(identity) {
    var key = normalizeLoginKey(identity);
    if (LOGIN_ALIASES[key]) {
      return {
        identity: identity,
        userName: LOGIN_ALIASES[key].userName,
        accountType: LOGIN_ALIASES[key].accountType,
        redirectUrl: loginRedirectForType(LOGIN_ALIASES[key].accountType, identity) || LOGIN_ALIASES[key].redirectUrl
      };
    }
    if (window.KreezbyMaintenanceSettings) {
      var match = KreezbyMaintenanceSettings.findUserByIdentity(identity);
      if (match && match.accountType !== 'Unknown') {
        return {
          identity: identity,
          userName: match.userName,
          accountType: match.accountType,
          redirectUrl: loginRedirectForType(match.accountType, identity)
        };
      }
    }
    return null;
  }

  var STATIC_NOTIFICATIONS = [
    { type: 'order', title: 'Customer Order Placed', message: 'New order from the shop portal.', time: 'Just now', status: 'unread' },
    { type: 'reorder', title: 'Stock reminder', message: 'Review low-stock items in the Stocks module.', time: '1 hour ago', status: 'unread' },
    { type: 'reorder', title: 'Delivery scheduled', message: 'Inbound raw materials expected tomorrow.', time: 'Today', status: 'read' }
  ];

  function postJson(url, body) {
    return Promise.resolve({ ok: true, message: 'Saved successfully.' });
  }

  function postAction(label, meta, successMessage) {
    return Promise.resolve({
      ok: true,
      message: successMessage || 'Action completed successfully.'
    });
  }

  function closeAllModals() {
    document.querySelectorAll('.system-modal-backdrop.modal-triggered').forEach(function (el) {
      el.classList.remove('modal-triggered');
    });
    document.querySelectorAll('.notification-modal-overlay.active').forEach(function (el) {
      el.classList.remove('active');
    });
    var globalOverlay = document.getElementById('global-modal-overlay-context');
    if (globalOverlay) globalOverlay.classList.remove('active');
    document.querySelectorAll('.modal-box.active').forEach(function (el) {
      el.classList.remove('active');
    });
    closeFloatingMenu();
  }

  function closeFloatingMenu() {
    if (floatingMenuEl) {
      floatingMenuEl.remove();
      floatingMenuEl = null;
    }
  }

  function openFloatingMenu(anchor, itemName) {
    closeFloatingMenu();
    var wrap = anchor.closest('td, .action-menu-relative-container') || anchor.parentElement;
    if (wrap && getComputedStyle(wrap).position === 'static') {
      wrap.style.position = 'relative';
    }
    floatingMenuEl = document.createElement('div');
    floatingMenuEl.className = 'kreezby-floating-menu';
    floatingMenuEl.style.top = (anchor.offsetTop + anchor.offsetHeight + 4) + 'px';
    floatingMenuEl.style.right = '0';
    var name = itemName || 'Record';

    function addItem(label, danger, fn) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      if (danger) btn.className = 'danger';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeFloatingMenu();
        fn();
      });
      floatingMenuEl.appendChild(btn);
    }

    addItem('View details', false, function () { handleStockAction('view', name); });
    addItem('Adjust stock', false, function () { handleStockAction('adjust', name); });
    addItem('Archive item', true, function () { handleStockAction('archive', name); });
    (wrap || document.body).appendChild(floatingMenuEl);
  }

  function ensureNotificationModal() {
    if (isAuthPage()) return;
    if (document.getElementById('notification-modal-overlay')) return;
    var overlay = document.createElement('div');
    overlay.className = 'notification-modal-overlay';
    overlay.id = 'notification-modal-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = '<div class="notification-modal-box"><div class="notification-modal-header"><h2>Notifications</h2><button type="button" class="notification-modal-close-btn">&times;</button></div><div class="notification-modal-body" id="notification-modal-body"></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.notification-modal-close-btn').addEventListener('click', closeNotificationModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeNotificationModal();
    });
  }

  function openNotificationModal() {
    if (isAuthPage()) return;
    ensureNotificationModal();
    var modal = document.getElementById('notification-modal-overlay');
    var body = document.getElementById('notification-modal-body');
    var notices = STATIC_NOTIFICATIONS.slice();
    var path = (location.pathname || '').toLowerCase();
    var partner = path.indexOf('/retailer/') >= 0 || path.indexOf('/customer/') >= 0;
    if (partner && window.KreezbyDictionary && typeof KreezbyDictionary.alerts === 'function') {
      KreezbyDictionary.alerts().forEach(function (alert) {
        if (alert.alert_type !== 'price_change' && alert.alert_type !== 'new_product') return;
        notices.unshift({
          type: alert.alert_type,
          title: alert.alert_type === 'new_product' ? 'New product' : 'Price change',
          message: alert.message,
          time: 'Today',
          status: alert.status === 'pending' ? 'unread' : 'read'
        });
      });
    }
    body.innerHTML = notices.map(function (n) {
      var icon = n.type === 'order' ? 'Cart' : 'Box';
      var dest = n.type === 'order' ? moduleFile('order-tracking') : moduleFile('stocks');
      if (n.type === 'price_change' || n.type === 'new_product') dest = moduleFile('alert');
      return '<button type="button" class="notification-item ' + (n.status === 'unread' ? 'unread' : '') + '" data-open="' + dest + '" style="display:block;width:100%;text-align:left;border:0;background:transparent;cursor:pointer;">' +
        '<div class="notification-content"><div class="notification-title">' + icon + ' ' + n.title + '</div>' +
        '<div class="notification-message">' + n.message + '</div><div class="notification-time">' + n.time + '</div></div></button>';
    }).join('');
    body.querySelectorAll('[data-open]').forEach(function (button) {
      button.addEventListener('click', function () {
        location.href = button.getAttribute('data-open');
      });
    });
    modal.classList.add('active');
  }

  function closeNotificationModal() {
    var modal = document.getElementById('notification-modal-overlay');
    if (modal) modal.classList.remove('active');
  }
  window.openNotificationModal = openNotificationModal;
  window.closeNotificationModal = closeNotificationModal;

  function staffIdFromIdentity(identity) {
    var id = (identity || '').toLowerCase();
    if (window.KreezbyMaintenanceSettings) {
      var staffList = window.KreezbyMaintenanceSettings.getUsers().staff || [];
      for (var i = 0; i < staffList.length; i++) {
        var s = staffList[i];
        var sid = String(s.id || '').toLowerCase();
        var username = String(s.username || '').toLowerCase();
        var name = String(s.name || '').toLowerCase();
        if (sid === id || username === id || name === id || String(s.email || '').toLowerCase() === id || String(s.user_id || '').toLowerCase() === id) return s.id;
      }
    }
    if (id.indexOf('imelda') >= 0) return 'staff-imelda';
    if (id.indexOf('nichole') >= 0) return 'staff-nichole';
    return 'staff-imelda';
  }

  function staffDashboardFromIdentity(identity) {
    try { sessionStorage.setItem('kreezby_current_staff', staffIdFromIdentity(identity)); } catch (e) { /* ignore */ }
    return 'staff/staff.html';
  }

  function areaForLogin(resolved) {
    var href = String(resolved && resolved.redirectUrl || '').toLowerCase();
    var name = String(resolved && resolved.userName || '').toLowerCase();
    if (resolved && resolved.accountType === 'Retailer') {
      var areaMatch = href.match(/retailer\/([a-z0-9]+)\//);
      // Use centralized area labels from manifest if available, otherwise use hardcoded values
      var getAreaLabel = function(slug) {
        if (window.KreezbyRetailerManifest && typeof window.KreezbyRetailerManifest.getAreaLabel === 'function') {
          return window.KreezbyRetailerManifest.getAreaLabel(slug);
        }
        // Fallback hardcoded labels
        var labels = {
          bauan: 'Bauan', batangas: 'Batangas', citimart: 'Citimart', lipa: 'Lipa',
          lucena: 'Lucena', manila: 'Manila', rosario: 'Rosario', stotomas: 'Sto. Tomas', tagaytay: 'Tagaytay'
        };
        return labels[slug] || slug;
      };
      if (areaMatch) return getAreaLabel(areaMatch[1]);
      if (name.indexOf('batangas') >= 0) return getAreaLabel('batangas');
    }
    return '';
  }

  function loginRedirectForType(accountType, identity) {
    if (accountType === 'Head Administrator') return 'head_admin/head_admin.html';
    if (accountType === 'Administrator') return 'admin/admin.html';
    if (accountType === 'Staff') {
      return staffDashboardFromIdentity(identity);
    }
    if (accountType === 'Retailer') return 'retailer/retailer-portal.html';
    if (accountType === 'Customer') return 'customer/customer.html';
    return 'customer/customer_guest.html';
  }

  function moduleFile(prefix) {
    var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
    var suffix = '-admin.html';
    if (path.indexOf('/head_admin/') >= 0) suffix = '-headadmin.html';
    else if (path.indexOf('/staff/') >= 0 || path.indexOf('/staff_names/') >= 0) suffix = '-staff.html';
    return prefix + suffix;
  }

  function archivedStock() {
    try { return JSON.parse(localStorage.getItem('kreezby_archived_stock') || '[]'); } catch (e) { return []; }
  }

  function showStockHistory(name, rows) {
    var host = document.getElementById('kreezby-fr-stock-tools') || document.querySelector('.workspace-view-canvas, .page-shell') || document.body;
    var panel = document.getElementById('kreezby-stock-history');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'kreezby-stock-history';
      host.insertBefore(panel, host.firstChild);
    }
    panel.style.cssText = 'position:relative;margin:0 0 14px;padding:12px 44px 12px 14px;border:1px solid #eadfce;border-radius:12px;background:#fff;';
    var lines = (rows || []).map(function (row) {
      return '<li>' + row.type + ' · ' + row.quantity + ' · ' + row.note + '</li>';
    }).join('');
    panel.innerHTML = '<button type="button" class="kreezby-stock-history-close" aria-label="Close history" style="position:absolute;top:8px;right:10px;width:28px;height:28px;border:0;border-radius:50%;background:#5d4037;color:#fff;font-size:18px;font-weight:700;line-height:28px;text-align:center;cursor:pointer;padding:0;">×</button>'
      + '<strong>History for ' + name + '</strong><ul style="margin:8px 0 0;padding-left:18px;">' + (lines || '<li>No movements yet.</li>') + '</ul>';
    var closeBtn = panel.querySelector('.kreezby-stock-history-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        panel.remove();
      });
    }
    panel.tabIndex = -1;
    panel.focus();
  }

  function handleStockAction(actionType, itemName, row) {
    var name = itemName || 'Item';
    var dict = window.KreezbyDictionary;
    if (actionType === 'archive') {
      if (!confirm('Archive "' + name + '" from active tracking?')) return;
      var archived = archivedStock();
      if (archived.indexOf(name) < 0) archived.push(name);
      try { localStorage.setItem('kreezby_archived_stock', JSON.stringify(archived)); } catch (e) { /* ignore */ }
      var stockRow = row || (window.event && window.event.target && window.event.target.closest && window.event.target.closest('tr'));
      if (stockRow) stockRow.hidden = true;
      toast('"' + name + '" is archived and hidden from the active list.', 'success');
      return;
    }
    if (actionType === 'adjust') {
      if (dict && dict.materialByName && dict.materialByName(name)) {
        var kind = prompt('Movement for "' + name + '": stock-in, stock-out, or usage', 'stock-in');
        if (kind === null) return;
        var moveQty = prompt('Quantity', '1');
        if (moveQty === null) return;
        var nextMaterial = dict.recordMaterialMovement(name, kind, moveQty);
        if (nextMaterial == null) {
          toast('Use stock-in, stock-out, or usage with a quantity above zero.', 'warn');
          return;
        }
        toast(name + ' now has ' + nextMaterial + ' on hand.', 'success');
        return;
      }
      var current = dict && dict.productStock ? dict.productStock(name) : 100;
      var qty = prompt('New finished-goods quantity for "' + name + '":', String(current == null ? 0 : current));
      if (qty === null) return;
      if (dict && dict.setProductStock) {
        var next = dict.setProductStock(name, qty);
        toast('Stock for "' + name + '" is now ' + next + '.', 'success');
        return;
      }
      toast('Stock for "' + name + '" updated to ' + qty + ' successfully.', 'success');
      return;
    }
    if (dict && dict.historyFor) {
      showStockHistory(name, dict.historyFor(name));
      return;
    }
    showStockHistory(name, []);
  }
  window.handleStockAction = handleStockAction;

  function handleAlertTrigger(action, context, row) {
    var alertRow = row || (window.event && window.event.target && window.event.target.closest && window.event.target.closest('tr'));
    if (action === 'dismiss') {
      if (!confirm('Dismiss the alert for "' + (context || 'this item') + '"?')) return;
      if (alertRow) alertRow.hidden = true;
      toast('Alert for "' + (context || 'this item') + '" is dismissed.', 'success');
      return;
    }
    if (action === 'restock') {
      toast('Opening back orders so you can restock "' + (context || 'this item') + '".', 'success');
      location.href = moduleFile('bo');
      return;
    }
    if (action === 'modify') {
      var next = prompt('New reorder threshold for "' + (context || 'this item') + '":', '100');
      if (next === null) return;
      toast('Threshold for "' + (context || 'this item') + '" is now ' + next + '.', 'success');
      return;
    }
    if (action === 'view') {
      var text = String(context || '');
      var dest = /return|ret-/i.test(text) ? 'order-tracking' : /back|bo-|po-000/i.test(text) ? 'bo' : 'alert';
      location.href = moduleFile(dest);
      return;
    }
    toast('Opened "' + (context || 'alert') + '".', 'info');
  }
  window.handleAlertTrigger = handleAlertTrigger;

  if (typeof window.toggleActionPopupMenu !== 'function') {
    window.toggleActionPopupMenu = function (event, popupId) {
      if (event) event.stopPropagation();
      document.querySelectorAll('.action-popup-menu.active').forEach(function (m) {
        if (!popupId || m.id !== popupId) m.classList.remove('active');
      });
      if (popupId) {
        var menu = document.getElementById(popupId);
        if (menu) menu.classList.toggle('active');
      }
    };
  }

  if (typeof window.toggleAlertActionMenu !== 'function') {
    window.toggleAlertActionMenu = window.toggleActionPopupMenu;
  }

  function tryOpenDetailsView() {
    var fns = [
      'switchToDetailsViewPane', 'switchToReceivedDetailsInspectorSheet', 'switchToReturnDetailsInspectorView',
      'switchToBackOrderDetailsInspector', 'switchToDetailedSalesTransactionInspector', 'switchToDetailsViewPane'
    ];
    for (var i = 0; i < fns.length; i++) {
      if (typeof window[fns[i]] === 'function') {
        window[fns[i]]();
        return true;
      }
    }
    return false;
  }

  function handleSaveButton(btn) {
    var label = (btn.textContent || '').trim();
    postAction('Save: ' + label, {}, label + ' saved successfully.').then(function (res) {
      toast(res.message || 'Saved successfully.', 'success');
      closeAllModals();
    });
  }

  function wireForms() {
    document.querySelectorAll('form').forEach(function (form) {
      if (form.dataset.kreezbyWired) return;
      form.dataset.kreezbyWired = '1';

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (form.dataset.kreezbyNative === '1') return;

        var identityInput = form.querySelector('[name="identity"]');
        if (identityInput && form.querySelector('[name="password"]') && !form.querySelector('[name="firstName"]')) {
          var identity = identityInput.value.trim();
          var passwordInput = form.querySelector('[name="password"]');
          var password = passwordInput ? passwordInput.value : '';
          if (!identity) {
            toast('Enter email or username.', 'warn');
            return;
          }
          if (!password) {
            toast('Enter your password.', 'warn');
            return;
          }
          // Ask the server first: it checks the MongoDB account collections and tells us the portal.
          if (!form.__kzMongoDone) {
            mongoLogin(identity, password).then(function (result) {
              form.__kzMongo = result;
              form.__kzMongoDone = true;
              try { form.dispatchEvent(new Event('submit', { cancelable: true })); }
              finally { form.__kzMongoDone = false; }
            });
            return;
          }
          var mongo = form.__kzMongo;
          form.__kzMongo = null;
          var resolved = null;
          if (mongo && mongo.ok && mongo.account) {
            var acct = mongo.account;
            resolved = {
              identity: identity,
              userName: acct.name || identity,
              accountType: acct.accountType,
              redirectUrl: loginRedirectForType(acct.accountType, acct.id || identity)
            };
          } else if (mongo && mongo.status === 403) {
            toast('This account is deactivated.', 'warn');
            return;
          } else {
            // Not matched by the server (or a password changed on this browser): use the browser check.
            resolved = resolveLoginIdentity(identity);
            if (!resolved) {
              toast('Account not found. Please check your email or username.', 'warn');
              return;
            }
            var expectedPassword = resolveExpectedPassword(identity, resolved);
            if (password !== expectedPassword) {
              var hint = (mongo && mongo.stored) ? ' (server has: ' + (mongo.stored.join(', ') || 'no password field') + ')' : '';
              toast('Invalid password. Please try again.' + hint, 'warn');
              return;
            }
          }
          if (window.KreezbyMaintenanceSettings && KreezbyMaintenanceSettings.isLoginBlocked(identity, resolved.userName)) {
            toast('This account is deactivated. It can be turned back on from Maintenance.', 'warn');
            return;
          }
          if (window.KreezbyMaintenanceSettings) {
            KreezbyMaintenanceSettings.recordLogin(identity);
          }
          try {
            var sessionData = {
              identity: resolved.identity,
              userName: resolved.userName,
              accountType: resolved.accountType,
              accountArea: areaForLogin(resolved)
            };
            if (mongo && mongo.ok && mongo.account) {
              // Signed by the server: lets this account read only its own records.
              if (mongo.token) sessionData.token = mongo.token;
              sessionData.accountId = mongo.account.id || '';
            }
            if (resolved.accountType === 'Customer') {
              var custAcct = (mongo && mongo.ok && mongo.account) || findLocalCustomer(identity) || {};
              sessionData.customerId = custAcct.id || custAcct.user_id || '';
              sessionData.email = custAcct.email || '';
              sessionData.phone = custAcct.phone || custAcct.contact || '';
              sessionData.address = custAcct.address || '';
              applyCustomerProfile(custAcct, resolved.userName);
            }
            localStorage.setItem('kreezby_session', JSON.stringify(sessionData));
            if (resolved.accountType === 'Administrator' || resolved.accountType === 'Head Administrator') {
              var nid = normalizeLoginKey(resolved.identity || resolved.userName);
              var adminId = '';
              if (nid.indexOf('brent') >= 0 || nid === 'headadmin') adminId = 'admin-ops';
              else if (nid.indexOf('marcela') >= 0 || nid.indexOf('criselda') >= 0) adminId = 'admin-owner';
              else if (nid.indexOf('ailore') >= 0) adminId = 'ailore';
              if (adminId) {
                try { sessionStorage.setItem('kreezby_current_admin', adminId); } catch (e2) { /* ignore */ }
              }
            }
          } catch (err) { /* ignore */ }
          setTimeout(function () {
            location.href = loginReturnTarget() || appRootPrefix() + resolved.redirectUrl;
          }, 600);
          return;
        }

        if (form.querySelector('[name="firstName"]') || form.classList.contains('signup-form')) {
          var fd = new FormData(form);
          var payload = {
            firstName: fd.get('firstName') || '',
            lastName: fd.get('lastName') || '',
            contactInfo: fd.get('contactInfo') || '',
            email: fd.get('contactInfo') || '',
            birthday: fd.get('birthday') || '',
            password: fd.get('password') || '',
            confirmPassword: fd.get('confirmPassword') || ''
          };
          if (!String(payload.firstName || '').trim() || !String(payload.lastName || '').trim()) {
            toast('Enter your first and last name.', 'warn');
            return;
          }
          if (!String(payload.contactInfo || '').trim()) {
            toast('Enter an email or phone number.', 'warn');
            return;
          }
          if (!payload.password || String(payload.password).length < 6) {
            toast('Password must be at least 6 characters.', 'warn');
            return;
          }
          if (payload.password !== payload.confirmPassword) {
            toast('Passwords do not match. Please try again.', 'warn');
            return;
          }
          if (form.__kzSignupBusy) return;
          form.__kzSignupBusy = true;
          var submitBtn = form.querySelector('[type="submit"]');
          if (submitBtn) submitBtn.disabled = true;
          var customerName = (payload.firstName + ' ' + payload.lastName).trim();
          var contact = String(payload.contactInfo || '').trim();
          var isEmail = contact.indexOf('@') >= 0;
          var record = {
            id: 'cust-' + Date.now(),
            user_id: '',
            name: customerName || 'New Customer',
            email: isEmail ? contact : '',
            phone: isEmail ? '' : contact,
            contact: contact,
            birthday: payload.birthday || '',
            joined: new Date().toISOString().slice(0, 10),
            role: 'Customer',
            accountType: 'Customer',
            temporaryPassword: String(payload.password),
            active: true
          };
          record.user_id = record.id;
          if (isEmail) record.username = contact.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '_') || record.id;
          if (window.KreezbyMaintenanceSettings) {
            var users = KreezbyMaintenanceSettings.getUsers();
            users.customers = users.customers || [];
            users.customers.push(record);
            KreezbyMaintenanceSettings.saveUsers(users);
            KreezbyMaintenanceSettings.recordLogin(contact);
          }
          var published = window.KreezbyMaintenanceSettings && KreezbyMaintenanceSettings.publishAccount
            ? KreezbyMaintenanceSettings.publishAccount('customers', record)
            : fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ bucket: 'customers', account: record })
              }).then(function (res) {
                return res.json().catch(function () { return {}; }).then(function (body) {
                  body = body || {};
                  body.status = res.status;
                  body.ok = !!(res.ok && body.ok);
                  return body;
                });
              });
          Promise.resolve(published).then(function (result) {
            form.__kzSignupBusy = false;
            if (submitBtn) submitBtn.disabled = false;
            if (result && result.status === 409) {
              toast(result.error || 'An account with that email or phone already exists.', 'warn');
              return;
            }
            if (!result || !result.ok) {
              toast((result && result.error) || 'Account could not be saved to the database. Please try again.', 'warn');
              return;
            }
            toast('Account created successfully! Please log in.', 'success');
            setTimeout(function () { location.href = 'log_in.html'; }, 800);
          }).catch(function () {
            form.__kzSignupBusy = false;
            if (submitBtn) submitBtn.disabled = false;
            toast('Account could not be saved to the database. Please try again.', 'warn');
          });
          return;
        }

        if (form.closest('.report-panel') || location.pathname.indexOf('report_issue') >= 0) {
          var role = 'User';
          if (location.pathname.indexOf('admin') >= 0) role = 'Admin';
          else if (location.pathname.indexOf('staff') >= 0) role = 'Staff';
          else if (location.pathname.indexOf('retailer') >= 0) role = 'Retailer';
          else if (location.pathname.indexOf('customer') >= 0) role = 'Customer';
          var msgEl = form.querySelector('[name="message"]') || form.querySelector('textarea');
          postJson('/api/reports', {
            role: role,
            subject: (form.querySelector('[name="subject"]') || {}).value,
            message: msgEl ? msgEl.value : '',
            page: location.pathname
          }).then(function () {
            toast(role + ' issue report submitted.', 'success');
            setTimeout(function () { closeAllModals(); }, 500);
          });
        }
      });
    });
  }

  document.addEventListener('click', function (e) {
    var target = e.target;

    if (!isAuthPage() && target.closest('.notification-pill')) {
      e.preventDefault();
      openNotificationModal();
      return;
    }

    if (target.closest('.notification-modal-close-btn')) {
      closeNotificationModal();
      return;
    }

    if (target.closest('.btn-modal-cancel, .btn-cancel-report')) {
      closeAllModals();
      return;
    }

    var closeBtn = target.closest('button');
    if (closeBtn && closeBtn.closest('.modal-form-header, .modal-header, .notification-modal-header')) {
      var t = (closeBtn.textContent || '').trim();
      if (t === 'X' || t === '\u00d7' || t.indexOf('\u2715') >= 0) {
        closeAllModals();
        return;
      }
    }

    if (target.classList.contains('system-modal-backdrop') && target.classList.contains('modal-triggered')) {
      closeAllModals();
      return;
    }

    if (!window.KreezbyActions) {
      var actionBtn = target.closest('.action-trigger-btn, .btn-row-action');
      if (actionBtn && !actionBtn.getAttribute('onclick')) {
        e.stopPropagation();
        var row = actionBtn.closest('tr');
        var itemName = row ? (row.querySelector('strong') || {}).textContent : '';
        var popup = actionBtn.nextElementSibling;
        if (popup && popup.classList && popup.classList.contains('action-popup-menu')) {
          toggleActionPopupMenu(e, popup.id);
        } else {
          openFloatingMenu(actionBtn, itemName);
        }
        return;
      }
    }

    if (!target.closest('.kreezby-floating-menu')) {
      closeFloatingMenu();
    }

    var saveBtn = target.closest('.btn-modal-save, .btn-save-report, .btn-submit, .btn-call-to-action, .btn-inline-add, .btn-optimize-routes');
    if (saveBtn && !saveBtn.getAttribute('onclick')) {
      var txt = (saveBtn.textContent || '').toLowerCase();
      if (txt.indexOf('save') >= 0 || txt.indexOf('submit') >= 0 || txt.indexOf('create') >= 0 || txt.indexOf('verify') >= 0 || txt.indexOf('add') >= 0 || txt.indexOf('refresh') >= 0) {
        e.preventDefault();
        handleSaveButton(saveBtn);
        return;
      }
    }

    var tr = target.closest('.data-display-table tbody tr');
    if (tr && !tr.getAttribute('onclick') && !target.closest('button, a, input, select')) {
      if (tryOpenDetailsView()) return;
    }
  }, true);

  window.alert = function (msg) {
    toast(String(msg), 'info');
    if (!isAuthPage()) {
      postAction('Alert', { message: String(msg) });
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    ensureToastStyles();
    wireForms();

    if (!isAuthPage()) {
      ensureNotificationModal();
      document.querySelectorAll('.notification-pill').forEach(function (bell) {
        if (!bell.getAttribute('onclick')) {
          bell.addEventListener('click', function (ev) {
            ev.preventDefault();
            openNotificationModal();
          });
        }
      });
    }
  });
})();
