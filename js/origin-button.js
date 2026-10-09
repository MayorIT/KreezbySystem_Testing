/**
 * Vanilla port of OriginButton — circular fill from pointer / focus origin.
 */
(function () {
    'use strict';

    var FILL_DURATION_MS = 500;
    var FILL_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

    function getCoverDiameter(width, height, x, y) {
        return Math.ceil(
            2 * Math.max(
                Math.hypot(x, y),
                Math.hypot(width - x, y),
                Math.hypot(x, height - y),
                Math.hypot(width - x, height - y)
            )
        );
    }

    function ensureStructure(el) {
        if (el.querySelector('.origin-btn__fill')) return;

        var fill = document.createElement('span');
        fill.className = 'origin-btn__fill';
        fill.setAttribute('aria-hidden', 'true');
        fill.style.transition = 'transform ' + FILL_DURATION_MS + 'ms ' + FILL_EASE;

        var label = document.createElement('span');
        label.className = 'origin-btn__label';

        while (el.firstChild) {
            label.appendChild(el.firstChild);
        }

        el.appendChild(fill);
        el.appendChild(label);
    }

    function isDisabled(el) {
        return el.disabled === true || el.getAttribute('aria-disabled') === 'true';
    }

    function wireOriginButton(el) {
        if (el.dataset.originBtnWired === '1') return;
        el.dataset.originBtnWired = '1';
        ensureStructure(el);

        var fill = el.querySelector('.origin-btn__fill');
        var hovered = false;
        var pressed = false;
        var origin = { x: 0, y: 0 };
        var coverSize = 0;

        function applyFillGeometry() {
            fill.style.left = origin.x + 'px';
            fill.style.top = origin.y + 'px';
            fill.style.width = coverSize + 'px';
            fill.style.height = coverSize + 'px';
        }

        function updateOrigin(x, y) {
            var rect = el.getBoundingClientRect();
            origin.x = x;
            origin.y = y;
            coverSize = getCoverDiameter(rect.width, rect.height, x, y);
            applyFillGeometry();
        }

        function updateOriginFromCenter() {
            var rect = el.getBoundingClientRect();
            updateOrigin(rect.width / 2, rect.height / 2);
        }

        function updateOriginFromPointer(event) {
            var rect = el.getBoundingClientRect();
            updateOrigin(event.clientX - rect.left, event.clientY - rect.top);
        }

        function showFill() {
            return !isDisabled(el) && (hovered || pressed);
        }

        function syncVisualState() {
            var active = showFill();
            el.classList.toggle('origin-btn--active', active);
            el.dataset.pressed = pressed ? 'true' : 'false';
            fill.style.transform = active && coverSize > 0
                ? 'translate(-50%, -50%) scale(1)'
                : 'translate(-50%, -50%) scale(0)';

            if (active) {
                var rect = el.getBoundingClientRect();
                coverSize = getCoverDiameter(rect.width, rect.height, origin.x, origin.y);
                applyFillGeometry();
            }
        }

        el.addEventListener('pointerdown', function (event) {
            if (isDisabled(el) || event.button !== 0) return;
            updateOriginFromPointer(event);
            pressed = true;
            syncVisualState();
        });

        el.addEventListener('pointerenter', function (event) {
            if (isDisabled(el)) return;
            updateOriginFromPointer(event);
            hovered = true;
            syncVisualState();
        });

        el.addEventListener('pointerleave', function () {
            hovered = false;
            pressed = false;
            syncVisualState();
        });

        el.addEventListener('pointerup', function () {
            pressed = false;
            syncVisualState();
        });

        el.addEventListener('pointercancel', function () {
            pressed = false;
            syncVisualState();
        });

        el.addEventListener('focus', function (event) {
            if (isDisabled(el)) return;
            if (event.target.matches(':focus-visible')) {
                updateOriginFromCenter();
                hovered = true;
                syncVisualState();
            }
        });

        el.addEventListener('blur', function () {
            pressed = false;
            hovered = false;
            syncVisualState();
        });

        el.addEventListener('keydown', function (event) {
            if (isDisabled(el) || event.repeat) return;
            if (event.key !== ' ' && event.key !== 'Enter') return;
            if (event.key === ' ') event.preventDefault();
            updateOriginFromCenter();
            pressed = true;
            hovered = true;
            syncVisualState();
        });

        el.addEventListener('keyup', function (event) {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            pressed = false;
            if (!el.matches(':focus-visible')) hovered = false;
            syncVisualState();
        });

        if (typeof ResizeObserver !== 'undefined') {
            var ro = new ResizeObserver(function () {
                if (showFill()) syncVisualState();
            });
            ro.observe(el);
        }
    }

    function boot(scope) {
        (scope || document).querySelectorAll('.origin-btn').forEach(wireOriginButton);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { boot(); });
    } else {
        boot();
    }

    window.KreezbyOriginButton = { init: boot, wire: wireOriginButton };
})();
