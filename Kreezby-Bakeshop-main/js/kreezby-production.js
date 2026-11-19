/**
 * Inventory > Production (head admin, admin and staff).
 *
 * Raw materials come off the Inventory automatically, batch by batch:
 *  1. Recipe per batch (head admin / admin): for each flavor, the raw materials one batch uses and
 *     about how many pouches it makes.
 *  2. Prepare batch: when the ingredients are put in the container, pick the flavor and how many
 *     batches. The system checks there is enough of every ingredient, takes them off the Inventory
 *     and gives the container a batch number (status: In production).
 *  3. Finish batch: after baking and packing, type how many pouches came out. They are added to
 *     the finished stock with their produced and expiry dates (pouches and stickers are taken off
 *     as with Add stock), and expected vs actual yield is kept.
 *  Cancel returns the ingredients of a batch that was not mixed yet.
 *
 * Saved in kreezby_production_v1 (shared through the database like the rest of the stock data).
 * Stock itself is still recorded by kreezby-data-dictionary.js, so the Inventory, Stocks, Alerts
 * and movement history all stay in step.
 */
(function () {
    'use strict';

    if (window.KreezbyProduction) return;

    var KEY = 'kreezby_production_v1';
    var UNITS = ['kg', 'g', 'L', 'mL', 'pcs', 'pack', 'tray', 'cup', 'tbsp', 'tsp'];
    var view = { recipeFor: '', finishId: '', note: '', noteKind: '' };

    function dict() { return window.KreezbyDictionary || null; }

    function readState() {
        var st = null;
        try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
        if (!st || typeof st !== 'object') st = {};
        if (!st.recipes || typeof st.recipes !== 'object') st.recipes = {};
        if (!st.units || typeof st.units !== 'object') st.units = {};
        if (!Array.isArray(st.batches)) st.batches = [];
        return st;
    }
    function writeState(st) {
        try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage full */ }
    }

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
    function round(n) { return Math.round(n * 1000) / 1000; }
    function fmt(n) { return String(round(n)); }
    function peso(n) { return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function todayIso() {
        var d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function stamp(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    function actor() {
        var d = dict();
        if (d && typeof d.movementActor === 'function') return d.movementActor();
        try { var s = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}; return s.userName || s.identity || 'Unknown account'; } catch (e) { return 'Unknown account'; }
    }

    function pagePath() { return String(location.pathname || '').replace(/\\/g, '/').toLowerCase(); }
    // Head admin and admin set the recipes; head admin, admin and staff prepare and finish batches.
    function canEditRecipes() {
        var p = pagePath();
        return p.indexOf('/admin/') >= 0 || p.indexOf('/head_admin/') >= 0 || p.indexOf('/admin_names/') >= 0;
    }

    function products() {
        var d = dict();
        return d && typeof d.productCatalog === 'function' ? d.productCatalog() : [];
    }
    function productName(id) {
        var hit = products().filter(function (p) { return p.id === id; })[0];
        return hit ? hit.name : id;
    }
    function rawMaterials() {
        var d = dict();
        var list = d && typeof d.materials === 'function' ? d.materials() : [];
        return list.filter(function (m) { return !m.packaging; });
    }
    function materialById(id) {
        var d = dict();
        var list = d && typeof d.materials === 'function' ? d.materials() : [];
        return list.filter(function (m) { return m.material_id === id; })[0] || null;
    }
    function unitFor(materialId) { return readState().units[materialId] || ''; }
    function unitCost(materialId) {
        var d = dict();
        return d && typeof d.materialUnitCost === 'function' ? num(d.materialUnitCost(materialId)) : 0;
    }

    // Ingredients and cost for a number of batches of a flavor.
    function plan(productId, count) {
        var recipe = readState().recipes[productId];
        if (!recipe || !recipe.items || !recipe.items.length) return null;
        var lines = recipe.items.map(function (item) {
            var m = materialById(item.material_id);
            var need = round(num(item.qty) * count);
            var have = m ? m.stock : 0;
            var cost = unitCost(item.material_id) * need;
            return { material_id: item.material_id, name: m ? m.name : item.name, need: need, have: have, unit: unitFor(item.material_id), short: need > have, cost: cost };
        });
        var cost = lines.reduce(function (t, l) { return t + l.cost; }, 0);
        var expected = Math.round(num(recipe.yield) * count);
        return { lines: lines, expected: expected, cost: cost, perPouch: expected ? cost / expected : 0, short: lines.filter(function (l) { return l.short; }) };
    }

    // How many full batches the raw materials on hand can make.
    function batchesPossible(productId) {
        var recipe = readState().recipes[productId];
        if (!recipe || !recipe.items || !recipe.items.length) return null;
        var most = Infinity;
        recipe.items.forEach(function (item) {
            var per = num(item.qty);
            if (!(per > 0)) return;
            var m = materialById(item.material_id);
            most = Math.min(most, Math.floor((m ? m.stock : 0) / per + 1e-9));
        });
        return most === Infinity ? 0 : most;
    }

    function batchNumber(productId) {
        var flavor = String(productId || '').split('-')[1] || 'BCH';
        var day = todayIso().replace(/-/g, '');
        var used = readState().batches.filter(function (b) { return b.number.indexOf('PRD-' + day + '-' + flavor + '-') === 0; }).length;
        return 'PRD-' + day + '-' + flavor + '-' + (used + 1);
    }

    // ---------- Actions ----------
    function prepare(productId, count) {
        var d = dict();
        if (!d || typeof d.recordMaterialMovement !== 'function') return { ok: false, message: 'The stock data is still loading. Try again in a moment.' };
        count = Math.floor(num(count));
        if (!(count >= 1)) return { ok: false, message: 'Enter how many batches (1 or more).' };
        var p = plan(productId, count);
        if (!p) return { ok: false, message: 'There is no recipe for ' + productName(productId) + ' yet. ' + (canEditRecipes() ? 'Set it in Recipes per batch below.' : 'Ask head admin or admin to set it.') };
        if (p.short.length) {
            return { ok: false, message: 'Not enough ingredients: ' + p.short.map(function (l) {
                return l.name + ' needs ' + fmt(l.need) + (l.unit ? ' ' + l.unit : '') + ', has ' + fmt(l.have);
            }).join('; ') + '. Add stock first.' };
        }
        var number = batchNumber(productId);
        var name = productName(productId);
        var done = [];
        for (var i = 0; i < p.lines.length; i++) {
            var line = p.lines[i];
            if (!(line.need > 0)) continue;
            var after = d.recordMaterialMovement(line.name, 'usage', line.need, 'Prepared batch ' + number + ' (' + name + ' × ' + count + ')', 'raw');
            if (after == null) {
                // Put back what was already taken, so nothing is half-deducted.
                done.forEach(function (x) { d.recordMaterialMovement(x.name, 'stock-in', x.need, 'Returned: batch ' + number + ' could not be prepared', 'raw'); });
                return { ok: false, message: (d.lastMovementError && d.lastMovementError()) || ('Could not take ' + line.name + ' off the Inventory.') };
            }
            done.push(line);
        }
        var st = readState();
        st.batches.push({
            id: 'prd-' + Date.now(),
            number: number,
            product_id: productId,
            product_name: name,
            count: count,
            status: 'prepared',
            items: p.lines.map(function (l) { return { material_id: l.material_id, name: l.name, qty: l.need, unit: l.unit }; }),
            expected: p.expected,
            cost: Math.round(p.cost * 100) / 100,
            preparedAt: new Date().toISOString(),
            preparedBy: actor()
        });
        writeState(st);
        return { ok: true, message: number + ' prepared: ' + name + ' × ' + count + '. Ingredients taken off the Inventory: '
            + p.lines.map(function (l) { return fmt(l.need) + (l.unit ? ' ' + l.unit : '') + ' ' + l.name; }).join(', ') + '. Write ' + number + ' on the container.' };
    }

    function finish(id, fields) {
        var d = dict();
        var st = readState();
        var b = st.batches.filter(function (x) { return x.id === id; })[0];
        if (!b || b.status !== 'prepared') return { ok: false, message: 'This batch is no longer in production.' };
        var made = Math.floor(num(fields.made));
        if (!(made >= 0) || String(fields.made).trim() === '') return { ok: false, message: 'Enter how many pouches came out (0 if none).' };
        if (made > 0) {
            if (!d || typeof d.addProductBatch !== 'function') return { ok: false, message: 'The stock data is still loading. Try again in a moment.' };
            var after = d.addProductBatch(b.product_name, {
                batch_number: b.number,
                production_date: fields.produced,
                expiration_date: fields.expires,
                quantity: made,
                use_packaging: fields.usePackaging !== false
            });
            if (after == null) return { ok: false, message: (d.lastStockError && d.lastStockError()) || 'The pouches could not be added.' };
        }
        st = readState();
        b = st.batches.filter(function (x) { return x.id === id; })[0];
        b.status = 'finished';
        b.actual = made;
        b.produced = fields.produced || '';
        b.expires = fields.expires || '';
        b.finishedAt = new Date().toISOString();
        b.finishedBy = actor();
        if (fields.remark) b.remark = String(fields.remark).slice(0, 160);
        writeState(st);
        var diff = made - num(b.expected);
        return { ok: true, message: b.number + ' finished: ' + made + ' pouches of ' + b.product_name + ' added to the Inventory'
            + (b.expected ? ' (expected ' + b.expected + ', ' + (diff === 0 ? 'right on target' : (diff > 0 ? diff + ' more' : (-diff) + ' fewer')) + ').' : '.') };
    }

    function cancel(id, reason) {
        var d = dict();
        var st = readState();
        var b = st.batches.filter(function (x) { return x.id === id; })[0];
        if (!b || b.status !== 'prepared') return { ok: false, message: 'This batch is no longer in production.' };
        if (!d) return { ok: false, message: 'The stock data is still loading. Try again in a moment.' };
        b.items.forEach(function (item) {
            if (num(item.qty) > 0) d.recordMaterialMovement(item.name, 'stock-in', item.qty, 'Returned: batch ' + b.number + ' was cancelled', 'raw');
        });
        st = readState();
        b = st.batches.filter(function (x) { return x.id === id; })[0];
        b.status = 'cancelled';
        b.cancelledAt = new Date().toISOString();
        b.cancelledBy = actor();
        b.remark = String(reason || '').slice(0, 160);
        writeState(st);
        return { ok: true, message: b.number + ' cancelled. Its ingredients were put back on the Inventory.' };
    }

    function saveRecipe(productId, yieldPouches, items) {
        if (!canEditRecipes()) return { ok: false, message: 'Only head admin and admin can change recipes.' };
        var y = Math.floor(num(yieldPouches));
        if (!(y >= 1)) return { ok: false, message: 'Enter about how many pouches one batch makes.' };
        var clean = [];
        var seen = {};
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (!it.material_id) continue;
            var q = num(it.qty);
            if (!(q > 0)) return { ok: false, message: 'Enter an amount above 0 for every ingredient (or remove the row).' };
            if (seen[it.material_id]) return { ok: false, message: 'Each ingredient can be listed once.' };
            seen[it.material_id] = true;
            var m = materialById(it.material_id);
            clean.push({ material_id: it.material_id, name: m ? m.name : it.name, qty: round(q) });
        }
        if (!clean.length) return { ok: false, message: 'Add at least one ingredient.' };
        var st = readState();
        st.recipes[productId] = { yield: y, items: clean, updatedAt: new Date().toISOString(), updatedBy: actor() };
        items.forEach(function (it) {
            if (it.material_id && it.unit) st.units[it.material_id] = String(it.unit).slice(0, 12);
        });
        writeState(st);
        return { ok: true, message: 'Recipe for ' + productName(productId) + ' saved: ' + clean.length + ' ingredients, about ' + y + ' pouches per batch.' };
    }

    // ---------- Look ----------
    function injectStyle() {
        if (document.getElementById('kz-production-style')) return;
        var st = document.createElement('style');
        st.id = 'kz-production-style';
        st.textContent = ''
            + '#stocks-production-host{display:flex;flex-direction:column;gap:16px;padding:4px 0 8px;}'
            + '#stocks-production-host[hidden]{display:none!important;}'
            + '.kzp-lead{margin:0;color:#7d726c;font-size:13px;line-height:1.55;max-width:900px;}'
            + '.kzp-card{border:1px solid #efe6df;border-radius:14px;background:#fff;padding:16px 18px;}'
            + '.kzp-card h4{margin:0 0 4px;font-size:15px;color:#3d2c2a;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}'
            + '.kzp-card h4 .kzp-pill{font-size:11px;}'
            + '.kzp-sub{margin:0 0 12px;color:#8a817c;font-size:12.5px;line-height:1.5;}'
            + '.kzp-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;}'
            + '.kzp-field{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:#5d4037;text-transform:uppercase;letter-spacing:.03em;min-width:150px;}'
            + '.kzp-field input,.kzp-field select{height:40px;padding:0 10px;border:1px solid #d7ccc8;border-radius:10px;font:inherit;font-size:14px;text-transform:none;letter-spacing:0;color:#2b241f;background:#fff;box-sizing:border-box;}'
            + '.kzp-field input:focus,.kzp-field select:focus{outline:2px solid #ffca28;border-color:#ffca28;}'
            + '.kzp-btn{height:40px;padding:0 18px;border:0;border-radius:10px;background:#3d2c2a;color:#fff;font:inherit;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;}'
            + '.kzp-btn[disabled]{opacity:.5;cursor:not-allowed;}'
            + '.kzp-btn.alt{background:#fff;color:#5d4037;border:1px solid #d7ccc8;}'
            + '.kzp-btn.warn{background:#fff;color:#c62828;border:1px solid #f3c1bd;}'
            + '.kzp-btn.small{height:32px;padding:0 12px;font-size:12.5px;}'
            + '.kzp-note{margin:0;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:600;line-height:1.5;}'
            + '.kzp-note.ok{background:#e8f5e9;color:#2e7d32;}.kzp-note.err{background:#ffebee;color:#c62828;}'
            + '.kzp-table{width:100%;border-collapse:collapse;font-size:13.5px;}'
            + '.kzp-table th{background:#fbf6f2;color:#5d4037;font-size:11.5px;text-transform:uppercase;letter-spacing:.03em;text-align:left;padding:9px 10px;white-space:nowrap;}'
            + '.kzp-table td{padding:9px 10px;border-top:1px solid #f1e9e3;vertical-align:middle;}'
            + '.kzp-table .n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;}'
            + '.kzp-table tr.is-short td{background:#fff5f5;}'
            + '.kzp-table tr.is-short td.n:nth-child(2){color:#c62828;font-weight:800;}'
            + '.kzp-scroll{overflow-x:auto;border:1px solid #efe6df;border-radius:12px;}'
            + '.kzp-pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:800;white-space:nowrap;}'
            + '.kzp-pill.prepared{background:#fff8e1;color:#8d6e00;}.kzp-pill.finished{background:#e8f5e9;color:#2e7d32;}.kzp-pill.cancelled{background:#f5f1ee;color:#8d6e63;}'
            + '.kzp-pill.short{background:#ffebee;color:#c62828;}.kzp-pill.okay{background:#e8f5e9;color:#2e7d32;}'
            + '.kzp-summary{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 12px;}'
            + '.kzp-stat{padding:8px 12px;border-radius:10px;background:#fffaf4;border:1px solid #efe6df;font-size:12px;color:#7d726c;}'
            + '.kzp-stat strong{display:block;font-size:16px;color:#3d2c2a;}'
            + '.kzp-empty{margin:0;padding:14px;border:1px dashed #e0d6ce;border-radius:12px;color:#8d6e63;text-align:center;font-size:13px;}'
            + '.kzp-finish{margin-top:8px;padding:12px;border:1px solid #f3dca4;border-radius:12px;background:#fffdf5;}'
            + '.kzp-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#5d4037;font-weight:600;}'
            + '.kzp-recipe-row td{padding:6px 8px;}'
            + '.kzp-recipe-row input,.kzp-recipe-row select{height:36px;width:100%;box-sizing:border-box;padding:0 8px;border:1px solid #d7ccc8;border-radius:8px;font:inherit;font-size:13.5px;}'
            + '.kzp-x{border:0;background:transparent;color:#c62828;font-size:18px;cursor:pointer;padding:0 6px;}'
            + '@media (max-width:720px){.kzp-field{min-width:0;flex:1 1 140px;}.kzp-card{padding:14px;}}';
        (document.head || document.documentElement).appendChild(st);
    }

    function noteHtml() {
        return view.note ? '<p class="kzp-note ' + (view.noteKind || 'ok') + '" role="status">' + esc(view.note) + '</p>' : '';
    }

    function prepareCard() {
        var list = products();
        var st = readState();
        var pick = view.preparePick && list.some(function (p) { return p.id === view.preparePick; }) ? view.preparePick : (list[0] && list[0].id);
        view.preparePick = pick;
        var count = Math.max(1, Math.floor(num(view.prepareCount) || 1));
        var p = pick ? plan(pick, count) : null;
        var body;
        if (!pick) body = '<p class="kzp-empty">No products yet.</p>';
        else if (!p) body = '<p class="kzp-empty">There is no recipe for ' + esc(productName(pick)) + ' yet. '
            + (canEditRecipes() ? 'Set it in <strong>Recipes per batch</strong> below, then prepare the batch here.' : 'Ask head admin or admin to set it in Production › Recipes per batch.') + '</p>';
        else {
            body = '<div class="kzp-summary">'
                + '<div class="kzp-stat"><strong>' + p.expected + '</strong>expected pouches</div>'
                + '<div class="kzp-stat"><strong>' + peso(p.cost) + '</strong>ingredient cost</div>'
                + '<div class="kzp-stat"><strong>' + (p.expected ? peso(p.perPouch) : '—') + '</strong>per pouch</div>'
                + '<div class="kzp-stat"><strong>' + batchesPossible(pick) + '</strong>batches possible with stock on hand</div>'
                + '</div>'
                + '<div class="kzp-scroll"><table class="kzp-table"><thead><tr><th>Ingredient</th><th class="n">Needed</th><th class="n">On hand</th><th class="n">After</th><th></th></tr></thead><tbody>'
                + p.lines.map(function (l) {
                    var u = l.unit ? ' ' + esc(l.unit) : '';
                    return '<tr class="' + (l.short ? 'is-short' : '') + '"><td>' + esc(l.name) + '</td><td class="n">' + fmt(l.need) + u + '</td><td class="n">' + fmt(l.have) + u + '</td><td class="n">' + (l.short ? '—' : fmt(l.have - l.need) + u) + '</td>'
                        + '<td>' + (l.short ? '<span class="kzp-pill short">Not enough</span>' : '<span class="kzp-pill okay">OK</span>') + '</td></tr>';
                }).join('') + '</tbody></table></div>';
        }
        return '<section class="kzp-card" aria-label="Prepare batch">'
            + '<h4>1 · Prepare batch</h4>'
            + '<p class="kzp-sub">Do this when the ingredients are put in the container. They come off the Inventory right away and the container gets a batch number.</p>'
            + '<div class="kzp-row">'
            + '<label class="kzp-field">Flavor<select data-kzp="prepare-product">' + list.map(function (x) {
                var has = st.recipes[x.id] && st.recipes[x.id].items && st.recipes[x.id].items.length;
                return '<option value="' + esc(x.id) + '"' + (x.id === pick ? ' selected' : '') + '>' + esc(x.name) + (has ? '' : ' (no recipe yet)') + '</option>';
            }).join('') + '</select></label>'
            + '<label class="kzp-field" style="min-width:120px;">Batches<input type="number" min="1" step="1" inputmode="numeric" data-kzp="prepare-count" value="' + count + '"></label>'
            + '<button type="button" class="kzp-btn" data-kzp-act="prepare"' + (!p || p.short.length ? ' disabled' : '') + '>Prepare batch</button>'
            + '</div>' + body + '</section>';
    }

    function inProductionCard() {
        var open = readState().batches.filter(function (b) { return b.status === 'prepared'; })
            .sort(function (a, b) { return String(a.preparedAt).localeCompare(String(b.preparedAt)); });
        var rows = open.map(function (b) {
            var finishing = view.finishId === b.id;
            return '<tr><td><strong>' + esc(b.number) + '</strong></td><td>' + esc(b.product_name) + '</td><td class="n">' + b.count + '</td><td class="n">' + (b.expected || '—') + '</td>'
                + '<td>' + esc(stamp(b.preparedAt)) + '<div style="font-size:11.5px;color:#8d6e63;">' + esc(b.preparedBy || '') + '</div></td>'
                + '<td style="white-space:nowrap;"><button type="button" class="kzp-btn small" data-kzp-act="finish-open" data-id="' + esc(b.id) + '">Finish batch</button> '
                + '<button type="button" class="kzp-btn small warn" data-kzp-act="cancel" data-id="' + esc(b.id) + '">Cancel</button></td></tr>'
                + (finishing ? '<tr><td colspan="6"><div class="kzp-finish">'
                    + '<div class="kzp-row">'
                    + '<label class="kzp-field">Pouches made<input type="number" min="0" step="1" inputmode="numeric" data-kzp="finish-made" placeholder="Expected ' + (b.expected || 0) + '"></label>'
                    + '<label class="kzp-field">Produced date<input type="date" data-kzp="finish-produced" value="' + todayIso() + '"></label>'
                    + '<label class="kzp-field">Expiry date<input type="date" data-kzp="finish-expires"></label>'
                    + '<label class="kzp-field" style="min-width:220px;">Remark (optional)<input type="text" maxlength="160" data-kzp="finish-remark" placeholder="e.g. 3 pouches burnt"></label>'
                    + '</div>'
                    + '<div class="kzp-row" style="margin:0;"><label class="kzp-check"><input type="checkbox" data-kzp="finish-pack" checked> Take packaging from stock (1 stand up pouch + 1 sticker per pouch)</label>'
                    + '<span style="flex:1"></span><button type="button" class="kzp-btn alt small" data-kzp-act="finish-close">Close</button>'
                    + '<button type="button" class="kzp-btn" data-kzp-act="finish-save" data-id="' + esc(b.id) + '">Add pouches to Inventory</button></div>'
                    + '</div></td></tr>' : '');
        }).join('');
        return '<section class="kzp-card" aria-label="In production">'
            + '<h4>2 · In production <span class="kzp-pill prepared">' + open.length + '</span></h4>'
            + '<p class="kzp-sub">Containers prepared but not finished yet. After baking and packing, press <strong>Finish batch</strong> and type how many pouches came out. <strong>Cancel</strong> puts the ingredients back (only if the batch was not mixed).</p>'
            + (open.length
                ? '<div class="kzp-scroll"><table class="kzp-table"><thead><tr><th>Batch no.</th><th>Flavor</th><th class="n">Batches</th><th class="n">Expected</th><th>Prepared</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
                : '<p class="kzp-empty">No batch in production.</p>')
            + '</section>';
    }

    function recipesCard() {
        var st = readState();
        var list = products();
        var edit = canEditRecipes();
        var editing = view.recipeFor;
        var rows = list.map(function (p) {
            var r = st.recipes[p.id];
            var has = r && r.items && r.items.length;
            var pl = has ? plan(p.id, 1) : null;
            return '<tr><td><strong>' + esc(p.name) + '</strong></td>'
                + '<td>' + (has ? r.items.map(function (i) { var m = materialById(i.material_id); return esc(fmt(i.qty) + (unitFor(i.material_id) ? ' ' + unitFor(i.material_id) : '') + ' ' + (m ? m.name : i.name)); }).join(', ') : '<span style="color:#8d6e63;">No recipe yet</span>') + '</td>'
                + '<td class="n">' + (has ? r.yield : '—') + '</td>'
                + '<td class="n">' + (pl ? peso(pl.cost) : '—') + '</td>'
                + '<td class="n">' + (has ? batchesPossible(p.id) : '—') + '</td>'
                + '<td>' + (edit ? '<button type="button" class="kzp-btn small alt" data-kzp-act="recipe-open" data-id="' + esc(p.id) + '">' + (has ? 'Edit' : 'Set recipe') + '</button>' : '') + '</td></tr>';
        }).join('');
        var editor = '';
        if (edit && editing) {
            var r = st.recipes[editing] || { yield: '', items: [] };
            var draft = view.recipeDraft && view.recipeDraft.id === editing ? view.recipeDraft : { id: editing, yield: r.yield, items: r.items.map(function (i) { return { material_id: i.material_id, qty: i.qty, unit: unitFor(i.material_id) }; }) };
            if (!draft.items.length) draft.items.push({ material_id: '', qty: '', unit: '' });
            view.recipeDraft = draft;
            var mats = rawMaterials();
            editor = '<div class="kzp-finish" data-kzp="recipe-editor">'
                + '<h4 style="margin:0 0 8px;">Recipe per batch · ' + esc(productName(editing)) + '</h4>'
                + '<p class="kzp-sub">Raw materials put in the container for <strong>one</strong> batch. Amounts are in the unit the material is counted in on the Inventory (the unit you pick is shown next to its stock).</p>'
                + '<div class="kzp-scroll" style="margin-bottom:10px;"><table class="kzp-table"><thead><tr><th style="min-width:200px;">Raw material</th><th style="width:130px;">Amount per batch</th><th style="width:120px;">Unit</th><th style="width:40px;"></th></tr></thead><tbody>'
                + draft.items.map(function (it, i) {
                    return '<tr class="kzp-recipe-row" data-i="' + i + '"><td><select data-kzp="r-mat"><option value="">— choose —</option>' + mats.map(function (m) {
                        return '<option value="' + esc(m.material_id) + '"' + (m.material_id === it.material_id ? ' selected' : '') + '>' + esc(m.name) + '</option>';
                    }).join('') + '</select></td>'
                        + '<td><input type="number" min="0" step="any" data-kzp="r-qty" value="' + esc(it.qty) + '"></td>'
                        + '<td><select data-kzp="r-unit"><option value="">—</option>' + UNITS.map(function (u) { return '<option' + (u === it.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></td>'
                        + '<td><button type="button" class="kzp-x" data-kzp-act="r-remove" title="Remove this ingredient" aria-label="Remove this ingredient">×</button></td></tr>';
                }).join('') + '</tbody></table></div>'
                + '<div class="kzp-row" style="margin:0;"><button type="button" class="kzp-btn alt small" data-kzp-act="r-add">+ Add ingredient</button>'
                + '<label class="kzp-field" style="min-width:170px;">Pouches per batch (about)<input type="number" min="1" step="1" data-kzp="r-yield" value="' + esc(draft.yield) + '"></label>'
                + '<span style="flex:1"></span><button type="button" class="kzp-btn alt" data-kzp-act="recipe-close">Close</button>'
                + '<button type="button" class="kzp-btn" data-kzp-act="recipe-save">Save recipe</button></div>'
                + '</div>';
        }
        return '<section class="kzp-card" aria-label="Recipes per batch" data-kzp="recipes">'
            + '<h4>Recipes per batch</h4>'
            + '<p class="kzp-sub">What one batch of each flavor uses. ' + (edit ? 'Head admin and admin can set and change them.' : 'Set by head admin and admin.') + '</p>'
            + '<div class="kzp-scroll"><table class="kzp-table"><thead><tr><th>Flavor</th><th>Ingredients (1 batch)</th><th class="n">Pouches</th><th class="n">Cost / batch</th><th class="n">Can make</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
            + editor + '</section>';
    }

    function historyCard() {
        var done = readState().batches.filter(function (b) { return b.status !== 'prepared'; })
            .sort(function (a, b) { return String(b.finishedAt || b.cancelledAt).localeCompare(String(a.finishedAt || a.cancelledAt)); }).slice(0, 50);
        return '<section class="kzp-card" aria-label="Production history">'
            + '<h4>Production history</h4>'
            + '<p class="kzp-sub">Finished and cancelled batches, with expected vs actual pouches.</p>'
            + (done.length ? '<div class="kzp-scroll"><table class="kzp-table"><thead><tr><th>Batch no.</th><th>Flavor</th><th>Status</th><th class="n">Expected</th><th class="n">Actual</th><th class="n">Yield</th><th class="n">Cost / pouch</th><th>Finished / cancelled</th><th>Remark</th></tr></thead><tbody>'
                + done.map(function (b) {
                    var y = b.status === 'finished' && b.expected ? Math.round(num(b.actual) / num(b.expected) * 100) + '%' : '—';
                    var cpp = b.status === 'finished' && num(b.actual) > 0 ? peso(num(b.cost) / num(b.actual)) : '—';
                    return '<tr><td><strong>' + esc(b.number) + '</strong></td><td>' + esc(b.product_name) + '</td><td><span class="kzp-pill ' + b.status + '">' + (b.status === 'finished' ? 'Finished' : 'Cancelled') + '</span></td>'
                        + '<td class="n">' + (b.expected || '—') + '</td><td class="n">' + (b.status === 'finished' ? b.actual : '—') + '</td><td class="n">' + y + '</td><td class="n">' + cpp + '</td>'
                        + '<td>' + esc(stamp(b.finishedAt || b.cancelledAt)) + '<div style="font-size:11.5px;color:#8d6e63;">' + esc(b.finishedBy || b.cancelledBy || '') + '</div></td>'
                        + '<td>' + esc(b.remark || '') + '</td></tr>';
                }).join('') + '</tbody></table></div>'
                : '<p class="kzp-empty">No finished batches yet.</p>')
            + '</section>';
    }

    var currentHost = null;
    function render(host) {
        host = host || currentHost;
        if (!host) return;
        currentHost = host;
        injectStyle();
        var focusKey = document.activeElement && host.contains(document.activeElement) ? document.activeElement.getAttribute('data-kzp') : '';
        host.innerHTML = '<p class="kzp-lead">Raw materials come off the Inventory automatically: <strong>prepare</strong> a batch when its ingredients go into the container, then <strong>finish</strong> it after baking to add the pouches.</p>'
            + noteHtml() + prepareCard() + inProductionCard() + recipesCard() + historyCard();
        if (focusKey && focusKey !== 'prepare-product') {
            var again = host.querySelector('[data-kzp="' + focusKey + '"]');
            if (again && again.focus) { try { again.focus(); if (again.select && again.type === 'number') again.select(); } catch (e) { /* ignore */ } }
        }
    }

    function say(text, kind) { view.note = text; view.noteKind = kind || 'ok'; }

    function readDraft(host) {
        var draft = view.recipeDraft;
        if (!draft) return null;
        var rows = host.querySelectorAll('.kzp-recipe-row');
        draft.items = Array.prototype.map.call(rows, function (tr) {
            return {
                material_id: tr.querySelector('[data-kzp="r-mat"]').value,
                qty: tr.querySelector('[data-kzp="r-qty"]').value,
                unit: tr.querySelector('[data-kzp="r-unit"]').value
            };
        });
        var y = host.querySelector('[data-kzp="r-yield"]');
        if (y) draft.yield = y.value;
        return draft;
    }

    function bind(host) {
        if (host.__kzpBound) return;
        host.__kzpBound = true;
        host.addEventListener('change', function (e) {
            var k = e.target.getAttribute('data-kzp');
            if (k === 'prepare-product') { view.preparePick = e.target.value; view.note = ''; render(host); }
            if (k === 'prepare-count') { view.prepareCount = e.target.value; render(host); }
            if (k === 'r-mat') {
                var tr = e.target.closest('.kzp-recipe-row');
                var unitSel = tr && tr.querySelector('[data-kzp="r-unit"]');
                if (unitSel && !unitSel.value && unitFor(e.target.value)) unitSel.value = unitFor(e.target.value);
            }
        });
        host.addEventListener('input', function (e) {
            if (e.target.getAttribute('data-kzp') === 'prepare-count') {
                view.prepareCount = e.target.value;
                clearTimeout(host.__kzpTimer);
                host.__kzpTimer = setTimeout(function () { render(host); }, 350);
            }
        });
        host.addEventListener('click', function (e) {
            var btn = e.target.closest ? e.target.closest('[data-kzp-act]') : null;
            if (!btn) return;
            var act = btn.getAttribute('data-kzp-act');
            var id = btn.getAttribute('data-id');
            var r;
            if (act === 'prepare') {
                var count = host.querySelector('[data-kzp="prepare-count"]').value;
                var pl = plan(view.preparePick, Math.floor(num(count)));
                if (pl && !window.confirm('Prepare ' + productName(view.preparePick) + ' × ' + Math.floor(num(count)) + '?\n\nThese ingredients will be taken off the Inventory now:\n'
                    + pl.lines.map(function (l) { return '• ' + fmt(l.need) + (l.unit ? ' ' + l.unit : '') + ' ' + l.name; }).join('\n'))) return;
                r = prepare(view.preparePick, count);
                say(r.message, r.ok ? 'ok' : 'err');
                if (r.ok) view.prepareCount = 1;
            } else if (act === 'finish-open') { view.finishId = id; view.note = ''; }
            else if (act === 'finish-close') { view.finishId = ''; }
            else if (act === 'finish-save') {
                r = finish(id, {
                    made: host.querySelector('[data-kzp="finish-made"]').value,
                    produced: host.querySelector('[data-kzp="finish-produced"]').value,
                    expires: host.querySelector('[data-kzp="finish-expires"]').value,
                    remark: host.querySelector('[data-kzp="finish-remark"]').value,
                    usePackaging: host.querySelector('[data-kzp="finish-pack"]').checked
                });
                say(r.message, r.ok ? 'ok' : 'err');
                if (r.ok) view.finishId = '';
                else { render(host); return; }
            } else if (act === 'cancel') {
                var b = readState().batches.filter(function (x) { return x.id === id; })[0];
                if (!b) return;
                var reason = window.prompt('Cancel ' + b.number + ' (' + b.product_name + ')?\nIts ingredients will be put back on the Inventory. Only do this if the batch was not mixed.\n\nReason:', '');
                if (reason === null) return;
                if (String(reason).trim().length < 3) { say('Type the reason for cancelling the batch.', 'err'); render(host); return; }
                r = cancel(id, reason);
                say(r.message, r.ok ? 'ok' : 'err');
            } else if (act === 'recipe-open') { view.recipeFor = id; view.recipeDraft = null; view.note = ''; }
            else if (act === 'recipe-close') { view.recipeFor = ''; view.recipeDraft = null; }
            else if (act === 'r-add') { readDraft(host); view.recipeDraft.items.push({ material_id: '', qty: '', unit: '' }); }
            else if (act === 'r-remove') {
                readDraft(host);
                var i = Number(btn.closest('.kzp-recipe-row').getAttribute('data-i'));
                view.recipeDraft.items.splice(i, 1);
            } else if (act === 'recipe-save') {
                var d = readDraft(host);
                r = saveRecipe(view.recipeFor, d.yield, d.items);
                say(r.message, r.ok ? 'ok' : 'err');
                if (r.ok) { view.recipeFor = ''; view.recipeDraft = null; view.preparePick = d.id; }
            }
            render(host);
            if (act === 'prepare' || act === 'finish-save' || act === 'cancel' || act === 'recipe-save') {
                try { document.dispatchEvent(new CustomEvent('kreezby:stocks-sync')); } catch (err) { /* optional */ }
                var top = host.querySelector('.kzp-note');
                if (top && top.scrollIntoView) top.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
            if (act === 'recipe-open') {
                var ed = host.querySelector('[data-kzp="recipe-editor"]');
                if (ed && ed.scrollIntoView) ed.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        });
    }

    function mount(host) {
        if (!host) return;
        bind(host);
        // Already showing and something is being typed: keep it (stock updates redraw later).
        if (host.__kzpDrawn && host === currentHost && host.firstChild) {
            if (view.finishId || view.recipeFor) return;
            var a = document.activeElement;
            if (a && host.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
        }
        host.__kzpDrawn = true;
        render(host);
    }

    // Another account prepared, finished or cancelled a batch, or stock changed: redraw (unless
    // a form is being filled in on this screen).
    function refreshIfQuiet() {
        if (!currentHost || currentHost.hidden || !document.body.contains(currentHost)) return;
        if (view.finishId || view.recipeFor) return;
        var a = document.activeElement;
        if (a && currentHost.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
        render(currentHost);
    }
    document.addEventListener('kreezby:remote-state', refreshIfQuiet);
    window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY || e.key === 'kreezby_data_dictionary_v1') refreshIfQuiet(); });

    window.KreezbyProduction = {
        mount: mount,
        render: function () { render(); },
        unitFor: unitFor,
        openRecipe: function (productId) { view.recipeFor = productId; view.recipeDraft = null; render(); },
        canEditRecipes: canEditRecipes
    };
})();
