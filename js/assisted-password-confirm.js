/**
 * Assisted password confirmation — visual per-character match feedback.
 */
(function () {
    'use strict';

    function triggerShake(nodes) {
        nodes.forEach(function (node) {
            if (!node) return;
            node.classList.remove('is-shake');
            void node.offsetWidth;
            node.classList.add('is-shake');
            window.setTimeout(function () {
                node.classList.remove('is-shake');
            }, 500);
        });
    }

    function triggerPulse(nodes) {
        nodes.forEach(function (node) {
            if (!node) return;
            node.classList.remove('is-pulse');
            void node.offsetWidth;
            node.classList.add('is-pulse');
            window.setTimeout(function () {
                node.classList.remove('is-pulse');
            }, 300);
        });
    }

    function renderSlots(dotsEl, barsEl, length) {
        dotsEl.innerHTML = '';
        barsEl.innerHTML = '';

        for (var i = 0; i < length; i++) {
            var cell = document.createElement('div');
            cell.className = 'assisted-password__dot-cell';
            cell.innerHTML = '<span class="assisted-password__dot"></span>';
            dotsEl.appendChild(cell);

            var bar = document.createElement('div');
            bar.className = 'assisted-password__bar';
            bar.style.left = (i * 16) + 'px';
            barsEl.appendChild(bar);
        }
    }

    function updateBars(password, confirmPassword, barsEl) {
        var bars = barsEl.querySelectorAll('.assisted-password__bar');
        bars.forEach(function (bar, index) {
            var typed = confirmPassword[index];
            bar.classList.remove('is-match', 'is-mismatch');
            if (!typed) {
                bar.style.transform = 'scaleX(0)';
                return;
            }
            bar.classList.add(password[index] === typed ? 'is-match' : 'is-mismatch');
            bar.style.transform = 'scaleX(1)';
        });
    }

    function initAssistedPassword(root) {
        root = root || document;
        if (root.dataset && root.dataset.assistedPasswordWired === '1') return;

        var passwordInput = root.querySelector('[data-assisted-password-source]');
        var block = root.querySelector('[data-assisted-password]');
        if (!passwordInput || !block) return;
        if (root.dataset) root.dataset.assistedPasswordWired = '1';

        var hint = block.querySelector('[data-assisted-hint]');
        var dotsEl = block.querySelector('[data-assisted-dots]');
        var barsEl = block.querySelector('[data-assisted-bars]');
        var tracker = block.querySelector('[data-assisted-tracker]');
        var confirmShell = block.querySelector('[data-assisted-confirm-shell]');
        var confirmInput = block.querySelector('[data-assisted-confirm]');
        if (!hint || !dotsEl || !barsEl || !tracker || !confirmShell || !confirmInput) return;

        var confirmPassword = '';
        var lastMatch = false;

        function syncMatchState(password) {
            var match = password.length > 0 && password === confirmPassword;
            tracker.classList.toggle('is-match', match);
            confirmShell.classList.toggle('is-match', match);
            confirmInput.classList.toggle('is-match', match);
            if (match && !lastMatch) {
                triggerPulse([tracker, confirmShell]);
            }
            lastMatch = match;
        }

        function onPasswordChange() {
            var password = passwordInput.value;

            if (!password.length) {
                block.hidden = true;
                confirmPassword = '';
                confirmInput.value = '';
                hint.textContent = '';
                dotsEl.innerHTML = '';
                barsEl.innerHTML = '';
                syncMatchState(password);
                return;
            }

            block.hidden = false;
            hint.textContent = '→ ' + password;

            if (confirmPassword.length > password.length) {
                confirmPassword = confirmPassword.slice(0, password.length);
                confirmInput.value = confirmPassword;
            }

            if (dotsEl.children.length !== password.length) {
                renderSlots(dotsEl, barsEl, password.length);
            }

            updateBars(password, confirmPassword, barsEl);
            syncMatchState(password);
        }

        function onConfirmChange(event) {
            var password = passwordInput.value;
            var nextValue = event.target.value;

            if (
                confirmPassword.length >= password.length &&
                nextValue.length > confirmPassword.length
            ) {
                event.target.value = confirmPassword;
                triggerShake([tracker, confirmShell]);
                return;
            }

            confirmPassword = nextValue;
            updateBars(password, confirmPassword, barsEl);
            syncMatchState(password);
        }

        passwordInput.addEventListener('input', onPasswordChange);
        confirmInput.addEventListener('input', onConfirmChange);

        var form = block.closest('form');
        if (form) {
            form.addEventListener('submit', function (event) {
                if (passwordInput.value !== confirmPassword) {
                    event.preventDefault();
                    triggerShake([tracker, confirmShell]);
                    confirmInput.focus();
                }
            });
        }

        onPasswordChange();
    }

    function boot(scope) {
        var roots = (scope || document).querySelectorAll('.signup-form, [data-assisted-password-form]');
        if (!roots.length) {
            initAssistedPassword(scope || document);
            return;
        }
        roots.forEach(function (form) {
            initAssistedPassword(form);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { boot(); });
    } else {
        boot();
    }

    window.KreezbyAssistedPassword = { init: boot };
})();
