"use strict";
/**
 * Links route-sheet rows to retailer accounts, and signs the small login token that lets a
 * retailer read only its own rows.
 *
 * The name map (data/retailer-name-map.json) turns "area|shop name as written" into a retailer
 * account id. Extra links can be added in MongoDB, collection retailer_name_map:
 *   { _id: "<area>|<cleaned name>", accountId: "ret-..." }
 */
const crypto = require("crypto");
const FILE_MAP = require("../data/retailer-name-map.json");

const TOKEN_DAYS = 30;

/** Same cleaning as the import: lowercase, & -> and, punctuation -> spaces. */
function cleanName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/'/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadNameMap(db) {
  const names = Object.assign({}, FILE_MAP.names);
  const overrides = Object.assign({}, FILE_MAP.overrides);
  try {
    const extra = await db.collection("retailer_name_map").find({}).toArray();
    extra.forEach((doc) => {
      if (!doc || !doc.accountId || !doc._id) return;
      if (String(doc._id).indexOf("rec-") === 0) overrides[doc._id] = doc.accountId;
      else names[doc._id] = doc.accountId;
    });
  } catch (error) {
    /* the file map is enough */
  }
  return { names, overrides };
}

function accountForEntry(map, sheet, entry) {
  if (!entry) return null;
  if (entry.accountId) return String(entry.accountId);
  const name = cleanName(entry.retailerName);
  if (!name) return null;
  const sheetId = String(sheet.id || sheet._id || "");
  return map.overrides[sheetId + "|" + name] || map.names[String(sheet.source || "") + "|" + name] || null;
}

function secret() {
  return process.env.SESSION_SECRET || crypto.createHash("sha256").update("kreezby-session|" + (process.env.MONGODB_URI || "local")).digest("hex");
}

function sign(body) {
  return crypto.createHmac("sha256", secret()).update(body).digest("base64url");
}

/** Token for a signed-in account: { id, bucket } plus an expiry. */
function issueToken(id, bucket) {
  const body = Buffer.from(JSON.stringify({ id: String(id), bucket: String(bucket), exp: Date.now() + TOKEN_DAYS * 864e5 })).toString("base64url");
  return body + "." + sign(body);
}

function readToken(req) {
  const raw = String((req.headers && req.headers["x-kreezby-token"]) || "").trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(body));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || !payload.id || !(payload.exp > Date.now())) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

const FIELDS = ["accountReceivable", "cons", "cod", "staff", "check", "f", "po", "replaced", "collected", "notes"];

/** One retailer's rows across every real route sheet (test data left out), newest first. */
async function recordsForAccount(db, accountId) {
  const map = await loadNameMap(db);
  const sheets = await db.collection("sales_route_sheets")
    .find({ _id: { $ne: "_meta" }, isTestData: { $ne: true } })
    .sort({ reportDate: -1, _id: 1 })
    .toArray();
  const rows = [];
  sheets.forEach((sheet) => {
    (sheet.entries || []).forEach((entry, index) => {
      if (accountForEntry(map, sheet, entry) !== accountId) return;
      const row = {
        id: String(sheet._id) + "-" + (index + 1),
        reportId: String(sheet._id),
        reportDate: sheet.reportDate,
        source: sheet.source,
        areaLabel: sheet.areaLabel,
        retailerName: entry.retailerName,
      };
      FIELDS.forEach((field) => { if (entry[field] !== undefined) row[field] = entry[field]; });
      rows.push(row);
    });
  });
  return rows;
}

/** Adds accountId / accountName to every row of the given sheets (for the admin view). */
async function tagSheets(db, sheets) {
  const map = await loadNameMap(db);
  const names = {};
  (await db.collection("retailer_accounts").find({}, { projection: { name: 1 } }).toArray())
    .forEach((acc) => { names[String(acc._id)] = acc.name || String(acc._id); });
  sheets.forEach((sheet) => {
    (sheet.entries || []).forEach((entry) => {
      const id = accountForEntry(map, sheet, entry);
      if (id) {
        entry.accountId = id;
        if (names[id]) entry.accountName = names[id];
      }
    });
  });
  return names;
}

module.exports = { cleanName, accountForEntry, loadNameMap, issueToken, readToken, recordsForAccount, tagSheets };
