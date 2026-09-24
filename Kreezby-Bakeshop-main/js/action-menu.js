/**
 * Shared action-menu behavior for pages that use `.action-trigger-btn`.
 *
 * Features:
 * - Toggle an existing sibling `.action-popup-menu` (if provided by the page).
 * - If the page has no menu markup, auto-create one with:
 *   - View (scrolls to detail panel if present; otherwise shows a notice)
 *   - Delete (removes the row/card after confirmation)
 *   - Status Legend (if status badges are used on the page)
 * - Make `.delete-type` menu items actually remove the row when clicked.
 */
(function () {
    'use strict';
    // Marker so other bootstrap scripts don't load this twice.
    window.KreezbyActionMenuLoaded = true;

    function closest(el, selector) {
        while (el && el.nodeType === 1) {
            if (el.matches(selector)) return el;
            el = el.parentElement;
        }
        return null;
    }

    function findMenuForButton(btn) {
        // Common pattern: same container holds button + menu
        var container = closest(btn, '.action-menu-relative-container') || btn.parentElement;
        if (!container) return null;
        return container.querySelector('.action-popup-menu');
    }

    function ensureContainer(btn) {
        var container = closest(btn, '.action-menu-relative-container');
        if (container) return container;
        // Wrap in a relative container so the popup can anchor correctly.
        var wrap = document.createElement('div');
        wrap.className = 'action-menu-relative-container';
        wrap.style.position = 'relative';
        btn.parentNode.insertBefore(wrap, btn);
        wrap.appendChild(btn);
        return wrap;
    }

    function isPortalPage() {
        return !!(window.PoAdmin || window.ReceiveAdmin || window.BoAdmin || window.ReturnAdmin);
    }

    function closeAllMenus() {
        if (window.ReturnAdmin && typeof ReturnAdmin.closeMenus === 'function') {
            ReturnAdmin.closeMenus();
            return;
        }
        if (window.PoAdmin && typeof PoAdmin.closeMenus === 'function') {
            PoAdmin.closeMenus();
            return;
        }
        if (window.ReceiveAdmin && typeof ReceiveAdmin.closeMenus === 'function') {
            ReceiveAdmin.closeMenus();
            return;
        }
        if (window.BoAdmin && typeof BoAdmin.closeMenus === 'function') {
            BoAdmin.closeMenus();
            return;
        }
        document.querySelectorAll('.action-popup-menu.active').forEach(function (m) {
            m.classList.remove('active', 'flip-up');
            m.style.removeProperty('display');
        });
    }

    function setMenuOpen(menu, open) {
        if (!menu) return;
        if (open) {
            menu.classList.add('active');
            menu.style.removeProperty('display');
        } else {
            menu.classList.remove('active', 'flip-up');
            menu.style.removeProperty('display');
        }
    }

    function showToast(message) {
        // Avoid annoying repeated alerts by using a small transient tooltip-like message.
        var msg = document.createElement('div');
        msg.textContent = message || 'Done.';
        msg.style.cssText =
            'position:fixed;z-index:9999;left:50%;top:18px;transform:translateX(-50%);' +
            'background:#263238;color:#fff;padding:10px 14px;border-radius:8px;' +
            'font-size:13px;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,.2);';
        document.body.appendChild(msg);
        window.setTimeout(function () {
            if (msg && msg.parentNode) msg.parentNode.removeChild(msg);
        }, 1200);
    }

    function buildAutoMenu(btn) {
        var container = ensureContainer(btn);
        var menu = document.createElement('div');
        menu.className = 'action-popup-menu';
        // Inline fallback styling in case the page CSS didn't define the popup menu.
        menu.style.cssText =
            'position:absolute;right:0;top:calc(100% + 8px);min-width:180px;background:#fff;' +
            'border:1px solid rgba(0,0,0,.12);border-radius:10px;box-shadow:0 12px 26px rgba(0,0,0,.18);' +
            'padding:6px;display:none;z-index:2000;';

        var view = document.createElement('div');
        view.className = 'action-popup-item';
        view.textContent = 'View';
        view.style.cssText = 'padding:10px 12px;border-radius:8px;cursor:pointer;font-weight:700;color:#263238;';
        view.setAttribute('data-action', 'view');

        var del = document.createElement('div');
        del.className = 'action-popup-item delete-type';
        del.textContent = 'Delete';
        del.style.cssText = 'padding:10px 12px;border-radius:8px;cursor:pointer;font-weight:800;color:#b71c1c;';
        del.setAttribute('data-action', 'delete');

        menu.appendChild(view);
        menu.appendChild(del);

        container.appendChild(menu);
        return menu;
    }

    function deleteOwningNode(el) {
        var tr = closest(el, 'tr');
        if (tr) {
            tr.parentNode.removeChild(tr);
            return true;
        }
        var card = closest(el, '.panel-data-card, .stat-card, .notification-item, .image-attachment-card');
        if (card) {
            card.parentNode.removeChild(card);
            return true;
        }
        return false;
    }

    function tryOpenDetailPanel(contextEl) {
        var poCode = null;
        var receiveId = null;

        if (contextEl) {
            poCode = contextEl.getAttribute('data-po');
            receiveId = contextEl.getAttribute('data-receive-id');
            if (!poCode || !receiveId) {
                var row = closest(contextEl, 'tr[data-po], tr[data-receive-id]');
                if (row) {
                    poCode = poCode || row.getAttribute('data-po');
                    receiveId = receiveId || row.getAttribute('data-receive-id');
                }
            }
        }

        if (poCode && window.PoAdmin && typeof PoAdmin.openDetails === 'function') {
            PoAdmin.openDetails(poCode);
            return true;
        }
        if (receiveId && window.ReceiveAdmin && typeof ReceiveAdmin.openDetails === 'function') {
            ReceiveAdmin.openDetails(receiveId);
            return true;
        }
        if (poCode && typeof window.switchToDetailsViewPane === 'function') {
            window.switchToDetailsViewPane(poCode);
            return true;
        }
        if (receiveId && typeof window.switchToReceivedDetailsInspectorSheet === 'function') {
            window.switchToReceivedDetailsInspectorSheet(receiveId);
            return true;
        }

        // Common patterns used in admin pages (legacy pages without row ids)
        var fns = [
            'switchToReturnDetailsInspectorView',
            'switchToReceivedDetailsInspectorSheet',
            'switchToBackOrderDetailsInspector',
            'switchToDetailsViewPane'
        ];
        for (var i = 0; i < fns.length; i++) {
            var fn = window[fns[i]];
            if (typeof fn === 'function') {
                fn();
                return true;
            }
        }
        return false;
    }

    function tryHandlePortalAction(item) {
        if (!item) return false;
        var action = item.getAttribute('data-action');
        var poCode = item.getAttribute('data-po');
        var receiveId = item.getAttribute('data-receive-id');
        var statusClass = item.getAttribute('data-status-class');
        if (poCode && window.PoAdmin && typeof PoAdmin.handleAction === 'function') {
            PoAdmin.handleAction(action, poCode, statusClass);
            return true;
        }
        if (receiveId && window.ReceiveAdmin && typeof ReceiveAdmin.handleAction === 'function') {
            ReceiveAdmin.handleAction(action, receiveId, statusClass);
            return true;
        }
        return false;
    }

    document.addEventListener('click', function (event) {
        if (window.KreezbyActions) return;
        if (isPortalPage()) return;

        // PO / Receiving portal menus (staff, admin, retailer) — legacy fallback only
        var portalItem = closest(event.target, '.action-popup-item[data-action][data-po], .action-popup-item[data-action][data-receive-id]');
        if (portalItem && portalItem.closest('[data-kreezby-page-menu]')) {
            if (tryHandlePortalAction(portalItem)) {
                event.preventDefault();
                event.stopPropagation();
                closeAllMenus();
                return;
            }
        }

        // Handle delete menu items (including those already in HTML with class delete-type)
        var deleteItem = closest(event.target, '.action-popup-item.delete-type,[data-action="delete"]');
        if (deleteItem && !deleteItem.getAttribute('onclick')) {
            event.preventDefault();
            event.stopPropagation();
            closeAllMenus();
            if (!confirm('Delete this item? This will remove it from the list (prototype UI).')) return;
            if (deleteOwningNode(deleteItem)) {
                showToast('Deleted.');
            } else {
                showToast('Nothing to delete.');
            }
            return;
        }

        // Handle "View" in legacy auto menus (capture phase) — skip portal row menus
        var viewItem = closest(event.target, '.action-popup-item[data-action="view"]');
        if (viewItem && !viewItem.getAttribute('data-return') && !viewItem.closest('[data-kreezby-page-menu]')) {
            event.preventDefault();
            event.stopPropagation();
            closeAllMenus();
            if (!tryOpenDetailPanel(viewItem)) {
                showToast('No detail view on this page.');
            }
            return;
        }
    }, true);

    document.addEventListener('click', function (event) {
        if (window.KreezbyActions) return;
        if (isPortalPage()) return;

        var btn = closest(event.target, 'button.action-trigger-btn');
        if (!btn) {
            closeAllMenus();
            return;
        }

        if (btn.getAttribute('data-menu') || btn.closest('[data-kreezby-page-menu]')) {
            return;
        }

        if (btn.getAttribute('onclick')) {
            return;
        }

        var existingSiblingMenu = btn.parentElement && btn.parentElement.querySelector('.action-popup-menu');
        if (existingSiblingMenu) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        var menu = findMenuForButton(btn);
        if (!menu) menu = buildAutoMenu(btn);
        var willOpen = !menu.classList.contains('active');
        closeAllMenus();
        setMenuOpen(menu, willOpen);
    }, true);
})();

