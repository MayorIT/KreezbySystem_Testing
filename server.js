const fs = require("fs");
const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
const QRCode = require("qrcode");
require("dotenv").config();
const crypto = require("crypto");
const retailerRecords = require("./scripts/retailer-records.js");

const PORT = process.env.PORT || 3000;
const SERVERLESS = !!process.env.VERCEL;
const DB_NAME = "kreezby";
const SITE_ROOT = path.join(__dirname, "Kreezby-Bakeshop-main");
const SALES_LIST_FILE = path.join(SITE_ROOT, "data", "kreezby-sales-fake-admin.json");
const CUSTOMER_ORDERS_FILE = path.join(SITE_ROOT, "data", "customer-orders.json");
const KEY_RE = /^kreezby[A-Za-z0-9_-]{0,120}$/;
const LOCAL_ONLY = new Set([
  "kreezbySidebarCollapsed",
  "kreezby_session",
  "kreezbyOpenOrdersAfterCheckout",
  "kreezbyLatestOrderNumber",
  "kreezby_retailer_home",
  "kreezby_wholesaler_home",
  "kreezby_admin_delivery_nav_v1",
  "kreezby_staff_delivery_nav_v1",
  "kreezbyBrowserAlertSeen",
  "kreezbyNotifyPrompted",
  "kreezbyCart",
  "kreezbyCustomerProfile",
  "kreezbyDockedSidebar",
  "kreezby_admin_pos_nav_v1",
  "kreezby_staff_pos_nav_v1",
]);

function isSharedKey(key) {
  return KEY_RE.test(key) && !LOCAL_ONLY.has(key);
}

function isEphemeralKey(key) {
  // Bookkeeping that should be saved but must not make every open page re-download the state.
  return /^(kreezbyPresence_|kreezbyBrowserAlert|kreezbyBadgeSeen_|kreezbyNotificationCursor$|kreezbyAlertLastQty$|kreezby_login_history$)/.test(String(key || ""));
}

const app = express();
let stateVersion = 0;
let lastDocCount = null;
let cache = {};
let mongoReady = false;

function createMongoClient() {
  if (!process.env.MONGODB_URI) return null;
  // One local server and a few people in the shop at once, talking to a
  // 3-member Atlas set. Five warm sockets stay open so a quiet stretch does
  // not drop the link. Twenty is enough if several pages save together.
  // (5 pool + 2 monitoring) x 3 members is about 21 connections on the cluster.
  return new MongoClient(process.env.MONGODB_URI, {
    minPoolSize: SERVERLESS ? 0 : 5,
    maxPoolSize: SERVERLESS ? 5 : 20,
    maxIdleTimeMS: SERVERLESS ? 60 * 1000 : 10 * 60 * 1000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
    serverSelectionTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    // Windows Node races IPv6 and IPv4. Atlas closes the IPv6 handshake,
    // which showed up as a TLS internal error. Stay on IPv4.
    autoSelectFamily: false,
    family: 4,
  });
}

let client = createMongoClient();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetClient() {
  if (client) {
    try {
      await client.close();
    } catch (error) {
      /* The failed client may already be closed. */
    }
  }
  client = createMongoClient();
}

// One-time data reset (2026-10-23): removes the 9 demo customers (keeps Mark Cruz) and zeroes the
// demo orders, purchasing, stock and sales. Runs once per database; backup in backup_20261023_*.
// Removed in the 2026-10-23 reset. A browser tab that still holds the old data must not
// bring these back when it saves.
const RETIRED_CUSTOMER_IDS = new Set([
  "cust-maria-santos", "cust-bryle-atienza", "cust-kyla-ramos", "cust-ana-reyes", "cust-christine-bautista",
  "cust-paolo-mendoza", "cust-jericho-villanueva", "cust-angela-flores", "cust-nicole-garcia",
]);
const RETIRED_ORDER_NUMBERS = new Set(["ORD-2026-1042", "ORD-2026-1038", "ORD-2026-1021", "ORD-2026-1015", "ORD-2026-1008"]);

// Orders and receipts are records of what happened: a save never removes one. The incoming
// list is merged with the stored list (same number = the incoming version wins), so a page
// that sends an empty or outdated list cannot wipe orders.
const APPEND_ONLY_LISTS = { kreezbyOrders: "orderNumber", kreezbyCustomerReceipts: "receiptNumber", kreezbyOwnerReceipts: "receiptNumber" };

function keepStoredRecords(key, incoming) {
  const field = APPEND_ONLY_LISTS[key];
  if (!field || typeof cache[key] !== "string") return incoming;
  let next;
  let stored;
  try { next = JSON.parse(incoming); stored = JSON.parse(cache[key]); } catch (error) { return incoming; }
  if (!Array.isArray(next) || !Array.isArray(stored)) return incoming;
  // A paid order never goes back to unpaid because a page sent an older copy.
  let upgraded = false;
  if (key === "kreezbyOrders") {
    const paid = new Map();
    stored.forEach((row) => { if (row && row.paymentStatus === "paid" && row.orderNumber) paid.set(String(row.orderNumber), row); });
    next.forEach((row) => {
      const was = row && paid.get(String(row.orderNumber || ""));
      if (!was || row.paymentStatus === "paid") return;
      ["paymentStatus", "paymentVerified", "paidAt", "paymongo"].forEach((k) => { if (was[k] !== undefined) row[k] = was[k]; });
      if (row.status === "Awaiting payment" || row.status === "Payment expired") row.status = was.status;
      upgraded = true;
    });
  }
  const ids = new Set(next.map((row) => row && String(row[field] || "")).filter(Boolean));
  const missing = stored.filter((row) => {
    const id = row && String(row[field] || "");
    return id && !ids.has(id) && !RETIRED_ORDER_NUMBERS.has(String(row.orderNumber || ""));
  });
  if (!missing.length) return upgraded ? JSON.stringify(next) : incoming;
  return JSON.stringify(next.concat(missing));
}

// ---- Stock consistency -------------------------------------------------------------------
// Stock lives in a few shared JSON documents. Two people changing stock at the same moment used
// to overwrite each other (last write won). These keys are now merged three ways: what the
// browser started from (base), what it sends, and what the database holds right now. Stock
// counts are merged as differences (database + this change), so both changes count.
const STOCK_MERGE_KEYS = {
  kreezby_data_dictionary_v1: /^(product_stock|material_stock)\.[^.]+$/,
  "kreezby-stock-local-v1": /^qty\.[^.]+$/,
  kreezby_archived_stock: null,
  kreezbyStockItemValues: null,
  kreezby_stock_snapshots_v1: null,
};

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function threeWayMerge(base, inc, cur, path, numericRule) {
  if (sameJson(inc, base)) return cur;
  if (sameJson(cur, base)) return inc;
  if (isPlainObject(inc) && isPlainObject(cur)) {
    const b = isPlainObject(base) ? base : {};
    const out = {};
    const keys = new Set([...Object.keys(b), ...Object.keys(inc), ...Object.keys(cur)]);
    for (const k of keys) {
      const inHas = Object.prototype.hasOwnProperty.call(inc, k);
      const curHas = Object.prototype.hasOwnProperty.call(cur, k);
      const baseHas = Object.prototype.hasOwnProperty.call(b, k);
      if (!inHas) {
        // we removed it: honour that unless someone else changed it meanwhile
        if (curHas && !(baseHas && sameJson(cur[k], b[k]))) out[k] = cur[k];
        continue;
      }
      if (!curHas) {
        // they removed it: keep our version only if we changed it
        if (!baseHas || !sameJson(inc[k], b[k])) out[k] = inc[k];
        continue;
      }
      out[k] = threeWayMerge(baseHas ? b[k] : undefined, inc[k], cur[k], path ? path + "." + k : k, numericRule);
    }
    return out;
  }
  if (Array.isArray(inc) && Array.isArray(cur)) {
    const b = Array.isArray(base) ? base : [];
    const count = (list) => { const m = new Map(); list.forEach((x) => { const j = JSON.stringify(x); m.set(j, (m.get(j) || 0) + 1); }); return m; };
    const baseCount = count(b);
    const incCount = count(inc);
    const removed = new Map();
    const added = [];
    baseCount.forEach((n, j) => { const gone = n - (incCount.get(j) || 0); if (gone > 0) removed.set(j, gone); });
    const addSeen = new Map();
    inc.forEach((x) => {
      const j = JSON.stringify(x);
      const had = baseCount.get(j) || 0;
      const used = addSeen.get(j) || 0;
      if (used >= had) added.push(x);
      addSeen.set(j, used + 1);
    });
    const result = [];
    cur.forEach((x) => {
      const j = JSON.stringify(x);
      const gone = removed.get(j) || 0;
      if (gone > 0) { removed.set(j, gone - 1); return; }
      result.push(x);
    });
    return result.concat(added);
  }
  if (numericRule && numericRule.test(path) && typeof inc === "number" && typeof cur === "number" && typeof base === "number") {
    return Math.max(0, cur + (inc - base));
  }
  return inc;
}

// Reads the current value, merges, and writes only if nobody changed it in between (retries).
async function saveStockKey(key, incoming, baseText) {
  const col = collection();
  let base = null;
  try { base = JSON.parse(baseText); } catch (e) { base = null; }
  for (let attempt = 0; attempt < 6; attempt++) {
    const row = await col.findOne({ _id: key });
    const curText = row && typeof row.value === "string" ? row.value : null;
    let finalText = incoming;
    if (curText != null && curText !== incoming && curText !== baseText && base !== null) {
      try {
        const merged = threeWayMerge(base, JSON.parse(incoming), JSON.parse(curText), "", STOCK_MERGE_KEYS[key]);
        finalText = JSON.stringify(merged);
      } catch (e) { finalText = incoming; }
    }
    const filter = curText == null ? { _id: key } : { _id: key, value: curText };
    try {
      const result = await col.updateOne(filter, { $set: { value: finalText, updatedAt: new Date() } }, { upsert: curText == null });
      if (result.matchedCount || result.upsertedCount) { cache[key] = finalText; cacheTouched[key] = Date.now(); return finalText; }
    } catch (error) {
      if (!(error && error.code === 11000)) throw error;
    }
  }
  throw new Error("Stock changed too often at once; please retry.");
}

// Accounts deleted straight in MongoDB: a browser that still holds them must not bring them back.
let accountTombstones = {};
function accountRowKeys(row) {
  if (!row || typeof row !== "object") return [];
  return [row.id, row.user_id, row.email, row.username].map((v) => String(v == null ? "" : v).trim().toLowerCase()).filter(Boolean);
}

