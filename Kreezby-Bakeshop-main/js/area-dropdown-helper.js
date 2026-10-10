/**
 * Helper script to populate area dropdowns from retailer manifest.
 * Used by PO, Maintenance, and other forms that need dynamic area lists.
 */
(function () {
  'use strict';

  /**
   * Populate an area select element with options from manifest
   */
  function populateAreaDropdown(selectElement, defaultAreaSlug, labelAttribute) {
    if (!selectElement) return;

    // Check if manifest loader is available
    if (!window.KreezbyRetailerManifest || typeof window.KreezbyRetailerManifest.getAreaConfiguration !== 'function') {
      console.warn('KreezbyRetailerManifest not available, area dropdown not populated');
      return;
    }

    window.KreezbyRetailerManifest.getAreaConfiguration().then(function(areasConfig) {
      // Clear existing options except the first placeholder one
      var options = selectElement.querySelectorAll('option');
      for (var i = options.length - 1; i > 0; i--) {
        selectElement.removeChild(options[i]);
      }

      // Add area options
      areasConfig.forEach(function(area) {
        var option = document.createElement('option');
        option.value = labelAttribute === 'slug' ? area.slug : area.name;
        option.textContent = area.name;
        if (defaultAreaSlug && area.slug === defaultAreaSlug) {
          option.selected = true;
        }
        selectElement.appendChild(option);
      });
    }).catch(function(error) {
      console.error('Error populating area dropdown:', error);
    });
  }

  /**
   * Populate a retailer/store select element for a specific area
   */
  function populateStoreDropdown(selectElement, areaSlug) {
    if (!selectElement) return;

    if (!window.KreezbyRetailerManifest || typeof window.KreezbyRetailerManifest.getStoresForArea !== 'function') {
      console.warn('KreezbyRetailerManifest not available, store dropdown not populated');
      return;
    }

    window.KreezbyRetailerManifest.getStoresForArea(areaSlug).then(function(stores) {
      // Clear existing options except placeholder
      var options = selectElement.querySelectorAll('option');
      for (var i = options.length - 1; i > 0; i--) {
        selectElement.removeChild(options[i]);
      }

      // Add store options
      stores.forEach(function(store) {
        var option = document.createElement('option');
        option.value = store.storeName;
        option.textContent = store.storeName;
        selectElement.appendChild(option);
      });
    }).catch(function(error) {
      console.error('Error populating store dropdown:', error);
    });
  }

  // Export API
  window.KreezbyAreaDropdownHelper = {
    populateAreaDropdown: populateAreaDropdown,
    populateStoreDropdown: populateStoreDropdown
  };

  // Auto-populate on page load
  document.addEventListener('DOMContentLoaded', function() {
    // Find all area dropdowns with data-populate-from-manifest attribute
    document.querySelectorAll('select[data-populate-areas-from-manifest]').forEach(function(select) {
      var defaultArea = select.getAttribute('data-default-area');
      var labelAttr = select.getAttribute('data-label-attribute') || 'name';
      populateAreaDropdown(select, defaultArea, labelAttr);
    });
  });

})();
