/**
 * Centralized loader for retailer/store data from data/retailers/_manifest.json
 * Provides access to all stores, areas, and store metadata throughout the application.
 */
(function () {
  'use strict';

  if (window.KreezbyRetailerManifest) {
    return; // Already loaded
  }

  var MANIFEST_URL = '../../data/retailers/_manifest.json';
  var cache = null;
  var loading = false;
  var loadPromise = null;

  /**
   * Load manifest data from JSON file
   */
  function loadManifest() {
    if (cache) {
      return Promise.resolve(cache);
    }

    if (loading) {
      return loadPromise;
    }

    loading = true;
    loadPromise = fetch(MANIFEST_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load manifest: ' + response.statusText);
        }
        return response.json();
      })
      .then(function (data) {
        cache = data;
        loading = false;
        return cache;
      })
      .catch(function (error) {
        console.error('Error loading retailer manifest:', error);
        loading = false;
        return {}; // Return empty object if load fails
      });

    return loadPromise;
  }

  /**
   * Get all stores organized by area
   */
  function getStoresByArea() {
    return loadManifest().then(function (manifest) {
      var byArea = {};
      Object.keys(manifest).forEach(function (key) {
        var store = manifest[key];
        if (!byArea[store.area]) {
          byArea[store.area] = [];
        }
        byArea[store.area].push(store);
      });
      return byArea;
    });
  }

  /**
   * Get all unique areas
   */
  function getAreas() {
    return loadManifest().then(function (manifest) {
      var areas = {};
      Object.keys(manifest).forEach(function (key) {
        var store = manifest[key];
        areas[store.area] = true;
      });
      return Object.keys(areas).sort();
    });
  }

  /**
   * Get area display name (formatted)
   */
  function getAreaLabel(areaSlug) {
    var labels = {
      bauan: 'Bauan',
      batangas: 'Batangas',
      citimart: 'Citimart',
      lipa: 'Lipa',
      lucena: 'Lucena',
      manila: 'Manila',
      rosario: 'Rosario',
      stotomas: 'Sto. Tomas',
      tagaytay: 'Tagaytay'
    };
    return labels[areaSlug] || areaSlug;
  }

  /**
   * Get all stores for a specific area
   */
  function getStoresForArea(areaSlug) {
    return loadManifest().then(function (manifest) {
      return Object.keys(manifest)
        .filter(function (key) {
          return manifest[key].area === areaSlug;
        })
        .map(function (key) {
          return manifest[key];
        });
    });
  }

  /**
   * Get store by slug
   */
  function getStoreBySlug(slug) {
    return loadManifest().then(function (manifest) {
      return Object.keys(manifest)
        .map(function (key) {
          return manifest[key];
        })
        .find(function (store) {
          return store.slug === slug;
        });
    });
  }

  /**
   * Get store by name (case-insensitive)
   */
  function getStoreByName(name) {
    return loadManifest().then(function (manifest) {
      var nameLower = String(name || '').toLowerCase().trim();
      return Object.keys(manifest)
        .map(function (key) {
          return manifest[key];
        })
        .find(function (store) {
          return String(store.storeName || '').toLowerCase().trim() === nameLower;
        });
    });
  }

  /**
   * Get all stores as array
   */
  function getAllStores() {
    return loadManifest().then(function (manifest) {
      return Object.keys(manifest).map(function (key) {
        return manifest[key];
      });
    });
  }

  /**
   * Build area configuration for delivery schedule and forms
   * Returns array of { name, stores } for each area
   */
  function getAreaConfiguration() {
    return getStoresByArea().then(function (byArea) {
      var areaConfig = [];
      Object.keys(byArea).sort().forEach(function (areaSlug) {
        var stores = byArea[areaSlug];
        areaConfig.push({
          name: getAreaLabel(areaSlug),
          slug: areaSlug,
          stores: stores.map(function (s) { return s.storeName; })
        });
      });
      return areaConfig;
    });
  }

  // Export API
  window.KreezbyRetailerManifest = {
    loadManifest: loadManifest,
    getStoresByArea: getStoresByArea,
    getAreas: getAreas,
    getAreaLabel: getAreaLabel,
    getStoresForArea: getStoresForArea,
    getStoreBySlug: getStoreBySlug,
    getStoreByName: getStoreByName,
    getAllStores: getAllStores,
    getAreaConfiguration: getAreaConfiguration
  };

})();
