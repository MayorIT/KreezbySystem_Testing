(function () {
    const body = document.body;
    const collapsedClass = 'sidebar-collapsed';
    const actionMenuScriptId = 'kreezby-action-menu-script';

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
        else if (/\/(admin|staff|customer)\//i.test(path)) src = '../js/action-menu.js';
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

    function toggleSidebar() {
        const isCollapsed = body.classList.toggle(collapsedClass);
        try {
            localStorage.setItem('kreezbySidebarCollapsed', isCollapsed ? '1' : '0');
        } catch (e) {}
        const btn = document.querySelector('.hamburger-toggle');
        if (btn) btn.setAttribute('aria-pressed', !!isCollapsed);
    }

    window.KreezbyToggleSidebar = toggleSidebar;

    function addToggleButton() {
        const topNav = document.querySelector('.top-navbar-node .top-nav-links-right');
        const sidebar = document.querySelector('aside.sidebar-panel, aside.dark-sidebar-panel');
        if (!topNav || !sidebar) return;

        if (topNav.querySelector('.hamburger-toggle')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hamburger-toggle';
        button.setAttribute('aria-label', 'Toggle sidebar');
        button.innerHTML = '☰';
        // set pressed state from localStorage if applicable
        try {
            const stored = localStorage.getItem('kreezbySidebarCollapsed');
            if (stored === '1') button.setAttribute('aria-pressed', 'true');
            else button.setAttribute('aria-pressed', 'false');
        } catch (e) {
            button.setAttribute('aria-pressed', 'false');
        }
        button.addEventListener('click', toggleSidebar);

        // place the toggle at the right end of the header controls
        topNav.appendChild(button);
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
        } else if (/\/(admin|staff|customer|wholesaler)\//i.test(path)) {
            src = '../js/notification-popover.js';
            storeSrc = '../js/notification-store.js';
        }
        const ref = document.querySelector('script[src*="/js/sidebar-toggle.js"]');
        if (ref && ref.getAttribute('src')) {
            src = ref.getAttribute('src').replace(/[^/]+$/, 'notification-popover.js');
            storeSrc = ref.getAttribute('src').replace(/[^/]+$/, 'notification-store.js');
        }

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

    function ensureUserDropdownNavLoaded() {
        if (window.KreezbyUserDropdown) return;
        if (document.getElementById('kreezby-user-dropdown-nav-script')) return;

        const path = (window.location && window.location.pathname) ? window.location.pathname : '';
        const needsDropdownShell = /\/(staff|retailer)\//i.test(path);
        if (!document.getElementById('user-dropdown-trigger') && !needsDropdownShell) return;
        let src = 'js/user-dropdown-nav.js';
        if (/\/retailer\/[^/]+\//i.test(path)) src = '../../js/user-dropdown-nav.js';
        else if (/\/(admin|staff|customer|wholesaler)\//i.test(path)) src = '../js/user-dropdown-nav.js';
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
    });

    document.addEventListener('kreezby-admin-sidebar-ready', wireExistingRows);
    document.addEventListener('kreezby-staff-sidebar-ready', wireExistingRows);
    document.addEventListener('kreezby-portal-sidebar-ready', wireExistingRows);
    document.addEventListener('kreezby:page-load', function () {
        ensureUserDropdownNavLoaded();
        addToggleButton();
        wireExistingRows();
    });
})();
