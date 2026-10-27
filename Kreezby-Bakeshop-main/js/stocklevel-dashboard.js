/**

 * Stock Level inventory dashboard — one full-detail view per navigation pill.

 */

(function () {

    'use strict';



    var DATA = {

        kpis: {

            totalUnits: { value: 210000, caption: 'Total across all items' },

            totalValue: { value: 203400, caption: 'Total inventory value', trend: '+ 12.5% vs last 12 months' },

            capacity: { value: 250000, caption: 'Storage capacity', utilization: 81 },

            weeksOfStock: { value: 12, caption: 'Average weeks of stock', min: 2, max: 20 }

        },

        unitsByCategory: [

            { category: 'Raw Materials', units: 98000, pct: 47 },

            { category: 'Finished Products', units: 104000, pct: 49 },

            { category: 'Packaging', units: 8000, pct: 4 }

        ],

        valueByCategory: [

            { category: 'Raw Materials', value: 185400, pct: 91 },

            { category: 'Packaging', value: 18000, pct: 9 }

        ],

        capacityZones: [

            { zone: 'Dry Storage', capacity: 120000, used: 102000, pct: 85 },

            { zone: 'Cold Storage', capacity: 80000, used: 58000, pct: 73 },

            { zone: 'Finished Goods', capacity: 50000, used: 42000, pct: 84 }

        ],

        health: {

            total: 205,

            segments: [

                { label: 'Well Stocked', count: 160, pct: 78, color: '#4caf50', key: 'well' },

                { label: 'Low Stock', count: 36, pct: 18, color: '#ffb74d', key: 'low' },

                { label: 'Out of Stock', count: 9, pct: 4, color: '#f44336', key: 'out' }

            ]

        },

        alertCount: 10,

        lowStockAlerts: [

            { item: 'Vegetable Oil', type: 'Raw Material', current: '48 Quantity', reorder: '60 Quantity', status: 'low' },

            { item: 'Egg', type: 'Raw Material', current: '36 Quantity', reorder: '60 Quantity', status: 'critical' },

            { item: 'Choco-Almond', type: 'Finished', current: '18 Pouches', reorder: '40 Pouches', status: 'low' },

            { item: 'Cocoa', type: 'Raw Material', current: '45 Quantity', reorder: '60 Quantity', status: 'low' },

            { item: 'Baking Powder', type: 'Raw Material', current: '22 Quantity', reorder: '50 Quantity', status: 'critical' },

            { item: 'Potassium Sorbate', type: 'Raw Material', current: '12 Quantity', reorder: '40 Quantity', status: 'critical' },

            { item: 'Lemon Crinkles', type: 'Finished', current: '85 Pouches', reorder: '100 Pouches', status: 'low' },

            { item: 'Mango Crinkles', type: 'Finished', current: '45 Pouches', reorder: '75 Pouches', status: 'critical' },

            { item: 'Red Velvet', type: 'Finished', current: '92 Pouches', reorder: '120 Pouches', status: 'low' },

            { item: 'Melon Crinkles', type: 'Finished', current: '64 Pouches', reorder: '100 Pouches', status: 'low' }

        ],

        healthItems: [

            { item: 'Chocolate Crinkles', code: 'CRK-CHO-P', category: 'Finished Products', stock: '450 Pouches', reorder: '150 Pouches', weeks: 8, status: 'well' },

            { item: 'Choco-Almond Crinkles', code: 'CRK-ALM-P', category: 'Finished Products', stock: '320 Pouches', reorder: '100 Pouches', weeks: 9, status: 'well' },

            { item: 'Choco Butternut', code: 'CRK-BUT-J', category: 'Finished Products', stock: '210 Pouches', reorder: '80 Pouches', weeks: 7, status: 'well' },

            { item: 'Ube Crinkles', code: 'CRK-UBE-P', category: 'Finished Products', stock: '180 Pouches', reorder: '100 Pouches', weeks: 6, status: 'well' },

            { item: 'Lemon Crinkles', code: 'CRK-LEM-P', category: 'Finished Products', stock: '85 Pouches', reorder: '100 Pouches', weeks: 3, status: 'low' },

            { item: 'Mango Crinkles', code: 'CRK-MNG-J', category: 'Finished Products', stock: '45 Pouches', reorder: '75 Pouches', weeks: 2, status: 'low' },

            { item: 'Wheat Flour', code: 'RM-WFL-01', category: 'Raw Materials', stock: '120 Quantity', reorder: '80 Quantity', weeks: 14, status: 'well' },

            { item: 'White Sugar', code: 'RM-WSG-01', category: 'Raw Materials', stock: '90 Quantity', reorder: '60 Quantity', weeks: 10, status: 'well' },

            { item: 'Egg', code: 'RM-EGG-01', category: 'Raw Materials', stock: '36 Quantity', reorder: '60 Quantity', weeks: 1, status: 'low' },

            { item: 'Red Velvet Pouch', code: 'CRK-RVV-P', category: 'Finished Products', stock: '890 Pouches', reorder: '120 Pouches', weeks: 16, status: 'well' }

        ],

        categories: [

            {

                name: 'Raw Materials',

                pct: 78,

                count: 120,

                tone: 'good',

                items: ['Wheat Flour', 'White Sugar', 'Vegetable Oil', 'Egg', 'Cocoa', 'Baking Powder', 'Salt', 'Confectioner Sugar', 'Potassium Sorbate']

            },

            {

                name: 'Finished Products',

                pct: 62,

                count: 85,

                tone: 'warn',

                items: ['Chocolate Crinkles', 'Choco-Almond', 'Ube Crinkles', 'Lemon Crinkles', 'Mango Crinkles', 'Red Velvet']

            },

            {

                name: 'Packaging',

                pct: 40,

                count: 2,

                tone: 'warn',

                items: ['Stand up pouch', 'Stickers (Per Flavor)']

            }

        ],

        slowMoving: [

            { item: 'Product A', category: 'Finished Products', sold: '1,250 Pouches', lastSold: '12/12/2023', stock: '1,250 Pouches', weeks: '16', status: 'slow' },

            { item: 'Red Velvet Pouch', category: 'Finished Products', sold: '420 Pouches', lastSold: '01/15/2024', stock: '890 Pouches', weeks: '14', status: 'slow' },

            { item: 'Pandan Crinkles', category: 'Finished Products', sold: '310 Pouches', lastSold: '02/02/2024', stock: '640 Pouches', weeks: '13', status: 'slow' },

            { item: 'Melon Crinkles', category: 'Finished Products', sold: '280 Pouches', lastSold: '02/18/2024', stock: '520 Pouches', weeks: '12', status: 'slow' },

            { item: 'Strawberry Crinkles', category: 'Finished Products', sold: '160 Pouches', lastSold: '03/10/2024', stock: '380 Pouches', weeks: '10', status: 'slow' }

        ],

        chartMonths: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],

        stockSeries: [62000, 68000, 71000, 76000, 82000, 88000],

        salesSeries: [54000, 59000, 57000, 63000, 69000, 74000],

        unitsTrend: [176000, 184000, 192000, 198000, 204000, 210000],

        valueTrend: [163300, 171800, 179600, 187800, 195600, 203400],

        lastUpdated: 'May 20, 2024 09:30 AM'

    };

    var VALUE_KEY = 'kreezbyStockItemValues';
    var STOCK_KEY = 'kreezby-stock-local-v1';
    var BASE_CATEGORY_VALUE = {};
    DATA.valueByCategory.forEach(function (row) {
        BASE_CATEGORY_VALUE[row.category] = row.value;
    });

    var INVENTORY_ITEMS = [
        { code: 'RM-WFL-01', name: 'Wheat Flour', category: 'Raw Materials', qty: 120 },
        { code: 'RM-WSG-01', name: 'White Sugar', category: 'Raw Materials', qty: 90 },
        { code: 'RM-OIL-01', name: 'Vegetable Oil', category: 'Raw Materials', qty: 48 },
        { code: 'RM-EGG-01', name: 'Egg', category: 'Raw Materials', qty: 36 },
        { code: 'RM-COC-01', name: 'Cocoa', category: 'Raw Materials', qty: 45 },
        { code: 'RM-BKP-01', name: 'Baking Powder', category: 'Raw Materials', qty: 22 },
        { code: 'RM-SLT-01', name: 'Salt', category: 'Raw Materials', qty: 70 },
        { code: 'RM-CFS-01', name: 'Confectioner Sugar', category: 'Raw Materials', qty: 30 },
        { code: 'RM-PSB-01', name: 'Potassium Sorbate', category: 'Raw Materials', qty: 12 },
        { code: 'CRK-CHO-P', name: 'Chocolate Crinkles', category: 'Finished Products', qty: 450 },
        { code: 'CRK-ALM-P', name: 'Choco-Almond Crinkles', category: 'Finished Products', qty: 320 },
        { code: 'CRK-BUT-J', name: 'Choco Butternut Crinkles', category: 'Finished Products', qty: 210 },
        { code: 'CRK-LEM-P', name: 'Lemon Crinkles', category: 'Finished Products', qty: 85 },
        { code: 'CRK-MNG-J', name: 'Mango Crinkles', category: 'Finished Products', qty: 45 },
        { code: 'CRK-UBE-P', name: 'Ube Crinkles', category: 'Finished Products', qty: 180 },
        { code: 'PKG-SUP-01', name: 'Stand up pouch', category: 'Packaging', qty: 80 },
        { code: 'PKG-STK-01', name: 'Stickers (Per Flavor)', category: 'Packaging', qty: 12 }
    ];



    function esc(s) {

        var d = document.createElement('div');

        d.textContent = s == null ? '' : String(s);

        return d.innerHTML;

    }



    function money(n) {

        return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    }



    function statusBadge(status) {

        var labels = {

            low: 'Low',

            critical: 'Critical',

            slow: 'Slow',

            well: 'Well Stocked',

            out: 'Out of Stock'

        };

        return '<span class="sl-status-badge sl-status-' + status + '">' + (labels[status] || status) + '</span>';

    }



    function miniSparkBars(values, color) {

        var max = Math.max.apply(null, values);

        return values.map(function (v) {

            var h = max ? Math.round((v / max) * 100) : 0;

            return '<span class="sl-mini-bar" style="height:' + h + '%;background:' + color + ';"></span>';

        }).join('');

    }



    function donutStyle(segments) {

        var cursor = 0;

        var parts = segments.map(function (seg) {

            var start = cursor;

            cursor += seg.pct;

            return seg.color + ' ' + start + '% ' + cursor + '%';

        });

        return 'conic-gradient(' + parts.join(', ') + ')';

    }



    function chartSvg(months, stock, sales, tall) {

        var max = Math.max.apply(null, stock.concat(sales));

        var w = 560;

        var h = tall ? 260 : 180;

        var pad = { l: 48, r: 12, t: 12, b: 28 };

        var innerW = w - pad.l - pad.r;

        var innerH = h - pad.t - pad.b;



        function points(series) {

            return series.map(function (val, i) {

                var x = pad.l + (i / (series.length - 1)) * innerW;

                var y = pad.t + innerH - (val / max) * innerH;

                return x.toFixed(1) + ',' + y.toFixed(1);

            }).join(' ');

        }



        var grid = [0, 0.25, 0.5, 0.75, 1].map(function (t) {

            var y = pad.t + innerH - t * innerH;

            var label = money(max * t);

            return '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '" class="sl-chart-grid"/>'

                + '<text x="' + (pad.l - 6) + '" y="' + (y + 4) + '" class="sl-chart-axis" text-anchor="end">' + label + '</text>';

        }).join('');



        var monthLabels = months.map(function (m, i) {

            var x = pad.l + (i / (months.length - 1)) * innerW;

            return '<text x="' + x + '" y="' + (h - 6) + '" class="sl-chart-axis" text-anchor="middle">' + esc(m) + '</text>';

        }).join('');



        return ''

            + '<svg class="sl-line-chart' + (tall ? ' sl-line-chart-tall' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Stock value versus sales chart">'

            + grid

            + '<polyline class="sl-line-stock" points="' + points(stock) + '"/>'

            + '<polyline class="sl-line-sales" points="' + points(sales) + '"/>'

            + monthLabels

            + '</svg>';

    }



    function footer(reportHref) {

        return ''

            + '<div class="sl-dashboard-footer">'

            + '<p class="sl-footer-note">ⓘ Stock levels are updated in real-time. Last updated: ' + esc(DATA.lastUpdated) + '</p>'

            + '<a class="sl-btn-report" data-turbo-frame="kreezby-main-content" data-turbo-action="advance" href="' + esc(reportHref) + '">View Full Inventory Report</a>'

            + '</div>';

    }



    function alertsTable(rows) {

        return '<table class="sl-compact-table"><thead><tr>'

            + '<th>Item</th><th>Current Stock</th><th>Reorder Level</th><th>Status</th>'

            + '</tr></thead><tbody>'

            + rows.map(function (row) {

                return '<tr><td><strong>' + esc(row.item) + '</strong><div class="sl-row-sub">' + esc(row.type) + '</div></td>'

                    + '<td>' + esc(row.current) + '</td><td>' + esc(row.reorder) + '</td>'

                    + '<td>' + statusBadge(row.status) + '</td></tr>';

            }).join('')

            + '</tbody></table>';

    }



    function slowTable(rows) {

        if (!rows.length) return '<p class="sl-footer-note">No slow-moving products right now. Every finished product is selling through within 4 weeks of stock.</p>';

        return '<table class="sl-compact-table sl-slow-table" data-sl-skip-open="1"><thead><tr>'

            + '<th>Item</th><th>Category</th><th>Units Sold (Last 7 Days)</th><th>Last Sold</th><th>Current Stock</th><th>Weeks</th><th>Status</th>'

            + '</tr></thead><tbody>'

            + rows.map(function (row) {

                return '<tr><td><strong>' + esc(row.item) + '</strong></td><td>' + esc(row.category) + '</td>'

                    + '<td>' + esc(row.sold) + '</td><td>' + esc(row.lastSold) + '</td><td>' + esc(row.stock) + '</td>'

                    + '<td>' + esc(row.weeks) + '</td><td>' + statusBadge(row.status) + '</td></tr>';

            }).join('')

            + '</tbody></table>';

    }



    function categoryBars(categories) {

        return '<div class="sl-category-list">' + categories.map(function (cat) {

            return '<div class="sl-category-row"><div class="sl-category-top"><span>' + esc(cat.name) + '</span>'

                + '<span>' + cat.pct + '% (' + cat.count + ' items)</span></div>'

                + '<div class="sl-category-track"><div class="sl-category-fill sl-tone-' + cat.tone + '" style="width:' + cat.pct + '%;"></div></div></div>';

        }).join('') + '</div>';

    }



    function renderUnits(root, reportHref) {

        var k = DATA.kpis.totalUnits;

        root.innerHTML = ''

            + '<div class="sl-detail-hero sl-kpi-blue">'

            + '<div class="sl-detail-hero-label">Total Stock Units</div>'

            + '<div class="sl-detail-hero-value">' + k.value.toLocaleString() + '</div>'

            + '<div class="sl-detail-hero-caption">' + esc(k.caption) + '</div>'

            + '<div class="sl-mini-chart sl-mini-chart-wide">' + miniSparkBars(DATA.unitsTrend.map(function (v) { return v / 3000; }), headStock() ? '#8d6e63' : '#1e88e5') + '</div>'

            + '</div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Units by Category</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table"><thead><tr>'

            + '<th>Category</th><th>Total Units</th><th>Share</th><th>Distribution</th>'

            + '</tr></thead><tbody>'

            + DATA.unitsByCategory.map(function (row) {

                return '<tr><td><strong>' + esc(row.category) + '</strong></td>'

                    + '<td>' + row.units.toLocaleString() + '</td><td>' + row.pct + '%</td>'

                    + '<td><div class="sl-inline-bar"><div class="sl-inline-bar-fill" style="width:' + row.pct + '%;"></div></div></td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>All Items — Current Stock</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table"><thead><tr>'

            + '<th>Item Code</th><th>Item</th><th>Category</th><th>Current Stock</th><th>Status</th>'

            + '</tr></thead><tbody>'

            + DATA.healthItems.map(function (row) {

                return '<tr><td>' + esc(row.code) + '</td><td><strong>' + esc(row.item) + '</strong></td>'

                    + '<td>' + esc(row.category) + '</td><td>' + esc(row.stock) + '</td>'

                    + '<td>' + statusBadge(row.status) + '</td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + footer(reportHref);

    }



    function readStore(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function categoryForType(type) {
        if (type === 'raw-material') return 'Raw Materials';
        if (type === 'packaging-material') return 'Packaging';
        return 'Finished Products';
    }

    function inventoryCatalog() {
        var items = INVENTORY_ITEMS.map(function (item) {
            return { code: item.code, name: item.name, category: item.category, qty: item.qty };
        });
        var seen = {};
        items.forEach(function (item) {
            seen[item.code] = 1;
            seen[item.name.toLowerCase()] = 1;
        });
        function add(item) {
            if (!item || !item.code || seen[item.code]) return;
            var nameKey = String(item.name || '').toLowerCase();
            if (nameKey && seen[nameKey]) return;
            seen[item.code] = 1;
            if (nameKey) seen[nameKey] = 1;
            items.push(item);
        }
        var local = readStore(STOCK_KEY, {});
        (local.extra || []).forEach(function (row) {
            add({
                code: row.code,
                name: row.name || row.code,
                category: categoryForType(row.type),
                qty: Number(row.qty) || 0
            });
        });
        var dict = readStore('kreezby_data_dictionary_v1', {});
        (dict.materials_extra || []).forEach(function (row) {
            add({
                code: row.material_id,
                name: row.name || row.material_id,
                category: 'Raw Materials',
                qty: Number(row.current_stock) || 0
            });
        });
        var productStock = dict.product_stock || {};
        var materialStock = dict.material_stock || {};
        var localQty = (local.qty || {});
        items.forEach(function (item) {
            if (productStock[item.code] != null) item.qty = Number(productStock[item.code]) || 0;
            else if (materialStock[item.code] != null) item.qty = Number(materialStock[item.code]) || 0;
            else if (localQty[item.code] != null) item.qty = Number(localQty[item.code]) || 0;
        });
        return items;
    }

    function syncOperationalAlerts() {
        var dictApi = window.KreezbyDictionary;
        if (!dictApi || typeof dictApi.alerts !== 'function') return;
        var state = readStore('kreezby_data_dictionary_v1', {});
        var productStock = state.product_stock || {};
        var materialStock = state.material_stock || {};
        var rows = dictApi.alerts().filter(function (alert) {
            return alert && alert.status === 'pending' && (alert.alert_type === 'low_stock' || alert.alert_type === 'near_expiry' || alert.alert_type === 'expired');
        });
        DATA.alertCount = rows.length;
        DATA.lowStockAlerts = rows.map(function (alert) {
            var code = alert.reference_id || '';
            var qty = productStock[code] != null ? productStock[code] : materialStock[code];
            var finished = code.indexOf('CRK-') === 0;
            var name = String(alert.message || code).split(' batch ')[0].split(' is at ')[0].split(' expired')[0].split(' expires')[0];
            return {
                item: name || code,
                type: alert.alert_type === 'expired' || alert.alert_type === 'near_expiry' ? 'Expiry' : (finished ? 'Finished' : 'Raw Material'),
                current: qty == null ? alert.message : (qty + (finished ? ' Pouches' : '')),
                reorder: alert.alert_type === 'low_stock' ? 'Alert line' : alert.message,
                status: alert.alert_type === 'expired' ? 'critical' : 'low'
            };
        });
        if (DATA.healthItems) {
            DATA.healthItems.forEach(function (row) {
                if (row.code && productStock[row.code] != null) row.stock = productStock[row.code] + ' Pouches';
            });
        }
    }

    function valueCatalog() {
        return inventoryCatalog().filter(function (item) { return item.category !== 'Finished Products'; });
    }

    // Values always come from real quantity x unit cost, so they follow every stock movement.
    function savedValueMap() {
        return null;
    }

    var UNIT_COSTS = {
        'RM-WFL-01': 48, 'RM-WSG-01': 42, 'RM-OIL-01': 95, 'RM-EGG-01': 9, 'RM-COC-01': 180,
        'RM-BKP-01': 35, 'RM-SLT-01': 18, 'RM-CFS-01': 55, 'RM-PSB-01': 220,
        'PKG-SUP-01': 12, 'PKG-STK-01': 3
    };

    function unitCost(item) {
        var local = readStore(STOCK_KEY, {});
        var costs = local.cost || {};
        if (costs[item.code] != null && costs[item.code] !== '') return Number(costs[item.code]) || 0;
        var extra = null;
        (local.extra || []).forEach(function (row) { if (row && row.code === item.code) extra = row; });
        if (extra && extra.cost != null) return Number(extra.cost) || 0;
        return UNIT_COSTS[item.code] || 0;
    }

    function defaultValueMap() {
        var map = {};
        valueCatalog().forEach(function (item) {
            map[item.code] = Math.round((Number(item.qty) || 0) * unitCost(item) * 100) / 100;
        });
        return map;
    }

    function valueFor(item) {
        return (Number(item.qty) || 0) * unitCost(item);
    }


    var SNAP_KEY = 'kreezby_stock_snapshots_v1';
    var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

    function recentSalesByCode() {
        // units sold per product over the latest 7 days of recorded sales
        var dict = window.KreezbyDictionary;
        var rows = dict && typeof dict.salesTransactions === 'function' ? dict.salesTransactions() : [];
        var dates = {};
        rows.forEach(function (r) { if (r && r.sales_date) dates[String(r.sales_date).slice(0, 10)] = 1; });
        var latest = Object.keys(dates).sort().slice(-7);
        var inWindow = {};
        latest.forEach(function (d) { inWindow[d] = 1; });
        var out = {};
        var last = {};
        rows.forEach(function (r) {
            if (!r || !r.product_id) return;
            var day = String(r.sales_date).slice(0, 10);
            if (inWindow[day]) out[r.product_id] = (out[r.product_id] || 0) + (Number(r.quantity_sold) || 0);
            if (!last[r.product_id] || day > last[r.product_id]) last[r.product_id] = day;
        });
        return { week: out, last: last };
    }

    function monthlySales() {
        var totals = {};
        function add(dateValue, amount) {
            var d = new Date(dateValue);
            if (isNaN(d.getTime())) return;
            var key = monthKey(d);
            totals[key] = (totals[key] || 0) + (Number(amount) || 0);
        }
        (readStore('kreezby_pos_sales_v1', []) || []).forEach(function (sale) {
            if (sale) add(sale.at || sale.date, sale.total);
        });
        (readStore('kreezbyOrders', []) || []).forEach(function (order) {
            if (!order) return;
            var status = String(order.status || '').toLowerCase();
            if (status.indexOf('cancel') >= 0) return;
            add(order.createdAt || order.placedAt || order.date, order.total || order.amount);
        });
        return totals;
    }

    function syncRealMetrics() {
        var items = inventoryCatalog();
        var dict = window.KreezbyDictionary;
        var sales = recentSalesByCode();
        function lineFor(item) {
            var line = dict && typeof dict.alertLineFor === 'function' ? dict.alertLineFor(item.code) : null;
            return line == null ? (item.category === 'Finished Products' ? 60 : item.category === 'Packaging' ? 20 : 15) : line;
        }
        function unitLabel(item) { return item.category === 'Finished Products' ? ' Pouches' : ''; }

        var totalUnits = 0;
        var byCat = {};
        var counts = { well: 0, low: 0, out: 0 };
        var catWell = {};
        var catCount = {};
        var catNames = {};
        var health = [];
        items.forEach(function (item) {
            var qty = Number(item.qty) || 0;
            var line = lineFor(item);
            var status = qty <= 0 ? 'out' : (qty <= line ? 'low' : 'well');
            totalUnits += qty;
            byCat[item.category] = (byCat[item.category] || 0) + qty;
            counts[status] += 1;
            catCount[item.category] = (catCount[item.category] || 0) + 1;
            if (status === 'well') catWell[item.category] = (catWell[item.category] || 0) + 1;
            (catNames[item.category] = catNames[item.category] || []).push(item.name);
            var weekly = sales.week[item.code] || 0;
            var weeks = weekly > 0 ? Math.round(qty / weekly * 10) / 10 : null;
            health.push({
                item: item.name, code: item.code, category: item.category,
                stock: qty + (item.category === 'Finished Products' ? ' Pouches' : ''),
                reorder: line + (item.category === 'Finished Products' ? ' Pouches' : ''),
                weeks: weeks == null ? '—' : weeks, status: status
            });
        });

        DATA.kpis.totalUnits.value = totalUnits;
        DATA.unitsByCategory = ['Raw Materials', 'Finished Products', 'Packaging'].map(function (name) {
            var units = byCat[name] || 0;
            return { category: name, units: units, pct: totalUnits ? Math.round(units / totalUnits * 100) : 0 };
        });
        DATA.health.total = items.length;
        DATA.health.segments.forEach(function (seg) {
            seg.count = counts[seg.key] || 0;
            seg.pct = items.length ? Math.round(seg.count / items.length * 100) : 0;
        });
        DATA.healthItems = health;
        DATA.categories.forEach(function (cat) {
            cat.count = catCount[cat.name] || 0;
            cat.pct = cat.count ? Math.round((catWell[cat.name] || 0) / cat.count * 100) : 0;
            cat.tone = cat.pct >= 70 ? 'good' : 'warn';
            cat.items = catNames[cat.name] || [];
        });

        // slow-moving finished products: more than 4 weeks of stock on hand at the current sales pace
        DATA.slowMoving = items.filter(function (item) { return item.category === 'Finished Products'; }).map(function (item) {
            var weekly = sales.week[item.code] || 0;
            var qty = Number(item.qty) || 0;
            var weeks = weekly > 0 ? Math.round(qty / weekly * 10) / 10 : null;
            return {
                item: item.name, category: item.category,
                sold: weekly + ' Pouches',
                lastSold: sales.last[item.code] || 'No sales yet',
                stock: qty + ' Pouches', weeks: weeks == null ? '—' : weeks,
                status: 'slow', _w: weeks == null ? 1e9 : weeks, _qty: qty
            };
        }).filter(function (row) { return row._qty > 0 && row._w > 4; }).sort(function (a, b) { return b._w - a._w; });

        var sellers = health.filter(function (row) { return row.category === 'Finished Products' && typeof row.weeks === 'number'; });
        DATA.kpis.weeksOfStock.value = sellers.length
            ? Math.round(sellers.reduce(function (sum, row) { return sum + row.weeks; }, 0) / sellers.length * 10) / 10
            : 0;

        // storage: real units against the configured capacity of each area
        var coldUnits = 0;
        items.forEach(function (item) { if (item.code === 'RM-EGG-01') coldUnits += Number(item.qty) || 0; });
        var dryUnits = (byCat['Raw Materials'] || 0) + (byCat['Packaging'] || 0) - coldUnits;
        var finishedUnits = byCat['Finished Products'] || 0;
        var zones = [['Dry Storage', 3000, dryUnits], ['Cold Storage', 500, coldUnits], ['Finished Goods', 1500, finishedUnits]];
        DATA.capacityZones = zones.map(function (z) {
            return { zone: z[0], capacity: z[1], used: z[2], pct: Math.min(100, Math.round(z[2] / z[1] * 100)) };
        });
        var capTotal = zones.reduce(function (sum, z) { return sum + z[1]; }, 0);
        DATA.kpis.capacity.value = capTotal;
        DATA.kpis.capacity.utilization = Math.min(100, Math.round(totalUnits / capTotal * 100));

        // monthly history: value and units are saved each month this page is opened; sales come from real orders
        var valueNow = 0;
        valueCatalog().forEach(function (item) { valueNow += valueFor(item); });
        var snaps = readStore(SNAP_KEY, {}) || {};
        var now = new Date();
        snaps[monthKey(now)] = { value: Math.round(valueNow), units: totalUnits };
        try { localStorage.setItem(SNAP_KEY, JSON.stringify(snaps)); } catch (e) { /* ignore */ }
        var months = [];
        for (var i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
        var firstKnown = null;
        months.forEach(function (d) { if (!firstKnown && snaps[monthKey(d)]) firstKnown = snaps[monthKey(d)]; });
        var soldByMonth = monthlySales();
        DATA.chartMonths = months.map(function (d) { return MONTH_NAMES[d.getMonth()]; });
        DATA.trendKnown = months.map(function (d) { return !!snaps[monthKey(d)]; });
        DATA.valueTrend = months.map(function (d) { var snap = snaps[monthKey(d)]; return snap ? snap.value : 0; });
        DATA.unitsTrend = months.map(function (d) { var snap = snaps[monthKey(d)]; return snap ? snap.units : 0; });
        DATA.stockSeries = DATA.valueTrend.slice();
        DATA.salesSeries = months.map(function (d) { return Math.round(soldByMonth[monthKey(d)] || 0); });
        var earlier = null;
        months.slice(0, 5).forEach(function (d) { if (!earlier && snaps[monthKey(d)]) earlier = { snap: snaps[monthKey(d)], label: MONTH_NAMES[d.getMonth()] }; });
        var tv = DATA.kpis.totalValue;
        if (earlier && earlier.snap.value > 0) {
            var change = (valueNow - earlier.snap.value) / earlier.snap.value * 100;
            tv.trendDir = change < 0 ? 'down' : 'up';
            tv.trend = (change >= 0 ? '+ ' : '− ') + Math.abs(Math.round(change * 10) / 10) + '% vs ' + earlier.label;
        } else {
            tv.trendDir = 'up';
            tv.trend = 'Tracking started this month';
        }
        DATA.lastUpdated = now.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function refreshInventoryTotals() {
        var items = valueCatalog();
        var saved = savedValueMap();
        var defaults = saved ? null : defaultValueMap();
        var byCategory = {};
        items.forEach(function (item) {
            byCategory[item.category] = (byCategory[item.category] || 0) + valueFor(item, saved, defaults);
        });
        var total = 0;
        Object.keys(byCategory).forEach(function (category) { total += byCategory[category]; });
        DATA.kpis.totalValue.value = Math.round(total);
        var rows = DATA.valueByCategory;
        var usedPct = 0;
        rows.forEach(function (row, index) {
            row.value = Math.round(byCategory[row.category] || 0);
            if (!total) {
                row.pct = 0;
                return;
            }
            if (index === rows.length - 1) row.pct = Math.max(0, 100 - usedPct);
            else {
                row.pct = Math.round(row.value / total * 100);
                usedPct += row.pct;
            }
        });
    }

    function writeStockCosts(items, map) {
        var local = readStore(STOCK_KEY, {});
        local.qty = local.qty || {};
        local.history = local.history || {};
        local.extra = local.extra || [];
        local.cost = local.cost || {};
        items.forEach(function (item) {
            var qty = Number(item.qty) || 0;
            if (qty <= 0) return;
            local.cost[item.code] = Math.round((Number(map[item.code]) || 0) / qty * 100) / 100;
        });
        try { localStorage.setItem(STOCK_KEY, JSON.stringify(local)); } catch (e) { /* keep the page copy */ }
    }

    function closeActionMenus(scope) {
        (scope || document).querySelectorAll('.sl-action-menu').forEach(function (menu) {
            menu.hidden = true;
            var button = menu.parentNode && menu.parentNode.querySelector('.sl-action-btn');
            if (button) button.setAttribute('aria-expanded', 'false');
        });
    }

    function closeValueEditor() {
        var open = document.getElementById('sl-value-overlay');
        var returnFocus = open && open._returnFocus;
        if (open) open.remove();
        if (returnFocus && returnFocus.focus) returnFocus.focus();
    }

    function editorTotal() {
        var total = 0;
        document.querySelectorAll('#sl-value-overlay [data-item-code]').forEach(function (input) {
            var amount = Number(input.value);
            if (isFinite(amount) && amount > 0) total += amount;
        });
        var node = document.getElementById('sl-value-total');
        if (node) node.textContent = money(Math.round(total));
    }

    function openValueEditor(root, trigger) {
        closeValueEditor();
        var items = valueCatalog();
        var saved = savedValueMap();
        var defaults = saved ? null : defaultValueMap();
        var groups = [];
        items.forEach(function (item) {
            var group = null;
            groups.forEach(function (entry) {
                if (entry.name === item.category) group = entry;
            });
            if (!group) {
                group = { name: item.category, items: [] };
                groups.push(group);
            }
            group.items.push(item);
        });
        var body = groups.map(function (group) {
            var rows = group.items.map(function (item) {
                var value = valueFor(item, saved, defaults);
                return '<label class="sl-value-row"><span>' + esc(item.name) + '</span>'
                    + '<input data-item-code="' + esc(item.code) + '" type="number" min="0" step="0.01" inputmode="decimal" value="' + value + '" aria-label="Inventory value for ' + esc(item.name) + '"></label>';
            }).join('');
            return '<section class="sl-value-group"><h5>' + esc(group.name) + '</h5>' + rows + '</section>';
        }).join('');
        var overlay = document.createElement('div');
        overlay.id = 'sl-value-overlay';
        overlay.className = 'sl-breakdown-overlay';
        overlay._returnFocus = trigger || null;
        overlay.innerHTML = ''
            + '<div class="sl-breakdown-dialog sl-value-dialog" role="dialog" aria-modal="true" aria-labelledby="sl-value-title">'
            + '<div class="sl-breakdown-head"><div><p class="sl-breakdown-kicker">Total Value of Stock</p>'
            + '<h4 id="sl-value-title">Edit inventory value</h4></div>'
            + '<button type="button" class="sl-breakdown-close" id="sl-value-cancel">Close</button></div>'
            + '<p class="sl-breakdown-note">Update the inventory value of each item, then save. The category totals use these amounts.</p>'
            + '<div class="sl-value-list">' + body + '</div>'
            + '<div class="sl-value-footer"><p id="sl-value-status" class="sl-value-status" role="status"></p>'
            + '<div class="sl-value-footer-actions"><strong>Total <span id="sl-value-total"></span></strong>'
            + '<button type="button" id="sl-value-save">Save</button></div></div>'
            + '</div>';
        document.body.appendChild(overlay);
        editorTotal();
        var close = document.getElementById('sl-value-cancel');
        if (close) close.focus();
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeValueEditor();
        });
        overlay.addEventListener('input', function (event) {
            if (event.target && event.target.hasAttribute('data-item-code')) editorTotal();
        });
        if (close) close.addEventListener('click', closeValueEditor);
        var save = document.getElementById('sl-value-save');
        if (save) {
            save.addEventListener('click', function () {
                var map = {};
                var invalid = false;
                overlay.querySelectorAll('[data-item-code]').forEach(function (input) {
                    var raw = String(input.value || '').trim();
                    var amount = raw === '' ? 0 : Number(raw);
                    if (!isFinite(amount) || amount < 0) invalid = true;
                    else map[input.getAttribute('data-item-code')] = Math.round(amount * 100) / 100;
                });
                var status = document.getElementById('sl-value-status');
                if (invalid) {
                    if (status) status.textContent = 'Enter a value of 0 or more for every item.';
                    return;
                }
                try { localStorage.setItem(VALUE_KEY, JSON.stringify(map)); } catch (e) { /* keep going */ }
                writeStockCosts(items, map);
                closeValueEditor();
                refreshInventoryTotals();
                render(root);
            });
        }
    }

    function bindValueActions(root) {
        if (!root || root.getAttribute('data-value-bound') === '1') return;
        root.setAttribute('data-value-bound', '1');
        root.addEventListener('click', function (event) {
            var toggle = event.target.closest('.sl-action-btn');
            if (toggle && root.contains(toggle)) {
                var menu = toggle.parentNode.querySelector('.sl-action-menu');
                var willOpen = menu && menu.hidden;
                closeActionMenus(root);
                if (willOpen && menu) {
                    menu.hidden = false;
                    toggle.setAttribute('aria-expanded', 'true');
                }
                return;
            }
            var edit = event.target.closest('[data-value-edit]');
            if (!edit || !root.contains(edit)) return;
            closeActionMenus(root);
            openValueEditor(root, edit);
        });
    }

    function renderValue(root, reportHref) {

        var k = DATA.kpis.totalValue;

        root.innerHTML = ''

            + '<div class="sl-detail-hero sl-kpi-green">'

            + '<div class="sl-detail-hero-label">Total Value of Stock</div>'

            + '<div class="sl-detail-hero-value">' + money(k.value) + '</div>'

            + '<div class="sl-detail-hero-caption">' + esc(k.caption) + '</div>'

            + '<div class="sl-kpi-trend ' + (k.trendDir === 'down' ? 'sl-trend-down' : 'sl-trend-up') + '">' + (k.trendDir === 'down' ? '▼ ' : '▲ ') + esc(k.trend) + '</div>'

            + '<div class="sl-mini-chart sl-mini-chart-wide">' + miniSparkBars(DATA.valueTrend.map(function (v) { return v / 10000; }), '#4caf50') + '</div>'

            + '</div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Inventory Value</h4>'

            + '<div class="sl-action"><button type="button" class="sl-action-btn" aria-haspopup="true" aria-expanded="false">Action</button>'

            + '<div class="sl-action-menu" hidden><button type="button" class="sl-action-item" data-value-edit="1">Edit</button></div></div></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table" data-sl-skip-open="1"><thead><tr>'

            + '<th>Category</th><th>Inventory Value</th>'

            + '</tr></thead><tbody>'

            + DATA.valueByCategory.map(function (row) {

                return '<tr><td><strong>' + esc(row.category) + '</strong></td>'

                    + '<td>' + money(row.value) + '</td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Monthly Value Trend (Last 6 Months)</h4></div>'

            + '<div class="sl-trend-months">' + DATA.chartMonths.map(function (m, i) {

                return '<div class="sl-trend-month"><span>' + esc(m) + '</span><strong>' + (DATA.trendKnown && !DATA.trendKnown[i] ? '—' : money(DATA.valueTrend[i])) + '</strong></div>';

            }).join('') + '</div></div>'

            + footer(reportHref);

    }



    function renderCapacity(root, reportHref) {

        var k = DATA.kpis.capacity;

        root.innerHTML = ''

            + '<div class="sl-detail-hero sl-kpi-purple">'

            + '<div class="sl-detail-hero-label">Stock Capacity</div>'

            + '<div class="sl-detail-hero-value">' + k.value.toLocaleString() + '</div>'

            + '<div class="sl-detail-hero-caption">' + esc(k.caption) + '</div>'

            + '<div class="sl-capacity-meta sl-capacity-meta-large"><span>Utilization ' + k.utilization + '%</span>'

            + '<div class="sl-capacity-bar"><div class="sl-capacity-fill" style="width:' + k.utilization + '%;"></div></div></div>'

            + '</div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Capacity by Storage Zone</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table"><thead><tr>'

            + '<th>Zone</th><th>Capacity</th><th>Used</th><th>Utilization</th><th>Status</th>'

            + '</tr></thead><tbody>'

            + DATA.capacityZones.map(function (row) {

                var tone = row.pct >= 85 ? 'low' : row.pct >= 75 ? 'well' : 'well';

                return '<tr><td><strong>' + esc(row.zone) + '</strong></td>'

                    + '<td>' + row.capacity.toLocaleString() + '</td><td>' + row.used.toLocaleString() + '</td>'

                    + '<td><div class="sl-inline-bar"><div class="sl-inline-bar-fill sl-tone-' + (row.pct >= 85 ? 'warn' : 'good') + '" style="width:' + row.pct + '%;"></div></div> ' + row.pct + '%</td>'

                    + '<td>' + statusBadge(tone) + '</td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + footer(reportHref);

    }



    function renderWeeks(root, reportHref) {

        var k = DATA.kpis.weeksOfStock;

        root.innerHTML = ''

            + '<div class="sl-detail-hero sl-kpi-amber">'

            + '<div class="sl-detail-hero-label">Weeks of Stock (Avg.)</div>'

            + '<div class="sl-detail-hero-value">' + k.value + '</div>'

            + '<div class="sl-detail-hero-caption">' + esc(k.caption) + '</div>'

            + '<div class="sl-weeks-thresholds"><span class="sl-threshold-critical">Min (Critical): ' + k.min + ' weeks</span>'

            + '<span class="sl-threshold-comfort">Max (Comfortable): ' + k.max + ' weeks</span></div>'

            + '</div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Weeks on Hand — All Items</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table"><thead><tr>'

            + '<th>Item Code</th><th>Item</th><th>Category</th><th>Current Stock</th><th>Weeks on Hand</th><th>Status</th>'

            + '</tr></thead><tbody>'

            + DATA.healthItems.map(function (row) {

                var weeksStatus = row.weeks === 0 ? 'out' : row.weeks <= k.min ? 'critical' : row.weeks <= 4 ? 'low' : 'well';

                return '<tr><td>' + esc(row.code) + '</td><td><strong>' + esc(row.item) + '</strong></td>'

                    + '<td>' + esc(row.category) + '</td><td>' + esc(row.stock) + '</td>'

                    + '<td>' + row.weeks + '</td><td>' + statusBadge(weeksStatus) + '</td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + footer(reportHref);

    }



    function renderHealth(root, reportHref) {

        var segmentsHtml = DATA.health.segments.map(function (seg) {

            return '<div class="sl-health-segment-card"><div class="sl-health-segment-dot" style="background:' + seg.color + ';"></div>'

                + '<div><strong>' + esc(seg.label) + '</strong><div class="sl-row-sub">' + seg.count + ' items · ' + seg.pct + '% of catalog</div></div></div>';

        }).join('');



        root.innerHTML = ''

            + '<div class="sl-detail-top-row">'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Stock Health</h4></div>'

            + '<div class="sl-health-body sl-health-body-large">'

            + '<div class="sl-donut sl-donut-large" style="background:' + donutStyle(DATA.health.segments) + ';">'

            + '<div class="sl-donut-hole"><strong>' + DATA.health.total + '</strong><span>Total Items</span></div></div>'

            + '<div class="sl-health-segment-grid">' + segmentsHtml + '</div></div></div></div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>All Items by Health Status</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table"><thead><tr>'

            + '<th>Item Code</th><th>Item</th><th>Category</th><th>Current Stock</th><th>Reorder</th><th>Weeks on Hand</th><th>Status</th>'

            + '</tr></thead><tbody>'

            + DATA.healthItems.map(function (row) {

                return '<tr><td>' + esc(row.code) + '</td><td><strong>' + esc(row.item) + '</strong></td>'

                    + '<td>' + esc(row.category) + '</td><td>' + esc(row.stock) + '</td><td>' + esc(row.reorder) + '</td>'

                    + '<td>' + row.weeks + '</td><td>' + statusBadge(row.status) + '</td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + footer(reportHref);

    }



    function renderAlerts(root, reportHref) {

        root.innerHTML = ''

            + '<div class="sl-detail-toolbar">'

            + '<div class="sl-toolbar-stat"><strong>' + DATA.alertCount + '</strong> open alerts</div>'

            + '<div class="sl-toolbar-stat sl-stat-critical"><strong>' + DATA.lowStockAlerts.filter(function (row) { return row.status === 'critical'; }).length + '</strong> critical</div>'

            + '<div class="sl-toolbar-stat sl-stat-low"><strong>' + DATA.lowStockAlerts.filter(function (row) { return row.status !== 'critical'; }).length + '</strong> low stock</div>'

            + '<input type="text" class="sl-search-input" placeholder="Search item or category…" id="sl-alert-search">'

            + '</div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Low Stock Alert</h4><span class="sl-alert-badge">' + DATA.alertCount + '</span></div>'

            + '<div class="sl-table-wrap" id="sl-alerts-table-wrap">' + alertsTable(DATA.lowStockAlerts) + '</div></div>'

            + footer(reportHref);



        var search = document.getElementById('sl-alert-search');

        if (search) {

            search.addEventListener('input', function () {

                var q = search.value.toLowerCase();

                var filtered = DATA.lowStockAlerts.filter(function (row) {

                    return row.item.toLowerCase().indexOf(q) !== -1 || row.type.toLowerCase().indexOf(q) !== -1;

                });

                document.getElementById('sl-alerts-table-wrap').innerHTML = alertsTable(filtered);

            });

        }

    }



    function renderCategory(root, reportHref) {

        var categoryDetail = DATA.categories.map(function (cat) {

            return '<div class="sl-category-detail-card">'

                + '<div class="sl-category-top"><span>' + esc(cat.name) + '</span><span>' + cat.pct + '% · ' + cat.count + ' items</span></div>'

                + '<div class="sl-category-track"><div class="sl-category-fill sl-tone-' + cat.tone + '" style="width:' + cat.pct + '%;"></div></div>'

                + '<ul class="sl-category-item-list">' + cat.items.map(function (name) {

                    return '<li>' + esc(name) + '</li>';

                }).join('') + '</ul></div>';

        }).join('');



        root.innerHTML = ''

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Stock by Category</h4></div>'

            + categoryBars(DATA.categories) + '</div>'

            + '<div class="sl-panel" style="margin-top:16px;"><div class="sl-panel-head"><h4>Category Item Lists</h4></div>'

            + '<div class="sl-category-detail-grid">' + categoryDetail + '</div></div>'

            + footer(reportHref);

    }



    function renderSlow(root, reportHref) {

        root.innerHTML = ''

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Slow Moving Stock</h4></div>'

            + '<div class="sl-table-wrap">' + slowTable(DATA.slowMoving) + '</div></div>'

            + footer(reportHref);

    }



    function allocateAmounts(total, weights) {
        var sum = weights.reduce(function (totalWeight, weight) { return totalWeight + weight; }, 0) || 1;
        var used = 0;
        return weights.map(function (weight, index) {
            if (index === weights.length - 1) return total - used;
            var amount = Math.round(total * weight / sum);
            used += amount;
            return amount;
        });
    }

    function signedMoney(amount) {
        return (amount > 0 ? '+' : '') + money(amount);
    }

    function monthBreakdown(index) {
        var groups = DATA.valueByCategory.map(function (row) {
            var match = null;
            DATA.categories.forEach(function (category) {
                if (category.name === row.category) match = category;
            });
            return {
                name: row.category,
                pct: row.pct,
                items: (match && match.items) || []
            };
        });
        var stockParts = allocateAmounts(DATA.stockSeries[index], groups.map(function (group) { return group.pct; }));
        var salesParts = allocateAmounts(DATA.salesSeries[index], groups.map(function (group) { return group.pct; }));
        return groups.map(function (group, groupIndex) {
            var names = group.items.length ? group.items : [];
            var weights = names.map(function () { return 1; });
            var itemStock = names.length ? allocateAmounts(stockParts[groupIndex], weights) : [];
            var itemSales = names.length ? allocateAmounts(salesParts[groupIndex], weights) : [];
            return {
                name: group.name,
                pct: group.pct,
                stock: stockParts[groupIndex],
                sales: salesParts[groupIndex],
                items: names.map(function (name, itemIndex) {
                    return { name: name, stock: itemStock[itemIndex], sales: itemSales[itemIndex] };
                })
            };
        });
    }

    function breakdownRows(index) {
        return monthBreakdown(index).map(function (group) {
            var category = '<tr class="sl-breakdown-cat"><td>' + esc(group.name) + '</td>'
                + '<td>' + money(group.stock) + '</td>'
                + '<td>' + money(group.sales) + '</td>'
                + '<td>' + signedMoney(group.stock - group.sales) + '</td>'
                + '<td>' + group.pct + '%</td></tr>';
            var items = group.items.map(function (item) {
                return '<tr class="sl-breakdown-item"><td>' + esc(item.name) + '</td>'
                    + '<td>' + money(item.stock) + '</td>'
                    + '<td>' + money(item.sales) + '</td>'
                    + '<td>' + signedMoney(item.stock - item.sales) + '</td>'
                    + '<td></td></tr>';
            }).join('');
            return category + items;
        }).join('');
    }

    function closeBreakdown() {
        var open = document.getElementById('sl-breakdown-overlay');
        var returnFocus = open && open._returnFocus;
        if (open) open.remove();
        if (returnFocus && returnFocus.focus) returnFocus.focus();
    }

    function openBreakdown(index, trigger) {
        closeBreakdown();
        var month = DATA.chartMonths[index];
        var stock = DATA.stockSeries[index];
        var sales = DATA.salesSeries[index];
        var overlay = document.createElement('div');
        overlay.id = 'sl-breakdown-overlay';
        overlay.className = 'sl-breakdown-overlay';
        overlay._returnFocus = trigger || null;
        overlay.innerHTML = ''
            + '<div class="sl-breakdown-dialog" role="dialog" aria-modal="true" aria-labelledby="sl-breakdown-title">'
            + '<div class="sl-breakdown-head"><div><p class="sl-breakdown-kicker">Stock Value vs Sales</p>'
            + '<h4 id="sl-breakdown-title">' + esc(month) + ' breakdown</h4></div>'
            + '<button type="button" class="sl-breakdown-close" id="sl-breakdown-close">Close</button></div>'
            + '<div class="sl-breakdown-totals">'
            + '<div><span>Stock value</span><strong>' + money(stock) + '</strong></div>'
            + '<div><span>Sales value</span><strong>' + money(sales) + '</strong></div>'
            + '<div><span>Variance</span><strong>' + signedMoney(stock - sales) + '</strong></div>'
            + '</div>'
            + '<p class="sl-breakdown-note">Category and item amounts add up to this month.</p>'
            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-breakdown-table"><thead><tr>'
            + '<th>Category / item</th><th>Stock value</th><th>Sales value</th><th>Variance</th><th>Share</th>'
            + '</tr></thead><tbody>' + breakdownRows(index) + '</tbody></table></div>'
            + '</div>';
        document.body.appendChild(overlay);
        var close = document.getElementById('sl-breakdown-close');
        if (close) close.focus();
        overlay.addEventListener('click', function (event) {
            if (event.target === overlay) closeBreakdown();
        });
        if (close) close.addEventListener('click', closeBreakdown);
    }

    function renderChart(root, reportHref) {

        root.innerHTML = ''

            + '<div class="sl-panel sl-chart-panel"><div class="sl-panel-head"><h4>Stock Value vs Sales</h4>'

            + '<select class="sl-chart-range" id="sl-chart-range"><option value="6">Last 6 Months</option><option value="12">Last 12 Months</option></select></div>'

            + '<div class="sl-chart-legend"><span class="sl-legend-stock">● Stock Value (₱)</span><span class="sl-legend-sales">● Sales Value (₱)</span></div>'

            + chartSvg(DATA.chartMonths, DATA.stockSeries, DATA.salesSeries, false)

            + '</div>'

            + '<div class="sl-panel" style="margin-top:16px;"><div class="sl-panel-head"><h4>Monthly Breakdown</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table" data-sl-skip-open="1"><thead><tr>'

            + '<th>Month</th><th>Stock Value (₱)</th><th>Sales Value (₱)</th><th>Variance</th><th>View</th>'

            + '</tr></thead><tbody>'

            + DATA.chartMonths.map(function (m, i) {

                var known = !DATA.trendKnown || DATA.trendKnown[i];
                var diff = DATA.stockSeries[i] - DATA.salesSeries[i];

                return '<tr><td><strong>' + esc(m) + '</strong></td>'

                    + '<td>' + (known ? money(DATA.stockSeries[i]) : '—') + '</td>'

                    + '<td>' + money(DATA.salesSeries[i]) + '</td>'

                    + '<td>' + (known ? signedMoney(diff) : '—') + '</td>'

                    + '<td><button type="button" class="sl-view-breakdown" data-month-index="' + i + '">View</button></td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + footer(reportHref);

        var range = document.getElementById('sl-chart-range');
        if (range) {
            range.addEventListener('change', function () {
                var heading = root.querySelector('.sl-chart-panel h4');
                if (heading) heading.textContent = range.value === '12' ? 'Stock Value vs Sales — Last 12 Months' : 'Stock Value vs Sales';
            });
        }
        if (root.getAttribute('data-breakdown-bound') !== '1') {
            root.setAttribute('data-breakdown-bound', '1');
            root.addEventListener('click', function (event) {
                var button = event.target.closest('.sl-view-breakdown');
                if (!button || !root.contains(button)) return;
                openBreakdown(Number(button.getAttribute('data-month-index')), button);
            });
        }

    }



    var RENDERERS = {

        units: renderUnits,

        value: renderValue,

        capacity: renderCapacity,

        weeks: renderWeeks,

        health: renderHealth,

        alerts: renderAlerts,

        category: renderCategory,

        slow: renderSlow,

        chart: renderChart

    };



    function render(root) {

        if (!root) return;

        var view = root.getAttribute('data-view') || 'value';

        var reportHref = root.getAttribute('data-report-href');
        if (!reportHref) {
            var pathName = location.pathname || '';
            reportHref = /\/head_admin\//i.test(pathName)
                ? 'stocks-headadmin.html'
                : (/\/staff\//i.test(pathName) || /\/staff_names\//i.test(pathName) ? 'stocks-staff.html' : 'stocks-admin.html');
        }

        syncOperationalAlerts();
        syncRealMetrics();
        refreshInventoryTotals();
        var fn = RENDERERS[view] || renderValue;

        fn(root, reportHref);
        linkStockRows(root, reportHref);
        bindValueActions(root);

    }

    function linkStockRows(root, href) {
        root.querySelectorAll('table.sl-compact-table').forEach(function (table) {
            if (table.getAttribute('data-sl-skip-open') === '1') return;
            var head = table.querySelector('thead tr');
            if (head && !head.querySelector('.sl-open-head')) {
                var th = document.createElement('th');
                th.className = 'sl-open-head';
                th.textContent = 'Open';
                head.appendChild(th);
            }
            table.querySelectorAll('tbody tr').forEach(function (tr) {
                if (tr.querySelector('.sl-open-stock')) return;
                var td = document.createElement('td');
                var link = document.createElement('a');
                link.className = 'sl-open-stock';
                link.href = href;
                link.setAttribute('data-turbo-frame', 'kreezby-main-content');
                link.setAttribute('data-turbo-action', 'advance');
                link.textContent = 'Open stock';
                td.appendChild(link);
                tr.appendChild(td);
                tr.tabIndex = 0;
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', function (event) {
                    if (event.target.closest('a, button, input, select')) return;
                    link.click();
                });
                tr.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter') link.click();
                });
            });
        });
    }



    function headStock() {
        return /\/head_admin\//i.test(location.pathname || '');
    }

    function ensureDictionary() {
        if (window.KreezbyDictionary || document.getElementById('kreezby-sl-dictionary')) return;
        var base = '';
        Array.prototype.forEach.call(document.getElementsByTagName('script'), function (node) {
            var src = node.getAttribute('src') || '';
            var at = src.indexOf('stocklevel-dashboard.js');
            if (at >= 0) base = src.slice(0, at);
        });
        var loader = document.createElement('script');
        loader.id = 'kreezby-sl-dictionary';
        loader.src = base + 'kreezby-data-dictionary.js?v=20261022mv2';
        loader.onload = function () { render(document.getElementById('stocklevel-dashboard-root')); };
        document.body.appendChild(loader);
    }

    function boot() {
        if (headStock()) document.body.classList.add('kreezby-head-stock');
        render(document.getElementById('stocklevel-dashboard-root'));
        ensureDictionary();
    }



    function onPageReady() {

        if (document.getElementById('stocklevel-dashboard-root')) boot();

    }



    document.addEventListener('click', function (event) {
        if (!event.target.closest('.sl-action')) closeActionMenus(document);
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (document.getElementById('sl-value-overlay')) {
            closeValueEditor();
            return;
        }
        closeActionMenus(document);
        closeBreakdown();
    });

    // Re-draw the open dashboard when stock changes elsewhere (not while a dialog is open).
    document.addEventListener('kreezby:stocks-sync', function () {
        var root = document.getElementById('stocklevel-dashboard-root');
        if (!root) return;
        if (document.getElementById('sl-value-overlay') || document.querySelector('.sl-breakdown-overlay, .sl-overlay')) return;
        var el = document.activeElement;
        if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.id.match(/search/i)) return;
        try { render(root); } catch (e) { /* next change redraws */ }
    });

    document.addEventListener('DOMContentLoaded', onPageReady);

    document.addEventListener('content:replaced', onPageReady);

    document.addEventListener('kreezby:page-load', onPageReady);

    document.addEventListener('turbo:frame-load', function (event) {

        if (event.target && event.target.id === 'kreezby-main-content') onPageReady();

    });



    window.KreezbyStockLevelDashboard = { DATA: DATA, render: render, boot: boot, turboLinks: true };

})();


