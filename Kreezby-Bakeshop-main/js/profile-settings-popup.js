/**
 * Small "Profile Settings" popup opened from the top-right name menu.
 * Holds everything the old Profile sidebar page had: photo, name, email,
 * contact number, read-only username / role / department, save.
 * Saving is done by portal-profile.js (it binds to the element ids below).
 */
(function () {
    'use strict';

    if (window.KreezbyProfileSettings) return;

    var script = document.currentScript;
    var base = script && script.src ? script.src.replace(/[^/?#]+([?#].*)?$/, '') : '';
    var ROOT_ID = 'kreezby-profile-settings';

    function kind() {
        var path = (location.pathname || '').replace(/\\/g, '/').toLowerCase();
        if (path.indexOf('/head_admin/') !== -1) return 'head';
        if (path.indexOf('/staff') !== -1) return 'staff';
        if (path.indexOf('/retailer/') !== -1) return 'retailer';
        return 'admin';
    }

    function onProfilePage() {
        var existing = document.getElementById('portal-profile');
        return !!(existing && !existing.closest('#' + ROOT_ID));
    }

    var R = '#' + ROOT_ID;
    var CSS = [
        R + '{position:fixed;inset:0;z-index:1700}',
        R + '[hidden]{display:none}',
        R + ' .kpset__panel{position:absolute;top:calc(var(--kreezby-admin-header-height,60px) + 14px);right:16px;width:384px;max-width:calc(100vw - 24px);max-height:calc(100dvh - var(--kreezby-admin-header-height,60px) - 32px);display:flex;flex-direction:column;overflow:hidden;background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(40,24,16,.28);border:1px solid #efe7e0;color:#3d2c2a;font-family:inherit;box-sizing:border-box}',
        /* cover */
        R + ' .kpset__cover{position:relative;z-index:1;overflow:hidden;flex:0 0 auto;height:52px;background:linear-gradient(135deg,#5d4037 0%,#8d6e63 100%)}',
        R + ' .kpset__cover::after{content:"";position:absolute;right:-30px;top:-40px;width:140px;height:140px;border-radius:50%;background:rgba(255,202,40,.22)}',
        R + ' .kpset__title{position:absolute;left:20px;top:50%;transform:translateY(-50%);margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.88);z-index:1}',
        R + ' .kpset__close{position:absolute;right:12px;top:11px;z-index:2;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:18px;line-height:1;cursor:pointer;border-radius:50%;width:30px;height:30px}',
        R + ' .kpset__close:hover{background:rgba(255,255,255,.3)}',
        /* scrolling body */
        R + ' .kpset__body{flex:1 1 auto;min-height:0;overflow:auto;padding:0 20px 8px}',
        R + ' .kpset__who{position:relative;z-index:2;background:#fff;padding-top:2px;display:flex;align-items:center;gap:14px;margin-top:16px;margin-bottom:16px}',
        R + ' .kpset__avatar-wrap{position:relative;flex:0 0 76px}',
        R + ' .kpset__avatar{width:76px;height:76px;border-radius:50%;background:#efe6df center/cover no-repeat;color:#6d4c41;display:grid;place-items:center;font-weight:800;font-size:24px;border:4px solid #fff;box-shadow:0 4px 14px rgba(61,44,42,.18);box-sizing:border-box}',
        R + ' button.kpset__cam{position:absolute;right:-2px;bottom:-2px;width:28px;height:28px;border-radius:50%;border:3px solid #fff;background:#ffca28;color:#3d2c2a;display:grid;place-items:center;padding:0;cursor:pointer}',
        R + ' button.kpset__cam:hover{background:#fbc02d}',
        R + ' button.kpset__cam svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}',
        R + ' .kpset__who-copy{min-width:0;flex:1;padding-bottom:4px}',
        R + ' .kpset__name{margin:0;font-size:17px;font-weight:800;letter-spacing:-.01em;color:#3d2c2a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        R + ' .kpset__meta{margin:3px 0 0;font-size:12px;color:#8a7f78;display:flex;gap:6px;align-items:center;flex-wrap:wrap}',
        R + ' .kpset__chip{background:#fff4d6;color:#8a5a00;border-radius:99px;padding:2px 9px;font-weight:700;font-size:11px}',
        R + ' .kpset__chip[hidden],' + R + ' .kpset__meta span[hidden]{display:none}',
        /* sections */
        R + ' .kpset__section{margin:0 0 14px}',
        R + ' .kpset__section h3{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#a0968f}',
        R + ' .kpset__fields{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}',
        R + ' .kpset__wide{grid-column:1 / -1}',
        R + ' label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#6d4c41;min-width:0}',
        R + ' label[hidden]{display:none}',
        R + ' input[type=text],' + R + ' input[type=email],' + R + ' input[type=tel]{border:1px solid #e4d9d0;border-radius:10px;padding:0 12px;height:38px;font:inherit;font-size:13px;font-weight:600;color:#2b241f;background:#fdfbf9;width:100%;box-sizing:border-box}',
        R + ' input::placeholder{color:#b8aea7;font-weight:500}',
        R + ' input:hover:not(:disabled){border-color:#d3c1b4}',
        R + ' input:focus{outline:0;border-color:#ffca28;background:#fff;box-shadow:0 0 0 3px rgba(255,202,40,.28)}',
        /* read-only account card */
        R + ' .kpset__account{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;padding:12px 14px;border-radius:12px;background:#f7f0ea}',
        R + ' .kpset__account label{gap:2px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#a0968f}',
        R + ' .kpset__account input{height:auto;padding:0;border:0;background:transparent;font-size:13px;font-weight:700;color:#3d2c2a;text-transform:none;letter-spacing:0;-webkit-text-fill-color:#3d2c2a;opacity:1}',
        R + ' .kpset__note{margin:0 0 12px;font-size:11px;line-height:1.5;color:#8a7f78}',
        /* footer */
        R + ' .kpset__foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px 16px;border-top:1px solid #f3ece6;background:#fff}',
        R + ' .kpset__status{margin:0;font-size:12px;font-weight:700;color:#2e7d32;min-width:0}',
        R + ' button.kpset__save{border:0;border-radius:12px;background:#ffca28;color:#1f1f1f;padding:0 22px;height:40px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(255,202,40,.4);font-family:inherit}',
        R + ' button.kpset__save:hover{background:#fbc02d}',
        R + ' button.kpset__ghost{border:0;background:transparent;color:#8a5a00;font-size:12px;font-weight:700;cursor:pointer;padding:0;font-family:inherit}',
        R + ' button.kpset__ghost:hover{text-decoration:underline}',
        '@media (max-width:420px){' + R + ' .kpset__fields,' + R + ' .kpset__account{grid-template-columns:1fr}}'
    ].join('\n');

    var CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';

    function html() {
        var k = kind();
        var alerts = k === 'retailer' ? '' :
            '<p class="kpset__note" id="profile-notify-state">Threshold alerts turn on by themselves for Admin, Head Admin, and Staff. They show in the notification bell and on the Alert page.</p>';
        return (
            '<section class="kpset__panel" id="portal-profile" role="dialog" aria-modal="false" aria-label="Profile settings">' +
                '<div class="kpset__cover"><p class="kpset__title">Profile settings</p><button type="button" class="kpset__close" data-kpset-close aria-label="Close">\u00d7</button></div>' +
                '<div class="kpset__body">' +
                    '<div class="kpset__who">' +
                        '<div class="kpset__avatar-wrap">' +
                            '<div class="kpset__avatar" id="profile-avatar-preview" aria-hidden="true">K</div>' +
                            '<button type="button" class="kpset__cam" id="profile-photo-btn" aria-label="Change photo" title="Change photo">' + CAMERA + '</button>' +
                            '<input type="file" id="profile-avatar-input" accept="image/*" hidden>' +
                        '</div>' +
                        '<div class="kpset__who-copy">' +
                            '<p class="kpset__name" id="profile-display-name">Account</p>' +
                            '<p class="kpset__meta"><span class="kpset__chip" id="profile-role-chip" hidden></span><span id="profile-handle" hidden></span></p>' +
                            '<button type="button" class="kpset__ghost" data-kpset-photo>Change photo</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="kpset__section"><h3>Personal information</h3>' +
                        '<div class="kpset__fields">' +
                            '<label class="kpset__wide">Full name<input id="profile-full-name" type="text" autocomplete="name" placeholder="Your name"></label>' +
                            '<label>Email<input id="profile-email" type="email" autocomplete="email" placeholder="name@email.com"></label>' +
                            '<label>Contact number<input id="profile-phone" type="tel" autocomplete="tel" placeholder="09XX XXX XXXX"></label>' +
                            '<label class="kpset__wide">Address<input id="profile-address" type="text" autocomplete="street-address" placeholder="Street, barangay, city"></label>' +
                        '</div>' +
                    '</div>' +
                    '<div class="kpset__section"><h3>Account</h3>' +
                        '<div class="kpset__account">' +
                            '<label>Username<input id="profile-username" type="text" disabled></label>' +
                            '<label>Role<input id="profile-role" type="text" disabled></label>' +
                            '<label id="profile-department-wrap" hidden>Department<input id="profile-department" type="text" disabled></label>' +
                        '</div>' +
                    '</div>' +
                    '<p class="kpset__note" id="profile-account-note" hidden></p>' +
                    alerts +
                '</div>' +
                '<div class="kpset__foot"><p class="kpset__status" id="profile-status" role="status"></p>' +
                    '<button type="button" class="kpset__save" id="profile-save">Save changes</button></div>' +
            '</section>'
        );
    }

    function loadScript(src, done) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { done(); };
        s.onerror = function () { done(); };
        document.head.appendChild(s);
    }

    function withDependencies(done) {
        function step2() {
            if (window.KreezbyPortalProfile) { done(); return; }
            loadScript(base + 'portal-profile.js?v=20261022pill', done);
        }
        if (window.KreezbyMaintenanceSettings) step2();
        else loadScript(base + 'maintenance-settings.js?v=20261018accounts', step2);
    }

    function build() {
        var root = document.getElementById(ROOT_ID);
        if (root) return root;
        if (!document.getElementById('kreezby-profile-settings-style')) {
            var style = document.createElement('style');
            style.id = 'kreezby-profile-settings-style';
            style.textContent = CSS;
            document.head.appendChild(style);
        }
        root = document.createElement('div');
        root.id = ROOT_ID;
        root.hidden = true;
        root.innerHTML = html();
        document.body.appendChild(root);

        root.addEventListener('click', function (event) {
            if (event.target === root || event.target.closest('[data-kpset-close]')) close();
            if (event.target.closest('#profile-photo-btn, [data-kpset-photo]')) {
                var input = document.getElementById('profile-avatar-input');
                if (input) input.click();
            }
        });
        return root;
    }

    function open() {
        var root = build();
        root.hidden = false;
        withDependencies(function () {
            if (window.KreezbyPortalProfile) window.KreezbyPortalProfile.bind();
        });
        
    }

    function close() {
        var root = document.getElementById(ROOT_ID);
        if (root) root.hidden = true;
    }

    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('a[data-profile-link]');
        if (!link || onProfilePage()) return;
        event.preventDefault();
        event.stopPropagation();
        var menu = document.getElementById('user-dropdown-menu');
        if (menu) menu.classList.remove('active');
        var trigger = document.getElementById('user-dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        open();
    }, true);

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') close();
    });

    window.KreezbyProfileSettings = { open: open, close: close };
})();
