/**
 * PaymentSummary — vanilla port of PaymentSummary (framer-motion / shadcn).
 */
(function () {
    'use strict';

    if (window.KreezbyPaymentSummaryLoaded) return;
    window.KreezbyPaymentSummaryLoaded = true;

    var PAYMENT_META = {
        gcash: {
            name: 'GCash',
            icon: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" fill="#007dfe"/><path d="M9 18h6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>'
        },
        paymongo: {
            name: 'PayMongo',
            icon: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="#00a3a1"/><path d="M7 12h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>'
        },
        cash_on_delivery: {
            name: 'Cash on delivery',
            icon: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" fill="#5d4037"/><path d="M7 12h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>'
        },
        mayabank: {
            name: 'MayaBank',
            icon: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="#00b14f"/><path d="M7 12h10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>'
        },
        metrobank: {
            name: 'Metrobank',
            icon: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="#004c97"/><path d="M7 15V9h10v6" stroke="#fff" stroke-width="1.5" fill="none"/></svg>'
        }
    };

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderRow(label, value, valueClassName) {
        var valueClass = 'payment-summary__value' + (valueClassName ? ' ' + valueClassName : '');
        return (
            '<div class="payment-summary__row">' +
                '<span class="payment-summary__label">' + escapeHtml(label) + '</span>' +
                '<span class="' + valueClass + '">' + value + '</span>' +
            '</div>'
        );
    }

    function titleFromId(value) {
        if (!value) return 'Not selected';
        return String(value)
            .replace(/[_-]+/g, ' ')
            .trim()
            .replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
    }

    function registerPaymentMethod(id, meta) {
        if (!id || !meta || !meta.name) return;
        PAYMENT_META[id] = {
            name: meta.name,
            icon: meta.icon || ''
        };
    }

    function updatePaymentMethod(root, methodId) {
        var iconEl = root.querySelector('[data-ps-payment-icon]');
        var nameEl = root.querySelector('[data-ps-payment-name]');
        var meta = PAYMENT_META[methodId] || { name: titleFromId(methodId), icon: '' };

        if (iconEl) iconEl.innerHTML = meta.icon;
        if (nameEl) nameEl.textContent = meta.name;
        root.dataset.paymentMethod = methodId || '';
    }

    function render(root, options) {
        if (!root) return;

        options = options || {};
        var titleEl = root.querySelector('[data-ps-title]');
        if (titleEl && options.title) titleEl.textContent = options.title;

        if (options.paymentMethod) {
            updatePaymentMethod(root, options.paymentMethod);
        }

        var itemsHost = root.querySelector('[data-ps-items]');
        if (itemsHost && Array.isArray(options.items)) {
            if (!options.items.length) {
                itemsHost.innerHTML = '<p class="payment-summary__empty">Your cart is empty. <a href="customer.html">Go back to shop</a></p>';
            } else {
                itemsHost.innerHTML = '<div class="payment-summary__items">' + options.items.map(function (item) {
                    return renderRow(item.label, item.value, item.valueClassName);
                }).join('') + '</div>';
            }
        }

        var totalLabel = root.querySelector('[data-ps-total-label]');
        var totalValue = root.querySelector('[data-ps-total-value]');
        if (options.total) {
            if (totalLabel) totalLabel.textContent = options.total.label || 'Total';
            if (totalValue) totalValue.textContent = options.total.value || '₱0.00';
        }
    }

    window.KreezbyPaymentSummary = {
        render: render,
        updatePaymentMethod: updatePaymentMethod,
        registerPaymentMethod: registerPaymentMethod,
        PAYMENT_META: PAYMENT_META
    };
})();