function dropRetired(key, stored) {
  try {
    if (key === "kreezby_maintenance_users") {
      const users = JSON.parse(stored);
      const dead = Object.keys(accountTombstones);
      if (users && dead.length) {
        let touched = false;
        for (const bucket of Object.keys(ACCOUNT_COLLECTIONS)) {
          if (!Array.isArray(users[bucket])) continue;
          const kept = users[bucket].filter((row) => !accountRowKeys(row).some((k) => accountTombstones[k]));
          if (kept.length !== users[bucket].length) { users[bucket] = kept; touched = true; }
        }
        if (touched) return dropRetired(key, JSON.stringify(users));
      }
      if (users && Array.isArray(users.customers)) {
        const kept = users.customers.filter((c) => !c || !RETIRED_CUSTOMER_IDS.has(String(c.id || c.user_id || "")));
        if (kept.length !== users.customers.length) return JSON.stringify(Object.assign({}, users, { customers: kept }));
      }
    } else if (key === "kreezbyOrders" || key === "kreezbyCustomerReceipts" || key === "kreezbyOwnerReceipts") {
      const list = JSON.parse(stored);
      if (Array.isArray(list)) {
        const kept = list.filter((o) => !o || !RETIRED_ORDER_NUMBERS.has(String(o.orderNumber || "")));
        if (kept.length !== list.length) return JSON.stringify(kept);
      }
    }
  } catch (error) {
    /* not JSON: store as sent */
  }
  return stored;
}

async function runOneTimeReset() {
  try {
    const reset = require("./scripts/reset-data.js");
    const log = (line) => console.log("[reset] " + line);
    const done = await reset.runResetOnce(client.db(DB_NAME), log);
    if (done) console.log("[reset] One-time data reset finished.");
    await reset.runAlertCleanupOnce(client.db(DB_NAME), log);
    await reset.runRestoreMarkOnce(client.db(DB_NAME), log);
  } catch (error) {
    console.error("[reset] One-time data reset failed: " + error.message);
  }
}

async function activateMongo() {
  if (!client) throw new Error("Missing MONGODB_URI in .env");
  await client.connect();
  await client.db(DB_NAME).command({ ping: 1 });
  if (!mongoReady) {
    await runOneTimeReset();
    await ensureSalesList();
    await refreshCache();
    await backfillMirrors();
    await ensureCustomerOrders();
    if (cache.kreezby_maintenance_users) {
      await syncAccountCollections(cache.kreezby_maintenance_users);
    }
    mongoReady = true;
    console.log("MongoDB connected");
  }
}

async function maintainMongo() {
  let failures = 0;
  for (;;) {
    try {
      await activateMongo();
      failures = 0;
      await sleep(15000);
    } catch (error) {
      mongoReady = false;
      failures += 1;
      const wait = Math.min(2000 * (2 ** Math.min(failures - 1, 4)), 30000);
      console.error("MongoDB unavailable. Retrying in " + Math.round(wait / 1000) + "s. " + error.message);
      await resetClient();
      await sleep(wait);
    }
  }
}

const ACCOUNT_COLLECTIONS = {
  admins: "admin_accounts",
  staff: "staff_accounts",
  retailers: "retailer_accounts",
  customers: "customer_accounts",
  wholesalers: "wholesaler_accounts",
};

const ACCOUNT_TYPES = {
  admins: "admin",
  staff: "staff",
  retailers: "retailer",
  customers: "customer",
  wholesalers: "wholesaler",
};

function collection() {
  return client.db(DB_NAME).collection("app_state");
}

function salesListCollection() {
  return client.db(DB_NAME).collection("sales_route_sheets");
}

async function ensureSalesList() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(SALES_LIST_FILE, "utf8"));
  } catch (error) {
    console.error("Sales list file unavailable. " + error.message);
    return;
  }
  const reports = Array.isArray(raw.dailyReports) ? raw.dailyReports : [];
  const ids = reports.map((report) => report && report.id ? String(report.id) : "").filter(Boolean);
  const col = salesListCollection();
  const meta = await col.findOne({ _id: "_meta" });
  if (meta && meta.reportCount === ids.length && meta.importedAt === (raw.importedAt || null)) return;

  const ops = [];
  for (const report of reports) {
    if (!report || !report.id) continue;
    const doc = { ...report, updatedAt: new Date() };
    delete doc._id;
    ops.push({
      updateOne: {
        filter: { _id: String(report.id) },
        update: { $set: doc },
        upsert: true,
      },
    });
  }
  for (let i = 0; i < ops.length; i += 400) {
    await col.bulkWrite(ops.slice(i, i + 400), { ordered: false });
  }
  await col.updateOne(
    { _id: "_meta" },
    {
      $set: {
        importedAt: raw.importedAt || null,
        dateRange: raw.dateRange || null,
        sources: raw.sources || {},
        note: raw.note || "",
        isTestData: !!raw.isTestData,
        adminOnly: !!raw.adminOnly,
        dataset: raw.dataset || "",
        reportCount: ids.length,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("Sales list stored: " + ids.length + " route sheets");
}

function customerOrderId(order) {
  return String((order && (order.orderNumber || order.Order_ID)) || "").trim();
}

function readJsonArrayFile(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not read " + path.basename(file) + ". " + error.message);
    return [];
  }
}

function readCachedCustomerOrders() {
  if (!cache.kreezbyOrders) return [];
  try {
    const parsed = JSON.parse(cache.kreezbyOrders);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function salesOrderRecord(order) {
  const items = order.items && typeof order.items === "object" ? Object.values(order.items) : [];
  const quantity = items.reduce((sum, item) => sum + (Number(item && item.qty) || 0), 0);
  const products = items.map((item) => item && item.name).filter(Boolean).join(", ");
  const customer = (order.shippingInfo && order.shippingInfo.fullName) || order.poEntity || "Customer";
  return {
    Order_ID: customerOrderId(order),
    Order_Status: order.status || "Processing",
    Customer_ID: customer,
    Product_ID: products,
    Order_Quantity: quantity,
    Order_Date: order.date ? String(order.date).slice(0, 10) : "",
    Order_Total: order.total || "",
    updatedAt: new Date(),
  };
}

async function syncCustomerOrderDocs(orders) {
  const customerCol = client.db(DB_NAME).collection("customer_orders");
  const salesCol = client.db(DB_NAME).collection("sales_orders");
  const customerOps = [];
  const salesOps = [];
  for (const order of orders) {
    const id = customerOrderId(order);
    if (!id) continue;
    const doc = { ...order, updatedAt: new Date() };
    delete doc._id;
    customerOps.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: doc },
        upsert: true,
      },
    });
    salesOps.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: salesOrderRecord(order) },
        upsert: true,
      },
    });
  }
  if (customerOps.length) await customerCol.bulkWrite(customerOps, { ordered: false });
  if (salesOps.length) await salesCol.bulkWrite(salesOps, { ordered: false });
  return customerOps.length;
}

async function ensureCustomerOrders() {
  const byId = new Map();
  for (const order of readJsonArrayFile(CUSTOMER_ORDERS_FILE)) {
    const id = customerOrderId(order);
    if (id) byId.set(id, order);
  }
  for (const order of readCachedCustomerOrders()) {
    const id = customerOrderId(order);
    if (id) byId.set(id, order);
  }
  const count = await syncCustomerOrderDocs([...byId.values()]);
  console.log("Customer orders stored: " + count);
}

async function syncAccountCollections(raw) {
  let users;
  try {
    users = JSON.parse(raw);
  } catch (error) {
    return;
  }
  if (!users || typeof users !== "object") return;

  const db = client.db(DB_NAME);
  for (const [bucket, collectionName] of Object.entries(ACCOUNT_COLLECTIONS)) {
    if (!Array.isArray(users[bucket])) continue;
    const col = db.collection(collectionName);
    const ops = [];
    for (const account of users[bucket]) {
      if (!account || typeof account !== "object") continue;
      const id = String(account.id || account.user_id || account.email || account.username || "").trim();
      if (!id) continue;
      const accountType = account.accountType === "Head Administrator"
        ? "Head Administrator"
        : ACCOUNT_TYPES[bucket];
      const doc = { ...account, id, user_id: account.user_id || id, accountType, syncedFromApp: true, updatedAt: new Date() };
      delete doc._id;
      // Keep login secrets (temporaryPassword / password). Dummy password_hash values from
      // the browser seed are not real hashes and must not overwrite a stored hash.
      if (typeof doc.password_hash === "string" && doc.password_hash.indexOf("ph_") === 0) {
        delete doc.password_hash;
      }
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: doc },
          upsert: true,
        },
      });
    }
    if (ops.length) await col.bulkWrite(ops, { ordered: false });
    // Upsert only. A browser with a partial user list must never delete accounts
    // that already live in MongoDB (including newly signed-up customers).
  }
}

function accountIdentityValues(account) {
  if (!account || typeof account !== "object") return [];
  return [account.email, account.username, account.user_id, account.id, account._id, account.contact, account.phone];
}

function sanitizeAccountInput(bucket, input) {
  const src = input && typeof input === "object" ? input : {};
  const prefix = bucket === "customers" ? "cust" : bucket.slice(0, 4);
  const id = String(src.id || src.user_id || "").trim() || (prefix + "-" + Date.now());
  const name = String(src.name || "").trim();
  const email = String(src.email || "").trim();
  // Contact number is a phone number; never copy an email into it.
  const phone = [src.phone, src.contact].map((v) => String(v || "").trim()).find((v) => v && v.indexOf("@") < 0) || "";
  const username = String(src.username || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9._]/g, "").slice(0, 30);
  const password = String(src.temporaryPassword || src.password || "").trim();
  const roles = { admins: "Admin", staff: "Staff", retailers: "Retailer", customers: "Customer", wholesalers: "Wholesaler" };
  const doc = {
    id,
    user_id: String(src.user_id || id).trim(),
    name,
    role: String(src.role || roles[bucket] || "Customer"),
    accountType: src.accountType === "Head Administrator" ? "Head Administrator" : ACCOUNT_TYPES[bucket],
    active: src.active !== false,
    joined: String(src.joined || new Date().toISOString().slice(0, 10)).slice(0, 10),
    syncedFromApp: true,
    updatedAt: new Date(),
  };
  if (email) doc.email = email;
  if (phone) {
    doc.phone = phone;
    doc.contact = phone;
  }
  if (username) doc.username = username;
  if (src.birthday) doc.birthday = String(src.birthday).slice(0, 10);
  if (src.address) doc.address = String(src.address).trim();
  if (src.area) doc.area = String(src.area).trim();
  if (password) doc.temporaryPassword = password;
  return doc;
}

async function findAccountClash(db, account, exceptId) {
  const keys = accountIdentityValues(account).map(loginKey).filter(Boolean);
  if (!keys.length) return null;
  for (const collectionName of Object.values(ACCOUNT_COLLECTIONS)) {
    const docs = await db.collection(collectionName).find({}).toArray();
    for (const row of docs) {
      if (String(row._id) === exceptId || String(row.id) === exceptId) continue;
      if (accountIdentityValues(row).some((field) => field != null && keys.includes(loginKey(field)))) {
        return row;
      }
    }
  }
  return null;
}

