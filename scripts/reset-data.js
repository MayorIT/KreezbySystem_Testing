#!/usr/bin/env node
/**
 * One-time data reset for the Kreezby MongoDB database.
 *
 *   node scripts/reset-data.js            -> dry run: saves a backup and prints what would change
 *   node scripts/reset-data.js --apply    -> saves a backup, then makes the changes
 *   node scripts/reset-data.js --restore backups/<file>.json   -> puts a backup back
 *
 * The server (server.js) also runs this reset once by itself after deploy, with its backup
 * stored in MongoDB collections named backup_20261023_*.
 *
 * What it does:
 *   - Removes every customer account except Mark Anthony Cruz (cust-mark-cruz).
 *   - Keeps Mark's orders, receipts and the purchase-order entry for his order.
 *   - Clears all other orders, receipts and notifications.
 *   - Clears purchasing: purchase orders, goods receipts, back orders, returns, procurement records.
 *   - Sets every stock count to 0 and clears stock alerts and stock movements.
 *   - Clears the sales history (route sheets) and recorded sales.
 *   - Removes the deleted customers' login history.
 *   - Does NOT touch head admin, admin, staff or retailer accounts, or permissions.
 *
 * Needs MONGODB_URI (in .env or the environment), the same value Vercel uses.
 * Close every open tab of the site before running --apply, so no tab saves old data back.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const DB_NAME = "kreezby";
const KEEP_CUSTOMER_ID = "cust-mark-cruz";
const KEEP_NAME_RE = /\bmark\b.*\bcruz\b/i;
const SALES_META = {
  importedAt: "2026-10-23T00:00:00.000Z",
  dateRange: null,
  sources: {},
  note: "Sales history cleared on 2026-10-23. New sales are added as they happen.",
  isTestData: false,
  adminOnly: true,
  dataset: "",
  reportCount: 0,
};
const SEED_VERSION = "20261023clean";

function parse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    const value = JSON.parse(raw);
    return value == null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function isKeptCustomer(account) {
  if (!account) return false;
  return String(account.id || account.user_id || "") === KEEP_CUSTOMER_ID;
}

function isMarkOrder(order) {
  if (!order) return false;
  if (String(order.customerId || order.accountId || "") === KEEP_CUSTOMER_ID) return true;
  const names = [
    order.shippingInfo && order.shippingInfo.fullName,
    order.poEntity,
    order.accountName,
    order.customerName,
  ];
  return names.some((name) => KEEP_NAME_RE.test(String(name || "")));
}

function zeroMap(map) {
  const out = {};
  Object.keys(map || {}).forEach((key) => { out[key] = 0; });
  return out;
}

/**
 * Pure planning step: given the current app_state values (strings) and account lists,
 * returns the new app_state values plus the ids to delete in each collection.
 */
