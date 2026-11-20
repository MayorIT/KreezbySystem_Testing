/**
 * Restores a Kreezby backup made by scripts/backup-db.js or downloaded from /api/backup.
 *
 *   node scripts/restore-db.js backups/kreezby-backup-202611201530.json            (dry run: shows what would change)
 *   node scripts/restore-db.js backups/kreezby-backup-202611201530.json --confirm  (replaces the collections)
 *
 * Every collection in the file is replaced by the copy in the file. Collections that are not in
 * the file are left alone. A safety backup of the current data is written first.
 */
const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DB_NAME = "kreezby";

// JSON turns dates into text: put back the fields that were dates.
function revive(value) {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).forEach((k) => { out[k] = revive(value[k]); });
    return out;
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) return new Date(value);
  return value;
}

async function main() {
  const file = process.argv[2];
  const confirm = process.argv.includes("--confirm");
  if (!file) throw new Error("Give the backup file: node scripts/restore-db.js <file> [--confirm]");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in .env");
  const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!backup || backup.database !== DB_NAME || !backup.collections) throw new Error("This is not a Kreezby backup file.");
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(DB_NAME);
    const names = Object.keys(backup.collections);
    console.log("Backup from " + backup.createdAt + " with " + names.length + " collections.");
    for (const name of names) {
      const now = await db.collection(name).countDocuments();
      console.log("  " + name + ": " + now + " now -> " + backup.collections[name].length + " from the backup");
    }
    if (!confirm) {
      console.log("Dry run only. Add --confirm to restore.");
      return;
    }
    // Safety copy of the current data before anything is replaced.
    const safety = { database: DB_NAME, createdAt: new Date().toISOString(), collections: {} };
    for (const name of names) safety.collections[name] = await db.collection(name).find({}).toArray();
    const safetyFile = path.join(__dirname, "..", "backups", "before-restore-" + Date.now() + ".json");
    fs.mkdirSync(path.dirname(safetyFile), { recursive: true });
    fs.writeFileSync(safetyFile, JSON.stringify(safety));
    console.log("Current data saved first: " + safetyFile);
    for (const name of names) {
      const docs = revive(backup.collections[name]);
      await db.collection(name).deleteMany({});
      if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
      const check = await db.collection(name).countDocuments();
      console.log("  restored " + name + ": " + check + " documents" + (check === docs.length ? "" : " (expected " + docs.length + ")"));
    }
    console.log("Restore finished.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Restore failed: " + error.message);
  process.exit(1);
});
