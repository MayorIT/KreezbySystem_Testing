let selectedPaymentMethod = 'paymongo';
let cartData = {};
let isPaymentVerified = false;
let gcashWebpay = null;
let paymongoPayment = null;
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
    const okBtn = overlay.querySelector('#checkout-alert-ok-btn');

    dialog.classList.remove('is-warning', 'is-success', 'is-info');
    dialog.classList.add('is-' + type);
    iconEl.textContent = iconMap[type] || '!';
    titleEl.textContent = title;
    messageEl.textContent = message || '';
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
        paymongo: 'PayMongo',
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
        name: item.name,
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
        paymentStatus: order.paymentStatus === 'paid' ? 'Paid' : (order.paymentVerified ? 'Verified' : 'Awaiting verification'),
        gcashWebpay: order.gcashWebpay || null,
        paymongoPaymentIntentId: order.paymongo && order.paymongo.paymentIntentId ? order.paymongo.paymentIntentId : '',
        subtotal: Number(order.subtotal) || 0,
        deliveryFee: Number(order.deliveryFee) || 0,
        total: Number(order.subtotal || 0) + Number(order.deliveryFee || 0),
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
    const deliveryFee = Number(receipt.deliveryFee) || 0;
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
        ${receipt.paymongoPaymentIntentId ? '<div><span>PayMongo:</span> <strong>' + escapeHtml(receipt.paymongoPaymentIntentId) + '</strong></div>' : (receipt.gcashWebpay && receipt.gcashWebpay.webpayReferenceNumber ? '<div><span>Webpay ref:</span> <strong>' + escapeHtml(receipt.gcashWebpay.webpayReferenceNumber) + '</strong></div>' : (receipt.gcashReference ? '<div><span>GCash ref:</span> <strong>' + escapeHtml(receipt.gcashReference) + '</strong></div>' : ''))}
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
            <tr><td colspan="3" class="num">Delivery Fee</td><td class="num">${formatCurrency(deliveryFee)}</td></tr>
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

