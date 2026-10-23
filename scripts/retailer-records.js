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

const ROUTE_AREAS = new Set(["batangas", "bauan", "citimart", "lipa", "lucena", "manila", "rosario", "stotomas", "tagaytay"]);
const ROUTE_FIELDS = ["notes", "accountReceivable", "cons", "cod", "staff", "check", "f", "po", "replaced", "collected"];

function routeValue(v) {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  const s = String(v).trim().slice(0, 120);
  if (!s) return undefined;
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s;
}

/**
 * Cleans a route sheet sent by the editor. Each row keeps what was written, and is linked to
 * a retailer account: the account chosen in the editor, else an account with the same name.
 * Returns { doc } or { error }.
 */
function buildRouteSheet(body, accounts) {
  const id = String(body.id || "").trim();
  const reportDate = String(body.reportDate || "").trim();
  const source = String(body.source || "").trim();
  if (!/^[A-Za-z0-9_.-]{3,80}$/.test(id) || id === "_meta") return { error: "Invalid sheet id." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) return { error: "Choose a date." };
  if (!ROUTE_AREAS.has(source)) return { error: "Choose an area." };
  const byId = new Map((accounts || []).map((a) => [String(a._id), a]));
  const byName = new Map((accounts || []).map((a) => [cleanName(a.name), String(a._id)]));
  const entries = [];
  (Array.isArray(body.entries) ? body.entries.slice(0, 300) : []).forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const retailerName = String(raw.retailerName || "").trim().slice(0, 120);
    if (!retailerName) return;
    const entry = { retailerName };
    ROUTE_FIELDS.forEach((f) => {
      const v = routeValue(raw[f]);
      if (v === undefined) return;
      if (f === "collected" && typeof v !== "number") {
        entry.notes = (entry.notes ? entry.notes + "; " : "") + "Collected written as: " + v;
        return;
      }
      entry[f] = v;
    });
    const chosen = String(raw.accountId || "");
    const accountId = byId.has(chosen) ? chosen : (byName.get(cleanName(retailerName)) || "");
    if (accountId) entry.accountId = accountId;
    if (raw.retailerSlug) entry.retailerSlug = String(raw.retailerSlug).slice(0, 80);
    entries.push(entry);
  });
  if (!entries.length) return { error: "Add at least one location with a name." };
  const totalExpense = Number(routeValue(body.totalExpense)) || 0;
  const cashCollected = entries.reduce((sum, e) => sum + (Number(e.collected) || 0), 0);
  return {
    doc: {
      id,
      reportDate,
      source,
      areaLabel: String(body.areaLabel || "").trim().slice(0, 120) || source,
      entries,
      totalExpense,
      cashCollected,
      netSales: cashCollected - totalExpense,
      isTestData: false,
    },
  };
}

module.exports = { buildRouteSheet, cleanName, accountForEntry, loadNameMap, issueToken, readToken, recordsForAccount, tagSheets };