function planState(items, extra) {
  const changes = {};
  const report = [];
  const set = (key, value, note) => {
    const next = typeof value === "string" ? value : JSON.stringify(value);
    if (items[key] === next) return;
    changes[key] = next;
    report.push(key + ": " + note);
  };

  // Accounts: only the customers bucket changes.
  const users = parse(items.kreezby_maintenance_users, null);
  const removedCustomers = [];
  if (users && Array.isArray(users.customers)) {
    const kept = users.customers.filter(isKeptCustomer);
    users.customers.forEach((c) => { if (!isKeptCustomer(c)) removedCustomers.push(c); });
    if (removedCustomers.length) {
      set("kreezby_maintenance_users", Object.assign({}, users, { customers: kept }),
        "remove " + removedCustomers.length + " customers (" + removedCustomers.map((c) => c.name).join(", ") + "); keep " + kept.map((c) => c.name).join(", "));
    }
  }
  (extra.customerAccounts || []).forEach((doc) => {
    if (!isKeptCustomer(doc) && !removedCustomers.some((c) => String(c.id) === String(doc.id || doc._id))) removedCustomers.push(doc);
  });

  const removedKeys = new Set();
  removedCustomers.forEach((c) => {
    [c.id, c.user_id, c.username, c.email, c.name, c.phone].forEach((v) => {
      if (v) removedKeys.add(String(v).trim().toLowerCase());
    });
  });

  // Login history of removed customers.
  const history = parse(items.kreezby_login_history, null);
  if (Array.isArray(history)) {
    const keptHistory = history.filter((row) => {
      const values = [row && row.identity, row && row.userName, row && row.email, row && row.username];
      return !values.some((v) => v && removedKeys.has(String(v).trim().toLowerCase()));
    });
    if (keptHistory.length !== history.length) {
      set("kreezby_login_history", keptHistory, "remove " + (history.length - keptHistory.length) + " login entries of removed customers");
    }
  }

  // Orders: keep Mark's.
  const orders = parse(items.kreezbyOrders, []);
  const markOrders = Array.isArray(orders) ? orders.filter(isMarkOrder) : [];
  const markOrderNumbers = new Set(markOrders.map((o) => String(o.orderNumber || "")).filter(Boolean));
  const markPoCodes = new Set();
  markOrders.forEach((o) => {
    if (o.poCode) markPoCodes.add(String(o.poCode));
    if (o.orderNumber) markPoCodes.add(String(o.orderNumber));
  });
  if (Array.isArray(orders)) {
    set("kreezbyOrders", markOrders, "keep " + markOrders.length + " of " + orders.length + " orders (" + [...markOrderNumbers].join(", ") + ")");
  }

  ["kreezbyCustomerReceipts", "kreezbyOwnerReceipts"].forEach((key) => {
    const list = parse(items[key], null);
    if (!Array.isArray(list)) return;
    const kept = list.filter((r) => r && (markOrderNumbers.has(String(r.orderNumber || "")) || KEEP_NAME_RE.test(String(r.customerName || ""))));
    set(key, kept, "keep " + kept.length + " of " + list.length + " receipts");
  });

  const notifications = parse(items.kreezbyNotifications, null);
  if (Array.isArray(notifications)) {
    const kept = notifications.filter((n) => {
      const text = JSON.stringify(n || {});
      return [...markOrderNumbers].some((num) => text.indexOf(num) >= 0);
    });
    set("kreezbyNotifications", kept, "keep " + kept.length + " of " + notifications.length + " notifications (only ones about Mark's orders)");
  }

  // Purchasing.
  const keepEntry = (key, entry) => {
    if (markPoCodes.has(String(key))) return true;
    if (!entry || typeof entry !== "object") return false;
    return [entry.code, entry.poCode, entry.poOrigin, entry.orderNumber].some((v) => v && markPoCodes.has(String(v)));
  };
  ["kreezby-po-orders-v1", "kreezby-recv-receipts-v1", "kreezby-bo-orders-v1", "kreezby-return-records-v1"].forEach((key) => {
    if (items[key] == null) return;
    const map = parse(items[key], {});
    const kept = {};
    Object.keys(map || {}).forEach((k) => { if (keepEntry(k, map[k])) kept[k] = map[k]; });
    set(key, kept, "keep " + Object.keys(kept).length + " of " + Object.keys(map || {}).length + " records" + (Object.keys(kept).length ? " (" + Object.keys(kept).join(", ") + ")" : ""));
  });

  // Stock & alerts.
  if (items.kreezbyAlertActive != null) set("kreezbyAlertActive", {}, "clear active stock alerts");
  const dict = parse(items.kreezby_data_dictionary_v1, null);
  if (dict && typeof dict === "object") {
    const next = Object.assign({}, dict);
    next.product_stock = zeroMap(dict.product_stock);
    next.material_stock = zeroMap(dict.material_stock);
    next.sales_transactions_extra = [];
    next.inventory_transactions_extra = [];
    next.partner_alerts = [];
    next.alert_status = {};
    if (Array.isArray(dict.sales_transactions)) next.sales_transactions = [];
    if (Array.isArray(dict.inventory_transactions)) next.inventory_transactions = [];
    if (Array.isArray(dict.alerts)) next.alerts = [];
    if (Array.isArray(dict.raw_materials)) next.raw_materials = dict.raw_materials.map((m) => Object.assign({}, m, { current_stock: 0 }));
    if (Array.isArray(dict.materials_extra)) next.materials_extra = dict.materials_extra.map((m) => Object.assign({}, m, { current_stock: 0 }));
    if (Array.isArray(dict.procurement_recommendations)) {
      next.procurement_recommendations = dict.procurement_recommendations.map((r) => Object.assign({}, r, {
        current_stock: 0,
        shortage: Number(r.recommended_quantity) || 0,
      }));
    }
    if (Array.isArray(dict.orders)) next.orders = dict.orders.filter((o) => o && markPoCodes.has(String(o.order_id || "")));
    if (Array.isArray(dict.users)) {
      next.users = dict.users.filter((u) => {
        const values = [u && u.user_id, u && u.id, u && u.email, u && u.username, u && u.name];
        return !values.some((v) => v && removedKeys.has(String(v).trim().toLowerCase()));
      });
    }
    if (Array.isArray(dict.audit_logs)) {
      next.audit_logs = dict.audit_logs.filter((l) => !(l && l.user_id && removedKeys.has(String(l.user_id).trim().toLowerCase())));
    }
    set("kreezby_data_dictionary_v1", next, "stock counts to 0; clear sales, stock movements and alerts");
  }

  // Sales overrides kept in the browser state, if any.
  if (items["kreezby-sales-overrides"] != null) set("kreezby-sales-overrides", {}, "clear sales overrides");

  // Seed version: browsers pick this up from the database and skip the old demo seed.
  set("kreezbyPortalSeedVersion", SEED_VERSION, "seed version " + SEED_VERSION);

  return { changes, report, removedCustomers, markOrderNumbers: [...markOrderNumbers] };
}

