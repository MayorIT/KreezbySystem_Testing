/**
 * Remove Stocks nav links and dashboard cards from all retailer HTML.
 * Delete stocks-*.html page files.
 * Run: node js/remove-retailer-stocks.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'retailer');

const NAV_RE = /<li class="(?:tree-node(?: active)?|menu-node-item)"><a href="stocks-[^"]+\.html">Stocks<\/a><\/li>\s*/gi;
const CARD_RE = /<a class="stat-card[^"]*" href="stocks-[^"]+\.html">[\s\S]*?<div class="stat-title">Stocks<\/div>[\s\S]*?<\/a>\s*/gi;
const INDENT_FIX_RE = /\n<li class="tree-node"/g;
const CARD_INDENT_FIX_RE = /\n<a class="stat-card/g;

function walk(dir, fn) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full, fn);
        else if (ent.isFile() && ent.name.endsWith('.html')) fn(full);
    }
}

let updated = 0;
let deleted = 0;

walk(ROOT, function (filePath) {
    if (/[/\\]stocks-[^/\\]+\.html$/i.test(filePath)) {
        fs.unlinkSync(filePath);
        deleted += 1;
        return;
    }

    let html = fs.readFileSync(filePath, 'utf8');
    const before = html;
    html = html.replace(NAV_RE, '');
    html = html.replace(CARD_RE, '');
    html = html.replace(INDENT_FIX_RE, '\n            <li class="tree-node"');
    html = html.replace(CARD_INDENT_FIX_RE, '\n            <a class="stat-card');
    if (html !== before) {
        fs.writeFileSync(filePath, html, 'utf8');
        updated += 1;
    }
});

console.log('Retailer HTML files updated (stocks removed):', updated);
console.log('Stocks page files deleted:', deleted);
