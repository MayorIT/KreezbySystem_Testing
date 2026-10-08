const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
const QRCode = require("qrcode");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const DB_NAME = "kreezby";
const SITE_ROOT = path.join(__dirname, "Kreezby-Bakeshop-main");
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
  try {
    await client.close();
  } catch (error) {
    /* The failed client may already be closed. */
  }
  client = createMongoClient();
}

async function activateMongo() {
  await client.connect();
  await client.db(DB_NAME).command({ ping: 1 });
  if (!mongoReady) {
    await refreshCache();
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

    if (ops.length) await collection().bulkWrite(ops, { ordered: false });
    if (typeof items.kreezby_maintenance_users === "string") {
      await syncAccountCollections(items.kreezby_maintenance_users);
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
      forecastDemand: insightNumber(row && row.forecastDemand),
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

async function writeManagementInsight(apiKey, snapshot) {
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
          content: "You write a short note for the owner of Kreezby Bakeshop, a crinkles bakery. Summarize notable sales, inventory, and demand in simple everyday language. Use 4 to 6 short sentences. Name the products and use only the numbers in the data when a figure matters. Say what is selling, what is running low against the recommended stock, and what demand looks like next. Mention an ingredient only if it is close to expiring or very low. Do not use business jargon. Do not invent figures.",
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
      insight: "There is not enough sales, stock, or demand data yet to summarize. Once products have stock and recent sales, this note will tell you what stands out.",
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
    res.json({ ok: true, insight, model: OPENAI_MODEL });
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
    wallet: source.type || (attributes.metadata && attributes.metadata.wallet) || "",
    lastPaymentError: lastError ? String(lastError.detail || lastError.message || "Payment was not completed.").slice(0, 240) : "",
  };
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
  const requested = String(body.wallet || "gcash");
  const wallet = requested === "paymaya" ? "paymaya" : (requested === "gcash" ? "gcash" : "");
  const amount = Number(body.amount);
  const centavos = Math.round(amount * 100);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const audience = body.audience === "wholesaler" ? "wholesaler" : (body.audience === "customer" ? "customer" : "");
  if (!wallet || !audience || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ ok: false, error: "Choose GCash or Maya and enter the payer name and email." });
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
          payment_method_allowed: [wallet],
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
    const method = await paymongoRequest("POST", "/v1/payment_methods", {
      data: {
        attributes: {
          type: wallet,
          billing: Object.assign({
            name: name.slice(0, 80),
            email,
          }, phone ? { phone: phone.slice(0, 20) } : {}),
        },
      },
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
    const redirect = attributes.next_action && attributes.next_action.redirect
      ? String(attributes.next_action.redirect.url || "")
      : "";
    let sourceUrl = "";
    try {
      const parsed = new URL(redirect);
      const sourceId = parsed.searchParams.get("id") || "";
      if (parsed.protocol === "https:" && parsed.hostname === "secure-authentication.paymongo.com" && sourceId.startsWith("src_")) {
        sourceUrl = parsed.toString();
      }
    } catch (error) {
      sourceUrl = "";
    }
    if (!sourceUrl) {
      res.status(502).json({ ok: false, error: "PayMongo did not return a payment link." });
      return;
    }
    const qrImage = await QRCode.toDataURL(sourceUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 590,
    });
    res.json({
      ok: true,
      paymentIntentId: attached.data.id,
      status: attributes.status || "",
      qrImage,
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

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in .env");
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log("Kreezby server on http://localhost:" + PORT);
    console.log("Open http://localhost:" + PORT + "/auth/start.html");
  });
  await maintainMongo();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
