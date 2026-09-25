/**

 * Stock Level inventory dashboard — one full-detail view per navigation pill.

 */

(function () {

    'use strict';



    var DATA = {

        kpis: {

            totalUnits: { value: 210000, caption: 'Total across all items' },

            totalValue: { value: 598000, caption: 'Total inventory value', trend: '+ 12.5% vs last 12 months' },

            capacity: { value: 250000, caption: 'Storage capacity', utilization: 81 },

            weeksOfStock: { value: 12, caption: 'Average weeks of stock', min: 2, max: 20 }

        },

        unitsByCategory: [

            { category: 'Raw Materials', units: 98000, pct: 47 },

            { category: 'Finished Products', units: 112000, pct: 53 }

        ],

        valueByCategory: [

            { category: 'Raw Materials', value: 185400, pct: 31 },

            { category: 'Finished Products', value: 412600, pct: 69 }

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

            { item: 'Chocolate', type: 'Raw Material', current: '45 kg', reorder: '100 kg', status: 'low' },

            { item: 'Ube', type: 'Raw Material', current: '0 kg', reorder: '25 kg', status: 'critical' },

            { item: 'Choco-Almond', type: 'Finished', current: '18 packs', reorder: '40 packs', status: 'low' },

            { item: 'Flour (Premium)', type: 'Raw Material', current: '120 kg', reorder: '200 kg', status: 'low' },

            { item: 'Butter', type: 'Raw Material', current: '8 kg', reorder: '30 kg', status: 'critical' },

            { item: 'Cocoa Powder', type: 'Raw Material', current: '22 kg', reorder: '50 kg', status: 'low' },

            { item: 'Lemon Crinkles', type: 'Finished', current: '85 packs', reorder: '100 packs', status: 'low' },

            { item: 'Mango Crinkles', type: 'Finished', current: '45 jars', reorder: '75 jars', status: 'critical' },

            { item: 'Red Velvet', type: 'Finished', current: '92 packs', reorder: '120 packs', status: 'low' },

            { item: 'Melon Crinkles', type: 'Finished', current: '64 packs', reorder: '100 packs', status: 'low' }

        ],

        healthItems: [

            { item: 'Chocolate Crinkles', code: 'CRK-CHO-P', category: 'Finished Products', stock: '450 packs', reorder: '150', weeks: 8, status: 'well' },

            { item: 'Choco-Almond Crinkles', code: 'CRK-ALM-P', category: 'Finished Products', stock: '320 packs', reorder: '100', weeks: 9, status: 'well' },

            { item: 'Choco Butternut', code: 'CRK-BUT-J', category: 'Finished Products', stock: '210 jars', reorder: '80', weeks: 7, status: 'well' },

            { item: 'Ube Crinkles', code: 'CRK-UBE-P', category: 'Finished Products', stock: '180 packs', reorder: '100', weeks: 6, status: 'well' },

            { item: 'Lemon Crinkles', code: 'CRK-LEM-P', category: 'Finished Products', stock: '85 packs', reorder: '100', weeks: 3, status: 'low' },

            { item: 'Mango Crinkles', code: 'CRK-MNG-J', category: 'Finished Products', stock: '45 jars', reorder: '75', weeks: 2, status: 'low' },

            { item: 'Chocolate (Raw)', code: 'RAW-CHO', category: 'Raw Materials', stock: '45 kg', reorder: '100 kg', weeks: 1, status: 'low' },

            { item: 'Ube Flavoring', code: 'RAW-UBE', category: 'Raw Materials', stock: '0 kg', reorder: '25 kg', weeks: 0, status: 'out' },

            { item: 'Flour (Premium)', code: 'RAW-FLR', category: 'Raw Materials', stock: '820 kg', reorder: '200 kg', weeks: 14, status: 'well' },

            { item: 'Red Velvet Pouch', code: 'CRK-RVV-P', category: 'Finished Products', stock: '890 packs', reorder: '120', weeks: 16, status: 'well' }

        ],

        categories: [

            {

                name: 'Raw Materials',

                pct: 78,

                count: 120,

                tone: 'good',

                items: ['Flour (Premium)', 'Chocolate (Raw)', 'Butter', 'Cocoa Powder', 'Ube Flavoring', 'Sugar', 'Eggs']

            },

            {

                name: 'Finished Products',

                pct: 62,

                count: 85,

                tone: 'warn',

                items: ['Chocolate Crinkles', 'Choco-Almond', 'Ube Crinkles', 'Lemon Crinkles', 'Mango Crinkles', 'Red Velvet']

            }

        ],

        slowMoving: [

            { item: 'Product A', category: 'Finished Products', sold: '1,250', lastSold: '12/12/2023', stock: '1,250', weeks: '16', status: 'slow' },

            { item: 'Red Velvet Pouch', category: 'Finished Products', sold: '420', lastSold: '01/15/2024', stock: '890', weeks: '14', status: 'slow' },

            { item: 'Pandan Crinkles', category: 'Finished Products', sold: '310', lastSold: '02/02/2024', stock: '640', weeks: '13', status: 'slow' },

            { item: 'Melon Crinkles', category: 'Finished Products', sold: '280', lastSold: '02/18/2024', stock: '520', weeks: '12', status: 'slow' },

            { item: 'Choco-Mint Pouch', category: 'Finished Products', sold: '195', lastSold: '03/01/2024', stock: '410', weeks: '11', status: 'slow' },

            { item: 'Strawberry Jar', category: 'Finished Products', sold: '160', lastSold: '03/10/2024', stock: '380', weeks: '10', status: 'slow' }

        ],

        chartMonths: ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],

        stockSeries: [62000, 68000, 71000, 76000, 82000, 88000],

        salesSeries: [54000, 59000, 57000, 63000, 69000, 74000],

        unitsTrend: [176000, 184000, 192000, 198000, 204000, 210000],

        valueTrend: [480000, 505000, 528000, 552000, 575000, 598000],

        lastUpdated: 'May 20, 2024 09:30 AM'

    };



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

            + '<svg class="sl-line-chart' + (tall ? ' sl-line-chart-tall' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Stock value versus sales chart">'

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

            + '<a class="sl-btn-report" href="' + esc(reportHref) + '">View Full Inventory Report</a>'

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

        return '<table class="sl-compact-table sl-slow-table"><thead><tr>'

            + '<th>Item</th><th>Category</th><th>Units Sold (Last 3 Mo.)</th><th>Last Sold</th><th>Current Stock</th><th>Weeks</th><th>Status</th>'

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

            + '<div class="sl-mini-chart sl-mini-chart-wide">' + miniSparkBars(DATA.unitsTrend.map(function (v) { return v / 3000; }), '#1e88e5') + '</div>'

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



    function renderValue(root, reportHref) {

        var k = DATA.kpis.totalValue;

        root.innerHTML = ''

            + '<div class="sl-detail-hero sl-kpi-green">'

            + '<div class="sl-detail-hero-label">Total Value of Stock</div>'

            + '<div class="sl-detail-hero-value">' + money(k.value) + '</div>'

            + '<div class="sl-detail-hero-caption">' + esc(k.caption) + '</div>'

            + '<div class="sl-kpi-trend sl-trend-up">▲ ' + esc(k.trend) + '</div>'

            + '<div class="sl-mini-chart sl-mini-chart-wide">' + miniSparkBars(DATA.valueTrend.map(function (v) { return v / 10000; }), '#4caf50') + '</div>'

            + '</div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Value by Category</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table"><thead><tr>'

            + '<th>Category</th><th>Inventory Value</th><th>Share</th><th>Distribution</th>'

            + '</tr></thead><tbody>'

            + DATA.valueByCategory.map(function (row) {

                return '<tr><td><strong>' + esc(row.category) + '</strong></td>'

                    + '<td>' + money(row.value) + '</td><td>' + row.pct + '%</td>'

                    + '<td><div class="sl-inline-bar"><div class="sl-inline-bar-fill sl-tone-good" style="width:' + row.pct + '%;"></div></div></td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Monthly Value Trend (Last 6 Months)</h4></div>'

            + '<div class="sl-trend-months">' + DATA.chartMonths.map(function (m, i) {

                return '<div class="sl-trend-month"><span>' + esc(m) + '</span><strong>' + money(DATA.valueTrend[i]) + '</strong></div>';

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

            + '<div class="sl-toolbar-stat sl-stat-critical"><strong>3</strong> critical</div>'

            + '<div class="sl-toolbar-stat sl-stat-low"><strong>7</strong> low stock</div>'

            + '<input type="text" class="sl-search-input" placeholder="Search item or category…" id="sl-alert-search">'

            + '</div>'

            + '<div class="sl-panel"><div class="sl-panel-head"><h4>Low Stock Alerts</h4><span class="sl-alert-badge">' + DATA.alertCount + '</span></div>'

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



    function renderChart(root, reportHref) {

        root.innerHTML = ''

            + '<div class="sl-panel sl-chart-panel"><div class="sl-panel-head"><h4>Stock Value vs Sales</h4>'

            + '<select class="sl-chart-range"><option>Last 6 Months</option><option>Last 12 Months</option></select></div>'

            + '<div class="sl-chart-legend"><span class="sl-legend-stock">● Stock Value (₱)</span><span class="sl-legend-sales">● Sales Value (₱)</span></div>'

            + chartSvg(DATA.chartMonths, DATA.stockSeries, DATA.salesSeries, true)

            + '</div>'

            + '<div class="sl-panel" style="margin-top:16px;"><div class="sl-panel-head"><h4>Monthly Breakdown</h4></div>'

            + '<div class="sl-table-wrap"><table class="sl-compact-table sl-detail-table"><thead><tr>'

            + '<th>Month</th><th>Stock Value (₱)</th><th>Sales Value (₱)</th><th>Variance</th>'

            + '</tr></thead><tbody>'

            + DATA.chartMonths.map(function (m, i) {

                var diff = DATA.stockSeries[i] - DATA.salesSeries[i];

                return '<tr><td><strong>' + esc(m) + '</strong></td>'

                    + '<td>' + money(DATA.stockSeries[i]) + '</td>'

                    + '<td>' + money(DATA.salesSeries[i]) + '</td>'

                    + '<td>' + (diff >= 0 ? '+' : '') + money(diff) + '</td></tr>';

            }).join('')

            + '</tbody></table></div></div>'

            + footer(reportHref);

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

        var view = root.getAttribute('data-view') || 'units';

        var reportHref = root.getAttribute('data-report-href');
        if (!reportHref) {
            reportHref = /\/head_admin\//i.test(location.pathname || '')
                ? 'stocks-headadmin.html'
                : 'stocks-admin.html';
        }

        var fn = RENDERERS[view] || renderUnits;

        fn(root, reportHref);

    }



    function boot() {

        render(document.getElementById('stocklevel-dashboard-root'));

    }



    function onPageReady() {

        if (document.getElementById('stocklevel-dashboard-root')) boot();

    }



    document.addEventListener('DOMContentLoaded', onPageReady);

    document.addEventListener('content:replaced', onPageReady);

    document.addEventListener('kreezby:page-load', onPageReady);

    document.addEventListener('turbo:frame-load', function (event) {

        if (event.target && event.target.id === 'kreezby-main-content') onPageReady();

    });



    window.KreezbyStockLevelDashboard = { DATA: DATA, render: render, boot: boot };

})();


