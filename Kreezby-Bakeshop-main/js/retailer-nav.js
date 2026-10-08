/**
 * Keeps retailer module pages linked to the active retailer dashboard
 * (retailer-portal.html) via localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kreezby_retailer_home';
  var DIRECTORY = 'retailer/wholesaler/retailer-portal.html';
  var DEFAULT_HOME = 'retailer-portal.html';
  var PORTAL_PATTERN = /^retailer-portal\.html$/i;
  var HIDE_MODULES_PATTERN = /(^receive-|receiving-retailer\.html$|^return-retailer\.html$|pullout|pull-out|delivery)/i;

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

  function isWholesalerAccount() {
    try {
      var session = JSON.parse(localStorage.getItem('kreezby_session') || 'null');
      return !!(session && session.accountType === 'Wholesaler');
    } catch (err) { return false; }
  }

  function replaceRoleText(value) {
    return String(value || '')
      .replace(/\bRetailer\b/g, 'Wholesaler')
      .replace(/retailer portal/g, 'wholesaler portal');
  }

  function applyWholesalerLabels() {
    if (!isWholesalerAccount()) return;
    if ((location.pathname || '').toLowerCase().indexOf('/retailer/') === -1) return;

    document.body.classList.add('kreezby-wholesaler-home');
    if (document.title.indexOf('Wholesaler') === -1) document.title = replaceRoleText(document.title);

    var brand = document.querySelector('.panel-brand');
    if (brand && brand.textContent.trim() === 'Retailer') brand.textContent = 'Wholesaler';

    var pill = document.getElementById('user-dropdown-trigger');
    if (pill && /\bRetailer\b/.test(pill.textContent || '')) {
      pill.textContent = 'Wholesaler \u25be';
    }

    document.querySelectorAll('.page-title, .page-subtitle, .admin-home h2, .admin-home-copy h2, a.btn-secondary').forEach(function (el) {
      if (el.childElementCount) return;
      var next = replaceRoleText(el.textContent);
      if (next !== el.textContent) el.textContent = next;
    });

    var store = document.querySelector('[name="storeName"]');
    if (store && store.value === 'Retailer') store.value = 'Wholesaler';
    var storeLabel = document.querySelector('label[for="retailer-store"]');
    if (storeLabel && /\bRetailer\b/.test(storeLabel.textContent || '')) {
      storeLabel.textContent = 'Wholesaler / Account Name';
    }
    var form = document.querySelector('form.report-form');
    if (form) {
      var onsubmit = form.getAttribute('onsubmit') || '';
      if (onsubmit.indexOf("'Retailer'") !== -1) {
        form.setAttribute('onsubmit', onsubmit.replace("'Retailer'", "'Wholesaler'"));
      }
    }
    var inbox = document.querySelector('[data-inbox-role="retailer"]');
    if (inbox) inbox.setAttribute('data-inbox-role', 'wholesaler');
  }

  function wireRetailerHomeLinks() {
    var home = resolveHomeUrl();
    document.querySelectorAll('a[href="retailer.html"]').forEach(function (link) {
      link.setAttribute('href', home);
    });
  }

  function wireRetailerInboxNav() {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('/retailer/') === -1) return;

    document.querySelectorAll('.top-nav-links-right a.top-nav-item').forEach(function (link) {
      var label = (link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (label === 'inbox' || href.indexOf('inbox') !== -1) link.remove();
    });
  }

  function removeRetailerDeliveryAndPulloutModules() {
    // Remove nav/sidebar links and inline action shortcuts for receiving (delivery/pullout records).
    // Return/P.O List (return-{store}.html) stays visible for each retailer.
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
      applyWholesalerLabels();
      wireRetailerHomeLinks();
      wireRetailerInboxNav();
      removeRetailerDeliveryAndPulloutModules();
      schedulePortalSidebarRender();
    });
  } else {
    applyWholesalerLabels();
    wireRetailerHomeLinks();
    wireRetailerInboxNav();
    removeRetailerDeliveryAndPulloutModules();
    schedulePortalSidebarRender();
  }

  function schedulePortalSidebarRender() {
    if (window.KreezbyPortalIconSidebar) {
      window.KreezbyPortalIconSidebar.render();
      return;
    }
    document.addEventListener('kreezby-portal-sidebar-ready', function () {
      if (window.KreezbyPortalIconSidebar) window.KreezbyPortalIconSidebar.render();
    }, { once: true });
  }

  document.addEventListener('kreezby:page-load', function () {
    applyWholesalerLabels();
    wireRetailerHomeLinks();
    wireRetailerInboxNav();
    removeRetailerDeliveryAndPulloutModules();
    if (window.KreezbyPortalIconSidebar) window.KreezbyPortalIconSidebar.render();
  });
})();
