/**
 * Wires the header user pill (#user-dropdown-trigger / #user-dropdown-menu)
 * used across admin, staff, and retailer module pages.
 */
(function () {
    'use strict';

    var HOME_ICON_CSS = [
        'a.home-badge:not(.expandable-nav-tab),a.top-nav-item.home-badge:not(.expandable-nav-tab){',
        'font-size:0!important;line-height:0!important;color:transparent!important;',
        'width:40px!important;min-width:40px!important;max-width:40px!important;height:40px!important;',
        'padding:0!important;overflow:hidden!important;display:inline-flex!important;',
        'align-items:center!important;justify-content:center!important;',
        'border-radius:999px!important;background-color:#ffca28!important;',
        'background-repeat:no-repeat!important;background-position:center!important;background-size:18px 18px!important;',
        'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%231f1f1f\' stroke-width=\'1.75\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M3 10.5 12 3l9 7.5\'/%3E%3Cpath d=\'M5 9.5V20h14V9.5\'/%3E%3Cpath d=\'M9 20v-6h6v6\'/%3E%3C/svg%3E")!important;',
        '}',
        'a.expandable-nav-tab.is-icon-only,a.expandable-nav-tab.is-icon-only.is-expanded,a.expandable-nav-tab.is-icon-only.is-active{',
        'gap:0!important;width:40px!important;min-width:40px!important;max-width:40px!important;height:40px!important;',
        'padding:0!important;justify-content:center!important;display:inline-flex!important;',
        'background-image:none!important;',
        '}',
        'a.expandable-nav-tab.is-icon-only.is-active,a.expandable-nav-tab.is-icon-only.is-active.is-expanded{background-color:#ffca28!important;color:#1f1f1f!important;}',
        'a.expandable-nav-tab.is-icon-only .expandable-nav-tab__label{display:none!important;max-width:0!important;opacity:0!important;}',
        '@media (max-width:900px){',
        '.top-navbar-node .expandable-nav-tabs{display:flex!important;}',
        '.top-navbar-node .top-nav-links-right > a.home-badge,',
        '.top-navbar-node .top-nav-links-right > a.is-icon-only,',
        '.top-navbar-node .expandable-nav-tabs > a.home-badge,',
        '.top-navbar-node .expandable-nav-tabs > a.is-icon-only{display:inline-flex!important;}',
        '}'
    ].join('');

    function ensureHomeIconCss() {
        var style = document.getElementById('kreezby-home-icon-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'kreezby-home-icon-style';
            style.textContent = HOME_ICON_CSS;
        }
        (document.head || document.documentElement).appendChild(style);
    }

    function isHomeNavAnchor(link) {
        if (!link) return false;
        if (link.classList.contains('home-badge') || link.classList.contains('is-icon-only')) return true;
        var label = (link.getAttribute('aria-label') || link.getAttribute('title') || link.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return label === 'home';
    }

    function keepOnlyHomeNavTab() {
        document.querySelectorAll('.top-nav-links-right').forEach(function (right) {
            right.querySelectorAll('a.top-nav-item, a.expandable-nav-tab').forEach(function (link) {
                if (link.closest('.user-dropdown, .user-dropdown-menu')) return;
                if (isHomeNavAnchor(link)) return;
                link.remove();
            });
        });
    }

    ensureHomeIconCss();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            keepOnlyHomeNavTab();
            ensureHomeIconCss();
        });
    } else {
        keepOnlyHomeNavTab();
    }
    window.addEventListener('load', ensureHomeIconCss);

    function moduleRoot() {
        var path = (window.location && window.location.pathname) ? window.location.pathname.replace(/\\/g, '/') : '';
        var parts = path.split('/').filter(Boolean);
        if (parts.length && /\.html?$/i.test(parts[parts.length - 1])) parts.pop();

        var roots = ['admin', 'staff', 'admin_names', 'staff_names', 'retailer', 'customer', 'wholesaler', 'auth', 'it_kreezby', 'head_admin'];
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

        var roots = ['admin', 'staff', 'admin_names', 'staff_names', 'retailer', 'customer', 'wholesaler', 'auth', 'it_kreezby', 'head_admin'];
        var rootIdx = -1;
        for (var i = parts.length - 1; i >= 0; i--) {
            if (roots.indexOf(parts[i].toLowerCase()) >= 0) {
                rootIdx = i;
                break;
            }
        }
        if (rootIdx < 0) return filename;

        var rootName = parts[rootIdx].toLowerCase();
        if (rootName === 'admin_names' || rootName === 'staff_names') return filename;

        var withinModule = parts.length - rootIdx - 1;
        var prefix = '';
        for (var d = 0; d < withinModule; d++) prefix += '../';
        return prefix + filename;
    }

    function reportIssueHref() {
        var path = (window.location.pathname || '').toLowerCase();
        if (path.indexOf('/staff/') !== -1 || path.indexOf('/staff_names/') !== -1) return moduleLocalHref('report_issue-staff.html');
        if (path.indexOf('/retailer/') !== -1) return moduleLocalHref('report_issue-retailer.html');
        if (path.indexOf('/customer/') !== -1) return moduleLocalHref('report_issue-customer.html');
        if (path.indexOf('/wholesaler/') !== -1) return moduleRoot() + 'wholesaler/report_issue-wholesaler.html';
        if (path.indexOf('/head_admin/') !== -1) return moduleLocalHref('report_issue-headadmin.html');
        if (path.indexOf('/admin/') !== -1 || path.indexOf('/admin_names/') !== -1) return moduleLocalHref('report_issue-admin.html');
        return moduleLocalHref('report_issue-admin.html');
    }

    function reportIssueMenuHtml() {
        var logout = '<a href="' + authLoginHref() + '" class="dropdown-item">\u21a9 Log Out</a>';
        if (isHeadAdminPortalPage()) return logout;
        return '<a href="' + reportIssueHref() + '" class="dropdown-item">Report Issue</a>' + logout;
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

    function ensureDictionaryLoaded() {
        if (window.KreezbyDictionary) {
            try { window.KreezbyDictionary.apply(); } catch (e) { /* ignore */ }
            return;
        }
        if (document.getElementById('kreezby-data-dictionary-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-data-dictionary-script';
        s.src = jsBase() + 'kreezby-data-dictionary.js?v=20260927dict';
        s.async = false;
        document.head.appendChild(s);
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
        s.src = jsBase() + 'navbar-slide.js?v=20260927sheet';
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
            pop.src = base + 'notification-popover.js?v=20260927notif';
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
        if (!/\/admin\//i.test(path) && !/\/admin_names\//i.test(path) && !/\/head_admin\//i.test(path)) return;
        if (window.KreezbyAdminPermissions) {
            if (typeof window.KreezbyAdminPermissions.refreshAdminChrome === 'function') {
                window.KreezbyAdminPermissions.refreshAdminChrome();
            }
            return;
        }
        if (document.getElementById('kreezby-admin-permissions-script')) return;
        var s = document.createElement('script');
        s.id = 'kreezby-admin-permissions-script';
        s.src = jsBase() + 'admin-permissions.js?v=20260927recv';
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
        var path = window.location.pathname || '';
        return /\/staff\//i.test(path) || /\/staff_names\//i.test(path);
    }

    function isRetailerPage() {
        return /\/retailer\//i.test(window.location.pathname || '');
    }

    function isAdminPage() {
        var path = window.location.pathname || '';
        return /\/admin\//i.test(path) || /\/admin_names\//i.test(path);
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
            if (href.indexOf('it_kreezby') >= 0) {
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
                { key: 'home', label: 'Home', href: moduleLocalHref('head_admin.html') }
            ]
            : [
                { key: 'home', label: 'Home', href: moduleLocalHref('admin.html') }
            ];

        function normalize(text) {
            return (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
        }

        function keyForLink(link) {
            var text = normalize(link.textContent || '');
            var href = (link.getAttribute('href') || '').toLowerCase();
            var file = href.split('/').pop().split('?')[0];

            if (text.indexOf("what's new") >= 0 || text === 'control' || file === 'index.html') return 'whatsnew';
            if (text.indexOf('inquiry') >= 0 || file === 'inquiries.html' || file === 'inquiries-headadmin.html') return 'inquiry';
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
            if (key === 'issuereports' || key === 'whatsnew' || key === 'inquiry' || key === 'maintenance' || key === 'inbox' || href.indexOf('it_kreezby') >= 0) {
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

    function isWholesalerPage() {
        return /\/wholesaler\//i.test(window.location.pathname || '');
    }

    function isPortalHeaderPage() {
        return isAdminLikePage() || isStaffPage() || isRetailerPage() || isWholesalerPage();
    }

    function ensureAdminNotificationPill() {
        if (!isPortalHeaderPage()) return;

        var right = document.querySelector('.top-navbar-node .top-nav-links-right');
        if (!right || !right.querySelector('a.home-badge, a.is-icon-only, a.expandable-nav-tab')) return;

        if (right.querySelector('.notification-popover-root')) {
            right.querySelectorAll('.notification-pill').forEach(function (extra) { extra.remove(); });
            return;
        }

        var bell = right.querySelector('.notification-pill');
        if (!bell) {
            bell = document.createElement('button');
            bell.type = 'button';
            bell.className = 'notification-pill';
            bell.setAttribute('aria-label', 'Notifications');
            bell.textContent = '🔔';
        }

        var dropdown = right.querySelector('.user-dropdown');
        if (dropdown) right.insertBefore(bell, dropdown);
        else right.appendChild(bell);
    }

    function ensureAdminDropdownAfterNavTabs() {
        if (!isPortalHeaderPage()) return;

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
        ensureDictionaryLoaded();
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
        ensureHomeIconCss();
        keepOnlyHomeNavTab();
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
