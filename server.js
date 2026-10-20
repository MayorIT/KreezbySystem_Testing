const fs = require("fs");
const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
const QRCode = require("qrcode");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
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
]);

function isSharedKey(key) {
  return KEY_RE.test(key) && !LOCAL_ONLY.has(key);
}

const app = express();
let cache = {};
let mongoReady = false;

function createMongoClient() {
  if (!process.env.MONGODB_URI) return null;
  // One local server and a few people in the shop at once, talking to a
  // 3-member Atlas set. Five warm sockets stay open so a quiet stretch does
  // not drop the link. Twenty is enough if several pages save together.
  // (5 pool + 2 monitoring) x 3 members is about 21 connections on the cluster.
  return new MongoClient(process.env.MONGODB_URI, {
    minPoolSize: 5,
    maxPoolSize: 20,
    maxIdleTimeMS: 10 * 60 * 1000,
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

async function activateMongo() {
  if (!client) throw new Error("Missing MONGODB_URI in .env");
  await client.connect();
  await client.db(DB_NAME).command({ ping: 1 });
  if (!mongoReady) {
    await ensureSalesList();
    await refreshCache();
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
    const ids = [];
    const ops = [];
    for (const account of users[bucket]) {
      if (!account || typeof account !== "object") continue;
      const id = String(account.id || account.user_id || account.email || account.username || "").trim();
      if (!id) continue;
      ids.push(id);
      const accountType = account.accountType === "Head Administrator"
        ? "Head Administrator"
        : ACCOUNT_TYPES[bucket];
      const doc = { ...account, accountType, updatedAt: new Date() };
      delete doc._id;
      delete doc.password;
      delete doc.password_hash;
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: doc },
          upsert: true,
        },
      });
    }
    if (ops.length) await col.bulkWrite(ops, { ordered: false });
    await col.deleteMany(ids.length ? { _id: { $nin: ids } } : {});
  }
}

async function refreshCache() {
  const docs = await collection().find({}).toArray();
  const next = {};
  for (const doc of docs) {
    if (typeof doc.value === "string") next[doc._id] = doc.value;
  }
  cache = next;
}

app.use(express.json({ limit: "12mb" }));

app.use("/api", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    res.json({ ok: true, database: DB_NAME, records: Object.keys(cache).length });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.get("/api/state", (req, res) => {
  if (!databaseReady(res)) return;
  res.json({ items: cache });
});

const RECORD_COLLECTIONS = {
  sales_orders: 1,
  sales_products: 1,
  sales_procurement: 1,
};

app.get("/api/sales-list", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const col = salesListCollection();
    const meta = await col.findOne({ _id: "_meta" }) || {};
    const reports = await col.find({ _id: { $ne: "_meta" } }).sort({ reportDate: 1, _id: 1 }).toArray();
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

function publicAccount(doc) {
  const row = { ...doc, id: doc.id || String(doc._id) };
  delete row._id;
  delete row.updatedAt;
  delete row.password;
  delete row.password_hash;
  return row;
}

app.get("/api/accounts", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const db = client.db(DB_NAME);
    const accounts = {};
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

app.get("/api/customer-orders", async (req, res) => {
  if (!databaseReady(res)) return;
  try {
    const records = await client.db(DB_NAME).collection("customer_orders").find({}).sort({ date: -1 }).toArray();
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
  fs.mkdirSync(path.dirname(PERMISSION_FILE), { recursive: true });
  fs.writeFileSync(PERMISSION_FILE, JSON.stringify(next, null, 2));
  return next;
}

app.post("/api/permissions", (req, res) => {
  const items = req.body && typeof req.body === "object" ? req.body : {};
  const saved = writePermissionFile(items);
  if (!saved) {
    res.status(400).json({ ok: false, error: "Permission records are required." });
    return;
  }
  res.json({ ok: true, updatedAt: saved.updatedAt });
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
    for (const [key, value] of Object.entries(items)) {
      if (!isSharedKey(key)) continue;
      if (value == null) {
        ops.push({ deleteOne: { filter: { _id: key } } });
        delete cache[key];
        continue;
      }
      const stored = String(value);
      if (stored.length > 12 * 1024 * 1024) continue;
      ops.push({
        updateOne: {
          filter: { _id: key },
          update: { $set: { value: stored, updatedAt: new Date() } },
          upsert: true,
        },
      });
      cache[key] = stored;
    }

    writePermissionFile(items);
    if (ops.length) await collection().bulkWrite(ops, { ordered: false });
    if (typeof items.kreezby_maintenance_users === "string") {
      await syncAccountCollections(items.kreezby_maintenance_users);
    }
    if (typeof items.kreezbyOrders === "string") {
      await syncCustomerOrderDocs(readCachedCustomerOrders());
    }
    res.json({ ok: true });
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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
};

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
  if (!Number.isFinite(amount) || centavos < 10000 || centavos > 100000000) {
    res.status(400).json({ ok: false, error: "PayMongo accepts payments from ₱100.00 up to ₱1,000,000.00." });
    return;
  }
  if (!paymongoReturnUrl(req, body.returnUrl)) {
    res.status(400).json({ ok: false, error: "PayMongo could not return to this page." });
    return;
  }

  try {
    const intent = await paymongoRequest("POST", "/v1/payment_intents", {
      data: {
        attributes: {
          amount: centavos,
          payment_method_allowed: [methodInfo.type],
          currency: "PHP",
          capture_type: "automatic",
          description: String(body.description || "Kreezby Bakeshop order").slice(0, 255),
          statement_descriptor: "KREEZBY",
          metadata: {
            reference: String(body.reference || "").slice(0, 80),
            audience,
            wallet,
          },
        },
      },
    });
    const methodAttributes = {
      type: methodInfo.type,
      billing: Object.assign({
        name: name.slice(0, 80),
        email,
      }, phone ? { phone: phone.slice(0, 20) } : {}),
    };
    if (methodInfo.bankCode) methodAttributes.details = { bank_code: methodInfo.bankCode };
    const method = await paymongoRequest("POST", "/v1/payment_methods", {
      data: { attributes: methodAttributes },
    });
    const attached = await paymongoRequest("POST", "/v1/payment_intents/" + intent.data.id + "/attach", {
      data: {
        attributes: {
          payment_method: method.data.id,
          return_url: String(body.returnUrl),
        },
      },
    });
    const attributes = attached.data.attributes || {};
    const paymongoImage = paymongoQrDataUri(attributes.next_action);
    const testUrl = paymongoTestUrl(attributes.next_action);
    const scanImage = testUrl ? await scannableQr(testUrl) : "";
    const qrImage = scanImage || paymongoImage;
    if (!qrImage) {
      res.status(502).json({ ok: false, error: "PayMongo did not return a QR Ph code." });
      return;
    }
    res.json({
      ok: true,
      paymentIntentId: attached.data.id,
      status: attributes.status || "",
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
    res.json(Object.assign({ ok: true }, paymongoPublicIntent(intent)));
  } catch (error) {
    res.status(error.status && error.status < 500 ? error.status : 502).json({
      ok: false,
      error: error.message || "PayMongo could not be checked.",
    });
  }
});

app.get("/", (req, res) => {
  res.redirect("/auth/start.html");
});

app.use(express.static(SITE_ROOT));

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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
