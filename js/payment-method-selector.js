/**
 * PaymentMethodSelector — vanilla port of PaymentMethodSelector (framer-motion / shadcn).
 */
(function () {
    'use strict';

    if (window.KreezbyPaymentMethodSelectorLoaded) return;
    window.KreezbyPaymentMethodSelectorLoaded = true;

    function selectItem(root, item, opts) {
        opts = opts || {};
        var id = item.getAttribute('data-payment-id');
        root.querySelectorAll('[data-payment-id]').forEach(function (el) {
            var active = el === item;
            el.classList.toggle('is-selected', active);
            el.setAttribute('aria-checked', active ? 'true' : 'false');
            el.setAttribute('tabindex', active ? '0' : '-1');
        });
        root.dataset.selectedId = id;
        if (!opts.silent) {
            root.dispatchEvent(new CustomEvent('paymentchange', {
                bubbles: true,
                detail: { id: id }
            }));
        }
    }

    function focusSibling(items, currentIndex, step) {
        if (!items.length) return;
        var nextIndex = currentIndex + step;
        if (nextIndex < 0) nextIndex = items.length - 1;
        if (nextIndex >= items.length) nextIndex = 0;
        items[nextIndex].focus();
        selectItem(items[nextIndex].closest('[data-payment-selector]'), items[nextIndex]);
    }

    function bindItem(root, item) {
        item.setAttribute('role', 'radio');

        item.addEventListener('click', function () {
            selectItem(root, item);
        });

        item.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                selectItem(root, item);
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                var items = Array.prototype.slice.call(root.querySelectorAll('[data-payment-id]'));
                var currentIndex = items.indexOf(item);
                var step = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
                focusSibling(items, currentIndex, step);
            }
        });
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function addMethod(root, options) {
        if (!root || !options || !options.id || !options.name) return null;

        if (root.querySelector('[data-payment-id="' + options.id + '"]')) {
            return root.querySelector('[data-payment-id="' + options.id + '"]');
        }

        var list = root.querySelector('.payment-method-selector__list');
        if (!list) return null;

        var iconSvg = options.iconSvg || '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="#455a64"/><path d="M3 10h18" stroke="#ffffff" stroke-width="1.5"/></svg>';
        var description = options.description || ('Pay with ' + options.name);

        var item = document.createElement('div');
        item.className = 'payment-method-selector__item';
        item.setAttribute('data-payment-id', options.id);
        item.setAttribute('tabindex', '-1');
        item.setAttribute('aria-checked', 'false');
        item.innerHTML =
            '<div class="payment-method-selector__icon" aria-hidden="true">' + iconSvg + '</div>' +
            '<div class="payment-method-selector__body">' +
                '<p class="payment-method-selector__label">' + escapeHtml(options.name) + '</p>' +
                '<p class="payment-method-selector__desc">' + escapeHtml(description) + '</p>' +
            '</div>' +
            '<div class="payment-method-selector__radio" aria-hidden="true"><span class="payment-method-selector__dot"></span></div>';

        list.appendChild(item);
        bindItem(root, item);
        return item;
    }

    function initRoot(root) {
        if (root.dataset.pmsBound === '1') return;
        root.dataset.pmsBound = '1';

        var items = root.querySelectorAll('[data-payment-id]');
        if (!items.length) return;

        var defaultId = root.getAttribute('data-default-id');
        var initial = defaultId;
        if (!initial || !root.querySelector('[data-payment-id="' + defaultId + '"]')) {
            initial = items[0].getAttribute('data-payment-id');
        }

        items.forEach(function (item) {
            bindItem(root, item);
        });

        var addBtn = root.querySelector('[data-payment-add]');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                var evt = new CustomEvent('paymentaddrequest', {
                    bubbles: true,
                    cancelable: true,
                    detail: { root: root }
                });
                var handled = root.dispatchEvent(evt);
                if (handled && !evt.defaultPrevented) {
                    if (typeof window.toast === 'function') {
                        window.toast('Enter payment details to add a new method.', 'info');
                    } else {
                        alert('Enter payment details to add a new method.');
                    }
                }
            });
        }

        var initialItem = root.querySelector('[data-payment-id="' + initial + '"]');
        if (initialItem) selectItem(root, initialItem, { silent: true });
    }

    function init() {
        document.querySelectorAll('[data-payment-selector]').forEach(initRoot);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.KreezbyPaymentMethodSelector = {
        init: init,
        initRoot: initRoot,
        addMethod: addMethod,
        selectItem: selectItem
    };
})();
