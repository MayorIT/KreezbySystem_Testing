(function () {
    const body = document.body;
    const collapsedClass = 'sidebar-collapsed';
    const actionMenuScriptId = 'kreezby-action-menu-script';
    const openStateKey = 'kreezbySidebarOpen';

    function saveOpenState(open) {
        try {
            if (open) sessionStorage.setItem(openStateKey, '1');
            else sessionStorage.removeItem(openStateKey);
        } catch (e) {}
    }

    function restoreOpenState() {
        try {
            if (sessionStorage.getItem(openStateKey) !== '1') return;
        } catch (e) {
            return;
        }
        if (window.KreezbyMobile && typeof window.KreezbyMobile.openNav === 'function') {
            window.KreezbyMobile.openNav();
        } else {
            body.classList.add('kreezby-nav-open');
        }
    }

    function isPoReceivePortalPage() {
        return !!(
            document.body.getAttribute('data-kreezby-portal') ||
            document.getElementById('po-retailer-directory-block') ||
            document.getElementById('po-master-lists-container-block') ||
            document.getElementById('receiving-retailer-directory-panel-view') ||
            document.getElementById('receiving-master-directory-panel-view') ||
            document.getElementById('bo-retailer-dashboard-view') ||
            document.getElementById('bo-master-dashboard-split-view') ||
            document.getElementById('returns-master-list-panel-view') ||
            document.getElementById('returns-details-inspector-panel-view')
        );
    }

    function ensureActionMenuScriptLoaded() {
        if (isPoReceivePortalPage()) return;
        if (window.KreezbyActions) return;
        // Avoid double-loading when pages already include it.
        if (document.getElementById(actionMenuScriptId)) return;
        if (window.KreezbyActionMenuLoaded) return;

        const path = (window.location && window.location.pathname) ? window.location.pathname : '';
        let src = 'js/action-menu.js';
        if (/\/retailer\/[^/]+\//i.test(path)) src = '../../js/action-menu.js';
        else if (/\/(admin|head_admin|staff|customer)\//i.test(path)) src = '../js/action-menu.js';
        const ref = document.querySelector('script[src*="/js/po-admin.js"], script[src*="/js/receive-admin.js"], script[src*="/js/bo-admin.js"], script[src*="/js/sidebar-toggle.js"]');
        if (ref && ref.getAttribute('src')) {
            src = ref.getAttribute('src').replace(/[^/]+$/, 'action-menu.js');
        }
        if (src.indexOf('?') < 0) src += '?v=20260924c';

        const s = document.createElement('script');
        s.id = actionMenuScriptId;
        s.src = src;
        s.defer = true;
        s.onload = function () { window.KreezbyActionMenuLoaded = true; };
        document.head.appendChild(s);
    }

    function toggleSidebar(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (window.KreezbyMobile) {
            if (document.body.classList.contains('kreezby-nav-open')) window.KreezbyMobile.closeNav();
            else window.KreezbyMobile.openNav();
        } else {
            document.body.classList.toggle('kreezby-nav-open');
        }
        const btn = document.querySelector('.hamburger-toggle');
        const open = document.body.classList.contains('kreezby-nav-open');
        saveOpenState(open);
        if (btn) {
            btn.setAttribute('aria-pressed', open ? 'true' : 'false');
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        }
        var welcome = document.getElementById('admin-open-menu');
        if (welcome) {
            welcome.setAttribute('aria-expanded', open ? 'true' : 'false');
            var welcomeLabel = welcome.querySelector('.admin-home-menu-btn__label');
            if (welcomeLabel) welcomeLabel.textContent = open ? 'Close menu' : 'Open menu';
        }
    }

    window.KreezbyToggleSidebar = toggleSidebar;

    function addToggleButton() {
        const header = document.querySelector('.top-navbar-node');
        const topNav = header && header.querySelector('.top-nav-links-right');
        const sidebar = document.querySelector('aside.sidebar-panel, aside.dark-sidebar-panel');
        if (!topNav || !sidebar) return;

        const existing = header.querySelector('.hamburger-toggle');
        if (existing) {
            if (!existing._kreezbyHamburgerBound) {
                existing._kreezbyHamburgerBound = true;
                existing.type = 'button';
                existing.addEventListener('click', toggleSidebar);
            }
            if (window.KreezbyOrderHeader) window.KreezbyOrderHeader();
            return;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hamburger-toggle';
        button.setAttribute('aria-label', 'Open menu');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = '☰';
        button.setAttribute('aria-pressed', 'false');
        button._kreezbyHamburgerBound = true;
        button.addEventListener('click', toggleSidebar);

        topNav.appendChild(button);
        if (window.KreezbyOrderHeader) window.KreezbyOrderHeader();
    }

    function wireExistingRows() {
        document.querySelectorAll('.hamburger-row').forEach(function (row) {
            if (row.dataset.sidebarBound === '1') return;
            row.dataset.sidebarBound = '1';
            row.style.cursor = 'pointer';
            row.addEventListener('click', toggleSidebar);
        });
    }

    function ensureNotificationPopoverLoaded() {
        if (window.KreezbyNotificationPopoverLoaded) return;
        if (document.getElementById('kreezby-notification-popover-script')) return;
        if (!document.querySelector('.notification-pill')) return;

        const path = (window.location && window.location.pathname) ? window.location.pathname : '';
        let src = 'js/notification-popover.js';
        let storeSrc = 'js/notification-store.js';
        if (/\/retailer\/[^/]+\//i.test(path)) {
            src = '../../js/notification-popover.js';
            storeSrc = '../../js/notification-store.js';
        } else if (/\/(admin|head_admin|staff|customer)\//i.test(path)) {
            src = '../js/notification-popover.js';
            storeSrc = '../js/notification-store.js';
        }
        const ref = document.querySelector('script[src*="/js/sidebar-toggle.js"]');
        if (ref && ref.getAttribute('src')) {
            src = ref.getAttribute('src').replace(/[^/]+$/, 'notification-popover.js');
            storeSrc = ref.getAttribute('src').replace(/[^/]+$/, 'notification-store.js');
        }
        src = src.split('?')[0] + '?v=20261015fix';
        storeSrc = storeSrc.split('?')[0] + '?v=20261021fix';

        function loadPopover() {
            if (window.KreezbyNotificationPopoverLoaded || document.getElementById('kreezby-notification-popover-script')) return;
            const s = document.createElement('script');
            s.id = 'kreezby-notification-popover-script';
            s.src = src;
            s.defer = true;
            document.head.appendChild(s);
        }

        if (!window.KreezbyNotifications && !document.getElementById('kreezby-notification-store-script')) {
            const store = document.createElement('script');
            store.id = 'kreezby-notification-store-script';
            store.src = storeSrc;
            store.onload = loadPopover;
            store.defer = true;
            document.head.appendChild(store);
        } else {
            loadPopover();
        }
    }

    function ensureMobileLoaded() {
        if (window.KreezbyMobileLoaded) return;
        if (document.getElementById('kreezby-mobile-script')) return;
        const path = (window.location && window.location.pathname) ? window.location.pathname : '';
        let src = 'js/kreezby-mobile.js';
        if (/\/retailer\/[^/]+\//i.test(path)) src = '../../js/kreezby-mobile.js';
        else if (/\/(admin|staff|customer|head_admin|it_kreezby|auth)\//i.test(path)) src = '../js/kreezby-mobile.js';
        const ref = document.querySelector('script[src*="sidebar-toggle.js"]');
        if (ref && ref.getAttribute('src')) {
            src = ref.getAttribute('src').replace(/[^/]+$/, 'kreezby-mobile.js');
        }
        if (src.indexOf('?') < 0) src += '?v=20261004menu';
        const s = document.createElement('script');
        s.id = 'kreezby-mobile-script';
        s.src = src;
        s.defer = true;
        document.head.appendChild(s);
    }

    function ensureUserDropdownNavLoaded() {
        if (window.KreezbyUserDropdown) return;
        if (document.getElementById('kreezby-user-dropdown-nav-script')) return;

        const path = (window.location && window.location.pathname) ? window.location.pathname : '';
        const needsDropdownShell = /\/(staff|retailer)\//i.test(path);
        if (!document.getElementById('user-dropdown-trigger') && !needsDropdownShell) return;
        let src = 'js/user-dropdown-nav.js';
        if (/\/retailer\/[^/]+\//i.test(path)) src = '../../js/user-dropdown-nav.js';
        else if (/\/(admin|head_admin|staff|customer)\//i.test(path)) src = '../js/user-dropdown-nav.js';
        const ref = document.querySelector('script[src*="/js/sidebar-toggle.js"]');
        if (ref && ref.getAttribute('src')) {
            src = ref.getAttribute('src').replace(/[^/]+$/, 'user-dropdown-nav.js');
        }

        const s = document.createElement('script');
        s.id = 'kreezby-user-dropdown-nav-script';
        s.src = src;
        s.async = false;
        document.body.appendChild(s);
    }

    document.addEventListener('DOMContentLoaded', function () {
        ensureMobileLoaded();
        ensureActionMenuScriptLoaded();
        ensureNotificationPopoverLoaded();
        ensureUserDropdownNavLoaded();

        // apply stored collapsed state if present
        try {
            const stored = localStorage.getItem('kreezbySidebarCollapsed');
            if (stored === '1') document.body.classList.add(collapsedClass);
        } catch (e) {}

        addToggleButton();
        wireExistingRows();
        restoreOpenState();
    });

    document.addEventListener('kreezby-admin-sidebar-ready', function () {
        addToggleButton();
        wireExistingRows();
        restoreOpenState();
    });
    document.addEventListener('kreezby-staff-sidebar-ready', function () {
        addToggleButton();
        wireExistingRows();
        restoreOpenState();
    });
    document.addEventListener('kreezby-portal-sidebar-ready', function () {
        addToggleButton();
        wireExistingRows();
    });
    document.addEventListener('kreezby:page-load', function () {
        ensureMobileLoaded();
        ensureUserDropdownNavLoaded();
        addToggleButton();
        wireExistingRows();
        restoreOpenState();
    });

    window.addEventListener('pageshow', function () {
        addToggleButton();
        wireExistingRows();
        restoreOpenState();
    });

    window.addEventListener('load', restoreOpenState);
})();