const RESET_FLAG_ID = "reset_20261023_done";
const RESET_LOCK_ID = "reset_20261023_lock";
const RESET_COLLECTIONS = ["app_state", "customer_accounts", "customer_orders", "sales_orders", "sales_route_sheets", "sales_procurement"];

/**
 * Plans (and with apply=true, performs) the reset against an open MongoDB database.
 * backup: "file" writes a JSON file in backups/, "db" copies each collection to backup_20261023_<name>.
 */
async function runReset(db, options) {
  const opts = Object.assign({ apply: false, backup: "file", log: console.log }, options || {});
  const log = opts.log;
  const collections = {};
  for (const name of RESET_COLLECTIONS) collections[name] = await db.collection(name).find({}).toArray();

  let backupWhere = "";
  if (opts.backup === "file") {
    const { BSON } = require("mongodb");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir(), "kreezby-backup-" + stamp + ".json");
    fs.writeFileSync(backupFile, BSON.EJSON.stringify({ createdAt: new Date(), collections }, null, 0, { relaxed: false }));
    backupWhere = backupFile;
  } else if (opts.backup === "db" && opts.apply) {
    for (const name of RESET_COLLECTIONS) {
      const target = db.collection("backup_20261023_" + name);
      if (await target.countDocuments({}, { limit: 1 })) continue;
      if (collections[name].length) await target.insertMany(collections[name], { ordered: false });
    }
    backupWhere = "MongoDB collections backup_20261023_*";
  }
  if (backupWhere) log("Backup saved: " + backupWhere);

  const items = {};
  collections.app_state.forEach((doc) => { if (typeof doc.value === "string") items[doc._id] = doc.value; });
  const plan = planState(items, { customerAccounts: collections.customer_accounts });
  const markOrderIds = new Set(plan.markOrderNumbers);

  const deletions = {
    customer_accounts: collections.customer_accounts.filter((d) => String(d._id) !== KEEP_CUSTOMER_ID && !isKeptCustomer(d)).map((d) => d._id),
    customer_orders: collections.customer_orders.filter((d) => !isMarkOrder(d) && !markOrderIds.has(String(d.orderNumber || d._id))).map((d) => d._id),
    sales_orders: collections.sales_orders.filter((d) => !markOrderIds.has(String(d._id)) && !KEEP_NAME_RE.test(String(d.Customer_ID || ""))).map((d) => d._id),
    // Only the imported test sheets; real retailer records (dataset "retailer-records") stay.
    sales_route_sheets: collections.sales_route_sheets.filter((d) => d._id !== "_meta" && d.isTestData === true).map((d) => d._id),
    sales_procurement: collections.sales_procurement.map((d) => d._id),
  };

  log("Changes to shared app data:");
  plan.report.forEach((line) => log("  - " + line));
  log("Database records to delete:");
  Object.entries(deletions).forEach(([name, ids]) => {
    const sample = name === "customer_accounts" ? " (" + ids.join(", ") + ")" : "";
    log("  - " + name + ": " + ids.length + " of " + collections[name].length + sample);
  });
  log("Not touched: admin_accounts, staff_accounts, retailer_accounts, permissions, products.");
  if (!opts.apply) return { applied: false, plan, deletions, backupWhere };

  for (const [name, ids] of Object.entries(deletions)) {
    if (ids.length) {
      const result = await db.collection(name).deleteMany({ _id: { $in: ids } });
      log("Deleted from " + name + ": " + result.deletedCount);
    }
  }
  await db.collection("sales_route_sheets").updateOne(
    { _id: "_meta" },
    { $set: Object.assign({}, SALES_META, { updatedAt: new Date() }) },
    { upsert: true }
  );
  const ops = Object.entries(plan.changes).map(([key, value]) => ({
    updateOne: { filter: { _id: key }, update: { $set: { value, updatedAt: new Date() } }, upsert: true },
  }));
  ops.push({ updateOne: { filter: { _id: "state_meta" }, update: { $set: { value: String(Date.now()) } }, upsert: true } });
  await db.collection("app_state").bulkWrite(ops, { ordered: false });
  log("Updated shared app data keys: " + Object.keys(plan.changes).length);
  return { applied: true, plan, deletions, backupWhere };
}

