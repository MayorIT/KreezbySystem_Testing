/**
 * In-page tab switching — CSS crossfade only (no layout jumps).
 */
(function () {
    'use strict';

    if (window.KreezbyTabPanels) return;

    function updateTabButtons(tablist, tabName, tabBtnSelector) {
        tablist.querySelectorAll(tabBtnSelector).forEach(function (btn) {
            var on = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', on);
            btn.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

    function switchTab(options) {
        var tablist = options.tablist;
        var tabName = options.tabName;
        var prefix = options.prefix;
        var tabBtnSelector = options.tabBtnSelector || '.po-order-tab, .bo-order-tab';
        var panelSelector = options.panelSelector || '.po-tab-panel, .bo-tab-panel';

        if (!tablist || !prefix || !tabName) return tabName;

        var next = document.getElementById(prefix + '-tab-' + tabName);
        if (!next) return tabName;

        var host = tablist.closest('.po-tabbed-card, .bo-tabbed-card');
        var current = host
            ? host.querySelector(panelSelector + '.active')
            : document.querySelector(panelSelector + '.active');

        if (current === next) return tabName;

        updateTabButtons(tablist, tabName, tabBtnSelector);

        if (current) current.classList.remove('active');
        next.classList.add('active');

        return tabName;
    }

    function wireTablist(tablist, config) {
        var tabBtnSelector = config.tabBtnSelector || '.po-order-tab, .bo-order-tab';
        var prefix = config.prefix;

        tablist.querySelectorAll(tabBtnSelector).forEach(function (btn) {
            if (btn.dataset.tabWired === '1') return;
            btn.dataset.tabWired = '1';
            btn.addEventListener('click', function () {
                switchTab({
                    tablist: tablist,
                    tabName: btn.getAttribute('data-tab'),
                    prefix: prefix,
                    tabBtnSelector: tabBtnSelector,
                    panelSelector: config.panelSelector
                });
            });
        });
    }

    window.KreezbyTabPanels = {
        switch: switchTab,
        wire: wireTablist
    };
})();
