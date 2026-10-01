/**
 * Loads shared shop data from the Kreezby server (Atlas) before other scripts run,
 * then mirrors later localStorage writes back to the database.
 * Login session and sidebar layout stay on this browser only.
 */
(function () {
  "use strict";

  if (location.protocol === "file:") return;

  var LOCAL_ONLY = {
    kreezbySidebarCollapsed: 1,
    kreezby_session: 1,
    kreezbyOpenOrdersAfterCheckout: 1,
    kreezbyLatestOrderNumber: 1,
    kreezby_retailer_home: 1,
    kreezby_wholesaler_home: 1,
    kreezby_admin_delivery_nav_v1: 1,
    kreezby_staff_delivery_nav_v1: 1
  };

  function isShared(key) {
    return typeof key === "string" &&
      /^kreezby[A-Za-z0-9_-]{0,120}$/.test(key) &&
      !LOCAL_ONLY[key];
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

  Storage.prototype.setItem = function (key, value) {
    var stored = String(value);
    nativeSet.call(this, key, stored);
    if (this === localStorage && !applyingRemote && isShared(key)) queue(key, stored);
  };

  Storage.prototype.removeItem = function (key) {
    nativeRemove.call(this, key);
    if (this === localStorage && !applyingRemote && isShared(key)) queue(key, null);
  };

  function applyItems(items, uploadMissing) {
    if (!items) return;
    applyingRemote = true;
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
      });
    } finally {
      applyingRemote = false;
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

  var initial = null;
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/state", false);
    xhr.send();
    if (xhr.status === 200) initial = JSON.parse(xhr.responseText);
  } catch (e) {
    initial = null;
  }

  if (!initial || !initial.items) return;
  applyItems(initial.items, true);

  setInterval(function () {
    var poll = new XMLHttpRequest();
    poll.open("GET", "/api/state", true);
    poll.onload = function () {
      if (poll.status !== 200) return;
      try { applyItems(JSON.parse(poll.responseText).items, false); } catch (e) { /* ignore */ }
    };
    poll.send();
  }, 4000);
})();
