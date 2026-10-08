/**
 * Uiverse-style flavor cards for customer shop grids.
 */
(function () {
    'use strict';

    var HEART_SVG =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.33-8.2C.7 9.9 1.53 5.68 5.53 4.6c2.23-.6 4.27.23 5.47 1.93 1.2-1.7 3.24-2.53 5.47-1.93 4 1.08 4.83 5.3 2.86 8.2C18.7 16.65 12 21 12 21z"/></svg>';

    function imgFallback(name) {
        var label = encodeURIComponent(name);
        return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%25' height='100%25' fill='%23eee'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23999'>" + label + '</text></svg>';
    }

    function flavorCardHtml(prod, options) {
        var guest = options && options.guest;
        var onerror = "this.src='" + imgFallback(prod.name) + "'";
        var isFavorite = false;
        try {
            isFavorite = !guest && typeof window.isFavoriteProduct === 'function' && window.isFavoriteProduct(prod.id);
        } catch (err) {
            isFavorite = false;
        }
        var footerButton = guest
            ? ''
                        : '<button type="button" class="flavor-card__button' + (isFavorite ? ' is-favorite' : '') + '" onclick="toggleFavoriteProduct(\'' + prod.id + '\', this)" aria-label="' + (isFavorite ? 'Remove ' : 'Add ') + prod.name + ' ' + (isFavorite ? 'from' : 'to') + ' favorites" aria-pressed="' + (isFavorite ? 'true' : 'false') + '">' +
                HEART_SVG +
              '</button>';

        var actions = guest
            ? '<div class="guest-action-group">' +
                '<button type="button" class="btn-view-only" disabled>View Only (Guest)</button>' +
                '<a href="../auth/log_in.html" class="btn-guest-action">Order Now</a>' +
              '</div>'
            : '<div class="flavor-card__actions">' +
                '<div class="counter-widget">' +
                    '<button type="button" class="counter-btn" onclick="adjustCardWidgetQtyState(\'' + prod.id + '\', -1)">-</button>' +
                    '<span class="counter-value" id="qty-val-' + prod.id + '">1</span>' +
                    '<button type="button" class="counter-btn" onclick="adjustCardWidgetQtyState(\'' + prod.id + '\', 1)">+</button>' +
                '</div>' +
                '<button type="button" class="add-cart-btn" onclick="commitItemToCartState(\'' + prod.id + '\')">Add To Cart Bag</button>' +
              '</div>';

        return (
            '<article class="flavor-card">' +
                '<div class="flavor-card__shine" aria-hidden="true"></div>' +
                '<div class="flavor-card__glow" aria-hidden="true"></div>' +
                '<div class="flavor-card__content">' +
                    '<span class="flavor-card__badge">Fresh</span>' +
                    '<div class="flavor-card__image">' +
                        '<img src="' + prod.img + '" alt="' + prod.name + '" onerror="' + onerror + '">' +
                    '</div>' +
                    '<div class="flavor-card__text">' +
                        '<h4 class="flavor-card__title">' + prod.name + '</h4>' +
                        '<p class="flavor-card__description">' + prod.variant + '</p>' +
                    '</div>' +
                    '<div class="flavor-card__footer">' +
                        '<span class="flavor-card__price">₱' + prod.cost.toFixed(2) + '</span>' +
                        footerButton +
                    '</div>' +
                    actions +
                '</div>' +
            '</article>'
        );
    }

    function resolveCategory(prod) {
        var variant = String((prod && prod.variant) || '').toLowerCase();
        if (variant.indexOf('jar') >= 0) {
            return {
                key: 'jar-specials',
                title: 'Jar Specials',
                description: 'Premium crinkles packed in resealable jars for sharing and gifting.'
            };
        }

        return {
            key: 'pouch-favorites',
            title: 'Pouch Favorites',
            description: 'Fresh everyday crinkle selections in easy-to-carry pouches.'
        };
    }

    function categorySectionHtml(category, items, options) {
        return (
            '<section class="shop-category shop-category--' + category.key + '">' +
                '<div class="shop-category__header">' +
                    '<div>' +
                        '<p class="shop-category__eyebrow">Product Category</p>' +
                        '<h4 class="shop-category__title">' + category.title + '</h4>' +
                        '<p class="shop-category__description">' + category.description + '</p>' +
                    '</div>' +
                    '<span class="shop-category__count">' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</span>' +
                '</div>' +
                '<div class="menu-grid shop-category__grid">' +
                    items.map(function (prod) { return flavorCardHtml(prod, options); }).join('') +
                '</div>' +
            '</section>'
        );
    }

    function renderShopMenuGridCards(catalog, containerId, options) {
        var grid = document.getElementById(containerId || 'shop-menu-container');
        if (!grid || !catalog || !catalog.length) return;

        var grouped = {};
        var order = [];

        catalog.forEach(function (prod) {
            var category = resolveCategory(prod);
            if (!grouped[category.key]) {
                grouped[category.key] = {
                    meta: category,
                    items: []
                };
                order.push(category.key);
            }
            grouped[category.key].items.push(prod);
        });

        grid.innerHTML = order.map(function (key) {
            var group = grouped[key];
            return categorySectionHtml(group.meta, group.items, options);
        }).join('');
    }

    window.KreezbyFlavorCards = {
        render: renderShopMenuGridCards,
        html: flavorCardHtml
    };
})();
