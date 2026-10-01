const path = require("path");
const express = require("express");
const { MongoClient } = require("mongodb");
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
const client = new MongoClient(process.env.MONGODB_URI);
let cache = {};

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
      const doc = { ...account, accountType: ACCOUNT_TYPES[bucket], updatedAt: new Date() };
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

app.get("/api/health", async (req, res) => {
  try {
    await client.db(DB_NAME).command({ ping: 1 });
    res.json({ ok: true, database: DB_NAME, records: Object.keys(cache).length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/state", (req, res) => {
  res.json({ items: cache });
});

app.post("/api/state", async (req, res) => {
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

app.get("/", (req, res) => {
  res.redirect("/auth/start.html");
});

app.use(express.static(SITE_ROOT));

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in .env");
    process.exit(1);
  }
  await client.connect();
  await refreshCache();
  if (cache.kreezby_maintenance_users) {
    await syncAccountCollections(cache.kreezby_maintenance_users);
  }
  app.listen(PORT, () => {
    console.log("Kreezby server on http://localhost:" + PORT);
    console.log("Open http://localhost:" + PORT + "/auth/start.html");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
