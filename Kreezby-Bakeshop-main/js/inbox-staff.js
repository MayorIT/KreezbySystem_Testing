/**
 * Staff inbox — enforce retailer chat permission from admin settings.
 */
(function () {
    'use strict';

    var canRetailer = false;
    var activeChannel = 'staff';

    function permissionsApi() {
        return window.KreezbyStaffPermissions;
    }

    function getThreadChannel(card) {
        return card.getAttribute('data-channel') || 'internal';
    }

    function isRetailerChannel(channel) {
        return channel === 'retailer';
    }

    function applyComposerState() {
        var footer = document.querySelector('.chat-composition-footer-bar');
        var input = document.getElementById('chat-type-input');
        var attachBtn = document.querySelector('.btn-attachment-trigger');
        var banner = document.getElementById('inbox-retailer-access-banner');
        var readOnly = isRetailerChannel(activeChannel) && !canRetailer;

        if (banner) {
            banner.style.display = readOnly ? 'block' : 'none';
            banner.textContent = 'Retailer chat access is disabled for your account. You can view internal conversations only.';
        }
        if (input) {
            input.disabled = readOnly;
            input.placeholder = readOnly
                ? 'Retailer replies are disabled for your account. Contact your administrator.'
                : 'Type a message';
        }
        if (attachBtn) attachBtn.disabled = readOnly;
        if (footer) footer.classList.toggle('composer-readonly', readOnly);
    }

    function selectThread(card) {
        if (!card) return;
        activeChannel = getThreadChannel(card);
        applyComposerState();
    }

    function applyThreadVisibility() {
        var cards = document.querySelectorAll('.inbox-contact-item, .thread-item-card');
        var visibleCount = 0;
        var mount = document.querySelector('[data-inbox-role="staff"]');

        cards.forEach(function (card) {
            var channel = getThreadChannel(card);
            var hide = isRetailerChannel(channel) && !canRetailer;
            card.style.display = hide ? 'none' : '';
            if (!hide) visibleCount += 1;
        });

        var selected = document.querySelector('.inbox-contact-item.is-active, .thread-item-card.selected-active');
        if (!selected || selected.style.display === 'none') {
            var fallback = null;
            cards.forEach(function (card) {
                if (!fallback && card.style.display !== 'none') fallback = card;
            });
            if (fallback && mount && mount.kreezbyInboxApi) {
                mount.kreezbyInboxApi.selectContact(fallback.getAttribute('data-thread-id'));
                selectThread(fallback);
            } else if (mount && mount.kreezbyInboxApi && typeof mount.kreezbyInboxApi.clearActive === 'function') {
                mount.kreezbyInboxApi.clearActive();
                activeChannel = 'staff';
                applyComposerState();
            } else {
                selectThread(fallback);
            }
        }

        var empty = document.getElementById('inbox-threads-empty');
        if (empty) {
            empty.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    function bindThreadClicks() {
        var list = document.getElementById('inbox-contact-list');
        if (!list || list.dataset.staffBound === '1') return;
        list.dataset.staffBound = '1';
        list.addEventListener('click', function (event) {
            var card = event.target.closest('.inbox-contact-item, .thread-item-card');
            if (card) selectThread(card);
        });
    }

    function init() {
        var api = permissionsApi();
        if (!api) return;

        canRetailer = api.staffCanAccessRetailerInbox();
        bindThreadClicks();
        applyThreadVisibility();

        var selected = document.querySelector('.inbox-contact-item.is-active, .thread-item-card.selected-active');
        selectThread(selected);
    }

    window.KreezbyStaffInbox = {
        init: init,
        canAccessRetailerInbox: function () { return canRetailer; },
        onThreadSelected: function (contact) {
            if (contact && contact.channel) {
                activeChannel = contact.channel;
            }
            applyComposerState();
        }
    };

    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(init, 0);
    });
})();