function normalizeCartData(rawCart) {
    if (!rawCart || typeof rawCart !== 'object') return {};
    const safeCart = {};

    Object.keys(rawCart).forEach((key) => {
        const item = rawCart[key];
        if (!item) return;
        const cost = Number(item.cost);
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
        placeOrderBtn.textContent = isPaymongoCheckout() && !paymongoReady ? 'Pay with PayMongo first' : 'Place Order';
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

function resetVerification() {
    isPaymentVerified = false;
    gcashWebpay = null;
    paymongoPayment = null;
    stopPaymongoPoll();
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
        return { qty: qty, unit: 'pcs', name: item.name || 'Crinkles', note: '', cost: cost, total: qty * cost };
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
            ? ('PayMongo paid. Payment intent ' + ((order.paymongo && order.paymongo.paymentIntentId) || '') + '.')
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
        inventoryDeducted: order.paymentMethod === 'gcash' || order.paymentMethod === 'paymongo',
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
    if (paymongoBtn) paymongoBtn.addEventListener('click', startPaymongo);
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
            label: `${item.name} (x${item.qty})`,
            value: formatCurrency(lineTotal),
            valueClassName: 'payment-summary__value--muted'
        };
    });

    const deliveryFee = subtotal > 0 ? 50.00 : 0;
    const total = subtotal + deliveryFee;

    lineItems.push(
        { label: 'Subtotal', value: formatCurrency(subtotal) },
        { label: 'Delivery Fee', value: formatCurrency(deliveryFee) }
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
    return subtotal + (subtotal > 0 ? 50 : 0);
}

function selectedPaymongoWallet() {
    const picked = document.querySelector('input[name="paymongo-wallet"]:checked');
    return picked && picked.value === 'paymaya' ? 'paymaya' : 'gcash';
}

function showPaymongoQr(image) {
    const qr = document.getElementById('paymongo-qr');
    if (!qr || !String(image || '').startsWith('data:image/')) return false;
    qr.src = image;
    qr.hidden = false;
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
    const wallet = document.querySelector('input[name="paymongo-wallet"][value="' + (draft.wallet || 'gcash') + '"]');
    if (wallet) wallet.checked = true;
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
        showCheckoutDialog('Enter an email address so PayMongo can send the receipt.', {
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
                setPaymongoStatus('Payment successful. PayMongo reference ' + data.paymentIntentId + '.');
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
            setPaymongoStatus('Scan the QR code. It opens the PayMongo payment link. This page checks every 5 seconds.');
            if (ticks > 36) {
                stopPaymongoPoll();
                setPaymongoStatus('The QR code is still waiting. Show it again if you need a new one.');
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

async function startPaymongo() {
    if (!hasCartItems()) {
        showCheckoutDialog('Your cart is empty. Add items before paying with PayMongo.', { type: 'warning', title: 'Cart Empty' });
        return;
    }
    const fields = shippingFields();
    if (!validCheckoutContact(fields)) return;
    const amount = checkoutTotalAmount();
    const wallet = selectedPaymongoWallet();
    const button = document.getElementById('paymongo-pay-btn');
    if (button) button.disabled = true;
    setPaymongoStatus('Creating the QR code…');
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
        if (!showPaymongoQr(data.qrImage)) {
            setPaymongoStatus('PayMongo did not return a QR code.');
            return;
        }
        showedQr = true;
        if (button) {
            button.disabled = true;
            button.textContent = 'QR code ready';
        }
        writePaymongoDraft(Object.assign({}, fields, {
            wallet,
            paymentIntentId: data.paymentIntentId,
            placed: false
        }));
        watchPaymongo(data.paymentIntentId, function () {
            const current = readPaymongoDraft() || {};
            if (current.placed) return;
            current.placed = true;
            writePaymongoDraft(current);
            placeOrder();
        });
    } catch (error) {
        setPaymongoStatus('The shop server is not running. Start it, then try PayMongo again.');
    } finally {
        if (button && !showedQr) button.disabled = false;
    }
}

function resumePaymongoReturn() {
    if (!/[?&]paymongo=return(?:&|$)/.test(window.location.search)) return;
    const draft = readPaymongoDraft();
    if (!draft || !draft.paymentIntentId || draft.placed) return;
    restoreShippingFields(draft);
    selectPayment('paymongo');
    setPaymongoStatus('Checking PayMongo…');
    watchPaymongo(draft.paymentIntentId, function () {
        const current = readPaymongoDraft() || draft;
        if (current.placed) return;
        current.placed = true;
        writePaymongoDraft(current);
        placeOrder();
    });
}

function placeOrder() {
    if (!hasCartItems()) {
        showCheckoutDialog('Your cart is empty. Add products before placing an order.', { type: 'warning', title: 'Cart Empty' });
        return;
    }

    const payingWithPaymongo = isPaymongoCheckout();
    const fields = shippingFields();
    if (!validCheckoutContact(fields)) return;
    if (payingWithPaymongo && !paymongoSucceeded()) {
        showCheckoutDialog('Pay with PayMongo before placing the order.', { type: 'warning', title: 'Payment Needed' });
        return;
    }

    orderNumber = 'ORD-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const subtotal = Object.values(cartData).reduce((sum, item) => sum + item.cost * item.qty, 0);
    const deliveryFee = subtotal > 0 ? 50 : 0;
    const totalAmount = subtotal + deliveryFee;

    let session = {};
    try { session = JSON.parse(localStorage.getItem('kreezby_session') || '{}') || {}; } catch (e) { session = {}; }
    const accountType = session.accountType === 'Retailer'
        ? 'Retailer'
        : 'Regular Customer';
    const accountName = (session.userName || fields.fullName || '').trim();
    const accountArea = (accountType === 'Regular Customer')
        ? fields.address
        : (session.accountArea || fields.address);
    const walletLabel = paymongoPayment && paymongoPayment.wallet === 'paymaya' ? 'Maya' : 'GCash';

    const order = {
        orderNumber: orderNumber,
        items: cartData,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: formatCurrency(totalAmount),
        paymentMethod: payingWithPaymongo ? 'paymongo' : 'cash_on_delivery',
        gcashReference: '',
        gcashPaidTo: '',
        gcashWebpay: null,
        paymongo: payingWithPaymongo ? paymongoPayment : null,
        paymentStatus: payingWithPaymongo ? 'paid' : 'pending',
        receiptNumber: '',
        accountType: accountType,
        accountName: accountName,
        accountArea: accountArea,
        shippingInfo: {
            fullName: accountName || fields.fullName,
            phone: fields.phone,
            address: fields.address,
            notes: fields.notes
        },
        status: 'Processing',
        date: new Date().toISOString(),
        paymentVerified: payingWithPaymongo,
        inventoryDeducted: payingWithPaymongo
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

    if (window.KreezbyDictionary && typeof KreezbyDictionary.recordSale === 'function') {
        Object.keys(cartData).forEach(function (key) {
            var item = cartData[key];
            if (!item || !item.name) return;
            KreezbyDictionary.recordSale(item.name, item.qty, String(order.date || '').slice(0, 10));
        });
    }

    try {
        const note = {
            id: 'n-order-' + orderNumber,
            title: 'Customer Order Placed',
            description: payingWithPaymongo
                ? ('New PayMongo order ' + orderNumber + ' from ' + fields.fullName + '. ' + walletLabel + ' payment intent ' + paymongoPayment.paymentIntentId + ' succeeded.')
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

    localStorage.removeItem('kreezbyCart');
    cartData = {};
    try { sessionStorage.removeItem(PAYMONGO_DRAFT_KEY); } catch (error) {}

    openReceiptWindow(receipt, 'Customer Copy');

    showCheckoutDialog(
        payingWithPaymongo
            ? `Order placed. Order Number: ${orderNumber}. PayMongo ${walletLabel} payment succeeded. Payment intent ${paymongoPayment.paymentIntentId}. Receipt Number: ${order.receiptNumber}. Total: ${order.total}.`
            : `Order placed. Order Number: ${orderNumber}. Cash on delivery is waiting for Kreezby to verify after the cash is collected. Receipt Number: ${order.receiptNumber}. Total: ${order.total}.`,
        { type: 'success', title: 'Order Confirmed', buttonText: 'Go To Shop' }
    ).then(function () {
        localStorage.setItem('kreezbyOpenOrdersAfterCheckout', '1');
        localStorage.setItem('kreezbyLatestOrderNumber', orderNumber);
        window.location.href = 'customer.html';
    });
}