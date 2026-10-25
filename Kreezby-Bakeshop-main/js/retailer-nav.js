/**
 * Keeps retailer module pages linked to the active retailer dashboard
 * (retailer-portal.html) via localStorage.
 */
(function () {
  'use strict';

  document.querySelectorAll('meta[name="view-transition"]').forEach(function (el) { el.remove(); });

  var STORAGE_KEY = 'kreezby_retailer_home';
  var DIRECTORY = 'retailer/retailer-portal.html';
  var DEFAULT_HOME = 'retailer-portal.html';
  var PORTAL_PATTERN = /^retailer-portal\.html$/i;
  var HIDE_MODULES_PATTERN = /(^receive-|receiving-retailer\.html$|^return-retailer\.html$|pullout|pull-out|^deliver(y|ies)-)/i;

  function activeRetailerName() {
    try {
      var session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {};
      if (session.accountType === 'Retailer' || session.accountType === 'Wholesaler') {
        return String(session.userName || session.name || '').trim();
      }
    } catch (err) { /* ignore malformed session data */ }
    return '';
  }

  function syncRetailerIdentity() {
    var name = activeRetailerName();
    if (!name) return;

    document.title = document.title.replace(/\bRetailer\b/g, name);
    document.querySelectorAll('.user-dropdown-pill, .panel-brand').forEach(function (node) {
      // The account button (name + "Retailer" underneath) is drawn by user-dropdown-nav.js;
      // overwriting it here made it flicker between the two versions.
      if (node.id === 'user-dropdown-trigger' || node.classList.contains('kz-pill')) return;
      node.textContent = name;
    });
    document.querySelectorAll('[aria-label="Retailer navigation"]').forEach(function (node) {
      node.setAttribute('aria-label', name + ' navigation');
    });
    document.querySelectorAll('h2, h3, .page-title').forEach(function (node) {
      node.textContent = node.textContent.replace(/\bRetailer\b/g, name);
    });
    document.querySelectorAll('input[name="storeName"], [data-retailer-name]').forEach(function (node) {
      if ('value' in node) node.value = name;
      else node.textContent = name;
    });
  }

  function currentFile() {
    var path = location.pathname || '';
    return path.split('/').pop() || '';
  }

  function isRetailerPortalPage(file) {
    return PORTAL_PATTERN.test(file);
  }

  function rememberHome(url) {
    if (!url || !isRetailerPortalPage(url)) return;
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch (err) { /* ignore */ }
  }

  function getStoredHome() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isRetailerPortalPage(stored)) return stored;
    } catch (err) { /* ignore */ }
    return null;
  }

  function resolveHomeUrl() {
    var file = currentFile();
    if (isRetailerPortalPage(file)) {
      rememberHome(file);
      return file;
    }
    return getStoredHome() || DEFAULT_HOME;
  }

  function dashboardHref() {
    return DEFAULT_HOME;
  }

  function isHeaderHomeIcon(link) {
    if (!link || link.closest('.user-dropdown, .user-dropdown-menu, aside')) return false;
    if (link.classList.contains('home-badge') || link.classList.contains('is-icon-only')) return true;
    var label = (link.getAttribute('aria-label') || link.getAttribute('title') || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return label === 'home' || label === 'dashboard';
  }

  function wireRetailerHomeLinks() {
    var home = dashboardHref();
    document.querySelectorAll('a[href="retailer.html"]').forEach(function (link) {
      link.setAttribute('href', home);
    });
    document.querySelectorAll('.top-navbar-node a').forEach(function (link) {
      if (!isHeaderHomeIcon(link)) return;
      link.setAttribute('href', home);
      link.setAttribute('data-turbo', 'false');
      link.setAttribute('data-turbo-frame', '_top');
      link.removeAttribute('data-turbo-action');
      link.setAttribute('aria-label', 'Dashboard');
      link.setAttribute('title', 'Dashboard');
    });
  }

  document.addEventListener('click', function (event) {
    if ((location.pathname || '').toLowerCase().indexOf('/retailer/') === -1) return;
    var link = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!isHeaderHomeIcon(link)) return;
    if (/^retailer-portal\.html$/i.test(currentFile())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(dashboardHref());
  }, true);

  window.addEventListener('pageshow', function () {
    if ((location.pathname || '').toLowerCase().indexOf('/retailer/') === -1) return;
    syncRetailerIdentity();
    if (document.querySelector('.turbo-frame-error')) window.location.reload();
  });

  var INBOX_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';

  function ensureInboxPillStyle() {
    if (document.getElementById('kreezby-retailer-inbox-pill-style')) return;
    var style = document.createElement('style');
    style.id = 'kreezby-retailer-inbox-pill-style';
    // Same look as the yellow menu (☰) button beside it.
    style.textContent =
      '.retailer-inbox-pill{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;' +
      'border-radius:999px;background:#ffca28;color:#1f1f1f;text-decoration:none;flex-shrink:0}' +
      '.retailer-inbox-pill:hover{background:#fbc02d}' +
      '.retailer-inbox-pill svg{width:18px;height:18px;stroke:#1f1f1f;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.retailer-inbox-pill.is-active{background:#fbc02d;box-shadow:0 0 0 3px rgba(255,255,255,.55)}';
    document.head.appendChild(style);
  }

  // Retailer Inbox lives in the top nav as a button right beside the notification bell.
  function wireRetailerInboxNav() {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('/retailer/') === -1) return;

    var right = document.querySelector('.top-navbar-node .top-nav-links-right');
    if (!right) return;

    // Old text "Inbox" links in the header are replaced by the button.
    right.querySelectorAll('a.top-nav-item').forEach(function (link) {
      var label = (link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (label === 'inbox' || href.indexOf('inbox') !== -1) link.remove();
    });

    ensureInboxPillStyle();
    var pill = right.querySelector('.retailer-inbox-pill');
    if (!pill) {
      pill = document.createElement('a');
      pill.className = 'retailer-inbox-pill';
      pill.setAttribute('href', 'inbox-portal.html');
      pill.setAttribute('data-turbo', 'false');
      pill.setAttribute('data-turbo-frame', '_top');
      pill.setAttribute('aria-label', 'Inbox');
      pill.setAttribute('title', 'Inbox');
      pill.innerHTML = INBOX_ICON;
    }
    pill.classList.toggle('is-active', /^inbox-portal\.html$/i.test(currentFile()));

    // Keep it immediately left of the bell (the bell may already be upgraded to the popover).
    var bell = right.querySelector('.notification-popover-root, .notification-pill');
    var anchor = bell || right.querySelector('.user-dropdown');
    if (anchor) {
      if (pill.nextElementSibling !== anchor || pill.parentNode !== right) right.insertBefore(pill, anchor);
    } else if (pill.parentNode !== right) {
      right.appendChild(pill);
    }
  }

  function syncRetailerMenu() {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('/retailer/') === -1) return;
    document.querySelectorAll('aside .navigation-tree').forEach(function (list) {
      list.querySelectorAll('a[href]').forEach(function (a) {
        var file = (a.getAttribute('href') || '').split('?')[0].split('#')[0].split('/').pop();
        if (/^(po-portal|receive-portal|receiving-retailer|return-portal|alert-portal)\.html$/i.test(file) || HIDE_MODULES_PATTERN.test(file)) {
          var li = a.closest('li');
          if (li) li.remove();
          else a.remove();
        }
      });
      // Inbox is a top-nav button now, so it is not listed in the sidebar.
      list.querySelectorAll('a[href]').forEach(function (a) {
        if (!/inbox/i.test(a.getAttribute('href') || '')) return;
        var li = a.closest('li');
        if (li) li.remove();
        else a.remove();
      });
    });
  }

  function removeRetailerDeliveryAndPulloutModules() {
    // Remove nav/sidebar links and inline action shortcuts for receiving (delivery/pullout records).
    function normalizeHref(href) {
      return (href || '').split('?')[0].split('#')[0].trim();
    }

    // If user lands on a removed module page, bounce them back to the retailer home dashboard.
    var here = currentFile();
    if (HIDE_MODULES_PATTERN.test(here)) {
      // Use resolveHomeUrl to preserve correct branch/store home.
      location.replace(resolveHomeUrl());
      return;
    }

    // Sidebar / navigation links
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = normalizeHref(a.getAttribute('href'));
      var file = href.split('/').pop();
      if (!file) return;

      if (HIDE_MODULES_PATTERN.test(file)) {
        var li = a.closest('li');
        if (li) li.remove();
        else a.remove();
      }
    });

    // Any "quick action" menu items that navigate to receiving modules
    document.querySelectorAll('[onclick]').forEach(function (node) {
      var onclick = node.getAttribute('onclick') || '';
      if (/location\.href\s*=\s*['"][^'"]*(receive|receiving-retailer)[^'"]*['"]/i.test(onclick)) {
        node.remove();
      }
    });
  }

  window.KreezbyRetailerNav = {
    getHomeUrl: resolveHomeUrl,
    rememberHome: rememberHome,
    directoryUrl: DIRECTORY
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireRetailerHomeLinks();
      syncRetailerIdentity();
      wireRetailerInboxNav();
      syncRetailerMenu();
      removeRetailerDeliveryAndPulloutModules();
      schedulePortalSidebarRender();
    });
  } else {
    wireRetailerHomeLinks();
    syncRetailerIdentity();
    wireRetailerInboxNav();
    syncRetailerMenu();
    removeRetailerDeliveryAndPulloutModules();
    schedulePortalSidebarRender();
  }

  function schedulePortalSidebarRender() {
    syncRetailerMenu();
    if (window.KreezbyPortalIconSidebar) {
      window.KreezbyPortalIconSidebar.render();
      return;
    }
    document.addEventListener('kreezby-portal-sidebar-ready', function () {
      if (window.KreezbyPortalIconSidebar) window.KreezbyPortalIconSidebar.render();
    }, { once: true });
  }

  document.addEventListener('kreezby:page-load', function () {
    wireRetailerHomeLinks();
    wireRetailerInboxNav();
    syncRetailerMenu();
    removeRetailerDeliveryAndPulloutModules();
    if (window.KreezbyPortalIconSidebar) window.KreezbyPortalIconSidebar.render();
  });
})();
