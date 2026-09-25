/**

 * Stock Level filter pills — SPA-style panel swap (same pattern as AI Forecast).

 */

(function () {

    'use strict';



    var VIEWS = [

        { key: 'units', label: 'Total Stock Units', slug: 'stocklevel' },

        { key: 'value', label: 'Total Value of Stock', slug: 'stocklevel-value' },

        { key: 'capacity', label: 'Stock Capacity', slug: 'stocklevel-capacity' },

        { key: 'weeks', label: 'Weeks of Stock', slug: 'stocklevel-weeks' },

        { key: 'health', label: 'Stock Health', slug: 'stocklevel-health' },

        { key: 'alerts', label: 'Low Stock Alerts', slug: 'stocklevel-alerts' },

        { key: 'category', label: 'Stock by Category', slug: 'stocklevel-category' },

        { key: 'slow', label: 'Slow Moving Stock', slug: 'stocklevel-slow' },

        { key: 'chart', label: 'Stock Value vs Sales', slug: 'stocklevel-chart' }

    ];



    function roleSuffix() {

        if (location.pathname.indexOf('/staff/') !== -1) return 'staff';
        if (location.pathname.indexOf('/head_admin/') !== -1) return 'headadmin';
        return 'admin';

    }



    function hrefFor(slug) {

        return slug + '-' + roleSuffix() + '.html';

    }



    function buildPills(container) {

        var currentFile = location.pathname.split('/').pop();

        container.innerHTML = VIEWS.map(function (view) {

            var href = hrefFor(view.slug);

            var active = href === currentFile ? ' active' : '';

            return '<a class="pill' + active + '" href="' + href + '" data-key="' + view.key + '">' + view.label + '</a>';

        }).join('');

    }



    function initPills() {

        var containers = document.querySelectorAll('#stocklevel-filter-pills');

        containers.forEach(function (container) {

            buildPills(container);

            var pills = Array.from(container.querySelectorAll('.pill'));

            var currentFile = location.pathname.split('/').pop();

            var found = pills.some(function (p) {

                return filenameOf(p.getAttribute('href')) === currentFile;

            });

            if (!found && pills[0]) {

                pills[0].classList.add('active');

            }

        });

    }



    async function fetchPanel(href) {

        try {

            var res = await fetch(href, { credentials: 'same-origin' });

            if (!res.ok) throw new Error('fetch failed');

            var text = await res.text();

            var parser = new DOMParser();

            var doc = parser.parseFromString(text, 'text/html');

            var remotePanel = doc.querySelector('.panel-data-card');

            return remotePanel ? remotePanel.innerHTML : null;

        } catch (e) {

            return null;

        }

    }



    function setActive(pills, activeEl) {

        pills.forEach(function (p) {

            p.classList.toggle('active', p === activeEl);

        });

    }



    function filenameOf(url) {

        try {

            return (new URL(url, location.href)).pathname.split('/').pop();

        } catch (e) {

            return url;

        }

    }



    var clicksWired = false;



    function wirePillClicks() {

        if (clicksWired) return;

        clicksWired = true;

        document.addEventListener('click', async function (ev) {

            var target = ev.target.closest('#stocklevel-filter-pills .pill');

            if (!target) return;

            ev.preventDefault();



            var container = document.getElementById('stocklevel-filter-pills');

            if (!container) return;



            var href = target.getAttribute('href');

            if (!href) return;



            var pills = Array.from(container.querySelectorAll('.pill'));

            setActive(pills, target);



            var panelHTML = await fetchPanel(href);

            if (panelHTML !== null) {

                var existing = document.querySelector('.panel-data-card');

                if (existing) {

                    existing.innerHTML = panelHTML;

                    try {

                        history.pushState({}, '', href);

                    } catch (e) { /* ignore */ }

                    initPills();

                    document.dispatchEvent(new Event('content:replaced'));

                } else {

                    location.href = href;

                }

            } else {

                location.href = href;

            }

        });

    }



    function bootPills() {

        if (!document.querySelector('#stocklevel-filter-pills')) return;

        initPills();

        wirePillClicks();

    }



    document.addEventListener('DOMContentLoaded', bootPills);

    document.addEventListener('content:replaced', bootPills);

    document.addEventListener('kreezby:page-load', bootPills);

    document.addEventListener('turbo:frame-load', function (event) {

        if (event.target && event.target.id === 'kreezby-main-content') bootPills();

    });



    window.KreezbyStockLevelPills = { boot: bootPills, init: initPills };

})();


