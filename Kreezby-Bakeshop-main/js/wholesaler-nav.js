/**
 * Keeps wholesaler module pages linked to the shared wholesaler dashboard
 * (wholesaler-portal.html) via localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kreezby_wholesaler_home';
  var DIRECTORY = 'wholesaler/wholesaler-portal.html';
  var DEFAULT_HOME = 'wholesaler-portal.html';
  var PORTAL_PATTERN = /^wholesaler-portal\.html$/i;
  var HIDE_MODULES_PATTERN = /(^receive-|receiving-retailer\.html$|^return-retailer\.html$|pullout|pull-out|delivery)/i;

  function currentFile() {
    var path = location.pathname || '';
    return path.split('/').pop() || '';
  }

  function isWholesalerPortalPage(file) {
    return PORTAL_PATTERN.test(file);
  }

  function rememberHome(url) {
    if (!url || !isWholesalerPortalPage(url)) return;
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch (err) { /* ignore */ }
  }

  function getStoredHome() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isWholesalerPortalPage(stored)) return stored;
    } catch (err) { /* ignore */ }
    return null;
  }

  function resolveHomeUrl() {
    var file = currentFile();
    if (isWholesalerPortalPage(file)) {
      rememberHome(file);
      return file;
    }
    return getStoredHome() || DEFAULT_HOME;
  }

  function wireWholesalerHomeLinks() {
    var home = resolveHomeUrl();
    document.querySelectorAll('a[href="wholesaler.html"]').forEach(function (link) {
      link.setAttribute('href', home);
    });
  }

  function wireWholesalerInboxNav() {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('/wholesaler/') === -1) return;

    document.querySelectorAll('.top-nav-links-right a.top-nav-item').forEach(function (link) {
      var label = (link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (label === 'inbox' || href.indexOf('inbox') !== -1) link.remove();
    });
  }

  function removeWholesalerDeliveryAndPulloutModules() {
    function normalizeHref(href) {
      return (href || '').split('?')[0].split('#')[0].trim();
    }

    var here = currentFile();
    if (HIDE_MODULES_PATTERN.test(here)) {
      location.replace(resolveHomeUrl());
      return;
    }

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

    document.querySelectorAll('[onclick]').forEach(function (node) {
      var onclick = node.getAttribute('onclick') || '';
      if (/location\.href\s*=\s*['"][^'"]*(receive|receiving-retailer)[^'"]*['"]/i.test(onclick)) {
        node.remove();
      }
    });
  }

  window.KreezbyWholesalerNav = {
    getHomeUrl: resolveHomeUrl,
    resolveHomeUrl: resolveHomeUrl,
    rememberHome: rememberHome,
    directoryUrl: DIRECTORY,
    DIRECTORY: DIRECTORY
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireWholesalerHomeLinks();
      wireWholesalerInboxNav();
      removeWholesalerDeliveryAndPulloutModules();
      schedulePortalSidebarRender();
    });
  } else {
    wireWholesalerHomeLinks();
    wireWholesalerInboxNav();
    removeWholesalerDeliveryAndPulloutModules();
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
    wireWholesalerHomeLinks();
    wireWholesalerInboxNav();
    removeWholesalerDeliveryAndPulloutModules();
    if (window.KreezbyPortalIconSidebar) window.KreezbyPortalIconSidebar.render();
  });
})();
