"use strict";
/**
 * Copies every transaction the app saves into its own MongoDB collection, one document per
 * record, so orders, receipts, purchase orders, stock movements, sales and reports can be
 * looked up in MongoDB directly (not only inside the app_state blobs).
 *
 * Records are upserted. A record that later disappears from the app is kept in MongoDB and
 * marked inApp: false, so no transaction is ever lost from the database.
 */
const crypto = require("crypto");

// app_state key -> MongoDB collection
const MIRRORS = {
  "kreezbyOrders": "customer_orders",
  "kreezbyCustomerReceipts": "customer_receipts",
  "kreezbyOwnerReceipts": "owner_receipts",
  "kreezby-po-orders-v1": "purchase_orders",
  "kreezby-recv-receipts-v1": "goods_receipts",
  "kreezby-bo-orders-v1": "back_orders",
  "kreezby-return-records-v1": "return_records",
  "kreezby_pos_sales_v1": "pos_sales",
  "kreezby_delivery_schedule_v5": "delivery_schedule",
  "kreezby-issue-reports-v1": "issue_reports",
  "kreezbyCustomerIssueReports": "customer_issue_reports",
  "kreezby-partner-inquiries-v1": "partner_inquiries",
  "kreezby_login_history": "login_history",
};

const ID_FIELDS = ["orderNumber", "receiptNumber", "code", "id", "saleId", "receiptNo", "reference", "referenceId"];
// The field that names a record, where a source has several ID-like fields.
const PREFERRED_ID = {
  kreezbyCustomerReceipts: "receiptNumber",
  kreezbyOwnerReceipts: "receiptNumber",
  kreezbyOrders: "orderNumber",
};

function parse(raw) {
  try { return JSON.parse(raw); } catch (error) { return null; }
}

function hashId(value) {
  return "h-" + crypto.createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 20);
}

function recordId(record, fallbackKey, preferred) {
  if (fallbackKey != null) return String(fallbackKey);
  if (record && typeof record === "object") {
    if (preferred && record[preferred] != null && String(record[preferred]).trim()) return String(record[preferred]).trim();
    for (const field of ID_FIELDS) {
      if (record[field] != null && String(record[field]).trim()) return String(record[field]).trim();
    }
  }
  return hashId(record);
}

/** Turns one app_state value into [{ _id, doc }] records. */
function recordsFor(key, raw) {
  const value = parse(raw);
  if (value == null) return [];
  const out = [];
  if (Array.isArray(value)) {
    value.forEach((record) => { if (record != null) out.push({ _id: recordId(record, null, PREFERRED_ID[key]), doc: record }); });
  } else if (typeof value === "object") {
    Object.keys(value).forEach((k) => { if (value[k] != null) out.push({ _id: recordId(value[k], k), doc: value[k] }); });
  }
  return out;
}

/** The stock/sales data record holds several transaction lists; split them out. */
function dictionaryRecords(raw) {
  const dict = parse(raw);
  if (!dict || typeof dict !== "object") return {};
  const groups = { sales_transactions: [], inventory_transactions: [], stock_levels: [] };
  (Array.isArray(dict.sales_transactions_extra) ? dict.sales_transactions_extra : []).forEach((row) => {
    if (row) groups.sales_transactions.push({ _id: row.id ? String(row.id) : hashId(row), doc: row });
  });
  (Array.isArray(dict.inventory_transactions_extra) ? dict.inventory_transactions_extra : []).forEach((row) => {
    if (row) groups.inventory_transactions.push({ _id: row.id ? String(row.id) : hashId(row), doc: row });
  });
  const stock = Object.assign({}, dict.material_stock || {}, dict.product_stock || {});
  Object.keys(stock).forEach((code) => {
    groups.stock_levels.push({
      _id: code,
      doc: { code, quantity: Number(stock[code]) || 0, kind: dict.product_stock && code in dict.product_stock ? "product" : "material" },
    });
  });
  return groups;
}

async function writeGroup(db, collectionName, sourceKey, records, now) {
  const col = db.collection(collectionName);
  const ids = records.map((r) => r._id);
  const ops = records.map((r) => ({
    updateOne: {
      filter: { _id: r._id },
      update: { $set: Object.assign({}, r.doc, { _id: undefined, sourceKey, inApp: true, mirroredAt: now }) },
      upsert: true,
    },
  }));
  ops.forEach((op) => { delete op.updateOne.update.$set._id; });
  for (let i = 0; i < ops.length; i += 400) await col.bulkWrite(ops.slice(i, i + 400), { ordered: false });
  // Keep records that left the app, but mark them so they can be told apart.
  await col.updateMany({ sourceKey, inApp: true, _id: { $nin: ids } }, { $set: { inApp: false, removedFromAppAt: now } });
  return ops.length;
}

/** Mirrors the given saved items ({ key: stringValue }) into their collections. */
async function mirrorTransactions(db, items) {
  const now = new Date();
  const counts = {};
  for (const [key, raw] of Object.entries(items || {})) {
    if (typeof raw !== "string") continue;
    if (key === "kreezby_data_dictionary_v1") {
      const groups = dictionaryRecords(raw);
      for (const [name, records] of Object.entries(groups)) {
        counts[name] = await writeGroup(db, name, key, records, now);
      }
      continue;
    }
    const collectionName = MIRRORS[key];
    if (!collectionName) continue;
    counts[collectionName] = await writeGroup(db, collectionName, key, recordsFor(key, raw), now);
  }
  return counts;
}

module.exports = { mirrorTransactions, recordsFor, dictionaryRecords, MIRRORS };
