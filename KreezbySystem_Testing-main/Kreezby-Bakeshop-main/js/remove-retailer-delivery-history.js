/**
 * Remove embedded Delivery history block from retailer dashboard HTML.
 * Run: node js/remove-retailer-delivery-history.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'retailer');

const DELIVERY_BLOCK_RE =
    /[\s\n]*<p style="margin:12px 0 0;font-size:12px;color:#666;">Full details: <a href="saleslist-[^"]+\.html">Open sales list page<\/a><\/p>[\s\S]*?<p style="margin:12px 0 0;font-size:12px;color:#666;">Full details: <a href="saleslist-[^"]+\.html">Open sales list page<\/a><\/p>\s*/g;

const SALES_RETAILER_SCRIPT_RE = /\s*<script src="[^"]*kreezby-sales-retailer\.js[^"]*"><\/script>\s*/gi;
const SALES_RENDERER_SCRIPT_RE = /\s*<script src="[^"]*sales-list-renderer\.js[^"]*"><\/script>\s*/gi;

function walk(dir, fn) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full, fn);
        else if (ent.isFile() && /^retailer-.+\.html$/i.test(ent.name)) fn(full);
    }
}

let updated = 0;

walk(ROOT, function (filePath) {
    let html = fs.readFileSync(filePath, 'utf8');
    const before = html;
    html = html.replace(DELIVERY_BLOCK_RE, '\n');
    html = html.replace(SALES_RETAILER_SCRIPT_RE, '\n');
    html = html.replace(SALES_RENDERER_SCRIPT_RE, '\n');
    if (html !== before) {
        fs.writeFileSync(filePath, html, 'utf8');
        updated += 1;
    }
});

console.log('Retailer dashboard files updated (delivery history removed):', updated);
