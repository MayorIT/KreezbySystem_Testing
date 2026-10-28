/**
 * Customer order tracking — admin/staff update status + J&T Express Philippines tracking ID.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'kreezbyOrders';
    var PO_STORAGE_KEY = 'kreezby-po-orders-v1';
    var OWNER_RECEIPTS_KEY = 'kreezbyOwnerReceipts';
    var CUSTOMER_RECEIPTS_KEY = 'kreezbyCustomerReceipts';
    var CARRIER = 'J&T Express Philippines';
    var PICKUP_CARRIER = 'Pick-up at Kreezby';

    function isPickupOrder(order) { return !!order && order.fulfillment === 'pickup'; }
    function carrierOf(order) { return isPickupOrder(order) ? PICKUP_CARRIER : (order.carrier || CARRIER); }
    function pickupText(order) {
        if (order.pickupLabel) return order.pickupLabel;
        return [order.pickupDate, order.pickupTime].filter(Boolean).join(' · ') || '—';
    }
    var JNT_TRACK_BASE = 'https://www.jtexpress.ph/track-and-trace?billCodes=';
    var STATUSES = ['Processing', 'Shipped', 'Completed'];

    function loadOrders() {
        try {
            if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
                window.KreezbyPortalSeed.apply();
            }
        } catch (e) { /* keep the page usable if seeding fails */ }
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    var databasePull = null;

    function mergeRemoteOrders(remote) {
        if (!Array.isArray(remote) || !remote.length) return false;
        var local = loadOrders();
        var seen = {};
        local.forEach(function (order) {
            if (order && order.orderNumber) seen[order.orderNumber] = true;
        });
        var added = false;
        remote.forEach(function (order) {
            if (!order || !order.orderNumber || seen[order.orderNumber]) return;
            local.push(order);
            seen[order.orderNumber] = true;
            added = true;
        });
        if (!added) return false;
        saveOrders(local);
        return true;
    }

    function pullDatabaseOrders() {
        if (databasePull) return databasePull;
        databasePull = fetch('/api/customer-orders', { credentials: 'same-origin', cache: 'no-store' })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (payload) {
                if (payload && mergeRemoteOrders(payload.orders)) init();
            })
            .catch(function () { /* keep orders already on this browser */ })
            .then(function () { databasePull = null; });
        return databasePull;
    }

    function saveOrders(orders) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        updateDashboardCounts();
        document.dispatchEvent(new CustomEvent('kreezby-orders-updated'));
    }

    function findOrderIndex(orderNumber) {
        return loadOrders().findIndex(function (o) { return o.orderNumber === orderNumber; });
    }

    function loadReceipts(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            return [];
        }
    }

    function paymentMethodLabel(methodId) {
        var labels = {
            gcash: 'GCash',
            mayabank: 'MayaBank',
            metrobank: 'Metrobank',
        };
        return labels[methodId] || String(methodId || 'Unknown').toUpperCase();
    }

    function orderTotals(order) {
        var items = Object.values(order.items || {});
        var subtotal = order.subtotal;
        if (subtotal == null) {
            subtotal = items.reduce(function (sum, item) {
                return sum + ((Number(item.cost) || 0) * (Number(item.qty) || 0));
            }, 0);
        }
        return {
            subtotal: Number(subtotal) || 0,
            total: Number(subtotal) || 0
        };
    }

    function buildReceiptFromOrder(order) {
        var totals = orderTotals(order);
        var shipping = order.shippingInfo || {};
        var items = Object.values(order.items || {}).map(function (item) {
            var price = Number(item.cost) || 0;
            var qty = Number(item.qty) || 0;
            return {
                name: item.name || 'Item',
                qty: qty,
                price: price,
                lineTotal: price * qty
            };
        });

        return {
            receiptNumber: order.receiptNumber || ('RCP-' + String(order.orderNumber || 'TEMP')),
            orderNumber: order.orderNumber,
            issuedAt: order.date || new Date().toISOString(),
            customerName: shipping.fullName || customerName(order),
            customerPhone: shipping.phone || '',
            customerAddress: shipping.address || '',
            paymentMethod: paymentMethodLabel(order.paymentMethod),
            subtotal: totals.subtotal,
            total: totals.total,
            items: items,
            shippingNotes: shipping.notes || ''
        };
    }

    function findOwnerReceipt(order) {
        if (!order || !order.orderNumber) return null;
        var ownerReceipts = loadReceipts(OWNER_RECEIPTS_KEY);
        var ownerMatch = ownerReceipts.find(function (entry) {
            return entry && entry.orderNumber === order.orderNumber;
        });
        if (ownerMatch) return ownerMatch;

        var customerReceipts = loadReceipts(CUSTOMER_RECEIPTS_KEY);
        return customerReceipts.find(function (entry) {
            return entry && entry.orderNumber === order.orderNumber;
        }) || null;
    }

    function ensureKreezbyPrintSheet() {
        if (window.KreezbyPrintSheet || document.getElementById('kreezby-print-sheet-js')) return;
        var src = '../js/kreezby-print-sheet.js?v=20261010roles';
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var url = scripts[i].getAttribute('src') || '';
            if (/order-tracking\.js/i.test(url)) {
                src = url.replace(/[^/?]+\.js(\?.*)?$/, 'kreezby-print-sheet.js?v=20261010roles');
                break;
            }
        }
        var tag = document.createElement('script');
        tag.id = 'kreezby-print-sheet-js';
        tag.src = src;
        document.head.appendChild(tag);
    }

    function whenKreezbyPrintSheet(done) {
        if (window.KreezbyPrintSheet) { done(window.KreezbyPrintSheet); return; }
        ensureKreezbyPrintSheet();
        var node = document.getElementById('kreezby-print-sheet-js');
        if (!node) { done(null); return; }
        var settled = false;
        var finish = function (sheet) {
            if (settled) return;
            settled = true;
            done(sheet || null);
        };
        node.addEventListener('load', function () { finish(window.KreezbyPrintSheet); });
        node.addEventListener('error', function () { finish(null); });
        setTimeout(function () { if (window.KreezbyPrintSheet) finish(window.KreezbyPrintSheet); }, 0);
    }

    function openReceiptWindow(receipt) {
        if (!receipt) return;
        whenKreezbyPrintSheet(function (sheet) {
            if (!sheet) return;
            var issuedAt = receipt.issuedAt ? new Date(receipt.issuedAt).toLocaleString('en-PH') : '';
            var subtotal = Number(receipt.subtotal) || 0;
            var grossTotal = Number(receipt.total) || 0;
            var netTotal = Math.max(grossTotal, 0);
            var vatableSales = netTotal / 1.12;
            var vatAmount = netTotal - vatableSales;
            var opened = sheet.openPreview({
                title: 'Official Receipt',
                docNo: receipt.receiptNumber || receipt.orderNumber,
                status: receipt.paymentStatus || 'PAID',
                totalLabel: 'Grand total',
                totalValue: formatMoney(netTotal),
                facts: [
                    { label: 'Order', value: receipt.orderNumber },
                    { label: 'Date', value: issuedAt },
                    { label: 'Payment', value: receipt.paymentMethod },
                    { label: 'GCash ref', value: receipt.gcashReference },
                    { label: 'Customer', value: receipt.customerName },
                    { label: 'Phone', value: receipt.customerPhone },
                    { label: 'Address', value: receipt.customerAddress },
                    { label: 'Subtotal', value: formatMoney(subtotal) },
                    { label: 'VATable sales', value: formatMoney(vatableSales) },
                    { label: 'VAT', value: formatMoney(vatAmount) }
                ],
                note: { label: 'Notes', text: receipt.shippingNotes },
                columns: [
                    { label: 'Item' },
                    { label: 'Qty', align: 'right' },
                    { label: 'Price', align: 'right' },
                    { label: 'Total', align: 'right' }
                ],
                rows: (receipt.items || []).map(function (item) {
                    return [item.name, String(item.qty), formatMoney(item.price), formatMoney(item.lineTotal)];
                }),
                signs: ['Cashier', 'Customer']
            });
            if (!opened) alert('Receipt pop-up was blocked by your browser. Please allow pop-ups to view receipt.');
        });
    }

    function formatMoney(n) {
        return '₱' + Number(n || 0).toFixed(2);
    }

    function formatDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatShortDate(iso) {
        if (!iso) return '—';
        var date = new Date(iso);
        if (isNaN(date.getTime())) return '—';
        return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function isPoShell(root) {
        return !!(root && root.querySelector('#ot-master-list-panel'));
    }

    function showTrackingList(root) {
        var master = root.querySelector('#ot-master-list-panel');
        var details = root.querySelector('#ot-details-panel');
        if (details) {
            details.style.display = 'none';
            details.classList.remove('is-open');
        }
        if (master) master.style.display = '';
    }

    function showTrackingDetail(root) {
        var master = root.querySelector('#ot-master-list-panel');
        var details = root.querySelector('#ot-details-panel');
        if (!details) return;
        if (master) master.style.display = 'none';
        details.style.display = 'flex';
        details.classList.add('is-open');
        var scroll = details.querySelector('.po-details-scroll');
        if (scroll) scroll.scrollTop = 0;
    }

    /* One plain payment state for an order, from whatever the checkout, PayMongo or staff recorded. */
    function paymentInfo(order) {
        var ps = String(order.paymentStatus || '').toLowerCase();
        var method = String(order.paymentMethod || '').toLowerCase();
        if (ps === 'paid' || ps === 'verified' || (order.paymentVerified && ps !== 'failed' && ps !== 'expired' && ps !== 'awaiting_payment')) {
            return { key: 'paid', label: 'Paid' };
        }
        if (ps === 'awaiting_payment') return { key: 'awaiting', label: 'Awaiting payment' };
        if (ps === 'expired') return { key: 'expired', label: 'Payment expired' };
        if (ps === 'failed' || order.paymentFailed) return { key: 'failed', label: 'Payment failed' };
        if (method === 'cash_on_delivery' || method === 'cod') return { key: 'cod', label: 'Pay on delivery' };
        return { key: 'pending', label: 'Unpaid' };
    }

    (function paymentStyle() {
        if (document.getElementById('ot-pay-style')) return;
        var st = document.createElement('style');
        st.id = 'ot-pay-style';
        st.textContent = '.ot-pay{display:inline-block;margin-top:4px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;background:#eee;color:#555}' +
            '.ot-pay--paid{background:#e6f4ea;color:#1b6e35}.ot-pay--awaiting,.ot-pay--pending{background:#fff4d6;color:#8a6100}' +
            '.ot-pay--expired,.ot-pay--failed{background:#fde8e8;color:#b3261e}.ot-pay--cod{background:#e8f0fe;color:#1a56b0}';
        (document.head || document.documentElement).appendChild(st);
    })();

    function paymentPill(order) {
        var info = paymentInfo(order);
        return '<span class="ot-pay ot-pay--' + info.key + '">' + escapeHtml(info.label) + '</span>';
    }

    function poStatusClass(status) {
        if (status === 'Shipped') return 'shipped';
        if (status === 'Completed') return 'received';
        return 'pending';
    }

    function customerName(order) {
        if (order.shippingInfo && order.shippingInfo.fullName) {
            return order.shippingInfo.fullName;
        }
        if (order.poEntity) return order.poEntity;
        return '—';
    }

    function orderForPo(poCode) {
        if (!poCode) return null;
        return loadOrders().find(function (order) { return order.poCode === poCode; }) || null;
    }

    function customerPurchaseOrders() {
        return loadPurchaseOrders().filter(function (po) {
            if (!po || !po.code) return false;
            return po.entityType === 'customer' || /^PO-C-/i.test(po.code);
        });
    }

    function statusFromPurchaseOrder(po) {
        var status = String((po && po.status) || '').toLowerCase();
        if (status.indexOf('complete') >= 0 || status.indexOf('deliver') >= 0) return 'Completed';
        if (status.indexOf('ship') >= 0 || status.indexOf('transit') >= 0) return 'Shipped';
        return 'Processing';
    }

    function loadPurchaseOrders() {
        try {
            var raw = localStorage.getItem(PO_STORAGE_KEY);
            var map = raw ? JSON.parse(raw) : {};
            return Object.keys(map).map(function (key) { return map[key]; }).filter(Boolean).sort(function (a, b) {
                return String(b.dateCreated || '').localeCompare(String(a.dateCreated || ''));
            });
        } catch (e) {
            return [];
        }
    }

    function findPurchaseOrder(poCode) {
        if (!poCode) return null;
        try {
            var raw = localStorage.getItem(PO_STORAGE_KEY);
            var map = raw ? JSON.parse(raw) : {};
            return map[poCode] || null;
        } catch (e) {
            return null;
        }
    }

    function poOptionLabel(po) {
        var type = po.entityType === 'customer' ? 'Customer' : 'Retailer';
        return po.code + ' — ' + (po.entity || 'Unknown') + ' (' + type + ')';
    }

    function generateOrderNumber() {
        var year = new Date().getFullYear();
        var max = 0;
        loadOrders().forEach(function (order) {
            var match = String(order.orderNumber || '').match(/^ORD-\d{4}-(\d+)$/);
            if (match) max = Math.max(max, parseInt(match[1], 10) || 0);
        });
        return 'ORD-' + year + '-' + String(max + 1).padStart(4, '0');
    }

    function poItemsToOrderItems(poItems) {
        var items = {};
        (poItems || []).forEach(function (item, index) {
            items['po-item-' + index] = {
                name: item.name || 'Item',
                cost: Number(item.cost) || 0,
                qty: Number(item.qty) || 1
            };
        });
        return items;
    }

    function poOrderTotal(po) {
        if (!po || !po.items || !po.items.length) return '₱0.00';
        var sum = po.items.reduce(function (total, item) {
            return total + ((Number(item.cost) || 0) * (Number(item.qty) || 0));
        }, 0);
        return '₱' + sum.toFixed(2);
    }

    function showToast(root, message) {
        var toast = root.querySelector('#order-tracking-toast');
        if (!toast) return;
        var desc = toast.querySelector('.kreezby-alert__description');
        if (desc) desc.textContent = message;
        else toast.textContent = message;
        toast.hidden = false;
        setTimeout(function () { toast.hidden = true; }, 2500);
    }

    function statusClass(status) {
        if (status === 'Shipped') return 'is-shipped';
        if (status === 'Completed') return 'is-completed';
        return 'is-processing';
    }

    function jntTrackUrl(trackingId) {
        if (!trackingId) return '';
        return JNT_TRACK_BASE + encodeURIComponent(trackingId.trim());
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function processingCount() {
        return loadOrders().filter(function (o) { return o.status === 'Processing'; }).length;
    }

    function updateDashboardCounts() {
        var count = processingCount();
        var total = loadOrders().length;
        document.querySelectorAll('[data-order-tracking-count]').forEach(function (el) {
            el.textContent = String(count || total);
        });
    }

    // Extra filters (payment, tracking, dates) live in the toolbar next to Status.
    function extraFilters(root) {
        function val(id) { return ((root && root.querySelector(id)) || {}).value || ''; }
        return { pay: val('#ot-pay-filter') || 'all', track: val('#ot-track-filter') || 'all', from: val('#ot-from'), to: val('#ot-to') };
    }

    function orderDay(o) {
        var d = new Date(o.date || o.createdAt || '');
        if (isNaN(d.getTime())) return '';
        var m = String(d.getMonth() + 1); var day = String(d.getDate());
        return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
    }

    function customerName(order) {
        var ship = (order && order.shippingInfo) || {};
        return order.accountName || ship.fullName || order.poEntity || '';
    }

    function filteredOrders(statusFilter, query, extra) {
        var orders = loadOrders().slice().reverse();
        if (extra) {
            orders = orders.filter(function (o) {
                if (extra.pay !== 'all' && paymentInfo(o).key !== extra.pay) return false;
                if (extra.track === 'with' && !o.trackingNumber) return false;
                if (extra.track === 'without' && o.trackingNumber) return false;
                if (extra.from || extra.to) {
                    var day = orderDay(o);
                    if (!day) return false;
                    if (extra.from && day < extra.from) return false;
                    if (extra.to && day > extra.to) return false;
                }
                return true;
            });
        }
        var q = (query || '').trim().toLowerCase();

        if (statusFilter && statusFilter !== 'all') {
            orders = orders.filter(function (o) {
                return (o.status || '').toLowerCase() === statusFilter.toLowerCase();
            });
        }

        if (q) {
            orders = orders.filter(function (o) {
                var ship = o.shippingInfo || {};
                return (
                    (o.orderNumber || '').toLowerCase().indexOf(q) !== -1 ||
                    customerName(o).toLowerCase().indexOf(q) !== -1 ||
                    (o.poCode || '').toLowerCase().indexOf(q) !== -1 ||
                    (o.trackingNumber || '').toLowerCase().indexOf(q) !== -1 ||
                    paymentInfo(o).label.toLowerCase().indexOf(q) !== -1
                );
            });
        }

        return orders;
    }

    function renderPager(root, page, pages, total, size) {
        var footer = root.querySelector('#ot-orders-footer');
        if (!footer) return;
        if (!total) {
            footer.innerHTML = '';
            return;
        }
        var start = (page - 1) * size + 1;
        var end = Math.min(total, page * size);
        footer.innerHTML =
            '<span>Showing ' + start + '–' + end + ' of ' + total + '</span>' +
            '<span class="ot-pager">' +
                '<button type="button" class="po-pager-btn" data-ot-page="prev"' + (page <= 1 ? ' disabled' : '') + '>Prev</button>' +
                '<span>' + page + ' / ' + pages + '</span>' +
                '<button type="button" class="po-pager-btn" data-ot-page="next"' + (page >= pages ? ' disabled' : '') + '>Next</button>' +
            '</span>';
    }

    function renderPoTable(root, selectedId) {
        var tableBody = root.querySelector('#order-tracking-tbody');
        if (!tableBody) return;
        var statusFilter = (root.querySelector('#ot-status-filter') || {}).value || 'all';
        var query = (root.querySelector('#ot-search') || {}).value || '';
        var orders = filteredOrders(statusFilter, query, extraFilters(root));
        var size = parseInt((root.querySelector('#ot-page-size') || {}).value, 10) || 25;
        var pages = Math.max(1, Math.ceil(orders.length / size));
        var page = Math.min(Math.max(root._otPage || 1, 1), pages);
        root._otPage = page;
        var slice = orders.slice((page - 1) * size, page * size);
        var count = root.querySelector('#ot-orders-count');
        if (count) count.textContent = orders.length ? String(orders.length) : '';

        if (!slice.length) {
            tableBody.innerHTML = '<tr class="po-empty-row"><td colspan="7">No customer orders found.</td></tr>';
            renderPager(root, 1, 1, 0, size);
            return;
        }

        tableBody.innerHTML = slice.map(function (order, index) {
            var tracking = isPickupOrder(order)
                ? 'Pick-up · ' + escapeHtml(pickupText(order))
                : order.trackingNumber
                ? escapeHtml(order.trackingNumber)
                : '<span class="ot-track-empty">Not set</span>';
            var ship0 = order.shippingInfo || {};
            var who = escapeHtml(customerName(order) || '—');
            var meta = [ship0.phone, order.poCode].filter(Boolean).map(function (v) { return '<small>' + escapeHtml(v) + '</small>'; }).join('<br>');
            return '<tr data-order-id="' + escapeHtml(order.orderNumber) + '"' + (order.orderNumber === selectedId ? ' class="is-selected"' : '') + '>' +
                '<td class="po-col-num">' + ((page - 1) * size + index + 1) + '</td>' +
                '<td>' + formatShortDate(order.date) + '</td>' +
                '<td><a href="#" class="po-code-link" data-ot-open="' + escapeHtml(order.orderNumber) + '">' + escapeHtml(order.orderNumber) + '</a></td>' +
                '<td class="ot-who"><strong>' + who + '</strong>' + (meta ? '<br>' + meta : '') + '</td>' +
                '<td class="ot-status"><span class="status-pill-badge ' + poStatusClass(order.status) + '">' + escapeHtml(order.status || 'Processing') + '</span><br>' + paymentPill(order) + '</td>' +
                '<td>' + tracking + '</td>' +
                '<td class="ot-action"><button type="button" class="action-trigger-btn" data-ot-open="' + escapeHtml(order.orderNumber) + '">View</button></td>' +
                '</tr>';
        }).join('');
        renderPager(root, page, pages, orders.length, size);
    }

    function renderTable(root, selectedId) {
        if (isPoShell(root)) {
            renderPoTable(root, selectedId);
            return;
        }
        var tableBody = root.querySelector('#order-tracking-tbody');
        var layout = root.querySelector('.order-tracking-layout');
        if (!tableBody) return;

        var statusFilter = (root.querySelector('#ot-status-filter') || {}).value || 'all';
        var query = (root.querySelector('#ot-search') || {}).value || '';
        var orders = filteredOrders(statusFilter, query, extraFilters(root));

        if (!orders.length) {
            tableBody.innerHTML =
                '<tr><td colspan="7" class="order-tracking-empty">No customer orders found.</td></tr>';
            if (layout) layout.classList.remove('has-detail');
            return;
        }

        tableBody.innerHTML = orders.map(function (order) {
            var selected = order.orderNumber === selectedId ? ' is-selected' : '';
            var tracking = isPickupOrder(order)
                ? 'Pick-up · ' + escapeHtml(pickupText(order))
                : order.trackingNumber
                ? escapeHtml(order.trackingNumber)
                : '<span style="color:#9ca3af">Not set</span>';
            return (
                '<tr data-order-id="' + escapeHtml(order.orderNumber) + '" class="' + selected.trim() + '">' +
                '<td>' + escapeHtml(order.orderNumber) + '</td>' +
                '<td>' + escapeHtml(order.poCode || '—') + '</td>' +
                '<td>' + escapeHtml(customerName(order) || '—') + '</td>' +
                '<td>' + formatDate(order.date) + '</td>' +
                '<td><span class="order-tracking-status-pill ' + statusClass(order.status) + '">' +
                    escapeHtml(order.status || 'Processing') + '</span><br>' + paymentPill(order) + '</td>' +
                '<td>' + tracking + '</td>' +
                '<td>' + escapeHtml(carrierOf(order)) + '</td>' +
                '</tr>'
            );
        }).join('');
    }

    function renderDetail(root, orderNumber) {
        var panel = root.querySelector('#order-tracking-detail');
        var layout = root.querySelector('.order-tracking-layout');
        if (!panel) return;

        var order = loadOrders().find(function (o) { return o.orderNumber === orderNumber; });
        if (!order) {
            if (isPoShell(root)) showTrackingList(root);
            else panel.hidden = true;
            if (layout) layout.classList.remove('has-detail');
            return;
        }

        var ship = order.shippingInfo || {};
        var pickup = isPickupOrder(order);
        var trackUrl = pickup ? '' : jntTrackUrl(order.trackingNumber);
        var receipt = findOwnerReceipt(order) || buildReceiptFromOrder(order);

        if (isPoShell(root)) {
            var title = root.querySelector('#ot-details-title');
            if (title) title.textContent = 'Edit ' + order.orderNumber;
            showTrackingDetail(root);
        } else {
            panel.hidden = false;
            if (layout) layout.classList.add('has-detail');
        }

        panel.innerHTML =
            (isPoShell(root) ? '' : '<h3 class="order-tracking-detail-title">Edit ' + escapeHtml(order.orderNumber) + '</h3>') +
            '<p class="order-tracking-detail-sub">' + 'Customer details are read-only · only the J&amp;T tracking ID can be changed · ' + formatDate(order.date) + '</p>' +
            '<div class="order-tracking-form-group"><label>Customer name</label><input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(customerName(order) || '—') + '"></div>' +
            '<div class="order-tracking-form-group"><label>Contact number</label><input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(ship.phone || '—') + '"></div>' +
            (order.customerEmail ? '<div class="order-tracking-form-group"><label>Email</label><input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(order.customerEmail) + '"></div>' : '') +
            '<div class="order-tracking-form-group"><label>' + (pickup ? 'Pick-up location' : 'Delivery address') + '</label><input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(ship.address || order.accountArea || '—') + '"></div>' +
            (order.poCode
                ? '<div class="order-tracking-form-group"><label>Linked PO Code</label><input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(order.poCode) + '"></div>'
                : '') +
            (pickup
                ? '<div class="order-tracking-form-group">' +
                    '<label>Pick-up schedule</label>' +
                    '<input type="text" readonly value="' + escapeHtml(pickupText(order)) + '">' +
                  '</div>'
                : '') +
            '<div class="order-tracking-form-group">' +
                '<label>Payment</label>' +
                '<input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(paymentInfo(order).label + (order.paidAt ? ' · ' + formatDate(order.paidAt) : '')) + '">' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-status">Order status</label>' +
                '<input type="text" id="ot-status" readonly class="order-tracking-readonly-field" value="' + escapeHtml(order.status || 'Processing') + '">' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-carrier">' + (pickup ? 'Fulfillment' : 'Courier') + '</label>' +
                '<input type="text" id="ot-carrier" readonly value="' + escapeHtml(carrierOf(order)) + '">' +
            '</div>' +
            (pickup ? '' :
            '<div class="order-tracking-form-group">' +
                '<label for="ot-tracking">J&amp;T Express tracking ID</label>' +
                '<input type="text" id="ot-tracking" placeholder="e.g. JT1234567890123" value="' + escapeHtml(order.trackingNumber || '') + '">' +
            '</div>') +
            '<div class="order-tracking-form-actions">' +
                (pickup ? '' : '<button type="button" class="order-tracking-btn order-tracking-btn-primary" id="ot-save-btn">Save tracking</button>') +
                (trackUrl
                    ? '<a class="order-tracking-btn order-tracking-btn-link" href="' + trackUrl + '" target="_blank" rel="noopener noreferrer">Track on J&amp;T</a>'
                    : '') +
                '<button type="button" class="order-tracking-btn" id="ot-close-btn">Close</button>' +
            '</div>';

        var saveBtn = panel.querySelector('#ot-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', function () {
            saveOrderUpdates(root, orderNumber);
        });
        var closeBtn = panel.querySelector('#ot-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', function () {
            root._otSelected = null;
            root._otDetailOpen = false;
            if (isPoShell(root)) showTrackingList(root);
            else panel.hidden = true;
            if (layout) layout.classList.remove('has-detail');
            renderTable(root, null);
        });
    }

    function mirrorPurchaseOrder(order) {
        if (!order) return;
        try {
            var store = JSON.parse(localStorage.getItem('kreezby-po-orders-v1') || '{}') || {};
            var keys = [order.poCode, order.orderNumber, order.receiptNumber];
            Object.keys(store).forEach(function (code) {
                var row = store[code];
                if (!row) return;
                var linked = keys.indexOf(code) >= 0
                    || keys.indexOf(row.code) >= 0
                    || keys.indexOf(row.shopOrderNumber) >= 0;
                if (!linked) return;
                row.status = order.status;
                row.trackingNumber = order.trackingNumber || '';
                row.carrier = order.carrier || '';
                row.staffNotes = order.staffNotes || '';
                row.statusUpdatedAt = order.statusUpdatedAt || '';
            });
            localStorage.setItem('kreezby-po-orders-v1', JSON.stringify(store));
        } catch (e) { /* ignore */ }
    }

    function saveOrderUpdates(root, orderNumber) {
        var idx = findOrderIndex(orderNumber);
        if (idx < 0) return;

        var orders = loadOrders();
        var order = orders[idx];
        var statusEl = root.querySelector('#ot-status');
        var trackingEl = root.querySelector('#ot-tracking');
        var notesEl = root.querySelector('#ot-notes');

        var tracking = trackingEl ? trackingEl.value.trim() : '';
        var pickup = isPickupOrder(order);
        if (pickup) return;
        var nextStatus = order.status || 'Processing';
        var payKey = paymentInfo(order).key;
        var onlineMethod = /paymongo|gcash/i.test(String(order.paymentMethod || ''));
        if (tracking && onlineMethod && payKey !== 'paid') {
            showToast(root, 'This order is not paid yet (' + paymentInfo(order).label + '). Add the tracking ID once payment is received.');
            return;
        }
        if (tracking && nextStatus === 'Processing') nextStatus = 'Shipped';
        if (!tracking && nextStatus === 'Shipped') nextStatus = 'Processing';

        order.status = nextStatus;
        order.trackingNumber = tracking;
        order.carrier = CARRIER;
        order.statusUpdatedAt = new Date().toISOString();

        if (nextStatus === 'Shipped' && tracking && !order.shippedAt) {
            order.shippedAt = order.statusUpdatedAt;
        }
        if (nextStatus === 'Completed') {
            order.completedAt = order.statusUpdatedAt;
        }

        orders[idx] = order;
        saveOrders(orders);
        mirrorPurchaseOrder(order);
        renderTable(root, orderNumber);
        renderDetail(root, orderNumber);
        showToast(root, 'Saved tracking for ' + orderNumber + '.');
    }

    function closeCreateModal() {
        var modal = document.getElementById('ot-create-modal');
        if (modal) modal.hidden = true;
    }

    function renderCreatePanel(root) {
        var purchaseOrders = customerPurchaseOrders();
        var orderNumber = generateOrderNumber();
        var poOptions = purchaseOrders.length
            ? purchaseOrders.map(function (po) {
                var tracked = orderForPo(po.code) ? ' · already tracked' : '';
                return '<option value="' + escapeHtml(po.code) + '">' + escapeHtml(po.code + tracked) + '</option>';
            }).join('')
            : '<option value="">No customer purchase orders found</option>';

        var modal = document.getElementById('ot-create-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ot-create-modal';
            modal.className = 'ot-modal-backdrop';
            document.body.appendChild(modal);
        }

        modal.hidden = false;
        modal.innerHTML =
            '<div class="ot-modal" role="dialog" aria-modal="true" aria-labelledby="ot-create-title">' +
                '<div class="ot-modal-head">' +
                    '<div>' +
                        '<h3 class="order-tracking-detail-title" id="ot-create-title">Create New Order Tracking</h3>' +
                        '<p class="order-tracking-create-hint">Choose a purchase order, then enter the J&amp;T tracking ID. Customer details are shown for reference only and cannot be changed here.</p>' +
                    '</div>' +
                    '<button type="button" class="ot-modal-close" id="ot-create-close-btn" aria-label="Close">×</button>' +
                '</div>' +
                '<div class="order-tracking-form-group">' +
                    '<label for="ot-create-po">Purchase order code</label>' +
                    '<select id="ot-create-po">' +
                        '<option value="">Select PO code…</option>' +
                        poOptions +
                    '</select>' +
                '</div>' +
                '<p class="ot-create-note" id="ot-create-po-note"></p>' +
                '<div class="order-tracking-form-group">' +
                    '<label for="ot-create-customer">Customer name</label>' +
                    '<input type="text" id="ot-create-customer" class="order-tracking-readonly-field" readonly placeholder="Auto-filled from PO">' +
                '</div>' +
                '<div class="order-tracking-form-group">' +
                    '<label for="ot-create-order-id">Order ID</label>' +
                    '<input type="text" id="ot-create-order-id" class="order-tracking-readonly-field" readonly value="' + escapeHtml(orderNumber) + '">' +
                '</div>' +
                '<div class="order-tracking-form-group" hidden>' +
                    '<label for="ot-create-status">Order status</label>' +
                    '<select id="ot-create-status">' +
                        STATUSES.map(function (s) {
                            var sel = s === 'Processing' ? ' selected' : '';
                            return '<option value="' + s + '"' + sel + '>' + s + '</option>';
                        }).join('') +
                    '</select>' +
                '</div>' +
                '<div class="order-tracking-form-group">' +
                    '<label for="ot-create-carrier">Courier</label>' +
                    '<input type="text" id="ot-create-carrier" readonly class="order-tracking-readonly-field" value="' + escapeHtml(CARRIER) + '">' +
                '</div>' +
                '<div class="order-tracking-form-group">' +
                    '<label for="ot-create-tracking">J&amp;T Express tracking ID</label>' +
                    '<input type="text" id="ot-create-tracking" placeholder="e.g. JT1234567890123">' +
                '</div>' +
                '<div class="order-tracking-form-group" hidden>' +
                    '<label for="ot-create-notes">Internal notes (optional)</label>' +
                    '<textarea id="ot-create-notes" rows="2" placeholder="Dispatch or packaging notes"></textarea>' +
                '</div>' +
                '<div class="order-tracking-form-actions">' +
                    '<button type="button" class="order-tracking-btn order-tracking-btn-primary" id="ot-create-save-btn">Create order tracking</button>' +
                    '<button type="button" class="order-tracking-btn" id="ot-create-cancel-btn">Cancel</button>' +
                '</div>' +
            '</div>';

        var poSelect = modal.querySelector('#ot-create-po');
        var customerInput = modal.querySelector('#ot-create-customer');
        var orderIdInput = modal.querySelector('#ot-create-order-id');
        var statusSelect = modal.querySelector('#ot-create-status');
        var trackingInput = modal.querySelector('#ot-create-tracking');
        var notesInput = modal.querySelector('#ot-create-notes');
        var note = modal.querySelector('#ot-create-po-note');
        var saveBtn = modal.querySelector('#ot-create-save-btn');

        function applyPoSelection() {
            var po = findPurchaseOrder(poSelect.value);
            var existing = orderForPo(poSelect.value);
            if (!po) {
                customerInput.value = '';
                orderIdInput.value = generateOrderNumber();
                statusSelect.value = 'Processing';
                trackingInput.value = '';
                notesInput.value = '';
                note.textContent = '';
                saveBtn.textContent = 'Create order tracking';
                return;
            }
            customerInput.value = po.entity || '';
            if (existing) {
                orderIdInput.value = existing.orderNumber;
                statusSelect.value = existing.status || 'Processing';
                trackingInput.value = existing.trackingNumber || '';
                notesInput.value = existing.staffNotes || '';
                note.textContent = 'This purchase order already has tracking. Saving updates ' + existing.orderNumber + '.';
                saveBtn.textContent = 'Update tracking';
                return;
            }
            orderIdInput.value = generateOrderNumber();
            statusSelect.value = statusFromPurchaseOrder(po);
            trackingInput.value = po.trackingNumber || '';
            notesInput.value = po.remarks || '';
            note.textContent = '';
            saveBtn.textContent = 'Create order tracking';
        }

        if (poSelect) poSelect.addEventListener('change', applyPoSelection);
        modal.querySelector('#ot-create-close-btn').addEventListener('click', closeCreateModal);
        modal.querySelector('#ot-create-cancel-btn').addEventListener('click', closeCreateModal);
        modal.addEventListener('click', function (event) {
            if (event.target === modal) closeCreateModal();
        });
        saveBtn.addEventListener('click', function () {
            createOrderFromForm(root);
        });
        if (poSelect) poSelect.focus();
    }

    function createOrderFromForm(root) {
        var panel = document.getElementById('ot-create-modal');
        if (!panel) return;

        var poCode = (panel.querySelector('#ot-create-po') || {}).value || '';
        var customer = (panel.querySelector('#ot-create-customer') || {}).value || '';
        var orderNumber = (panel.querySelector('#ot-create-order-id') || {}).value || generateOrderNumber();
        var tracking = (panel.querySelector('#ot-create-tracking') || {}).value || '';
        var status = tracking.trim() ? 'Shipped' : 'Processing';
        var notes = (panel.querySelector('#ot-create-notes') || {}).value || '';

        if (!poCode) {
            showToast(root, 'Please select a purchase order code.');
            return;
        }
        if (!customer) {
            showToast(root, 'Customer name could not be detected from the selected PO.');
            return;
        }
        if ((status === 'Shipped' || status === 'Completed') && !tracking.trim()) {
            showToast(root, 'Enter a J&T tracking ID before marking the order ' + status + '.');
            return;
        }
        var existingForPo = orderForPo(poCode);
        if (existingForPo) orderNumber = existingForPo.orderNumber;
        else if (findOrderIndex(orderNumber) >= 0) orderNumber = generateOrderNumber();

        var po = findPurchaseOrder(poCode);
        var now = new Date().toISOString();
        var order = existingForPo ? Object.assign({}, existingForPo) : {
            orderNumber: orderNumber,
            poCode: poCode,
            poEntity: po ? po.entity : customer,
            items: po ? poItemsToOrderItems(po.items) : {},
            subtotal: po && po.items ? po.items.reduce(function (n, item) {
                return n + ((Number(item.cost) || 0) * (Number(item.qty) || 0));
            }, 0) : 0,
            total: po ? poOrderTotal(po) : '₱0.00',
            paymentMethod: po && po.paymentMethod ? po.paymentMethod : 'po',
            shippingInfo: {
                fullName: customer,
                phone: '',
                address: po && po.area ? po.area : '',
                notes: po && po.remarks ? po.remarks : ''
            },
            date: now,
            paymentVerified: !!(po && po.paymentVerified),
            source: 'staff-tracking'
        };
        order.status = status;
        order.trackingNumber = tracking.trim();
        order.carrier = CARRIER;
        order.staffNotes = notes.trim();
        order.statusUpdatedAt = now;

        if (status === 'Shipped' && order.trackingNumber) {
            order.shippedAt = now;
        }
        if (status === 'Completed') {
            order.completedAt = now;
        }

        var orders = loadOrders();
        var existingIndex = findOrderIndex(orderNumber);
        if (existingIndex >= 0) orders[existingIndex] = order;
        else orders.push(order);
        saveOrders(orders);
        closeCreateModal();
        renderTable(root, orderNumber);
        renderDetail(root, orderNumber);
        showToast(root, (existingIndex >= 0 ? 'Updated tracking for ' : 'Created tracking record ') + orderNumber + '.');
    }

    function bindPage(root) {
        if (!root) return;
        if (root.dataset.orderTrackingBound === '1') {
            renderTable(root, null);
            return;
        }
        root.dataset.orderTrackingBound = '1';
        root._otPage = 1;

        function refresh() {
            renderTable(root, root._otSelected || null);
            if (root._otDetailOpen && root._otSelected) renderDetail(root, root._otSelected);
        }

        function focusEditField() {
            var status = root.querySelector('#ot-status');
            if (status) status.focus();
        }

        function selectOrder(orderNumber) {
            root._otSelected = orderNumber;
            if (root._otDetailOpen) refresh();
            else renderTable(root, orderNumber);
        }

        function openOrder(orderNumber) {
            root._otSelected = orderNumber;
            root._otDetailOpen = true;
            refresh();
            focusEditField();
        }

        function closeEditPicker() {
            var picker = document.getElementById('ot-edit-picker');
            if (picker) picker.remove();
        }

        function openEditPicker() {
            closeEditPicker();
            var rows = root.querySelectorAll('#order-tracking-tbody tr[data-order-id]');
            if (!rows.length) {
                showToast(root, 'No customer orders to edit.');
                return;
            }
            var picker = document.createElement('div');
            picker.id = 'ot-edit-picker';
            picker.className = 'ot-edit-picker';
            picker.setAttribute('role', 'menu');
            var html = '<p class="ot-edit-picker__title">Choose an order to edit</p>';
            Array.prototype.forEach.call(rows, function (row) {
                var id = row.getAttribute('data-order-id');
                var order = loadOrders().find(function (item) { return item.orderNumber === id; });
                var who = order ? customerName(order) : '';
                var status = order && order.status ? order.status : '';
                html += '<button type="button" class="ot-edit-picker__item" data-ot-pick="' + escapeHtml(id) + '">' +
                    '<strong>' + escapeHtml(id) + '</strong>' +
                    '<span>' + escapeHtml(who + (status ? ' · ' + status : '')) + '</span>' +
                    '</button>';
            });
            picker.innerHTML = html;
            document.body.appendChild(picker);
            var anchor = root.querySelector('#ot-create-btn');
            if (anchor) {
                var rect = anchor.getBoundingClientRect();
                var width = picker.offsetWidth || 280;
                picker.style.top = Math.round(rect.bottom + 8) + 'px';
                picker.style.left = Math.max(12, Math.round(rect.right - width)) + 'px';
            }
            picker.addEventListener('click', function (event) {
                var item = event.target.closest('[data-ot-pick]');
                if (!item) return;
                var id = item.getAttribute('data-ot-pick');
                closeEditPicker();
                openOrder(id);
            });
            setTimeout(function () {
                function dismiss(event) {
                    if (picker.contains(event.target)) return;
                    if (anchor && anchor.contains(event.target)) return;
                    closeEditPicker();
                    document.removeEventListener('click', dismiss, true);
                }
                document.addEventListener('click', dismiss, true);
            }, 0);
        }

        function editSelectedOrder(event) {
            if (event) event.preventDefault();
            if (document.getElementById('ot-edit-picker') && !root._otSelected) {
                closeEditPicker();
                return;
            }
            if (!root._otSelected) {
                openEditPicker();
                return;
            }
            var exists = loadOrders().some(function (order) {
                return order.orderNumber === root._otSelected;
            });
            if (!exists) {
                root._otSelected = null;
                root._otDetailOpen = false;
                refresh();
                showToast(root, 'That order is no longer in the list. Select another one.');
                return;
            }
            closeEditPicker();
            openOrder(root._otSelected);
        }

        function closeOrder() {
            root._otSelected = null;
            root._otDetailOpen = false;
            if (isPoShell(root)) showTrackingList(root);
            renderTable(root, null);
        }

        root.addEventListener('click', function (e) {
            var pageBtn = e.target.closest('[data-ot-page]');
            if (pageBtn && root.contains(pageBtn)) {
                e.preventDefault();
                e.stopPropagation();
                var dir = pageBtn.getAttribute('data-ot-page');
                root._otPage = (root._otPage || 1) + (dir === 'next' ? 1 : -1);
                renderTable(root, root._otSelected || null);
                return;
            }
            var opener = e.target.closest('[data-ot-open]');
            if (opener && root.contains(opener)) {
                e.preventDefault();
                e.stopPropagation();
                openOrder(opener.getAttribute('data-ot-open'));
                return;
            }
            var row = e.target.closest('#order-tracking-tbody tr[data-order-id]');
            if (!row || !root.contains(row)) return;
            if (e.target.closest('button, a, input, select')) return;
            selectOrder(row.getAttribute('data-order-id'));
        }, true);

        var backBtn = root.querySelector('#ot-details-back-btn');
        if (backBtn) backBtn.addEventListener('click', closeOrder);

        var createBtn = root.querySelector('#ot-create-btn');
        if (createBtn) {
            if (createBtn.getAttribute('data-ot-action') === 'edit') {
                createBtn.addEventListener('click', editSelectedOrder);
            } else {
                createBtn.addEventListener('click', function () {
                    renderCreatePanel(root);
                });
            }
        }

        injectExtraFilters(root);
        var filter = root.querySelector('#ot-status-filter');
        var search = root.querySelector('#ot-search');
        var pageSize = root.querySelector('#ot-page-size');
        if (filter) filter.addEventListener('change', function () { root._otPage = 1; refresh(); });
        if (search) search.addEventListener('input', function () { root._otPage = 1; refresh(); });
        if (pageSize) pageSize.addEventListener('change', function () { root._otPage = 1; refresh(); });
        ['#ot-pay-filter', '#ot-track-filter', '#ot-from', '#ot-to'].forEach(function (id) {
            var el = root.querySelector(id);
            if (el) el.addEventListener('change', function () { root._otPage = 1; refresh(); });
        });
        var clearBtn = root.querySelector('#ot-clear-filters');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            if (filter) filter.value = 'all';
            if (search) search.value = '';
            ['#ot-pay-filter', '#ot-track-filter'].forEach(function (id) { var el = root.querySelector(id); if (el) el.value = 'all'; });
            ['#ot-from', '#ot-to'].forEach(function (id) { var el = root.querySelector(id); if (el) el.value = ''; });
            root._otPage = 1;
            refresh();
        });

        refresh();
        pullDatabaseOrders();
    }

    function injectExtraFilters(root) {
        var tools = root.querySelector('.po-list-toolbar-tools');
        if (!tools || root.querySelector('#ot-pay-filter')) return;
        var status = root.querySelector('#ot-status-filter');
        if (status) {
            ['Awaiting payment', 'Cancelled'].forEach(function (name) {
                var has = Array.prototype.some.call(status.options, function (o) { return o.value === name; });
                if (!has) status.appendChild(new Option(name, name));
            });
        }
        var wrap = document.createElement('div');
        wrap.className = 'ot-extra-filters';
        wrap.innerHTML =
            '<label class="po-page-size">Payment <select id="ot-pay-filter">' +
                '<option value="all">All</option><option value="paid">Paid</option><option value="awaiting">Awaiting payment</option>' +
                '<option value="cod">Pay on delivery</option><option value="pending">Unpaid</option>' +
                '<option value="expired">Payment expired</option><option value="failed">Payment failed</option></select></label>' +
            '<label class="po-page-size">Tracking <select id="ot-track-filter">' +
                '<option value="all">All</option><option value="with">With tracking no.</option><option value="without">Needs tracking no.</option></select></label>' +
            '<label class="po-page-size">From <input type="date" id="ot-from"></label>' +
            '<label class="po-page-size">To <input type="date" id="ot-to"></label>' +
            '<button type="button" id="ot-clear-filters" class="po-pager-btn">Clear filters</button>';
        tools.insertBefore(wrap, tools.firstChild);
        if (!document.getElementById('ot-extra-style')) {
            var st = document.createElement('style');
            st.id = 'ot-extra-style';
            st.textContent = '.ot-extra-filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ot-extra-filters input[type=date]{padding:6px 8px;border:1px solid #d0d5dd;border-radius:8px;font:inherit}.po-list-toolbar-tools{flex-wrap:wrap}';
            document.head.appendChild(st);
        }
    }

    function init() {
        updateDashboardCounts();
        document.querySelectorAll('[data-order-tracking-page]').forEach(bindPage);
    }

    if (!window.__kreezbyOrderTrackingLeave) {
        window.__kreezbyOrderTrackingLeave = true;
        document.addEventListener('turbo:before-frame-render', function (event) {
            if (!event.target || event.target.id !== 'kreezby-main-content') return;
            var incoming = event.detail && event.detail.newFrame;
            if (incoming && incoming.querySelector && incoming.querySelector('[data-order-tracking-page]')) return;
            closeCreateModal();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('kreezby:page-load', init);
    // A payment confirmed on the server (PayMongo) or by another user shows here within seconds.
    document.addEventListener('kreezby:remote-state', function (e) {
        var keys = (e && e.detail && e.detail.keys) || [];
        if (keys.indexOf(STORAGE_KEY) !== -1 || keys.indexOf(PO_STORAGE_KEY) !== -1) init();
    });
    document.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY || e.key === PO_STORAGE_KEY) init();
    });

    window.KreezbyOrderTracking = {
        loadOrders: loadOrders,
        loadPurchaseOrders: loadPurchaseOrders,
        saveOrders: saveOrders,
        generateOrderNumber: generateOrderNumber,
        jntTrackUrl: jntTrackUrl,
        CARRIER: CARRIER,
        updateDashboardCounts: updateDashboardCounts,
        processingCount: processingCount
    };
})();