/**
 * Runs the reset once per database: the server calls this on start. A lock document stops
 * two server instances from running it at the same time; a flag document marks it done.
 */
async function runResetOnce(db, log) {
  const state = db.collection("app_state");
  if (await state.findOne({ _id: RESET_FLAG_ID })) return false;
  try {
    await state.insertOne({ _id: RESET_LOCK_ID, at: new Date() });
  } catch (error) {
    if (error && error.code === 11000) return false; // another instance is running it
    throw error;
  }
  try {
    const result = await runReset(db, { apply: true, backup: "db", log: log || console.log });
    await state.updateOne(
      { _id: RESET_FLAG_ID },
      { $set: { at: new Date(), removedCustomers: result.deletions.customer_accounts.map(String), backup: result.backupWhere } },
      { upsert: true }
    );
    return true;
  } finally {
    await state.deleteOne({ _id: RESET_LOCK_ID });
  }
}

/**
 * Second one-time step: after stock was zeroed, the old alert code created an "out of stock"
 * notification for every item. Remove those stock-alert notifications from 2026-10-23 and
 * clear the active-alert list, so the bell and menu badges start clean.
 */
async function runAlertCleanupOnce(db, log) {
  const say = log || console.log;
  const state = db.collection("app_state");
  const FLAG = "reset_20261023b_done";
  const LOCK = "reset_20261023b_lock";
  if (await state.findOne({ _id: FLAG })) return false;
  try {
    await state.insertOne({ _id: LOCK, at: new Date() });
  } catch (error) {
    if (error && error.code === 11000) return false;
    throw error;
  }
  try {
    const doc = await state.findOne({ _id: "kreezbyNotifications" });
    let removed = 0;
    if (doc && typeof doc.value === "string") {
      const list = parse(doc.value, null);
      if (Array.isArray(list)) {
        const kept = list.filter((n) => {
          if (!n) return false;
          const isStockAlert = n.source === "alert" && String(n.id || "").indexOf("stock-") === 0;
          const today = String(n.timestamp || "").slice(0, 10) === "2026-10-23";
          return !(isStockAlert && today);
        });
        removed = list.length - kept.length;
        if (removed) {
          if (await db.collection("backup_20261023_notifications").countDocuments({}, { limit: 1 }) === 0) {
            await db.collection("backup_20261023_notifications").insertOne({ _id: "kreezbyNotifications", value: doc.value, at: new Date() });
          }
          await state.updateOne({ _id: "kreezbyNotifications" }, { $set: { value: JSON.stringify(kept), updatedAt: new Date() } });
        }
      }
    }
    await state.updateOne({ _id: "kreezbyAlertActive" }, { $set: { value: "{}", updatedAt: new Date() } }, { upsert: true });
    await state.updateOne({ _id: "state_meta" }, { $set: { value: String(Date.now()) } }, { upsert: true });
    await state.updateOne({ _id: FLAG }, { $set: { at: new Date(), removedNotifications: removed } }, { upsert: true });
    say("Removed " + removed + " stock-alert notifications created by the reset.");
    return true;
  } finally {
    await state.deleteOne({ _id: LOCK });
  }
}

/**
 * One-time repair: Mark Cruz's order was wiped from the shared order list by a browser that
 * sent an empty list. Put his orders, receipts and purchase-order entries back, taking them
 * from customer_orders (kept by the transaction mirror) and the reset backup.
 */
