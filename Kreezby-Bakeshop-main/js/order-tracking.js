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
    var JNT_TRACK_BASE = 'https://www.jtexpress.ph/track-and-trace?billCodes=';
    var STATUSES = ['Processing', 'Shipped', 'Completed'];

    function loadOrders() {
        if (window.KreezbyPortalSeed && typeof window.KreezbyPortalSeed.apply === 'function') {
            window.KreezbyPortalSeed.apply();
        }
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
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
        var deliveryFee = order.deliveryFee != null ? Number(order.deliveryFee) : (subtotal > 0 ? 50 : 0);
        return {
            subtotal: Number(subtotal) || 0,
            deliveryFee: Number(deliveryFee) || 0,
            total: (Number(subtotal) || 0) + (Number(deliveryFee) || 0)
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
            deliveryFee: totals.deliveryFee,
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

    function openReceiptWindow(receipt) {
        if (!receipt) return;

        var rows = (receipt.items || []).map(function (item) {
            return '<tr><td>' + escapeHtml(item.name) + '</td><td class="num">' + item.qty + '</td><td class="num">' + formatMoney(item.price) + '</td><td class="num">' + formatMoney(item.lineTotal) + '</td></tr>';
        }).join('');

        var issuedAt = new Date(receipt.issuedAt).toLocaleString('en-PH');
        var subtotal = Number(receipt.subtotal) || 0;
        var deliveryFee = Number(receipt.deliveryFee) || 0;
        var grossTotal = Number(receipt.total) || 0;
        var discount = 0;
        var netTotal = Math.max(grossTotal - discount, 0);
        var vatableSales = netTotal / 1.12;
        var vatAmount = netTotal - vatableSales;

        function buildCopy(label) {
            return '<section class="receipt-copy">' +
                '<div class="center brand">KREEZBY BAKESHOP</div>' +
                '<div class="center sub">The Crinkle Factory</div>' +
                '<div class="center sub">Batangas City, Philippines</div>' +
                '<div class="rule"></div>' +
                '<div class="center copy-type">' + label + '</div>' +
                '<div class="center title">OFFICIAL RECEIPT</div>' +
                '<div class="meta-block">' +
                    '<div><span>OR No:</span> <strong>' + escapeHtml(receipt.receiptNumber) + '</strong></div>' +
                    '<div><span>Order:</span> <strong>' + escapeHtml(receipt.orderNumber) + '</strong></div>' +
                    '<div><span>Date:</span> <strong>' + issuedAt + '</strong></div>' +
                    '<div><span>Pay:</span> <strong>' + escapeHtml(receipt.paymentMethod) + '</strong></div>' +
                    '<div><span>Status:</span> <strong>PAID</strong></div>' +
                    '<div><span>Customer Name:</span> <strong>' + escapeHtml(receipt.customerName) + '</strong></div>' +
                    '<div><span>Phone:</span> <strong>' + escapeHtml(receipt.customerPhone || '-') + '</strong></div>' +
                    '<div><span>Address:</span> <strong>' + escapeHtml(receipt.customerAddress || '-') + '</strong></div>' +
                '</div>' +
                '<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>' + rows + '</tbody><tfoot>' +
                    '<tr><td colspan="3" class="num">Subtotal</td><td class="num">' + formatMoney(subtotal) + '</td></tr>' +
                    '<tr><td colspan="3" class="num">Delivery Fee</td><td class="num">' + formatMoney(deliveryFee) + '</td></tr>' +
                    '<tr><td colspan="3" class="num">Discount</td><td class="num">' + formatMoney(discount) + '</td></tr>' +
                    '<tr><td colspan="3" class="num grand">Grand Total</td><td class="num grand">' + formatMoney(netTotal) + '</td></tr>' +
                '</tfoot></table>' +
                '<div class="tax-block">' +
                    '<div><span>VATable Sales</span><strong>' + formatMoney(vatableSales) + '</strong></div>' +
                    '<div><span>VAT-Exempt</span><strong>' + formatMoney(0) + '</strong></div>' +
                    '<div><span>Zero-Rated</span><strong>' + formatMoney(0) + '</strong></div>' +
                '</div>' +
                '<div class="line"><span>Notes:</span> ' + escapeHtml(receipt.shippingNotes || '-') + '</div>' +
                '<div class="line"><span>Cashier:</span> Online Checkout</div>' +
                '<div class="line">--------------------------------</div>' +
                '<div class="center thanks">THANK YOU FOR YOUR ORDER</div>' +
                '<div class="center tiny">This serves as official receipt.</div>' +
            '</section>';
        }

        var html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Kreezby Receipt ' + escapeHtml(receipt.receiptNumber) + '</title>' +
            '<style>body{font-family:"Courier New",Courier,monospace;margin:0;color:#111;background:#f2f2f2}.sheet{width:100%;max-width:320px;margin:10px auto}.receipt-copy{background:#fff;border:1px solid #222;padding:10px}.center{text-align:center}.brand{font-size:16px;font-weight:700;letter-spacing:.5px}.sub{font-size:11px;margin-bottom:2px}.copy-type{font-size:11px;border-top:1px dashed #222;border-bottom:1px dashed #222;padding:3px 0;margin:5px 0 4px}.title{font-size:12px;font-weight:700;margin-bottom:6px}.rule{border-top:1px dashed #222;margin:4px 0}.meta-block{font-size:11px;line-height:1.45;margin-bottom:6px}.meta-block div{margin-bottom:1px}.line{font-size:11px;margin-top:6px}.tax-block{font-size:11px;border-top:1px dashed #222;border-bottom:1px dashed #222;padding:4px 0;margin-top:6px}.tax-block div{display:flex;justify-content:space-between;margin:1px 0}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;border-top:1px dashed #222;border-bottom:1px dashed #222;padding:3px 2px;font-weight:700}td{padding:3px 2px;border-bottom:1px dotted #999;vertical-align:top}.num{text-align:right;white-space:nowrap}.grand{font-weight:700}.thanks{font-size:11px;margin-top:6px}.tiny{font-size:10px;color:#444;margin-top:2px}.cut-line{border-top:2px dashed #222;margin:10px 0;text-align:center;position:relative}.cut-line span{background:#f2f2f2;font-size:10px;padding:0 4px;position:relative;top:-7px;letter-spacing:.08em}.actions{margin:8px auto 14px;display:flex;gap:6px;justify-content:center}button{padding:8px 10px;border:1px solid #222;background:#fff;cursor:pointer;font-family:inherit;font-size:11px}.print{font-weight:700}@media print{body{background:#fff}.actions{display:none}.sheet{max-width:320px;margin:0 auto}.receipt-copy{border:none;page-break-inside:avoid}}</style></head><body>' +
            '<div class="sheet">' +
            buildCopy('CUSTOMER COPY') +
            '<div class="cut-line"><span>CUT HERE</span></div>' +
            buildCopy('OWNER COPY') +
            '<div class="actions"><button class="print" onclick="window.print()">Print Receipt</button><button class="close" onclick="window.close()">Close</button></div></div></body></html>';

        var receiptWin = window.open('', '_blank', 'width=920,height=760');
        if (!receiptWin) {
            alert('Receipt pop-up was blocked by your browser. Please allow pop-ups to view receipt.');
            return;
        }
        receiptWin.document.open();
        receiptWin.document.write(html);
        receiptWin.document.close();
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

    function customerName(order) {
        if (order.shippingInfo && order.shippingInfo.fullName) {
            return order.shippingInfo.fullName;
        }
        if (order.poEntity) return order.poEntity;
        return '—';
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

    function filteredOrders(statusFilter, query) {
        var orders = loadOrders().slice().reverse();
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
                    (o.poCode || '').toLowerCase().indexOf(q) !== -1 ||
                    (ship.fullName || '').toLowerCase().indexOf(q) !== -1 ||
                    (o.trackingNumber || '').toLowerCase().indexOf(q) !== -1
                );
            });
        }

        return orders;
    }

    function renderTable(root, selectedId) {
        var tableBody = root.querySelector('#order-tracking-tbody');
        var layout = root.querySelector('.order-tracking-layout');
        if (!tableBody) return;

        var statusFilter = (root.querySelector('#ot-status-filter') || {}).value || 'all';
        var query = (root.querySelector('#ot-search') || {}).value || '';
        var orders = filteredOrders(statusFilter, query);

        if (!orders.length) {
            tableBody.innerHTML =
                '<tr><td colspan="7" class="order-tracking-empty">No customer orders found.</td></tr>';
            if (layout) layout.classList.remove('has-detail');
            return;
        }

        tableBody.innerHTML = orders.map(function (order) {
            var selected = order.orderNumber === selectedId ? ' is-selected' : '';
            var tracking = order.trackingNumber
                ? escapeHtml(order.trackingNumber)
                : '<span style="color:#9ca3af">Not set</span>';
            return (
                '<tr data-order-id="' + escapeHtml(order.orderNumber) + '" class="' + selected.trim() + '">' +
                '<td>' + escapeHtml(order.orderNumber) + '</td>' +
                '<td>' + escapeHtml(order.poCode || '—') + '</td>' +
                '<td>' + escapeHtml(customerName(order)) + '</td>' +
                '<td>' + formatDate(order.date) + '</td>' +
                '<td><span class="order-tracking-status-pill ' + statusClass(order.status) + '">' +
                    escapeHtml(order.status || 'Processing') + '</span></td>' +
                '<td>' + tracking + '</td>' +
                '<td>' + escapeHtml(order.carrier || CARRIER) + '</td>' +
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
            panel.hidden = true;
            if (layout) layout.classList.remove('has-detail');
            return;
        }

        var ship = order.shippingInfo || {};
        var trackUrl = jntTrackUrl(order.trackingNumber);
        var receipt = findOwnerReceipt(order) || buildReceiptFromOrder(order);

        panel.hidden = false;
        if (layout) layout.classList.add('has-detail');

        panel.innerHTML =
            '<h3 class="order-tracking-detail-title">' + escapeHtml(order.orderNumber) + '</h3>' +
            '<p class="order-tracking-detail-sub">' + escapeHtml(customerName(order)) + ' · ' + formatDate(order.date) + '</p>' +
            (order.poCode
                ? '<div class="order-tracking-form-group"><label>Linked PO Code</label><input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(order.poCode) + '"></div>'
                : '') +
            '<div class="order-tracking-form-group">' +
                '<label>Delivery address</label>' +
                '<textarea readonly rows="2">' + escapeHtml(ship.address || '—') + '</textarea>' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label>Phone</label>' +
                '<input type="text" readonly value="' + escapeHtml(ship.phone || '—') + '">' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-status">Order status</label>' +
                '<select id="ot-status">' +
                    STATUSES.map(function (s) {
                        var sel = order.status === s ? ' selected' : '';
                        return '<option value="' + s + '"' + sel + '>' + s + '</option>';
                    }).join('') +
                '</select>' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-carrier">Courier</label>' +
                '<input type="text" id="ot-carrier" readonly value="' + escapeHtml(order.carrier || CARRIER) + '">' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-tracking">J&amp;T Express tracking ID</label>' +
                '<input type="text" id="ot-tracking" placeholder="e.g. JT1234567890123" value="' + escapeHtml(order.trackingNumber || '') + '">' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-notes">Internal notes (optional)</label>' +
                '<textarea id="ot-notes" rows="2" placeholder="Packaging or dispatch notes">' + escapeHtml(order.staffNotes || '') + '</textarea>' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label>Receipt</label>' +
                '<input type="text" readonly class="order-tracking-readonly-field" value="' + escapeHtml(receipt.receiptNumber || 'Not generated') + '">' +
            '</div>' +
            '<div class="order-tracking-form-actions">' +
                '<button type="button" class="order-tracking-btn order-tracking-btn-primary" id="ot-save-btn">Save tracking</button>' +
                '<button type="button" class="order-tracking-btn" id="ot-receipt-btn">View receipt</button>' +
                (trackUrl
                    ? '<a class="order-tracking-btn order-tracking-btn-link" href="' + trackUrl + '" target="_blank" rel="noopener noreferrer">Track on J&amp;T</a>'
                    : '') +
                '<button type="button" class="order-tracking-btn" id="ot-close-btn">Close</button>' +
            '</div>';

        panel.querySelector('#ot-save-btn').addEventListener('click', function () {
            saveOrderUpdates(root, orderNumber);
        });
        panel.querySelector('#ot-receipt-btn').addEventListener('click', function () {
            var freshOrder = loadOrders().find(function (o) { return o.orderNumber === orderNumber; }) || order;
            var receiptData = findOwnerReceipt(freshOrder) || buildReceiptFromOrder(freshOrder);
            openReceiptWindow(receiptData);
        });
        panel.querySelector('#ot-close-btn').addEventListener('click', function () {
            panel.hidden = true;
            if (layout) layout.classList.remove('has-detail');
            renderTable(root, null);
        });
    }

    function saveOrderUpdates(root, orderNumber) {
        var idx = findOrderIndex(orderNumber);
        if (idx < 0) return;

        var orders = loadOrders();
        var order = orders[idx];
        var statusEl = root.querySelector('#ot-status');
        var trackingEl = root.querySelector('#ot-tracking');
        var notesEl = root.querySelector('#ot-notes');

        var nextStatus = statusEl ? statusEl.value : order.status;
        var tracking = trackingEl ? trackingEl.value.trim() : '';
        var notes = notesEl ? notesEl.value.trim() : '';

        order.status = nextStatus;
        order.trackingNumber = tracking;
        order.carrier = CARRIER;
        order.staffNotes = notes;
        order.statusUpdatedAt = new Date().toISOString();

        if (nextStatus === 'Shipped' && tracking && !order.shippedAt) {
            order.shippedAt = order.statusUpdatedAt;
        }
        if (nextStatus === 'Completed') {
            order.completedAt = order.statusUpdatedAt;
        }

        orders[idx] = order;
        saveOrders(orders);
        renderTable(root, orderNumber);
        renderDetail(root, orderNumber);
        showToast(root, 'Saved tracking for ' + orderNumber + '.');
    }

    function renderCreatePanel(root) {
        var panel = root.querySelector('#order-tracking-detail');
        var layout = root.querySelector('.order-tracking-layout');
        if (!panel) return;

        var purchaseOrders = loadPurchaseOrders();
        var orderNumber = generateOrderNumber();
        var poOptions = purchaseOrders.length
            ? purchaseOrders.map(function (po) {
                return '<option value="' + escapeHtml(po.code) + '">' + escapeHtml(poOptionLabel(po)) + '</option>';
            }).join('')
            : '<option value="">No purchase orders found</option>';

        panel.hidden = false;
        if (layout) layout.classList.add('has-detail');

        panel.innerHTML =
            '<h3 class="order-tracking-detail-title">Create New Order Tracking</h3>' +
            '<p class="order-tracking-create-hint">Select a purchase order code to auto-fill the customer name, then add the J&amp;T tracking ID.</p>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-create-po">Purchase order code</label>' +
                '<select id="ot-create-po">' +
                    '<option value="">Select PO code…</option>' +
                    poOptions +
                '</select>' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-create-customer">Customer / entity name</label>' +
                '<input type="text" id="ot-create-customer" class="order-tracking-readonly-field" readonly placeholder="Auto-filled from PO">' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
                '<label for="ot-create-order-id">Order ID</label>' +
                '<input type="text" id="ot-create-order-id" class="order-tracking-readonly-field" readonly value="' + escapeHtml(orderNumber) + '">' +
            '</div>' +
            '<div class="order-tracking-form-group">' +
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
            '<div class="order-tracking-form-group">' +
                '<label for="ot-create-notes">Internal notes (optional)</label>' +
                '<textarea id="ot-create-notes" rows="2" placeholder="Dispatch or packaging notes"></textarea>' +
            '</div>' +
            '<div class="order-tracking-form-actions">' +
                '<button type="button" class="order-tracking-btn order-tracking-btn-primary" id="ot-create-save-btn">Create order tracking</button>' +
                '<button type="button" class="order-tracking-btn" id="ot-create-cancel-btn">Cancel</button>' +
            '</div>';

        var poSelect = panel.querySelector('#ot-create-po');
        var customerInput = panel.querySelector('#ot-create-customer');

        function applyPoSelection() {
            var po = findPurchaseOrder(poSelect.value);
            if (!po) {
                customerInput.value = '';
                return;
            }
            customerInput.value = po.entity || '';
        }

        if (poSelect) {
            poSelect.addEventListener('change', applyPoSelection);
            if (purchaseOrders.length === 1) {
                poSelect.value = purchaseOrders[0].code;
                applyPoSelection();
            }
        }

        panel.querySelector('#ot-create-save-btn').addEventListener('click', function () {
            createOrderFromForm(root);
        });
        panel.querySelector('#ot-create-cancel-btn').addEventListener('click', function () {
            panel.hidden = true;
            if (layout) layout.classList.remove('has-detail');
        });
    }

    function createOrderFromForm(root) {
        var panel = root.querySelector('#order-tracking-detail');
        if (!panel) return;

        var poCode = (panel.querySelector('#ot-create-po') || {}).value || '';
        var customer = (panel.querySelector('#ot-create-customer') || {}).value || '';
        var orderNumber = (panel.querySelector('#ot-create-order-id') || {}).value || generateOrderNumber();
        var status = (panel.querySelector('#ot-create-status') || {}).value || 'Processing';
        var tracking = (panel.querySelector('#ot-create-tracking') || {}).value || '';
        var notes = (panel.querySelector('#ot-create-notes') || {}).value || '';

        if (!poCode) {
            showToast(root, 'Please select a purchase order code.');
            return;
        }
        if (!customer) {
            showToast(root, 'Customer name could not be detected from the selected PO.');
            return;
        }
        if (findOrderIndex(orderNumber) >= 0) {
            orderNumber = generateOrderNumber();
        }

        var po = findPurchaseOrder(poCode);
        var now = new Date().toISOString();
        var order = {
            orderNumber: orderNumber,
            poCode: poCode,
            poEntity: po ? po.entity : customer,
            items: po ? poItemsToOrderItems(po.items) : {},
            subtotal: po && po.items ? po.items.reduce(function (n, item) {
                return n + ((Number(item.cost) || 0) * (Number(item.qty) || 0));
            }, 0) : 0,
            deliveryFee: 0,
            total: po ? poOrderTotal(po) : '₱0.00',
            paymentMethod: 'po',
            shippingInfo: {
                fullName: customer,
                phone: '',
                address: po && po.area ? po.area : '',
                notes: po && po.remarks ? po.remarks : ''
            },
            status: status,
            trackingNumber: tracking.trim(),
            carrier: CARRIER,
            staffNotes: notes.trim(),
            date: now,
            statusUpdatedAt: now,
            paymentVerified: true,
            source: 'staff-tracking'
        };

        if (status === 'Shipped' && order.trackingNumber) {
            order.shippedAt = now;
        }
        if (status === 'Completed') {
            order.completedAt = now;
        }

        var orders = loadOrders();
        orders.push(order);
        saveOrders(orders);
        renderTable(root, orderNumber);
        renderDetail(root, orderNumber);
        showToast(root, 'Created tracking record ' + orderNumber + '.');
    }

    function bindPage(root) {
        if (!root || root.dataset.orderTrackingBound === '1') return;
        root.dataset.orderTrackingBound = '1';

        var selectedId = null;

        function refresh() {
            renderTable(root, selectedId);
            if (selectedId) renderDetail(root, selectedId);
        }

        root.addEventListener('click', function (e) {
            var row = e.target.closest('#order-tracking-tbody tr[data-order-id]');
            if (!row) return;
            selectedId = row.getAttribute('data-order-id');
            refresh();
        });

        var createBtn = root.querySelector('#ot-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', function () {
                selectedId = null;
                renderCreatePanel(root);
            });
        }

        var filter = root.querySelector('#ot-status-filter');
        var search = root.querySelector('#ot-search');
        if (filter) filter.addEventListener('change', refresh);
        if (search) search.addEventListener('input', refresh);

        refresh();
    }

    function init() {
        updateDashboardCounts();
        document.querySelectorAll('[data-order-tracking-page]').forEach(bindPage);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('kreezby:page-load', init);
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
