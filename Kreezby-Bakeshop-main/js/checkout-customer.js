let selectedPaymentMethod = 'paymongo';
let cartData = {};
let isPaymentVerified = false;
let gcashWebpay = null;
let paymongoPayment = null;
let paymongoTestUrl = '';
let paymongoPollTimer = null;
const PAYMONGO_DRAFT_KEY = 'kreezbyPaymongoCheckout';
let orderNumber = '';
const GCASH_SHOP_NUMBER = '09178001650';
const GCASH_SHOP_NUMBER_LABEL = '0917 800 1650';
const CUSTOMER_RECEIPTS_KEY = 'kreezbyCustomerReceipts';
const OWNER_RECEIPTS_KEY = 'kreezbyOwnerReceipts';
const CUSTOMER_PROFILE_KEY = 'kreezbyCustomerProfile';

function ensureCheckoutDialog() {
    let overlay = document.getElementById('checkout-alert-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'checkout-alert-overlay';
    overlay.className = 'checkout-alert-overlay';
    overlay.setAttribute('hidden', 'hidden');
    overlay.innerHTML = [
        '<div class="checkout-alert-dialog" role="alertdialog" aria-modal="true" aria-labelledby="checkout-alert-title">',
        '<div class="checkout-alert-icon" id="checkout-alert-icon" aria-hidden="true">!</div>',
        '<h3 class="checkout-alert-title" id="checkout-alert-title">Notice</h3>',
        '<p class="checkout-alert-message" id="checkout-alert-message"></p>',
        '<dl class="checkout-alert-details" id="checkout-alert-details" hidden></dl>',
        '<div class="checkout-alert-actions">',
        '<button type="button" class="checkout-alert-btn" id="checkout-alert-ok-btn">OK</button>',
        '</div>',
        '</div>'
    ].join('');

    overlay.addEventListener('click', function (event) {
        if (event.target === overlay) {
            closeCheckoutDialog();
        }
    });

    document.body.appendChild(overlay);
    return overlay;
}

function closeCheckoutDialog() {
    const overlay = document.getElementById('checkout-alert-overlay');
    if (!overlay) return;
    overlay.setAttribute('hidden', 'hidden');
    overlay.classList.remove('is-visible');

    if (typeof overlay._resolve === 'function') {
        const resolve = overlay._resolve;
        overlay._resolve = null;
        resolve();
    }
}

function showCheckoutDialog(message, options) {
    const opts = options || {};
    const type = opts.type || 'warning';
    const title = opts.title || (type === 'success' ? 'Success' : 'Warning');
    const iconMap = { warning: '!', success: '✓', info: 'i' };

    const overlay = ensureCheckoutDialog();
    const dialog = overlay.querySelector('.checkout-alert-dialog');
    const iconEl = overlay.querySelector('#checkout-alert-icon');
    const titleEl = overlay.querySelector('#checkout-alert-title');
    const messageEl = overlay.querySelector('#checkout-alert-message');
    const detailsEl = overlay.querySelector('#checkout-alert-details');
    const okBtn = overlay.querySelector('#checkout-alert-ok-btn');
    const details = Array.isArray(opts.details) ? opts.details.filter(function (row) {
        return row && row.label && row.value;
    }) : [];

    dialog.classList.remove('is-warning', 'is-success', 'is-info', 'has-details');
    dialog.classList.add('is-' + type);
    if (details.length) dialog.classList.add('has-details');
    iconEl.textContent = iconMap[type] || '!';
    titleEl.textContent = title;
    messageEl.textContent = message || '';
    messageEl.hidden = !message;
    detailsEl.hidden = details.length === 0;
    detailsEl.innerHTML = details.map(function (row) {
        return '<div class="checkout-alert-row' + (row.emphasis ? ' is-emphasis' : '') + (row.mono ? ' is-mono' : '') + '"><dt>' + escapeHtml(row.label) + '</dt><dd>' + escapeHtml(row.value) + '</dd></div>';
    }).join('');
    okBtn.textContent = opts.buttonText || 'OK';

    overlay.removeAttribute('hidden');
    overlay.classList.add('is-visible');

    return new Promise(function (resolve) {
        overlay._resolve = resolve;
        okBtn.onclick = closeCheckoutDialog;
        okBtn.focus();
    });
}

function parseStoredJson(key, fallbackValue) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallbackValue;
    } catch (err) {
        return fallbackValue;
    }
}

function formatCurrency(value) {
    return `₱${Number(value || 0).toFixed(2)}`;
}

function paymentMethodLabel(methodId) {
    const labels = {
        gcash: 'GCash',
        paymongo: 'QR Ph',
        qrph: 'QR Ph',
        cash_on_delivery: 'Cash on delivery',
        cod: 'Cash on delivery'
    };
    return labels[methodId] || String(methodId || 'Unknown');
}

function isGcashCheckout() {
    return selectedPaymentMethod === 'gcash';
}

function isPaymongoCheckout() {
    return selectedPaymentMethod === 'paymongo';
}

function paymongoSucceeded() {
    return !!(paymongoPayment && paymongoPayment.status === 'succeeded' && paymongoPayment.paymentIntentId);
}

function generateReceiptNumber() {
    const receipts = parseStoredJson(CUSTOMER_RECEIPTS_KEY, []);
    const year = new Date().getFullYear();
    const next = Array.isArray(receipts) ? receipts.length + 1 : 1;
    return `RCP-${year}-${String(next).padStart(5, '0')}`;
}

function buildReceipt(order) {
    const shipping = order.shippingInfo || {};
    const lineItems = Object.values(order.items || {}).map((item) => ({
        name: item.name + ' · ' + POUCH_LABEL,
        qty: Number(item.qty) || 0,
        price: Number(item.cost) || 0,
        lineTotal: (Number(item.qty) || 0) * (Number(item.cost) || 0)
    }));

    return {
        receiptNumber: generateReceiptNumber(),
        orderNumber: order.orderNumber,
        issuedAt: new Date().toISOString(),
        customerName: shipping.fullName || 'Customer',
        customerPhone: shipping.phone || '',
        customerAddress: shipping.address || '',
        paymentMethod: paymentMethodLabel(order.paymentMethod),
        gcashReference: order.gcashReference || '',
        gcashPaidTo: order.gcashPaidTo || GCASH_SHOP_NUMBER,
        paymentStatus: order.paymentStatus === 'paid' ? 'Paid' : (order.paymentStatus === 'awaiting_payment' ? 'Awaiting payment' : (order.paymentVerified ? 'Verified' : 'Awaiting verification')),
        gcashWebpay: order.gcashWebpay || null,
        paymongoPaymentIntentId: order.paymongo && order.paymongo.paymentIntentId ? order.paymongo.paymentIntentId : '',
        subtotal: Number(order.subtotal) || 0,
        deliveryFee: Number(order.deliveryFee) || 0,
        deliveryLabel: order.deliveryRegion ? ('J&T delivery (' + order.deliveryRegion + ')') : 'J&T delivery',
        total: (Number(order.subtotal) || 0) + (Number(order.deliveryFee) || 0),
        items: lineItems,
        shippingNotes: shipping.notes || '',
        status: order.status || 'Processing'
    };
}