async function runRestoreMarkOnce(db, log) {
  const say = log || console.log;
  const state = db.collection("app_state");
  const FLAG = "restore_mark_20261023_done";
  const LOCK = "restore_mark_20261023_lock";
  if (await state.findOne({ _id: FLAG })) return false;
  try {
    await state.insertOne({ _id: LOCK, at: new Date() });
  } catch (error) {
    if (error && error.code === 11000) return false;
    throw error;
  }
  try {
    const strip = (doc) => {
      const copy = Object.assign({}, doc);
      ["_id", "updatedAt", "sourceKey", "inApp", "mirroredAt", "removedFromAppAt", "syncedFromApp"].forEach((k) => delete copy[k]);
      return copy;
    };
    const byNumber = new Map();
    const fromBackup = await db.collection("backup_20261023_customer_orders").find({}).toArray().catch(() => []);
    fromBackup.filter(isMarkOrder).forEach((doc) => byNumber.set(String(doc.orderNumber || doc._id), strip(doc)));
    const current = await db.collection("customer_orders").find({}).toArray();
    current.filter(isMarkOrder).forEach((doc) => byNumber.set(String(doc.orderNumber || doc._id), Object.assign({}, byNumber.get(String(doc.orderNumber || doc._id)) || {}, strip(doc))));
    const orders = [...byNumber.values()].filter((o) => o.orderNumber);
    const numbers = new Set(orders.map((o) => String(o.orderNumber)));

    const read = async (id) => {
      const doc = await state.findOne({ _id: id });
      return doc && typeof doc.value === "string" ? doc.value : null;
    };
    const backupState = {};
    (await db.collection("backup_20261023_app_state").find({}).toArray().catch(() => [])).forEach((doc) => {
      if (typeof doc.value === "string") backupState[doc._id] = doc.value;
    });
    const mergeList = (raw, add, field) => {
      const list = Array.isArray(parse(raw, null)) ? parse(raw, []) : [];
      const have = new Set(list.map((r) => r && String(r[field] || "")));
      add.forEach((r) => { if (r && r[field] && !have.has(String(r[field]))) list.push(r); });
      return list;
    };
    const changes = {};
    changes.kreezbyOrders = JSON.stringify(mergeList(await read("kreezbyOrders"), orders, "orderNumber"));
    for (const key of ["kreezbyCustomerReceipts", "kreezbyOwnerReceipts"]) {
      const old = parse(backupState[key], []);
      const marks = (Array.isArray(old) ? old : []).filter((r) => r && (numbers.has(String(r.orderNumber || "")) || KEEP_NAME_RE.test(String(r.customerName || ""))));
      changes[key] = JSON.stringify(mergeList(await read(key), marks, "receiptNumber"));
    }
    const po = parse(await read("kreezby-po-orders-v1"), {}) || {};
    const oldPo = parse(backupState["kreezby-po-orders-v1"], {}) || {};
    Object.keys(oldPo).forEach((k) => { if (numbers.has(k) && !po[k]) po[k] = oldPo[k]; });
    changes["kreezby-po-orders-v1"] = JSON.stringify(po);

    const now = new Date();
    const ops = Object.entries(changes).map(([key, value]) => ({ updateOne: { filter: { _id: key }, update: { $set: { value, updatedAt: now } }, upsert: true } }));
    ops.push({ updateOne: { filter: { _id: "state_meta" }, update: { $set: { value: String(Date.now()) } }, upsert: true } });
    await state.bulkWrite(ops, { ordered: false });
    for (const order of orders) {
      await db.collection("customer_orders").updateOne(
        { _id: String(order.orderNumber) },
        { $set: Object.assign({}, order, { inApp: true, updatedAt: now }), $unset: { removedFromAppAt: "" } },
        { upsert: true }
      );
    }
    await state.updateOne({ _id: FLAG }, { $set: { at: now, restored: [...numbers] } }, { upsert: true });
    say("Restored Mark Cruz's orders: " + ([...numbers].join(", ") || "none found"));
    return true;
  } finally {
    await state.deleteOne({ _id: LOCK });
  }
}

function backupDir() {
  const dir = path.join(__dirname, "..", "backups");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function main() {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
  const { MongoClient, BSON } = require("mongodb");
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Add it to the .env file next to server.js (copy it from Vercel).");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const restoreAt = args.indexOf("--restore");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db(DB_NAME);
  try {
    if (restoreAt >= 0) {
      const file = args[restoreAt + 1];
      if (!file) throw new Error("Give the backup file: --restore backups/<file>.json");
      const backup = BSON.EJSON.parse(fs.readFileSync(file, "utf8"));
      for (const [name, docs] of Object.entries(backup.collections || {})) {
        await db.collection(name).deleteMany({});
        if (docs.length) await db.collection(name).insertMany(docs);
        console.log("Restored " + name + ": " + docs.length);
      }
      console.log("Restore finished.");
      return;
    }
    const result = await runReset(db, { apply, backup: "file" });
    if (!result.applied) console.log("\nDry run only. Nothing was changed. Run again with --apply to make these changes.");
    else {
      await db.collection("app_state").updateOne({ _id: RESET_FLAG_ID }, { $set: { at: new Date(), backup: result.backupWhere } }, { upsert: true });
      console.log("\nDone.");
    }
  } finally {
    await client.close();
  }
}

module.exports = { planState, isMarkOrder, isKeptCustomer, runReset, runResetOnce, runAlertCleanupOnce, runRestoreMarkOnce };

if (require.main === module) {
  main().catch((error) => {
    console.error("Reset failed: " + error.message);
    process.exit(1);
  });
}
