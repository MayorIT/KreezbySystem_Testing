/**
 * Auth shell — particle background + password toggle.
 */
(function () {
    'use strict';

    if (window.KreezbyAuthShellLoaded) return;
    window.KreezbyAuthShellLoaded = true;

    var EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    var EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

    function initParticles() {
        var canvas = document.querySelector('.auth-shell__particles');
        if (!canvas) return;

        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var particles = [];
        var raf = 0;

        function setSize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        function makeParticle() {
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                v: Math.random() * 0.25 + 0.05,
                o: Math.random() * 0.35 + 0.15
            };
        }

        function init() {
            particles = [];
            var count = Math.floor((canvas.width * canvas.height) / 9000);
            for (var i = 0; i < count; i++) particles.push(makeParticle());
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(function (p) {
                p.y -= p.v;
                if (p.y < 0) {
                    p.x = Math.random() * canvas.width;
                    p.y = canvas.height + Math.random() * 40;
                    p.v = Math.random() * 0.25 + 0.05;
                    p.o = Math.random() * 0.35 + 0.15;
                }
                ctx.fillStyle = 'rgba(250,250,250,' + p.o + ')';
                ctx.fillRect(p.x, p.y, 0.7, 2.2);
            });
            raf = requestAnimationFrame(draw);
        }

        function onResize() {
            setSize();
            init();
        }

        setSize();
        init();
        draw();
        window.addEventListener('resize', onResize);

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                cancelAnimationFrame(raf);
            } else {
                draw();
            }
        });
    }

    function wirePasswordToggles() {
        document.querySelectorAll('[data-auth-toggle-password]').forEach(function (btn) {
            if (btn.dataset.authBound === '1') return;
            btn.dataset.authBound = '1';

            var targetId = btn.getAttribute('aria-controls');
            var input = targetId ? document.getElementById(targetId) : btn.parentElement.querySelector('input[type="password"], input[type="text"]');
            if (!input) return;

            btn.addEventListener('click', function () {
                var show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.innerHTML = show ? EYE_OFF : EYE;
                btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
            });
        });
    }

    function wireSocialButtons() {
        document.querySelectorAll('[data-auth-social]').forEach(function (btn) {
            if (btn.dataset.authBound === '1') return;
            btn.dataset.authBound = '1';
            btn.addEventListener('click', function () {
                if (typeof window.toast === 'function') {
                    window.toast('Social sign-in is not configured in this demo.', 'info');
                }
            });
        });
    }

    function initTabs() {
        var root = document.querySelector('[data-auth-tabs]');
        if (!root) return;

        var tabs = root.querySelectorAll('[data-auth-tab]');
        var panels = root.querySelectorAll('[data-auth-panel]');
        if (!tabs.length || !panels.length) return;

        function activate(name, updateHash) {
            tabs.forEach(function (tab) {
                var active = tab.getAttribute('data-auth-tab') === name;
                tab.classList.toggle('is-active', active);
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            panels.forEach(function (panel) {
                panel.classList.toggle('is-active', panel.getAttribute('data-auth-panel') === name);
            });
            if (updateHash !== false) {
                try {
                    history.replaceState(null, '', name === 'signup' ? 'log_in.html?tab=signup' : 'log_in.html');
                } catch (e) {}
            }
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                activate(tab.getAttribute('data-auth-tab'));
            });
        });

        document.querySelectorAll('[data-auth-tab-trigger]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activate(btn.getAttribute('data-auth-tab-trigger'));
            });
        });

        var params = new URLSearchParams(window.location.search);
        var hash = (window.location.hash || '').replace('#', '');
        var initial = params.get('tab') || hash || 'login';
        if (initial !== 'signup') initial = 'login';
        activate(initial, false);
    }

    function wireSignupPasswordConfirm() {
        document.querySelectorAll('.signup-form').forEach(function (form) {
            if (form.dataset.signupConfirmBound === '1') return;
            form.dataset.signupConfirmBound = '1';

            var passwordInput = form.querySelector('[name="password"]');
            var confirmInput = form.querySelector('[name="confirmPassword"]');
            var mismatchNote = form.querySelector('#signup-password-mismatch');
            if (!passwordInput || !confirmInput) return;

            function updateMismatch() {
                if (!mismatchNote) return;
                var confirmValue = confirmInput.value;
                if (!confirmValue) {
                    mismatchNote.hidden = true;
                    confirmInput.setCustomValidity('');
                    return;
                }
                var matches = passwordInput.value === confirmValue;
                mismatchNote.hidden = matches;
                confirmInput.setCustomValidity(matches ? '' : 'Passwords do not match.');
            }

            passwordInput.addEventListener('input', updateMismatch);
            confirmInput.addEventListener('input', updateMismatch);
            form.addEventListener('submit', function (event) {
                updateMismatch();
                if (!confirmInput.checkValidity()) {
                    event.preventDefault();
                    confirmInput.reportValidity();
                }
            });
        });
    }

    function wireForgotPassword() {
        document.querySelectorAll('[data-auth-forgot]').forEach(function (btn) {
            if (btn.dataset.authBound === '1') return;
            btn.dataset.authBound = '1';

            var noteId = btn.getAttribute('aria-controls');
            var note = noteId ? document.getElementById(noteId) : document.querySelector('.auth-forgot-note');
            if (!note) return;

            btn.addEventListener('click', function () {
                var show = note.hidden;
                note.hidden = !show;
                btn.setAttribute('aria-expanded', show ? 'true' : 'false');
            });
        });
    }

    function ensureExpandingTabs() {
        if (window.KreezbyExpandingTabsLoaded) {
            if (window.KreezbyExpandingTabs && typeof window.KreezbyExpandingTabs.init === 'function') {
                window.KreezbyExpandingTabs.init();
            }
            return;
        }
        if (document.getElementById('kreezby-expanding-tabs-script')) return;

        var src = '../js/expanding-tabs.js?v=20260925sm';
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var href = scripts[i].getAttribute('src') || '';
            if (href.indexOf('auth-shell.js') >= 0) {
                src = href.replace(/auth-shell\.js[^/]*$/, 'expanding-tabs.js?v=20260925sm');
                break;
            }
        }

        var s = document.createElement('script');
        s.id = 'kreezby-expanding-tabs-script';
        s.src = src;
        s.defer = true;
        s.onload = function () {
            if (window.KreezbyExpandingTabs && typeof window.KreezbyExpandingTabs.init === 'function') {
                window.KreezbyExpandingTabs.init();
            }
        };
        document.head.appendChild(s);
    }

    function init() {
        initParticles();
        wirePasswordToggles();
        wireSocialButtons();
        wireSignupPasswordConfirm();
        wireForgotPassword();
        initTabs();
        ensureExpandingTabs();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
