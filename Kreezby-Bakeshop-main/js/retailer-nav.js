/**
 * Keeps retailer module pages linked to the active retailer dashboard
 * (retailer-portal.html) via localStorage.
 */
(function () {
  'use strict';

  document.querySelectorAll('meta[name="view-transition"]').forEach(function (el) { el.remove(); });

  var STORAGE_KEY = 'kreezby_retailer_home';
  var DIRECTORY = 'retailer/portal/retailer-portal.html';
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

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((location.pathname || '').toLowerCase().indexOf('/retailer/') === -1) return;
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download') || isHeaderHomeIcon(link)) return;
    if (link.target && link.target !== '_self') return;
    var raw = link.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#' || raw.indexOf('javascript:') === 0) return;
    if (/^https?:/i.test(raw)) return;
    if (raw.indexOf('..') === 0 && raw.toLowerCase().indexOf('/retailer/') === -1) return;
    var file = raw.split('?')[0].split('#')[0].split('/').pop();
    if (!/\.html$/i.test(file)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(link.href);
  }, true);

  window.addEventListener('pageshow', function () {
    if ((location.pathname || '').toLowerCase().indexOf('/retailer/') === -1) return;
    if (document.querySelector('.turbo-frame-error')) window.location.reload();
  });

  function wireRetailerInboxNav() {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('/retailer/') === -1) return;

    document.querySelectorAll('.top-nav-links-right a.top-nav-item').forEach(function (link) {
      var label = (link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      var href = (link.getAttribute('href') || '').toLowerCase();
      if (label === 'inbox' || href.indexOf('inbox') !== -1) link.remove();
    });
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
      var hasInbox = false;
      list.querySelectorAll('a[href]').forEach(function (a) {
        if (/inbox/i.test(a.getAttribute('href') || '')) hasInbox = true;
      });
      if (!hasInbox) {
        var item = document.createElement('li');
        item.className = 'tree-node';
        if (/^inbox-portal\.html$/i.test(currentFile())) item.classList.add('active');
        var link = document.createElement('a');
        link.setAttribute('href', 'inbox-portal.html');
        link.setAttribute('data-turbo', 'false');
        link.setAttribute('data-turbo-frame', '_top');
        link.textContent = 'Inbox';
        item.appendChild(link);
        list.appendChild(item);
      }
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
      wireRetailerInboxNav();
      syncRetailerMenu();
      removeRetailerDeliveryAndPulloutModules();
      schedulePortalSidebarRender();
    });
  } else {
    wireRetailerHomeLinks();
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
