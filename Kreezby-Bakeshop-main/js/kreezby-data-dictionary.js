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

    function productId(name) {
        var text = String(name || '').toLowerCase();
        if (!text) return '';
        if (text.indexOf('almond') >= 0) return 'CRK-ALM-P';
        if (text.indexOf('butternut') >= 0) return 'CRK-BUT-J';
        if (text.indexOf('lemon') >= 0) return 'CRK-LEM-P';
        if (text.indexOf('mango') >= 0) return 'CRK-MNG-J';
        if (text.indexOf('ube') >= 0) return 'CRK-UBE-P';
        if (text.indexOf('chocolate') >= 0) return 'CRK-CHO-P';
        return '';
    }

    function productById(id) {
        for (var i = 0; i < PRODUCTS.length; i++) {
            if (PRODUCTS[i].product_id === id) return PRODUCTS[i];
        }
        return null;
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
            { alert_type: 'price_change', target_role: 'Retailer/Wholesaler', reference_id: 'CRK-CHO-P', message: 'Chocolate Crinkles price was updated for retailer and wholesaler accounts.', status: 'acknowledged' },
            { alert_type: 'new_product', target_role: 'Customer', reference_id: 'CRK-UBE-P', message: 'Ube Crinkles is a newly released flavor.', status: 'resolved' }
        ];
    }

    function users() {
        var source = { admins: [], staff: [], retailers: [], wholesalers: [], customers: [] };
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
        push(source.retailers, 'Retailer/Wholesaler');
        push(source.wholesalers, 'Retailer/Wholesaler');
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

    function snapshot() {
        var sales = salesTransactions();
        var data = {
            users: users(),
            products: PRODUCTS.map(function (product) {
                return {
                    product_id: product.product_id,
                    product_name: product.product_name,
                    batch_number: product.batch_number,
                    production_date: product.production_date,
                    expiration_date: product.expiration_date,
                    expiry_threshold_days: product.expiry_threshold_days
                };
            }),
            raw_materials: RAW_MATERIALS,
            inventory_transactions: [
                { type: 'stock-in', reference_id: 'RM-FLR-01', quantity: 25, note: 'Flour delivery received' },
                { type: 'stock-out', reference_id: 'CRK-CHO-P', quantity: 160, note: 'Finished goods sold on 2026-09-26' },
                { type: 'usage', reference_id: 'RM-COC-01', quantity: 4, note: 'Cocoa used in production' },
                { type: 'adjustment', reference_id: 'RM-BUT-01', quantity: -2, note: 'Butter count corrected after inventory check' }
            ],
            sales_transactions: sales,
            orders: orders(),
            forecasts: forecasts(),
            alerts: alerts(),
            procurement_recommendations: PROCUREMENT.map(function (row) {
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
        data.sales_transactions_extra = readJson(STORE_KEY, {}).sales_transactions_extra || [];
        try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
        return data;
    }

    function recordSale(productName, quantity, salesDate) {
        var id = productId(productName);
        if (!id) return;
        var saved = readJson(STORE_KEY, {});
        var extra = saved.sales_transactions_extra || [];
        extra.push({
            sales_date: salesDate || FORECAST_DATE,
            product_id: id,
            quantity_sold: Number(quantity) || 0
        });
        saved.sales_transactions_extra = extra;
        try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ }
        snapshot();
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function decorateStocks() {
        document.querySelectorAll('tr.stock-row').forEach(function (row) {
            if (row.querySelector('.dict-fields')) return;
            var cells = row.querySelectorAll('td');
            var nameCell = null;
            var name = '';
            for (var i = 0; i < cells.length; i++) {
                var text = (cells[i].textContent || '').trim();
                if (productId(text) || RAW_MATERIALS.some(function (item) { return item.name === text; })) {
                    nameCell = cells[i];
                    name = text;
                    break;
                }
            }
            if (!nameCell) return;
            var product = null;
            PRODUCTS.forEach(function (item) {
                if (item.product_name === name) product = item;
            });
            var material = null;
            RAW_MATERIALS.forEach(function (item) {
                if (item.name === name) material = item;
            });
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
            alerts().forEach(function (alert) {
                if (body.textContent.indexOf(alert.alert_type) >= 0 && body.textContent.indexOf(alert.reference_id) >= 0) return;
                var row = document.createElement('tr');
                row.innerHTML = '<td>' + (body.rows.length + 1) + '</td><td>' + esc(FORECAST_DATE) + '</td><td><strong>' + esc(alert.reference_id) + '</strong></td><td>' + esc(alert.message) + '<div class="dict-alert" style="font-size:12px;color:#5d4037;margin-top:4px;">' + esc(alert.alert_type) + ' · ' + esc(alert.target_role) + ' · ' + esc(alert.reference_id) + ' · ' + esc(alert.status) + '</div></td><td style="text-align:center;">' + esc(alert.status) + '</td><td></td>';
                body.appendChild(row);
            });
        });
    }

    function decorateForecasts() {
        var tables = document.querySelectorAll('table');
        tables.forEach(function (table) {
            var headText = (table.querySelector('thead') || {}).textContent || '';
            if (headText.indexOf('Forecast') < 0 && headText.indexOf('Flavor') < 0) return;
            if (table.getAttribute('data-dict-forecast') === '1') return;
            var body = table.querySelector('tbody');
            if (!body) return;
            var matched = false;
            Array.prototype.forEach.call(body.rows, function (row) {
                var cells = row.cells;
                if (!cells) return;
                var flavor = null;
                for (var c = 0; c < cells.length; c++) {
                    if (productId(cells[c].textContent || '')) {
                        flavor = cells[c];
                        break;
                    }
                }
                if (!flavor || flavor.querySelector('.dict-forecast')) return;
                var id = productId(flavor.textContent || '');
                var forecast = null;
                forecasts().forEach(function (item) {
                    if (item.product_id === id) forecast = item;
                });
                if (!forecast) return;
                matched = true;
                var note = document.createElement('div');
                note.className = 'dict-forecast';
                note.style.cssText = 'font-size:12px;color:#5d4037;margin-top:4px;line-height:1.45;font-weight:500;';
                note.textContent = 'forecast_date ' + forecast.forecast_date + ' · forecast_value ' + forecast.forecast_value;
                flavor.appendChild(note);
            });
            if (!matched) return;
            table.setAttribute('data-dict-forecast', '1');
            if (document.querySelector('.dict-sales-window')) return;
            var box = document.createElement('div');
            box.className = 'dict-sales-window';
            box.style.cssText = 'margin:0 0 14px;font-size:13px;color:#333;line-height:1.5;';
            var lines = forecasts().map(function (forecast) {
                var qty = salesTransactions().filter(function (row) {
                    return row.product_id === forecast.product_id && SALES_DATES.indexOf(row.sales_date) >= 0;
                }).map(function (row) { return row.quantity_sold; }).join(', ');
                var rec = null;
                PROCUREMENT.forEach(function (item) {
                    if (item.product_id === forecast.product_id) rec = item;
                });
                var shortage = rec && rec.current_stock < rec.recommended_quantity
                    ? ' Reorder ' + (rec.recommended_quantity - rec.current_stock) + ' (stock ' + rec.current_stock + ', recommended ' + rec.recommended_quantity + ').'
                    : '';
                return '<div><strong>' + esc(forecast.product_name) + '</strong> (' + esc(forecast.product_id) + '): sales ' + esc(qty) + ' → forecast_value ' + esc(forecast.forecast_value) + ' on ' + esc(forecast.forecast_date) + '.' + esc(shortage) + '</div>';
            }).join('');
            box.innerHTML = '<strong>Seven-day sales</strong> used for the next-day forecast. Each figure is quantity_sold on sales_date ' + esc(SALES_DATES[0]) + ' through ' + esc(SALES_DATES[SALES_DATES.length - 1]) + '.' + lines;
            table.parentNode.insertBefore(box, table);
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

    function apply() {
        snapshot();
        decorateStocks();
        decorateAlerts();
        decorateForecasts();
        decorateSaleCards();
    }

    window.KreezbyDictionary = {
        apply: apply,
        productId: productId,
        productById: productById,
        recordSale: recordSale,
        forecasts: forecasts,
        salesTransactions: salesTransactions
    };

    function boot() {
        apply();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', apply);
})();