async function persistUsersState(users) {
  const stored = JSON.stringify(users);
  cache.kreezby_maintenance_users = stored;
  stateVersion = Date.now();
  await collection().bulkWrite([
    {
      updateOne: {
        filter: { _id: "kreezby_maintenance_users" },
        update: { $set: { value: stored, updatedAt: new Date() } },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: "state_meta" },
        update: { $set: { value: String(stateVersion) } },
        upsert: true,
      },
    },
  ], { ordered: false });
}

async function upsertAccountRecord(bucket, input) {
  const collectionName = ACCOUNT_COLLECTIONS[bucket];
  if (!collectionName) {
    return { status: 400, body: { ok: false, error: "Unknown account group." } };
  }
  const doc = sanitizeAccountInput(bucket, input);
  if (!doc.name) {
    return { status: 400, body: { ok: false, error: "Name is required." } };
  }
  if (bucket === "customers" && !doc.email && !doc.phone && !doc.username) {
    return { status: 400, body: { ok: false, error: "Email or phone is required." } };
  }
  if ((bucket === "staff" || bucket === "admins") && !doc.username) {
    return { status: 400, body: { ok: false, error: "Username is required." } };
  }
  const db = client.db(DB_NAME);
  const clash = await findAccountClash(db, doc, doc.id);
  if (clash) {
    return { status: 409, body: { ok: false, error: "An account with that email, username, or phone already exists." } };
  }
  const stored = { ...doc };
  delete stored._id;
  await db.collection(collectionName).updateOne(
    { _id: doc.id },
    { $set: stored },
    { upsert: true }
  );
  let users = {};
  try {
    users = JSON.parse(cache.kreezby_maintenance_users || "{}");
  } catch (error) {
    users = {};
  }
  if (!users || typeof users !== "object") users = {};
  if (!Array.isArray(users[bucket])) users[bucket] = [];
  const idx = users[bucket].findIndex((row) => String((row && (row.id || row.user_id)) || "") === doc.id);
  const stateRow = { ...stored };
  delete stateRow.updatedAt;
  delete stateRow.syncedFromApp;
  if (idx >= 0) users[bucket][idx] = Object.assign({}, users[bucket][idx], stateRow);
  else users[bucket].push(stateRow);
  await persistUsersState(users);
  return { status: 200, body: { ok: true, account: publicAccount({ ...stored, _id: doc.id }), bucket } };
}

// Keys this server wrote a moment ago: a refresh that raced with the write must not bring back the old value.
const cacheTouched = {};

// An account removed from its MongoDB collection (customer_accounts, staff_accounts, ...) is removed
// from the shared account list too, so it disappears from every portal.
const ACCOUNT_SEEN_DOC = "account_ids_seen";
let lastAccountReconcile = 0;
async function reconcileDeletedAccounts(force) {
  if (!mongoReady || !client) return false;
  const now = Date.now();
  if (!force && now - lastAccountReconcile < 4000) return false;
  lastAccountReconcile = now;
  const db = client.db(DB_NAME);
  const meta = db.collection("app_state");
  let seen = {};
  let deleted = {};
  try {
    const seenDoc = await meta.findOne({ _id: ACCOUNT_SEEN_DOC });
    const parsed = seenDoc && seenDoc.value ? JSON.parse(seenDoc.value) : {};
    seen = parsed.seen || {};
    deleted = parsed.deleted || {};
  } catch (error) { seen = {}; deleted = {}; }
  const present = {};
  let totalDocs = 0;
  for (const [bucket, name] of Object.entries(ACCOUNT_COLLECTIONS)) {
    const docs = await db.collection(name).find({}, { projection: { _id: 1, id: 1, user_id: 1, email: 1, username: 1 } }).toArray();
    present[bucket] = docs;
    totalDocs += docs.length;
  }
  if (!totalDocs) return false; // nothing readable: could be an outage, change nothing
  let users = null;
  try {
    const usersDoc = await meta.findOne({ _id: "kreezby_maintenance_users" });
    users = usersDoc && typeof usersDoc.value === "string" ? JSON.parse(usersDoc.value) : null;
  } catch (error) { users = null; }
  const nextSeen = {};
  let changed = false;
  for (const bucket of Object.keys(ACCOUNT_COLLECTIONS)) {
    const docs = present[bucket];
    nextSeen[bucket] = docs.map((d) => String(d._id));
    const rows = users && Array.isArray(users[bucket]) ? users[bucket] : null;
    if (!rows) continue;
    const presentKeys = new Set();
    docs.forEach((d) => accountRowKeys(d).concat([String(d._id).toLowerCase()]).forEach((k) => presentKeys.add(k)));
    const seenSet = new Set((seen[bucket] || []).map((v) => String(v).toLowerCase()));
    const gone = rows.filter((row) => {
      const keys = accountRowKeys(row);
      if (!keys.length || keys.some((k) => presentKeys.has(k))) return false;
      return row.fromMongo === true || keys.some((k) => seenSet.has(k));
    });
    if (!gone.length || gone.length > Math.max(2, rows.length * 0.5)) continue;
    users[bucket] = rows.filter((row) => gone.indexOf(row) < 0);
    gone.forEach((row) => accountRowKeys(row).forEach((k) => { deleted[k] = now; }));
    changed = true;
  }
  Object.keys(deleted).forEach((k) => { if (now - deleted[k] > 15 * 60 * 1000) delete deleted[k]; });
  accountTombstones = deleted;
  await meta.updateOne({ _id: ACCOUNT_SEEN_DOC }, { $set: { value: JSON.stringify({ seen: nextSeen, deleted }) } }, { upsert: true });
  if (changed) await persistUsersState(users);
  return changed;
}

async function refreshCache() {
  const docs = await collection().find({}).toArray();
  const next = {};
  for (const doc of docs) {
    if (typeof doc.value === "string") next[doc._id] = doc.value;
  }
  const now = Date.now();
  for (const key of Object.keys(cacheTouched)) {
    if (now - cacheTouched[key] > 5000) { delete cacheTouched[key]; continue; }
    if (typeof cache[key] === "string") next[key] = cache[key];
    else delete next[key];
  }
  cache = next;
}

app.use(express.json({
  limit: "12mb",
  // Keep the exact bytes of PayMongo webhooks: their signature is checked against the raw body.
  verify(req, res, buf) {
    if (String(req.originalUrl || "").startsWith("/api/paymongo/webhook")) req.rawBody = buf.toString("utf8");
  },
}));

// Vercel runs this file as a serverless function: connect on demand instead of the
// always-on maintainMongo() loop, and keep the shared-state cache fresh per request.
let lazyConnect = null;
let lastCacheRefresh = 0;
app.use("/api", async (req, res, next) => {
  if (!client) return next();
  if (!SERVERLESS) {
    // Always-on server: re-read MongoDB so a document deleted or edited in Atlas shows up here too.
    if (mongoReady && /^\/(state(?!-)|permissions)/.test(req.path) && Date.now() - lastCacheRefresh > 1500) {
      lastCacheRefresh = Date.now();
      try { await refreshCache(); } catch (error) { /* keep the last copy */ }
    }
    return next();
  }
  try {
    if (!mongoReady) {
      if (!lazyConnect) {
        lazyConnect = (async () => {
          await client.connect();
          await client.db(DB_NAME).command({ ping: 1 });
          await refreshCache();
          lastCacheRefresh = Date.now();
          mongoReady = true;
          Promise.resolve()
            .then(() => runOneTimeReset())
            .then(() => backfillMirrors())
            .catch((error) => console.error("MongoDB setup: " + error.message));
        })().finally(() => { lazyConnect = null; });
      }
      await lazyConnect;
    } else if (/^\/(state(?!-)|permissions)/.test(req.path) && Date.now() - lastCacheRefresh > 1500) {
      lastCacheRefresh = Date.now();
      await refreshCache();
    }
  } catch (error) {
    mongoReady = false;
    console.error("MongoDB unavailable. " + error.message);
  }
  next();
});

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kreezby-Token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

function databaseReady(res) {
  if (mongoReady) return true;
  res.status(503).json({ ok: false, error: "Database is reconnecting." });
  return false;
}

app.get("/api/health", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    await client.db(DB_NAME).command({ ping: 1 });
    let cluster = "";
    try { cluster = new URL(String(process.env.MONGODB_URI || "").replace(/^mongodb(\+srv)?:/, "http:")).hostname; } catch (e) { cluster = ""; }
    res.json({ ok: true, database: DB_NAME, cluster, records: Object.keys(cache).length });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Tiny "has anything changed?" check so browsers can poll every couple of seconds cheaply.
app.get("/api/state-version", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const row = await collection().findOne({ _id: "state_meta" });
    if (row && row.value) stateVersion = Number(row.value) || stateVersion;
    // A document added or deleted straight in MongoDB does not touch state_meta, so notice it by
    // the document count and raise the version: every open page then reloads the shared data.
    const docCount = await collection().countDocuments({ _id: { $not: { $regex: "^(kreezbyPresence_|state_meta$)" } } });
    if (lastDocCount !== null && docCount !== lastDocCount) {
      stateVersion = Date.now();
      await collection().updateOne({ _id: "state_meta" }, { $set: { value: String(stateVersion) } }, { upsert: true });
    }
    lastDocCount = docCount;
    await reconcileDeletedAccounts(false);
    if (cache.kreezby_maintenance_users) {
      const metaRow = await collection().findOne({ _id: "state_meta" });
      if (metaRow && metaRow.value) stateVersion = Number(metaRow.value) || stateVersion;
    }
  } catch (error) { /* use the last known version */ }
  res.json({ ok: true, version: Number(stateVersion) || 0 });
});

