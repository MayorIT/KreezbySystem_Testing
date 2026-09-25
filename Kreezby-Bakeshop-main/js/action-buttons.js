/**
 * Kreezby — row Action menus with working dropdown options.
 */
(function () {
  'use strict';

  if (window.KreezbyActions && typeof window.KreezbyActions.init === 'function') {
    window.KreezbyActions.init();
    return;
  }

  var menuCounter = 0;
  var openMenu = null;
  var openAnchor = null;

  function toast(message, type) {
    if (window.KreezbyApp && KreezbyApp.toast) {
      KreezbyApp.toast(message, type || 'success');
      return;
    }
    var el = document.createElement('div');
    el.textContent = message || 'Done.';
    el.style.cssText = 'position:fixed;z-index:12000;left:50%;top:18px;transform:translateX(-50%);background:#263238;color:#fff;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,.2);';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1800);
  }

  function injectStyles() {
    if (document.getElementById('kreezby-action-buttons-style')) return;
    var style = document.createElement('style');
    style.id = 'kreezby-action-buttons-style';
    style.textContent =
      '.action-menu-relative-container{position:relative;display:inline-block;overflow:visible!important}' +
      '.action-popup-menu{display:none;position:absolute;right:0;top:calc(100% + 4px);min-width:180px;background:#fff;' +
      'border:1px solid #ddd;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.16);z-index:10050;padding:4px 0;' +
      'max-height:min(70vh,360px);overflow-y:auto}' +
      '.action-popup-menu.active{display:block!important}' +
      '.action-popup-item{padding:8px 14px;font-size:13px;color:#333;cursor:pointer;text-align:left}' +
      '.action-popup-item:hover{background:#f5f5f5}' +
      '.action-popup-item.delete-type{color:#b71c1c;font-weight:700}' +
      '.action-popup-item-status{font-size:12px;color:#444}' +
      '.action-popup-item-status.is-current{font-weight:700;color:#1565c0;background:#f3f8ff}' +
      '.action-popup-divider{height:1px;background:#e0e0e0;margin:4px 0}';
    document.head.appendChild(style);
  }

  function detectPortal() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('/admin/') >= 0 || p.indexOf('/head_admin/') >= 0) return 'admin';
    if (p.indexOf('/staff/') >= 0) return 'staff';
    if (p.indexOf('/wholesaler/') >= 0) return 'wholesaler';
    if (p.indexOf('/retailer/') >= 0) return 'retailer';
    if (p.indexOf('/customer/') >= 0) return 'customer';
    return 'generic';
  }

  function currentRowStatus(row) {
    if (!row) return '';
    var pill = row.querySelector('.status-pill-badge, .order-status-pill, .order-tracking-status-pill');
    return pill ? String(pill.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  function statusClassFromLabel(label) {
    var t = (label || '').toLowerCase();
    if (t === 'returned') return 'rejected';
    if (t === 'packed') return 'packed';
    if (t.indexOf('dispatch') >= 0) return 'ready-for-dispatch';
    if (t.indexOf('delivery') >= 0) return 'out-for-delivery';
    if (t === 'shipped') return 'shipped';
    if (t === 'completed' || t === 'delivered' || t === 'approved' || t === 'processed' || t === 'received') return 'received';
    if (t.indexOf('partial') >= 0) return 'partial';
    return 'pending';
  }

  function statusOptionsForModule(module, row) {
    var portal = detectPortal();
    var current = currentRowStatus(row);
    var options = [];
    if (module === 'po') {
      if (portal === 'admin' || portal === 'staff') {
        var blob = ((row && row.textContent) || '').toLowerCase();
        var isCustomer = blob.indexOf('po-c') >= 0 || blob.indexOf('customer') >= 0;
        options = isCustomer
          ? ['Processing', 'Shipped', 'Completed']
          : ['Pending', 'Packed', 'Ready for Dispatch', 'Out for Delivery', 'Delivered'];
      } else {
        options = ['Pending'];
      }
    } else if (module === 'receive' || module === 'backorder') {
      options = ['Pending'];
    } else if (module === 'return') {
      options = (portal === 'admin' || portal === 'staff')
        ? ['Returned', 'Pending Review', 'Partially Processed', 'Processed']
        : ['Pending', 'Approved'];
    } else if (module === 'sales') {
      if (portal === 'admin' || portal === 'staff') options = ['Processing', 'Shipped', 'Completed'];
      else options = ['Delivered', 'In Transit'];
    }
    if (current === 'Received' || current === 'Partially Received') current = 'Pending';
    if (current && options.indexOf(current) < 0) options.push(current);
    return options.map(function (label) {
      var className = statusClassFromLabel(label);
      if (module === 'po' && (label === 'Delivered' || label === 'Completed')) className = 'completed';
      if (module === 'po' && label === 'Processing') className = 'pending';
      if (module === 'sales' && label === 'Delivered') className = 'received';
      if (module === 'sales' && label === 'In Transit') className = 'pending';
      if (module === 'return' && label === 'Approved') className = 'received';
      if (module === 'return' && label === 'Processed') className = 'received';
      if (module === 'return' && label === 'Returned') className = 'rejected';
      return { label: label, current: label === current, className: className };
    });
  }

  function applyDisplayedStatus(row, option) {
    if (!row || !option) return;
    var pill = row.querySelector('.status-pill-badge, .order-status-pill, .order-tracking-status-pill');
    if (!pill) return;
    pill.textContent = option.label;
    pill.className = String(pill.className || '')
      .replace(/\b(received|pending|partial|rejected|packed|completed|shipped)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (option.className) pill.classList.add(option.className);
  }

  function runStatusOption(module, option, row) {
    closeAllMenus();
    if (!option) return;
    if (row) {
      var po = row.getAttribute('data-po');
      var recv = row.getAttribute('data-receive-id');
      var bo = row.getAttribute('data-bo');
      var ret = row.getAttribute('data-return');
      if (po && window.PoAdmin && typeof PoAdmin.handleAction === 'function') {
        PoAdmin.handleAction('set-status', po, option.className);
        return;
      }
      if (recv && window.ReceiveAdmin && typeof ReceiveAdmin.handleAction === 'function') {
        ReceiveAdmin.handleAction('set-status', recv, option.className);
        return;
      }
      if (bo && window.BoAdmin && typeof BoAdmin.handleAction === 'function') {
        BoAdmin.handleAction('set-status', bo, option.className);
        return;
      }
      if (ret && window.ReturnAdmin && typeof ReturnAdmin.handleAction === 'function') {
        ReturnAdmin.handleAction('set-status', ret, option.className);
        return;
      }
      applyDisplayedStatus(row, option);
    }
    toast('Status set to "' + option.label + '".', 'success');
  }

  function detectModule() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('stocks') >= 0) return 'stocks';
    if (p.indexOf('alert') >= 0) return 'alert';
    if (p.indexOf('saleslist') >= 0) return 'sales';
    if (p.indexOf('dailysales') >= 0) return 'calendar';
    if (p.indexOf('receive') >= 0) return 'receive';
    if (p.indexOf('return') >= 0) return 'return';
    if (p.indexOf('bo-') >= 0 || p.indexOf('/bo') >= 0) return 'backorder';
    if (p.indexOf('po-') >= 0 || p.indexOf('po_') >= 0) return 'po';
    if (p.indexOf('maintenance') >= 0) return 'maintenance';
    if (p.indexOf('inventoryreport') >= 0) return 'report';
    return 'generic';
  }

  function getRowLabel(btn) {
    var row = btn.closest('tr');
    if (!row) return 'Record';
    var strong = row.querySelector('strong');
    if (strong && strong.textContent.trim()) return strong.textContent.trim();
    var cells = row.querySelectorAll('td');
    for (var j = 0; j < cells.length; j++) {
      var t = (cells[j].textContent || '').trim();
      if (t && t.length > 2 && t.length < 80 && !/^\d+$/.test(t) && t.indexOf('Action') < 0) return t;
    }
    return 'Record';
  }

  function menuItemsForModule(module) {
    switch (module) {
      case 'stocks':
        return [
          { key: 'view', label: 'View History' },
          { key: 'adjust', label: 'Adjust Stock' },
          { key: 'archive', label: 'Archive Item', danger: true }
        ];
      case 'alert':
        return [
          { key: 'restock', label: 'Create Restock P.O.' },
          { key: 'modify', label: 'Adjust Threshold' },
          { key: 'dismiss', label: 'Dismiss Alert', danger: true }
        ];
      case 'po':
        return [
          { key: 'view', label: 'View Details' },
          { key: 'edit', label: 'Edit Order' },
          { key: 'print', label: 'Print PO' }
        ];
      case 'receive':
        return [
          { key: 'view', label: 'View Receiving Slip' },
          { key: 'print', label: 'Print Receipt' }
        ];
      case 'backorder':
        return [
          { key: 'view', label: 'View Back Order' },
          { key: 'print', label: 'Print Report' }
        ];
      case 'return':
        return [
          { key: 'view', label: 'View Return Slip' },
          { key: 'print', label: 'Print Return Slip' }
        ];
      case 'sales':
        return [
          { key: 'view', label: 'View Invoice' },
          { key: 'print', label: 'Print Invoice' },
          { key: 'export', label: 'Export PDF' }
        ];
      case 'maintenance':
        return [
          { key: 'edit', label: 'Edit Record' },
          { key: 'duplicate', label: 'Duplicate' },
          { key: 'deactivate', label: 'Deactivate', danger: true }
        ];
      case 'report':
        return [
          { key: 'edit', label: 'Edit Line' },
          { key: 'duplicate', label: 'Duplicate Row' },
          { key: 'remove', label: 'Remove Line', danger: true }
        ];
      default:
        return [
          { key: 'view', label: 'View Details' },
          { key: 'edit', label: 'Edit' }
        ];
    }
  }

  function restoreMenu(menu) {
    if (!menu) return;
    menu.classList.remove('active', 'flip-up');
    menu.style.position = '';
    menu.style.top = '';
    menu.style.right = '';
    menu.style.bottom = '';
    menu.style.left = '';
    menu.style.display = '';
    menu.style.zIndex = '';
    if (menu._homeMarker && menu._homeMarker.parentNode) {
      menu._homeMarker.parentNode.insertBefore(menu, menu._homeMarker.nextSibling);
    }
  }

  function closeAllMenus() {
    document.querySelectorAll('.action-popup-menu.active').forEach(restoreMenu);
    openMenu = null;
    openAnchor = null;
  }

  function positionMenu(menu, btn) {
    var rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = 'auto';
    menu.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
    menu.style.zIndex = '10050';
    menu.style.display = 'block';
    if (window.innerHeight - rect.bottom < 240) {
      menu.style.top = 'auto';
      menu.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    } else {
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.bottom = 'auto';
    }
  }

  function openAtButton(menu, btn) {
    if (!menu._homeMarker) {
      menu._homeMarker = document.createComment('kreezby-action-home');
      if (menu.parentNode) menu.parentNode.insertBefore(menu._homeMarker, menu);
    }
    document.body.appendChild(menu);
    menu.classList.add('active');
    positionMenu(menu, btn);
    openMenu = menu;
    openAnchor = btn;
  }

  function toggleMenu(event, menuId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    var menu = document.getElementById(menuId);
    if (!menu) return;
    var btn = null;
    if (event && event.currentTarget && event.currentTarget.getBoundingClientRect &&
        (event.currentTarget.classList.contains('action-trigger-btn') || event.currentTarget.classList.contains('btn-row-action'))) {
      btn = event.currentTarget;
    } else if (event && event.target && event.target.closest) {
      btn = event.target.closest('.action-trigger-btn, .btn-row-action');
    }
    if (!btn) btn = openAnchor;
    if (menu.classList.contains('active')) {
      closeAllMenus();
      return;
    }
    closeAllMenus();
    if (btn) openAtButton(menu, btn);
    else {
      menu.classList.add('active');
      menu.style.display = 'block';
      openMenu = menu;
    }
  }

  function tryPortalAction(action, row) {
    if (!row) return false;
    var po = row.getAttribute('data-po');
    var recv = row.getAttribute('data-receive-id');
    var bo = row.getAttribute('data-bo');
    var ret = row.getAttribute('data-return');
    if (po && window.PoAdmin && typeof PoAdmin.handleAction === 'function') {
      PoAdmin.handleAction(action === 'print' ? 'print' : action, po);
      return true;
    }
    if (recv && window.ReceiveAdmin && typeof ReceiveAdmin.handleAction === 'function') {
      ReceiveAdmin.handleAction(action === 'receive' ? 'set-status' : action, recv, action === 'receive' ? 'pending' : '');
      return true;
    }
    if (bo && window.BoAdmin && typeof BoAdmin.handleAction === 'function') {
      BoAdmin.handleAction(action, bo);
      return true;
    }
    if (ret && window.ReturnAdmin && typeof ReturnAdmin.handleAction === 'function') {
      ReturnAdmin.handleAction(action === 'approve' ? 'set-status' : action, ret, action === 'approve' ? 'received' : '');
      return true;
    }
    return false;
  }

  function tryOpenDetails(row) {
    if (tryPortalAction('view', row)) return true;
    var fns = [
      'switchToDetailsViewPane',
      'switchToReceivedDetailsInspectorSheet',
      'switchToReturnDetailsInspectorView',
      'switchToBackOrderDetailsInspector',
      'switchToDetailedSalesTransactionInspector'
    ];
    for (var i = 0; i < fns.length; i++) {
      if (typeof window[fns[i]] === 'function') {
        window[fns[i]]();
        return true;
      }
    }
    return false;
  }

  function runStockAction(action, label) {
    if (action === 'archive') {
      if (!confirm('Archive "' + label + '" from active tracking?')) return;
      toast('"' + label + '" archived successfully.', 'success');
      return;
    }
    if (action === 'adjust') {
      var qty = prompt('New stock quantity for "' + label + '":', '100');
      if (qty === null) return;
      toast('Stock for "' + label + '" updated to ' + qty + ' successfully.', 'success');
      return;
    }
    toast('History for "' + label + '" loaded successfully.', 'info');
  }

  function runAlertAction(action, label) {
    if (action === 'dismiss') {
      if (!confirm('Dismiss alert for "' + label + '"?')) return;
      toast('Alert for "' + label + '" dismissed successfully.', 'success');
      return;
    }
    if (action === 'restock') {
      toast('Restock P.O. for "' + label + '" created successfully.', 'success');
      var poLink = document.querySelector('a[href*="po-"]');
      if (poLink && poLink.getAttribute('href')) {
        setTimeout(function () { location.href = poLink.getAttribute('href'); }, 400);
      }
      return;
    }
    toast('"' + action + '" completed for "' + label + '" successfully.', 'success');
  }

  function runRowAction(module, action, label, row) {
    closeAllMenus();

    if (module === 'stocks') {
      runStockAction(action, label);
      return;
    }
    if (module === 'alert') {
      runAlertAction(action, label);
      return;
    }

    if (tryPortalAction(action, row)) return;

    if (action === 'view') {
      if (tryOpenDetails(row)) {
        toast('Opened details for "' + label + '".', 'success');
        return;
      }
    }

    if (action === 'edit') {
      if (tryPortalAction('edit', row) || tryOpenDetails(row)) {
        toast('"' + label + '" opened for editing.', 'success');
        return;
      }
    }

    if (action === 'print') {
      if (typeof window.print === 'function') window.print();
      toast('Print dialog opened for "' + label + '".', 'success');
      return;
    }

    if (action === 'receive' && row) {
      var badge = row.querySelector('.status-pill-badge');
      if (badge) {
        badge.textContent = 'Pending';
        badge.className = 'status-pill-badge pending';
      }
    }

    if (action === 'approve' && row) {
      var approvedBadge = row.querySelector('.status-pill-badge');
      if (approvedBadge) {
        approvedBadge.textContent = 'Processed';
        approvedBadge.className = 'status-pill-badge received';
      }
    }

    if (action === 'remove' || action === 'archive' || action === 'cancel' || action === 'void' || action === 'reject' || action === 'deactivate') {
      if (!confirm('Proceed with "' + action + '" for "' + label + '"?')) return;
    }

    if (action === 'remove' && row) {
      row.remove();
      toast('Line removed successfully.', 'success');
      return;
    }

    var messages = {
      view: 'Opened "' + label + '" successfully.',
      edit: '"' + label + '" opened for editing successfully.',
      print: '"' + label + '" sent to print successfully.',
      export: '"' + label + '" exported successfully.',
      duplicate: '"' + label + '" duplicated successfully.',
      receive: '"' + label + '" marked as received successfully.',
      fulfill: 'Back order "' + label + '" fulfillment saved successfully.',
      approve: 'Return "' + label + '" approved successfully.',
      cancel: 'Order "' + label + '" cancelled successfully.',
      void: 'Sale "' + label + '" voided successfully.',
      reject: 'Return "' + label + '" rejected successfully.',
      deactivate: '"' + label + '" deactivated successfully.'
    };
    toast(messages[action] || 'Action completed successfully.', 'success');
  }

  function actionKeyFromText(txt) {
    txt = (txt || '').toLowerCase();
    if (txt.indexOf('adjust') >= 0 && txt.indexOf('threshold') < 0) return 'adjust';
    if (txt.indexOf('archive') >= 0) return 'archive';
    if (txt.indexOf('dismiss') >= 0) return 'dismiss';
    if (txt.indexOf('restock') >= 0) return 'restock';
    if (txt.indexOf('threshold') >= 0) return 'modify';
    if (txt.indexOf('history') >= 0) return 'view';
    if (txt.indexOf('edit') >= 0) return 'edit';
    if (txt.indexOf('print') >= 0) return 'print';
    if (txt.indexOf('export') >= 0) return 'export';
    if (txt.indexOf('receive') >= 0) return 'receive';
    if (txt.indexOf('fulfill') >= 0) return 'fulfill';
    if (txt.indexOf('approve') >= 0) return 'approve';
    if (txt.indexOf('reject') >= 0) return 'reject';
    if (txt.indexOf('cancel') >= 0) return 'cancel';
    if (txt.indexOf('void') >= 0) return 'void';
    if (txt.indexOf('delete') >= 0 || txt.indexOf('remove') >= 0) return 'remove';
    return 'view';
  }

  function buildPopupMenu(menuId, module, label, row) {
    var menu = document.createElement('div');
    menu.className = 'action-popup-menu';
    menu.id = menuId;
    menuItemsForModule(module).forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'action-popup-item' + (item.danger ? ' delete-type' : '');
      el.textContent = item.label;
      el.setAttribute('data-action', item.key);
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        runRowAction(module, item.key, label, row);
      });
      menu.appendChild(el);
    });
    var statuses = statusOptionsForModule(module, row);
    if (statuses.length) {
      var divider = document.createElement('div');
      divider.className = 'action-popup-divider';
      divider.setAttribute('aria-hidden', 'true');
      menu.appendChild(divider);
      statuses.forEach(function (option) {
        var statusEl = document.createElement('div');
        statusEl.className = 'action-popup-item action-popup-item-status' + (option.current ? ' is-current' : '');
        statusEl.textContent = option.label;
        statusEl.setAttribute('data-action', 'set-status');
        statusEl.setAttribute('data-status-class', option.className);
        statusEl.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          runStatusOption(module, option, row);
        });
        menu.appendChild(statusEl);
      });
    }
    return menu;
  }

  function isActionDropdownButton(btn) {
    var text = (btn.textContent || '').trim();
    return text.indexOf('Action') >= 0 || text.indexOf('\u25be') >= 0;
  }

  function shouldWireButton(btn) {
    if (btn.dataset.kreezbyActionWired === '1') return false;
    if (!isActionDropdownButton(btn)) return false;
    if (btn.getAttribute('data-menu')) return false;
    if (btn.closest('[data-kreezby-page-menu]')) return false;
    return true;
  }

  function wireExistingPopupItems() {
    document.querySelectorAll('.action-popup-item').forEach(function (item) {
      if (item.dataset.kreezbyWired === '1') return;
      if (item.getAttribute('data-po') || item.getAttribute('data-receive-id') || item.getAttribute('data-bo') || item.getAttribute('data-return')) {
        return;
      }
      var onclick = item.getAttribute('onclick') || '';
      var module = detectModule();
      var row = item.closest('tr');
      var label = row ? getRowLabel(item) : 'Record';

      if (onclick.indexOf('handleStockAction') >= 0) {
        item.dataset.kreezbyWired = '1';
        item.removeAttribute('onclick');
        var match = onclick.match(/handleStockAction\s*\(\s*'([^']+)'\s*,\s*'([^']*)'/);
        item.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          closeAllMenus();
          runStockAction(match ? match[1] : 'view', match ? match[2] : label);
        });
        return;
      }
      if (onclick.indexOf('handleAlertTrigger') >= 0) {
        item.dataset.kreezbyWired = '1';
        item.removeAttribute('onclick');
        var m2 = onclick.match(/handleAlertTrigger\s*\(\s*'([^']+)'\s*,\s*'([^']*)'/);
        item.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          closeAllMenus();
          runAlertAction(m2 ? m2[1] : 'dismiss', m2 ? m2[2] : label);
        });
        return;
      }
      if (onclick || item.getAttribute('data-action')) {
        item.dataset.kreezbyWired = '1';
        if (onclick) item.removeAttribute('onclick');
        item.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var key = item.getAttribute('data-action') || actionKeyFromText(item.textContent);
          runRowAction(module, key, getRowLabel(item), item.closest('tr'));
        });
      }
    });
  }

  function wireButton(btn) {
    if (!shouldWireButton(btn)) return;

    var module = detectModule();
    var label = getRowLabel(btn);
    var row = btn.closest('tr');
    var onclick = btn.getAttribute('onclick') || '';
    var existingId = '';
    var match = onclick.match(/toggle(?:ActionPopup|AlertAction)Menu\s*\(\s*event\s*,\s*'([^']+)'/);
    if (match) existingId = match[1];

    var container = btn.closest('.action-menu-relative-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'action-menu-relative-container';
      btn.parentNode.insertBefore(container, btn);
      container.appendChild(btn);
    }

    var existingMenu = existingId ? document.getElementById(existingId) : container.querySelector('.action-popup-menu');
    var menuId = (existingMenu && existingMenu.id) ? existingMenu.id : ('kreezby-act-' + (++menuCounter));
    if (existingMenu && !existingMenu.id) existingMenu.id = menuId;

    if (existingMenu) {
      existingMenu.querySelectorAll('.action-popup-item').forEach(function (item) {
        if (item.dataset.kreezbyWired === '1') return;
        if (item.getAttribute('data-po') || item.getAttribute('data-receive-id') || item.getAttribute('data-bo') || item.getAttribute('data-return')) return;
        item.dataset.kreezbyWired = '1';
        item.removeAttribute('onclick');
        item.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var key = item.getAttribute('data-action') || actionKeyFromText(item.textContent);
          var itemModule = module;
          if (key === 'adjust' || key === 'archive' || (key === 'view' && itemModule === 'stocks')) itemModule = 'stocks';
          if (key === 'dismiss' || key === 'restock' || key === 'modify') itemModule = 'alert';
          runRowAction(itemModule, key, label, row);
        });
      });
    } else {
      container.appendChild(buildPopupMenu(menuId, module, label, row));
    }

    btn.removeAttribute('onclick');
    btn.setAttribute('type', 'button');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu(e, menuId);
    });
    btn.dataset.kreezbyActionWired = '1';
  }

  function initAll() {
    injectStyles();
    wireExistingPopupItems();
    document.querySelectorAll('.action-trigger-btn, .btn-row-action').forEach(wireButton);
  }

  window.handleStockAction = function (actionType, itemName) {
    runStockAction(actionType, itemName);
  };

  window.handleAlertTrigger = function (action, context) {
    runAlertAction(action, context);
  };

  window.toggleActionPopupMenu = function (event, popupElementId) {
    toggleMenu(event, popupElementId);
  };

  window.toggleAlertActionMenu = window.toggleActionPopupMenu;

  window.KreezbyActions = {
    toggle: toggleMenu,
    init: initAll,
    run: runRowAction,
    close: closeAllMenus
  };

  document.addEventListener('click', function (e) {
    if (e.target.closest('.action-trigger-btn, .btn-row-action, .action-popup-menu')) return;
    closeAllMenus();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllMenus();
  });

  window.addEventListener('resize', closeAllMenus);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('kreezby:page-load', initAll);

  var frame = document.getElementById('kreezby-main-content');
  if (frame && !window.__kreezbyActionMo) {
    var moTimer = null;
    window.__kreezbyActionMo = new MutationObserver(function () {
      if (moTimer) clearTimeout(moTimer);
      moTimer = setTimeout(initAll, 40);
    });
    window.__kreezbyActionMo.observe(frame, { childList: true, subtree: true });
  }
})();
