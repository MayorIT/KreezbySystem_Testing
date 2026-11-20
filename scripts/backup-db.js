/**
 * Backup of the Kreezby database (every collection) to one JSON file.
 *
 *   node scripts/backup-db.js            -> backups/kreezby-backup-YYYYMMDDHHMM.json
 *   node scripts/backup-db.js out.json   -> out.json
 *
 * Uses MONGODB_URI from .env. The same file can be downloaded by head admin / admin from
 * /api/backup, and is put back with scripts/restore-db.js.
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DB_NAME = "kreezby";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in .env");
  const stamp = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16).replace(/[-:T]/g, "");
  const file = process.argv[2] || path.join(__dirname, "..", "backups", "kreezby-backup-" + stamp + ".json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const cols = await db.listCollections({}, { nameOnly: true }).toArray();
    const out = { database: DB_NAME, createdAt: new Date().toISOString(), collections: {} };
    let total = 0;
    for (const c of cols) {
      out.collections[c.name] = await db.collection(c.name).find({}).toArray();
      total += out.collections[c.name].length;
      console.log("  " + c.name + ": " + out.collections[c.name].length + " documents");
    }
    fs.writeFileSync(file, JSON.stringify(out));
    console.log("Backup saved: " + file + " (" + cols.length + " collections, " + total + " documents)");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Backup failed: " + error.message);
  process.exit(1);
});
