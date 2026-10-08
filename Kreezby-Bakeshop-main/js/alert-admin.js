(function () {
    'use strict';

    function master() {
        return document.getElementById('alert-master');
    }

    function toast(message) {
        if (window.KreezbyAlert && window.KreezbyAlert.show) {
            window.KreezbyAlert.show({
                title: 'Alert',
                description: message,
                variant: 'success',
                toast: true,
                close: true,
                autoDismissMs: 2800
            });
        }
    }

    function closeMenus() {
        document.querySelectorAll('#alert-master .action-popup-menu.active').forEach(function (menu) {
            menu.classList.remove('active');
            menu.style.position = '';
            menu.style.top = '';
            menu.style.right = '';
            menu.style.bottom = '';
            menu.style.left = '';
            menu.style.display = '';
            menu.style.zIndex = '';
        });
    }

    function toggleMenu(button) {
        var menu = button.parentNode.querySelector('.action-popup-menu');
        if (!menu) return;
        var open = menu.classList.contains('active');
        closeMenus();
        if (open) return;
        var rect = button.getBoundingClientRect();
        menu.classList.add('active');
        menu.style.position = 'fixed';
        menu.style.left = 'auto';
        menu.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
        menu.style.zIndex = '10050';
        menu.style.display = 'block';
        if (window.innerHeight - rect.bottom < 180) {
            menu.style.top = 'auto';
            menu.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
        } else {
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.bottom = 'auto';
        }
    }

    function go(href) {
        var link = document.createElement('a');
        link.href = href;
        link.setAttribute('data-turbo-frame', 'kreezby-main-content');
        link.setAttribute('data-turbo-action', 'advance');
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function applyFilter() {
        var root = master();
        if (!root) return;
        var query = ((root.querySelector('#alert-search') || {}).value || '').toLowerCase().trim();
        var size = parseInt((root.querySelector('#alert-show') || {}).value, 10) || 10;
        var rows = Array.from(root.querySelectorAll('#alert-table tbody tr'));
        var shown = 0;
        var counts = { critical: 0, warning: 0, info: 0 };
        rows.forEach(function (row) {
            if (row.getAttribute('data-dismissed') === '1') {
                row.hidden = true;
                return;
            }
            var match = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
            var visible = match && shown < size;
            row.hidden = !visible;
            if (!visible) return;
            shown += 1;
            var num = row.querySelector('.po-col-num');
            if (num) num.textContent = String(shown);
            var severity = (row.getAttribute('data-severity') || '').toLowerCase();
            if (counts[severity] != null) counts[severity] += 1;
        });
        var count = document.getElementById('alert-count');
        if (count) count.textContent = shown ? String(shown) : '';
        var totals = document.getElementById('alert-totals');
        if (!totals) return;
        if (!shown) {
            totals.textContent = 'No alerts match this search.';
            return;
        }
        totals.textContent = shown + (shown === 1 ? ' alert' : ' alerts')
            + ' · ' + counts.critical + ' critical · ' + counts.warning + ' warning · ' + counts.info + ' info';
    }

    function closeDetails() {
        var list = document.getElementById('alert-list-panel');
        var panel = document.getElementById('alert-details-panel');
        if (list) list.hidden = false;
        if (panel) panel.hidden = true;
        var root = master();
        if (root) root._alertRow = null;
    }

    function openDetails(row) {
        var list = document.getElementById('alert-list-panel');
        var panel = document.getElementById('alert-details-panel');
        var body = document.getElementById('alert-details-body');
        if (!list || !panel || !body || !row) return;
        var root = master();
        if (root) root._alertRow = row;
        var source = row.getAttribute('data-source') || '';
        var severity = row.getAttribute('data-severity') || '';
        var message = (row.querySelector('.al-message') || {}).textContent || '';
        var actions = (row.getAttribute('data-actions') || '').split(',').filter(Boolean);
        var buttons = actions.map(function (key) {
            var label = key === 'restock' ? 'Create Restock P.O.'
                : key === 'modify' ? 'Adjust Threshold'
                : key === 'view' ? (/ret-/i.test(source) ? 'Inspect Return Slip' : 'View Back Order')
                : 'Dismiss Alert';
            var extra = key === 'dismiss' ? ' dismiss-action' : '';
            return '<button type="button" class="action-popup-item' + extra + '" data-alert-action="' + key + '">' + label + '</button>';
        }).join('');
        body.innerHTML = ''
            + '<div><div class="alert-detail-label">Trigger source</div><div class="alert-detail-value">' + source + '</div></div>'
            + '<div><div class="alert-detail-label">Timestamp</div><div class="alert-detail-value">' + (row.getAttribute('data-time') || '') + '</div></div>'
            + '<div><div class="alert-detail-label">Severity</div><div class="alert-detail-value"><span class="severity-badge ' + severity.toLowerCase() + '">' + severity + '</span></div></div>'
            + '<div><div class="alert-detail-label">Message</div><div class="alert-detail-value">' + message + '</div></div>'
            + '<div id="alert-details-actions">' + buttons + '</div>';
        list.hidden = true;
        panel.hidden = false;
    }

    function runAction(action, row) {
        if (!row) return;
        var name = row.getAttribute('data-source') || 'this item';
        closeMenus();
        if (action === 'dismiss') {
            if (!window.confirm('Dismiss the alert for "' + name + '"?')) return;
            row.setAttribute('data-dismissed', '1');
            row.hidden = true;
            closeDetails();
            applyFilter();
            toast('Alert for "' + name + '" is dismissed.');
            return;
        }
        if (action === 'restock') {
            toast('Opening purchase orders so you can restock "' + name + '".');
            go('po-headadmin.html');
            return;
        }
        if (action === 'modify') {
            var next = window.prompt('New reorder threshold for "' + name + '":', '100');
            if (next === null) return;
            toast('Threshold for "' + name + '" is now ' + next + '.');
            return;
        }
        if (action === 'view') {
            go(/ret-/i.test(name) ? 'return-headadmin.html' : 'bo-headadmin.html');
        }
    }

    function onDocClick(ev) {
        var root = master();
        if (!root || !ev.target || !ev.target.closest) return;
        var dismiss = ev.target.closest('[data-kreezby-alert-dismiss]');
        if (dismiss && root.contains(dismiss)) {
            var banner = dismiss.closest('[data-kreezby-alert]');
            if (banner) banner.classList.add('is-dismissed');
            return;
        }
        var action = ev.target.closest('[data-alert-action]');
        if (action && root.contains(action)) {
            ev.preventDefault();
            ev.stopPropagation();
            runAction(action.getAttribute('data-alert-action'), action.closest('tr') || root._alertRow);
            return;
        }
        var button = ev.target.closest('[data-alert-menu]');
        if (button && root.contains(button)) {
            ev.preventDefault();
            ev.stopPropagation();
            toggleMenu(button);
            return;
        }
        if (ev.target.closest('#alert-back')) {
            ev.preventDefault();
            closeDetails();
            return;
        }
        var row = ev.target.closest('#alert-table tbody tr');
        if (row && root.contains(row) && !row.hidden && !ev.target.closest('[data-kreezby-page-menu]')) {
            openDetails(row);
            return;
        }
        if (!ev.target.closest('#alert-master .action-popup-menu')) closeMenus();
    }

    function onInput(ev) {
        if (!ev.target || ev.target.id !== 'alert-search') return;
        applyFilter();
    }

    function onChange(ev) {
        if (!ev.target || ev.target.id !== 'alert-show') return;
        applyFilter();
    }

    function bind() {
        if (!master()) return;
        if (window.__kreezbyAlertDocClick) document.removeEventListener('click', window.__kreezbyAlertDocClick, true);
        if (window.__kreezbyAlertInput) document.removeEventListener('input', window.__kreezbyAlertInput);
        if (window.__kreezbyAlertChange) document.removeEventListener('change', window.__kreezbyAlertChange);
        window.__kreezbyAlertDocClick = onDocClick;
        window.__kreezbyAlertInput = onInput;
        window.__kreezbyAlertChange = onChange;
        document.addEventListener('click', onDocClick, true);
        document.addEventListener('input', onInput);
        document.addEventListener('change', onChange);
        applyFilter();
    }

    window.AlertAdmin = { bind: bind, filter: applyFilter, close: closeDetails };

    if (!window.__kreezbyAlertPageHook) {
        window.__kreezbyAlertPageHook = true;
        document.addEventListener('kreezby:page-load', function () {
            if (master()) bind();
        });
    }

    bind();
})();
