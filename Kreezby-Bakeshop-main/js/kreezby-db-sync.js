/**
 * Loads shared shop data from the Kreezby server (Atlas) before other scripts run,
 * then mirrors later localStorage writes back to the database.
 * Login session and sidebar layout stay on this browser only.
 */
(function () {
  "use strict";

  if (document.head && !document.querySelector('link[rel="icon"]')) {
    var brandIcon = document.createElement("link");
    brandIcon.rel = "icon";
    brandIcon.type = "image/png";
    brandIcon.href = "/assets/logo/favicon-32.png?v=20261018tab";
    brandIcon.sizes = "32x32";
    document.head.appendChild(brandIcon);
    var brandIconLarge = document.createElement("link");
    brandIconLarge.rel = "icon";
    brandIconLarge.type = "image/png";
    brandIconLarge.href = "/assets/logo/favicon.png?v=20261018tab";
    document.head.appendChild(brandIconLarge);
    var appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    appleIcon.href = "/assets/logo/apple-touch-icon.png?v=20261018tab";
    document.head.appendChild(appleIcon);
  }

  // Sidebar that never pops in: remember the finished sidebar (markup + the CSS it needs) and
  // paint it again the instant the next page's <aside> appears, before the sidebar scripts run.
  (function sidebarInstantPaint() {
    var lower = (location.pathname || "").replace(/\\/g, "/").toLowerCase();
    var folder = (lower.match(/\/(admin|head_admin|staff|retailer)\//) || [])[1];
    if (!folder || !document.head) return;
    var who = "";
    try {
      var sess = JSON.parse(localStorage.getItem("kreezby_session") || "null") || {};
      who = String(sess.role || "") + ":" + String(sess.userId || sess.id || sess.email || sess.username || "");
    } catch (e) { who = ""; }
    var KEY = "kzSidebarCache2:" + folder + ":" + who;
    var ASIDE = "aside.dark-sidebar-panel, aside.sidebar-panel";

    function currentFile() { return (lower.split("/").pop() || "").split("?")[0]; }

    // No "Home" button in the top bar on any page: the sidebar's Dashboard entry is the way home.
    (function removeHomeButton() {
      try {
        var HOME_FILES = /(^|\/)(admin|head_admin|staff|staff-\d+|retailer-portal|retailer)\.html?$/i;
        var css = document.createElement("style");
        css.setAttribute("data-kz-nohome", "1");
        css.textContent = ".top-navbar-node a.home-badge,.top-navbar-node a.is-icon-only,.top-navbar-node .top-nav-links-right>a.top-nav-item:not([data-staff-inbox]):not([data-inbox]),a.home-badge{display:none!important}";
        (document.head || document.documentElement).appendChild(css);
        try {
          Object.keys(sessionStorage).forEach(function (k) {
            if (k.indexOf("kreezby-top-navbar-html") === 0) sessionStorage.removeItem(k);
          });
        } catch (e0) { /* ignore */ }
        function isHome(a) {
          if (a.closest(".user-dropdown, .user-dropdown-menu")) return false;
          var c = a.classList;
          if (c.contains("home-badge")) return true;
          var label = String(a.getAttribute("aria-label") || a.getAttribute("title") || a.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
          if (label === "home") return true;
          var href = String(a.getAttribute("href") || "").split("?")[0].split("#")[0];
          return (c.contains("top-nav-item") || c.contains("expandable-nav-tab") || c.contains("is-icon-only")) && HOME_FILES.test(href);
        }
        var queued = false;
        function sweep() {
          queued = false;
          Array.prototype.forEach.call(document.querySelectorAll(".top-navbar-node a.home-badge, .top-navbar-node a.top-nav-item, .top-navbar-node a.expandable-nav-tab, .top-navbar-node a.is-icon-only, .top-navbar-node .top-nav-links-right>a"), function (a) {
            if (isHome(a)) a.remove();
          });
          Array.prototype.forEach.call(document.querySelectorAll("a.home-badge"), function (n) { n.remove(); });
        }
        function queue() { sweep(); }
        sweep();
        new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
        document.addEventListener("DOMContentLoaded", sweep);
        window.addEventListener("load", sweep);
        window.addEventListener("pageshow", sweep);
      } catch (e) { /* ignore */ }
    })();

    // The Insights menu entry is a single link: its three views live on the page as tabs.
    var INSIGHT_SUB = /sales analysis|management insight|production recommendation|product recommendation/i;
    function purgeInsightSubs(root) {
      if (!root || !root.querySelectorAll) return;
      Array.prototype.forEach.call(root.querySelectorAll(".kreezby-sidebar-sub"), function (sub) {
        var links = sub.querySelectorAll("a");
        if (links.length && Array.prototype.every.call(links, function (l) { return INSIGHT_SUB.test(l.textContent || ""); })) sub.remove();
      });
    }
    (function watchInsightSubs() {
      var tries = 0;
      function sweep() { purgeInsightSubs(document.querySelector(ASIDE)); }
      var mo = new MutationObserver(sweep);
      function start() {
        var aside = document.querySelector(ASIDE);
        if (!aside) { if (tries++ < 100) setTimeout(start, 50); return; }
        sweep();
        mo.observe(aside, { childList: true, subtree: true });
        setTimeout(function () { mo.disconnect(); sweep(); }, 6000);
      }
      start();
    })();

    function paint(aside, cache) {
      var css = document.createElement("style");
      css.setAttribute("data-kz-cache", "1");
      css.textContent = cache.css || "";
      document.head.appendChild(css);
      aside.className = cache.cls;
      aside.innerHTML = cache.html;
      purgeInsightSubs(aside);
      var file = currentFile();
      Array.prototype.forEach.call(aside.querySelectorAll("a.kreezby-sidebar-nav-item"), function (a) {
        var f = String(a.getAttribute("href") || "").split("?")[0].split("#")[0].split("/").pop().toLowerCase();
        var on = f === file;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      try {
        if (localStorage.getItem("kreezbySidebarCollapsed") === "1" && document.body) document.body.classList.add("sidebar-collapsed");
      } catch (e) { /* ignore */ }
    }

    var cache = null;
    try { cache = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { cache = null; }
    if (cache && cache.html && cache.cls) {
      var painted = false;
      var observer = new MutationObserver(function () {
        if (painted) return;
        var aside = document.querySelector(ASIDE);
        // wait until the parser has closed the <aside> so it is not appended to afterwards
        if (!aside || !(aside.nextElementSibling || document.readyState !== "loading")) return;
        painted = true;
        observer.disconnect();
        paint(aside, cache);
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener("DOMContentLoaded", function () {
        if (painted) return;
        painted = true;
        observer.disconnect();
        var aside = document.querySelector(ASIDE);
        if (aside) paint(aside, cache);
      });
    }

    function snapshot() {
      var aside = document.querySelector(ASIDE);
      if (!aside || !aside.classList.contains("kreezby-sidebar-ready") || !aside.querySelector(".kreezby-sidebar-nav-item")) return;
      var css = "";
      Array.prototype.forEach.call(document.querySelectorAll('style[id^="kreezby-"], link[rel="stylesheet"][id^="kreezby-"]'), function (el) {
        try {
          if (el.tagName === "STYLE") css += el.textContent + "\n";
          else if (el.sheet) css += Array.prototype.map.call(el.sheet.cssRules, function (r) { return r.cssText; }).join("\n") + "\n";
        } catch (e) { /* cross-origin sheet */ }
      });
      try {
        var clone = aside.cloneNode(true);
        Array.prototype.forEach.call(clone.querySelectorAll(".kz-sidebar-search, .kz-search-empty"), function (n) { n.remove(); });
        Array.prototype.forEach.call(clone.querySelectorAll(".kz-hide, .kz-search-open"), function (n) { n.classList.remove("kz-hide", "kz-search-open"); });
        localStorage.setItem(KEY, JSON.stringify({ html: clone.innerHTML, cls: aside.className, css: css }));
      } catch (e) { /* storage full or blocked */ }
      Array.prototype.forEach.call(document.querySelectorAll("style[data-kz-cache]"), function (el) { el.remove(); });
    }
    var snapTimer = null;
    function scheduleSnapshot() { clearTimeout(snapTimer); snapTimer = setTimeout(snapshot, 500); }
    ["kreezby-admin-sidebar-ready", "kreezby-portal-sidebar-ready", "kreezby-staff-sidebar-ready"].forEach(function (n) {
      document.addEventListener(n, scheduleSnapshot);
    });
    window.addEventListener("load", function () { setTimeout(snapshot, 800); });
  })();

  // Search box at the top of the sidebar: type to narrow the menu (and sub-menus) instantly.
  (function sidebarSearch() {
    var lower = (location.pathname || "").replace(/\\/g, "/").toLowerCase();
    if (!/\/(admin|head_admin|staff|retailer)\//.test(lower)) return;
    var ASIDE = "aside.dark-sidebar-panel, aside.sidebar-panel";
    var query = "";

    function addStyle() {
      if (document.getElementById("kz-sidebar-search-style")) return;
      var st = document.createElement("style");
      st.id = "kz-sidebar-search-style";
      st.textContent = ""
        + ".kz-sidebar-search{position:relative;flex:0 0 auto;margin:2px 4px 10px;}"
        + ".kz-sidebar-search svg{position:absolute;left:11px;top:50%;width:16px;height:16px;transform:translateY(-50%);stroke:#bdbdbd;fill:none;stroke-width:2;stroke-linecap:round;pointer-events:none;}"
        + ".kz-sidebar-search input{width:100%;box-sizing:border-box;height:38px;padding:0 32px 0 34px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:13px;outline:none;}"
        + ".kz-sidebar-search input::placeholder{color:#bdbdbd;}"
        + ".kz-sidebar-search input:focus{border-color:#ffca28;background:rgba(255,255,255,.12);}"
        + ".kz-sidebar-search input::-webkit-search-cancel-button{display:none;}"
        + ".kz-sidebar-search button{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:24px;height:24px;border:0;border-radius:50%;background:transparent;color:#bdbdbd;font-size:16px;line-height:1;cursor:pointer;display:none;}"
        + ".kz-sidebar-search.has-text button{display:block;}"
        + ".kz-hide{display:none!important;}"
        + ".kreezby-sidebar-group.kz-search-open>.kreezby-sidebar-sub{display:flex!important;}"
        + ".kz-search-empty{padding:12px 14px;color:#bdbdbd;font-size:13px;}"
        + "body.sidebar-collapsed .kz-sidebar-search,body.sidebar-collapsed .kz-search-empty{display:none!important;}";
      document.head.appendChild(st);
    }

    function textOf(el) { return String(el.textContent || "").toLowerCase().replace(/\s+/g, " ").trim(); }

    function labelOf(item) {
      var l = item.querySelector(".kreezby-sidebar-nav-label");
      return textOf(l || item);
    }

    function apply(aside) {
      var q = query.toLowerCase().trim();
      var items = Array.prototype.slice.call(aside.querySelectorAll("a.kreezby-sidebar-nav-item"));
      var any = false;
      items.forEach(function (a) {
        var group = a.closest(".kreezby-sidebar-group");
        var target = group || a;
        var subs = group ? Array.prototype.slice.call(group.querySelectorAll(".kreezby-sidebar-sub a")) : [];
        if (!q) {
          target.classList.remove("kz-hide", "kz-search-open");
          subs.forEach(function (x) { x.classList.remove("kz-hide"); });
          any = true;
          return;
        }
        var selfHit = labelOf(a).indexOf(q) >= 0;
        var subHit = false;
        subs.forEach(function (x) {
          var hit = selfHit || textOf(x).indexOf(q) >= 0;
          x.classList.toggle("kz-hide", !hit);
          if (hit && !selfHit) subHit = true;
        });
        var show = selfHit || subHit;
        target.classList.toggle("kz-hide", !show);
        if (group) group.classList.toggle("kz-search-open", show && subs.length > 0);
        if (show) any = true;
      });
      var empty = aside.querySelector(".kz-search-empty");
      if (q && !any) {
        if (!empty) {
          empty = document.createElement("div");
          empty.className = "kz-search-empty";
          empty.textContent = "No menu item matches.";
          aside.appendChild(empty);
        }
      } else if (empty) {
        empty.remove();
      }
    }

    function firstVisibleLink(aside) {
      var links = aside.querySelectorAll("a.kreezby-sidebar-nav-item, .kreezby-sidebar-sub a");
      for (var i = 0; i < links.length; i++) {
        var l = links[i];
        if (l.classList.contains("kz-hide") || (l.closest(".kz-hide"))) continue;
        return l;
      }
      return null;
    }

    function ensure(aside) {
      if (!aside.querySelector("a.kreezby-sidebar-nav-item")) return;
      var box = aside.querySelector(".kz-sidebar-search");
      if (box) return;
      addStyle();
      box = document.createElement("div");
      box.className = "kz-sidebar-search" + (query ? " has-text" : "");
      box.setAttribute("role", "search");
      box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
        + '<input type="search" placeholder="Search menu…" aria-label="Search menu" autocomplete="off" spellcheck="false">'
        + '<button type="button" aria-label="Clear search">×</button>';
      var input = box.querySelector("input");
      var clear = box.querySelector("button");
      input.value = query;
      input.addEventListener("input", function () {
        query = input.value;
        box.classList.toggle("has-text", !!query);
        apply(aside);
      });
      input.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          input.value = ""; query = ""; box.classList.remove("has-text"); apply(aside);
        } else if (e.key === "Enter") {
          var hit = firstVisibleLink(aside);
          if (hit && query) { e.preventDefault(); location.href = hit.getAttribute("href"); }
        }
      });
      clear.addEventListener("click", function () {
        input.value = ""; query = ""; box.classList.remove("has-text"); apply(aside); input.focus();
      });
      aside.insertBefore(box, aside.firstChild);
      if (query) apply(aside);
    }

    var watched = null;
    var observer = null;
    function watch() {
      var aside = document.querySelector(ASIDE);
      if (!aside) return;
      var hadFocus = document.activeElement && document.activeElement.closest && document.activeElement.closest(".kz-sidebar-search");
      ensure(aside);
      if (hadFocus) { var f = aside.querySelector(".kz-sidebar-search input"); if (f) f.focus(); }
      if (watched !== aside) {
        watched = aside;
        if (observer) observer.disconnect();
        observer = new MutationObserver(function () { ensure(aside); });
        observer.observe(aside, { childList: true });
      }
    }

    ["kreezby-admin-sidebar-ready", "kreezby-portal-sidebar-ready", "kreezby-staff-sidebar-ready"].forEach(function (n) {
      document.addEventListener(n, watch);
    });
    document.addEventListener("DOMContentLoaded", function () { watch(); setTimeout(watch, 400); });
    window.addEventListener("load", watch);
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      var el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el && el.isContentEditable) return;
      var input = document.querySelector(".kz-sidebar-search input");
      if (input) { e.preventDefault(); input.focus(); }
    });
  })();

  (function guardPortalSession() {
    var path = (location.pathname || "").replace(/\\/g, "/");
    var lower = path.toLowerCase();
    if (/\/auth\//.test(lower)) return;
    var portal = "";
    if (/\/head_admin\//.test(lower)) portal = "head";
    else if (/\/admin_names\//.test(lower) || /\/admin\//.test(lower)) portal = "admin";
    else if (/\/staff_names\//.test(lower) || /\/staff\//.test(lower)) portal = "staff";
    else if (/\/retailer\//.test(lower)) portal = "retailer";
    else if (/\/customer\/(checkout|inbox|profile|orders|report)/.test(lower)) portal = "customer";
    if (!portal) return;
    var session = null;
    try { session = JSON.parse(localStorage.getItem("kreezby_session") || "null"); } catch (e) { session = null; }
    var type = session && session.accountType ? String(session.accountType) : "";
    var allowed = false;
    if (portal === "head") allowed = type === "Head Administrator";
    else if (portal === "admin") allowed = type === "Administrator" || type === "Head Administrator" || type === "IT Support";
    else if (portal === "staff") allowed = type === "Staff";
    else if (portal === "retailer") allowed = type === "Retailer" || type === "Wholesaler";
    else if (portal === "customer") allowed = type === "Customer" || type === "Regular Customer";
    if (allowed && (session.identity || session.userName)) return;
    // Signed-in non-head accounts can never open the head admin portal.
    if (portal === "head" && type && type !== "Head Administrator") {
      location.replace(path.replace(/\/head_admin\/.*$/i, "/admin/admin.html"));
      return;
    }
    // Static HTML pages remain directly viewable so each portal page can be
    // inspected without being forced into the authentication folder.
    return;
  })();

  if (/\/retailer\//i.test(location.pathname || "")) {
    document.documentElement.classList.add("kreezby-retailer-account");
    function stripViewTransition(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.matches && node.matches('meta[name="view-transition"]')) node.remove();
      if (node.querySelectorAll) {
        node.querySelectorAll('meta[name="view-transition"]').forEach(function (el) { el.remove(); });
      }
    }
    stripViewTransition(document.head);
    if (window.MutationObserver && document.documentElement) {
      new MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(stripViewTransition);
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
    setTimeout(function () {
      document.documentElement.classList.add("kreezby-module-ready");
    }, 1200);
  }

  var LIVE_API = "https://particle-instructions-retailer-civil.trycloudflare.com";
  var hostName = (location.hostname || "").toLowerCase();
  // Pages opened from another local server (e.g. VS Code Live Server on :5501) have no /api,
  // so send API calls to the Kreezby server on :3000 instead.
  var LOCAL_HOST = (hostName === "localhost" || hostName === "127.0.0.1" || hostName === "[::1]");
  var OFF_SERVER = LOCAL_HOST && location.port && location.port !== "3000";
  if (OFF_SERVER) LIVE_API = "http://" + (hostName === "[::1]" ? "localhost" : hostName) + ":3000";
  if (OFF_SERVER || hostName.endsWith("github.io") || hostName.endsWith("githubusercontent.com")) {
    var nativeOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof url === "string" && url.indexOf("/api/") === 0) args[1] = LIVE_API + url;
      return nativeOpen.apply(this, args);
    };
    if (window.fetch) {
      var nativeFetch = window.fetch;
      window.fetch = function (input, init) {
        if (typeof input === "string" && input.indexOf("/api/") === 0) input = LIVE_API + input;
        return nativeFetch.call(this, input, init);
      };
    }
  }

  if (location.protocol === "file:") return;

  var LOCAL_ONLY = {
    kreezbySidebarCollapsed: 1,
    kreezby_session: 1,
    kreezbyOpenOrdersAfterCheckout: 1,
    kreezbyLatestOrderNumber: 1,
    kreezby_retailer_home: 1,
    kreezby_admin_delivery_nav_v1: 1,
    kreezby_staff_delivery_nav_v1: 1,
    kreezbyBrowserAlertSeen: 1,
    kreezbyNotifyPrompted: 1
  };

  function isShared(key) {
    return typeof key === "string" &&
      /^kreezby[A-Za-z0-9_-]{0,120}$/.test(key) &&
      !LOCAL_ONLY[key] &&
      // Permissions travel on their own fast channel (/api/permissions), not the general state.
      key !== "kreezby_staff_permissions" && key !== "kreezby_admin_permissions";
  }

  var nativeSet = Storage.prototype.setItem;
  var nativeGet = Storage.prototype.getItem;
  var nativeRemove = Storage.prototype.removeItem;
  var applyingRemote = false;
  var pending = {};
  var timer = null;
  var known = {};
  var localWriteAt = {};
  var inflight = {};

  // A key this browser changed a moment ago must never be overwritten by an older copy
  // coming back from the server (that made new stock appear and then vanish).
  function isBusy(key) {
    return pending[key] !== undefined || inflight[key] > 0 || Date.now() - (localWriteAt[key] || 0) < 8000;
  }

  function flush() {
    timer = null;
    var items = pending;
    pending = {};
    var keys = Object.keys(items);
    if (!keys.length) return;
    keys.forEach(function (key) { inflight[key] = (inflight[key] || 0) + 1; });
    function settle(ok) {
      keys.forEach(function (key) {
        setTimeout(function () { inflight[key] = Math.max(0, (inflight[key] || 1) - 1); }, ok ? 2500 : 0);
        if (!ok && pending[key] === undefined) pending[key] = items[key];
      });
      if (!ok) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(flush, 3000);
      }
    }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/state", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 20000;
      xhr.onload = function () { settle(xhr.status >= 200 && xhr.status < 300); };
      xhr.onerror = xhr.ontimeout = function () { settle(false); };
      xhr.send(JSON.stringify({ items: items }));
    } catch (e) { settle(false); }
  }

  function queue(key, value) {
    localWriteAt[key] = Date.now();
    pending[key] = value;
    if (value == null) delete known[key];
    else known[key] = 1;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 200);
  }

  var PERMISSION_KEYS = {
    kreezby_staff_permissions: 1,
    kreezby_admin_permissions: 1
  };
  var permissionStamp = 0;
  var localPermissionEditAt = 0;
  var permissionPushTimer = null;

  function permissionsFileUrl() {
    var scripts = document.getElementsByTagName("script");
    var i;
    for (i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      var at = src.indexOf("js/kreezby-db-sync.js");
      if (at !== -1) return src.slice(0, at) + "data/shared-permissions.json";
    }
    return "data/shared-permissions.json";
  }

  function applySharedPermissions(doc) {
    if (!doc || typeof doc.updatedAt !== "number") return;
    // Ignore a stale copy while our own save is still on its way to the server.
    if (Date.now() - localPermissionEditAt < 3000) return;
    if (doc.updatedAt === permissionStamp) return;
    permissionStamp = doc.updatedAt;
    applyingRemote = true;
    var changedKeys = [];
    try {
      Object.keys(PERMISSION_KEYS).forEach(function (key) {
        if (typeof doc[key] !== "string") return;
        if (nativeGet.call(localStorage, key) === doc[key]) return;
        nativeSet.call(localStorage, key, doc[key]);
        changedKeys.push(key);
      });
    } finally {
      applyingRemote = false;
    }
    if (!changedKeys.length) return;
    try {
      document.dispatchEvent(new CustomEvent("kreezby:remote-state", { detail: { keys: changedKeys } }));
      if (changedKeys.indexOf("kreezby_staff_permissions") !== -1) {
        document.dispatchEvent(new CustomEvent("kreezby-staff-permissions-ready"));
      }
      if (changedKeys.indexOf("kreezby_admin_permissions") !== -1) {
        document.dispatchEvent(new CustomEvent("kreezby-admin-permissions-ready"));
      }
    } catch (e) { /* listeners are optional */ }
  }

  function pullSharedPermissions() {
    // The server copy (MongoDB) is the shared one; the static file is only a fallback.
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/permissions?t=" + Date.now(), true);
    xhr.timeout = 8000;
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { applySharedPermissions(JSON.parse(xhr.responseText)); return; } catch (e) { /* try the file */ }
      }
      pullPermissionsFile();
    };
    xhr.onerror = pullPermissionsFile;
    xhr.ontimeout = pullPermissionsFile;
    xhr.send();
  }

  function pullPermissionsFile() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", permissionsFileUrl() + "?t=" + Date.now(), true);
    xhr.timeout = 8000;
    xhr.onload = function () {
      if (xhr.status !== 200) return;
      try { applySharedPermissions(JSON.parse(xhr.responseText)); } catch (e) { /* keep the browser copy */ }
    };
    xhr.send();
  }

  function notePermissionShare(shared) {
    document.querySelectorAll("[data-permission-status]").forEach(function (el) {
      var base = el.getAttribute("data-permission-base") || el.textContent || "";
      base = base.replace(/ Saved .*$/, "");
      el.setAttribute("data-permission-base", base);
      el.textContent = shared
        ? base + " Saved and shared with all accounts."
        : base + " Saved on this browser only. It will be shared once the server is reachable.";
    });
  }

  function publishSharedPermissions() {
    permissionPushTimer = null;
    var payload = {};
    var any = false;
    Object.keys(PERMISSION_KEYS).forEach(function (key) {
      var value = nativeGet.call(localStorage, key);
      if (value != null) {
        payload[key] = value;
        any = true;
      }
    });
    if (!any) return;
    localPermissionEditAt = Date.now();
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/permissions", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
      var shared = xhr.status === 200;
      if (shared) {
        try {
          var body = JSON.parse(xhr.responseText);
          if (body && typeof body.updatedAt === "number") permissionStamp = body.updatedAt;
        } catch (e) { permissionStamp = localPermissionEditAt; }
      }
      notePermissionShare(shared);
    };
    xhr.onerror = function () { notePermissionShare(false); };
    xhr.send(JSON.stringify(payload));
  }

  function schedulePermissionPublish(key) {
    if (!PERMISSION_KEYS[key]) return;
    // Only the head admin pages edit permissions; admin/staff browsers just receive them.
    if (!/\/head_admin\//i.test(location.pathname || "")) return;
    if (permissionPushTimer) clearTimeout(permissionPushTimer);
    permissionPushTimer = setTimeout(publishSharedPermissions, 250);
  }

  Storage.prototype.setItem = function (key, value) {
    var stored = String(value);
    nativeSet.call(this, key, stored);
    if (this === localStorage && !applyingRemote && isShared(key)) queue(key, stored);
    if (this === localStorage && !applyingRemote) schedulePermissionPublish(key);
  };

  Storage.prototype.removeItem = function (key) {
    nativeRemove.call(this, key);
    if (this === localStorage && !applyingRemote && isShared(key)) queue(key, null);
    if (this === localStorage && !applyingRemote) schedulePermissionPublish(key);
  };

  // When another account (e.g. staff) changes shared data, refresh the page the admin or
  // head admin is looking at, unless they are in the middle of typing or a dialog is open.
  var liveRefreshTimer = null;
  var lastLiveRefresh = 0;
  var SELF_HANDLED = { "kreezby-po-orders-v1": 1, "kreezby-bo-orders-v1": 1, "kreezby-return-records-v1": 1 };
  function userIsBusy() {
    var el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
    if (document.querySelector(".modal-triggered, .modal-box.active, .notification-modal-overlay.active, .system-modal-backdrop.modal-triggered")) return true;
    var sel = window.getSelection && window.getSelection();
    return !!(sel && String(sel).length > 0);
  }
  function scheduleLiveRefresh(keys) {
    if (!/\/(admin|head_admin|staff)\//i.test(location.pathname || "")) return;
    if (/\/(admin_permissions|staff-permissions|maintenance|pos-)/i.test(location.pathname || "")) return;
    var relevant = keys.filter(function (k) {
      return !SELF_HANDLED[k] && !/^(kreezbyNotifications|kreezbyBrowserAlert|kreezby_maintenance_users|kreezby_login|kreezbyCart|kreezbyCustomer)/.test(k);
    });
    if (!relevant.length) return;
    if (liveRefreshTimer) return;
    liveRefreshTimer = setTimeout(function tryRefresh() {
      if (document.hidden || userIsBusy() || Date.now() - lastLiveRefresh < 4000) {
        liveRefreshTimer = setTimeout(tryRefresh, 2000);
        return;
      }
      liveRefreshTimer = null;
      lastLiveRefresh = Date.now();
      var y = window.scrollY;
      try { sessionStorage.setItem("kreezby_live_scroll", String(y)); } catch (e) { /* ignore */ }
      location.reload();
    }, 600);
  }
  try {
    var savedScroll = sessionStorage.getItem("kreezby_live_scroll");
    if (savedScroll != null) {
      sessionStorage.removeItem("kreezby_live_scroll");
      window.addEventListener("load", function () { setTimeout(function () { window.scrollTo(0, Number(savedScroll) || 0); }, 150); });
    }
  } catch (e) { /* ignore */ }

  function applyItems(items, uploadMissing) {
    if (!items) return;
    applyingRemote = true;
    var changedKeys = [];
    try {
      Object.keys(known).forEach(function (key) {
        if (isBusy(key)) return;
        if (Object.prototype.hasOwnProperty.call(items, key)) return;
        nativeRemove.call(localStorage, key);
      });
      Object.keys(items).forEach(function (key) {
        if (!isShared(key) || isBusy(key)) return;
        var next = items[key] == null ? null : String(items[key]);
        if (nativeGet.call(localStorage, key) === next) return;
        if (next == null) nativeRemove.call(localStorage, key);
        else nativeSet.call(localStorage, key, next);
        changedKeys.push(key);
        if (key === "kreezby-po-orders-v1" || key === "kreezby-bo-orders-v1" || key === "kreezby-return-records-v1") {
          try {
            var syncName = key === "kreezby-po-orders-v1" ? "kreezby:po-orders-sync" : (key === "kreezby-bo-orders-v1" ? "kreezby:bo-orders-sync" : "kreezby:return-records-sync");
            document.dispatchEvent(new CustomEvent(syncName));
          } catch (syncError) { /* pages keep their own copy */ }
        }
      });
    } finally {
      applyingRemote = false;
    }

    if (changedKeys.length) {
      try {
        document.dispatchEvent(new CustomEvent("kreezby:remote-state", { detail: { keys: changedKeys } }));
      } catch (e) { /* listeners are optional */ }
      scheduleLiveRefresh(changedKeys);
    }

    known = {};
    Object.keys(items).forEach(function (key) {
      if (isShared(key)) known[key] = 1;
    });

    if (!uploadMissing) return;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (isShared(key) && !Object.prototype.hasOwnProperty.call(items, key)) {
        queue(key, nativeGet.call(localStorage, key));
      }
    }
  }

  var synced = false;

  function pull(uploadMissing) {
    var poll = new XMLHttpRequest();
    poll.open("GET", "/api/state", true);
    poll.timeout = 2500;
    poll.onload = function () {
      if (poll.status !== 200) return;
      try {
        applyItems(JSON.parse(poll.responseText).items, uploadMissing && !synced);
        synced = true;
      } catch (e) { /* ignore */ }
    };
    poll.send();
  }

  function applyAccountCollections(accounts) {
    if (!accounts || typeof accounts !== "object") return;
    var current = {};
    try {
      current = JSON.parse(nativeGet.call(localStorage, "kreezby_maintenance_users") || "{}");
    } catch (e) {
      current = {};
    }
    var changed = false;
    ["admins", "staff", "retailers", "customers"].forEach(function (bucket) {
      if (!Array.isArray(accounts[bucket]) || !accounts[bucket].length) return;
      if (JSON.stringify(current[bucket] || []) !== JSON.stringify(accounts[bucket])) changed = true;
      current[bucket] = accounts[bucket].map(function (row) {
        row = row || {};
        row.fromMongo = true;
        return row;
      });
    });
    if (!changed) return;
    applyingRemote = true;
    try {
      nativeSet.call(localStorage, "kreezby_maintenance_users", JSON.stringify(current));
      nativeSet.call(localStorage, "kreezby_users_seed_version", "20261002-real-accounts");
    } finally {
      applyingRemote = false;
    }
    try {
      document.dispatchEvent(new CustomEvent("kreezby:accounts-ready"));
    } catch (e2) { /* listeners are optional */ }
  }

  function pullAccountCollections() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/accounts", true);
    xhr.timeout = 4000;
    xhr.onload = function () {
      if (xhr.status !== 200) return;
      try {
        applyAccountCollections(JSON.parse(xhr.responseText).accounts);
      } catch (e) { /* keep the browser copy */ }
    };
    xhr.send();
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { pull(false); pullSharedPermissions(); }
  });
  window.addEventListener("focus", pullSharedPermissions);

  pullAccountCollections();
  pull(true);
  pullSharedPermissions();
  // Near real-time: ask the server whether anything changed every 2 seconds and only
  // download the full state when it did (full refresh every 30 seconds as a safety net).
  var lastStateVersion = null;
  var versionBroken = false;
  var lastFullPull = Date.now();
  function pollStateVersion() {
    if (document.hidden) return;
    if (versionBroken || Date.now() - lastFullPull > 30000) {
      lastFullPull = Date.now();
      pull(false);
      if (versionBroken) return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/state-version?t=" + Date.now(), true);
    xhr.timeout = 4000;
    xhr.onload = function () {
      if (xhr.status !== 200) { versionBroken = true; return; }
      try {
        var version = JSON.parse(xhr.responseText).version;
        if (version !== lastStateVersion) {
          var first = lastStateVersion === null;
          lastStateVersion = version;
          if (!first) { lastFullPull = Date.now(); pull(false); }
        }
      } catch (e) { versionBroken = true; }
    };
    xhr.send();
  }
  setInterval(pollStateVersion, 2000);
  setInterval(function () { if (!document.hidden) pullSharedPermissions(); }, 2000);
})();

