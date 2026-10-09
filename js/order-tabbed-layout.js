(function () {
    'use strict';

    function closePortalMenus() {
        [window.PoAdmin, window.BoAdmin, window.ReturnAdmin, window.ReceiveAdmin].forEach(function (api) {
            if (api && typeof api.closeMenus === 'function') api.closeMenus();
        });
    }

    function switchTab(tablist, tabName) {
        closePortalMenus();
        var prefix = tablist.getAttribute('data-panel-prefix');
        if (!prefix) return;

        if (window.KreezbyTabPanels) {
            window.KreezbyTabPanels.switch({
                tablist: tablist,
                tabName: tabName,
                prefix: prefix,
                tabBtnSelector: '.po-order-tab, .bo-order-tab',
                panelSelector: '.po-tab-panel, .bo-tab-panel'
            });
            return;
        }

        tablist.querySelectorAll('.po-order-tab, .bo-order-tab').forEach(function (btn) {
            var on = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });

        document.querySelectorAll('[id^="' + prefix + '-tab-"]').forEach(function (panel) {
            panel.classList.toggle('active', panel.id === prefix + '-tab-' + tabName);
        });
    }

    function initTablist(tablist) {
        var activeBtn = tablist.querySelector('.po-order-tab.active');
        var initialTab = activeBtn ? activeBtn.getAttribute('data-tab') : 'retailer';
        switchTab(tablist, initialTab);

        tablist.querySelectorAll('.po-order-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchTab(tablist, btn.getAttribute('data-tab'));
            });
        });
    }

    function init() {
        document.querySelectorAll('.po-order-tabs[data-panel-prefix]').forEach(initTablist);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.OrderTabbedLayout = { switchTab: switchTab };
})();
