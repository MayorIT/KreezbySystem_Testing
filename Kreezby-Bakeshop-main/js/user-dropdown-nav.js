/**
 * Wires the header user pill (#user-dropdown-trigger / #user-dropdown-menu)
 * used across admin, staff, and retailer module pages.
 */
(function () {
    'use strict';

    function moduleRoot() {
        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'retailer', 'customer', 'wholesaler', 'auth', 'it_kreezby', 'head_admin'];
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

    function jsBase() {
        var root = moduleRoot();
        return root ? root + 'js/' : 'js/';
    }

    function authLoginHref() {
        return moduleRoot() + 'auth/log_in.html';
    }

    function moduleLocalHref(filename) {
        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'retailer', 'customer', 'wholesaler', 'auth', 'it_kreezby', 'head_admin'];
        var rootIdx = -1;
        for (var i = parts.length - 1; i >= 0; i--) {
            if (roots.indexOf(parts[i].toLowerCase()) >= 0) {
                rootIdx = i;
                break;
            }
        }
        if (rootIdx < 0) return filename;

        var withinModule = parts.length - rootIdx - 1;
        var prefix = '';
        for (var d = 0; d < withinModule; d++) prefix += '../';
        return prefix + filename;
    }

    function reportIssueHref() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/staff/') !== -1) return moduleLocalHref('report_issue-staff.html');
        if (path.indexOf('/retailer/') !== -1) return moduleLocalHref('report_issue-retailer.html');
        if (path.indexOf('/customer/') !== -1) return moduleLocalHref('report_issue-customer.html');
        if (path.indexOf('/wholesaler/') !== -1) return moduleRoot() + 'wholesaler/report_issue-wholesaler.html';
        if (path.indexOf('/head_admin/') !== -1) return moduleLocalHref('report_issue-headadmin.html');
        if (path.indexOf('/admin/') !== -1) return moduleLocalHref('report_issue-admin.html');
        return moduleLocalHref('report_issue-admin.html');
    }

    function reportIssueMenuHtml() {
        return '<a href="' + reportIssueHref() + '" class="dropdown-item">Report Issue</a>' +
            '<a href="' + authLoginHref() + '" class="dropdown-item">\u21a9 Log Out</a>';
    }

    function inboxHref() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/staff/') !== -1) {
            var api = window.KreezbyStaffPermissions;
            if (api && typeof api.getInboxHref === 'function') {
                return moduleLocalHref(api.getInboxHref(api.getCurrentStaffId()));
            }
            return moduleLocalHref('inbox-staff.html');
        }
        if (path.indexOf('/retailer/') !== -1) return moduleLocalHref('inbox-retailer.html');
        if (path.indexOf('/customer/') !== -1) return moduleLocalHref('inbox-customer.html');
        if (path.indexOf('/admin/') !== -1) return moduleLocalHref('inbox-admin.html');
        if (path.indexOf('/head_admin/') !== -1) return moduleLocalHref('inbox-headadmin.html');
        return moduleLocalHref('inbox-admin.html');
    }

    function ensurePortalSeedLoaded() {
        if (window.KreezbyPortalSeed) {
            try { window.KreezbyPortalSeed.apply(); } catch (e) { /* ignore */ }
            return;
        }
        if (document.getElementById('kreezby-seed-portal-data-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-seed-portal-data-script';
        s.src = jsBase() + 'kreezby-seed-portal-data.js?v=20260924c';
        s.async = false;
        document.head.appendChild(s);
    }

    function ensurePageTransitionLoaded() {
        if (/\/customer\//i.test(window.location.pathname || '')) return;
        if (document.getElementById('kreezby-turbo-nav-script')) return;
        if (document.getElementById('kreezby-page-transition-script')) return;

        var s = document.createElement('script');
        s.id = 'kreezby-turbo-nav-script';
        s.src = jsBase() + 'kreezby-turbo-nav.js?v=20260920d';
        document.head.appendChild(s);
    }

    function ensureNavbarSlideLoaded() {
        if (window.KreezbyNavbarSlideLoaded) {
            if (window.KreezbyNavbarSlide && typeof window.KreezbyNavbarSlide.init === 'function') {
                window.KreezbyNavbarSlide.init();
            }
            return;
        }
        if (document.getElementById('kreezby-navbar-slide-script')) return;

        var s = document.createElement('script');
        s.id = 'kreezby-navbar-slide-script';
        s.src = jsBase() + 'navbar-slide.js?v=20260925sm';
        s.defer = true;
        s.onload = function () {
            if (window.KreezbyNavbarSlide && typeof window.KreezbyNavbarSlide.init === 'function') {
                window.KreezbyNavbarSlide.init();
            }
        };
        document.head.appendChild(s);
    }

    function ensureExpandingTabsLoaded() {
        if (window.KreezbyExpandingTabsLoaded) {
            if (window.KreezbyExpandingTabs && typeof window.KreezbyExpandingTabs.init === 'function') {
                window.KreezbyExpandingTabs.init();
            }
            return;
        }
        if (document.getElementById('kreezby-expanding-tabs-script')) return;

        var s = document.createElement('script');
        s.id = 'kreezby-expanding-tabs-script';
        s.src = jsBase() + 'expanding-tabs.js?v=20260925sm';
        s.defer = true;
        s.onload = function () {
            if (window.KreezbyExpandingTabs && typeof window.KreezbyExpandingTabs.init === 'function') {
                window.KreezbyExpandingTabs.init();
            }
        };
        document.head.appendChild(s);
    }

    function ensureKreezbyAlertLoaded() {
        if (window.KreezbyAlertLoaded) return;
        if (document.getElementById('kreezby-alert-script')) return;

        var s = document.createElement('script');
        s.id = 'kreezby-alert-script';
        s.src = jsBase() + 'kreezby-alert.js';
        s.defer = true;
        document.head.appendChild(s);
    }

    function ensureNotificationPopoverLoaded() {
        if (window.KreezbyNotificationPopoverLoaded) return;
        if (document.getElementById('kreezby-notification-popover-script')) return;
        if (!document.querySelector('.notification-pill')) return;

        var base = jsBase();

        function loadPopover() {
            if (window.KreezbyNotificationPopoverLoaded || document.getElementById('kreezby-notification-popover-script')) return;
            var pop = document.createElement('script');
            pop.id = 'kreezby-notification-popover-script';
            pop.src = base + 'notification-popover.js';
            pop.defer = true;
            document.head.appendChild(pop);
        }

        if (!window.KreezbyNotifications && !document.getElementById('kreezby-notification-store-script')) {
            var store = document.createElement('script');
            store.id = 'kreezby-notification-store-script';
            store.src = base + 'notification-store.js';
            store.onload = loadPopover;
            store.defer = true;
            document.head.appendChild(store);
        } else {
            loadPopover();
        }
    }

    function ensurePortalIconSidebarLoaded() {
        var path = (window.location && window.location.pathname) ? window.location.pathname : '';
        if (!/\/staff\//i.test(path) && !/\/retailer\/[^/]+\//i.test(path)) return;
        if (!document.querySelector('aside.sidebar-panel')) return;
        if (document.getElementById('kreezby-portal-icon-sidebar-script')) return;

        var s = document.createElement('script');
        s.id = 'kreezby-portal-icon-sidebar-script';
        s.src = jsBase() + 'portal-icon-sidebar.js';
        s.async = false;
        document.head.appendChild(s);
    }

    function ensureAdminPermissionsLoaded() {
        var path = window.location.pathname || '';
        if (!/\/admin\//i.test(path) && !/\/head_admin\//i.test(path)) return;
        if (window.KreezbyAdminPermissions) {
            if (typeof window.KreezbyAdminPermissions.refreshAdminChrome === 'function') {
                window.KreezbyAdminPermissions.refreshAdminChrome();
            }
            return;
        }
        if (document.getElementById('kreezby-admin-permissions-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-admin-permissions-script';
        s.src = jsBase() + 'admin-permissions.js';
        s.async = false;
        document.head.appendChild(s);
    }

    function ensureDashboardIconsLoaded() {
        var path = (window.location && window.location.pathname) ? window.location.pathname : '';
        if (!/\/(admin|staff|retailer|head_admin)\//i.test(path)) return;
        if (document.getElementById('kreezby-dashboard-icons-script')) return;

        var s = document.createElement('script');
        s.id = 'kreezby-dashboard-icons-script';
        s.src = jsBase() + 'kreezby-dashboard-icons.js?v=20260925inquiry';
        s.async = false;
        document.head.appendChild(s);
    }

    function isStaffPage() {
        return /\/staff\//i.test(window.location.pathname || '');
    }

    function isRetailerPage() {
        return /\/retailer\//i.test(window.location.pathname || '');
    }

    function isAdminPage() {
        return /\/admin\//i.test(window.location.pathname || '');
    }

    function isHeadAdminPortalPage() {
        var path = window.location.pathname || '';
        if (!/\/head_admin\//i.test(path)) return false;
        var file = (path.split('/').pop() || '').toLowerCase().split('?')[0];
        return file !== 'index.html'
            && file !== 'admin-permissions.html'
            && file !== 'staff-permissions.html'
            && file !== 'inquiries.html'
            && file !== '';
    }

    function isAdminLikePage() {
        return isAdminPage() || isHeadAdminPortalPage();
    }

    function stripIssueReportsChrome() {
        if (/\/it_kreezby\//i.test(window.location.pathname || '')) return;
        document.querySelectorAll('.top-navbar-node a, .kreezby-sidebar-nav-item, .dropdown-item').forEach(function (link) {
            var href = (link.getAttribute('href') || '').toLowerCase();
            var text = ((link.querySelector('.expandable-nav-tab__label') || link).textContent || '').toLowerCase();
            if (href.indexOf('it_kreezby') >= 0 || text.indexOf('issue reports') >= 0) {
                link.remove();
            }
        });
    }

    function ensureAdminTopNavLinks() {
        if (!isAdminLikePage()) return;

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (!right) return;

        var desired = isHeadAdminPortalPage()
            ? [
                { key: 'home', label: 'Home', href: moduleLocalHref('head_admin.html') },
                { key: 'maintenance', label: 'Maintenance', href: moduleLocalHref('maintenance-headadmin.html') },
                { key: 'inbox', label: 'Inbox', href: moduleLocalHref('inbox-headadmin.html') }
            ]
            : [
                { key: 'home', label: 'Home', href: moduleLocalHref('admin.html') },
                { key: 'maintenance', label: 'Maintenance', href: moduleLocalHref('maintenance-admin.html') },
                { key: 'inbox', label: 'Inbox', href: moduleLocalHref('inbox-admin.html') }
            ];

        function normalize(text) {
            return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
        }

        function keyForLink(link) {
            var text = normalize(link.textContent || '');
            var href = (link.getAttribute('href') || '').toLowerCase();
            var file = href.split('/').pop().split('?')[0];

            if (text.indexOf("what's new") >= 0 || text === 'control' || file === 'index.html') return 'whatsnew';
            if (text.indexOf('inquiry') >= 0 || file === 'inquiries.html') return 'inquiry';
            if (text === 'home' || file === 'admin.html' || file === 'head_admin.html') return 'home';
            if (text.indexOf('maintenance') >= 0 || file === 'maintenance-admin.html' || file === 'maintenance-headadmin.html') return 'maintenance';
            if (text.indexOf('issue report') >= 0 || href.indexOf('it_kreezby') >= 0) return 'issuereports';
            if (text.indexOf('inbox') >= 0 || file === 'inbox-admin.html' || file === 'inbox-headadmin.html') return 'inbox';
            return '';
        }

        var wrap = right.querySelector('.expandable-nav-tabs');
        var host = wrap || right;
        var topLinks = Array.prototype.slice.call(host.querySelectorAll(':scope > a'));
        var byKey = {};
        var needsNavRefresh = false;

        topLinks.forEach(function (link) {
            var key = keyForLink(link);
            var href = (link.getAttribute('href') || '').toLowerCase();
            if (key === 'issuereports' || key === 'whatsnew' || key === 'inquiry' || href.indexOf('it_kreezby') >= 0) {
                link.remove();
                return;
            }
            if (key && !byKey[key]) byKey[key] = link;
        });

        desired.forEach(function (item) {
            var link = byKey[item.key];
            if (!link) {
                link = document.createElement('a');
                link.className = 'top-nav-item' + (item.key === 'home' ? ' home-badge' : '');
                host.appendChild(link);
                byKey[item.key] = link;
                needsNavRefresh = true;
            }

            link.setAttribute('href', item.href);
            link.setAttribute('title', item.label);

            if (link.classList.contains('expandable-nav-tab')) {
                var labelNode = link.querySelector('.expandable-nav-tab__label');
                if (labelNode) {
                    labelNode.textContent = item.label;
                } else {
                    needsNavRefresh = true;
                }
            } else {
                link.classList.add('top-nav-item');
                if (item.key === 'home') link.classList.add('home-badge');
                else link.classList.remove('home-badge');
                link.textContent = item.label;
                link.removeAttribute('aria-current');
                if (wrap) needsNavRefresh = true;
            }
        });

        desired.forEach(function (item) {
            host.appendChild(byKey[item.key]);
        });

        if (needsNavRefresh && window.KreezbyNavbarSlide && typeof window.KreezbyNavbarSlide.init === 'function') {
            window.KreezbyNavbarSlide.init();
        }
    }

    function ensureAdminNotificationPill() {
        if (!isAdminLikePage()) return;

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (!right) return;

        var bell = right.querySelector('.notification-pill');
        if (!bell) {
            bell = document.createElement('button');
            bell.type = 'button';
            bell.className = 'notification-pill';
            bell.setAttribute('aria-label', 'Notifications');
            bell.textContent = '🔔';
            right.appendChild(bell);
        }
    }

    function ensureAdminDropdownAfterNavTabs() {
        if (!isAdminLikePage()) return;

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (!right) return;

        var dropdown = right.querySelector('.user-dropdown');
        if (!dropdown) return;

        var bell = right.querySelector('.notification-pill');

        var navWrap = right.querySelector('.expandable-nav-tabs');
        if (navWrap || bell) {
            var anchor = bell || navWrap;
            if (anchor && anchor.nextElementSibling !== dropdown) {
                if (anchor.nextSibling) right.insertBefore(dropdown, anchor.nextSibling);
                else right.appendChild(dropdown);
            }
            return;
        }

        var lastTopItem = right.querySelector('a.top-nav-item:last-of-type');
        if (lastTopItem && lastTopItem.nextSibling !== dropdown) {
            if (lastTopItem.nextSibling) {
                right.insertBefore(dropdown, lastTopItem.nextSibling);
            } else {
                right.appendChild(dropdown);
            }
        }
    }

    function retailerDropdownLabel() {
        var brand = document.querySelector('.panel-brand');
        if (brand && brand.textContent) return brand.textContent.trim() + ' \u25be';
        return 'Retailer \u25be';
    }

    function ensureStaffUserDropdownShell() {
        if (!isStaffPage()) return;
        if (document.getElementById('user-dropdown-trigger')) return;

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (!right) return;

        var wrap = document.createElement('div');
        wrap.className = 'user-dropdown';
        wrap.innerHTML =
            '<button type="button" class="user-dropdown-pill" id="user-dropdown-trigger" aria-haspopup="true" aria-expanded="false">Staff \u25be</button>' +
            '<div class="user-dropdown-menu" id="user-dropdown-menu"></div>';
        right.appendChild(wrap);
    }

    function ensureRetailerUserDropdownShell() {
        if (!isRetailerPage()) return;
        if (document.getElementById('user-dropdown-trigger')) return;

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (!right) return;

        var wrap = document.createElement('div');
        wrap.className = 'user-dropdown';
        wrap.innerHTML =
            '<button type="button" class="user-dropdown-pill" id="user-dropdown-trigger" aria-haspopup="true" aria-expanded="false">' +
            retailerDropdownLabel() +
            '</button>' +
            '<div class="user-dropdown-menu" id="user-dropdown-menu"></div>';
        right.appendChild(wrap);
    }

    function ensureAdminUserDropdownShell() {
        if (!isAdminLikePage()) return;
        if (document.getElementById('user-dropdown-trigger')) return;

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (!right) return;

        var wrap = document.createElement('div');
        wrap.className = 'user-dropdown';
        wrap.innerHTML =
            '<button type="button" class="user-dropdown-pill" id="user-dropdown-trigger" aria-haspopup="true" aria-expanded="false">' +
            (isHeadAdminPortalPage() ? 'Head Admin \u25be' : 'Admin \u25be') +
            '</button>' +
            '<div class="user-dropdown-menu" id="user-dropdown-menu">' +
                reportIssueMenuHtml() +
            '</div>';
        right.appendChild(wrap);
    }

    function ensureCss() {
        if (document.getElementById('kreezby-user-dropdown-style')) return;
        var link = document.createElement('link');
        link.id = 'kreezby-user-dropdown-style';
        link.rel = 'stylesheet';
        link.href = moduleRoot() + 'css/shared/user-dropdown.css';
        document.head.appendChild(link);
    }

    function ensureMenuMarkup(menu) {
        var reportHref = reportIssueHref();
        var loginHref = authLoginHref();

        if (isStaffPage() || isAdminLikePage() || isRetailerPage()) {
            menu.innerHTML = reportIssueMenuHtml();
            return;
        }

        Array.prototype.slice.call(menu.querySelectorAll('.dropdown-item')).forEach(function (link) {
            var text = (link.textContent || '').toLowerCase();
            var href = (link.getAttribute('href') || '').toLowerCase();
            if (text.indexOf('issue reports') >= 0 || href.indexOf('it_kreezby') >= 0) {
                link.remove();
            }
        });

        var items = menu.querySelectorAll('.dropdown-item');
        var hasReport = false;
        var hasLogout = false;

        items.forEach(function (link) {
            var text = (link.textContent || '').toLowerCase();
            if (text.indexOf('report issue') >= 0) {
                hasReport = true;
                link.setAttribute('href', reportHref);
                link.textContent = 'Report Issue';
            }
            if (text.indexOf('log out') >= 0) {
                hasLogout = true;
                link.setAttribute('href', loginHref);
            }
        });

        if (!hasReport) {
            var report = document.createElement('a');
            report.href = reportHref;
            report.className = 'dropdown-item';
            report.textContent = 'Report Issue';
            var logoutLink = menu.querySelector('.dropdown-item');
            if (logoutLink) menu.insertBefore(report, logoutLink);
            else menu.appendChild(report);
        }
        if (!hasLogout) {
            var out = document.createElement('a');
            out.href = loginHref;
            out.className = 'dropdown-item';
            out.textContent = '\u21a9 Log Out';
            menu.appendChild(out);
        }
    }

    function wireLogoutLinks(scope) {
        (scope || document).querySelectorAll('#user-dropdown-menu .dropdown-item, .user-dropdown-menu .dropdown-item').forEach(function (link) {
            var text = (link.textContent || '').toLowerCase();
            if (text.indexOf('log out') < 0) return;
            if (link.dataset.kreezbyLogoutWired === '1') return;
            link.dataset.kreezbyLogoutWired = '1';
            link.addEventListener('click', function (e) {
                e.preventDefault();
                try { localStorage.removeItem('kreezby_session'); } catch (err) { /* ignore */ }
                location.href = authLoginHref();
            });
        });
    }

    function refreshDropdownNodes() {
        var trigger = document.getElementById('user-dropdown-trigger');
        var menu = document.getElementById('user-dropdown-menu');
        if (!trigger || !menu) return null;

        ensureCss();
        ensureMenuMarkup(menu);
        wireLogoutLinks(menu);
        if (isHeadAdminPortalPage()) {
            trigger.textContent = 'Head Admin \u25be';
        }

        trigger.setAttribute('aria-haspopup', 'true');
        if (!trigger.hasAttribute('aria-expanded')) {
            trigger.setAttribute('aria-expanded', 'false');
        }

        return { trigger: trigger, menu: menu };
    }

    function bindDropdownDelegation() {
        if (document.kreezbyDropdownDelegationBound) return;
        document.kreezbyDropdownDelegationBound = true;

        // Capture phase runs before legacy inline handlers on retailer dashboards.
        document.addEventListener('click', function (event) {
            var trigger = event.target.closest('#user-dropdown-trigger');
            var menu = document.getElementById('user-dropdown-menu');
            if (!menu) return;

            if (trigger) {
                event.preventDefault();
                event.stopPropagation();
                var willOpen = !menu.classList.contains('active');
                menu.classList.toggle('active');
                trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                return;
            }

            if (menu.contains(event.target)) return;

            if (menu.classList.contains('active')) {
                menu.classList.remove('active');
                var activeTrigger = document.getElementById('user-dropdown-trigger');
                if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
            }
        }, true);
    }

    function wireUserDropdown() {
        refreshDropdownNodes();
    }

    function ensureActionButtonsLoaded() {
        if (window.KreezbyActions) {
            if (typeof window.KreezbyActions.init === 'function') window.KreezbyActions.init();
            return;
        }
        if (document.getElementById('kreezby-action-buttons-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-action-buttons-script';
        s.src = jsBase() + 'action-buttons.js?v=20260924e';
        s.async = false;
        s.onload = function () {
            if (window.KreezbyActions && typeof window.KreezbyActions.init === 'function') {
                window.KreezbyActions.init();
            }
        };
        document.head.appendChild(s);
    }

    function bootSharedUi() {
        ensurePortalSeedLoaded();
        ensureActionButtonsLoaded();
        ensurePageTransitionLoaded();
        ensureNavbarSlideLoaded();
        ensureExpandingTabsLoaded();
        ensureNotificationPopoverLoaded();
        ensureKreezbyAlertLoaded();
        ensurePortalIconSidebarLoaded();
        ensureDashboardIconsLoaded();
        ensureAdminPermissionsLoaded();
    }

    function init() {
        ensureAdminTopNavLinks();
        stripIssueReportsChrome();
        ensureAdminNotificationPill();
        bootSharedUi();
        ensureStaffUserDropdownShell();
        ensureRetailerUserDropdownShell();
        ensureAdminUserDropdownShell();
        ensureAdminDropdownAfterNavTabs();
        bindDropdownDelegation();
        wireUserDropdown();
        stripIssueReportsChrome();
    }

    bootSharedUi();
    bindDropdownDelegation();
    ensurePortalSeedLoaded();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    document.addEventListener('kreezby:page-load', init);

    window.KreezbyUserDropdown = {
        init: init,
        wire: wireUserDropdown,
        inboxHref: inboxHref,
        reportIssueHref: reportIssueHref,
        moduleLocalHref: moduleLocalHref
    };
})();
