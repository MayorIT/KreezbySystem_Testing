/**
 * Sync retailer PO/Receiving/Back Order pages with shared portal JS + table layout.
 * Run: node js/patch-po-receive-portals.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORTAL_VERSION = '3';
const BO_VERSION = '1';

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, c) { fs.writeFileSync(p, c, 'utf8'); }

const PO_BRIDGE = `<script>
function switchToDetailsViewPane(poCode){if(window.PoAdmin&&PoAdmin.openDetails)PoAdmin.openDetails(poCode);}
function switchToMasterListsPane(){if(window.PoAdmin&&PoAdmin.backToList)PoAdmin.backToList();}
function togglePurchaseOrderFormModal(shouldDisplay,poCode){if(window.PoAdmin){shouldDisplay?PoAdmin.openEditModal(poCode||null):PoAdmin.closeModal();}}
</script>
<div id="po-print-receipt-root" class="po-print-receipt-root" aria-hidden="true"></div>
<script src="../../js/po-admin.js?v=${PORTAL_VERSION}"></script>`;

const RECV_BRIDGE = `<script>
function toggleCreateReceivedModal(shouldDisplay,receiptId){if(window.ReceiveAdmin){shouldDisplay?ReceiveAdmin.openEditModal(receiptId||null):ReceiveAdmin.closeModal();}}
function switchToReceivedDetailsInspectorSheet(id){if(window.ReceiveAdmin)ReceiveAdmin.openDetails(id);}
function switchToReceivedMasterListingView(){if(window.ReceiveAdmin)ReceiveAdmin.backToList();}
</script>
<div id="recv-print-root" class="recv-print-root" aria-hidden="true"></div>
<script src="../../js/receive-admin.js?v=${PORTAL_VERSION}"></script>`;

const PO_TABLE = `<div class="po-table-scroll-wrap">
                        <table class="data-display-table">
                            <thead>
                                <tr data-kreezby-portal-head="1">
                                    <th>#</th><th>Date Created</th><th>PO Code</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>`;

const BO_BRIDGE = `<script>
function switchToBackOrderDetailsInspector(code){if(window.BoAdmin)BoAdmin.openDetails(code);}
function switchToBackOrderMasterDashboardView(){if(window.BoAdmin)BoAdmin.backToList();}
</script>
<div id="bo-print-root" class="bo-print-root" aria-hidden="true"></div>
<script src="../../js/bo-admin.js?v=${BO_VERSION}"></script>`;

const BO_TABLE = `<div class="po-table-scroll-wrap">
                        <table class="data-display-table">
                            <thead>
                                <tr data-kreezby-portal-head="1">
                                    <th>#</th><th>Date Created</th><th>BO Code</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>`;

const RECV_TABLE = `<div class="po-table-scroll-wrap">
                        <table class="data-display-table">
                            <thead>
                                <tr data-kreezby-portal-head="1">
                                    <th>#</th><th>Date Received</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th><th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>`;

function setBodyPortalAttr(html, portalAttr) {
    if (html.includes('data-kreezby-portal=')) {
        return html.replace(/data-kreezby-portal="[^"]*"/, 'data-kreezby-portal="' + portalAttr + '"');
    }
    return html.replace(/<body(\s[^>]*)?>/i, function (match) {
        if (match.indexOf('data-kreezby-portal') >= 0) return match;
        return '<body data-kreezby-portal="' + portalAttr + '">';
    });
}

function replaceTableInBlock(html, blockId, tableMarkup) {
    const blockIdx = html.indexOf('id="' + blockId + '"');
    if (blockIdx < 0) return html;

    const afterBlock = html.slice(blockIdx);
    const wrapIdx = afterBlock.indexOf('<div class="po-table-scroll-wrap">');
    const tableIdx = afterBlock.indexOf('<table class="data-display-table">');
    if (tableIdx < 0) return html;

    const startInHtml = blockIdx + (wrapIdx >= 0 && wrapIdx < tableIdx ? wrapIdx : tableIdx);
    let endInHtml = html.indexOf('</table>', startInHtml);
    if (endInHtml < 0) return html;
    endInHtml += '</table>'.length;
    if (html.slice(startInHtml, endInHtml).indexOf('po-table-scroll-wrap') >= 0) {
        const wrapEnd = html.indexOf('</div>', endInHtml);
        if (wrapEnd >= 0 && wrapEnd - endInHtml < 30) endInHtml = wrapEnd + '</div>'.length;
    }

    return html.slice(0, startInHtml) + tableMarkup + html.slice(endInHtml);
}

function stripPortalScripts(html, kind) {
    const markers = {
        po: 'po-admin.js',
        receive: 'receive-admin.js',
        bo: 'bo-admin.js'
    };
    const marker = markers[kind] || markers.po;
    let out = html
        .replace(/<script>\s*function switchToDetailsViewPane[\s\S]*?<\/script>\s*/gi, '')
        .replace(/<script>\s*function toggleCreateReceivedModal[\s\S]*?<\/script>\s*/gi, '')
        .replace(/<script>\s*function togglePurchaseOrderFormModal[\s\S]*?<\/script>\s*/gi, '')
        .replace(/<script>\s*function switchToBackOrderDetailsInspector[\s\S]*?<\/script>\s*/gi, '')
        .replace(new RegExp('<script[^>]*src="[^"]*' + marker.replace('.', '\\.') + '[^"]*"[^>]*>\\s*</script>\\s*', 'gi'), '')
        .replace(/<div id="po-print-receipt-root"[^>]*><\/div>\s*/gi, '')
        .replace(/<div id="recv-print-root"[^>]*><\/div>\s*/gi, '')
        .replace(/<div id="bo-print-root"[^>]*><\/div>\s*/gi, '');
    return out;
}

