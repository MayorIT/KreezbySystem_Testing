/**
 * Keeps retailer module pages linked to the active retailer dashboard
 * (retailer-portal.html) via localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kreezby_retailer_home';
  var DIRECTORY = 'retailer/retailer-portal.html';
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
      wireRetailerHomeLinks();
      wireRetailerInboxNav();
      removeRetailerDeliveryAndPulloutModules();
      schedulePortalSidebarRender();
    });
  } else {
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
    wireRetailerHomeLinks();
    wireRetailerInboxNav();
    removeRetailerDeliveryAndPulloutModules();
    if (window.KreezbyPortalIconSidebar) window.KreezbyPortalIconSidebar.render();
  });
})();
