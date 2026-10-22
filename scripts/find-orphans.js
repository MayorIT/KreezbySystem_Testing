const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "Kreezby-Bakeshop-main");

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(root);
const textFiles = files.filter((f) => /\.(html|js|css|json|md)$/i.test(f));
const corpus = textFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

function mentions(name, extra) {
  const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  return (corpus.match(re) || []).length + (extra || 0);
}

console.log("=== HTML ===");
files.filter((f) => f.endsWith(".html")).forEach((h) => {
  const base = path.basename(h);
  const n = mentions(base);
  if (n <= 2) console.log(n, path.relative(root, h).replace(/\\/g, "/"));
});

console.log("\n=== JS one-off / patch / deleted-page ===");
const suspect = [
  "receive-admin.js",
  "return-admin.js",
  "po-admin.js",
  "generate-fake-admin-sales.js",
  "kreezby-sales-fake-admin.js",
  "patch-turbo-html.py",
  "process-batangas-logos.py",
  "split-stotomas-jma-rosegrace.js",
  "reorganize-retailer-by-location.js",
  "remove-retailer-delivery-history.js",
  "remove-retailer-stocks.js",
  "audit-retailer-errors.js",
  "build-retailer-data.js",
  "patch-manila-retailer-logos.js",
  "patch-lucena-retailer-logos.js",
  "patch-batangas-retailer-logos.js",
  "patch-bauan-retailer-logos.js",
  "patch-tagaytay-retailer-logos.js",
  "patch-lipa-retailer-logos.js",
  "patch-rosario-retailer-logos.js",
  "patch-stotomas-retailer-logos.js",
  "patch-citimart-retailer-logos.js",
];
suspect.forEach((name) => {
  console.log(mentions(name), name);
});