(function () {
  "use strict";

  function money(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return "";
    return "₱" + number.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fillStockProducts() {
    var body = document.getElementById("stocks-table-body");
    if (!body || body.getAttribute("data-db-products") === "1") return;
    var request = new XMLHttpRequest();
    request.open("GET", "/api/records/sales_products?limit=200", true);
    request.onload = function () {
      if (request.status !== 200) return;
      var payload;
      try { payload = JSON.parse(request.responseText); } catch (e) { return; }
      var records = payload && payload.records ? payload.records : [];
      if (!records.length) return;
      var start = body.querySelectorAll("tr").length;
      records.forEach(function (product, index) {
        var cost = Number(product.Unit_Cost) || 0;
        var row = document.createElement("tr");
        row.className = "stock-row";
        row.setAttribute("data-stock-type", "finished-product");
        row.innerHTML =
          "<td>" + (start + index + 1) + "</td>" +
          "<td><strong>" + String(product.SKU || product.Product_ID || "") + "</strong></td>" +
          "<td><span class=\"stock-type-badge finished-product\">Finished Product</span></td>" +
          "<td>" + String(product.Product_Name || "") + "</td>" +
          "<td>" + String(product.Unit || product.Category || "") + "</td>" +
          "<td style=\"text-align:right;\">—</td>" +
          "<td style=\"text-align:right;\">" + money(cost) + "</td>" +
          "<td style=\"text-align:right;\">" + money(product.Standard_Price) + "</td>" +
          "<td></td>";
        body.appendChild(row);
      });
      body.setAttribute("data-db-products", "1");
    };
    request.send();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fillStockProducts);
  } else {
    fillStockProducts();
  }
})();

(function () {
  var path = location.pathname || "";
  if (!/\/(admin|staff|head_admin)\//i.test(path)) return;
  if (document.getElementById("kreezby-browser-alerts-script")) return;
  var script = document.createElement("script");
  script.id = "kreezby-browser-alerts-script";
  script.src = "../js/browser-alerts.js?v=20261020bell";
  document.head.appendChild(script);
})();
