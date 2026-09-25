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

  /** Quick demo logins — normalized key (lowercase, no spaces/dashes) */
  var LOGIN_ALIASES = {
    brentadmin: {
      userName: 'Brent Ramos',
      accountType: 'Head Administrator',
      redirectUrl: 'head_admin/index.html'
    },
    headadmin: {
      userName: 'Brent Ramos',
      accountType: 'Head Administrator',
      redirectUrl: 'head_admin/index.html'
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
    staff1: {
      userName: 'Claire Mendoza (Staff 1)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-1.html'
    },
    staff2: {
      userName: 'Ryan Santos (Staff 2)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-2.html'
    },
    staff3: {
      userName: 'Isabel Cruz (Staff 3)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-3.html'
    },
    staff4: {
      userName: 'Derek Lim (Staff 4)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-4.html'
    },
    derekstaff: {
      userName: 'Derek Lim (Staff 4)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-4.html'
    },
    staff5: {
      userName: 'Nina Garcia (Staff 5)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-5.html'
    },
    ninastaff: {
      userName: 'Nina Garcia (Staff 5)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-5.html'
    },
    staff6: {
      userName: 'Omar Reyes (Staff 6)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-6.html'
    },
    omarstaff: {
      userName: 'Omar Reyes (Staff 6)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-6.html'
    },
    staff7: {
      userName: 'Grace Tan (Staff 7)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-7.html'
    },
    gracestaff: {
      userName: 'Grace Tan (Staff 7)',
      accountType: 'Staff',
      redirectUrl: 'staff/staff-7.html'
    },
    retailer: {
      userName: 'SIDC Batangas Hub',
      accountType: 'Retailer',
      redirectUrl: 'retailer/retailer-directory.html'
    },
    customer: {
      userName: 'Maria Santos',
      accountType: 'Customer',
      redirectUrl: 'customer/customer.html'
    },
    customer1: {
      userName: 'Maria Santos',
      accountType: 'Customer',
      redirectUrl: 'customer/customer.html'
    },
    mariasantosemailcom: {
      userName: 'Maria Santos',
      accountType: 'Customer',
      redirectUrl: 'customer/customer.html'
    },
    guest: {
      userName: 'Guest Customer',
      accountType: 'Customer',
      redirectUrl: 'customer/customer.html'
    },
    metrobulk: {
      userName: 'Metro Bulk Distributors',
      accountType: 'Wholesaler',
      redirectUrl: 'wholesaler/metrobulkdistributors/wholesaler-quezoncity_metrobulkdistributors.html'
    },
    'james@metrobulkcom': {
      userName: 'Metro Bulk Distributors',
      accountType: 'Wholesaler',
      redirectUrl: 'wholesaler/metrobulkdistributors/wholesaler-quezoncity_metrobulkdistributors.html'
    },
    visayas: {
      userName: 'Visayas Wholesale Hub',
      accountType: 'Wholesaler',
      redirectUrl: 'wholesaler/visayaswholesalehub/wholesaler-iloilocity_visayaswholesalehub.html'
    },
    'carla@visayaswholesalecom': {
      userName: 'Visayas Wholesale Hub',
      accountType: 'Wholesaler',
      redirectUrl: 'wholesaler/visayaswholesalehub/wholesaler-iloilocity_visayaswholesalehub.html'
    },
    kylaramosemailcom: {
      userName: 'Kyla Ramos',
      accountType: 'Customer',
      redirectUrl: 'customer/customer.html'
    },
    'kylaramos@emailcom': {
      userName: 'Kyla Ramos',
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

    return DEMO_PASSWORD;
  }

  function resolveLoginIdentity(identity) {
    var key = normalizeLoginKey(identity);
    if (LOGIN_ALIASES[key]) {
      return {
        identity: identity,
        userName: LOGIN_ALIASES[key].userName,
        accountType: LOGIN_ALIASES[key].accountType,
        redirectUrl: LOGIN_ALIASES[key].redirectUrl
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
    body.innerHTML = STATIC_NOTIFICATIONS.map(function (n) {
      var icon = n.type === 'order' ? 'Cart' : 'Box';
      return '<div class="notification-item ' + (n.status === 'unread' ? 'unread' : '') + '">' +
        '<div class="notification-content"><div class="notification-title">' + icon + ' ' + n.title + '</div>' +
        '<div class="notification-message">' + n.message + '</div><div class="notification-time">' + n.time + '</div></div></div>';
    }).join('');
    modal.classList.add('active');
  }

  function closeNotificationModal() {
    var modal = document.getElementById('notification-modal-overlay');
    if (modal) modal.classList.remove('active');
  }
  window.openNotificationModal = openNotificationModal;
  window.closeNotificationModal = closeNotificationModal;

  function staffDashboardFromIdentity(identity) {
    var id = (identity || '').toLowerCase();
    if (window.KreezbyMaintenanceSettings) {
      var staffList = window.KreezbyMaintenanceSettings.getUsers().staff || [];
      for (var i = 0; i < staffList.length; i++) {
        var s = staffList[i];
        if (s.id.toLowerCase() === id || s.username.toLowerCase() === id || s.name.toLowerCase() === id) {
          if (window.KreezbyStaffPermissions && window.KreezbyStaffPermissions.STAFF_PROFILES[s.id]) {
            return 'staff/' + window.KreezbyStaffPermissions.getDashboardHref(s.id);
          }
          return 'staff/' + s.id + '.html';
        }
      }
    }
    if (id.indexOf('staff-7') >= 0 || id.indexOf('staff7') >= 0 || id.indexOf('grace') >= 0) return 'staff/staff-7.html';
    if (id.indexOf('staff-6') >= 0 || id.indexOf('staff6') >= 0 || id.indexOf('omar') >= 0 || id.indexOf('dispatch') >= 0) return 'staff/staff-6.html';
    if (id.indexOf('staff-5') >= 0 || id.indexOf('staff5') >= 0 || id.indexOf('nina') >= 0 || id.indexOf('packaging') >= 0) return 'staff/staff-5.html';
    if (id.indexOf('staff-4') >= 0 || id.indexOf('staff4') >= 0 || id.indexOf('derek') >= 0) return 'staff/staff-4.html';
    if (id.indexOf('staff-3') >= 0 || id.indexOf('staff3') >= 0 || id.indexOf('isabel') >= 0 || id.indexOf('inv') >= 0) return 'staff/staff-3.html';
    if (id.indexOf('staff-2') >= 0 || id.indexOf('staff2') >= 0 || id.indexOf('ryan') >= 0 || id.indexOf('recv') >= 0) return 'staff/staff-2.html';
    return 'staff/staff-1.html';
  }

  function loginRedirectForType(accountType, identity) {
    if (accountType === 'Head Administrator') return 'head_admin/index.html';
    if (accountType === 'Administrator') return 'admin/admin.html';
    if (accountType === 'Staff') {
      return staffDashboardFromIdentity(identity);
    }
    if (accountType === 'Wholesaler') {
      var who = String(identity || '').toLowerCase();
      if (who.indexOf('visayas') >= 0 || who.indexOf('carla') >= 0 || who.indexOf('iloilo') >= 0) {
        return 'wholesaler/visayaswholesalehub/wholesaler-iloilocity_visayaswholesalehub.html';
      }
      if (who.indexOf('metro') >= 0 || who.indexOf('james') >= 0 || who.indexOf('quezon') >= 0) {
        return 'wholesaler/metrobulkdistributors/wholesaler-quezoncity_metrobulkdistributors.html';
      }
      return 'wholesaler/wholesaler-directory.html';
    }
    if (accountType === 'Retailer') return 'retailer/retailer-directory.html';
    if (accountType === 'Customer') return 'customer/customer.html';
    return 'customer/customer_guest.html';
  }

  function handleStockAction(actionType, itemName) {
    var name = itemName || 'Item';
    if (actionType === 'archive') {
      if (!confirm('Archive "' + name + '" from active tracking?')) return;
      toast('"' + name + '" archived successfully.', 'success');
      return;
    }
    if (actionType === 'adjust') {
      var qty = prompt('New stock quantity for "' + name + '":', '100');
      if (qty === null) return;
      toast('Stock for "' + name + '" updated to ' + qty + ' successfully.', 'success');
      return;
    }
    toast('History loaded for "' + name + '" successfully.', 'info');
  }
  window.handleStockAction = handleStockAction;

  function handleAlertTrigger(action, context) {
    if (action === 'dismiss') {
      toast('Alert dismissed.', 'info');
      return;
    }
    postAction('Alert: ' + action, { context: context }, 'Action "' + action + '" completed for ' + context).then(function (res) {
      toast(res.message || 'Done.', 'success');
    });
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
          var resolved = resolveLoginIdentity(identity);
          if (!resolved) {
            toast('Account not found. Try brent_admin, elena_admin, staff1, retailer, customer, or maria.santos@email.com', 'warn');
            return;
          }
          var expectedPassword = resolveExpectedPassword(identity, resolved);
          if (password !== expectedPassword) {
            toast('Invalid password. Please try again.', 'warn');
            return;
          }
          if (window.KreezbyMaintenanceSettings) {
            KreezbyMaintenanceSettings.recordLogin(identity);
          }
          try {
            localStorage.setItem('kreezby_session', JSON.stringify({
              identity: resolved.identity,
              userName: resolved.userName,
              accountType: resolved.accountType
            }));
            if (resolved.accountType === 'Administrator') {
              var nid = normalizeLoginKey(resolved.identity || resolved.userName);
              var adminId = 'elena';
              if (nid.indexOf('marco') >= 0) adminId = 'marco';
              else if (nid.indexOf('patricia') >= 0) adminId = 'patricia';
              else if (nid.indexOf('jonas') >= 0) adminId = 'jonas';
              try { sessionStorage.setItem('kreezby_current_admin', adminId); } catch (e2) { /* ignore */ }
            }
          } catch (err) { /* ignore */ }
          toast('Welcome, ' + resolved.userName + '!', 'success');
          setTimeout(function () {
            location.href = appRootPrefix() + resolved.redirectUrl;
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
          if (!payload.password || String(payload.password).length < 6) {
            toast('Password must be at least 6 characters.', 'warn');
            return;
          }
          if (payload.password !== payload.confirmPassword) {
            toast('Passwords do not match. Please try again.', 'warn');
            return;
          }
          var customerName = (payload.firstName + ' ' + payload.lastName).trim();
          if (window.KreezbyMaintenanceSettings) {
            var users = KreezbyMaintenanceSettings.getUsers();
            users.customers.push({
              id: 'cust-' + Date.now(),
              name: customerName || 'New Customer',
              email: payload.email,
              phone: payload.contactInfo,
              joined: new Date().toISOString().slice(0, 10)
            });
            KreezbyMaintenanceSettings.saveUsers(users);
            KreezbyMaintenanceSettings.recordLogin(payload.email);
          }
          toast('Account created successfully! Please log in.', 'success');
          setTimeout(function () { location.href = 'log_in.html'; }, 800);
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
