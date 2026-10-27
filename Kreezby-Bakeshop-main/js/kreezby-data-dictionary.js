/**
 * Capstone data dictionary (section 3.4) stored in the browser and shown
 * on stocks, alerts, sales, and account screens.
 */
(function () {
    'use strict';

    var STORE_KEY = 'kreezby_data_dictionary_v1';
    var lastSaleError = '';
    var ALERT_LINES = {
        'CRK-CHO-P': 100, 'CRK-ALM-P': 80, 'CRK-LEM-P': 90, 'CRK-BUT-J': 70, 'CRK-MNG-J': 60, 'CRK-UBE-P': 50,
        'RM-WFL-01': 40, 'RM-WSG-01': 30, 'RM-OIL-01': 20, 'RM-EGG-01': 24, 'RM-COC-01': 20,
        'RM-BKP-01': 10, 'RM-SLT-01': 15, 'RM-CFS-01': 12, 'RM-PSB-01': 5
    };
    var SALES_DATES = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];
    var FORECAST_DATE = '2026-09-27';

    var PRODUCTS = [
        { product_id: 'CRK-CHO-P', product_name: 'Chocolate Crinkles', batch_number: 'BCH-2026-0918-CHO', production_date: '2026-09-18', expiration_date: '2026-11-18', expiry_threshold_days: 3, quantities: [0, 0, 0, 0, 0, 0, 0] },
        { product_id: 'CRK-ALM-P', product_name: 'Choco-Almond Crinkles', batch_number: 'BCH-2026-0917-ALM', production_date: '2026-09-17', expiration_date: '2026-11-17', expiry_threshold_days: 3, quantities: [0, 0, 0, 0, 0, 0, 0] },
        { product_id: 'CRK-LEM-P', product_name: 'Lemon Crinkles', batch_number: 'BCH-2026-0920-LEM', production_date: '2026-09-20', expiration_date: '2026-10-21', expiry_threshold_days: 3, quantities: [0, 0, 0, 0, 0, 0, 0] },
        { product_id: 'CRK-BUT-J', product_name: 'Choco Butternut Crinkles', batch_number: 'BCH-2026-0915-BUT', production_date: '2026-09-15', expiration_date: '2026-11-15', expiry_threshold_days: 3, quantities: [0, 0, 0, 0, 0, 0, 0] },
        { product_id: 'CRK-MNG-J', product_name: 'Mango Crinkles', batch_number: 'BCH-2026-0908-MNG', production_date: '2026-09-08', expiration_date: '2026-09-26', expiry_threshold_days: 3, quantities: [0, 0, 0, 0, 0, 0, 0] },
        { product_id: 'CRK-UBE-P', product_name: 'Ube Crinkles', batch_number: 'BCH-2026-0919-UBE', production_date: '2026-09-19', expiration_date: '2026-11-19', expiry_threshold_days: 3, quantities: [0, 0, 0, 0, 0, 0, 0] }
    ];

    var RAW_MATERIALS = [
        { material_id: 'RM-WFL-01', name: 'Wheat Flour', current_stock: 0, expiration_date: '2027-03-01', expiry_threshold_days: 7 },
        { material_id: 'RM-WSG-01', name: 'White Sugar', current_stock: 0, expiration_date: '2027-06-01', expiry_threshold_days: 7 },
        { material_id: 'RM-OIL-01', name: 'Vegetable Oil', current_stock: 0, expiration_date: '2027-01-15', expiry_threshold_days: 7 },
        { material_id: 'RM-EGG-01', name: 'Egg', current_stock: 0, expiration_date: '2026-10-22', expiry_threshold_days: 7 },
        { material_id: 'RM-COC-01', name: 'Cocoa', current_stock: 0, expiration_date: '2026-12-20', expiry_threshold_days: 7 },
        { material_id: 'RM-BKP-01', name: 'Baking Powder', current_stock: 0, expiration_date: '2027-04-01', expiry_threshold_days: 7 },
        { material_id: 'RM-SLT-01', name: 'Salt', current_stock: 0, expiration_date: '2028-01-01', expiry_threshold_days: 7 },
        { material_id: 'RM-CFS-01', name: 'Confectioner Sugar', current_stock: 0, expiration_date: '2027-05-01', expiry_threshold_days: 7 },
        { material_id: 'RM-PSB-01', name: 'Potassium Sorbate', current_stock: 0, expiration_date: '2027-08-01', expiry_threshold_days: 7 }
    ];

    var PROCUREMENT = [
        { product_id: 'CRK-CHO-P', product_name: 'Chocolate Crinkles', current_stock: 0, recommended_quantity: 400 },
        { product_id: 'CRK-LEM-P', product_name: 'Lemon Crinkles', current_stock: 0, recommended_quantity: 200 },
        { product_id: 'CRK-MNG-J', product_name: 'Mango Crinkles', current_stock: 0, recommended_quantity: 200 },
        { product_id: 'CRK-ALM-P', product_name: 'Choco-Almond Crinkles', current_stock: 0, recommended_quantity: 300 },
        { product_id: 'CRK-BUT-J', product_name: 'Choco Butternut Crinkles', current_stock: 0, recommended_quantity: 200 },
        { product_id: 'CRK-UBE-P', product_name: 'Ube Crinkles', current_stock: 0, recommended_quantity: 200 }
    ];

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
        'Choco Butternut Crinkles',
        'Assorted Crinkles'
    ];

    function productId(name) {
        var text = String(name || '').toLowerCase();
        if (!text) return '';
        if (text.indexOf('oatmeal') >= 0) return 'CKE-OAT-P';
        if (text.indexOf('assorted') >= 0) return 'CRK-AST-P';
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

    function daysUntil(dateStr) {
        var text = String(dateStr || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
        var parts = text.split('-');
        var exp = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        var now = new Date();
        var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((exp - today) / 86400000);
    }

    function shelfLifeText(days) {
        if (days < 0) {
            var past = Math.abs(days);
            return past + (past === 1 ? ' day' : ' days') + ' past expiry';
        }
        if (days === 0) return 'expires today';
        return days + (days === 1 ? ' day' : ' days') + ' of shelf life left';
    }

    function alertStatusFor(type, ref) {
        var saved = savedState().alert_status || {};
        return saved[type + ':' + ref] || 'pending';
    }

    function configuredLine(code, fallback) {
        var settings = readJson('kreezbyAlertSettings', null);
        if (settings && settings.items && settings.items[code] != null && settings.items[code] !== '') {
            var custom = Number(settings.items[code]);
            if (Number.isFinite(custom) && custom >= 0) return custom;
        }
        return fallback;
    }

    function pushAlert(list, type, role, ref, message) {
        list.push({
            alert_type: type,
            target_role: role,
            reference_id: ref,
            message: message,
            status: alertStatusFor(type, ref)
        });
    }

    function alerts() {
        var list = [];
        var stock = productStockMap();
        mergedProducts().forEach(function (product) {
            var qty = Number(stock[product.product_id]);
            if (!Number.isFinite(qty)) qty = 0;
            var line = configuredLine(product.product_id, ALERT_LINES[product.product_id]);
            if (line != null && qty <= line) {
                pushAlert(list, 'low_stock', 'Admin', product.product_id, product.product_name + ' is at ' + qty + ' pouches, at or below the alert line of ' + line + '.');
            }
            // No stock means no batch on hand, so no expiry alert for it.
            if (qty <= 0) return;
            var days = daysUntil(product.expiration_date);
            if (days == null) return;
            var threshold = Number(product.expiry_threshold_days);
            if (!Number.isFinite(threshold)) threshold = 3;
            var batch = product.batch_number ? (' batch ' + product.batch_number) : '';
            if (days < 0) {
                pushAlert(list, 'expired', 'Admin', product.product_id, product.product_name + batch + ' expired on ' + product.expiration_date + ' (' + shelfLifeText(days) + ') and cannot be sold.');
            } else if (days <= threshold) {
                pushAlert(list, 'near_expiry', 'Staff', product.product_id, product.product_name + batch + ' expires on ' + product.expiration_date + ', with ' + shelfLifeText(days) + '.');
            }
        });
        var materials = materialStockMap();
        allMaterials().forEach(function (item) {
            var qty = Number(materials[item.material_id]);
            if (!Number.isFinite(qty)) qty = 0;
            var line = configuredLine(item.material_id, ALERT_LINES[item.material_id]);
            if (line != null && qty <= line) {
                pushAlert(list, 'low_stock', 'Staff', item.material_id, item.name + ' is at ' + qty + ', at or below the alert line of ' + line + '.');
            }
            if (qty <= 0) return;
            var days = daysUntil(item.expiration_date);
            if (days == null) return;
            var threshold = Number(item.expiry_threshold_days);
            if (!Number.isFinite(threshold)) threshold = 7;
            if (days < 0) {
                pushAlert(list, 'expired', 'Admin', item.material_id, item.name + ' expired on ' + item.expiration_date + ' (' + shelfLifeText(days) + ').');
            } else if (days <= threshold) {
                pushAlert(list, 'near_expiry', 'Staff', item.material_id, item.name + ' expires on ' + item.expiration_date + ', with ' + shelfLifeText(days) + '.');
            }
        });
        (savedState().partner_alerts || []).forEach(function (alert) {
            if (alert && alert.message) list.push(alert);
        });
        return list;
    }

    function staffInventoryAlerts() {
        var stock = productStockMap();
        return mergedProducts().map(function (product) {
            var quantity = Number(stock[product.product_id]);
            if (!Number.isFinite(quantity)) quantity = 0;
            var threshold = configuredLine(product.product_id, ALERT_LINES[product.product_id]);
            if (threshold == null || quantity > threshold) return null;
            return {
                product: product.product_name,
                category: 'Finished Goods',
                currentStock: quantity,
                threshold: Number(threshold),
                status: 'Low Stock'
            };
        }).filter(Boolean);
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

    var BASE_MOVEMENTS = [];

    function inventoryTransactions() {
        return BASE_MOVEMENTS.concat(savedState().inventory_transactions_extra || []);
    }

    function orderItemList(raw) {
        if (Array.isArray(raw)) return raw;
        if (!raw || typeof raw !== 'object') return [];
        return Object.keys(raw).map(function (key) { return raw[key]; });
    }

    function isOpenOrderStatus(status) {
        var text = String(status || '').toLowerCase();
        if (!text) return true;
        return text !== 'completed' && text !== 'shipped' && text !== 'delivered'
            && text !== 'cancelled' && text !== 'canceled' && text !== 'received'
            && text !== 'rejected' && text !== 'returned';
    }

    function pendingOrderLines() {
        var seen = {};
        var lines = [];
        function add(orderId, status, items, deducted) {
            var id = String(orderId || '');
            if (!id || seen[id] || !isOpenOrderStatus(status)) return;
            seen[id] = true;
            orderItemList(items).forEach(function (item) {
                var name = item && item.name;
                var qty = Number(item && (item.qty != null ? item.qty : item.quantity)) || 0;
                var product = productId(name);
                if (!product || qty <= 0) return;
                lines.push({
                    productId: product,
                    qty: qty,
                    deducted: !!deducted
                });
            });
        }
        readJson('kreezbyOrders', []).forEach(function (order) {
            if (!order) return;
            var deducted = !!order.inventoryDeducted;
            add(order.orderNumber || order.receiptNumber, order.status, order.items, deducted);
        });
        var pos = readJson('kreezby-po-orders-v1', {});
        Object.keys(pos || {}).forEach(function (code) {
            var order = pos[code];
            if (!order) return;
            add(order.code || code, order.status, order.items, order.inventoryDeducted);
        });
        return lines;
    }

    function productRecommendationSnapshot() {
        var pendingByProduct = {};
        var uncoveredByProduct = {};
        pendingOrderLines().forEach(function (line) {
            pendingByProduct[line.productId] = (pendingByProduct[line.productId] || 0) + line.qty;
            if (!line.deducted) uncoveredByProduct[line.productId] = (uncoveredByProduct[line.productId] || 0) + line.qty;
        });
        var stock = productStockMap();
        var seen = {};
        function rowFor(id, name) {
            if (!id || seen[id]) return null;
            seen[id] = true;
            var product = productById(id);
            var finishedStock = Number(stock[id]) || 0;
            var pendingOrders = pendingByProduct[id] || 0;
            var stillToCover = uncoveredByProduct[id] || 0;
            var gap = stillToCover - finishedStock;
            return {
                name: (product && product.product_name) || name || id,
                finishedStock: finishedStock,
                pendingOrders: pendingOrders,
                pendingStillToCover: stillToCover,
                suggestedBake: gap > 0 ? Math.ceil(gap) : 0
            };
        }
        var products = [];
        liveProcurement().forEach(function (row) {
            var next = rowFor(row.product_id, row.product_name);
            if (next) products.push(next);
        });
        Object.keys(pendingByProduct).forEach(function (id) {
            var next = rowFor(id, id);
            if (next) products.push(next);
        });
        return {
            asOf: new Date().toISOString().slice(0, 10),
            products: products
        };
    }

    function insightSnapshot() {
        var salesByProduct = {};
        salesTransactions().forEach(function (row) {
            if (!row || !row.product_id) return;
            salesByProduct[row.product_id] = (salesByProduct[row.product_id] || 0) + (Number(row.quantity_sold) || 0);
        });
        var materialStock = materialStockMap();
        return {
            asOf: new Date().toISOString().slice(0, 10),
            products: liveProcurement().map(function (row) {
                return {
                    name: row.product_name,
                    stock: row.current_stock,
                    recommendedStock: row.recommended_quantity,
                    recentSales: salesByProduct[row.product_id] || 0
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
            raw_materials: allMaterials().map(function (item) {
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
        data.materials_extra = previous.materials_extra || [];
        data.alert_status = previous.alert_status || {};
        data.partner_alerts = previous.partner_alerts || [];
        data.product_prices = previous.product_prices || {};
        writeState(data);
        return data;
    }

    function saleBlockReason(productName) {
        var id = productId(productName);
        if (!id) return 'unknown';
        var product = productById(id);
        var days = product ? daysUntil(product.expiration_date) : null;
        if (days != null && days < 0) return 'expired';
        return '';
    }

    function pushPartnerNotice(type, name, message) {
        var saved = savedState();
        var list = saved.partner_alerts || [];
        list.unshift({
            alert_type: type,
            target_role: 'Customer',
            reference_id: productId(name) || name,
            message: message,
            status: 'pending',
            at: new Date().toISOString()
        });
        saved.partner_alerts = list.slice(0, 40);
        writeState(saved);
        var note = {
            id: 'partner-' + type + '-' + Date.now(),
            title: type === 'price_change' ? 'Price update' : 'New flavor',
            description: message,
            source: type,
            audiences: ['customer', 'retailer'],
            timestamp: new Date().toISOString(),
            read: false
        };
        if (window.KreezbyNotifications && typeof window.KreezbyNotifications.push === 'function') {
            window.KreezbyNotifications.push(note);
            return;
        }
        var notes = readJson('kreezbyNotifications', []);
        notes.unshift(note);
        try { localStorage.setItem('kreezbyNotifications', JSON.stringify(notes)); } catch (e) { /* ignore */ }
    }

    function recordSale(productName, quantity, salesDate) {
        var block = saleBlockReason(productName);
        if (block) {
            lastSaleError = block;
            return null;
        }
        lastSaleError = '';
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

    function undoSale(productName, quantity, salesDate) {
        var id = productId(productName);
        if (!id) return null;
        var qty = Number(quantity) || 0;
        if (!qty) return null;
        var saved = savedState();
        var extra = saved.sales_transactions_extra || [];
        var date = salesDate || '';
        for (var i = extra.length - 1; i >= 0; i--) {
            var row = extra[i];
            if (!row || row.product_id !== id || Number(row.quantity_sold) !== qty) continue;
            if (date && row.sales_date !== date) continue;
            extra.splice(i, 1);
            break;
        }
        saved.sales_transactions_extra = extra;
        var stock = productStockMap();
        stock[id] = (Number(stock[id]) || 0) + qty;
        saved.product_stock = stock;
        var moves = saved.inventory_transactions_extra || [];
        moves.push({
            type: 'stock-in',
            reference_id: id,
            quantity: qty,
            note: 'POS sale reversed on ' + (date || FORECAST_DATE)
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

    var lastMovementError = '';
    var MOVEMENT_KINDS = {
        'stock-in': 'Stock in',
        'stock-out': 'Stock out',
        'usage': 'Used in production',
        'waste': 'Spoiled / waste'
    };

    function movementActor() {
        try {
            var sess = JSON.parse(localStorage.getItem('kreezby_session') || 'null') || {};
            return String(sess.name || sess.fullName || sess.username || sess.email || sess.role || 'Staff');
        } catch (e) { return 'Staff'; }
    }

    // Records a raw material movement in the ledger (date, who, balance before and after).
    function recordMaterialMovement(materialName, movementType, quantity, note) {
        lastMovementError = '';
        var kind = String(movementType || '').toLowerCase();
        if (!MOVEMENT_KINDS[kind]) { lastMovementError = 'Choose a movement type.'; return null; }
        var qty = Math.abs(Number(quantity) || 0);
        if (!qty) { lastMovementError = 'Enter a quantity greater than zero.'; return null; }
        var material = ensureMaterial(materialName);
        if (!material) { lastMovementError = 'Type a raw material name.'; return null; }
        var saved = savedState();
        var stock = materialStockMap();
        var current = Number(stock[material.material_id]) || 0;
        if (kind !== 'stock-in' && qty > current) {
            lastMovementError = material.name + ' only has ' + current + ' on hand, so ' + qty + ' cannot be taken out.';
            return null;
        }
        var after = kind === 'stock-in' ? current + qty : current - qty;
        stock[material.material_id] = after;
        saved.material_stock = stock;
        var moves = saved.inventory_transactions_extra || [];
        var text = String(note || '').trim();
        moves.push({
            type: kind,
            reference_id: material.material_id,
            material: material.name,
            quantity: qty,
            before: current,
            after: after,
            date: new Date().toISOString(),
            by: movementActor(),
            note: text || (material.name + ' ' + (MOVEMENT_KINDS[kind] || kind).toLowerCase())
        });
        saved.inventory_transactions_extra = moves;
        writeState(saved);
        snapshot();
        paintStockCells();
        notifyStocks();
        return after;
    }

    // Every raw material movement, newest first.
    function materialMovements() {
        var names = {};
        allMaterials().forEach(function (m) { names[m.material_id] = m.name; });
        var baseCount = BASE_MOVEMENTS.length;
        return inventoryTransactions().map(function (row, index) {
            return { row: row, index: index };
        }).filter(function (entry) {
            return names[entry.row.reference_id] != null;
        }).map(function (entry) {
            var r = entry.row;
            return {
                date: r.date || '',
                material: names[r.reference_id],
                code: r.reference_id,
                type: r.type,
                quantity: Number(r.quantity) || 0,
                before: r.before,
                after: r.after,
                by: r.by || '',
                note: r.note || '',
                order: entry.index
            };
        }).sort(function (a, b) {
            if (a.date && b.date) return a.date < b.date ? 1 : -1;
            if (a.date) return -1;
            if (b.date) return 1;
            return b.order - a.order;
        });
    }

    function formatMoveDate(iso) {
        if (!iso) return '—';
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function ensureLedgerStyles() {
        if (document.getElementById('kreezby-ledger-style')) return;
        var style = document.createElement('style');
        style.id = 'kreezby-ledger-style';
        style.textContent = ''
            + '#kreezby-fr-ledger{margin-top:16px;padding:16px 18px;background:#fff;border:1px solid #efe7e0;border-radius:16px;box-shadow:0 6px 18px rgba(93,64,55,.06);}'
            + '#kreezby-fr-ledger h3{margin:0 0 4px;font-size:16px;color:#3d2c2a;}'
            + '#kreezby-fr-ledger .rl-lead{margin:0 0 12px;color:#7a655c;font-size:13px;}'
            + '#kreezby-fr-ledger .rl-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;}'
            + '#kreezby-fr-ledger select,#kreezby-fr-ledger button{height:34px;border:1px solid #e4d9d0;border-radius:10px;background:#fff;color:#3d2c2a;font:inherit;font-size:13px;padding:0 10px;}'
            + '#kreezby-fr-ledger button{background:#ffca28;border-color:#ffca28;font-weight:800;cursor:pointer;}'
            + '#kreezby-fr-ledger .rl-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}'
            + '#kreezby-fr-ledger .rl-chip{padding:6px 12px;border-radius:999px;background:#f7f0ea;color:#5d4037;font-size:12px;font-weight:700;}'
            + '#kreezby-fr-ledger .rl-scroll{max-height:380px;overflow:auto;border:1px solid #f3ece6;border-radius:12px;}'
            + '#kreezby-fr-ledger table{width:100%;border-collapse:collapse;font-size:13px;}'
            + '#kreezby-fr-ledger th{position:sticky;top:0;background:#f7f0ea;color:#6d4c41;text-align:left;font-size:11px;letter-spacing:.05em;text-transform:uppercase;padding:9px 10px;}'
            + '#kreezby-fr-ledger td{padding:9px 10px;border-top:1px solid #f3ece6;color:#3d2c2a;vertical-align:top;}'
            + '#kreezby-fr-ledger td.rl-in{color:#2e7d32;font-weight:800;white-space:nowrap;}'
            + '#kreezby-fr-ledger td.rl-out{color:#c62828;font-weight:800;white-space:nowrap;}'
            + '#kreezby-fr-ledger .rl-empty{padding:18px;text-align:center;color:#7a655c;}';
        document.head.appendChild(style);
    }

    function moveSign(type, qty) {
        if (type === 'stock-in') return { cls: 'rl-in', text: '+' + qty };
        if (type === 'adjustment') return { cls: qty < 0 ? 'rl-out' : 'rl-in', text: (qty > 0 ? '+' : '') + qty };
        return { cls: 'rl-out', text: '−' + qty };
    }

    function renderLedger() {
        var box = document.getElementById('kreezby-fr-ledger');
        if (!box) return;
        var materialSel = box.querySelector('#rl-material');
        var typeSel = box.querySelector('#rl-type');
        var wantMaterial = materialSel ? materialSel.value : '';
        var wantType = typeSel ? typeSel.value : '';
        var all = materialMovements();
        var rows = all.filter(function (m) {
            return (!wantMaterial || m.code === wantMaterial) && (!wantType || m.type === wantType);
        });
        var totals = { 'stock-in': 0, usage: 0, 'stock-out': 0, waste: 0 };
        rows.forEach(function (m) { if (totals[m.type] != null) totals[m.type] += m.quantity; });
        var options = '<option value="">All raw materials</option>' + allMaterials().map(function (m) {
            return '<option value="' + esc(m.material_id) + '"' + (m.material_id === wantMaterial ? ' selected' : '') + '>' + esc(m.name) + '</option>';
        }).join('');
        var typeOptions = '<option value="">All movements</option>' + Object.keys(MOVEMENT_KINDS).concat(['adjustment']).map(function (k) {
            return '<option value="' + k + '"' + (k === wantType ? ' selected' : '') + '>' + esc(MOVEMENT_KINDS[k] || 'Adjustment') + '</option>';
        }).join('');
        var body = rows.length ? rows.slice(0, 200).map(function (m) {
            var sign = moveSign(m.type, m.quantity);
            return '<tr><td>' + esc(formatMoveDate(m.date)) + '</td><td>' + esc(m.material) + '</td><td>' + esc(MOVEMENT_KINDS[m.type] || (m.type === 'adjustment' ? 'Adjustment' : m.type)) + '</td>'
                + '<td class="' + sign.cls + '">' + esc(sign.text) + '</td>'
                + '<td>' + (m.before != null ? esc(m.before) + ' → ' + esc(m.after) : '—') + '</td>'
                + '<td>' + esc(m.by || '—') + '</td><td>' + esc(m.note) + '</td></tr>';
        }).join('') : '<tr><td colspan="7" class="rl-empty">No raw material movements recorded yet. Use “Record movement” above.</td></tr>';
        box.innerHTML = '<h3>Raw Material Movement Log</h3>'
            + '<p class="rl-lead">Every stock-in, stock-out, usage and waste entry, with who recorded it and the balance before and after.</p>'
            + '<div class="rl-bar"><select id="rl-material" aria-label="Filter by raw material">' + options + '</select>'
            + '<select id="rl-type" aria-label="Filter by movement">' + typeOptions + '</select>'
            + '<button type="button" id="rl-export">Export CSV</button></div>'
            + '<div class="rl-chips"><span class="rl-chip">Entries: ' + rows.length + '</span>'
            + '<span class="rl-chip">Stock in: ' + totals['stock-in'] + '</span>'
            + '<span class="rl-chip">Used: ' + totals.usage + '</span>'
            + '<span class="rl-chip">Stock out: ' + totals['stock-out'] + '</span>'
            + '<span class="rl-chip">Waste: ' + totals.waste + '</span></div>'
            + '<div class="rl-scroll"><table><thead><tr><th>Date</th><th>Raw material</th><th>Movement</th><th>Qty</th><th>Balance</th><th>Recorded by</th><th>Note</th></tr></thead><tbody>' + body + '</tbody></table></div>';
        box.querySelector('#rl-material').addEventListener('change', renderLedger);
        box.querySelector('#rl-type').addEventListener('change', renderLedger);
        box.querySelector('#rl-export').addEventListener('click', function () {
            var lines = [['Date', 'Raw material', 'Movement', 'Quantity', 'Balance before', 'Balance after', 'Recorded by', 'Note']];
            rows.forEach(function (m) {
                lines.push([m.date, m.material, m.type, m.quantity, m.before == null ? '' : m.before, m.after == null ? '' : m.after, m.by, m.note]);
            });
            var csv = lines.map(function (r) {
                return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
            }).join('\r\n');
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
            a.download = 'raw-material-movements.csv';
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        });
    }

    function mountLedger() {
        // The Products/Stocks page shows stocks only; the raw material movement log is not shown.
        var old = document.getElementById('kreezby-fr-ledger');
        if (old) old.remove();
        return;
        // eslint-disable-next-line no-unreachable
        var table = document.getElementById('stocks-table-body');
        if (!table) return;
        if (document.getElementById('kreezby-fr-ledger')) { renderLedger(); return; }
        var card = table.closest('.panel-data-card');
        if (!card) return;
        ensureLedgerStyles();
        var box = document.createElement('section');
        box.id = 'kreezby-fr-ledger';
        card.insertAdjacentElement('afterend', box);
        renderLedger();
    }

    function saveProductFields(productName, fields) {
        var id = productId(productName);
        if (!id) return null;
        var saved = savedState();
        var inCatalog = PRODUCTS.some(function (product) { return product.product_id === id; });
        var isNewFlavor = false;
        if (!inCatalog) {
            var extra = saved.products_extra || [];
            var found = null;
            extra.forEach(function (item) {
                if (item.product_id === id) found = item;
            });
            if (!found) {
                found = { product_id: id, product_name: productName, expiry_threshold_days: 3, quantities: [] };
                extra.push(found);
                isNewFlavor = true;
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
        var priceNotice = '';
        if (fields && fields.price != null && String(fields.price) !== '') {
            var price = Number(fields.price);
            if (Number.isFinite(price) && price >= 0) {
                var prices = saved.product_prices || {};
                var previousPrice = prices[id];
                if (previousPrice == null || Number(previousPrice) !== price) {
                    prices[id] = price;
                    saved.product_prices = prices;
                    priceNotice = productName + ' price is now ₱' + price.toFixed(2) + '.';
                }
            }
        }
        writeState(saved);
        if (fields && fields.current_stock != null && fields.current_stock !== '') {
            setProductStock(productName, fields.current_stock);
        } else {
            snapshot();
            notifyStocks();
        }
        if (isNewFlavor) pushPartnerNotice('new_product', productName, productName + ' is a newly released flavor.');
        if (priceNotice) pushPartnerNotice('price_change', productName, priceNotice);
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
            price: '<path d="M12 2v20"/><path d="M17 6.5c0-1.5-2-2.5-5-2.5S7 5 7 7s2 2.5 5 2.5 5 1 5 2.5-2 2.5-5 2.5-5-1-5-2.5"/>',
            material: '<path d="M12 22V11"/><path d="M7 8c1.5 2 3 3.2 5 3.8C14 11.2 15.5 10 17 8c-1.4.2-2.8.8-4 2.2C11.8 8.8 10.4 8.2 9 8H7z"/><path d="M6 14c2 .8 4 .8 6 0 2 .8 4 .8 6 0"/>',
            move: '<path d="M7 7h11M15 4l3 3-3 3M17 17H6M9 14l-3 3 3 3"/>',
            qty: '<path d="M5 9h14M5 15h14M10 4l-1.5 16M16 4l-1.5 16"/>',
            note: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8"/>'
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
            + '.fr-hide-btn{margin-left:auto;height:28px;padding:0 10px;border:1px solid #c4b4a4;border-radius:8px;background:#fff;color:#5d4037;font-size:12px;font-weight:700;cursor:pointer;flex:0 0 auto;}'
            + '.fr-hide-btn:hover{background:#f6efe6;}'
            + '.fr-card.is-collapsed .fr-card__lead,.fr-card.is-collapsed .fr-fields{display:none;}'
            + '.fr-panel{margin:0 0 12px;padding:12px;border:1px solid #eadfce;border-radius:12px;background:#fffaf3;}'
            + '.fr-panel__bar{display:flex;align-items:center;gap:8px;color:#3e2723;}'
            + '.fr-panel.is-collapsed .fr-panel__body{display:none;}'
            + '.fr-panel__body{margin-top:8px;}'
            + '#fr-stock-note{margin:10px 2px 0;min-height:1.2em;color:#3e2723;font-size:13px;}'
            + '@container (max-width:860px){.fr-records__grid{grid-template-columns:minmax(0,1fr);}.fr-field--wide{grid-column:auto;}}'
            + '@media (max-width:720px){.fr-records__grid{grid-template-columns:minmax(0,1fr);}.fr-field--wide{grid-column:auto;}}';
        document.head.appendChild(style);
    }

    function hideControl(panel) {
        return '<button type="button" class="fr-hide-btn" data-fr-hide="' + panel + '" aria-expanded="true">Hide</button>';
    }

    function bindStockHide(box) {
        box.querySelectorAll('[data-fr-hide]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var panel = box.querySelector('[data-fr-panel="' + btn.getAttribute('data-fr-hide') + '"]');
                if (!panel) return;
                var collapsed = panel.classList.toggle('is-collapsed');
                btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                btn.textContent = collapsed ? 'Show' : 'Hide';
            });
        });
    }

    function mountStockTools() {
        if (!canEditInventory() || document.getElementById('kreezby-fr-stock-tools')) return;
        var table = document.getElementById('stocks-table-body');
        if (!table && !document.getElementById('stocks-record-host')) return;
        var recordHost = document.getElementById('stocks-record-host');
        var host = recordHost || table.closest('.card-body-padded, .card-body, .workspace-view-canvas') || table.parentNode;
        var box = document.createElement('div');
        box.id = 'kreezby-fr-stock-tools';
        var pathName = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        var cardLayout = pathName.indexOf('/head_admin/') !== -1
            || pathName.indexOf('/admin/') !== -1
            || pathName.indexOf('/admin_names/') !== -1
            || pathName.indexOf('/staff/') !== -1;
        var productNames = cardLayout ? FLAVOR_CHOICES.slice() : [];
        if (cardLayout) {
            var seenFlavor = {};
            productNames.forEach(function (name) { seenFlavor[name] = true; });
            mergedProducts().forEach(function (product) {
                if (product.product_name && !seenFlavor[product.product_name]) {
                    seenFlavor[product.product_name] = true;
                    productNames.push(product.product_name);
                }
            });
        }
        var productOptions = (cardLayout ? productNames : mergedProducts().map(function (product) { return product.product_name; })).map(function (name) {
            return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
        }).join('');
        var materialOptions = RAW_MATERIALS.map(function (item) {
            return '<option value="' + esc(item.name) + '">' + esc(item.name) + '</option>';
        }).join('');
        ensureHeadStockFormStyles();
        if (cardLayout) {
            box.className = 'fr-records';
            box.innerHTML = '<div class="fr-records__grid">'
                + '<section class="fr-card" data-fr-panel="product" aria-label="Finished product records">'
                + '<h3 class="fr-card__title">' + '<span class="fr-card__icon">' + stockFieldIcon('product') + '</span>Finished products' + hideControl('product') + '</h3>'
                + '<p class="fr-card__lead">Update batch, dates, and stock. Sales deduct finished goods automatically.</p>'
                + '<div class="fr-fields">'
                + stockField('fr-product', 'Product', 'product', '<select id="fr-product">' + productOptions + '</select>', true)
                + stockField('fr-batch', 'Batch', 'batch', '<input id="fr-batch" type="text">', true)
                + stockField('fr-produced', 'Produced', 'made', '<input id="fr-produced" type="date">', true)
                + stockField('fr-expires', 'Expires', 'expires', '<input id="fr-expires" type="date">', true)
                + stockField('fr-stock', 'Stock', 'stock', '<input id="fr-stock" type="number" min="0">', true)
                + stockField('fr-price', 'Price', 'price', '<input id="fr-price" type="number" min="0" step="0.01">', true)
                + '<div class="fr-actions"><button type="button" class="fr-btn" id="fr-save-product">Save product</button></div>'
                + '</div></section>'
                + '<section class="fr-card fr-card--materials" data-fr-panel="material" aria-label="Raw material records">'
                + '<h3 class="fr-card__title">' + '<span class="fr-card__icon">' + stockFieldIcon('material') + '</span>Raw materials' + hideControl('material') + '</h3>'
                + '<p class="fr-card__lead">Type any raw material, then record stock-in, stock-out, or usage.</p>'
                + '<div class="fr-fields">'
                + stockField('fr-material', 'Raw material', 'material', '<input id="fr-material" type="text" list="fr-material-list" placeholder="Type a raw material"><datalist id="fr-material-list">' + materialOptions + '</datalist>')
                + stockField('fr-move', 'Movement', 'move', '<select id="fr-move"><option value="stock-in">Stock in (received)</option><option value="stock-out">Stock out</option><option value="usage">Used in production</option><option value="waste">Spoiled / waste</option></select>')
                + stockField('fr-qty', 'Quantity', 'qty', '<input id="fr-qty" type="number" min="1" value="1">')
                + stockField('fr-note', 'Note', 'note', '<input id="fr-note" type="text" placeholder="Supplier, batch or reason (optional)">')
                + '<div class="fr-actions"><button type="button" class="fr-btn" id="fr-save-move">Record movement</button></div>'
                + '</div></section>'
                + '</div>'
                + '<p id="fr-stock-note"></p>';
        } else {
            box.innerHTML = '<section class="fr-panel" data-fr-panel="product">'
                + '<div class="fr-panel__bar"><strong>Finished products</strong>' + hideControl('product') + '</div>'
                + '<div class="fr-panel__body">'
                + '<p style="margin:0 0 10px;color:#5d4037;">Update batch, dates, and stock. Sales deduct finished goods automatically.</p>'
                + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;">'
                + '<label>Product<br><select id="fr-product">' + productOptions + '</select></label>'
                + '<label>Batch<br><input id="fr-batch" type="text"></label>'
                + '<label>Produced<br><input id="fr-produced" type="date"></label>'
                + '<label>Expires<br><input id="fr-expires" type="date"></label>'
                + '<label>Stock<br><input id="fr-stock" type="number" min="0" style="width:90px;"></label>'
                + '<label>Price<br><input id="fr-price" type="number" min="0" step="0.01" style="width:90px;"></label>'
                + '<button type="button" id="fr-save-product">Save product</button>'
                + '</div></div></section>'
                + '<section class="fr-panel" data-fr-panel="material">'
                + '<div class="fr-panel__bar"><strong>Raw materials</strong>' + hideControl('material') + '</div>'
                + '<div class="fr-panel__body">'
                + '<p style="margin:0 0 10px;color:#5d4037;">Type any raw material, then record stock-in, stock-out, or usage.</p>'
                + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:end;">'
                + '<label>Raw material<br><input id="fr-material" type="text" list="fr-material-list" placeholder="Type a raw material"><datalist id="fr-material-list">' + materialOptions + '</datalist></label>'
                + '<label>Movement<br><select id="fr-move"><option value="stock-in">Stock in (received)</option><option value="stock-out">Stock out</option><option value="usage">Used in production</option><option value="waste">Spoiled / waste</option></select></label>'
                + '<label>Quantity<br><input id="fr-qty" type="number" min="1" value="1" style="width:90px;"></label>'
                + '<label>Note<br><input id="fr-note" type="text" placeholder="Supplier, batch or reason"></label>'
                + '<button type="button" id="fr-save-move">Record movement</button>'
                + '</div></div></section>'
                + '<p id="fr-stock-note" style="margin:10px 0 0;"></p>';
        }
        if (recordHost) recordHost.appendChild(box);
        else host.insertBefore(box, host.firstChild);
        bindStockHide(box);

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
            var priceInput = document.getElementById('fr-price');
            if (priceInput) {
                var prices = savedState().product_prices || {};
                priceInput.value = prices[product.product_id] == null ? '' : String(prices[product.product_id]);
            }
        }
        document.getElementById('fr-product').addEventListener('change', fillProduct);
        document.getElementById('fr-save-product').addEventListener('click', function () {
            var name = document.getElementById('fr-product').value;
            var priceNode = document.getElementById('fr-price');
            var savedProduct = saveProductFields(name, {
                batch_number: document.getElementById('fr-batch').value,
                production_date: document.getElementById('fr-produced').value,
                expiration_date: document.getElementById('fr-expires').value,
                current_stock: document.getElementById('fr-stock').value,
                price: priceNode ? priceNode.value : ''
            });
            document.querySelectorAll('.dict-fields').forEach(function (node) { node.remove(); });
            decorateStocks();
            document.getElementById('fr-stock-note').textContent = savedProduct
                ? (name + ' was saved. Stock on the table now matches this record.')
                : 'That product could not be saved.';
        });
        document.getElementById('fr-save-move').addEventListener('click', function () {
            var name = String(document.getElementById('fr-material').value || '').trim();
            var next = name ? recordMaterialMovement(name, document.getElementById('fr-move').value, document.getElementById('fr-qty').value, (document.getElementById('fr-note') || {}).value) : null;
            document.getElementById('fr-stock-note').textContent = !name
                ? 'Type a raw material name.'
                : (next == null ? (lastMovementError || 'Enter a quantity greater than zero.') : name + ' now has ' + next + ' on hand. Movement saved to the log below.');
            if (next != null && document.getElementById('fr-note')) document.getElementById('fr-note').value = '';
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
        ensureForecastStyles();
        decorateSaleCards();
        mountStockTools();
        mountLedger();
        seedPartnerAlerts();
        notifyStocks();
    }

    window.KreezbyDictionary = {
        apply: apply,
        productId: productId,
        productById: productById,
        recordSale: recordSale,
        undoSale: undoSale,
        saleBlockReason: saleBlockReason,
        lastSaleError: function () { return lastSaleError; },
        setProductStock: setProductStock,
        recordMaterialMovement: recordMaterialMovement,
        lastMovementError: function () { return lastMovementError; },
        materialMovements: materialMovements,
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
        alertLineFor: function (code) { return configuredLine(code, ALERT_LINES[code]); },
        staffInventoryAlerts: staffInventoryAlerts,
        salesTransactions: salesTransactions,
        insightSnapshot: insightSnapshot,
        productRecommendationSnapshot: productRecommendationSnapshot
    };

    // A QR Ph order paid in GCash can be confirmed on the server while the customer is away
    // from the checkout page. Admin and staff pages take its items out of stock once.
    function deductPaidQrOrders() {
        if (!/\/(admin|head_admin|staff)\//i.test(location.pathname || '')) return;
        var orders = readJson('kreezbyOrders', []);
        if (!Array.isArray(orders)) return;
        orders.forEach(function (order) {
            if (!order || order.inventoryDeducted || order.paymentStatus !== 'paid' || order.paymentMethod !== 'paymongo') return;
            if (/cancel|return|reject/i.test(String(order.status || ''))) return;
            var number = String(order.orderNumber || '');
            if (!number || claimsInFlight[number]) return;
            claimsInFlight[number] = true;
            // The server gives each order's stock deduction to exactly one page. Pages that lose
            // the claim only mark the order as handled, so stock is never taken twice.
            claimOrderDeduction(number, function (won) {
                delete claimsInFlight[number];
                if (won === null) return; // server unreachable: try again on the next check
                var fresh = readJson('kreezbyOrders', []);
                var target = Array.isArray(fresh) ? fresh.filter(function (row) { return row && row.orderNumber === number; })[0] : null;
                if (!target) return;
                if (won) {
                    Object.keys(target.items || {}).forEach(function (key) {
                        var item = target.items[key];
                        if (item && item.name && productId(item.name)) recordSale(item.name, Number(item.qty) || 0, String(target.paidAt || target.date || '').slice(0, 10));
                    });
                }
                target.inventoryDeducted = true;
                try { localStorage.setItem('kreezbyOrders', JSON.stringify(fresh)); } catch (e) { /* ignore */ }
            });
        });
    }

    var claimsInFlight = {};
    function claimOrderDeduction(orderNumber, done) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/stock/claim-order', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.timeout = 10000;
            xhr.onload = function () {
                if (xhr.status !== 200) { done(null); return; }
                try { done(!!JSON.parse(xhr.responseText).claimed); } catch (e) { done(null); }
            };
            xhr.onerror = xhr.ontimeout = function () { done(null); };
            xhr.send(JSON.stringify({ orderNumber: orderNumber }));
        } catch (e) { done(null); }
    }

    function boot() {
        apply();
        // Wait for the server copy before checking, so an older local copy is never used.
        setTimeout(deductPaidQrOrders, 5000);
    }
    document.addEventListener('kreezby:remote-state', function (e) {
        var keys = e && e.detail && e.detail.keys;
        if (keys && keys.indexOf('kreezbyOrders') !== -1) deductPaidQrOrders();
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', apply);
    document.addEventListener('kreezby:stocks-sync', function () { mountLedger(); });
    document.addEventListener('content:replaced', ensureForecastStyles);
})();
