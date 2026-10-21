/**
 * Operations dashboard for head admin and admin.
 * Numbers come from shop sales, orders, and stock already stored in the browser.
 */
(function () {
    'use strict';

    var RANGE_KEY = 'kreezby-ops-dash-range';
    var PRICES = {
        'CRK-CHO-P': 165,
        'CRK-ALM-P': 165,
        'CRK-LEM-P': 165,
        'CRK-BUT-J': 200,
        'CRK-MNG-J': 165,
        'CRK-UBE-P': 165
    };
    var BAR_COLORS = ['#8d6e63', '#7e57c2', '#f9a825', '#90a4ae', '#66bb6a'];
    var state = {
        from: '',
        to: '',
        chart: 'daily',
        best: 'this',
        expiryDays: 30,
        insightVariant: 0,
        generatedAt: new Date()
    };

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function iso(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function parseDay(value) {
        var text = String(value || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
        return text;
    }

    function inRange(day, from, to) {
        return !!day && day >= from && day <= to;
    }

    function addDays(day, count) {
        var parts = day.split('-');
        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        date.setDate(date.getDate() + count);
        return iso(date);
    }

    function monthBounds(day) {
        var parts = day.split('-');
        var start = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        var end = new Date(Number(parts[0]), Number(parts[1]), 0);
        return { from: iso(start), to: iso(end) };
    }

    function previousMonth(from) {
        var parts = from.split('-');
        var date = new Date(Number(parts[0]), Number(parts[1]) - 2, 1);
        return monthBounds(iso(date));
    }

    function formatLong(day) {
        var parts = day.split('-');
        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatStamp(date) {
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    }

    function money(value) {
        return '₱' + Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function count(value) {
        return Math.round(Number(value) || 0).toLocaleString('en-PH');
    }

    function priceFor(id) {
        var saved = readJson('kreezby_data_dictionary_v1', {}).product_prices || {};
        var custom = Number(saved[id]);
        if (Number.isFinite(custom) && custom > 0) return custom;
        return PRICES[id] || 165;
    }

    function dict() {
        return window.KreezbyDictionary || null;
    }

    function salesRows() {
        var api = dict();
        if (!api || typeof api.salesTransactions !== 'function') return [];
        return api.salesTransactions() || [];
    }

    function eachOrder(fn) {
        readJson('kreezbyOrders', []).forEach(function (order) {
            if (!order) return;
            fn({
                status: order.status,
                date: parseDay(order.date),
                total: Number(String(order.subtotal != null ? order.subtotal : order.total).replace(/[^\d.]/g, '')) || 0
            });
        });
        var pos = readJson('kreezby-po-orders-v1', {});
        Object.keys(pos || {}).forEach(function (code) {
            var order = pos[code];
            if (!order) return;
            var total = 0;
            (order.items || []).forEach(function (item) {
                var qty = Number(item.qty != null ? item.qty : item.quantity) || 0;
                var cost = Number(item.cost != null ? item.cost : item.price) || 0;
                total += qty * cost;
            });
            fn({ status: order.status, date: parseDay(order.dateCreated || order.date), total: total });
        });
        var bos = readJson('kreezby-bo-orders-v1', {});
        Object.keys(bos || {}).forEach(function (code) {
            var order = bos[code];
            if (!order) return;
            fn({ status: order.status, date: parseDay(order.dateCreated || order.date || order.expectedDelivery), total: 0 });
        });
    }

    function statusBucket(status) {
        var text = String(status || '').toLowerCase();
        if (text.indexOf('cancel') >= 0 || text.indexOf('return') >= 0 || text === 'rejected') return 'cancelled';
        if (text.indexOf('complete') >= 0 || text === 'delivered') return 'completed';
        return 'processing';
    }

    function latestDataDay() {
        var latest = '';
        salesRows().forEach(function (row) {
            var day = parseDay(row.sales_date);
            if (day && day > latest) latest = day;
        });
        eachOrder(function (order) {
            if (order.date && order.date > latest) latest = order.date;
        });
        return latest;
    }

    function loadRange() {
        var saved = null;
        try { saved = JSON.parse(sessionStorage.getItem(RANGE_KEY) || 'null'); } catch (e) { saved = null; }
        if (saved && parseDay(saved.from) && parseDay(saved.to)) {
            state.from = saved.from;
            state.to = saved.to;
            return;
        }
        var latest = latestDataDay();
        var today = iso(new Date());
        var anchor = latest && latest.slice(0, 7) !== today.slice(0, 7) ? latest : today;
        var bounds = monthBounds(anchor);
        state.from = bounds.from;
        state.to = bounds.to;
    }

    function saveRange() {
        try { sessionStorage.setItem(RANGE_KEY, JSON.stringify({ from: state.from, to: state.to })); } catch (e) { /* ignore */ }
    }

    function daysBetween(from, to) {
        var list = [];
        var cursor = from;
        var guard = 0;
        while (cursor <= to && guard < 400) {
            list.push(cursor);
            cursor = addDays(cursor, 1);
            guard += 1;
        }
        return list;
    }

    function stockRows() {
        var api = dict();
        if (!api || typeof api.insightSnapshot !== 'function') return [];
        var snap = api.insightSnapshot();
        return (snap.products || []).map(function (row) {
            var id = api.productId ? api.productId(row.name) : '';
            var product = id && api.productById ? api.productById(id) : null;
            return {
                id: id,
                name: row.name,
                stock: Number(row.stock) || 0,
                recommended: Number(row.recommendedStock) || 0,
                expires: product ? parseDay(product.expiration_date) : ''
            };
        });
    }

    function stockLevel(row) {
        if (row.stock <= 0) return 'out';
        if (row.recommended && row.stock < row.recommended) return 'low';
        return 'in';
    }

    function buildModel() {
        var prior = previousMonth(state.from);
        var sales = { value: 0, units: 0, byDay: {}, byProduct: {} };
        var priorSales = { value: 0, units: 0, byProduct: {} };
        salesRows().forEach(function (row) {
            var day = parseDay(row.sales_date);
            var qty = Number(row.quantity_sold) || 0;
            var value = qty * priceFor(row.product_id);
            var name = 'Product';
            var api = dict();
            if (api && api.productById) {
                var product = api.productById(row.product_id);
                if (product && product.product_name) name = product.product_name;
            }
            var bucket = inRange(day, state.from, state.to) ? sales : (inRange(day, prior.from, prior.to) ? priorSales : null);
            if (!bucket) return;
            bucket.value += value;
            bucket.units += qty;
            if (bucket === sales) {
                sales.byDay[day] = (sales.byDay[day] || 0) + value;
            }
            var productBucket = bucket.byProduct[row.product_id] || { id: row.product_id, name: name, units: 0, value: 0 };
            productBucket.units += qty;
            productBucket.value += value;
            bucket.byProduct[row.product_id] = productBucket;
        });

        var orders = { total: 0, completed: 0, processing: 0, cancelled: 0 };
        var priorOrders = 0;
        eachOrder(function (order) {
            if (inRange(order.date, state.from, state.to)) {
                orders.total += 1;
                orders[statusBucket(order.status)] += 1;
            } else if (inRange(order.date, prior.from, prior.to)) {
                priorOrders += 1;
            }
        });

        var stocks = stockRows();
        var inventory = { in: 0, low: 0, out: 0, total: stocks.length };
        var lowNames = [];
        stocks.forEach(function (row) {
            var level = stockLevel(row);
            inventory[level] += 1;
            if (level !== 'in') lowNames.push(row.name);
        });

        var bestSource = state.best === 'last' ? priorSales.byProduct : sales.byProduct;
        var best = Object.keys(bestSource).map(function (id) { return bestSource[id]; });
        best.sort(function (a, b) { return b.units - a.units; });
        var bestTotal = best.reduce(function (sum, row) { return sum + row.units; }, 0);
        best = best.slice(0, 5);

        return {
            sales: sales,
            priorSales: priorSales,
            orders: orders,
            priorOrders: priorOrders,
            inventory: inventory,
            lowNames: lowNames,
            best: best,
            bestTotal: bestTotal,
            stocks: stocks,
            prior: prior
        };
    }

    function trend(current, previous, suffix) {
        if (!current && !previous) return { cls: 'flat', text: 'No change ' + suffix };
        if (!previous && current) return { cls: 'up', text: '↑ New ' + suffix };
        var delta = ((current - previous) / previous) * 100;
        var rounded = Math.round(delta);
        if (!rounded) return { cls: 'flat', text: '0% ' + suffix };
        return {
            cls: rounded > 0 ? 'up' : 'down',
            text: (rounded > 0 ? '↑ ' : '↓ ') + Math.abs(rounded) + '% ' + suffix
        };
    }

    function niceMax(value) {
        if (value <= 0) return 1;
        var pow = Math.pow(10, Math.floor(Math.log(value) / Math.LN10));
        var step = pow;
        if (value / pow > 5) step = pow * 2;
        if (value / pow > 2 && value / pow <= 5) step = pow;
        return Math.ceil(value / step) * step;
    }

    function chartPoints(model) {
        var days = daysBetween(state.from, state.to);
        if (state.chart === 'weekly') {
            var weeks = [];
            days.forEach(function (day, index) {
                var slot = Math.floor(index / 7);
                if (!weeks[slot]) weeks[slot] = { label: formatLong(day).replace(/, \d{4}$/, ''), value: 0 };
                weeks[slot].value += model.sales.byDay[day] || 0;
            });
            return weeks;
        }
        return days.map(function (day) {
            return { label: formatLong(day).replace(/, \d{4}$/, ''), value: model.sales.byDay[day] || 0 };
        });
    }

    function lineChart(points) {
        if (!points.length) return '<div class="ops-empty">No sales in this range.</div>';
        var width = 560;
        var height = 220;
        var left = 52;
        var right = 12;
        var top = 16;
        var bottom = 28;
        var max = niceMax(Math.max.apply(null, points.map(function (point) { return point.value; }).concat([1])));
        var innerW = width - left - right;
        var innerH = height - top - bottom;
        var step = points.length > 1 ? innerW / (points.length - 1) : 0;
        var coords = points.map(function (point, index) {
            var x = left + (points.length === 1 ? innerW / 2 : step * index);
            var y = top + innerH - (point.value / max) * innerH;
            return { x: x, y: y, label: point.label, value: point.value };
        });
        var line = coords.map(function (point) { return point.x.toFixed(1) + ',' + point.y.toFixed(1); }).join(' ');
        var grid = '';
        for (var i = 0; i <= 4; i++) {
            var y = top + (innerH / 4) * i;
            var label = Math.round(max - (max / 4) * i);
            grid += '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '" stroke="#f0ebe7" stroke-width="1"/>';
            grid += '<text x="' + (left - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#9a918b">' + count(label) + '</text>';
        }
        var dots = coords.map(function (point) {
            return '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="3.5" fill="#c45c4a" stroke="#fff" stroke-width="1.5"><title>' + esc(point.label) + ': ' + money(point.value) + '</title></circle>';
        }).join('');
        var labels = '';
        var stride = Math.ceil(coords.length / 6);
        coords.forEach(function (point, index) {
            if (index % stride !== 0 && index !== coords.length - 1) return;
            labels += '<text x="' + point.x.toFixed(1) + '" y="' + (height - 8) + '" text-anchor="middle" font-size="11" fill="#9a918b">' + esc(point.label) + '</text>';
        });
        return '<svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Sales overview">' +
            grid +
            '<polyline fill="none" stroke="#c45c4a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + line + '"/>' +
            dots + labels + '</svg>';
    }

    function donut(segments, centerValue, centerLabel) {
        var radius = 42;
        var circ = 2 * Math.PI * radius;
        var total = segments.reduce(function (sum, seg) { return sum + seg.value; }, 0);
        var rings = '';
        if (!total) {
            rings = '<circle cx="60" cy="60" r="42" fill="none" stroke="#f1eeeb" stroke-width="14"/>';
        } else {
            var offset = 0;
            segments.forEach(function (seg) {
                if (!seg.value) return;
                var len = (seg.value / total) * circ;
                rings += '<circle cx="60" cy="60" r="42" fill="none" stroke="' + seg.color + '" stroke-width="14" stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 60 60)"/>';
                offset += len;
            });
        }
        return '<svg class="ops-donut" viewBox="0 0 120 120" role="img" aria-label="' + esc(centerLabel) + '">' +
            rings +
            '<text x="60" y="56" text-anchor="middle" font-size="18" font-weight="800" fill="#241c18">' + esc(centerValue) + '</text>' +
            '<text x="60" y="74" text-anchor="middle" font-size="9" fill="#8a817c">' + esc(centerLabel) + '</text></svg>';
    }

    function legend(segments, total) {
        return '<ul class="ops-legend">' + segments.map(function (seg) {
            var pct = total ? Math.round((seg.value / total) * 100) : 0;
            return '<li><i style="background:' + seg.color + '"></i><span>' + esc(seg.label) + '</span><b>' + count(seg.value) + ' (' + pct + '%)</b></li>';
        }).join('') + '</ul>';
    }

    function insightText(model) {
        var top = model.best.slice(0, 2).map(function (row) { return row.name; });
        var low = model.lowNames.slice(0, 3);
        var salesTrend = trend(model.sales.value, model.priorSales.value, 'compared to last month');
        var change = salesTrend.cls === 'up' && model.priorSales.value
            ? 'Sales increased by ' + salesTrend.text.replace('↑ ', '').replace(' compared to last month', '') + ' compared to last month'
            : salesTrend.cls === 'down' && model.priorSales.value
                ? 'Sales decreased by ' + salesTrend.text.replace('↓ ', '').replace(' compared to last month', '') + ' compared to last month'
                : model.sales.value
                    ? 'Sales for this period are ' + money(model.sales.value)
                    : 'There are no recorded sales in this period yet';
        var leaders = top.length > 1
            ? nameList(top) + ' as the top-performing products'
            : top.length === 1
                ? top[0] + ' as the top-performing product'
                : 'no flavor leading sales yet';
        var stockNote = low.length
            ? 'Inventory for ' + nameList(low) + ' is running low and should be replenished soon.'
            : 'Finished-goods stock is within the reorder lines.';
        var advice = top.length
            ? 'Based on current orders and stock levels, it is recommended to increase production of ' + top.join(' and ') + ' to meet the expected demand for the coming week.'
            : 'Record more sales before changing the production plan.';
        var variants = [
            change + ', with ' + leaders + '. ' + stockNote + ' ' + advice,
            leaders.charAt(0).toUpperCase() + leaders.slice(1) + '. ' + change + '. ' + stockNote + ' ' + advice,
            stockNote + ' ' + change + ', and ' + leaders + '. ' + advice
        ];
        return variants[state.insightVariant % variants.length];
    }

    function nameList(list) {
        if (list.length <= 1) return list[0] || '';
        if (list.length === 2) return list[0] + ' and ' + list[1];
        return list.slice(0, -1).join(', ') + ', and ' + list[list.length - 1];
    }

    function sessionName(root) {
        var session = readJson('kreezby_session', {});
        var name = String(session.userName || session.name || '').trim();
        return name || root.getAttribute('data-fallback-name') || 'Admin';
    }

    function initials(name) {
        var parts = String(name || '').trim().split(/\s+/).slice(0, 2);
        return parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || 'K';
    }

    function paint(root) {
        var model = buildModel();
        var salesTrend = trend(model.sales.value, model.priorSales.value, 'vs last month');
        var orderTrend = trend(model.orders.total, model.priorOrders, 'vs last month');
        var unitTrend = trend(model.sales.units, model.priorSales.units, 'vs last month');
        root.querySelector('[data-kpi="sales"]').textContent = money(model.sales.value);
        root.querySelector('[data-kpi="orders"]').textContent = count(model.orders.total);
        root.querySelector('[data-kpi="units"]').textContent = count(model.sales.units) + ' pcs';
        root.querySelector('[data-kpi="low"]').textContent = count(model.inventory.low + model.inventory.out);
        setTrend(root.querySelector('[data-trend="sales"]'), salesTrend);
        setTrend(root.querySelector('[data-trend="orders"]'), orderTrend);
        setTrend(root.querySelector('[data-trend="units"]'), unitTrend);
        root.querySelector('[data-trend="low"]').textContent = model.lowNames.length
            ? 'below the reorder line'
            : 'stock is healthy';

        var chartHost = root.querySelector('[data-chart]');
        var points = chartPoints(model);
        var hasSales = points.some(function (point) { return point.value > 0; });
        chartHost.innerHTML = hasSales ? lineChart(points) : '<div class="ops-empty">No sales in this range.</div>';

        var bestHost = root.querySelector('[data-best]');
        if (!model.best.length) {
            bestHost.innerHTML = '<p class="ops-empty">No product sales in this period.</p>';
        } else {
            bestHost.innerHTML = '<ol class="ops-best-list">' + model.best.map(function (row, index) {
                var pct = model.bestTotal ? Math.round((row.units / model.bestTotal) * 100) : 0;
                return '<li><span class="ops-rank r' + (index + 1) + '">' + (index + 1) + '</span>' +
                    '<span class="ops-best-copy"><span class="ops-best-name">' + esc(row.name) + '</span>' +
                    '<span class="ops-best-qty">' + count(row.units) + ' pcs</span></span>' +
                    '<b class="ops-best-pct">' + pct + '%</b>' +
                    '<span class="ops-bar"><span style="width:' + Math.max(pct, 4) + '%;background:' + BAR_COLORS[index % BAR_COLORS.length] + '"></span></span></li>';
            }).join('') + '</ol>';
        }

        var orderSegments = [
            { label: 'Completed', value: model.orders.completed, color: '#43a047' },
            { label: 'Processing', value: model.orders.processing, color: '#f5a623' },
            { label: 'Cancelled', value: model.orders.cancelled, color: '#e53935' }
        ];
        root.querySelector('[data-donut="orders"]').innerHTML = donut(orderSegments, count(model.orders.total), 'Total Orders');
        root.querySelector('[data-legend="orders"]').innerHTML = legend(orderSegments, model.orders.total);

        var stockSegments = [
            { label: 'In Stock', value: model.inventory.in, color: '#43a047' },
            { label: 'Low Stock', value: model.inventory.low, color: '#f5a623' },
            { label: 'Out of Stock', value: model.inventory.out, color: '#e53935' }
        ];
        root.querySelector('[data-donut="stock"]').innerHTML = donut(stockSegments, count(model.inventory.total), 'Total Items');
        root.querySelector('[data-legend="stock"]').innerHTML = legend(stockSegments, model.inventory.total);

        var today = iso(new Date());
        var horizon = addDays(today, state.expiryDays);
        var expiring = model.stocks.filter(function (row) {
            return row.expires && row.expires <= horizon;
        }).sort(function (a, b) { return a.expires < b.expires ? -1 : 1; });
        var table = root.querySelector('[data-expiry]');
        table.innerHTML = expiring.length
            ? expiring.map(function (row) {
                return '<tr><td>' + esc(row.name) + '</td><td>' + count(row.stock) + ' pcs</td><td>' + esc(formatLong(row.expires)) + '</td></tr>';
            }).join('')
            : '<tr><td colspan="3">No products expire in this window.</td></tr>';

        root.querySelector('[data-insight]').textContent = insightText(model);
        root.querySelector('[data-generated]').textContent = 'Generated on ' + formatStamp(state.generatedAt);
        var rangeBtn = root.querySelector('[data-range-label]');
        if (rangeBtn) rangeBtn.textContent = formatLong(state.from) + ' – ' + formatLong(state.to);
    }

    function setTrend(node, trendInfo) {
        if (!node) return;
        node.className = 'ops-trend ' + trendInfo.cls;
        node.textContent = trendInfo.text;
    }

    function bind(root) {
        if (root.dataset.opsBound === '1') {
            paint(root);
            return;
        }
        root.dataset.opsBound = '1';

        var name = sessionName(root);
        var role = root.getAttribute('data-role') || 'Admin';
        var person = root.querySelector('[data-person]');
        var roleLabel = root.querySelector('[data-role-label]');
        var initialsNode = root.querySelector('[data-initials]');
        var welcome = root.querySelector('[data-welcome]');
        if (person) person.textContent = name;
        if (roleLabel) roleLabel.textContent = role;
        if (initialsNode) initialsNode.textContent = initials(name);
        if (welcome) welcome.textContent = 'Welcome back, ' + name + '! Here is the overview of your business.';

        var menu = root.querySelector('[data-user-menu]');
        var userBtn = root.querySelector('[data-user-btn]');
        if (userBtn && menu) {
            userBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                menu.hidden = !menu.hidden;
            });
            document.addEventListener('click', function () { menu.hidden = true; });
        }

        var pop = root.querySelector('[data-range-pop]');
        var fromInput = root.querySelector('[data-from]');
        var toInput = root.querySelector('[data-to]');
        var rangeBtn = root.querySelector('[data-range-btn]');
        var applyBtn = root.querySelector('[data-apply-range]');
        if (fromInput) fromInput.value = state.from;
        if (toInput) toInput.value = state.to;
        if (rangeBtn && pop) {
            rangeBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                pop.hidden = !pop.hidden;
            });
            pop.addEventListener('click', function (event) { event.stopPropagation(); });
            document.addEventListener('click', function () { pop.hidden = true; });
        }
        if (applyBtn && fromInput && toInput && pop) {
            applyBtn.addEventListener('click', function () {
                if (!parseDay(fromInput.value) || !parseDay(toInput.value) || fromInput.value > toInput.value) return;
                state.from = fromInput.value;
                state.to = toInput.value;
                saveRange();
                pop.hidden = true;
                paint(root);
            });
        }

        var chartMode = root.querySelector('[data-chart-mode]');
        var bestMode = root.querySelector('[data-best-mode]');
        var expiryMode = root.querySelector('[data-expiry-mode]');
        var regen = root.querySelector('[data-regen]');
        if (chartMode) chartMode.addEventListener('change', function (event) {
            state.chart = event.target.value;
            paint(root);
        });
        if (bestMode) bestMode.addEventListener('change', function (event) {
            state.best = event.target.value;
            paint(root);
        });
        if (expiryMode) expiryMode.addEventListener('change', function (event) {
            state.expiryDays = Number(event.target.value) || 30;
            paint(root);
        });
        if (regen) regen.addEventListener('click', function () {
            state.insightVariant += 1;
            state.generatedAt = new Date();
            paint(root);
        });
        paint(root);
    }

    function boot() {
        var root = document.getElementById('admin-dashboard-root');
        if (!root || !root.classList.contains('ops-dash')) return;
        loadRange();
        bind(root);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('kreezby:page-load', boot);
})();
