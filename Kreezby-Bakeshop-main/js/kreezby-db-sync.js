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

  function flush() {
    timer = null;
    var items = pending;
    pending = {};
    if (!Object.keys(items).length) return;
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/state", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ items: items }));
    } catch (e) { /* pages keep working from the browser copy */ }
  }

  function queue(key, value) {
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
        ? base + " Saved for your groupmates."
        : base + " Saved on this browser. Groupmates on the GitHub link see it after this change is published to the site.";
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

  function applyItems(items, uploadMissing) {
    if (!items) return;
    applyingRemote = true;
    var changedKeys = [];
    try {
      Object.keys(known).forEach(function (key) {
        if (pending[key] !== undefined) return;
        if (Object.prototype.hasOwnProperty.call(items, key)) return;
        nativeRemove.call(localStorage, key);
      });
      Object.keys(items).forEach(function (key) {
        if (!isShared(key) || pending[key] !== undefined) return;
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
  setInterval(function () { if (!document.hidden) pull(false); }, 4000);
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
