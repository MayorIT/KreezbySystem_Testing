#!/usr/bin/env node
/**
 * Removes the dummy data from KreezbyDatabase:
 *   - the 8 demo orders in sales_orders (Maria Santos, Kyla Ramos, Bryle Atienza, Ailore Embalzado)
 *   - every test route sheet in sales_route_sheets (isTestData: true)
 * Accounts are not touched: admin, staff, customer and retailer accounts all stay.
 * Everything deleted is saved first to backups/dummy-data-<time>.json.
 *
 * Only runs against the KreezbyDatabase cluster (kreezbydatabase.clwsmie.mongodb.net).
 */
"use strict";
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { MongoClient, BSON } = require("mongodb");

const EXPECTED_HOST = "kreezbydatabase.clwsmie.mongodb.net";
const DUMMY_ORDERS = ["ORD-2026-1021", "ORD-2026-1042", "ORD-2026-1038", "ORD-2026-1015",
  "ORD-2026-7488", "ORD-2026-4583", "ORD-2026-1008", "ORD-2026-1099"];

async function main() {
  const uri = String(process.env.MONGODB_URI || "");
  if (!uri) throw new Error("MONGODB_URI is not set in .env");
  const host = (uri.match(/@([^/?]+)/) || [])[1] || "(unknown)";
  console.log("Database host: " + host);
  if (host.toLowerCase() !== EXPECTED_HOST) {
    throw new Error("This .env does not point to KreezbyDatabase (" + EXPECTED_HOST + "). Nothing was changed.");
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, family: 4 });
  await client.connect();
  try {
    const db = client.db("kreezby");
    const orderFilter = { _id: { $in: DUMMY_ORDERS } };
    const sheetFilter = { isTestData: true, _id: { $ne: "_meta" } };

    const orders = await db.collection("sales_orders").find(orderFilter).toArray();
    const sheets = await db.collection("sales_route_sheets").find(sheetFilter).toArray();
    console.log("Found " + orders.length + " dummy sales orders and " + sheets.length + " test route sheets.");

    const dir = path.join(__dirname, "..", "backups");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "dummy-data-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json");
    fs.writeFileSync(file, BSON.EJSON.stringify({ createdAt: new Date(), sales_orders: orders, sales_route_sheets: sheets }));
    console.log("Backup saved: " + file);

    const a = await db.collection("sales_orders").deleteMany(orderFilter);
    const b = await db.collection("sales_route_sheets").deleteMany(sheetFilter);
    await db.collection("sales_route_sheets").updateOne(
      { _id: "_meta" },
      { $set: { reportCount: 0, isTestData: false, dataset: "", sources: {}, dateRange: null,
        importedAt: "2026-10-23T00:00:00.000Z",
        note: "Sales history cleared on 2026-10-23. New sales are added as they happen.", updatedAt: new Date() } },
      { upsert: true }
    );
    console.log("Deleted sales orders: " + a.deletedCount);
    console.log("Deleted route sheets: " + b.deletedCount);

    const counts = {};
    for (const name of ["sales_orders", "sales_route_sheets", "admin_accounts", "staff_accounts", "customer_accounts", "retailer_accounts", "customer_orders"]) {
      counts[name] = await db.collection(name).countDocuments({});
    }
    console.log("Now in the database: " + JSON.stringify(counts));
    console.log("Done.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Failed: " + error.message);
  process.exit(1);
});