app.get("/api/state", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    await refreshCache();
    lastCacheRefresh = Date.now();
    res.json({ items: cache });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

const RECORD_COLLECTIONS = {
  sales_orders: 1,
  sales_products: 1,
  sales_procurement: 1,
};

// Route sheets hold every retailer's records, so only admins and staff may read them.
// A retailer reads its own rows from /api/retailer-records.
function staffToken(req, res) {
  const token = retailerRecords.readToken(req);
  if (!token) {
    res.status(401).json({ ok: false, needLogin: true, error: "Please log in again to see the sales list." });
    return null;
  }
  if (token.bucket !== "admins" && token.bucket !== "staff") {
    res.status(403).json({ ok: false, error: "Only admins and staff can see every route sheet." });
    return null;
  }
  return token;
}

app.get("/api/sales-list", async (req, res) => {
  if (!databaseReady(res)) return;
  if (!staffToken(req, res)) return;
  try {
    const col = salesListCollection();
    const meta = await col.findOne({ _id: "_meta" }) || {};
    const reports = await col.find({ _id: { $ne: "_meta" } }).sort({ reportDate: 1, _id: 1 }).toArray();
    await retailerRecords.tagSheets(client.db(DB_NAME), reports);
    const dailyReports = reports.map((doc) => {
      const report = { ...doc, id: doc.id || String(doc._id) };
      delete report._id;
      delete report.updatedAt;
      return report;
    });
    res.json({
      importedAt: meta.importedAt || null,
      dateRange: meta.dateRange || null,
      sources: meta.sources || {},
      note: meta.note || "",
      isTestData: !!meta.isTestData,
      adminOnly: !!meta.adminOnly,
      dataset: meta.dataset || "",
      dailyReports,
      sales: [],
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Admin / staff save a route sheet (new or edited) straight into sales_route_sheets.
app.post("/api/route-sheets", async (req, res) => {
  if (!databaseReady(res)) return;
  const token = staffToken(req, res);
  if (!token) return;
  try {
    const db = client.db(DB_NAME);
    const accounts = await db.collection("retailer_accounts").find({}, { projection: { name: 1 } }).toArray();
    const built = retailerRecords.buildRouteSheet(req.body || {}, accounts);
    if (built.error) return res.status(400).json({ ok: false, error: built.error });
    const col = salesListCollection();
    const existing = await col.findOne({ _id: built.doc.id });
    const doc = Object.assign({}, built.doc, {
      dataset: (existing && existing.dataset) || "system",
      updatedAt: new Date(),
      updatedBy: token.id,
    });
    if (!existing) doc.createdAt = new Date();
    await col.updateOne({ _id: doc.id }, { $set: doc }, { upsert: true });
    // Refresh each shop's own record in retailer_sales.
    try { await retailerRecords.syncRetailerSales(db); } catch (syncError) { console.error("retailer_sales: " + syncError.message); }
    const saved = await col.findOne({ _id: doc.id });
    await retailerRecords.tagSheets(db, [saved]);
    const report = { ...saved, id: doc.id };
    delete report._id;
    delete report.updatedAt;
    res.json({ ok: true, report });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// A retailer's own delivery & collection rows. Admins and staff may pass ?account=<id>.
// Admin / staff delete a route sheet. The deleted sheet is kept in deleted_route_sheets (so it can
// be restored by hand), and every shop's retailer_sales record is rebuilt without it.
app.post("/api/route-sheets/delete", async (req, res) => {
  if (!databaseReady(res)) return;
  const token = staffToken(req, res);
  if (!token) return;
  const id = String((req.body && req.body.id) || "").trim();
  if (!/^[A-Za-z0-9_.-]{3,80}$/.test(id) || id === "_meta") {
    res.status(400).json({ ok: false, error: "Invalid sheet id." });
    return;
  }
  try {
    const db = client.db(DB_NAME);
    const col = salesListCollection();
    const doc = await col.findOne({ _id: id });
    if (!doc) {
      res.status(404).json({ ok: false, error: "That route sheet is already gone." });
      return;
    }
    await db.collection("deleted_route_sheets").replaceOne(
      { _id: id },
      { ...doc, deletedAt: new Date(), deletedBy: token.id },
      { upsert: true },
    );
    await col.deleteOne({ _id: id });
    try { await retailerRecords.syncRetailerSales(db); } catch (syncError) { console.error("retailer_sales: " + syncError.message); }
    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Any signed-in account changes its own password. The current password is checked the same way
// the login checks it; the new one is saved on the account and in the app's shared account list.
app.post("/api/change-password", async (req, res) => {
  if (!databaseReady(res)) return;
  const token = retailerRecords.readToken(req);
  if (!token || !ACCOUNT_COLLECTIONS[token.bucket]) {
    res.status(401).json({ ok: false, needLogin: true, error: "Please log out and log in again, then change your password." });
    return;
  }
  const current = String((req.body && req.body.currentPassword) || "");
  const next = String((req.body && req.body.newPassword) || "");
  if (!current) return res.status(400).json({ ok: false, error: "Enter your current password." });
  if (next.length < 6 || next.length > 64) return res.status(400).json({ ok: false, error: "The new password must be 6 to 64 characters." });
  if (/\s/.test(next)) return res.status(400).json({ ok: false, error: "The new password cannot contain spaces." });
  if (next === current) return res.status(400).json({ ok: false, error: "The new password must be different from the current one." });
  try {
    const db = client.db(DB_NAME);
    const accounts = db.collection(ACCOUNT_COLLECTIONS[token.bucket]);
    const doc = await accounts.findOne({ _id: token.id });
    if (!doc) return res.status(404).json({ ok: false, error: "Account not found." });
    const squash = (v) => String(v == null ? "" : v).trim().toLowerCase().replace(/[\s._-]+/g, "");
    const shared = await collection().find({ _id: { $in: ["kreezbyAuthCredentials", "kreezby_maintenance_users"] } }).toArray();
    const parse = (id) => {
      const row = shared.find((d) => d._id === id);
      try { return row && typeof row.value === "string" ? JSON.parse(row.value) : null; } catch (e) { return null; }
    };
    const creds = parse("kreezbyAuthCredentials") || {};
    const users = parse("kreezby_maintenance_users") || {};
    const sameAccount = (row) => row && [row.id, row.user_id, row.username, row.email].some((v) => v != null && String(v) !== "" &&
      [doc._id, doc.id, doc.user_id, doc.username, doc.email].some((w) => w != null && loginKey(w) === loginKey(v)));
    const list = Array.isArray(users[token.bucket]) ? users[token.bucket] : [];
    const appRow = list.find(sameAccount);
    const keys = [doc.username, doc.name, doc.email, doc.id, doc._id, doc.contact].map(squash).filter(Boolean);
    const credPasswords = keys.map((k) => creds[k] && creds[k].password).filter(Boolean);
    let valid = [doc.temporaryPassword, doc.password, appRow && appRow.temporaryPassword, appRow && appRow.password]
      .concat(credPasswords).some((p) => p && String(p) === current);
    const anyStored = doc.temporaryPassword || doc.password || doc.password_hash || (appRow && (appRow.temporaryPassword || appRow.password)) || credPasswords.length;
    if (!valid && !anyStored && current === "kreezby123") valid = true;
    if (!valid && doc.password_hash) {
      try { valid = await require("bcryptjs").compare(current, String(doc.password_hash)); } catch (e) { valid = false; }
    }
    if (!valid) return res.status(403).json({ ok: false, error: "Your current password is incorrect." });

    const now = new Date();
    await accounts.updateOne({ _id: doc._id }, { $set: { temporaryPassword: next, passwordChangedAt: now, updatedAt: now }, $unset: { password: "", password_hash: "" } });
    // Keep the app's shared copies in step, so no old password keeps working anywhere.
    if (appRow) {
      appRow.temporaryPassword = next;
      delete appRow.password;
      await persistUsersState(users);
    }
    let credsChanged = false;
    keys.forEach((k) => {
      if (creds[k]) { creds[k] = Object.assign({}, creds[k], { password: next, updatedAt: now.toISOString() }); credsChanged = true; }
    });
    if (credsChanged) {
      const stored = JSON.stringify(creds);
      cache.kreezbyAuthCredentials = stored;
      await collection().updateOne({ _id: "kreezbyAuthCredentials" }, { $set: { value: stored, updatedAt: now } }, { upsert: true });
    }
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/retailer-records", async (req, res) => {
  if (!databaseReady(res)) return;
  const token = retailerRecords.readToken(req);
  if (!token) {
    res.status(401).json({ ok: false, needLogin: true, error: "Please log in again to see your records." });
    return;
  }
  let accountId = token.id;
  if (token.bucket === "admins" || token.bucket === "staff") {
    accountId = String(req.query.account || "");
  } else if (token.bucket !== "retailers") {
    res.status(403).json({ ok: false, error: "Only retailer accounts have route-sheet records." });
    return;
  }
  try {
    const db = client.db(DB_NAME);
    if (!accountId) {
      // Admin/staff without an account: list the retailer accounts and how many rows each has.
      const accounts = await db.collection("retailer_accounts").find({}, { projection: { name: 1, area: 1 } }).sort({ name: 1 }).toArray();
      const reports = await salesListCollection().find({ _id: { $ne: "_meta" }, isTestData: { $ne: true } }).toArray();
      await retailerRecords.tagSheets(db, reports);
      const counts = {};
      reports.forEach((sheet) => (sheet.entries || []).forEach((e) => { if (e.accountId) counts[e.accountId] = (counts[e.accountId] || 0) + 1; }));
      res.json({ ok: true, accounts: accounts.map((a) => ({ id: String(a._id), name: a.name || String(a._id), area: a.area || "", rows: counts[String(a._id)] || 0 })) });
      return;
    }
    const account = await db.collection("retailer_accounts").findOne({ _id: accountId }, { projection: { name: 1, area: 1 } });
    if (!account) {
      res.status(404).json({ ok: false, error: "Retailer account not found." });
      return;
    }
    const sales = await retailerRecords.recordsForAccount(db, accountId);
    res.json({ ok: true, account: { id: accountId, name: account.name || accountId, area: account.area || "" }, sales });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

function publicAccount(doc) {
  const row = { ...doc, id: doc.id || String(doc._id) };
  delete row._id;
  delete row.updatedAt;
  delete row.syncedFromApp;
  delete row.password;
  delete row.password_hash;
  return row;
}

app.get("/api/accounts", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const db = client.db(DB_NAME);
    const accounts = {};
    try { await reconcileDeletedAccounts(true); } catch (error) { console.error("Account reconcile failed: " + error.message); }
    for (const [bucket, collectionName] of Object.entries(ACCOUNT_COLLECTIONS)) {
      if (bucket === "wholesalers") continue;
      const docs = await db.collection(collectionName).find({}).toArray();
      accounts[bucket] = docs.map(publicAccount);
    }
    res.json({ ok: true, accounts });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/accounts", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const bucket = String((req.body && req.body.bucket) || "customers").trim();
    const result = await upsertAccountRecord(bucket, req.body && req.body.account);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

function loginKey(value) {
  return String(value == null ? "" : value).trim().toLowerCase();
}

app.post("/api/login", async (req, res) => {
  if (!mongoReady) {
    res.status(503).json({ ok: false, error: "Database is reconnecting." });
    return;
  }
  try {
    const identity = loginKey(req.body && req.body.identity);
    const password = String((req.body && req.body.password) || "");
    if (!identity || !password) {
      res.status(400).json({ ok: false, error: "identity and password required" });
      return;
    }
    const db = client.db(DB_NAME);
    // Same matching as the browser login: "marcela_admin", "marcela-admin" and "Marcela Admin" are one
    // account, and the shortcut names the login page accepts (e.g. "headadmin") point to their account.
    const squash = (v) => String(v == null ? "" : v).trim().toLowerCase().replace(/[\s._-]+/g, "");
    const LOGIN_SHORTCUTS = { headadmin: "admin-owner", marcelaadmin: "admin-owner", brentadmin: "admin-ops", ailoreadmin: "admin-marketing" };
    const squashed = squash(identity);
    const shortcutId = LOGIN_SHORTCUTS[squashed] || "";
    // Passwords changed in the app are kept in the shared state; the login page checks them too.
    const sharedDocs = await collection().find({ _id: { $in: ["kreezbyAuthCredentials", "kreezby_maintenance_users"] } }).toArray();
    const sharedValue = (id) => {
      const row = sharedDocs.find((d) => d._id === id);
      try { return row && typeof row.value === "string" ? JSON.parse(row.value) : null; } catch (e) { return null; }
    };
    const savedCreds = sharedValue("kreezbyAuthCredentials") || {};
    const appUsers = sharedValue("kreezby_maintenance_users") || {};
    // Staff and admins first so an internal account is never taken for a customer.
    const order = ["admins", "staff", "retailers", "customers"];
    for (const bucket of order) {
      const docs = await db.collection(ACCOUNT_COLLECTIONS[bucket]).find({}).toArray();
      const fields = (row) => [row.email, row.username, row.user_id, row.id, row._id, row.name, row.contact];
      const doc = docs.find((row) => fields(row).some((field) => field != null && loginKey(field) === identity)) ||
        docs.find((row) => shortcutId && (String(row._id) === shortcutId || String(row.id) === shortcutId)) ||
        docs.find((row) => fields(row).some((field) => field != null && squash(field) && squash(field) === squashed));
      if (!doc) continue;
      if (doc.active === false) {
        res.status(403).json({ ok: false, error: "This account is deactivated." });
        return;
      }
      let valid = false;
      const appRow = (Array.isArray(appUsers[bucket]) ? appUsers[bucket] : []).find((row) =>
        row && [row.id, row.user_id, row.username, row.email].some((v) => v != null && String(v) !== "" &&
          [doc._id, doc.id, doc.user_id, doc.username, doc.email].some((w) => w != null && loginKey(w) === loginKey(v))));
      const credPasswords = [identity, doc.username, doc.name, doc.email, doc.id].map(squash).filter(Boolean)
        .map((k) => savedCreds[k] && savedCreds[k].password).filter(Boolean);
      for (const field of [doc.temporaryPassword, doc.password, appRow && appRow.temporaryPassword, appRow && appRow.password].concat(credPasswords)) {
        if (field && String(field) === password) valid = true;
      }
      // Accounts with no stored password use the shared starter password, as the browser login does.
      const anyStored = doc.temporaryPassword || doc.password || doc.password_hash || (appRow && (appRow.temporaryPassword || appRow.password)) || credPasswords.length;
      if (!valid && !anyStored && password === "kreezby123") {
        valid = true;
      }
      if (!valid && doc.password_hash) {
        try {
          valid = await require("bcryptjs").compare(password, String(doc.password_hash));
        } catch (error) {
          valid = false;
        }
      }
      if (!valid) {
        const stored = ["temporaryPassword", "password", "password_hash"].filter((k) => doc[k]);
        res.status(401).json({ ok: false, error: "Invalid password.", stored });
        return;
      }
      const key = [doc.username, doc.user_id, doc.id, doc._id].map(loginKey).join("|");
      const isHead = /(^|\|)(marcela_admin|admin-owner)(\||$)/.test(key) ||
        (!/(^|\|)(brent_admin|admin-ops|ailore_admin|ailore)(\||$)/.test(key) && loginKey(doc.role) === "owner");
      const accountType = bucket === "admins"
        ? (isHead ? "Head Administrator" : "Administrator")
        : { staff: "Staff", retailers: "Retailer", customers: "Customer" }[bucket];
      res.json({
        ok: true,
        account: { ...publicAccount(doc), accountType },
        bucket,
        // Proves who signed in; pages send it back to read their own records.
        token: retailerRecords.issueToken(String(doc._id), bucket),
      });
      return;
    }
    res.status(404).json({ ok: false, error: "Account not found." });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Every transaction the app saves is also stored one-document-per-record in its own collection.
const { mirrorTransactions } = require("./scripts/transaction-mirror.js");

async function mirrorSaved(items) {
  try {
    await mirrorTransactions(client.db(DB_NAME), items);
  } catch (error) {
    console.error("Transaction mirror failed: " + error.message);
  }
}

// Fill the transaction collections once from what is already saved.
let mirrorBackfillStarted = false;
async function backfillMirrors() {
  if (mirrorBackfillStarted) return;
  mirrorBackfillStarted = true;
  try {
    const state = client.db(DB_NAME).collection("app_state");
    if (await state.findOne({ _id: "mirror_backfill_20261023_done" })) return;
    await mirrorTransactions(client.db(DB_NAME), Object.assign({}, cache));
    await state.updateOne({ _id: "mirror_backfill_20261023_done" }, { $set: { at: new Date() } }, { upsert: true });
    console.log("Transaction collections filled from saved data.");
  } catch (error) {
    mirrorBackfillStarted = false;
    console.error("Transaction backfill failed: " + error.message);
  }
}

function mergeByField(raw, record, field) {
  let list = [];
  try { list = JSON.parse(raw || "[]"); } catch (error) { list = []; }
  if (!Array.isArray(list)) list = [];
  const id = String(record[field] || "");
  const at = list.findIndex((row) => row && String(row[field] || "") === id);
  if (at >= 0) list[at] = Object.assign({}, list[at], record);
  else list.push(record);
  return JSON.stringify(list);
}

// Checkout posts each new order here and waits for it, so an order is in MongoDB
// (customer_orders, sales_orders, receipts and the shared order list) before the page moves on.
app.post("/api/customer-orders", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const order = req.body && req.body.order;
    const receipt = req.body && req.body.receipt;
    if (!order || typeof order !== "object" || !customerOrderId(order)) {
      res.status(400).json({ ok: false, error: "order with orderNumber required" });
      return;
    }
    const items = { kreezbyOrders: mergeByField(cache.kreezbyOrders, order, "orderNumber") };
    if (receipt && typeof receipt === "object" && receipt.receiptNumber) {
      items.kreezbyCustomerReceipts = mergeByField(cache.kreezbyCustomerReceipts, receipt, "receiptNumber");
      items.kreezbyOwnerReceipts = mergeByField(cache.kreezbyOwnerReceipts, receipt, "receiptNumber");
    }
    const now = new Date();
    const ops = Object.entries(items).map(([key, value]) => {
      cache[key] = value;
    cacheTouched[key] = Date.now();
      return { updateOne: { filter: { _id: key }, update: { $set: { value, updatedAt: now } }, upsert: true } };
    });
    stateVersion = Date.now();
    ops.push({ updateOne: { filter: { _id: "state_meta" }, update: { $set: { value: String(stateVersion) } }, upsert: true } });
    await collection().bulkWrite(ops, { ordered: false });
    await syncCustomerOrderDocs([order]);
    await mirrorSaved(items);
    res.json({ ok: true, orderNumber: customerOrderId(order) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/customer-orders", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const records = await client.db(DB_NAME).collection("customer_orders").find({ inApp: { $ne: false } }).sort({ date: -1 }).toArray();
    const orders = records.map((doc) => {
      const order = { ...doc, orderNumber: doc.orderNumber || String(doc._id) };
      delete order._id;
      delete order.updatedAt;
      return order;
    });
    res.json({ ok: true, orders });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/records/:name", async (req, res) => {
  if (!databaseReady(res)) return;
  const name = String(req.params.name || "");
  if (!RECORD_COLLECTIONS[name]) {
    res.status(404).json({ ok: false, error: "Unknown record set." });
    return;
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 80, 1), 200);
  try {
    const records = await client.db(DB_NAME).collection(name).find({}).limit(limit).toArray();
    res.json({ ok: true, records });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PERMISSION_FILE = path.join(SITE_ROOT, "data", "shared-permissions.json");
const PERMISSION_KEYS = ["kreezby_staff_permissions", "kreezby_admin_permissions"];

function readPermissionFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(PERMISSION_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : { updatedAt: 0 };
  } catch (error) {
    return { updatedAt: 0 };
  }
}

function writePermissionFile(items) {
  const current = readPermissionFile();
  const next = { updatedAt: Date.now() };
  let wrote = false;
  PERMISSION_KEYS.forEach((key) => {
    if (typeof items[key] === "string") {
      next[key] = items[key];
      wrote = true;
    } else if (typeof current[key] === "string") {
      next[key] = current[key];
    }
    if (typeof next[key] === "string") cache[key] = next[key];
  });
  if (!wrote) return null;
  try {
    fs.mkdirSync(path.dirname(PERMISSION_FILE), { recursive: true });
    fs.writeFileSync(PERMISSION_FILE, JSON.stringify(next, null, 2));
  } catch (error) {
    /* Read-only hosting (Vercel): the copy in MongoDB below is the shared one. */
  }
  return next;
}

async function storePermissionsInMongo(doc) {
  if (!mongoReady) return;
  const col = collection();
  const ops = PERMISSION_KEYS
    .filter((key) => typeof doc[key] === "string")
    .map((key) => ({
      updateOne: { filter: { _id: key }, update: { $set: { value: doc[key] } }, upsert: true },
    }));
  ops.push({
    updateOne: {
      filter: { _id: "shared_permissions_doc" },
      update: { $set: { value: JSON.stringify(doc) } },
      upsert: true,
    },
  });
  await col.bulkWrite(ops, { ordered: false });
}

async function currentPermissionDoc() {
  if (mongoReady) {
    try {
      const row = await collection().findOne({ _id: "shared_permissions_doc" });
      if (row && typeof row.value === "string") {
        const parsed = JSON.parse(row.value);
        if (parsed && typeof parsed.updatedAt === "number") return parsed;
      }
    } catch (error) { /* fall back to the file */ }
  }
  return readPermissionFile();
}

app.get("/api/permissions", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(await currentPermissionDoc());
});

app.post("/api/permissions", async (req, res) => {
  const items = req.body && typeof req.body === "object" ? req.body : {};
  const saved = writePermissionFile(items);
  if (!saved) {
    res.status(400).json({ ok: false, error: "Permission records are required." });
    return;
  }
  try {
    await storePermissionsInMongo(saved);
  } catch (error) {
    console.error("Could not store permissions in MongoDB. " + error.message);
  }
  res.json({ ok: true, updatedAt: saved.updatedAt });
});

// A paid order may be taken out of stock by whichever admin/staff page notices it first. This
// hands out exactly one claim per order, so two open pages can never deduct it twice.
app.post("/api/stock/claim-order", async (req, res) => {
  if (!databaseReady(res)) return;
  const orderNumber = String((req.body && req.body.orderNumber) || "").trim().slice(0, 80);
  if (!orderNumber) {
    res.status(400).json({ ok: false, error: "orderNumber required" });
    return;
  }
  try {
    await client.db(DB_NAME).collection("stock_deduction_claims").insertOne({ _id: orderNumber, at: new Date() });
    res.json({ ok: true, claimed: true });
  } catch (error) {
    if (error && error.code === 11000) res.json({ ok: true, claimed: false });
    else res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/state", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const items = req.body && req.body.items;
    if (!items || typeof items !== "object" || Array.isArray(items)) {
      res.status(400).json({ ok: false, error: "items object required" });
      return;
    }

    const ops = [];
    const bases = req.body && req.body.bases && typeof req.body.bases === "object" ? req.body.bases : {};
    const stockKeys = [];
    let meaningful = false;
    for (const [key, value] of Object.entries(items)) {
      if (!isSharedKey(key)) continue;
      if (Object.prototype.hasOwnProperty.call(STOCK_MERGE_KEYS, key) && value != null && typeof bases[key] === "string") {
        stockKeys.push(key);
        meaningful = true;
        continue;
      }
      if (!isEphemeralKey(key)) meaningful = true;
      else if (key.indexOf("kreezbyPresence_") === 0 && value != null) {
        // Someone signing in, going offline, or coming back: tell every page now (not every heartbeat).
        try {
          const next = JSON.parse(String(value));
          const prev = cache[key] ? JSON.parse(cache[key]) : null;
          const wasOnline = prev && !prev.offline && Date.now() - Number(prev.lastSeen || 0) < 150000;
          const isOnline = next && !next.offline;
          if (Boolean(wasOnline) !== Boolean(isOnline)) meaningful = true;
        } catch (e) { /* not JSON: ignore */ }
      }
      if (value == null) {
        ops.push({ deleteOne: { filter: { _id: key } } });
        delete cache[key];
        cacheTouched[key] = Date.now();
        continue;
      }
      const stored = keepStoredRecords(key, dropRetired(key, String(value)));
      if (stored !== String(value)) items[key] = stored;
      if (stored.length > 12 * 1024 * 1024) continue;
      ops.push({
        updateOne: {
          filter: { _id: key },
          update: { $set: { value: stored, updatedAt: new Date() } },
          upsert: true,
        },
      });
      cache[key] = stored;
      cacheTouched[key] = Date.now();
    }

    const merged = {};
    for (const key of stockKeys) {
      const sent = String(items[key]);
      const finalText = await saveStockKey(key, sent, bases[key]);
      items[key] = finalText;
      if (finalText !== sent) merged[key] = finalText;
    }
    writePermissionFile(items);
    if (ops.length || stockKeys.length) {
      if (meaningful) {
        stateVersion = Date.now();
        ops.push({
          updateOne: {
            filter: { _id: "state_meta" },
            update: { $set: { value: String(stateVersion) } },
            upsert: true,
          },
        });
      }
      await collection().bulkWrite(ops, { ordered: false });
    }
    if (typeof items.kreezby_maintenance_users === "string") {
      await syncAccountCollections(items.kreezby_maintenance_users);
    }
    if (typeof items.kreezbyOrders === "string") {
      await syncCustomerOrderDocs(readCachedCustomerOrders());
    }
    await mirrorSaved(items);
    res.json({ ok: true, merged });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const insightLastCall = new Map();

function cleanInsightText(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function insightNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 10) / 10 : null;
}

function sanitizeInsightSnapshot(input) {
  const source = input && typeof input === "object" ? input : {};
  const products = Array.isArray(source.products) ? source.products.slice(0, 12) : [];
  const materials = Array.isArray(source.materials) ? source.materials.slice(0, 8) : [];
  const alerts = Array.isArray(source.alerts) ? source.alerts.slice(0, 6) : [];
  return {
    asOf: cleanInsightText(source.asOf, 20),
    products: products.map((row) => ({
      name: cleanInsightText(row && row.name, 80),
      stock: insightNumber(row && row.stock),
      recommendedStock: insightNumber(row && row.recommendedStock),
      recentSales: insightNumber(row && row.recentSales),
    })).filter((row) => row.name),
    materials: materials.map((row) => ({
      name: cleanInsightText(row && row.name, 80),
      stock: insightNumber(row && row.stock),
      expires: cleanInsightText(row && row.expires, 20),
    })).filter((row) => row.name),
    alerts: alerts.map((item) => cleanInsightText(item, 180)).filter(Boolean),
  };
}

function insightAllowed(ip) {
  const now = Date.now();
  const last = insightLastCall.get(ip) || 0;
  if (now - last < 8000) return false;
  insightLastCall.set(ip, now);
  return true;
}

async function writeOwnerNote(apiKey, snapshot, instructions) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: instructions,
        },
        {
          role: "user",
          content: JSON.stringify(snapshot),
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("OpenAI request failed");
    error.status = response.status;
    error.code = payload && payload.error ? payload.error.code : "";
    throw error;
  }
  const text = payload && payload.choices && payload.choices[0] && payload.choices[0].message
    ? String(payload.choices[0].message.content || "").trim()
    : "";
  if (!text) {
    const error = new Error("Empty insight");
    error.status = 502;
    throw error;
  }
  return text;
}

function writeManagementInsight(apiKey, snapshot) {
  return writeOwnerNote(
    apiKey,
    snapshot,
    "Reply with JSON only, no markdown: {\"insights\":[{\"name\":\"\",\"text\":\"\"}]}. Write one object for every product. Each text is one or two short sentences for that product alone. Include that product's stock, recommended stock, and recent sales, using the exact numbers from the data. Say whether its stock is below, equal to, or above the recommended stock. Do not combine products into one summary. Do not invent products or numbers. Do not forecast. Do not use business jargon."
  );
}

function insightIncludesNumber(text, value) {
  if (value == null) return true;
  const digits = String(value).replace(/\.0$/, "");
  return new RegExp("(^|[^0-9])" + digits.replace(".", "\\.") + "([^0-9]|$)").test(String(text || ""));
}

function localInsightRows(snapshot) {
  return (snapshot.products || []).map((product) => {
    const low = Number(product.stock) <= Number(product.recommendedStock);
    const sentence = product.name + " has " + product.stock + " in stock against a recommended " + product.recommendedStock + ", with " + product.recentSales + " recent sales. "
      + (low
        ? "Stock is at or below the recommended level and needs a management review."
        : "Stock covers the recommended level.");
    return { name: product.name, text: sentence };
  });
}

function parseManagementInsights(text, snapshot) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return [];
  }
  const list = parsed && Array.isArray(parsed.insights) ? parsed.insights : [];
  const byName = new Map();
  snapshot.products.forEach((product) => byName.set(product.name.toLowerCase(), product));
  return list.map((item) => {
    const name = cleanInsightText(item && item.name, 80);
    const product = byName.get(name.toLowerCase());
    const sentence = cleanInsightText(item && item.text, 320);
    if (!product || !sentence) return null;
    if (!insightIncludesNumber(sentence, product.stock)
      || !insightIncludesNumber(sentence, product.recommendedStock)
      || !insightIncludesNumber(sentence, product.recentSales)) return null;
    return { name: product.name, text: sentence };
  }).filter(Boolean);
}

const productRecommendationLastCall = new Map();

function sanitizeProductRecommendation(input) {
  const source = input && typeof input === "object" ? input : {};
  const products = Array.isArray(source.products) ? source.products.slice(0, 12) : [];
  return {
    asOf: cleanInsightText(source.asOf, 20),
    products: products.map((row) => ({
      name: cleanInsightText(row && row.name, 80),
      finishedStock: insightNumber(row && row.finishedStock),
      pendingOrders: insightNumber(row && row.pendingOrders),
      pendingStillToCover: insightNumber(row && row.pendingStillToCover),
      suggestedBake: insightNumber(row && row.suggestedBake),
    })).filter((row) => row.name),
  };
}

function productRecommendationAllowed(ip) {
  const now = Date.now();
  const last = productRecommendationLastCall.get(ip) || 0;
  if (now - last < 8000) return false;
  productRecommendationLastCall.set(ip, now);
  return true;
}

function deterministicRecommendation(snapshot) {
  if (!snapshot.products.length) {
    return "There is not enough finished product or pending order data yet to recommend a bake.";
  }
  return snapshot.products.map((row) => {
    const bake = Number(row.suggestedBake) || 0;
    if (bake > 0) {
      return "Bake " + bake + " pouches of " + row.name + ". Finished stock is " + row.finishedStock + " and pending orders still to cover are " + (row.pendingStillToCover || 0) + ".";
    }
    return row.name + " is covered. Finished stock is " + row.finishedStock + " and no extra pouches are needed for open orders.";
  }).join(" ");
}

function recommendationMatchesSnapshot(text, snapshot) {
  const body = String(text || "").toLowerCase();
  return snapshot.products.every((row) => {
    if (body.indexOf(String(row.name || "").toLowerCase()) < 0) return false;
    const bake = Number(row.suggestedBake) || 0;
    return bake <= 0 || insightIncludesNumber(text, bake);
  });
}

function writeProductRecommendation(apiKey, snapshot) {
  return writeOwnerNote(
    apiKey,
    snapshot,
    "You write a short production recommendation for the owner of Kreezby Bakeshop, a crinkles bakery. Base it only on available finished products and pending orders. Use 4 to 6 short sentences in simple everyday language. suggestedBake is the number of pouches to bake. It is open orders not yet taken from finished stock, minus finishedStock. When suggestedBake is above 0, name the product and say to bake that many pouches. When suggestedBake is 0, say that product is covered. Mention finishedStock or pendingOrders only to explain a bake amount, and use only numbers from the data. If pendingStillToCover is 0, open orders are already taken out of finished stock, so do not add pendingOrders again. Do not forecast future demand. Do not invent figures. Do not use business jargon."
  );
}

app.post("/api/management-insight", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ ok: false, error: "Management insight is not configured." });
    return;
  }

  const snapshot = sanitizeInsightSnapshot(req.body && req.body.snapshot);
  if (!snapshot.products.length) {
    res.json({
      ok: true,
      insight: "There is not enough sales or stock data yet to summarize. Once products have stock and recent sales, this note will tell you what stands out.",
      model: OPENAI_MODEL,
    });
    return;
  }

  const ip = req.ip || "local";
  if (!insightAllowed(ip)) {
    res.status(429).json({ ok: false, error: "Please wait a few seconds before asking for another insight." });
    return;
  }

  try {
    const insight = await writeManagementInsight(apiKey, snapshot);
    const parsed = parseManagementInsights(insight, snapshot);
    const insights = parsed.length ? parsed : localInsightRows(snapshot);
    res.json({
      ok: true,
      insight: insights.map((item) => item.text).join(" "),
      insights,
      model: OPENAI_MODEL,
    });
  } catch (error) {
    const code = error && error.code;
    if (code === "credit_balance_exhausted" || code === "insufficient_quota") {
      res.status(402).json({
        ok: false,
        error: "The GPT-4o mini account has no credits left. Add credits in OpenAI billing, then refresh this note.",
      });
      return;
    }
    const status = error && error.status === 401 ? 401 : 502;
    res.status(status).json({
      ok: false,
      error: status === 401
        ? "The management insight service rejected the API key."
        : "The management insight could not be written just now.",
    });
  }
});

app.post("/api/product-recommendation", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ ok: false, error: "Production recommendation is not configured." });
    return;
  }

  const snapshot = sanitizeProductRecommendation(req.body && req.body.snapshot);
  if (!snapshot.products.length) {
    res.json({
      ok: true,
      recommendation: "There is not enough finished product or pending order data yet to recommend a bake.",
      model: OPENAI_MODEL,
    });
    return;
  }

  const ip = req.ip || "local";
  if (!productRecommendationAllowed(ip)) {
    res.status(429).json({ ok: false, error: "Please wait a few seconds before asking for another recommendation." });
    return;
  }

  try {
    const recommendation = await writeProductRecommendation(apiKey, snapshot);
    const safeRecommendation = recommendationMatchesSnapshot(recommendation, snapshot)
      ? recommendation
      : deterministicRecommendation(snapshot);
    res.json({ ok: true, recommendation: safeRecommendation, model: OPENAI_MODEL });
  } catch (error) {
    const code = error && error.code;
    if (code === "credit_balance_exhausted" || code === "insufficient_quota") {
      res.status(402).json({
        ok: false,
        error: "The GPT-4o mini account has no credits left. Add credits in OpenAI billing, then refresh this note.",
      });
      return;
    }
    const status = error && error.status === 401 ? 401 : 502;
    res.status(status).json({
      ok: false,
      error: status === 401
        ? "The production recommendation service rejected the API key."
        : "The production recommendation could not be written just now.",
    });
  }
});

const PAYMONGO_API = "https://api.paymongo.com";

function paymongoSecret() {
  return String(process.env.PAYMONGO_SECRET_KEY || "").trim();
}

function paymongoErrorMessage(payload, fallback) {
  const detail = payload && payload.errors && payload.errors[0]
    ? (payload.errors[0].detail || payload.errors[0].code)
    : "";
  return String(detail || fallback || "PayMongo request failed").slice(0, 240);
}

async function paymongoRequest(method, apiPath, body) {
  const response = await fetch(PAYMONGO_API + apiPath, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(paymongoSecret() + ":").toString("base64"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(paymongoErrorMessage(payload));
    error.status = response.status;
    throw error;
  }
  return payload;
}

function paymongoReturnUrl(req, value) {
  try {
    const url = new URL(String(value || ""));
    const host = req.get("host");
    const localPage = /^(localhost|127\.0\.0\.1)$/i.test(url.hostname);
    const localApi = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host || "");
    return (url.protocol === "http:" || url.protocol === "https:") && (url.host === host || (localPage && localApi));
  } catch (error) {
    return false;
  }
}

function allowLocalPaymongo(req, res, next) {
  const origin = String(req.get("origin") || "");
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kreezby-Token");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
}

function paymongoPublicIntent(resource) {
  const data = resource && resource.data ? resource.data : resource;
  const attributes = (data && data.attributes) || {};
  const payment = Array.isArray(attributes.payments) && attributes.payments[0]
    ? attributes.payments[0]
    : null;
  const paymentAttributes = (payment && payment.attributes) || {};
  const source = paymentAttributes.source || {};
  const lastError = attributes.last_payment_error || null;
  return {
    paymentIntentId: data && data.id ? data.id : "",
    status: attributes.status || "",
    amount: Number(attributes.amount || 0) / 100,
    currency: attributes.currency || "PHP",
    wallet: (attributes.metadata && attributes.metadata.wallet) || source.type || "",
    lastPaymentError: lastError ? String(lastError.detail || lastError.message || "Payment was not completed.").slice(0, 240) : "",
  };
}

const PAYMONGO_CHECKOUT_METHODS = {
  qrph: { type: "qrph" },
  gcash: { type: "gcash", redirect: true },
  paymaya: { type: "paymaya", redirect: true },
};

function paymongoRedirectUrl(nextAction) {
  const raw = nextAction && nextAction.redirect && nextAction.redirect.url ? String(nextAction.redirect.url) : "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const okHost = host === "paymongo.com" || host.endsWith(".paymongo.com") || host === "pm.link";
    return parsed.protocol === "https:" && okHost ? parsed.toString() : "";
  } catch (error) {
    return "";
  }
}

function paymongoQrDataUri(nextAction) {
  const code = nextAction && nextAction.code;
  const image = code && code.image_url ? String(code.image_url).replace(/\s+/g, "") : "";
  if (!/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return "";
  if (image.length < 80 || image.length > 2 * 1024 * 1024) return "";
  return image;
}

function paymongoTestUrl(nextAction) {
  const code = nextAction && nextAction.code;
  const raw = code && code.test_url ? String(code.test_url) : "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:" || (host !== "paymongo.com" && !host.endsWith(".paymongo.com"))) return "";
    return parsed.toString();
  } catch (error) {
    return "";
  }
}

async function scannableQr(text) {
  const value = String(text || "").trim();
  if (!value || value.length > 2000) return "";
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: 360,
    color: { dark: "#111111", light: "#ffffff" },
  });
}

app.use("/api/paymongo", allowLocalPaymongo);

app.post("/api/paymongo/e-wallet", async (req, res) => {
  if (!/^sk_(test|live)_/.test(paymongoSecret())) {
    res.status(503).json({
      ok: false,
      error: "PayMongo is not configured. In the PayMongo dashboard, switch to test mode, open Settings, then Developers, and set PAYMONGO_SECRET_KEY.",
    });
    return;
  }

  const body = req.body || {};
  const requested = String(body.wallet || "qrph");
  const methodInfo = PAYMONGO_CHECKOUT_METHODS[requested];
  const wallet = methodInfo ? requested : "";
  const amount = Number(body.amount);
  const centavos = Math.round(amount * 100);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const audience = body.audience === "wholesaler" ? "wholesaler" : (body.audience === "customer" ? "customer" : "");
  if (!wallet || !audience || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, error: "Enter the payer name and email before paying with QR Ph." });
    return;
  }
  if (!Number.isFinite(amount) || centavos < 2000 || centavos > 100000000) {
    res.status(400).json({ ok: false, error: "PayMongo accepts payments from ₱20.00 up to ₱1,000,000.00." });
    return;
  }
  if (!paymongoReturnUrl(req, body.returnUrl)) {
    res.status(400).json({ ok: false, error: "PayMongo could not return to this page." });
    return;
  }

  try {
    // GCash / Maya: send the customer straight into the app (or the wallet's sign-in page).
    if (methodInfo.redirect) {
      const walletIntent = await paymongoRequest("POST", "/v1/payment_intents", {
        data: {
          attributes: {
            amount: centavos,
            payment_method_allowed: [methodInfo.type],
            currency: "PHP",
            capture_type: "automatic",
            description: String(body.description || "Kreezby Bakeshop order").slice(0, 255),
            statement_descriptor: "KREEZBY",
            metadata: { reference: String(body.reference || "").slice(0, 80), audience, wallet },
          },
        },
      });
      const walletMethod = await paymongoRequest("POST", "/v1/payment_methods", {
        data: {
          attributes: {
            type: methodInfo.type,
            billing: Object.assign({ name: name.slice(0, 80), email }, phone ? { phone: phone.slice(0, 20) } : {}),
          },
        },
      });
      const walletAttached = await paymongoRequest("POST", "/v1/payment_intents/" + walletIntent.data.id + "/attach", {
        data: { attributes: { payment_method: walletMethod.data.id, return_url: String(body.returnUrl) } },
      });
      const walletAttributes = walletAttached.data.attributes || {};
      const redirectUrl = paymongoRedirectUrl(walletAttributes.next_action);
      if (!redirectUrl) {
        res.status(502).json({ ok: false, error: "PayMongo did not return a link to the app." });
        return;
      }
      res.json({
        ok: true,
        paymentIntentId: walletAttached.data.id,
        status: walletAttributes.status || "",
        redirectUrl,
        wallet,
      });
      return;
    }

    // QR Ph payment-intent flow (test and live):
    //   1. create a Payment Intent with "qrph" allowed, 2. create a qrph Payment Method,
    //   3. attach it; the response's next_action.code.image_url is the QR Ph image.
    // Live mode shows that real QR Ph image, which GCash, Maya and bank apps can scan.
    // Test mode shows a QR of PayMongo's test page instead (open it with the phone camera
    // and choose "Authorize"), because test QR Ph codes cannot be paid in real apps.
    // PayMongo sends payment.paid to the webhook once the payment goes through.
    const isTestKey = /^sk_test_/.test(paymongoSecret());
    {
      const intent = await paymongoRequest("POST", "/v1/payment_intents", {
        data: {
          attributes: {
            amount: centavos,
            payment_method_allowed: [methodInfo.type],
            currency: "PHP",
            capture_type: "automatic",
            description: String(body.description || "Kreezby Bakeshop order").slice(0, 255),
            statement_descriptor: "KREEZBY",
            metadata: { reference: String(body.reference || "").slice(0, 80), audience, wallet },
          },
        },
      });
      const method = await paymongoRequest("POST", "/v1/payment_methods", {
        data: {
          attributes: {
            type: methodInfo.type,
            billing: Object.assign({ name: name.slice(0, 80), email }, phone ? { phone: phone.slice(0, 20) } : {}),
          },
        },
      });
      const attachedIntent = await paymongoRequest("POST", "/v1/payment_intents/" + intent.data.id + "/attach", {
        data: { attributes: { payment_method: method.data.id, return_url: String(body.returnUrl) } },
      });
      const intentAttributes = attachedIntent.data.attributes || {};
      const realQr = paymongoQrDataUri(intentAttributes.next_action);
      const intentTestUrl = isTestKey ? paymongoTestUrl(intentAttributes.next_action) : "";
      const intentQr = isTestKey
        ? ((intentTestUrl ? await scannableQr(intentTestUrl) : "") || realQr)
        : realQr;
      if (intentQr) {
        res.json({
          ok: true,
          paymentIntentId: attachedIntent.data.id,
          status: intentAttributes.status || "",
          qrImage: intentQr,
          testUrl: intentTestUrl,
          wallet,
        });
        return;
      }
      if (isTestKey) {
        res.status(502).json({ ok: false, error: "PayMongo did not return a QR Ph code." });
        return;
      }
      // Live mode with no QR image returned: fall back to PayMongo's hosted checkout below.
    }

    // Live mode: hosted PayMongo Checkout: a normal https page that opens from any phone camera,
    // where the customer picks QR Ph / GCash / Maya and pays.
    const referenceText = String(body.reference || "").slice(0, 80);
    const buildSession = (methods) => ({
      data: {
        attributes: {
          billing: Object.assign({ name: name.slice(0, 80), email }, phone ? { phone: phone.slice(0, 20) } : {}),
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          description: String(body.description || "Kreezby Bakeshop order").slice(0, 255),
          line_items: [{
            currency: "PHP",
            amount: centavos,
            name: "Kreezby Bakeshop order",
            quantity: 1,
          }],
          payment_method_types: methods,
          reference_number: referenceText || undefined,
          success_url: String(body.returnUrl),
          cancel_url: String(body.returnUrl),
          metadata: { reference: referenceText, audience, wallet },
        },
      },
    });
    let session;
    try {
      session = await paymongoRequest("POST", "/v1/checkout_sessions", buildSession(["qrph", "gcash", "paymaya"]));
    } catch (error) {
      // A method that is not switched on for the account is rejected: retry with QR Ph only.
      if (!error.status || error.status >= 500) throw error;
      session = await paymongoRequest("POST", "/v1/checkout_sessions", buildSession(["qrph"]));
    }
    const attributes = (session.data && session.data.attributes) || {};
    const checkoutUrl = paymongoTestUrl({ code: { test_url: attributes.checkout_url } });
    if (!checkoutUrl) {
      res.status(502).json({ ok: false, error: "PayMongo did not return a payment page." });
      return;
    }
    const intentOf = (attrs) => {
      const ref = attrs && attrs.payment_intent;
      return ref && typeof ref === "object" ? String(ref.id || "") : String(ref || "");
    };
    let intentId = intentOf(attributes);
    if (!/^pi_/.test(intentId)) {
      const again = await paymongoRequest("GET", "/v1/checkout_sessions/" + session.data.id);
      intentId = intentOf(again.data && again.data.attributes);
    }
    if (!/^pi_[A-Za-z0-9]+$/.test(intentId)) {
      res.status(502).json({ ok: false, error: "PayMongo did not return a payment reference." });
      return;
    }
    const qrImage = await scannableQr(checkoutUrl);
    const testUrl = checkoutUrl;
    const attached = { data: { id: intentId } };
    res.json({
      ok: true,
      paymentIntentId: attached.data.id,
      status: "awaiting_payment",
      qrImage,
      testUrl,
      wallet,
    });
  } catch (error) {
    res.status(error.status && error.status < 500 ? error.status : 502).json({
      ok: false,
      error: error.message || "PayMongo could not start the payment.",
    });
  }
});

app.get("/api/paymongo/payment-intents/:id", async (req, res) => {
  if (!/^sk_(test|live)_/.test(paymongoSecret())) {
    res.status(503).json({ ok: false, error: "PayMongo is not configured." });
    return;
  }
  if (!/^pi_[A-Za-z0-9]+$/.test(req.params.id || "")) {
    res.status(400).json({ ok: false, error: "Unknown PayMongo payment." });
    return;
  }
  try {
    const intent = await paymongoRequest("GET", "/v1/payment_intents/" + req.params.id);
    const info = paymongoPublicIntent(intent);
    // The status check also settles a waiting order, in case the webhook is not set up.
    if (info.status === "succeeded") {
      try { await settleQrOrder(info.paymentIntentId, "paid", { amount: info.amount }); } catch (error) { /* the page still updates */ }
    }
    res.json(Object.assign({ ok: true }, info));
  } catch (error) {
    res.status(error.status && error.status < 500 ? error.status : 502).json({
      ok: false,
      error: error.message || "PayMongo could not be checked.",
    });
  }
});

// PayMongo webhook: https://<site>/api/paymongo/webhook
// Needs PAYMONGO_WEBHOOK_SECRET (the whsk_... secret of the webhook in the PayMongo dashboard).
// Marks a waiting QR Ph order paid (or expired) on the server, so it updates even if the
// customer never returns to the checkout page after paying in GCash.
async function settleQrOrder(paymentIntentId, outcome, details) {
  if (!mongoReady || !paymentIntentId || typeof cache.kreezbyOrders !== "string") return null;
  let orders;
  try { orders = JSON.parse(cache.kreezbyOrders); } catch (error) { return null; }
  if (!Array.isArray(orders)) return null;
  const order = orders.find((o) => o && o.paymongo && o.paymongo.paymentIntentId === paymentIntentId);
  if (!order || order.paymentStatus === "paid") return order || null;
  if (order.status === "Cancelled") return order; // customer cancelled: never flip it back to paid
  const now = new Date();
  if (outcome === "paid") {
    order.paymentStatus = "paid";
    order.paymentVerified = true;
    if (order.status === "Awaiting payment") order.status = "Processing";
    order.paidAt = order.paidAt || now.toISOString();
    order.paymongo = Object.assign({}, order.paymongo, details || {}, { status: "succeeded" });
    delete order.paymongo.qrImage;
  } else if (outcome === "expired") {
    if (order.paymentStatus !== "awaiting_payment") return order;
    order.paymentStatus = "expired";
    order.status = "Payment expired";
    order.paymongo = Object.assign({}, order.paymongo, { status: "expired" });
  } else {
    return order;
  }
  const items = { kreezbyOrders: JSON.stringify(orders) };
  ["kreezbyCustomerReceipts", "kreezbyOwnerReceipts"].forEach((key) => {
    if (typeof cache[key] !== "string") return;
    try {
      const list = JSON.parse(cache[key]);
      if (!Array.isArray(list)) return;
      let touched = false;
      list.forEach((r) => {
        if (r && r.orderNumber === order.orderNumber) {
          r.paymentStatus = outcome === "paid" ? "Paid" : "Payment expired";
          touched = true;
        }
      });
      if (touched) items[key] = JSON.stringify(list);
    } catch (error) { /* leave receipts as they are */ }
  });
  if (outcome === "paid") {
    try {
      const notes = JSON.parse(cache.kreezbyNotifications || "[]");
      if (Array.isArray(notes) && !notes.some((n) => n && n.id === "n-paid-" + order.orderNumber)) {
        notes.unshift({
          id: "n-paid-" + order.orderNumber,
          title: "Payment Received",
          description: "QR Ph payment received for order " + order.orderNumber + " (" + order.total + ").",
          timestamp: now.toISOString(),
          read: false,
          source: "payment",
        });
        items.kreezbyNotifications = JSON.stringify(notes);
      }
    } catch (error) { /* notification is optional */ }
  }
  const ops = Object.entries(items).map(([key, value]) => {
    cache[key] = value;
    cacheTouched[key] = Date.now();
    return { updateOne: { filter: { _id: key }, update: { $set: { value, updatedAt: now } }, upsert: true } };
  });
  stateVersion = Date.now();
  ops.push({ updateOne: { filter: { _id: "state_meta" }, update: { $set: { value: String(stateVersion) } }, upsert: true } });
  await collection().bulkWrite(ops, { ordered: false });
  await syncCustomerOrderDocs([order]);
  await mirrorSaved(items);
  console.log("QR order " + order.orderNumber + " marked " + outcome);
  return order;
}

app.post("/api/paymongo/webhook", async (req, res) => {
  const secret = String(process.env.PAYMONGO_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("PayMongo webhook: PAYMONGO_WEBHOOK_SECRET is not set");
    res.status(500).json({ ok: false, error: "Webhook not configured" });
    return;
  }
  const rawBody = typeof req.rawBody === "string" ? req.rawBody : "";
  const parts = {};
  String(req.get("paymongo-signature") || "").split(",").forEach((piece) => {
    const i = piece.indexOf("=");
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  });
  const attrs = (req.body && req.body.data && req.body.data.attributes) || {};
  const given = attrs.livemode === true ? parts.li : parts.te;
  const expected = crypto.createHmac("sha256", secret).update(String(parts.t || "") + "." + rawBody).digest("hex");
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  const valid = rawBody && parts.t && given && given.length === expected.length && Number.isFinite(age) && age <= 300
    && crypto.timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
  if (!valid) {
    res.status(401).json({ ok: false, error: "Invalid signature" });
    return;
  }
  const resource = attrs.data || {};
  const resourceAttrs = resource.attributes || {};
  // payment.paid / checkout_session.payment.paid confirm the QR Ph payment. The checkout page
  // also polls /api/paymongo/payment-intents/:id and places the order once it reads "succeeded".
  console.log("PayMongo webhook:", attrs.type, resource.id || "", resourceAttrs.payment_intent_id || "",
    resourceAttrs.amount != null ? Number(resourceAttrs.amount) / 100 : "");
  try {
    const intentId = String(resourceAttrs.payment_intent_id || (resource.id && String(resource.id).indexOf("pi_") === 0 ? resource.id : "") || "");
    if (attrs.type === "payment.paid" || attrs.type === "checkout_session.payment.paid") {
      await settleQrOrder(intentId, "paid", { paymentId: resource.id || "", amount: resourceAttrs.amount != null ? Number(resourceAttrs.amount) / 100 : undefined });
    } else if (attrs.type === "qrph.expired" || attrs.type === "payment.failed") {
      await settleQrOrder(intentId, attrs.type === "qrph.expired" ? "expired" : "failed");
    }
  } catch (error) {
    console.error("Webhook could not update the order: " + error.message);
  }
  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.redirect("/auth/start.html");
});

const staticOptions = {
  setHeaders(res, filePath) {
    // Always revalidate code files so edits show up without a hard refresh.
    if (/\.(html|js|css)$/i.test(filePath)) res.setHeader("Cache-Control", "no-cache");
  },
};
app.use(express.static(SITE_ROOT, staticOptions));
// Vercel (vercel.json rewrites, old links, the root index.html) may ask for the same files
// under /Kreezby-Bakeshop-main/... — serve them there too instead of "Cannot GET".
app.use("/Kreezby-Bakeshop-main", express.static(SITE_ROOT, staticOptions));

function listenOn(host) {
  const server = app.listen(PORT, host);
  server.on("listening", () => {
    console.log("Kreezby server on http://" + (host === "::1" ? "localhost" : host) + ":" + PORT);
  });
  server.on("error", (error) => {
    if (host === "::1") {
      console.error("IPv6 localhost skipped: " + error.message);
      return;
    }
    console.error(error);
    process.exit(1);
  });
}

async function main() {
  listenOn("127.0.0.1");
  listenOn("::1");
  console.log("Open http://localhost:" + PORT + "/auth/start.html");
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in .env. The site is still available. Shared shop data stays in this browser.");
    return;
  }
  await maintainMongo();
}

if (require.main === module && !SERVERLESS) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = app;
