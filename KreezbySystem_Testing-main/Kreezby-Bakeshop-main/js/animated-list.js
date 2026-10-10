/**
 * AnimatedList — vanilla port (motion/react staggered notification cards).
 */
(function () {
    'use strict';

    if (window.KreezbyAnimatedListLoaded) return;
    window.KreezbyAnimatedListLoaded = true;

    var AVATAR_COLORS = ['#1e88e5', '#e65100', '#43a047', '#8e24aa', '#00897b', '#5d4037'];

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function initialsFrom(text) {
        var parts = String(text || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    function buildNotificationCard(item, index) {
        var color = item.color || AVATAR_COLORS[index % AVATAR_COLORS.length];
        var avatarHtml = item.avatar
            ? '<img src="' + escapeHtml(item.avatar) + '" alt="" width="45" height="45">'
            : escapeHtml(item.initials || initialsFrom(item.title));

        return (
            '<div class="animated-list-notification" role="article">' +
                '<div class="animated-list-notification__row">' +
                    '<span class="animated-list-notification__avatar" style="background:' + color + '">' +
                        avatarHtml +
                    '</span>' +
                    '<div class="animated-list-notification__body">' +
                        '<h5 class="animated-list-notification__title">' + escapeHtml(item.title) + '</h5>' +
                        '<p class="animated-list-notification__subtitle">' + escapeHtml(item.subtitle) + '</p>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }

    function mount(container, options) {
        if (!container) return null;

        options = options || {};
        var delay = typeof options.delay === 'number' ? options.delay : 1000;
        var items = Array.isArray(options.items) ? options.items.slice() : [];
        var withFade = options.withFade !== false;
        var maxIndex = items.length - 1;
        var index = 0;
        var timers = [];

        container.innerHTML = '';
        container.classList.add('animated-list-host');

        var listEl = document.createElement('div');
        listEl.className = 'animated-list';
        container.appendChild(listEl);

        if (withFade) {
            var fade = document.createElement('div');
            fade.className = 'animated-list-fade';
            fade.setAttribute('aria-hidden', 'true');
            container.appendChild(fade);
        }

        function clearTimers() {
            timers.forEach(clearTimeout);
            timers = [];
        }

        function revealItem(itemIndex) {
            var item = items[itemIndex];
            if (!item) return;

            var itemEl = document.createElement('div');
            itemEl.className = 'animated-list-item';
            itemEl.innerHTML = buildNotificationCard(item, itemIndex);
            listEl.insertBefore(itemEl, listEl.firstChild);

            requestAnimationFrame(function () {
                itemEl.classList.add('is-visible');
            });

            if (typeof options.onItemClick === 'function') {
                var card = itemEl.querySelector('.animated-list-notification');
                if (card) {
                    card.addEventListener('click', function () {
                        options.onItemClick(item, itemIndex);
                    });
                }
            }
        }

        if (!items.length) {
            listEl.innerHTML = '<p class="animated-list-notification__subtitle" style="text-align:center;padding:1rem;">No activity yet</p>';
            return { destroy: clearTimers };
        }

        revealItem(0);

        function scheduleNext() {
            if (index >= maxIndex) return;
            var timer = setTimeout(function () {
                index += 1;
                revealItem(index);
                scheduleNext();
            }, delay);
            timers.push(timer);
        }

        scheduleNext();

        return {
            destroy: clearTimers
        };
    }

    window.KreezbyAnimatedList = {
        mount: mount,
        buildNotificationCard: buildNotificationCard
    };
})();
