/**
 * Kreezby Alert — vanilla port of shadcn Alert component.
 */
(function () {
    'use strict';

    if (window.KreezbyAlertLoaded) return;
    window.KreezbyAlertLoaded = true;

    var ICONS = {
        info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
        warning: '<svg viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        success: '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
        destructive: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
        primary: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
        secondary: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>'
    };

    var CLOSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

    function moduleRelativeRoot() {
        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'admin_names', 'staff_names', 'retailer', 'customer', 'wholesaler', 'auth', 'head_admin', 'it_kreezby'];
        var rootIdx = -1;
        for (var i = parts.length - 1; i >= 0; i--) {
            if (roots.indexOf(parts[i].toLowerCase()) >= 0) {
                rootIdx = i;
                break;
            }
        }
        if (rootIdx < 0) return '';

        var depth = parts.length - rootIdx - 1;
        var prefix = '';
        for (var d = 0; d <= depth; d++) prefix += '../';
        return prefix;
    }

    function ensureCss() {
        if (document.getElementById('kreezby-alert-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-alert-style';
        link.rel = 'stylesheet';
        link.href = moduleRelativeRoot() + 'css/shared/kreezby-alert.css';
        document.head.appendChild(link);
    }

    function variantClasses(opts) {
        var variant = opts.variant || 'secondary';
        var appearance = opts.appearance || 'light';
        var size = opts.size || 'md';
        var classes = [
            'kreezby-alert',
            'kreezby-alert--' + variant,
            'kreezby-alert--' + appearance,
            'kreezby-alert--' + size
        ];
        if (opts.inline) classes.push('kreezby-alert--inline');
        if (opts.className) classes.push(opts.className);
        return classes.join(' ');
    }

    function iconForVariant(variant) {
        return ICONS[variant] || ICONS.info;
    }

    function buildAlertHtml(opts) {
        var id = opts.id || ('kreezby-alert-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
        var showIcon = opts.icon !== false && !opts.inline;
        var html = '<div role="alert" class="' + variantClasses(opts) + '" id="' + id + '" data-kreezby-alert>';

        if (showIcon) {
            html += '<div class="kreezby-alert__icon" data-slot="alert-icon" aria-hidden="true">' + iconForVariant(opts.variant) + '</div>';
        }

        html += '<div class="kreezby-alert__content" data-slot="alert-content">';
        if (opts.title) {
            html += '<div class="kreezby-alert__title" data-slot="alert-title">' + opts.title + '</div>';
        }
        if (opts.description) {
            html += '<div class="kreezby-alert__description" data-slot="alert-description">' + opts.description + '</div>';
        }
        html += '</div>';

        if (opts.close) {
            html += '<button type="button" class="kreezby-alert__close" data-kreezby-alert-dismiss aria-label="Dismiss">' + CLOSE_SVG + '</button>';
        }

        html += '</div>';
        return { id: id, html: html };
    }

    function dismissAlert(el) {
        if (!el) return;
        el.classList.add('is-dismissed');
        el.dispatchEvent(new CustomEvent('kreezby-alert-dismissed', { bubbles: true }));
    }

    function wireDismiss(root) {
        (root || document).querySelectorAll('[data-kreezby-alert-dismiss]').forEach(function (btn) {
            if (btn.dataset.kreezbyAlertBound === '1') return;
            btn.dataset.kreezbyAlertBound = '1';
            btn.addEventListener('click', function () {
                var alert = btn.closest('[data-kreezby-alert]');
                dismissAlert(alert);
            });
        });
    }

    function ensureToastRegion() {
        var region = document.getElementById('kreezby-alert-toast-region');
        if (region) return region;
        region = document.createElement('div');
        region.id = 'kreezby-alert-toast-region';
        region.className = 'kreezby-alert-toast-region';
        region.setAttribute('aria-live', 'polite');
        document.body.appendChild(region);
        return region;
    }

    function show(opts) {
        ensureCss();
        opts = opts || {};
        var built = buildAlertHtml(opts);
        var container;

        if (opts.target) {
            container = typeof opts.target === 'string' ? document.querySelector(opts.target) : opts.target;
        } else if (opts.toast) {
            container = ensureToastRegion();
        } else {
            container = ensureToastRegion();
        }

        if (!container) return null;

        var wrap = document.createElement('div');
        wrap.innerHTML = built.html;
        var el = wrap.firstElementChild;
        container.appendChild(el);
        wireDismiss(el);

        if (opts.autoDismissMs) {
            setTimeout(function () { dismissAlert(el); }, opts.autoDismissMs);
        }

        return el;
    }

    function mountStaticAlerts() {
        document.querySelectorAll('[data-kreezby-alert-static]').forEach(function (node) {
            if (node.dataset.kreezbyAlertMounted === '1') return;
            node.dataset.kreezbyAlertMounted = '1';
            wireDismiss(node);
        });
    }

    function mapSeverityToVariant(severity) {
        var s = (severity || '').toLowerCase();
        if (s.indexOf('crit') >= 0 || s.indexOf('danger') >= 0 || s.indexOf('error') >= 0) return 'destructive';
        if (s.indexOf('warn') >= 0) return 'warning';
        if (s.indexOf('success') >= 0) return 'success';
        if (s.indexOf('info') >= 0) return 'info';
        return 'secondary';
    }

    window.KreezbyAlert = {
        show: show,
        dismiss: dismissAlert,
        build: buildAlertHtml,
        mapSeverity: mapSeverityToVariant,
        icons: ICONS
    };

    function init() {
        ensureCss();
        wireDismiss(document);
        mountStaticAlerts();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