function saveReceiptCopies(receipt) {
    const customerReceipts = parseStoredJson(CUSTOMER_RECEIPTS_KEY, []).filter((entry) => entry.orderNumber !== receipt.orderNumber);
    const ownerReceipts = parseStoredJson(OWNER_RECEIPTS_KEY, []).filter((entry) => entry.orderNumber !== receipt.orderNumber);

    const customerCopy = { ...receipt, audience: 'customer' };
    const ownerCopy = { ...receipt, audience: 'owner' };

    customerReceipts.unshift(customerCopy);
    ownerReceipts.unshift(ownerCopy);

    localStorage.setItem(CUSTOMER_RECEIPTS_KEY, JSON.stringify(customerReceipts));
    localStorage.setItem(OWNER_RECEIPTS_KEY, JSON.stringify(ownerReceipts));
}

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function openReceiptWindow(receipt, heading) {
    if (!receipt) return;

    const rows = (receipt.items || []).map((item) => {
        return `<tr><td>${escapeHtml(item.name)}</td><td class="num">${item.qty}</td><td class="num">${formatCurrency(item.price)}</td><td class="num">${formatCurrency(item.lineTotal)}</td></tr>`;
    }).join('');

    const issuedAt = new Date(receipt.issuedAt).toLocaleString('en-PH');
    const notes = escapeHtml(receipt.shippingNotes || '-');
    const copyTitle = escapeHtml(heading || 'Receipt');
    const subtotal = Number(receipt.subtotal) || 0;
    const grossTotal = Number(receipt.total) || 0;
    const discount = 0;
    const netTotal = Math.max(grossTotal - discount, 0);
    const vatableSales = netTotal / 1.12;
    const vatAmount = netTotal - vatableSales;

    const buildCopy = (label) => {
        const isCustomerCopy = label === 'CUSTOMER COPY';
        return `
<section class="receipt-copy ${isCustomerCopy ? 'customer-copy' : 'owner-copy'}">
    <div class="center brand">KREEZBY BAKESHOP</div>
    <div class="center sub">The Crinkle Factory</div>
    <div class="center sub">Batangas City, Philippines</div>
    <div class="rule"></div>
    <div class="center copy-type">${label}</div>
    ${isCustomerCopy ? '<div class="customer-copy-banner">Keep this copy for order tracking and support follow-up.</div>' : ''}
    <div class="center title">OFFICIAL RECEIPT</div>
    <div class="meta-block">
        <div><span>OR No:</span> <strong>${escapeHtml(receipt.receiptNumber)}</strong></div>
        <div><span>Order:</span> <strong>${escapeHtml(receipt.orderNumber)}</strong></div>
        <div><span>Date:</span> <strong>${issuedAt}</strong></div>
        <div><span>Pay:</span> <strong>${escapeHtml(receipt.paymentMethod)}${receipt.gcashReference ? ' ' + escapeHtml(GCASH_SHOP_NUMBER_LABEL) : ''}</strong></div>
        ${receipt.paymongoPaymentIntentId ? '<div><span>QR Ph:</span> <strong>' + escapeHtml(receipt.paymongoPaymentIntentId) + '</strong></div>' : (receipt.gcashWebpay && receipt.gcashWebpay.webpayReferenceNumber ? '<div><span>Webpay ref:</span> <strong>' + escapeHtml(receipt.gcashWebpay.webpayReferenceNumber) + '</strong></div>' : (receipt.gcashReference ? '<div><span>GCash ref:</span> <strong>' + escapeHtml(receipt.gcashReference) + '</strong></div>' : ''))}
        <div><span>Status:</span> <strong>${escapeHtml(receipt.paymentStatus || 'Awaiting verification')}</strong></div>
        <div><span>Customer Name:</span> <strong>${escapeHtml(receipt.customerName)}</strong></div>
        <div><span>Phone:</span> <strong>${escapeHtml(receipt.customerPhone || '-')}</strong></div>
        <div><span>Address:</span> <strong>${escapeHtml(receipt.customerAddress || '-')}</strong></div>
    </div>
    <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
            <tr><td colspan="3" class="num">Subtotal</td><td class="num">${formatCurrency(subtotal)}</td></tr>
            ${receipt.deliveryFee ? `<tr><td colspan="3" class="num">${escapeHtml(receipt.deliveryLabel || 'Delivery fee')}</td><td class="num">${formatCurrency(receipt.deliveryFee)}</td></tr>` : ''}
            <tr><td colspan="3" class="num">Discount</td><td class="num">${formatCurrency(discount)}</td></tr>
            <tr><td colspan="3" class="num grand">Grand Total</td><td class="num grand">${formatCurrency(netTotal)}</td></tr>
        </tfoot>
    </table>
    <div class="tax-block">
        <div><span>VATable Sales</span><strong>${formatCurrency(vatableSales)}</strong></div>
        <div><span>VAT-Exempt</span><strong>${formatCurrency(0)}</strong></div>
        <div><span>Zero-Rated</span><strong>${formatCurrency(0)}</strong></div>
    </div>
    <div class="line"><span>Notes:</span> ${notes}</div>
    <div class="line"><span>Cashier:</span> Online Checkout</div>
    <div class="line">--------------------------------</div>
    <div class="center thanks">THANK YOU FOR YOUR ORDER</div>
    <div class="center tiny">${copyTitle} | This serves as official receipt.</div>
</section>`;
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kreezby Receipt ${escapeHtml(receipt.receiptNumber)}</title>
<style>
body { font-family: 'Courier New', Courier, monospace; margin: 0; color: #111; background: #eceff3; }
.sheet { width: 100%; max-width: 340px; margin: 12px auto; }
.receipt-copy { background: #fff; border: 1px solid #222; padding: 10px; }
.receipt-copy.customer-copy { border: 1px solid #7a543b; background: linear-gradient(180deg, #fffdf8 0%, #ffffff 24%, #fbfdff 100%); box-shadow: 0 16px 28px rgba(40, 28, 14, 0.12); }
.center { text-align: center; }
.brand { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
.customer-copy .brand { color: #5d4037; }
.sub { font-size: 11px; margin-bottom: 4px; }
.copy-type { font-size: 11px; border-top: 1px dashed #222; border-bottom: 1px dashed #222; padding: 3px 0; margin-bottom: 4px; }
.customer-copy .copy-type { border-color: #7a543b; color: #5d4037; font-weight: 700; background: rgba(248, 220, 170, 0.22); }
.customer-copy-banner { margin: 6px 0 7px; padding: 6px 7px; border: 1px dashed #d09b3c; background: #fff5dd; color: #7a4d00; font-size: 10px; line-height: 1.35; text-align: center; }
.title { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
.rule { border-top: 1px dashed #222; margin: 4px 0; }
.customer-copy .rule { border-color: #7a543b; }
.meta-block { font-size: 11px; line-height: 1.45; margin-bottom: 6px; }
.customer-copy .meta-block { padding: 6px 7px; border: 1px dashed #d7c1a4; background: rgba(255, 250, 239, 0.72); }
.meta-block div { margin-bottom: 1px; }
.line { font-size: 11px; margin-top: 6px; }
.tax-block { font-size: 11px; border-top: 1px dashed #222; border-bottom: 1px dashed #222; padding: 4px 0; margin-top: 6px; }
.tax-block div { display: flex; justify-content: space-between; margin: 1px 0; }
.customer-copy .tax-block { border-color: #7a543b; background: rgba(255, 250, 239, 0.55); padding-left: 5px; padding-right: 5px; }
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th { text-align: left; border-top: 1px dashed #222; border-bottom: 1px dashed #222; padding: 3px 2px; font-weight: 700; }
.customer-copy th { border-color: #7a543b; background: rgba(248, 220, 170, 0.18); }
td { padding: 3px 2px; border-bottom: 1px dotted #999; vertical-align: top; }
.customer-copy td { border-bottom-color: #cab8a5; }
.num { text-align: right; white-space: nowrap; }
.grand { font-weight: 700; }
.customer-copy .grand { color: #5d4037; }
.thanks { font-size: 11px; margin-top: 6px; }
.customer-copy .thanks { color: #5d4037; }
.tiny { font-size: 10px; color: #444; margin-top: 2px; }
.cut-line { border-top: 2px dashed #222; margin: 10px 0; text-align: center; position: relative; }
.cut-line span { background: #eceff3; font-size: 10px; padding: 0 4px; position: relative; top: -7px; }
.actions { margin: 8px auto 14px; display: flex; gap: 6px; justify-content: center; }
button { padding: 8px 10px; border: 1px solid #222; background: #fff; cursor: pointer; font-family: inherit; font-size: 11px; }
.print { font-weight: 700; }
@media print {
    body { background: #fff; }
    .actions { display: none; }
    .sheet { max-width: 340px; margin: 0 auto; }
    .receipt-copy { border: none; page-break-inside: avoid; box-shadow: none; }
}
</style>
</head>
<body>
<div class="sheet">
${buildCopy('CUSTOMER COPY')}
<div class="actions">
<button class="print" onclick="window.print()">Print Receipt</button>
<button class="close" onclick="window.close()">Close</button>
</div>
</div>
</body>
</html>`;

    const receiptWin = window.open('', '_blank', 'width=920,height=760');
    if (!receiptWin) {
        showCheckoutDialog('Receipt pop-up was blocked by your browser. Please allow pop-ups to print receipt.', {
            type: 'warning',
            title: 'Pop-up Blocked'
        });
        return;
    }

    receiptWin.document.open();
    receiptWin.document.write(html);
    receiptWin.document.close();
}

// Current prices win over a price saved in an older cart.
const CURRENT_PRICES = { 'flavor-choc': 165 };

// ---- J&T delivery fee (estimated rates from Batangas) ---------------------------------
// One pouch = 10 pcs, 250 g net. The parcel weight is the number of pouches x 250 g.
const POUCH_LABEL = 'Pouch (10 Pcs)';
const POUCH_WEIGHT_KG = 0.25;
const JT_RATES = [
    // [up to kg, Within Luzon, Visayas, Mindanao]
    [0.5, 85, 100, 105],
    [1, 155, 180, 195],
    [3, 180, 200, 220],
    [4, 270, 300, 330],
    [5, 360, 400, 440],
    [6, 455, 500, 550]
];
const JT_REGION_COLUMN = { luzon: 1, visayas: 2, mindanao: 3 };
const JT_REGION_LABEL = { luzon: 'Within Luzon', visayas: 'Visayas', mindanao: 'Mindanao' };
// Provinces and main cities, matched as whole words in the delivery address.
const VISAYAS_PLACES = ['visayas', 'cebu', 'mandaue', 'lapu-lapu', 'lapu lapu', 'talisay', 'bohol', 'tagbilaran', 'iloilo',
    'guimaras', 'capiz', 'roxas city', 'aklan', 'kalibo', 'boracay', 'antique', 'negros', 'bacolod', 'dumaguete', 'siquijor',
    'leyte', 'tacloban', 'ormoc', 'samar', 'catbalogan', 'calbayog', 'borongan', 'biliran', 'naval', 'bais', 'silay', 'kabankalan'];
const MINDANAO_PLACES = ['mindanao', 'davao', 'tagum', 'digos', 'mati', 'zamboanga', 'pagadian', 'dipolog', 'dapitan', 'isabela city',
    'cagayan de oro', 'misamis', 'iligan', 'ozamiz', 'oroquieta', 'bukidnon', 'malaybalay', 'valencia city', 'camiguin', 'lanao',
    'marawi', 'maguindanao', 'cotabato', 'kidapawan', 'koronadal', 'south cotabato', 'general santos', 'gensan', 'sarangani',
    'sultan kudarat', 'tacurong', 'surigao', 'agusan', 'butuan', 'bayugan', 'bislig', 'tandag', 'dinagat', 'basilan', 'sulu',
    'jolo', 'tawi-tawi', 'tawi tawi', 'bangsamoro', 'barmm', 'soccsksargen', 'caraga', 'compostela'];

function hasPlace(text, places) {
    return places.some(function (place) {
        const escaped = place.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('(^|[^a-z])' + escaped + '([^a-z]|$)').test(text);
    });
}

function deliveryRegionFor(address) {
    const text = String(address || '').toLowerCase();
    if (!text.trim()) return '';
    if (hasPlace(text, MINDANAO_PLACES)) return 'mindanao';
    if (hasPlace(text, VISAYAS_PLACES)) return 'visayas';
    return 'luzon';
}

function cartPouchCount() {
    return Object.values(cartData).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
}

function deliveryQuote() {
    const addressEl = document.getElementById('address');
    const region = deliveryRegionFor(addressEl ? addressEl.value : '');
    const pouches = cartPouchCount();
    const weightKg = Math.round(pouches * POUCH_WEIGHT_KG * 100) / 100;
    if (!region || !pouches) return { region: region, weightKg: weightKg, fee: 0, ready: false };
    const col = JT_REGION_COLUMN[region];
    let fee = 0;
    const row = JT_RATES.find(function (r) { return weightKg <= r[0]; });
    if (row) fee = row[col];
    else {
        // Heavier than 6 kg: add the 5-6 kg step for every extra kg started.
        const last = JT_RATES[JT_RATES.length - 1];
        const prev = JT_RATES[JT_RATES.length - 2];
        fee = last[col] + Math.ceil(weightKg - last[0]) * (last[col] - prev[col]);
    }
    return { region: region, weightKg: weightKg, fee: fee, ready: true };
}

function formatWeight(kg) {
    return kg < 1 ? Math.round(kg * 1000) + ' g' : (Math.round(kg * 100) / 100) + ' kg';
}

function normalizeCartData(rawCart) {
    if (!rawCart || typeof rawCart !== 'object') return {};
    const safeCart = {};

    Object.keys(rawCart).forEach((key) => {
        const item = rawCart[key];
        if (!item) return;
        const cost = CURRENT_PRICES[key] != null ? CURRENT_PRICES[key] : Number(item.cost);
        const qty = Number(item.qty);

        if (!Number.isFinite(cost) || !Number.isFinite(qty) || qty <= 0) return;

        safeCart[key] = {
            name: item.name || 'Item',
            cost,
            qty
        };
    });

    return safeCart;
}

function setVerificationMessage(type, message) {
    const verificationStatus = document.getElementById('verification-status');
    if (!verificationStatus) return;
    verificationStatus.style.display = 'block';
    verificationStatus.className = `verification-status ${type}`;
    verificationStatus.textContent = message;
}

function clearVerificationMessage() {
    const verificationStatus = document.getElementById('verification-status');
    if (!verificationStatus) return;
    verificationStatus.style.display = 'none';
    verificationStatus.className = 'verification-status';
    verificationStatus.textContent = '';
}

function hasCartItems() {
    return Object.keys(cartData).length > 0;
}

function updateActionButtons() {
    const verifyBtn = document.getElementById('verify-payment-btn');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const canPay = Boolean(selectedPaymentMethod) && hasCartItems();

    if (verifyBtn) {
        verifyBtn.disabled = !canPay || !isGcashCheckout();
        verifyBtn.style.display = isGcashCheckout() ? '' : 'none';
    }
    if (placeOrderBtn) {
        const paymongoReady = !isPaymongoCheckout() || paymongoSucceeded();
        placeOrderBtn.disabled = !canPay || !paymongoReady;
        placeOrderBtn.textContent = isPaymongoCheckout() && !paymongoReady ? 'Pay with QR Ph first' : 'Place Order';
    }
}

function syncPaymentPanels() {
    const gcashPanel = document.getElementById('qr-section');
    const paymongoPanel = document.getElementById('paymongo-section');
    const codPanel = document.getElementById('cod-section');
    if (gcashPanel) gcashPanel.classList.toggle('active', isGcashCheckout());
    if (paymongoPanel) paymongoPanel.classList.toggle('active', isPaymongoCheckout());
    if (codPanel) codPanel.classList.toggle('active', selectedPaymentMethod === 'cash_on_delivery');
}

function setPaymongoButtonLabel(text) {
    const button = document.getElementById('paymongo-pay-btn');
    if (!button) return;
    const label = button.querySelector('.paymongo-open-btn__label');
    if (label) label.textContent = text;
    else button.textContent = text;
}

function resetPaymongoButton() {
    paymongoTestUrl = '';
    const qr = document.getElementById('paymongo-qr');
    const frame = document.querySelector('.paymongo-qr-frame');
    if (qr) {
        qr.hidden = true;
        qr.removeAttribute('src');
    }
    if (frame) frame.hidden = true;
    const button = document.getElementById('paymongo-pay-btn');
    if (button) {
        button.disabled = false;
        setPaymongoButtonLabel('Show QR code');
    }
}

function resetVerification() {
    isPaymentVerified = false;
    gcashWebpay = null;
    paymongoPayment = null;
    stopPaymongoPoll();
    resetPaymongoButton();
    const result = document.getElementById('gcash-webpay-result');
    if (result) {
        result.hidden = true;
        result.innerHTML = '';
    }
    clearVerificationMessage();
    const payBtn = document.getElementById('verify-payment-btn');
    if (payBtn) payBtn.textContent = 'Pay with GCash';
    updateActionButtons();
}

function buildGcashWebpay(totalAmount) {
    const now = new Date();
    const pad = function (value, width) { return String(value).padStart(width, '0'); };
    const stamp = String(now.getUTCFullYear())
        + pad(now.getUTCMonth() + 1, 2)
        + pad(now.getUTCDate(), 2)
        + pad(now.getUTCHours(), 2)
        + pad(now.getUTCMinutes(), 2)
        + pad(now.getUTCSeconds(), 2)
        + pad(Math.floor(Math.random() * 10000), 4);
    return {
        checkoutSessionId: 'cs_gcash_' + String(Math.floor(1000000 + Math.random() * 9000000)),
        webpayReferenceNumber: stamp.slice(0, 18),
        apiStatus: 'PAID',
        paidAt: now.toISOString(),
        amount: totalAmount
    };
}

function renderWebpayResult(payment) {
    const result = document.getElementById('gcash-webpay-result');
    if (!result || !payment) return;
    result.hidden = false;
    result.innerHTML = [
        '<p class="gcash-pay-lead"><strong>API status:</strong> ' + payment.apiStatus + '</p>',
        '<p class="qr-instructions">Webpay reference: <strong>' + payment.webpayReferenceNumber + '</strong><br>',
        'Checkout session: <strong>' + payment.checkoutSessionId + '</strong><br>',
        'Paid at: <strong>' + payment.paidAt.replace('T', ' ').replace('Z', ' UTC') + '</strong></p>'
    ].join('');
}

function saveCustomerPurchaseOrder(order) {
    const shipping = order.shippingInfo || {};
    const items = Object.keys(order.items || {}).map(function (key) {
        const item = order.items[key] || {};
        const qty = Number(item.qty) || 0;
        const cost = Number(item.cost) || 0;
        return { qty: qty, unit: POUCH_LABEL, name: item.name || 'Crinkles', note: '', cost: cost, total: qty * cost };
    });
    const now = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    const map = parseStoredJson('kreezby-po-orders-v1', {});
    const store = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    store[order.orderNumber] = {
        code: order.orderNumber,
        dateCreated: stamp,
        entity: shipping.fullName || order.accountName || 'Customer',
        entityType: 'customer',
        area: shipping.address || order.accountArea || '',
        status: 'PROCESSING',
        statusClass: 'pending',
        remarks: order.paymentMethod === 'paymongo'
            ? ('QR Ph paid. Payment intent ' + ((order.paymongo && order.paymongo.paymentIntentId) || '') + '.')
            : (order.paymentMethod === 'gcash'
                ? ('GCash webpay paid. Reference ' + ((order.gcashWebpay && order.gcashWebpay.webpayReferenceNumber) || order.gcashReference) + '.')
                : 'Cash on delivery is waiting for verification.'),
        trackingNumber: '',
        courier: 'J&T Express Philippines',
        paymentMethod: order.paymentMethod || 'paymongo',
        gcashReference: order.gcashReference || '',
        gcashPaidTo: order.gcashPaidTo || '',
        gcashWebpay: order.gcashWebpay || null,
        paymongo: order.paymongo || null,
        paymentVerified: order.paymentMethod === 'gcash' || order.paymentMethod === 'paymongo',
        paymentStatus: (order.paymentMethod === 'gcash' || order.paymentMethod === 'paymongo') ? 'paid' : 'pending',
        inventoryDeducted: !!order.inventoryDeducted,
        shopOrderNumber: order.orderNumber,
        accountType: order.accountType || 'Regular Customer',
        accountName: order.accountName || shipping.fullName || '',
        accountArea: order.accountArea || shipping.address || '',
        items: items
    };
    localStorage.setItem('kreezby-po-orders-v1', JSON.stringify(store));
}

function prefillShippingFromProfile() {
    const profile = parseStoredJson(CUSTOMER_PROFILE_KEY, {});
    if (!profile || typeof profile !== 'object') return;

    const fullNameInput = document.getElementById('full-name');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');

    if (fullNameInput && profile.fullName && !fullNameInput.value.trim()) {
        fullNameInput.value = String(profile.fullName);
    }
    if (phoneInput && profile.contactNumber && !phoneInput.value.trim()) {
        phoneInput.value = String(profile.contactNumber);
    }
    if (addressInput && profile.defaultAddress && !addressInput.value.trim()) {
        addressInput.value = String(profile.defaultAddress);
    }
}

function syncProfileShippingInfo(fullName, phone, address) {
    const profile = parseStoredJson(CUSTOMER_PROFILE_KEY, {});
    if (!profile || typeof profile !== 'object') return;

    profile.fullName = fullName || profile.fullName || '';
    profile.contactNumber = phone || profile.contactNumber || '';
    profile.defaultAddress = address || profile.defaultAddress || '';
    profile.addresses = Array.isArray(profile.addresses) ? profile.addresses : [];

    if (profile.defaultAddress) {
        const hasPrimary = profile.addresses.some((entry) => String(entry.address || '').trim() === String(profile.defaultAddress).trim());
        if (!hasPrimary) {
            profile.addresses.unshift({
                id: 'addr-' + Date.now(),
                label: 'Primary Address',
                address: profile.defaultAddress
            });
        }
    }

    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profile));
}

function initCheckout() {
    ensureCheckoutDialog();
    prefillShippingFromProfile();

    const paymentSelector = document.getElementById('payment-selector');
    const summaryRoot = document.getElementById('payment-summary');

    const selectedItem = paymentSelector ? paymentSelector.querySelector('[data-payment-id].is-selected, [data-payment-id][aria-checked="true"]') : null;
    if (selectedItem) {
        selectedPaymentMethod = selectedItem.getAttribute('data-payment-id') || selectedPaymentMethod;
    }

    if (window.KreezbyPaymentSummary && summaryRoot) {
        KreezbyPaymentSummary.updatePaymentMethod(summaryRoot, selectedPaymentMethod);
    }

    cartData = normalizeCartData(parseStoredJson('kreezbyCart', {}));
    renderOrderSummary();
    syncPaymentPanels();
    updateActionButtons();
    // The delivery fee follows the address: re-price as the customer types it.
    const addressInput = document.getElementById('address');
    if (addressInput) {
        let addressTimer = 0;
        addressInput.addEventListener('input', function () {
            clearTimeout(addressTimer);
            addressTimer = setTimeout(renderOrderSummary, 250);
        });
        addressInput.addEventListener('change', renderOrderSummary);
    }

    // Items changed or removed from the Cart popup: refresh the order summary here too.
    document.addEventListener('kreezby:cart-change', function () {
        cartData = normalizeCartData(parseStoredJson('kreezbyCart', {}));
        renderOrderSummary();
        updateActionButtons();
    });

    const copyBtn = document.getElementById('gcash-copy-btn');
    const numberEl = document.getElementById('gcash-shop-number');
    if (numberEl) numberEl.textContent = GCASH_SHOP_NUMBER_LABEL;
    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            const done = function () {
                copyBtn.textContent = 'Copied';
                setTimeout(function () { copyBtn.textContent = 'Copy number'; }, 1200);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(GCASH_SHOP_NUMBER).then(done).catch(done);
            } else {
                done();
            }
        });
    }
    if (paymentSelector) {
        paymentSelector.addEventListener('paymentchange', (e) => {
            selectPayment(e.detail.id, { userInitiated: true });
        });
    }
    const paymongoBtn = document.getElementById('paymongo-pay-btn');
    if (paymongoBtn) {
        paymongoBtn.addEventListener('click', function () {
            if (paymongoTestUrl) {
                window.open(paymongoTestUrl, '_blank', 'noopener');
                setPaymongoStatus('Finish paying on the PayMongo page. This checkout checks every 5 seconds.');
                return;
            }
            startPaymongo();
        });
    }
    document.querySelectorAll('[data-paymongo-app]').forEach(function (appBtn) {
        appBtn.addEventListener('click', function () {
            const wallet = appBtn.getAttribute('data-paymongo-app');
            if (wallet === 'qrph' && paymongoTestUrl) {
                window.open(paymongoTestUrl, '_blank', 'noopener');
                return;
            }
            appBtn.disabled = true;
            Promise.resolve(startPaymongo(wallet)).finally(function () { appBtn.disabled = false; });
        });
    });
    resumePaymongoReturn();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckout);
} else {
    initCheckout();
}

function renderOrderSummary() {
    const summaryRoot = document.getElementById('payment-summary');
    const keys = Object.keys(cartData);
    const verifyBtn = document.getElementById('verify-payment-btn');

    if (keys.length === 0) {
        if (window.KreezbyPaymentSummary) {
            KreezbyPaymentSummary.render(summaryRoot, {
                paymentMethod: selectedPaymentMethod || 'paymongo',
                items: [],
                total: { label: 'Total', value: '₱0.00' }
            });
        }
        const amountLabel = document.getElementById('qr-amount');
        if (amountLabel) amountLabel.textContent = '₱0.00';
        if (verifyBtn) verifyBtn.disabled = true;
        updateActionButtons();
        return;
    }

    let subtotal = 0;
    const lineItems = keys.map((key) => {
        const item = cartData[key];
        const lineTotal = item.cost * item.qty;
        subtotal += lineTotal;
        return {
            label: `${item.name} · ${POUCH_LABEL} × ${item.qty}`,
            value: formatCurrency(lineTotal),
            valueClassName: 'payment-summary__value--muted'
        };
    });

    const quote = deliveryQuote();
    const total = subtotal + quote.fee;

    lineItems.push(
        { label: 'Subtotal', value: formatCurrency(subtotal) },
        quote.ready
            ? { label: `J&T delivery (${JT_REGION_LABEL[quote.region]} · ${formatWeight(quote.weightKg)})`, value: formatCurrency(quote.fee) }
            : { label: 'J&T delivery fee', value: 'Enter your address', valueClassName: 'payment-summary__value--muted' }
    );

    if (window.KreezbyPaymentSummary) {
        KreezbyPaymentSummary.render(summaryRoot, {
            paymentMethod: selectedPaymentMethod || 'paymongo',
            items: lineItems,
            total: { label: 'Total', value: formatCurrency(total) }
        });
    }

    const amountLabel = document.getElementById('qr-amount');
    if (amountLabel) amountLabel.textContent = formatCurrency(total);
    const codAmount = document.getElementById('cod-amount');
    if (codAmount) codAmount.textContent = formatCurrency(total);
    if (!(isPaymentVerified && isGcashCheckout())) clearVerificationMessage();
    updateActionButtons();
}

function selectPayment(method, options) {
    options = options || {};
    if (!method) return;
    const methodChanged = selectedPaymentMethod !== method;
    selectedPaymentMethod = method;

    if (window.KreezbyPaymentSummary) {
        KreezbyPaymentSummary.updatePaymentMethod(
            document.getElementById('payment-summary'),
            method
        );
    }

    if (options.userInitiated || methodChanged) {
        resetVerification();
        if (selectedPaymentMethod === 'cash_on_delivery') {
            isPaymentVerified = true;
            setVerificationMessage('pending', 'Cash is collected on delivery. Kreezby verifies that payment after the cash is received.');
        }
    }

    syncPaymentPanels();
    updateActionButtons();
}

function payWithGcash() {
    showCheckoutDialog('GCash is collected through PayMongo. Choose PayMongo, then proceed to pay.', {
        type: 'info',
        title: 'PayMongo'
    });
}

function checkoutTotalAmount() {
    const subtotal = Object.values(cartData).reduce((sum, item) => sum + item.cost * item.qty, 0);
    return subtotal + deliveryQuote().fee;
}

function selectedPaymongoWallet() {
    return 'qrph';
}

function paymongoTestPageUrl(value) {
    try {
        const parsed = new URL(String(value || ''));
        const host = parsed.hostname.toLowerCase();
        if (parsed.protocol !== 'https:' || (host !== 'paymongo.com' && !host.endsWith('.paymongo.com'))) return '';
        return parsed.toString();
    } catch (error) {
        return '';
    }
}

function claimPaymongoOrder(paymentIntentId) {
    const key = 'kreezbyPaymongoPlaced:' + paymentIntentId;
    try {
        if (localStorage.getItem(key) === '1') return false;
        localStorage.setItem(key, '1');
        return true;
    } catch (error) {
        return true;
    }
}

function paymongoWalletLabel(wallet) {
    const labels = {
        qrph: 'QR Ph',
        gcash: 'GCash',
        paymaya: 'Maya',
        metrobank: 'Metrobank'
    };
    return labels[wallet] || '';
}

function showPaymongoQr(image) {
    const qr = document.getElementById('paymongo-qr');
    const frame = document.querySelector('.paymongo-qr-frame');
    if (!qr || !String(image || '').startsWith('data:image/')) return false;
    qr.src = image;
    qr.hidden = false;
    if (frame) frame.hidden = false;
    return true;
}

function setPaymongoStatus(message) {
    const status = document.getElementById('paymongo-status');
    if (status) status.textContent = message;
}

function stopPaymongoPoll() {
    if (paymongoPollTimer) {
        clearInterval(paymongoPollTimer);
        paymongoPollTimer = null;
    }
}

function readPaymongoDraft() {
    try {
        return JSON.parse(sessionStorage.getItem(PAYMONGO_DRAFT_KEY) || 'null');
    } catch (error) {
        return null;
    }
}

function writePaymongoDraft(draft) {
    sessionStorage.setItem(PAYMONGO_DRAFT_KEY, JSON.stringify(draft));
}

function shippingFields() {
    return {
        fullName: (document.getElementById('full-name').value || '').trim(),
        phone: (document.getElementById('phone').value || '').trim(),
        address: (document.getElementById('address').value || '').trim(),
        notes: (document.getElementById('notes').value || '').trim(),
        email: (document.getElementById('paymongo-email').value || '').trim()
    };
}

function restoreShippingFields(draft) {
    if (!draft) return;
    const fullName = document.getElementById('full-name');
    const phone = document.getElementById('phone');
    const address = document.getElementById('address');
    const notes = document.getElementById('notes');
    const email = document.getElementById('paymongo-email');
    if (fullName && draft.fullName) fullName.value = draft.fullName;
    if (phone && draft.phone) phone.value = draft.phone;
    if (address && draft.address) address.value = draft.address;
    if (notes && draft.notes) notes.value = draft.notes;
    if (email && draft.email) email.value = draft.email;
}

// Stop payment when the cart asks for more pouches than the shop has on hand.
function cartWithinStock() {
    const stock = window.KreezbyCustomerStock;
    if (!stock || typeof stock.shortages !== 'function') return true;
    const short = stock.shortages(cartData);
    if (!short.length) return true;
    showCheckoutDialog('Some items in your cart are more than what we have in stock. Please lower the quantity in your cart, then try again.', {
        type: 'warning',
        title: 'Not Enough Stock',
        details: short.map(function (row) {
            return { label: row.name, value: row.available > 0 ? 'Only ' + row.available + ' left (you have ' + row.wanted + ')' : 'Out of stock' };
        })
    });
    return false;
}

function validCheckoutContact(fields) {
    if (!fields.fullName || !fields.phone || !fields.address) {
        showCheckoutDialog('Please fill in all shipping information.', { type: 'warning', title: 'Missing Information' });
        return false;
    }
    const phonePattern = /^(09\d{9}|\+639\d{9})$/;
    if (!phonePattern.test(fields.phone.replace(/\s+/g, ''))) {
        showCheckoutDialog('Please enter a valid PH mobile number (example: 09123456789 or +639123456789).', {
            type: 'warning',
            title: 'Invalid Phone Number'
        });
        return false;
    }
    if (isPaymongoCheckout() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
        showCheckoutDialog('Enter an email address so the QR Ph receipt can be sent.', {
            type: 'warning',
            title: 'Email Needed'
        });
        return false;
    }
    return true;
}

function watchPaymongo(paymentIntentId, onSucceeded) {
    stopPaymongoPoll();
    let ticks = 0;

    async function tick() {
        ticks += 1;
        try {
            const result = await paymongoFetch('/api/paymongo/payment-intents/' + encodeURIComponent(paymentIntentId));
            const response = result.response;
            const data = result.data || {};
            if (!response || !response.ok) {
                stopPaymongoPoll();
                setPaymongoStatus(data.error || 'PayMongo could not be checked.');
                return;
            }
            if (data.status === 'succeeded') {
                stopPaymongoPoll();
                paymongoPayment = {
                    paymentIntentId: data.paymentIntentId,
                    status: 'succeeded',
                    wallet: data.wallet || selectedPaymongoWallet(),
                    amount: data.amount
                };
                isPaymentVerified = true;
                setPaymongoStatus('Payment successful. Reference ' + data.paymentIntentId + '.');
                updateActionButtons();
                if (typeof onSucceeded === 'function') onSucceeded();
                return;
            }
            if (data.lastPaymentError) {
                stopPaymongoPoll();
                paymongoPayment = null;
                setPaymongoStatus(data.lastPaymentError);
                updateActionButtons();
                return;
            }
            const waiting = (readPaymongoDraft() || {}).orderNumber;
            setPaymongoStatus(paymongoTestUrl
                ? 'Choose Authorize on the PayMongo page. This checkout checks every 5 seconds.'
                : (waiting
                    ? 'Order ' + waiting + ' is awaiting payment. ' + (isPhoneScreen() ? 'Download the QR and upload it in GCash.' : 'Scan the QR Ph code with any participating app.') + ' This page checks every 5 seconds.'
                    : 'Scan the QR Ph code with any participating app. This page checks every 5 seconds.'));
            if (ticks > 360) {
                stopPaymongoPoll();
                setPaymongoStatus('Still waiting for the payment. Show the code again if you need a new one.');
            }
        } catch (error) {
            stopPaymongoPoll();
            setPaymongoStatus('PayMongo could not be checked.');
        }
    }

    tick();
    paymongoPollTimer = setInterval(tick, 5000);
}

let paymongoBase = '';

function paymongoCandidates() {
    const host = window.location.hostname;
    const list = [''];
    if ((host === 'localhost' || host === '127.0.0.1') && window.location.port !== '3000') {
        list.push('http://127.0.0.1:3000');
        list.push('http://localhost:3000');
    }
    if (paymongoBase && list.indexOf(paymongoBase) === -1) list.unshift(paymongoBase);
    return list;
}

async function paymongoFetch(path, options) {
    let lastResponse = null;
    let lastData = {};
    for (const base of paymongoCandidates()) {
        try {
            const response = await fetch(base + path, options);
            const data = await response.json().catch(function () { return {}; });
            if (response.ok && data && data.ok) {
                paymongoBase = base;
                return { response, data };
            }
            lastResponse = response;
            lastData = data || {};
            if (data && data.error) break;
        } catch (error) {
            lastResponse = null;
        }
    }
    return { response: lastResponse, data: lastData };
}

async function startPaymongo(walletOverride) {
    if (!hasCartItems()) {
        showCheckoutDialog('Your cart is empty. Add items before paying with QR Ph.', { type: 'warning', title: 'Cart Empty' });
        return;
    }
    if (!cartWithinStock()) return;
    const fields = shippingFields();
    if (!validCheckoutContact(fields)) return;
    const amount = checkoutTotalAmount();
    const wallet = walletOverride || selectedPaymongoWallet();
    const button = document.getElementById('paymongo-pay-btn');
    if (button) button.disabled = true;
    setPaymongoStatus(wallet === 'qrph' ? 'Creating the QR code…' : 'Opening the app…');
    let showedQr = false;
    try {
        const result = await paymongoFetch('/api/paymongo/e-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount,
                wallet,
                name: fields.fullName,
                email: fields.email,
                phone: fields.phone,
                description: 'Kreezby customer order',
                returnUrl: window.location.origin + window.location.pathname + '?paymongo=return',
                reference: 'customer-checkout',
                audience: 'customer'
            })
        });
        const response = result.response;
        const data = result.data || {};
        if (!response) {
            setPaymongoStatus('The shop server is not running. Open http://localhost:3000 and try again.');
            return;
        }
        if (!response.ok || !data.ok) {
            setPaymongoStatus(data.error || (response.status === 404
                ? 'The shop server needs a restart before PayMongo can take this payment.'
                : 'PayMongo could not start the payment.'));
            return;
        }
        if (data.redirectUrl) {
            writePaymongoDraft(Object.assign({}, fields, {
                wallet,
                paymentIntentId: data.paymentIntentId,
                placed: false
            }));
            showedQr = true;
            setPaymongoStatus('Opening ' + (paymongoWalletLabel(wallet) || 'the app') + '. Finish the payment there, then come back to this page.');
            window.location.assign(data.redirectUrl);
            return;
        }
        if (!showPaymongoQr(data.qrImage)) {
            setPaymongoStatus('QR Ph did not return a code.');
            return;
        }
        showedQr = true;
        paymongoTestUrl = paymongoTestPageUrl(data.testUrl);
        const lead = document.querySelector('#paymongo-section .gcash-pay-lead');
        if (paymongoTestUrl) {
            if (button) {
                button.disabled = false;
                setPaymongoButtonLabel('Open payment page');
            }
            if (lead) lead.textContent = 'Point your phone camera at this code. It opens the PayMongo payment page. Follow the steps there (in test mode, choose Authorize). This checkout places the order as soon as the payment is complete.';
            setPaymongoStatus('Scan the code with your phone camera and finish on the PayMongo page (test mode: choose Authorize). This page checks every 5 seconds.');
        } else if (button) {
            button.disabled = true;
            setPaymongoButtonLabel('QR code ready');
            setPaymongoStatus('Scan the QR Ph code with any participating app. This page checks every 5 seconds.');
        }
        writePaymongoDraft(Object.assign({}, fields, {
            wallet,
            paymentIntentId: data.paymentIntentId,
            placed: false
        }));
        // Save the order now as "Awaiting payment" so the customer can leave for GCash.
        const pendingNumber = placePendingQrOrder(data.paymentIntentId, data.qrImage, wallet);
        if (!paymongoTestUrl) showQrSave(data.qrImage, pendingNumber);
        if (pendingNumber) {
            setPaymongoStatus(isPhoneScreen()
                ? 'Order ' + pendingNumber + ' saved. Download the QR, then upload it in GCash. This page checks every 5 seconds.'
                : 'Order ' + pendingNumber + ' saved. Scan the QR Ph code with any participating app. This page checks every 5 seconds.');
        }
        watchPaymongo(data.paymentIntentId, function () { onQrPaid(data.paymentIntentId); });
    } catch (error) {
        setPaymongoStatus('The shop server is not running. Start it, then try PayMongo again.');
    } finally {
        if (button && !showedQr) button.disabled = false;
    }
}

// ---- Pay on a phone: download the QR, upload it in GCash ----

function isPhoneScreen() {
    return (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function showQrSave(qrImage, orderNumber) {
    const box = document.getElementById('paymongo-qr-save');
    const link = document.getElementById('paymongo-qr-download');
    const note = document.getElementById('paymongo-order-note');
    if (!box || !link || !String(qrImage || '').startsWith('data:image/')) return;
    link.href = qrImage;
    link.setAttribute('download', 'kreezby-qr-' + (orderNumber || 'payment') + '.png');
    box.hidden = false;
    if (note) note.textContent = orderNumber ? ('Order ' + orderNumber + ' is saved and awaiting payment.') : '';
    if (isPhoneScreen()) {
        const frame = document.querySelector('.paymongo-qr-frame');
        if (frame && frame.scrollIntoView) frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Saves the order as "Awaiting payment" as soon as the QR exists (once per payment).
function placePendingQrOrder(paymentIntentId, qrImage, wallet) {
    const draft = readPaymongoDraft() || {};
    if (draft.orderNumber && draft.paymentIntentId === paymentIntentId) return draft.orderNumber;
    const order = placeOrder({ paymentIntentId: paymentIntentId, qrImage: qrImage, wallet: wallet });
    if (!order) return '';
    const next = readPaymongoDraft() || draft;
    next.paymentIntentId = paymentIntentId;
    next.orderNumber = order.orderNumber;
    writePaymongoDraft(next);
    return order.orderNumber;
}

// Payment confirmed: turn the waiting order into a paid one (stock, receipt, notification).
function markQrOrderPaid(orderNumber, payment) {
    const orders = parseStoredJson('kreezbyOrders', []);
    const order = orders.find(function (row) { return row && row.orderNumber === orderNumber; });
    try { sessionStorage.removeItem(PAYMONGO_DRAFT_KEY); } catch (error) {}
    if (!order) {
        showCheckoutDialog('Your payment went through. Order ' + orderNumber + ' will show as paid in My Orders.', { type: 'success', title: 'Payment Received' })
            .then(function () { window.location.href = 'customer.html'; });
        return;
    }
    const alreadyPaid = order.paymentStatus === 'paid';
    order.paymentStatus = 'paid';
    order.paymentVerified = true;
    if (order.status === 'Awaiting payment') order.status = 'Processing';
    order.paidAt = order.paidAt || new Date().toISOString();
    order.paymongo = Object.assign({}, order.paymongo || {}, payment || {}, { status: 'succeeded' });
    delete order.paymongo.qrImage;
    localStorage.setItem('kreezbyOrders', JSON.stringify(orders));
    deductOrderStock(order, orders);

    const receipt = buildReceipt(order);
    if (order.receiptNumber) receipt.receiptNumber = order.receiptNumber;
    saveReceiptCopies(receipt);

    if (!alreadyPaid) {
        try {
            const notes = parseStoredJson('kreezbyNotifications', []);
            notes.unshift({
                id: 'n-paid-' + orderNumber,
                title: 'Payment Received',
                description: 'QR Ph payment received for order ' + orderNumber + ' (' + order.total + ').',
                timestamp: new Date().toISOString(),
                read: false,
                source: 'payment'
            });
            localStorage.setItem('kreezbyNotifications', JSON.stringify(notes));
        } catch (e) {}
    }

    const serverSave = saveOrderToServer(order, receipt);
    openReceiptWindow(receipt, 'Customer Copy');
    showCheckoutDialog('Your payment went through. Keep this receipt for the order.', {
        type: 'success',
        title: 'Payment Received',
        buttonText: 'Go To My Orders',
        details: [
            { label: 'Order number', value: orderNumber },
            { label: 'Payment', value: 'QR Ph' },
            order.paymongo && order.paymongo.paymentIntentId ? { label: 'Payment intent', value: order.paymongo.paymentIntentId, mono: true } : null,
            { label: 'Receipt', value: order.receiptNumber },
            { label: 'Total', value: order.total, emphasis: true }
        ]
    }).then(function () {
        localStorage.setItem('kreezbyOpenOrdersAfterCheckout', '1');
        localStorage.setItem('kreezbyLatestOrderNumber', orderNumber);
        return serverSave.then(function () { window.location.href = 'customer.html'; });
    });
}

// What to do when PayMongo says the payment succeeded.
function onQrPaid(paymentIntentId) {
    const current = readPaymongoDraft() || {};
    if (current.orderNumber) {
        if (!claimPaymongoOrder(paymentIntentId)) return;
        markQrOrderPaid(current.orderNumber, paymongoPayment);
        return;
    }
    if (current.placed || !claimPaymongoOrder(paymentIntentId)) return;
    current.placed = true;
    writePaymongoDraft(current);
    placeOrder();
}

// Back on the checkout page (from GCash, a refresh, or the PayMongo page): keep waiting.
function resumePendingQr() {
    const draft = readPaymongoDraft();
    if (!draft || !draft.paymentIntentId || !draft.orderNumber || paymongoPollTimer) return;
    restoreShippingFields(draft);
    selectPayment('paymongo');
    const order = parseStoredJson('kreezbyOrders', []).find(function (row) { return row && row.orderNumber === draft.orderNumber; });
    const qr = order && order.paymongo && order.paymongo.qrImage;
    if (qr && showPaymongoQr(qr)) showQrSave(qr, draft.orderNumber);
    setPaymongoStatus('Order ' + draft.orderNumber + ' is awaiting payment. Pay with the QR; this page checks every 5 seconds.');
    watchPaymongo(draft.paymentIntentId, function () { onQrPaid(draft.paymentIntentId); });
}

function resumePaymongoReturn() {
    const draft = readPaymongoDraft();
    if (draft && draft.orderNumber) { resumePendingQr(); return; }
    if (!/[?&]paymongo=return(?:&|$)/.test(window.location.search)) return;
    if (!draft || !draft.paymentIntentId || draft.placed) return;
    restoreShippingFields(draft);
    selectPayment('paymongo');
    setPaymongoStatus('Checking PayMongo…');
    watchPaymongo(draft.paymentIntentId, function () { onQrPaid(draft.paymentIntentId); });
}

document.addEventListener('visibilitychange', function () {
    if (!document.hidden) resumePendingQr();
});

// Sends the finished order (and its receipt) straight to the server, which stores it in
// MongoDB (customer_orders, sales_orders, receipts). Resolves either way after at most 8 s;
// if it fails, the regular sync still delivers the order from this browser.
function saveOrderToServer(order, receipt) {
    var body;
    try { body = JSON.stringify({ order: order, receipt: receipt || null }); } catch (e) { return Promise.resolve(false); }
    var attempt = function () {
        return fetch('/api/customer-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            credentials: 'same-origin',
            keepalive: body.length < 60000
        }).then(function (res) { return res.ok; }).catch(function () { return false; });
    };
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(false); }, 8000); });
    return Promise.race([
        attempt().then(function (ok) { return ok ? true : new Promise(function (r) { setTimeout(r, 1200); }).then(attempt); }),
        timeout
    ]);
}

function nextCustomerOrderNumber() {
    const year = new Date().getFullYear();
    let max = 1000;
    try {
        JSON.parse(localStorage.getItem('kreezbyOrders') || '[]').forEach(function (order) {
            const match = String(order && order.orderNumber || '').match(/^ORD-(\d{4})-(\d+)$/);
            if (match && Number(match[1]) === year) max = Math.max(max, Number(match[2]));
        });
    } catch (e) { /* ignore */ }
    return 'ORD-' + year + '-' + String(max + 1).padStart(4, '0');
}

// pendingQr: { paymentIntentId, wallet, qrImage } saves the order straight away as
// "Awaiting payment", so a customer on a phone can download the QR and pay in GCash.
function placeOrder(pendingQr) {
    if (!hasCartItems()) {
        showCheckoutDialog('Your cart is empty. Add products before placing an order.', { type: 'warning', title: 'Cart Empty' });
        return;
    }

    const payingWithPaymongo = isPaymongoCheckout();
    const fields = shippingFields();
    if (!validCheckoutContact(fields)) return;
    if (payingWithPaymongo && !pendingQr && !paymongoSucceeded()) {
        showCheckoutDialog('Pay with QR Ph before placing the order.', { type: 'warning', title: 'Payment Needed' });
        return;
    }

    const expiredItem = Object.keys(cartData || {}).map(function (key) { return cartData[key]; }).find(function (item) {
        return item && item.name && window.KreezbyDictionary && typeof KreezbyDictionary.saleBlockReason === 'function'
            && KreezbyDictionary.saleBlockReason(item.name) === 'expired';
    });
    if (expiredItem) {
        showCheckoutDialog(expiredItem.name + ' is expired and cannot be checked out.', { type: 'warning', title: 'Expired Product' });
        return;
    }

    orderNumber = nextCustomerOrderNumber();

    const subtotal = Object.values(cartData).reduce((sum, item) => sum + item.cost * item.qty, 0);
    const quote = deliveryQuote();
    const totalAmount = subtotal + quote.fee;

    let session = {};
    try { session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}; } catch (e) { session = {}; }
    const accountType = session.accountType === 'Retailer'
        ? 'Retailer'
        : 'Regular Customer';
    const accountName = (session.userName || fields.fullName || '').trim();
    const accountArea = (accountType === 'Regular Customer')
        ? fields.address
        : (session.accountArea || fields.address);

    const order = {
        orderNumber: orderNumber,
        items: cartData,
        subtotal: subtotal,
        deliveryFee: quote.fee,
        deliveryRegion: quote.region ? JT_REGION_LABEL[quote.region] : '',
        parcelWeightKg: quote.weightKg,
        courier: 'J&T Express',
        totalAmount: totalAmount,
        total: formatCurrency(totalAmount),
        paymentMethod: payingWithPaymongo ? 'paymongo' : 'cash_on_delivery',
        gcashReference: '',
        gcashPaidTo: '',
        gcashWebpay: null,
        paymongo: pendingQr
            ? { paymentIntentId: pendingQr.paymentIntentId, wallet: pendingQr.wallet || 'qrph', status: 'awaiting_payment', qrImage: pendingQr.qrImage || '' }
            : (payingWithPaymongo ? paymongoPayment : null),
        paymentStatus: pendingQr ? 'awaiting_payment' : (payingWithPaymongo ? 'paid' : 'pending'),
        receiptNumber: '',
        accountType: accountType,
        accountName: accountName,
        accountArea: accountArea,
        customerId: session.customerId || '',
        customerEmail: session.email || '',
        shippingInfo: {
            fullName: accountName || fields.fullName,
            phone: fields.phone,
            address: fields.address,
            notes: fields.notes
        },
        status: pendingQr ? 'Awaiting payment' : 'Processing',
        date: new Date().toISOString(),
        paymentVerified: payingWithPaymongo && !pendingQr,
        inventoryDeducted: false
    };

    order.poCode = order.orderNumber;
    saveCustomerPurchaseOrder(order);

    syncProfileShippingInfo(fields.fullName, fields.phone, fields.address);

    const orders = parseStoredJson('kreezbyOrders', []);
    orders.push(order);

    const receipt = buildReceipt(order);
    order.receiptNumber = receipt.receiptNumber;
    saveReceiptCopies(receipt);

    localStorage.setItem('kreezbyOrders', JSON.stringify(orders));

    // Stock is taken out only once the order is paid (or for cash on delivery right away).
    if (!pendingQr) deductOrderStock(order, orders);

    try {
        const note = {
            id: 'n-order-' + orderNumber,
            title: 'Customer Order Placed',
            description: pendingQr
                ? ('New QR Ph order ' + orderNumber + ' from ' + fields.fullName + ' is awaiting payment.')
                : payingWithPaymongo
                ? ('New QR Ph order ' + orderNumber + ' from ' + fields.fullName + '. Payment intent ' + paymongoPayment.paymentIntentId + ' succeeded.')
                : ('New cash on delivery order ' + orderNumber + ' from ' + fields.fullName + ' is waiting for payment verification.'),
            timestamp: new Date().toISOString(),
            read: false,
            source: 'order'
        };
        const notes = parseStoredJson('kreezbyNotifications', []);
        notes.unshift(note);
        localStorage.setItem('kreezbyNotifications', JSON.stringify(notes));
        const cursor = parseStoredJson('kreezbyNotificationCursor', { initialized: true, orders: {} });
        cursor.orders = cursor.orders || {};
        cursor.orders[orderNumber] = true;
        cursor.initialized = true;
        localStorage.setItem('kreezbyNotificationCursor', JSON.stringify(cursor));
    } catch (e) {}

    var serverSave = saveOrderToServer(order, receipt);

    localStorage.removeItem('kreezbyCart');
    cartData = {};

    if (pendingQr) {
        // Stay on the page: the customer still needs the QR to pay.
        try { renderOrderSummary(); updateActionButtons(); } catch (e) { /* summary refresh is optional */ }
        return order;
    }

    try { sessionStorage.removeItem(PAYMONGO_DRAFT_KEY); } catch (error) {}

    openReceiptWindow(receipt, 'Customer Copy');

    showCheckoutDialog(
        payingWithPaymongo
            ? 'Your payment went through. Keep this receipt for the order.'
            : 'Cash on delivery is waiting for Kreezby to verify after the cash is collected.',
        {
            type: 'success',
            title: 'Order Confirmed',
            buttonText: 'Go To Shop',
            details: [
                { label: 'Order number', value: orderNumber },
                { label: 'Payment', value: payingWithPaymongo ? 'QR Ph' : 'Cash on delivery' },
                payingWithPaymongo ? { label: 'Payment intent', value: paymongoPayment.paymentIntentId, mono: true } : null,
                { label: 'Receipt', value: order.receiptNumber },
                { label: 'Total', value: order.total, emphasis: true }
            ]
        }
    ).then(function () {
        localStorage.setItem('kreezbyOpenOrdersAfterCheckout', '1');
        localStorage.setItem('kreezbyLatestOrderNumber', orderNumber);
        // Leave only once the order is stored on the server (or after the 8 s limit).
        return serverSave.then(function () { window.location.href = 'customer.html'; });
    });
}

function deductOrderStock(order, orders) {
    if (order.inventoryDeducted) return;
    if (window.KreezbyDictionary && typeof KreezbyDictionary.recordSale === 'function') {
        var stockPosted = true;
        Object.keys(order.items || {}).forEach(function (key) {
            var item = order.items[key];
            if (!item || !item.name) return;
            var known = typeof KreezbyDictionary.productId === 'function' && KreezbyDictionary.productId(item.name);
            if (!known) {
                stockPosted = false;
                return;
            }
            if (KreezbyDictionary.recordSale(item.name, item.qty, String(order.date || '').slice(0, 10)) == null) stockPosted = false;
        });
        if (stockPosted) {
            order.inventoryDeducted = true;
            orders.forEach(function (row) {
                if (row && row.orderNumber === order.orderNumber) row.inventoryDeducted = true;
            });
            localStorage.setItem('kreezbyOrders', JSON.stringify(orders));
            var postedOrders = parseStoredJson('kreezby-po-orders-v1', {});
            if (postedOrders && postedOrders[order.orderNumber]) {
                postedOrders[order.orderNumber].inventoryDeducted = true;
                localStorage.setItem('kreezby-po-orders-v1', JSON.stringify(postedOrders));
            }
        }
    }
}
