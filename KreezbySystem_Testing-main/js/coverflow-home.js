/**
 * Homepage coverflow for the customer shop.
 * View Menu opens the full product list on its own page.
 */
(function () {
    'use strict';

    var ITEMS = [
        {
            tag: '#Signature',
            titleLine1: 'Chocolate',
            titleLine2: 'Crinkles',
            desc: 'The classic pouch. Soft, dark, and the one people come back for.',
            img: 'flavors/chocolate.jpg'
        },
        {
            tag: '#Specialty',
            titleLine1: 'Choco Butternut',
            titleLine2: 'Crinkles',
            desc: 'The specialty jar. Chocolate butternut, packed to share.',
            img: 'flavors/chocobutternut.jpg'
        },
        {
            tag: '#Classic',
            titleLine1: 'Red Velvet',
            titleLine2: 'Crinkles',
            desc: 'Deep cocoa red, powdered and baked fresh.',
            img: 'flavors/redvelvet.jpg'
        },
        {
            tag: '#Favorite',
            titleLine1: 'Ube',
            titleLine2: 'Crinkles',
            desc: 'Purple yam, soft and sweet. A best seller through and through.',
            img: 'flavors/ube.jpg'
        }
    ];

    function openMenu() {
        var host = document.getElementById('coverflow-home');
        var href = (host && host.getAttribute('data-menu')) || 'menu-customer.html';
        window.location.assign(href);
    }

    function mount(host) {
        if (!host || host.getAttribute('data-coverflow-ready') === '1') return;
        host.setAttribute('data-coverflow-ready', '1');

        var index = 0;
        var hovered = false;
        var touchX = 0;
        var total = ITEMS.length;
        var timer = 0;

        host.innerHTML =
            '<div class="coverflow-ambience"><img alt="" /><div class="coverflow-ambience__shade"></div></div>' +
            '<div class="coverflow-inner">' +
                '<div class="coverflow-label"><span></span><h2>Best sellers</h2><span></span></div>' +
                '<div class="coverflow-stage"></div>' +
                '<div class="coverflow-dots"></div>' +
            '</div>' +
            '<button type="button" class="coverflow-arrow coverflow-arrow--prev" aria-label="Previous flavor">' +
                '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
            '</button>' +
            '<button type="button" class="coverflow-arrow coverflow-arrow--next" aria-label="Next flavor">' +
                '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
            '</button>';

        var ambience = host.querySelector('.coverflow-ambience img');
        var stage = host.querySelector('.coverflow-stage');
        var dots = host.querySelector('.coverflow-dots');
        var cards = ITEMS.map(function (item) {
            var card = document.createElement('button');
            card.type = 'button';
            card.className = 'coverflow-card';
            card.innerHTML =
                '<img alt="' + item.titleLine1 + ' ' + item.titleLine2 + '" src="' + item.img + '">' +
                '<span class="coverflow-card__shade"></span>' +
                '<span class="coverflow-card__body">' +
                    '<span class="coverflow-card__tag">' + item.tag + '</span>' +
                    '<span class="coverflow-card__copy">' +
                        '<h3>' + item.titleLine1 + '</h3>' +
                        '<strong>' + item.titleLine2 + '</strong>' +
                        '<span class="coverflow-card__rule"></span>' +
                        '<p>' + item.desc + '</p>' +
                        '<span class="coverflow-cta">View Menu <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg></span>' +
                    '</span>' +
                '</span>';
            stage.appendChild(card);
            return card;
        });

        ITEMS.forEach(function (_, i) {
            var dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'coverflow-dot';
            dot.setAttribute('aria-label', 'Show flavor ' + (i + 1));
            dot.addEventListener('click', function () { go(i); });
            dots.appendChild(dot);
        });

        function metrics() {
            var width = stage.clientWidth || 360;
            var cardW = Math.max(180, Math.min(330, width * 0.46));
            return {
                w: cardW,
                h: Math.min(500, cardW * 1.45),
                near: Math.min(285, width * 0.3),
                far: Math.min(510, width * 0.48)
            };
        }

        function paint() {
            var m = metrics();
            stage.style.setProperty('--cf-w', m.w + 'px');
            stage.style.setProperty('--cf-h', m.h + 'px');
            ambience.src = ITEMS[index].img;
            cards.forEach(function (card, i) {
                var offset = (i - index + total) % total;
                var transform = 'translateX(0px) scale(0.4)';
                var opacity = 0;
                var z = 0;
                var filter = 'brightness(0.4)';
                var center = offset === 0;
                if (center) {
                    transform = 'translateX(0px) scale(1) rotateY(0deg)';
                    opacity = 1;
                    z = 30;
                    filter = 'brightness(1)';
                } else if (offset === 1) {
                    transform = 'translateX(' + m.near + 'px) scale(0.84) rotateY(-24deg)';
                    opacity = 0.65;
                    z = 20;
                    filter = 'brightness(0.75)';
                } else if (offset === total - 1) {
                    transform = 'translateX(' + (-m.near) + 'px) scale(0.84) rotateY(24deg)';
                    opacity = 0.65;
                    z = 20;
                    filter = 'brightness(0.75)';
                } else if (offset === 2 && offset !== total - 2) {
                    transform = 'translateX(' + m.far + 'px) scale(0.68) rotateY(-38deg)';
                    opacity = 0.38;
                    z = 10;
                    filter = 'brightness(0.55)';
                } else if (offset === total - 2 && offset !== 2) {
                    transform = 'translateX(' + (-m.far) + 'px) scale(0.68) rotateY(38deg)';
                    opacity = 0.38;
                    z = 10;
                    filter = 'brightness(0.55)';
                }
                card.style.transform = transform;
                card.style.opacity = String(opacity);
                card.style.zIndex = String(z);
                card.style.filter = filter;
                card.style.pointerEvents = opacity === 0 ? 'none' : 'auto';
                card.style.cursor = center ? 'default' : 'pointer';
                card.style.boxShadow = center
                    ? '0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(197,168,128,0.25)'
                    : '0 15px 35px rgba(0,0,0,0.5)';
                var body = card.querySelector('.coverflow-card__body');
                body.style.opacity = center ? '1' : '0';
                body.style.transform = center ? 'translateY(0)' : 'translateY(16px)';
                body.style.pointerEvents = center ? 'auto' : 'none';
                card.setAttribute('aria-label', ITEMS[i].titleLine1 + ' ' + ITEMS[i].titleLine2);
            });
            dots.querySelectorAll('.coverflow-dot').forEach(function (dot, i) {
                dot.classList.toggle('is-active', i === index);
            });
        }

        function go(next) {
            index = (next + total) % total;
            paint();
        }

        cards.forEach(function (card, i) {
            card.addEventListener('click', function (event) {
                if (event.target.closest('.coverflow-cta') || i === index) openMenu();
                else go(i);
            });
        });
        host.querySelector('.coverflow-arrow--prev').addEventListener('click', function () { go(index - 1); });
        host.querySelector('.coverflow-arrow--next').addEventListener('click', function () { go(index + 1); });

        host.addEventListener('mouseenter', function () { hovered = true; });
        host.addEventListener('mouseleave', function () { hovered = false; });
        host.addEventListener('focusin', function () { hovered = true; });
        host.addEventListener('focusout', function (e) {
            if (!host.contains(e.relatedTarget)) hovered = false;
        });
        host.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
        });
        host.addEventListener('touchstart', function (e) {
            touchX = e.changedTouches[0].clientX;
        }, { passive: true });
        host.addEventListener('touchend', function (e) {
            var diff = e.changedTouches[0].clientX - touchX;
            if (Math.abs(diff) > 45) go(diff < 0 ? index + 1 : index - 1);
        }, { passive: true });

        function arm() {
            window.clearInterval(timer);
            timer = window.setInterval(function () {
                if (!hovered && !document.hidden) go(index + 1);
            }, 5000);
        }

        window.addEventListener('resize', paint);
        paint();
        arm();
        host.tabIndex = 0;
    }

    window.KreezbyCoverflow = { mount: mount, openMenu: openMenu };
})();
