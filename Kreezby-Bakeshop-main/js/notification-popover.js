/**
 * Dark glass notification popover — event-driven (notification-store).
 */
(function () {
    'use strict';

    if (window.KreezbyNotificationPopoverLoaded) return;
    window.KreezbyNotificationPopoverLoaded = true;

    var BELL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

    function moduleRelativeRoot() {
        var scripts = document.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            var src = scripts[i].getAttribute('src') || '';
            if (src.indexOf('notification-popover.js') !== -1) {
                return src.replace(/js\/notification-popover\.js(?:\?.*)?$/, '');
            }
        }

        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'admin_names', 'staff_names', 'retailer', 'customer', 'wholesaler', 'auth', 'head_admin', 'it_kreezby'];
        var rootIdx = -1;
        for (var j = parts.length - 1; j >= 0; j--) {
            if (roots.indexOf(parts[j].toLowerCase()) >= 0) {
                rootIdx = j;
                break;
            }
        }
        if (rootIdx < 0) return '../';

        var depth = parts.length - rootIdx - 1;
        var prefix = '';
        for (var d = 0; d <= depth; d++) prefix += '../';
        return prefix;
    }

    function ensureCss() {
        if (document.getElementById('kreezby-notification-popover-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-notification-popover-style';
        link.rel = 'stylesheet';
        link.href = moduleRelativeRoot() + 'css/shared/notification-popover.css?v=20260927bell';
        document.head.appendChild(link);
    }

    function ensureStoreJs(callback) {
        if (window.KreezbyNotifications) {
            callback();
            return;
        }
        var existing = document.getElementById('kreezby-notification-store-script');
        if (existing) {
            existing.addEventListener('load', callback, { once: true });
            return;
        }
        var script = document.createElement('script');
        script.id = 'kreezby-notification-store-script';
        script.src = moduleRelativeRoot() + 'js/notification-store.js';
        script.onload = callback;
        document.head.appendChild(script);
    }

    function formatTimestamp(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) return '';
        try {
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return date.toDateString();
        }
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function loadNotifications() {
        if (!window.KreezbyNotifications) return [];
        return window.KreezbyNotifications.getAll();
    }

    function NotificationPopoverInstance(root) {
        this.root = root;
        this.notifications = loadNotifications();
        this.isOpen = false;
        this.render();
        this.bind();
        this.updateVisibility();
    }

    NotificationPopoverInstance.prototype.render = function () {
        this.root.innerHTML =
            '<button type="button" class="notification-popover-btn" aria-label="Notifications" aria-expanded="false" hidden>' +
                BELL_SVG +
            '</button>' +
            '<div class="notification-popover-panel" role="dialog" aria-label="Notifications">' +
                '<div class="notification-popover-header">' +
                    '<h3>Notifications</h3>' +
                    '<button type="button" class="notification-popover-mark-all">Mark all as read</button>' +
                '</div>' +
                '<div class="notification-popover-list"></div>' +
            '</div>';

        this.btn = this.root.querySelector('.notification-popover-btn');
        this.panel = this.root.querySelector('.notification-popover-panel');
        this.list = this.root.querySelector('.notification-popover-list');
        this.markAllBtn = this.root.querySelector('.notification-popover-mark-all');
        this.renderList();
        this._lastUnread = window.KreezbyNotifications ? window.KreezbyNotifications.getUnreadCount() : 0;
    };

    NotificationPopoverInstance.prototype.updateVisibility = function () {
        if (this.btn) this.btn.hidden = false;
        if (this.root) this.root.style.display = '';
    };

    NotificationPopoverInstance.prototype.renderList = function () {
        var self = this;

        if (!this.notifications.length) {
            this.list.innerHTML = '<div class="notification-popover-empty">No new activity</div>';
            this.updateBadge();
            return;
        }

        this.list.innerHTML = this.notifications.map(function (n) {
            return (
                '<button type="button" class="notification-popover-item' + (n.read ? ' is-read' : '') + '" data-id="' + escapeHtml(n.id) + '">' +
                    '<div class="notification-popover-item-top">' +
                        '<div class="notification-popover-item-title">' +
                            '<span class="notification-popover-dot" aria-hidden="true"></span>' +
                            '<span>' + escapeHtml(n.title) + '</span>' +
                        '</div>' +
                        '<span class="notification-popover-item-time">' + escapeHtml(formatTimestamp(n.timestamp)) + '</span>' +
                    '</div>' +
                    '<div class="notification-popover-item-desc">' + escapeHtml(n.description) + '</div>' +
                '</button>'
            );
        }).join('');

        this.list.querySelectorAll('.notification-popover-item').forEach(function (item) {
            item.addEventListener('click', function () {
                self.markAsRead(item.getAttribute('data-id'));
            });
        });

        this.updateBadge();
    };

    NotificationPopoverInstance.prototype.updateBadge = function () {
        var unread = this.notifications.filter(function (n) { return !n.read; }).length;
        var badge = this.root.querySelector('.notification-popover-badge');
        if (unread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-popover-badge';
                this.btn.appendChild(badge);
            }
            badge.textContent = String(unread);
        } else if (badge) {
            badge.remove();
        }
    };

    NotificationPopoverInstance.prototype.refresh = function () {
        this.notifications = loadNotifications();
        this.renderList();
        this.updateVisibility();
    };

    NotificationPopoverInstance.prototype.handleStoreChange = function () {
        var prev = this._lastUnread || 0;
        this.refresh();
        if (!window.KreezbyNotifications) return;
        var unread = window.KreezbyNotifications.getUnreadCount();
        if (unread > prev) this.open();
        this._lastUnread = unread;
    };

    NotificationPopoverInstance.prototype.bind = function () {
        var self = this;

        this.btn.addEventListener('click', function (e) {
            e.stopPropagation();
            self.toggle();
        });

        this.markAllBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            self.markAllAsRead();
        });
    };

    NotificationPopoverInstance.prototype.toggle = function () {
        this.isOpen ? this.close() : this.open();
    };

    NotificationPopoverInstance.prototype.open = function () {
        this.isOpen = true;
        this.panel.classList.add('is-open');
        this.btn.setAttribute('aria-expanded', 'true');
        window.KreezbyNotificationPopoverActive = this;
    };

    NotificationPopoverInstance.prototype.close = function () {
        this.isOpen = false;
        this.panel.classList.remove('is-open');
        this.btn.setAttribute('aria-expanded', 'false');
        if (window.KreezbyNotificationPopoverActive === this) {
            window.KreezbyNotificationPopoverActive = null;
        }
    };

    NotificationPopoverInstance.prototype.markAsRead = function (id) {
        if (window.KreezbyNotifications) window.KreezbyNotifications.markRead(id);
    };

    NotificationPopoverInstance.prototype.markAllAsRead = function () {
        if (window.KreezbyNotifications) window.KreezbyNotifications.markAllRead();
    };

    var instances = [];

    function upgradePill(pill) {
        if (!pill || pill.dataset.popoverUpgraded === '1') return;

        var root = document.createElement('div');
        root.className = 'notification-popover-root';
        pill.parentNode.insertBefore(root, pill);
        pill.remove();

        var instance = new NotificationPopoverInstance(root);
        instances.push(instance);
        root.dataset.popoverUpgraded = '1';
    }

    function hideLegacyModal() {
        document.body.classList.add('kreezby-notification-popover-active');
        var overlay = document.getElementById('notification-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.hidden = true;
        }
    }

    function installGlobalShims() {
        window.openNotificationModal = function () {
            if (instances[0]) instances[0].open();
        };
        window.closeNotificationModal = function () {
            if (instances[0]) instances[0].close();
        };
    }

    function onStoreChange() {
        instances.forEach(function (inst) {
            inst.handleStoreChange();
        });
    }

    function init() {
        ensureCss();
        hideLegacyModal();

        ensureStoreJs(function () {
            if (window.KreezbyNotifications) {
                window.KreezbyNotifications.subscribe(onStoreChange);
            }

            document.querySelectorAll('.notification-pill').forEach(upgradePill);
            document.querySelectorAll('.top-nav-links-right').forEach(function (right) {
                if (!right.querySelector('.notification-popover-root')) return;
                right.querySelectorAll('.notification-pill').forEach(function (extra) { extra.remove(); });
            });

            if (instances.length) {
                installGlobalShims();

                document.addEventListener('click', function (e) {
                    instances.forEach(function (inst) {
                        if (!inst.isOpen) return;
                        if (!inst.root.contains(e.target)) inst.close();
                    });
                });

                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape') {
                        instances.forEach(function (inst) { inst.close(); });
                    }
                });
            }
        });
    }

    window.KreezbyNotificationPopover = { init: init, upgrade: upgradePill };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