function ensurePortalScripts(html, kind) {
    const bridges = { po: PO_BRIDGE, receive: RECV_BRIDGE, bo: BO_BRIDGE };
    const markers = { po: 'po-admin.js', receive: 'receive-admin.js', bo: 'bo-admin.js' };
    const bridge = bridges[kind] || bridges.po;
    const marker = markers[kind] || markers.po;
    let out = stripPortalScripts(html, kind);

    const sidebarTag = '<script src="../../js/sidebar-toggle.js"></script>';
    if (out.includes(sidebarTag)) {
        out = out.replace(sidebarTag, bridge + '\n' + sidebarTag);
    } else {
        out = out.replace('</body>', bridge + '\n' + sidebarTag + '\n</body>');
    }

    if (!out.includes(marker)) {
        out = out.replace('</body>', bridge + '\n</body>');
    }

    out = out.replace(/<!-- kreezby-(po|bo)-portal-patched[^>]*-->\s*/g, '');
    const comment = kind === 'bo'
        ? '<!-- kreezby-bo-portal-patched-v' + BO_VERSION + ' -->'
        : '<!-- kreezby-po-portal-patched-v' + PORTAL_VERSION + ' -->';
    out = out.replace('</body>', comment + '\n</body>');
    return out;
}

function patchCreateButtons(html, blockId) {
    const re = new RegExp(
        '(id="' + blockId + '"[\\s\\S]*?<button class="btn-call-to-action")([^>]*)(>\\+ Create New[^<]*</button>)',
        'i'
    );
    return html.replace(re, function (_m, prefix, attrs, suffix) {
        let clean = attrs.replace(/\s*onclick="[^"]*"/gi, '');
        if (clean.indexOf('type=') < 0) clean += ' type="button"';
        return prefix + clean + suffix;
    });
}

function patchRetailerPoFile(filePath) {
    let html = read(filePath);
    const before = html;

    html = setBodyPortalAttr(html, 'retailer-po');
    html = replaceTableInBlock(html, 'po-retailer-directory-block', PO_TABLE);
    html = patchCreateButtons(html, 'po-retailer-directory-block');
    html = ensurePortalScripts(html, 'po');

    if (html !== before) write(filePath, html);
    return html !== before;
}

function patchRetailerReceiveFile(filePath) {
    let html = read(filePath);
    const before = html;

    html = setBodyPortalAttr(html, 'retailer-receive');
    html = replaceTableInBlock(html, 'receiving-retailer-directory-panel-view', RECV_TABLE);
    html = patchCreateButtons(html, 'receiving-retailer-directory-panel-view');
    html = ensurePortalScripts(html, 'receive');

    if (html !== before) write(filePath, html);
    return html !== before;
}

function patchRetailerBoFile(filePath) {
    let html = read(filePath);
    const before = html;

    html = setBodyPortalAttr(html, 'retailer-bo');
    html = replaceTableInBlock(html, 'bo-retailer-dashboard-view', BO_TABLE);
    html = ensurePortalScripts(html, 'bo');

    if (html !== before) write(filePath, html);
    return html !== before;
}

function walkRetailer(dir, kind, prefix) {
    const patchers = {
        po: patchRetailerPoFile,
        receive: patchRetailerReceiveFile,
        bo: patchRetailerBoFile
    };
    let count = 0;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) count += walkRetailer(full, kind, prefix);
        else if (ent.isFile() && ent.name.startsWith(prefix) && ent.name.endsWith('.html')) {
            const patcher = patchers[kind];
            if (patcher && patcher(full)) count += 1;
        }
    }
    return count;
}

const poCount = walkRetailer(path.join(ROOT, 'retailer'), 'po', 'po-');
const recvCount = walkRetailer(path.join(ROOT, 'retailer'), 'receive', 'receive-');
const boCount = walkRetailer(path.join(ROOT, 'retailer'), 'bo', 'bo-');
console.log('Retailer PO pages updated:', poCount);
console.log('Retailer receive pages updated:', recvCount);
console.log('Retailer back order pages updated:', boCount);
