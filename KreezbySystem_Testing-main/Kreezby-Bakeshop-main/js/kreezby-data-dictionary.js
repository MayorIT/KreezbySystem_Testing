/**
 * Capstone data dictionary (section 3.4) stored in the browser and shown
 * on stocks, alerts, forecasts, sales, and account screens.
 */
(function () {
    'use strict';

    var STORE_KEY = 'kreezby_data_dictionary_v1';
    var SALES_DATES = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];
    var FORECAST_DATE = '2026-09-27';

    var PRODUCTS = [
        { product_id: 'CRK-CHO-P', product_name: 'Chocolate Crinkles', batch_number: 'BCH-2026-0918-CHO', production_date: '2026-09-18', expiration_date: '2026-10-18', expiry_threshold_days: 3, quantities: [100, 120, 110, 130, 140, 150, 160] },
        { product_id: 'CRK-ALM-P', product_name: 'Choco-Almond Crinkles', batch_number: 'BCH-2026-0917-ALM', production_date: '2026-09-17', expiration_date: '2026-10-17', expiry_threshold_days: 3, quantities: [80, 90, 85, 88, 92, 95, 100] },
        { product_id: 'CRK-LEM-P', product_name: 'Lemon Crinkles', batch_number: 'BCH-2026-0920-LEM', production_date: '2026-09-20', expiration_date: '2026-09-30', expiry_threshold_days: 3, quantities: [50, 55, 48, 60, 52, 58, 62] },
        { product_id: 'CRK-BUT-J', product_name: 'Choco Butternut Crinkles', batch_number: 'BCH-2026-0915-BUT', production_date: '2026-09-15', expiration_date: '2026-10-15', expiry_threshold_days: 3, quantities: [70, 75, 80, 72, 78, 74, 76] },
        { product_id: 'CRK-MNG-J', product_name: 'Mango Crinkles', batch_number: 'BCH-2026-0908-MNG', production_date: '2026-09-08', expiration_date: '2026-09-26', expiry_threshold_days: 3, quantities: [30, 32, 34, 36, 38, 40, 42] },
        { product_id: 'CRK-UBE-P', product_name: 'Ube Crinkles', batch_number: 'BCH-2026-0919-UBE', production_date: '2026-09-19', expiration_date: '2026-10-19', expiry_threshold_days: 3, quantities: [40, 42, 44, 46, 48, 50, 52] }
    ];

    var RAW_MATERIALS = [
        { material_id: 'RM-FLR-01', name: 'All-Purpose Flour', current_stock: 120, expiration_date: '2027-03-01', expiry_threshold_days: 7 },
        { material_id: 'RM-COC-01', name: 'Cocoa Powder', current_stock: 45, expiration_date: '2026-12-20', expiry_threshold_days: 7 },
        { material_id: 'RM-SUG-01', name: 'Granulated Sugar', current_stock: 80, expiration_date: '2027-06-01', expiry_threshold_days: 7 },
        { material_id: 'RM-BUT-01', name: 'Unsalted Butter', current_stock: 60, expiration_date: '2026-10-04', expiry_threshold_days: 7 }
    ];

    var PROCUREMENT = [
        { product_id: 'CRK-CHO-P', product_name: 'Chocolate Crinkles', current_stock: 450, recommended_quantity: 400 },
        { product_id: 'CRK-LEM-P', product_name: 'Lemon Crinkles', current_stock: 85, recommended_quantity: 200 },
        { product_id: 'CRK-MNG-J', product_name: 'Mango Crinkles', current_stock: 45, recommended_quantity: 200 },
        { product_id: 'CRK-ALM-P', product_name: 'Choco-Almond Crinkles', current_stock: 320, recommended_quantity: 300 },
        { product_id: 'CRK-BUT-J', product_name: 'Choco Butternut Crinkles', current_stock: 210, recommended_quantity: 200 },
        { product_id: 'CRK-UBE-P', product_name: 'Ube Crinkles', current_stock: 180, recommended_quantity: 200 }
    ];

    function average(list) {
        var sum = 0;
        for (var i = 0; i < list.length; i++) sum += Number(list[i]) || 0;
        return list.length ? Math.round((sum / list.length) * 10) / 10 : 0;
    }

    var FLAVOR_CHOICES = [
        'Chocolate Crinkles',
        'Choco-Almond Crinkles',
        'Choco-Cashew Crinkles',
        'Strawberry Crinkles',
        'Red Velvet Crinkles',
        'Lemon Crinkles',
        'Melon Crinkles',
        'Pandan Crinkles',
        'Ube Crinkles',
        'Mango Crinkles',
        'Choco Butternut Crinkles'
    ];

    function productId(name) {
        var text = String(name || '').toLowerCase();
        if (!text) return '';
        if (text.indexOf('almond') >= 0) return 'CRK-ALM-P';
        if (text.indexOf('cashew') >= 0) return 'CRK-CSH-P';
        if (text.indexOf('butternut') >= 0) return 'CRK-BUT-J';
        if (text.indexOf('strawberry') >= 0) return 'CRK-STR-P';
        if (text.indexOf('velvet') >= 0) return 'CRK-RV-P';
        if (text.indexOf('lemon') >= 0) return 'CRK-LEM-P';
        if (text.indexOf('melon') >= 0) return 'CRK-MEL-P';
        if (text.indexOf('pandan') >= 0) return 'CRK-PAN-P';
        if (text.indexOf('mango') >= 0) return 'CRK-MNG-J';
        if (text.indexOf('ube') >= 0) return 'CRK-UBE-P';
        if (text.indexOf('chocolate') >= 0) return 'CRK-CHO-P';
        return '';
    }

    function productById(id) {
        var products = mergedProducts();
        for (var i = 0; i < products.length; i++) {
            if (products[i].product_id === id) return products[i];
        }
        return null;
    }

    function savedState() {
        return readJson(STORE_KEY, {});
    }

    function writeState(saved) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ }
    }

    function productStockMap() {
        var saved = savedState().product_stock || {};
        var map = {};
        PROCUREMENT.forEach(function (row) {
            map[row.product_id] = saved[row.product_id] != null ? Number(saved[row.product_id]) : row.current_stock;
        });
        Object.keys(saved).forEach(function (id) {
            if (map[id] == null && saved[id] != null) map[id] = Number(saved[id]);
        });
        return map;
    }

    function allMaterials() {
        return RAW_MATERIALS.concat(savedState().materials_extra || []);
    }

    function materialStockMap() {
        var saved = savedState().material_stock || {};
        var map = {};
        allMaterials().forEach(function (row) {
            map[row.material_id] = saved[row.material_id] != null ? Number(saved[row.material_id]) : (Number(row.current_stock) || 0);
        });
        return map;
    }

    function mergedProducts() {
        var edits = savedState().product_edits || {};
        var extra = savedState().products_extra || [];
        return PRODUCTS.map(function (product) {
            return Object.assign({}, product, edits[product.product_id] || {});
        }).concat(extra);
    }

    function materialByName(name) {
        var text = String(name || '').trim().toLowerCase();
        if (!text) return null;
        var list = allMaterials();
        for (var i = 0; i < list.length; i++) {
            if (list[i].name.toLowerCase() === text) return list[i];
        }
        return null;
    }

    function ensureMaterial(name) {
        var existing = materialByName(name);
        if (existing) return existing;
        var trimmed = String(name || '').trim();
        if (!trimmed) return null;
        var id = 'RM-' + trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
        if (!id || id === 'RM-') id = 'RM-' + Date.now();
        var row = { material_id: id, name: trimmed, current_stock: 0, expiration_date: '', expiry_threshold_days: 7 };
        var saved = savedState();
        var extra = saved.materials_extra || [];
        extra.push(row);
        saved.materials_extra = extra;
        writeState(saved);
        return row;
    }

    function liveProcurement() {
        var stock = productStockMap();
        return PROCUREMENT.map(function (row) {
            return {
                product_id: row.product_id,
                product_name: row.product_name,
                current_stock: stock[row.product_id],
                recommended_quantity: row.recommended_quantity
            };
        });
    }

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function salesTransactions() {
        var extra = readJson(STORE_KEY, {}).sales_transactions_extra || [];
        var rows = [];
        PRODUCTS.forEach(function (product) {
            product.quantities.forEach(function (qty, index) {
                rows.push({
                    sales_date: SALES_DATES[index],
                    product_id: product.product_id,
                    quantity_sold: qty
                });
            });
        });
        extra.forEach(function (row) {
            if (row && row.product_id && row.sales_date) rows.push(row);
        });
        return rows;
    }

    function forecasts() {
        return PRODUCTS.map(function (product) {
            var recent = salesTransactions().filter(function (row) {
                return row.product_id === product.product_id;
            }).sort(function (a, b) {
                return String(a.sales_date).localeCompare(String(b.sales_date));
            });
            var windowRows = recent.slice(-7);
            return {
                product_id: product.product_id,
                product_name: product.product_name,
                forecast_date: FORECAST_DATE,
                forecast_value: average(windowRows.map(function (row) { return row.quantity_sold; }))
            };
        });
    }

    function alerts() {
        return [
            { alert_type: 'low_stock', target_role: 'Admin', reference_id: 'CRK-MNG-J', message: 'Mango Crinkles stock is below the reorder point. Current stock: 45 jars.', status: 'pending' },
            { alert_type: 'reorder', target_role: 'Staff', reference_id: 'CRK-LEM-P', message: 'Lemon Crinkles should be reordered. Current stock is 85 pouches against a recommended 200.', status: 'pending' },
            { alert_type: 'near_expiry', target_role: 'Admin', reference_id: 'CRK-LEM-P', message: 'Lemon Crinkles batch BCH-2026-0920-LEM expires on 2026-09-30, inside the 3-day expiry alert.', status: 'pending' },
            { alert_type: 'near_expiry', target_role: 'Staff', reference_id: 'RM-BUT-01', message: 'Unsalted Butter expires on 2026-10-04, inside the 7-day ingredient alert.', status: 'pending' },
            { alert_type: 'expired', target_role: 'Admin', reference_id: 'CRK-MNG-J', message: 'Mango Crinkles batch BCH-2026-0908-MNG expired on 2026-09-26 and cannot be sold.', status: 'pending' },
            { alert_type: 'price_change', target_role: 'Retailer', reference_id: 'CRK-CHO-P', message: 'Chocolate Crinkles price was updated for retailer accounts.', status: 'acknowledged' },
            { alert_type: 'new_product', target_role: 'Customer', reference_id: 'CRK-UBE-P', message: 'Ube Crinkles is a newly released flavor.', status: 'resolved' }
        ];
    }

    function users() {
        var source = { admins: [], staff: [], retailers: [], customers: [] };
        if (window.KreezbyMaintenanceSettings && typeof window.KreezbyMaintenanceSettings.getUsers === 'function') {
            source = window.KreezbyMaintenanceSettings.getUsers();
        }
        var rows = [];
        function push(list, role) {
            (list || []).forEach(function (user) {
                rows.push({
                    user_id: user.user_id || user.id,
                    role: role,
                    password_hash: user.password_hash || ('ph_' + (user.user_id || user.id))
                });
            });
        }
        push(source.admins, 'Admin');
        push(source.staff, 'Staff');
        push(source.retailers, 'Retailer');
        push(source.customers, 'Customer');
        return rows;
    }

    function orders() {
        var rows = [];
        readJson('kreezbyOrders', []).forEach(function (order) {
            if (!order) return;
            rows.push({
                order_id: order.orderNumber || order.receiptNumber,
                account_type: order.accountType || 'Regular Customer',
                account_name: order.accountName || '',
                account_area: order.accountArea || '',
                status: order.status || '',
                date: order.date || ''
            });
        });
        var pos = readJson('kreezby-po-orders-v1', {});
        Object.keys(pos || {}).forEach(function (code) {
            var order = pos[code];
            if (!order) return;
            rows.push({
                order_id: order.code || code,
                account_type: order.accountType || '',
                account_name: order.accountName || order.entity || '',
                account_area: order.accountArea || order.area || '',
                status: order.status || '',
                date: order.dateCreated || ''
            });
        });
        return rows;
    }

    var BASE_MOVEMENTS = [
        { type: 'stock-in', reference_id: 'RM-FLR-01', quantity: 25, note: 'Flour delivery received' },
        { type: 'stock-out', reference_id: 'CRK-CHO-P', quantity: 160, note: 'Finished goods sold on 2026-09-26' },
        { type: 'usage', reference_id: 'RM-COC-01', quantity: 4, note: 'Cocoa used in production' },
        { type: 'adjustment', reference_id: 'RM-BUT-01', quantity: -2, note: 'Butter count corrected after inventory check' }
    ];

    function inventoryTransactions() {
        return BASE_MOVEMENTS.concat(savedState().inventory_transactions_extra || []);
    }

    function insightSnapshot() {
        var salesByProduct = {};
        salesTransactions().forEach(function (row) {
            if (!row || !row.product_id) return;
            salesByProduct[row.product_id] = (salesByProduct[row.product_id] || 0) + (Number(row.quantity_sold) || 0);
        });
        var forecastByProduct = {};
        forecasts().forEach(function (row) {
            forecastByProduct[row.product_id] = row.forecast_value;
        });
        var materialStock = materialStockMap();
        return {
            asOf: new Date().toISOString().slice(0, 10),
            products: liveProcurement().map(function (row) {
                return {
                    name: row.product_name,
                    stock: row.current_stock,
                    recommendedStock: row.recommended_quantity,
                    recentSales: salesByProduct[row.product_id] || 0,
                    forecastDemand: forecastByProduct[row.product_id] == null ? null : forecastByProduct[row.product_id]
                };
            }),
            materials: RAW_MATERIALS.map(function (item) {
                return {
                    name: item.name,
                    stock: materialStock[item.material_id],
                    expires: item.expiration_date
                };
            }),
            alerts: alerts().filter(function (alert) {
                return alert.status === 'pending';
            }).map(function (alert) {
                return alert.message;
            })
        };
    }

    function snapshot() {
        var sales = salesTransactions();
        var previous = savedState();
        var materialStock = materialStockMap();
        var data = {
            users: users(),
            products: mergedProducts().map(function (product) {
                return {
                    product_id: product.product_id,
                    product_name: product.product_name,
                    batch_number: product.batch_number,
                    production_date: product.production_date,
                    expiration_date: product.expiration_date,
                    expiry_threshold_days: product.expiry_threshold_days
                };
            }),
            raw_materials: RAW_MATERIALS.map(function (item) {
                return {
                    material_id: item.material_id,
                    name: item.name,
                    current_stock: materialStock[item.material_id],
                    expiration_date: item.expiration_date,
                    expiry_threshold_days: item.expiry_threshold_days
                };
            }),
            inventory_transactions: inventoryTransactions(),
            sales_transactions: sales,
            orders: orders(),
            forecasts: forecasts(),
            alerts: alerts(),
            procurement_recommendations: liveProcurement().map(function (row) {
                var shortage = row.current_stock - row.recommended_quantity;
                return {
                    product_id: row.product_id,
                    product_name: row.product_name,
                    current_stock: row.current_stock,
                    recommended_quantity: row.recommended_quantity,
                    shortage: shortage < 0 ? Math.abs(shortage) : 0
                };
            }),
            audit_logs: readJson('kreezby_login_history', []).slice(0, 20).map(function (log) {
                return {
                    user_id: log.identity || log.userName,
                    action: 'login',
                    at: log.loggedAt || ''
                };
            })
        };
        data.sales_transactions_extra = previous.sales_transactions_extra || [];
        data.inventory_transactions_extra = previous.inventory_transactions_extra || [];
        data.product_stock = productStockMap();
        data.material_stock = materialStock;
        data.product_edits = previous.product_edits || {};
        data.products_extra = previous.products_extra || [];
        writeState(data);
        return data;
    }

    function recordSale(productName, quantity, salesDate) {
        var id = productId(productName);
        if (!id) return null;
        var qty = Number(quantity) || 0;
        var saved = savedState();
        var extra = saved.sales_transactions_extra || [];
        extra.push({
            sales_date: salesDate || FORECAST_DATE,
            product_id: id,
            quantity_sold: qty
        });
        saved.sales_transactions_extra = extra;
        var stock = productStockMap();
        stock[id] = Math.max(0, (Number(stock[id]) || 0) - qty);
        saved.product_stock = stock;
        var moves = saved.inventory_transactions_extra || [];
        moves.push({
            type: 'stock-out',
            reference_id: id,
            quantity: qty,
            note: 'Finished goods sold on ' + (salesDate || FORECAST_DATE)
        });
        saved.inventory_transactions_extra = moves;
        writeState(saved);
        snapshot();
        paintStockCells();
        notifyStocks();
        return stock[id];
    }

    function notifyStocks() {
        try { document.dispatchEvent(new CustomEvent('kreezby:stocks-sync')); } catch (e) { /* ignore */ }
    }

    function setProductStock(productName, quantity) {
        var id = productId(productName);
        if (!id) return null;
        var saved = savedState();
        var stock = productStockMap();
        var next = Math.max(0, Number(quantity) || 0);
        var previous = Number(stock[id]) || 0;
        stock[id] = next;
        saved.product_stock = stock;
        var moves = saved.inventory_transactions_extra || [];
        moves.push({
            type: 'adjustment',
            reference_id: id,
            quantity: next - previous,
            note: 'Finished goods count set to ' + next
        });
        saved.inventory_transactions_extra = moves;
        writeState(saved);
        snapshot();
        paintStockCells();
        notifyStocks();
        return next;
    }

    function recordMaterialMovement(materialName, movementType, quantity) {
        var material = ensureMaterial(materialName);
        if (!material) return null;
        var kind = String(movementType || '').toLowerCase();
        if (kind !== 'stock-in' && kind !== 'stock-out' && kind !== 'usage') return null;
        var qty = Math.abs(Number(quantity) || 0);
        if (!qty) return null;
        var saved = savedState();
        var stock = materialStockMap();
        var current = Number(stock[material.material_id]) || 0;
        stock[material.material_id] = kind === 'stock-in' ? current + qty : Math.max(0, current - qty);
        saved.material_stock = stock;
        var moves = saved.inventory_transactions_extra || [];
        moves.push({
            type: kind,
            reference_id: material.material_id,
            quantity: qty,
            note: material.name + ' ' + kind.replace('-', ' ')
        });
        saved.inventory_transactions_extra = moves;
        writeState(saved);
        snapshot();
        paintStockCells();
        notifyStocks();
        return stock[material.material_id];
    }

    function saveProductFields(productName, fields) {
        var id = productId(productName);
        if (!id) return null;
        var saved = savedState();
        var inCatalog = PRODUCTS.some(function (product) { return product.product_id === id; });
        if (!inCatalog) {
            var extra = saved.products_extra || [];
            var found = null;
            extra.forEach(function (item) {
                if (item.product_id === id) found = item;
            });
            if (!found) {
                found = { product_id: id, product_name: productName, expiry_threshold_days: 3, quantities: [] };
                extra.push(found);
            }
            ['batch_number', 'production_date', 'expiration_date'].forEach(function (key) {
                if (fields && fields[key]) found[key] = String(fields[key]);
            });
            saved.products_extra = extra;
        } else {
            var edits = saved.product_edits || {};
            var current = edits[id] || {};
            ['batch_number', 'production_date', 'expiration_date'].forEach(function (key) {
                if (fields && fields[key]) current[key] = String(fields[key]);
            });
            edits[id] = current;
            saved.product_edits = edits;
        }
        writeState(saved);
        if (fields && fields.current_stock != null && fields.current_stock !== '') {
            setProductStock(productName, fields.current_stock);
        } else {
            snapshot();
            notifyStocks();
        }
        return productById(id);
    }

    function historyFor(name) {
        var id = productId(name);
        var material = materialByName(name);
        var ref = id || (material && material.material_id) || '';
        if (!ref) return [];
        return inventoryTransactions().filter(function (row) {
            return row.reference_id === ref;
        });
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function decorateStocks() {
        if (document.getElementById('stocks-master-list-panel-view')) return;
        document.querySelectorAll('tr.stock-row').forEach(function (row) {
            if (row.querySelector('.dict-fields')) return;
            var cells = row.querySelectorAll('td');
            var nameCell = null;
            var name = '';
            for (var i = 0; i < cells.length; i++) {
                var text = cellLabel(cells[i]);
                if (productId(text) || materialByName(text)) {
                    nameCell = cells[i];
                    name = text;
                    break;
                }
            }
            if (!nameCell) return;
            var product = null;
            mergedProducts().forEach(function (item) {
                if (item.product_name === name) product = item;
            });
            var material = materialByName(name);
            var html = '';
            if (product) {
                html = 'Batch ' + esc(product.batch_number) +
                    '<br>Produced ' + esc(product.production_date) +
                    '<br>Expires ' + esc(product.expiration_date) +
                    '<br>Expiry alert: ' + esc(product.expiry_threshold_days) + ' days';
            } else if (material) {
                html = 'Expires ' + esc(material.expiration_date) +
                    '<br>Expiry alert: ' + esc(material.expiry_threshold_days) + ' days';
            }
            if (!html) return;
            var note = document.createElement('div');
            note.className = 'dict-fields';
            note.style.cssText = 'font-size:12px;color:#5d4037;margin-top:4px;line-height:1.45;font-weight:500;';
            note.innerHTML = html;
            nameCell.appendChild(note);
        });
    }

    function alertMatch(message) {
        var text = String(message || '').toLowerCase();
        if (text.indexOf('mango') >= 0 && text.indexOf('threshold') >= 0) return alerts()[0];
        if (text.indexOf('lemon') >= 0) return alerts()[1];
        return null;
    }

    function decorateAlerts() {
        var tables = document.querySelectorAll('table');
        tables.forEach(function (table) {
            var head = (table.querySelector('thead') || {}).textContent || '';
            if (head.indexOf('Alert Message') < 0) return;
            var body = table.querySelector('tbody');
            if (!body || body.querySelector('.dict-alert')) return;
            Array.prototype.forEach.call(body.rows, function (row) {
                var cells = row.cells;
                if (!cells || cells.length < 4) return;
                var message = (cells[3].textContent || '').trim();
                var match = alertMatch(message);
                if (!match) return;
                var note = document.createElement('div');
                note.className = 'dict-alert';
                note.style.cssText = 'font-size:12px;color:#5d4037;margin-top:4px;line-height:1.45;';
                note.textContent = match.alert_type + ' · ' + match.target_role + ' · ' + match.reference_id + ' · ' + match.status;
                cells[3].appendChild(note);
            });
            if (table.id === 'alert-table') {
                if (window.AlertAdmin && window.AlertAdmin.filter) window.AlertAdmin.filter();
                return;
            }
            alerts().forEach(function (alert) {
                if (body.textContent.indexOf(alert.alert_type) >= 0 && body.textContent.indexOf(alert.reference_id) >= 0) return;
                var row = document.createElement('tr');
                row.innerHTML = '<td>' + (body.rows.length + 1) + '</td><td>' + esc(FORECAST_DATE) + '</td><td><strong>' + esc(alert.reference_id) + '</strong></td><td>' + esc(alert.message) + '<div class="dict-alert" style="font-size:12px;color:#5d4037;margin-top:4px;">' + esc(alert.alert_type) + ' · ' + esc(alert.target_role) + ' · ' + esc(alert.reference_id) + ' · ' + esc(alert.status) + '</div></td><td style="text-align:center;">' + esc(alert.status) + '</td><td></td>';
                var actionCell = row.cells[row.cells.length - 1];
                var button = document.createElement('button');
                button.type = 'button';
                button.textContent = alert.status === 'resolved' ? 'Resolved' : 'Acknowledge';
                button.style.cssText = 'border:0;border-radius:999px;padding:6px 10px;background:#5d4037;color:#fff;font-weight:700;cursor:pointer;';
                button.addEventListener('click', function () {
                    var saved = savedState();
                    var statuses = saved.alert_status || {};
                    statuses[alert.alert_type + ':' + alert.reference_id] = 'acknowledged';
                    saved.alert_status = statuses;
                    writeState(saved);
                    if (row.cells[4]) row.cells[4].textContent = 'acknowledged';
                    button.textContent = 'Acknowledged';
                });
                if (actionCell) actionCell.appendChild(button);
                body.appendChild(row);
            });
        });
    }

    function decorateForecasts() {
        var host = document.getElementById('reorder-recommendation');
        if (!host || host.getAttribute('data-dict-forecast') === '1') return;
        ensureForecastStyles();
        host.setAttribute('data-dict-forecast', '1');
        var box = document.createElement('div');
        box.className = 'dict-sales-window';
        var lines = forecasts().map(function (forecast) {
            var qty = salesTransactions().filter(function (row) {
                return row.product_id === forecast.product_id && SALES_DATES.indexOf(row.sales_date) >= 0;
            }).map(function (row) { return row.quantity_sold; }).join(', ');
            var rec = null;
            liveProcurement().forEach(function (item) {
                if (item.product_id === forecast.product_id) rec = item;
            });
            var reorder = '';
            if (rec && rec.current_stock < rec.recommended_quantity) {
                var need = rec.recommended_quantity - rec.current_stock;
                reorder = '<a class="dict-reorder" data-turbo-frame="kreezby-main-content" data-turbo-action="advance" href="' + esc(stocksPageHref()) + '">Reorder ' + esc(need) + '</a>'
                    + '<span class="dict-sales-stock">Stock ' + esc(rec.current_stock) + ' · recommended ' + esc(rec.recommended_quantity) + '</span>';
            }
            return '<div class="dict-sales-row">'
                + '<div><strong>' + esc(forecast.product_name) + '</strong><span class="dict-sales-id">' + esc(forecast.product_id) + '</span></div>'
                + '<div><span class="dict-sales-k">Sales</span> ' + esc(qty) + '</div>'
                + '<div><span class="dict-sales-k">Forecast</span> ' + esc(forecast.forecast_value) + ' on ' + esc(forecast.forecast_date) + '</div>'
                + '<div class="dict-sales-action">' + reorder + '</div>'
                + '</div>';
        }).join('');
        box.innerHTML = lines;
        host.appendChild(box);
    }

    function decorateSaleCards() {
        document.querySelectorAll('.account-order-card').forEach(function (card) {
            card.querySelectorAll('tbody tr').forEach(function (row) {
                if (row.querySelector('.dict-sale')) return;
                var cells = row.cells;
                if (!cells || cells.length < 2) return;
                var name = (cells[1].textContent || '').trim();
                var id = productId(name);
                if (!id) return;
                var note = document.createElement('div');
                note.className = 'dict-sale';
                note.style.cssText = 'font-size:12px;color:#5d4037;margin-top:2px;';
                note.textContent = 'product_id ' + id + ' · quantity_sold ' + (cells[0].textContent || '').trim();
                cells[1].appendChild(note);
            });
        });
    }

    function cellLabel(cell) {
        var clone = cell.cloneNode(true);
        clone.querySelectorAll('.dict-fields, .dict-alert, .dict-forecast, .dict-sale').forEach(function (node) {
            node.remove();
        });
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function paintStockCells() {
        var products = productStockMap();
        var materials = materialStockMap();
        document.querySelectorAll('tr.stock-row').forEach(function (row) {
            var count = row.querySelector('.inventory-count-text');
            if (!count) return;
            var cells = row.querySelectorAll('td');
            var name = '';
            for (var i = 0; i < cells.length; i++) {
                var text = cellLabel(cells[i]);
                if (productId(text) || materialByName(text)) {
                    name = text;
                    break;
                }
            }
            var id = productId(name);
            if (id && products[id] != null) count.textContent = String(products[id]);
            var material = materialByName(name);
            if (material && materials[material.material_id] != null) count.textContent = String(materials[material.material_id]);
        });
    }

    function ensureForecastStyles() {
        if (document.getElementById('dict-forecast-layout')) return;
        var style = document.createElement('style');
        style.id = 'dict-forecast-layout';
        style.textContent = ''
            + '#ai-filter-pills,.ai-filter-pills{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 18px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;overflow:visible;}'
            + '#ai-filter-pills .pill,.ai-filter-pills .pill{height:auto!important;min-height:36px;min-width:0;padding:8px 14px!important;border:1px solid #e6e7eb!important;border-radius:6px!important;background:#f3f4f6!important;color:#111827!important;font-size:13px;font-weight:700;box-shadow:none!important;gap:0!important;white-space:normal;text-align:center;line-height:1.3;}'
            + '#ai-filter-pills .pill.active,.ai-filter-pills .pill.active{background:#1e88e5!important;color:#fff!important;border-color:#1e88e5!important;}'
            + '#ai-filter-pills .expanding-tab__icon,.ai-filter-pills .expanding-tab__icon{display:none!important;}'
            + '#ai-filter-pills .expanding-tab__label,.ai-filter-pills .expanding-tab__label{display:inline!important;max-width:none!important;opacity:1!important;}'
            + '.dict-sales-window{margin:0 0 16px;padding:14px 16px;border:1px solid #eadfce;border-radius:12px;background:#fffaf3;}'
            + '.dict-sales-window__lead{margin:0 0 4px;font-size:13px;color:#5d4037;line-height:1.45;}'
            + '.dict-sales-row{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1.35fr) minmax(0,1fr) 210px;gap:8px 16px;align-items:center;padding:10px 0;border-top:1px solid #f0e6d8;font-size:13px;color:#333;line-height:1.4;}'
            + '.dict-sales-row:first-child{border-top:0;padding-top:0;}'
            + '.dict-sales-row strong{display:block;color:#1f1f1f;}'
            + '.dict-sales-id,.dict-sales-stock{display:block;color:#7a6558;font-size:12px;}'
            + '.dict-sales-k{font-weight:700;color:#5d4037;}'
            + '.dict-sales-action{display:flex;flex-direction:column;align-items:flex-end;gap:4px;width:210px;max-width:100%;}'
            + '.dict-reorder{display:inline-flex;align-items:center;justify-content:center;padding:7px 12px;border-radius:999px;background:#5d4037;color:#fff;font-weight:700;font-size:12px;text-decoration:none;white-space:nowrap;}'
            + '.dict-reorder:hover{background:#3e2723;}'
            + '@media (max-width:860px){.dict-sales-row{grid-template-columns:1fr;}.dict-sales-action{align-items:flex-start;}}';
        document.head.appendChild(style);
    }

    function stocksPageHref() {
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        if (path.indexOf('/head_admin/') >= 0) return 'stocks-headadmin.html';
        if (path.indexOf('/staff/') >= 0 || path.indexOf('/staff_names/') >= 0) return 'stocks-staff.html';
        return 'stocks-admin.html';
    }

    function hideArchivedStock() {
        var archived = [];
        try { archived = JSON.parse(localStorage.getItem('kreezby_archived_stock') || '[]'); } catch (e) { archived = []; }
        if (!archived.length) return;
        document.querySelectorAll('tr.stock-row').forEach(function (row) {
            var cells = row.querySelectorAll('td');
            for (var i = 0; i < cells.length; i++) {
                if (archived.indexOf(cellLabel(cells[i])) >= 0) row.hidden = true;
            }
        });
    }

    function canEditInventory() {
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        return path.indexOf('/admin/') >= 0 || path.indexOf('/admin_names/') >= 0
            || path.indexOf('/head_admin/') >= 0 || path.indexOf('/staff/') >= 0
            || path.indexOf('/staff_names/') >= 0;
    }

    function stockFieldIcon(kind) {
        var paths = {
            product: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r=".8" fill="currentColor" stroke="none"/><circle cx="14" cy="9" r=".8" fill="currentColor" stroke="none"/><circle cx="13.5" cy="14" r=".8" fill="currentColor" stroke="none"/><circle cx="10" cy="15" r=".8" fill="currentColor" stroke="none"/>',
            batch: '<path d="M20.6 13.4 11 3.8A2 2 0 0 0 9.6 3H4a1 1 0 0 0-1 1v5.6a2 2 0 0 0 .6 1.4l9.6 9.6a2 2 0 0 0 2.8 0l4.6-4.6a2 2 0 0 0 0-2.8z"/><circle cx="7.5" cy="7.5" r="1"/>',
            made: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
            expires: '<circle cx="12" cy="13" r="7"/><path d="M12 10v3.5L14.5 15M9 3h6"/>',
            stock: '<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
            material: '<path d="M12 22V11"/><path d="M7 8c1.5 2 3 3.2 5 3.8C14 11.2 15.5 10 17 8c-1.4.2-2.8.8-4 2.2C11.8 8.8 10.4 8.2 9 8H7z"/><path d="M6 14c2 .8 4 .8 6 0 2 .8 4 .8 6 0"/>',
            move: '<path d="M7 7h11M15 4l3 3-3 3M17 17H6M9 14l-3 3 3 3"/>',
            qty: '<path d="M5 9h14M5 15h14M10 4l-1.5 16M16 4l-1.5 16"/>'
        };
        return '<span class="fr-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (paths[kind] || '') + '</svg></span>';
    }

    function stockField(id, label, icon, control, wide) {
        return '<label class="fr-field' + (wide ? ' fr-field--wide' : '') + '">'
            + '<span class="fr-label">' + stockFieldIcon(icon) + label + '</span>'
            + control
            + '</label>';
    }

    function ensureHeadStockFormStyles() {
        if (document.getElementById('fr-head-stock-style')) return;
        var style = document.createElement('style');
        style.id = 'fr-head-stock-style';
        style.textContent = ''
            + '.fr-records{margin:0 0 16px;width:100%;min-width:0;container-type:inline-size;}'
            + '.fr-records__grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;width:100%;}'
            + '.fr-card{background:#fffaf3;border:1px solid #eadfce;border-radius:12px;padding:14px 14px 12px;min-width:0;}'
            + '.fr-card__title{display:flex;align-items:center;gap:8px;margin:0 0 4px;font-size:15px;color:#3e2723;}'
            + '.fr-card__icon{width:28px;height:28px;border-radius:8px;background:#fff;border:1px solid #eadfce;display:inline-flex;align-items:center;justify-content:center;color:#5d4037;flex-shrink:0;}'
            + '.fr-card__lead{margin:0 0 12px;padding-left:36px;color:#7a6558;font-size:12px;line-height:1.4;}'
            + '.fr-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end;}'
            + '.fr-field{display:flex;flex-direction:column;gap:4px;min-width:0;font-size:12px;font-weight:700;color:#5d4037;}'
            + '.fr-field--wide{grid-column:span 2;}'
            + '.fr-label{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;}'
            + '.fr-ico{display:inline-flex;color:#8d6e63;}'
            + '.fr-ico svg{display:block;}'
            + '.fr-field input,.fr-field select{height:36px;width:100%;min-width:0;max-width:100%;box-sizing:border-box;border:1px solid #e4d8c4;border-radius:8px;padding:0 10px;background:#fff;color:#1f1f1f;font:500 13px/1.2 inherit;}'
            + '.fr-field input:focus,.fr-field select:focus{outline:none;border-color:#5d4037;box-shadow:0 0 0 3px rgba(93,64,55,.12);}'
            + '.fr-actions{display:flex;align-items:end;min-width:0;}'
            + '.fr-card--materials .fr-fields{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));}'
            + '.fr-btn{height:36px;width:100%;border:0;border-radius:8px;background:#5d4037;color:#fff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;}'
            + '.fr-btn:hover{background:#3e2723;}'
            + '#fr-stock-note{margin:10px 2px 0;min-height:1.2em;color:#3e2723;font-size:13px;}'
            + '@container (max-width:860px){.fr-records__grid{grid-template-columns:minmax(0,1fr);}.fr-field--wide{grid-column:auto;}}'
            + '@media (max-width:720px){.fr-records__grid{grid-template-columns:minmax(0,1fr);}.fr-field--wide{grid-column:auto;}}';
        document.head.appendChild(style);
    }

    function mountStockTools() {
        if (!canEditInventory() || document.getElementById('kreezby-fr-stock-tools')) return;
        var table = document.getElementById('stocks-table-body');
        if (!table && !document.getElementById('stocks-record-host')) return;
        var recordHost = document.getElementById('stocks-record-host');
        var host = recordHost || table.closest('.card-body-padded, .card-body, .workspace-view-canvas') || table.parentNode;
        var box = document.createElement('div');
        box.id = 'kreezby-fr-stock-tools';
        var headAdmin = (location.pathname || '').replace(/\\/g, '/').toLowerCase().indexOf('/head_admin/') !== -1;
        var productNames = headAdmin ? FLAVOR_CHOICES.slice() : [];
        if (headAdmin) {
            var seenFlavor = {};
            productNames.forEach(function (name) { seenFlavor[name] = true; });
            mergedProducts().forEach(function (product) {
                if (product.product_name && !seenFlavor[product.product_name]) {
                    seenFlavor[product.product_name] = true;
                    productNames.push(product.product_name);
                }
            });
        }
        var productOptions = (headAdmin ? productNames : mergedProducts().map(function (product) { return product.product_name; })).map(function (name) {
            return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
        }).join('');
        var materialOptions = RAW_MATERIALS.map(function (item) {
            return '<option value="' + esc(item.name) + '">' + esc(item.name) + '</option>';
        }).join('');
        if (headAdmin) {
            ensureHeadStockFormStyles();
            box.className = 'fr-records';
            box.innerHTML = '<div class="fr-records__grid">'
                + '<section class="fr-card" aria-label="Finished product records">'
                + '<h3 class="fr-card__title">' + '<span class="fr-card__icon">' + stockFieldIcon('product') + '</span>Finished products</h3>'
                + '<p class="fr-card__lead">Update batch, dates, and stock. Sales deduct finished goods automatically.</p>'
                + '<div class="fr-fields">'
                + stockField('fr-product', 'Product', 'product', '<select id="fr-product">' + productOptions + '</select>', true)
                + stockField('fr-batch', 'Batch', 'batch', '<input id="fr-batch" type="text">', true)
                + stockField('fr-produced', 'Produced', 'made', '<input id="fr-produced" type="date">', true)
                + stockField('fr-expires', 'Expires', 'expires', '<input id="fr-expires" type="date">', true)
                + stockField('fr-stock', 'Stock', 'stock', '<input id="fr-stock" type="number" min="0">', true)
                + '<div class="fr-actions"><button type="button" class="fr-btn" id="fr-save-product">Save product</button></div>'
                + '</div></section>'
                + '<section class="fr-card fr-card--materials" aria-label="Raw material records">'
                + '<h3 class="fr-card__title">' + '<span class="fr-card__icon">' + stockFieldIcon('material') + '</span>Raw materials</h3>'
                + '<p class="fr-card__lead">Type any raw material, then record stock-in, stock-out, or usage.</p>'
                + '<div class="fr-fields">'
                + stockField('fr-material', 'Raw material', 'material', '<input id="fr-material" type="text" placeholder="Type a raw material">')
                + stockField('fr-move', 'Movement', 'move', '<select id="fr-move"><option>stock-in</option><option>stock-out</option><option>usage</option></select>')
                + stockField('fr-qty', 'Quantity', 'qty', '<input id="fr-qty" type="number" min="1" value="1">')
                + '<div class="fr-actions"><button type="button" class="fr-btn" id="fr-save-move">Record movement</button></div>'
                + '</div></section>'
                + '</div>'
                + '<p id="fr-stock-note"></p>';
        } else {
            box.style.cssText = 'margin:0 0 16px;padding:14px;border:1px solid #eadfce;border-radius:12px;background:#fffaf3;';
            box.innerHTML = '<strong>Product and raw material records</strong>'
                + '<p style="margin:6px 0 12px;color:#5d4037;">Edit a finished product, or record raw-material stock-in, stock-out, and usage. Sales deduct finished-goods stock automatically.</p>'
                + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:10px;">'
                + '<label>Product<br><select id="fr-product">' + productOptions + '</select></label>'
                + '<label>Batch<br><input id="fr-batch" type="text"></label>'
                + '<label>Produced<br><input id="fr-produced" type="date"></label>'
                + '<label>Expires<br><input id="fr-expires" type="date"></label>'
                + '<label>Stock<br><input id="fr-stock" type="number" min="0" style="width:90px;"></label>'
                + '<button type="button" id="fr-save-product">Save product</button>'
                + '</div>'
                + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;">'
                + '<label>Raw material<br><select id="fr-material">' + materialOptions + '</select></label>'
                + '<label>Movement<br><select id="fr-move"><option>stock-in</option><option>stock-out</option><option>usage</option></select></label>'
                + '<label>Quantity<br><input id="fr-qty" type="number" min="1" value="1" style="width:90px;"></label>'
                + '<button type="button" id="fr-save-move">Record movement</button>'
                + '</div>'
                + '<p id="fr-stock-note" style="margin:10px 0 0;"></p>';
        }
        if (recordHost) recordHost.appendChild(box);
        else host.insertBefore(box, host.firstChild);

        function fillProduct() {
            var name = document.getElementById('fr-product').value;
            var product = null;
            mergedProducts().forEach(function (item) {
                if (item.product_name === name) product = item;
            });
            if (!product) {
                document.getElementById('fr-batch').value = '';
                document.getElementById('fr-produced').value = '';
                document.getElementById('fr-expires').value = '';
                document.getElementById('fr-stock').value = '';
                return;
            }
            document.getElementById('fr-batch').value = product.batch_number || '';
            document.getElementById('fr-produced').value = product.production_date || '';
            document.getElementById('fr-expires').value = product.expiration_date || '';
            var stock = productStockMap()[product.product_id];
            document.getElementById('fr-stock').value = stock == null ? '' : String(stock);
        }
        document.getElementById('fr-product').addEventListener('change', fillProduct);
        document.getElementById('fr-save-product').addEventListener('click', function () {
            var name = document.getElementById('fr-product').value;
            saveProductFields(name, {
                batch_number: document.getElementById('fr-batch').value,
                production_date: document.getElementById('fr-produced').value,
                expiration_date: document.getElementById('fr-expires').value,
                current_stock: document.getElementById('fr-stock').value
            });
            document.querySelectorAll('.dict-fields').forEach(function (node) { node.remove(); });
            decorateStocks();
            document.getElementById('fr-stock-note').textContent = name + ' was saved. Stock on the table now matches this record.';
        });
        document.getElementById('fr-save-move').addEventListener('click', function () {
            var name = String(document.getElementById('fr-material').value || '').trim();
            var next = name ? recordMaterialMovement(name, document.getElementById('fr-move').value, document.getElementById('fr-qty').value) : null;
            document.getElementById('fr-stock-note').textContent = !name
                ? 'Type a raw material name.'
                : (next == null ? 'Enter a quantity greater than zero.' : name + ' now has ' + next + ' on hand.');
        });
        fillProduct();
    }

    function seedPartnerAlerts() {
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        var partner = path.indexOf('/customer/') >= 0 || path.indexOf('/retailer/') >= 0;
        if (!partner) return;
        var notes = alerts().filter(function (alert) {
            return alert.alert_type === 'price_change' || alert.alert_type === 'new_product';
        });
        if (window.KreezbyNotifications && typeof window.KreezbyNotifications.getAll === 'function') {
            var existing = window.KreezbyNotifications.getAll();
            notes.forEach(function (alert) {
                var found = existing.some(function (item) { return item.id === 'dict-' + alert.alert_type; });
                if (found || typeof window.KreezbyNotifications.push !== 'function') return;
                window.KreezbyNotifications.push({
                    id: 'dict-' + alert.alert_type,
                    title: alert.alert_type === 'new_product' ? 'New product' : 'Price change',
                    description: alert.message,
                    source: alert.alert_type,
                    read: alert.status !== 'pending'
                });
            });
            return;
        }
        var list = readJson('kreezbyNotifications', []);
        notes.forEach(function (alert) {
            var id = 'dict-' + alert.alert_type;
            if (list.some(function (item) { return item.id === id; })) return;
            list.unshift({
                id: id,
                title: alert.alert_type === 'new_product' ? 'New product' : 'Price change',
                description: alert.message,
                timestamp: new Date().toISOString(),
                read: alert.status !== 'pending',
                source: alert.alert_type
            });
        });
        try { localStorage.setItem('kreezbyNotifications', JSON.stringify(list)); } catch (e) { /* ignore */ }
    }

    function apply() {
        snapshot();
        decorateStocks();
        paintStockCells();
        hideArchivedStock();
        decorateAlerts();
        decorateForecasts();
        decorateSaleCards();
        mountStockTools();
        seedPartnerAlerts();
    }

    window.KreezbyDictionary = {
        apply: apply,
        productId: productId,
        productById: productById,
        recordSale: recordSale,
        setProductStock: setProductStock,
        recordMaterialMovement: recordMaterialMovement,
        saveProductFields: saveProductFields,
        historyFor: historyFor,
        productStock: function (name) {
            var id = productId(name);
            return id ? productStockMap()[id] : null;
        },
        materialByName: materialByName,
        materialStock: function (name) {
            var material = materialByName(name);
            if (!material) return null;
            var map = materialStockMap();
            return map[material.material_id] == null ? null : map[material.material_id];
        },
        alerts: alerts,
        forecasts: forecasts,
        salesTransactions: salesTransactions,
        insightSnapshot: insightSnapshot
    };

    function boot() {
        apply();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', apply);
    document.addEventListener('content:replaced', decorateForecasts);
})();
