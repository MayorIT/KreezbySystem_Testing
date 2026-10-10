/**
 * Shared inbox chat UI for admin, staff, retailer, and customer portals.
 */
(function () {
    'use strict';

    var SVG = {
        search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
        pen: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        filter: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>',
        video: '<svg viewBox="0 0 24 24"><path d="m16 13 5.223 3.482A.5.5 0 0 0 22 16.06V7.94a.5.5 0 0 0-.777-.422L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>',
        phone: '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
        smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
        paperclip: '<svg viewBox="0 0 24 24"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
        send: '<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
        mic: '<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>',
        user: '<svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        image: '<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
        camera: '<svg viewBox="0 0 24 24"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
        file: '<svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
        archive: '<svg viewBox="0 0 24 24"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>',
        check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
        mail: '<svg viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
        arrowLeft: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
        moon: '<svg viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
        sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
    };

    var EMOJIS = [
        '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎',
        '😢', '😭', '😡', '🤔', '😴', '🤗', '🙏', '👍',
        '👎', '👏', '🔥', '❤️', '💯', '✅', '❌', '⭐',
        '🎉', '🎂', '🍪', '🍫', '📦', '🚚', '💰', '👋'
    ];

    var PRESETS = {
        admin: {
            contacts: [
                { id: 'sidc', name: 'SIDC Batangas Hub', preview: 'Weekly replenishment PO-SIDC-001 received.', time: '15:31', initials: 'S', online: true, unread: true },
                { id: 'maria', name: 'Maria Santos', preview: 'Order ORD-2026-1042 is still packing.', time: 'Today', initials: 'M', unread: true },
                { id: 'claire', name: 'Claire (Staff 1)', preview: 'AI Forecasting report compiled successfully.', time: 'May 14', initials: 'C', online: true, archived: true }
            ],
            messages: {
                sidc: [
                    { type: 'incoming', text: 'Hello Admin, we have processed the weekly stock evaluation check.', time: '15:24' },
                    { type: 'incoming', text: 'Are there any active back-order dispatch batches this afternoon?', time: '15:25' },
                    { type: 'outgoing', text: 'Hello SIDC Team! Yes, the AI demand forecasting engine has auto-allocated an ingredient boost.', time: '15:30' },
                    { type: 'outgoing', text: 'Weekly replenishment PO-SIDC-001 received.', time: '15:31' }
                ],
                maria: [
                    { type: 'incoming', text: 'Hi, just checking on ORD-2026-1042 — chocolate and ube jars.', time: '09:12' },
                    { type: 'outgoing', text: 'Hi Maria, we are packing that order at the main facility now.', time: '09:18' },
                    { type: 'incoming', text: 'Order ORD-2026-1042 is still packing.', time: '09:20' }
                ]
            }
        },
        staff: {
            contacts: [
                { id: 'sidc', name: 'SIDC Retailer', preview: 'You: Next delivery inventory data is auto-synced...', time: '15:31', initials: 'S', online: true, channel: 'retailer', unread: true },
                { id: 'r101', name: 'Retailer 101', preview: 'Stock reorder verification flag code updated...', time: 'Yesterday', initials: 'R', channel: 'retailer', unread: false },
                { id: 'claire', name: 'Claire (Staff 1)', preview: 'AI Forecasting report compiled successfully.', time: 'May 14', initials: 'C', online: true, channel: 'staff', archived: true }
            ],
            messages: {
                sidc: [
                    { type: 'incoming', text: 'Hello Staff, we have processed the weekly stock evaluation check.', time: '15:24' },
                    { type: 'incoming', text: 'Are there any active back-order dispatch batches this afternoon?', time: '15:25' },
                    { type: 'outgoing', text: 'Hello SIDC Team! Yes, allocation is already in progress.', time: '15:30' },
                    { type: 'outgoing', text: 'Next delivery inventory data is auto-synced.', time: '15:31' }
                ]
            }
        },
        retailer: {
            contacts: [
                { id: 'brent', name: 'Brent Ramos (Admin)', preview: 'Next delivery schedule will be on May 27 po', time: '1h', initials: 'B', online: true, unread: true },
                { id: 'maricel', name: 'Maricel Ramos', preview: 'Next delivery will be...', time: '1h', initials: 'M', unread: false },
                { id: 'staff1', name: 'Staff 1', preview: 'Next delivery will be...', time: '1h', initials: 'S', unread: false },
                { id: 'kobe', name: 'Kobe Bryan', preview: 'Sales running by the...', time: '1h', initials: 'K', online: true, archived: true }
            ],
            messages: {
                brent: [
                    { type: 'incoming', text: 'Hello po, what can we do for you?' },
                    { type: 'outgoing', text: 'Kami po sana magtatanong regarding sa automated stock replenishment.' },
                    { type: 'incoming', text: 'Ilan po ang o-orderin?' },
                    { type: 'outgoing', text: 'Bale 150 pouches of Chocolate Boxes po.' },
                    { type: 'incoming', text: 'Next delivery schedule will be on May 27 po' }
                ]
            }
        },
        customer: {
            contacts: [
                { id: 'support', name: 'Kreezby Support', preview: 'How can we help you today?', time: 'Now', initials: 'K', online: true, unread: true },
                { id: 'orders', name: 'Order Assistance', preview: 'Your order #1042 is being prepared.', time: '2h', initials: 'O', unread: false },
                { id: 'past', name: 'Past Order Help', preview: 'Thanks for confirming the replacement pouch.', time: 'Apr 12', initials: 'P', archived: true }
            ],
            messages: {
                support: [
                    { type: 'incoming', text: 'Welcome to Kreezby Help Center! Describe your issue and our team will assist you.' },
                    { type: 'outgoing', text: 'Hi, I need help tracking my recent order.' },
                    { type: 'incoming', text: 'Sure — please share your order reference number and we will check status right away.' }
                ],
                orders: [
                    { type: 'incoming', text: 'Your order #1042 is being prepared.', time: '2h' },
                    { type: 'incoming', text: 'We will notify you when it is ready for delivery.' }
                ],
                past: [
                    { type: 'incoming', text: 'We replaced the torn chocolate pouch from order #980.', time: 'Apr 12' },
                    { type: 'outgoing', text: 'Received, thank you!' },
                    { type: 'incoming', text: 'Thanks for confirming the replacement pouch.' }
                ]
            }
        }
    };

    function avatarColor(name) {
        var palette = ['#0084ff', '#a033ff', '#f02849', '#44bec7', '#ff7e29', '#67b00c'];
        var total = 0;
        var label = String(name || '');
        for (var i = 0; i < label.length; i++) total += label.charCodeAt(i);
        return palette[total % palette.length];
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function iconBtn(svg, title) {
        return '<button type="button" class="inbox-icon-btn" title="' + escapeHtml(title) + '">' + svg + '</button>';
    }

    function buildShell(role, messenger) {
        return (
            '<div class="inbox-resizable-group" id="inbox-resizable-group">' +
                '<div class="inbox-chat-list-panel" id="inbox-list-panel">' +
                    '<div class="inbox-chat-list-header">' +
                        '<div class="inbox-chat-list-heading">' +
                            '<button type="button" class="inbox-icon-btn inbox-archive-back-btn" id="inbox-archive-back-btn" title="Back to chats" hidden>' + SVG.arrowLeft + '</button>' +
                            '<p class="inbox-chat-list-title">Chats</p>' +
                        '</div>' +
                        '<div class="inbox-chat-list-actions">' +
                            '<div class="inbox-dropdown" data-dropdown="filter">' +
                                iconBtn(SVG.filter, 'Filter chats') +
                                '<div class="inbox-dropdown-menu inbox-filter-menu align-right">' +
                                    '<div class="inbox-dropdown-label">Filter chats by</div>' +
                                    '<button type="button" class="inbox-dropdown-item" data-filter="unread">' +
                                        '<span class="inbox-dropdown-icon">' + SVG.mail + '</span>' +
                                        '<span class="inbox-dropdown-copy"><span>Unread</span><small>New messages only</small></span>' +
                                    '</button>' +
                                    '<button type="button" class="inbox-dropdown-item" data-filter="read">' +
                                        '<span class="inbox-dropdown-icon">' + SVG.check + '</span>' +
                                        '<span class="inbox-dropdown-copy"><span>Read</span><small>Already opened chats</small></span>' +
                                    '</button>' +
                                '</div>' +
                            '</div>' +
                            '<button type="button" class="inbox-icon-btn" id="inbox-archive-view-btn" title="View archived chats" aria-pressed="false">' + SVG.archive + '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="inbox-chat-search">' + SVG.search +
                        '<input type="text" id="inbox-search-input" placeholder="Search chats" aria-label="Search chats">' +
                    '</div>' +
                    '<div class="inbox-contact-scroll" id="inbox-contact-list">' +
                        '<p id="inbox-threads-empty" class="inbox-threads-empty" style="display:none;">No conversations available.</p>' +
                    '</div>' +
                '</div>' +
                '<div class="inbox-resize-handle" id="inbox-resize-handle" aria-hidden="true"></div>' +
                '<div class="inbox-chat-main-panel" id="inbox-main-panel">' +
                    '<div class="inbox-chat-header">' +
                        '<div class="inbox-chat-header-profile">' +
                            '<div class="inbox-avatar" id="inbox-header-avatar">K</div>' +
                            '<div>' +
                                '<h2 class="header-active-client-title" id="inbox-active-name">Select a chat</h2>' +
                                '<p class="header-active-client-status" id="inbox-active-status">Contact Info</p>' +
                            '</div>' +
                        '</div>' +
                        '<div class="inbox-chat-header-actions">' +
                            (messenger
                                ? '<button type="button" class="inbox-icon-btn" id="inbox-dark-mode-btn" title="Dark mode" aria-pressed="false">' + SVG.moon + '</button>'
                                : iconBtn(SVG.video, 'Video call') + iconBtn(SVG.phone, 'Phone call')) +
                            '<button type="button" class="inbox-icon-btn" id="inbox-header-search-btn" title="Search chats">' + SVG.search + '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="inbox-retailer-access-banner" class="inbox-retailer-access-banner" style="display:none;"></div>' +
                    '<div class="inbox-messages-viewport messages-scroll-viewport" id="chat-messages-container"></div>' +
                    '<div class="inbox-composer-bar chat-composition-footer-bar">' +
                        '<div class="inbox-attach-preview" id="inbox-attach-preview" hidden></div>' +
                        '<p class="inbox-attach-note" id="inbox-attach-note" hidden></p>' +
                        '<div class="inbox-dropdown" data-dropdown="emoji">' +
                            '<button type="button" class="inbox-icon-btn" id="inbox-emoji-btn" title="Emoji" aria-haspopup="menu">' + SVG.smile + '</button>' +
                            '<div class="inbox-dropdown-menu inbox-emoji-menu">' +
                                EMOJIS.map(function (emoji) {
                                    return '<button type="button" class="inbox-emoji-btn" data-emoji="' + emoji + '">' + emoji + '</button>';
                                }).join('') +
                            '</div>' +
                        '</div>' +
                        '<div class="inbox-dropdown" data-dropdown="attach">' +
                            '<button type="button" class="inbox-icon-btn btn-attachment-trigger" title="Attach file" aria-haspopup="menu">' + SVG.paperclip + '</button>' +
                            '<div class="inbox-dropdown-menu">' +
                                '<button type="button" class="inbox-dropdown-item" data-attach="camera"><span class="inbox-dropdown-icon">' + SVG.camera + '</span><span>Camera</span></button>' +
                                '<button type="button" class="inbox-dropdown-item" data-attach="document"><span class="inbox-dropdown-icon">' + SVG.file + '</span><span>Document</span></button>' +
                            '</div>' +
                        '</div>' +
                        '<input type="text" class="composition-input-element" id="chat-type-input" placeholder="Type a message">' +
                        '<button type="button" class="inbox-icon-btn" id="inbox-compose-send" title="Send">' + SVG.send + '</button>' +
                        '<button type="button" class="inbox-icon-btn" id="inbox-voice-btn" title="Voice message" aria-pressed="false">' + SVG.mic + '</button>' +
                        '<button type="button" class="btn-send-message-action" id="inbox-send-btn" hidden>Send</button>' +
                        '<input type="file" class="inbox-file-input" id="inbox-file-document" multiple>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
    }

    function renderContacts(root, contacts, activeId) {
        var list = root.querySelector('#inbox-contact-list');
        var empty = root.querySelector('#inbox-threads-empty');
        if (!list) return;
        list.querySelectorAll('.inbox-contact-item').forEach(function (node) { node.remove(); });

        if (empty) {
            empty.style.display = contacts.length ? 'none' : '';
        }

        contacts.forEach(function (contact) {
            var row = document.createElement('div');
            var isUnread = Boolean(contact.unread) && !contact.archived;
            row.className = 'inbox-contact-item thread-item-card' +
                (contact.id === activeId ? ' is-active selected-active' : '') +
                (isUnread ? ' is-unread' : ' is-read') +
                (contact.archived ? ' is-archived' : '');
            row.setAttribute('data-thread-id', contact.id);
            if (contact.channel) row.setAttribute('data-channel', contact.channel);

            var avatarClass = 'inbox-avatar' + (contact.online ? ' is-online' : '');
            var avatarStyle = root.classList.contains('inbox-messenger')
                ? ' style="background:' + avatarColor(contact.name) + '"'
                : '';
            var avatarHtml = contact.image
                ? '<img src="' + escapeHtml(contact.image) + '" alt="">'
                : escapeHtml(contact.initials || contact.name.charAt(0));

            var statusHtml = contact.archived
                ? '<span class="inbox-status-pill is-archived">' + SVG.archive + 'Archived</span>'
                : (isUnread
                    ? '<span class="inbox-status-pill is-unread"><span class="inbox-unread-dot" aria-hidden="true"></span>Unread</span>'
                    : '<span class="inbox-status-pill is-read">' + SVG.check + 'Read</span>');

            var archiveLabel = contact.archived ? 'Unarchive chat' : 'Archive chat';

            row.innerHTML =
                '<button type="button" class="inbox-contact-select">' +
                    '<div class="' + avatarClass + '"' + avatarStyle + '>' + avatarHtml + '</div>' +
                    '<div class="inbox-contact-meta thread-meta-pane">' +
                        '<div class="inbox-contact-row thread-head-row">' +
                            '<span class="inbox-contact-name thread-client-name">' + escapeHtml(contact.name) + '</span>' +
                            '<span class="inbox-contact-time thread-timestamp">' + escapeHtml(contact.time || '') + '</span>' +
                        '</div>' +
                        '<div class="inbox-contact-preview thread-snippet-preview">' + escapeHtml(contact.preview || '') + '</div>' +
                        '<div class="inbox-contact-status-row">' + statusHtml + '</div>' +
                    '</div>' +
                '</button>' +
                '<button type="button" class="inbox-thread-archive" data-archive-id="' + escapeHtml(contact.id) + '" title="' + archiveLabel + '" aria-label="' + archiveLabel + '">' +
                    SVG.archive +
                '</button>';

            list.insertBefore(row, empty);
        });
    }

    var closeDeviceCamera = null;

    function openDeviceCamera(done) {
        if (closeDeviceCamera) closeDeviceCamera();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (done) done(null, 'This browser cannot open the camera.');
            return;
        }

        var overlay = document.createElement('div');
        overlay.className = 'kreezby-camera';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Camera');
        overlay.innerHTML =
            '<div class="kreezby-camera__panel">' +
                '<video autoplay playsinline muted></video>' +
                '<div class="kreezby-camera__actions">' +
                    '<button type="button" data-camera="cancel">Cancel</button>' +
                    '<button type="button" data-camera="shot">Take photo</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        var video = overlay.querySelector('video');
        var stream = null;
        var settled = false;

        function finish(file, error) {
            if (settled) return;
            settled = true;
            if (stream) {
                stream.getTracks().forEach(function (track) { track.stop(); });
                stream = null;
            }
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (closeDeviceCamera === finish) closeDeviceCamera = null;
            if (done) done(file || null, error || '');
        }

        closeDeviceCamera = finish;
        overlay.querySelector('[data-camera="cancel"]').addEventListener('click', function () {
            finish(null, '');
        });
        overlay.querySelector('[data-camera="shot"]').addEventListener('click', function () {
            var width = video.videoWidth || 0;
            var height = video.videoHeight || 0;
            if (!width || !height) return;
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(video, 0, 0, width, height);
            canvas.toBlob(function (blob) {
                if (!blob) {
                    finish(null, 'Could not take the photo.');
                    return;
                }
                finish(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }), '');
            }, 'image/jpeg', 0.92);
        });

        function requestCamera(attempt) {
            var constraints = attempt === 0
                ? { video: { facingMode: { ideal: 'environment' } }, audio: false }
                : { video: true, audio: false };
            return navigator.mediaDevices.getUserMedia(constraints).catch(function (err) {
                if (attempt === 0) return requestCamera(1);
                throw err;
            });
        }

        requestCamera(0).then(function (media) {
            if (settled) {
                media.getTracks().forEach(function (track) { track.stop(); });
                return;
            }
            stream = media;
            video.srcObject = media;
            var play = video.play();
            if (play && typeof play.catch === 'function') play.catch(function () {});
        }).catch(function () {
            finish(null, 'Allow camera access to take a photo.');
        });
    }

    function formatBytes(size) {
        var bytes = Number(size) || 0;
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function fileKind(file) {
        var type = String((file && file.type) || '');
        if (type.indexOf('image/') === 0) return 'image';
        if (type.indexOf('video/') === 0) return 'video';
        if (type.indexOf('audio/') === 0) return 'audio';
        return 'file';
    }

    function appendMessageFiles(bubble, files) {
        if (!files || !files.length) return;
        var wrap = document.createElement('div');
        wrap.className = 'inbox-message-files';
        files.forEach(function (file) {
            if (file.kind === 'image' && file.url) {
                var link = document.createElement('a');
                link.className = 'inbox-message-media';
                link.href = file.url;
                link.target = '_blank';
                link.rel = 'noopener';
                var img = document.createElement('img');
                img.alt = file.name || 'Photo';
                img.src = file.url;
                link.appendChild(img);
                wrap.appendChild(link);
                return;
            }
            if (file.kind === 'video' && file.url) {
                var video = document.createElement('video');
                video.className = 'inbox-message-video';
                video.controls = true;
                video.src = file.url;
                wrap.appendChild(video);
                return;
            }
            if (file.kind === 'audio' && file.url) {
                var audio = document.createElement('audio');
                audio.className = 'inbox-message-audio';
                audio.controls = true;
                audio.src = file.url;
                wrap.appendChild(audio);
                return;
            }
            var doc = document.createElement('a');
            doc.className = 'inbox-message-doc';
            if (file.url) {
                doc.href = file.url;
                doc.download = file.name || 'file';
            } else {
                doc.href = '#';
            }
            doc.innerHTML = SVG.file + '<span><strong></strong><small></small></span>';
            doc.querySelector('strong').textContent = file.name || 'Document';
            doc.querySelector('small').textContent = formatBytes(file.size);
            wrap.appendChild(doc);
        });
        bubble.appendChild(wrap);
    }

    function renderMessages(container, items) {
        container.innerHTML = '';
        (items || []).forEach(function (msg) {
            var row = document.createElement('div');
            row.className = 'inbox-message-row message-row ' + (msg.type === 'outgoing' ? 'is-outgoing outgoing-node' : 'is-incoming incoming-node');
            var bubble = document.createElement('div');
            bubble.className = 'inbox-message-bubble speech-bubble';
            appendMessageFiles(bubble, msg.attachments);
            if (msg.text) {
                var text = document.createElement('span');
                text.className = 'inbox-message-text';
                text.textContent = msg.text;
                bubble.appendChild(text);
            }
            if (msg.time) {
                var time = document.createElement('span');
                time.className = 'inbox-message-time bubble-time-footnote';
                time.textContent = msg.time;
                bubble.appendChild(time);
            }
            row.appendChild(bubble);
            container.appendChild(row);
        });
        container.scrollTop = container.scrollHeight;
    }

    function closeInboxDropdown(wrap) {
        if (!wrap) return;
        wrap.classList.remove('is-open');
        var menu = wrap.querySelector('.inbox-dropdown-menu');
        var trigger = wrap.querySelector('.inbox-icon-btn, .btn-attachment-trigger');
        if (menu) menu.classList.remove('is-open');
        if (trigger) trigger.classList.remove('is-open');
    }

    function wireDropdowns(root, onAttach, onEmoji) {
        root.querySelectorAll('.inbox-dropdown').forEach(function (wrap) {
            var trigger = wrap.querySelector('.inbox-icon-btn, .btn-attachment-trigger');
            var menu = wrap.querySelector('.inbox-dropdown-menu');
            if (!trigger || !menu) return;

            trigger.addEventListener('click', function (event) {
                event.stopPropagation();
                if (trigger.disabled) return;
                var open = wrap.classList.contains('is-open');
                root.querySelectorAll('.inbox-dropdown').forEach(function (other) {
                    closeInboxDropdown(other);
                });
                if (!open) {
                    wrap.classList.add('is-open');
                    menu.classList.add('is-open');
                    trigger.classList.add('is-open');
                }
            });

            menu.addEventListener('click', function (event) {
                event.stopPropagation();
                var item = event.target.closest('.inbox-dropdown-item, .inbox-emoji-btn');
                if (!item) return;
                if (wrap.getAttribute('data-dropdown') === 'emoji') {
                    var emoji = item.getAttribute('data-emoji');
                    if (emoji && onEmoji) onEmoji(emoji);
                    return;
                }
                if (wrap.getAttribute('data-dropdown') === 'attach') {
                    var kind = item.getAttribute('data-attach');
                    closeInboxDropdown(wrap);
                    if (kind && onAttach) onAttach(kind);
                    return;
                }
                menu.querySelectorAll('.inbox-dropdown-item').forEach(function (btn) {
                    btn.classList.remove('is-active');
                });
                item.classList.add('is-active');
                if (wrap.getAttribute('data-dropdown') === 'filter') {
                    closeInboxDropdown(wrap);
                }
            });
        });

        document.addEventListener('click', function () {
            root.querySelectorAll('.inbox-dropdown').forEach(function (wrap) {
                wrap.classList.remove('is-open');
                var menu = wrap.querySelector('.inbox-dropdown-menu');
                var trigger = wrap.querySelector('.inbox-icon-btn, .btn-attachment-trigger');
                if (menu) menu.classList.remove('is-open');
                if (trigger) trigger.classList.remove('is-open');
            });
        });
    }

    function wireResize(root) {
        var handle = root.querySelector('#inbox-resize-handle');
        var listPanel = root.querySelector('#inbox-list-panel');
        if (!handle || !listPanel) return;

        var dragging = false;

        handle.addEventListener('mousedown', function (event) {
            dragging = true;
            handle.classList.add('is-dragging');
            event.preventDefault();
        });

        document.addEventListener('mousemove', function (event) {
            if (!dragging) return;
            var group = root.querySelector('#inbox-resizable-group');
            var rect = group.getBoundingClientRect();
            var next = ((event.clientX - rect.left) / rect.width) * 100;
            next = Math.max(20, Math.min(45, next));
            listPanel.style.width = next + '%';
        });

        document.addEventListener('mouseup', function () {
            dragging = false;
            handle.classList.remove('is-dragging');
        });
    }

    function initRoot(mount) {
        var role = (mount.getAttribute('data-inbox-role') || 'admin').toLowerCase();
        var preset = PRESETS[role] || PRESETS.admin;
        var contacts = preset.contacts.slice();
        var messages = preset.messages || {};
        var activeId = null;
        var listFilter = 'all';
        var searchQuery = '';
        var pendingFiles = [];
        var attachNoteTimer = 0;
        var MAX_ATTACH_BYTES = 12 * 1024 * 1024;

        var messenger = mount.classList.contains('inbox-messenger');
        mount.classList.add('inbox-chat-root');
        mount.innerHTML = buildShell(role, messenger);

        var contactList = mount.querySelector('#inbox-contact-list');
        var messageContainer = mount.querySelector('#chat-messages-container');
        var nameEl = mount.querySelector('#inbox-active-name');
        var statusEl = mount.querySelector('#inbox-active-status');
        var avatarEl = mount.querySelector('#inbox-header-avatar');
        var input = mount.querySelector('#chat-type-input');
        if (messenger && input) input.placeholder = 'Aa';
        if (messenger) {
            var darkBtn = mount.querySelector('#inbox-dark-mode-btn');
            function applyDark(on) {
                mount.classList.toggle('is-dark', on);
                if (!darkBtn) return;
                darkBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
                darkBtn.title = on ? 'Light mode' : 'Dark mode';
                darkBtn.innerHTML = on ? SVG.sun : SVG.moon;
            }
            var savedDark = false;
            try { savedDark = localStorage.getItem('kreezby-inbox-dark') === '1'; } catch (e) {}
            applyDark(savedDark);
            if (darkBtn) {
                darkBtn.addEventListener('click', function () {
                    var next = !mount.classList.contains('is-dark');
                    applyDark(next);
                    try { localStorage.setItem('kreezby-inbox-dark', next ? '1' : '0'); } catch (e) {}
                });
            }
        }
        var sendIcon = mount.querySelector('#inbox-compose-send');
        var hiddenSend = mount.querySelector('#inbox-send-btn');

        function visibleContacts() {
            return contacts.filter(function (contact) {
                var archived = Boolean(contact.archived);
                var unread = Boolean(contact.unread) && !archived;
                if (listFilter === 'unread' && !unread) return false;
                if (listFilter === 'read' && (unread || archived)) return false;
                if (listFilter === 'archive' && !archived) return false;
                if (listFilter === 'all' && archived) return false;
                if (searchQuery) {
                    var haystack = (contact.name + ' ' + (contact.preview || '')).toLowerCase();
                    if (haystack.indexOf(searchQuery) < 0) return false;
                }
                return true;
            });
        }

        function closeFilterMenu() {
            closeInboxDropdown(mount.querySelector('[data-dropdown="filter"]'));
        }

        function syncFilterUi() {
            var title = mount.querySelector('.inbox-chat-list-title');
            if (title) {
                title.textContent = listFilter === 'archive'
                    ? 'Archived'
                    : (listFilter === 'unread' ? 'Unread' : (listFilter === 'read' ? 'Read' : 'Chats'));
            }

            mount.querySelectorAll('[data-dropdown="filter"] [data-filter]').forEach(function (other) {
                other.classList.toggle('is-active', other.getAttribute('data-filter') === listFilter);
            });

            var filterTrigger = mount.querySelector('[data-dropdown="filter"] > .inbox-icon-btn');
            if (filterTrigger) {
                filterTrigger.classList.toggle('is-filtered', listFilter === 'unread' || listFilter === 'read');
            }

            var archiveBackBtn = mount.querySelector('#inbox-archive-back-btn');
            if (archiveBackBtn) {
                archiveBackBtn.hidden = listFilter === 'all';
            }

            var archiveViewBtn = mount.querySelector('#inbox-archive-view-btn');
            if (archiveViewBtn) {
                var onArchive = listFilter === 'archive';
                archiveViewBtn.classList.toggle('is-open', onArchive);
                archiveViewBtn.setAttribute('aria-pressed', onArchive ? 'true' : 'false');
                archiveViewBtn.title = onArchive ? 'Back to all chats' : 'View archived chats';
            }
        }

        function setListFilter(nextFilter) {
            listFilter = nextFilter || 'all';
            syncFilterUi();
            refreshContactList();
            var shown = visibleContacts();
            if (shown.length && shown.every(function (item) { return item.id !== activeId; })) {
                selectContact(shown[0].id, { keepUnread: true });
            }
        }

        function refreshContactList() {
            var shown = visibleContacts();
            renderContacts(mount, shown, activeId);
            var empty = mount.querySelector('#inbox-threads-empty');
            if (empty) {
                empty.style.display = shown.length ? 'none' : '';
                if (!shown.length) {
                    empty.textContent = searchQuery
                        ? 'No chats match your search.'
                        : (listFilter === 'archive' ? 'No archived chats.' : 'No conversations in this filter.');
                }
            }
            bindContactClicks();
        }

        function toggleArchive(id) {
            var contact = getContact(id);
            if (!contact) return;
            contact.archived = !contact.archived;
            if (contact.archived) contact.unread = false;
            refreshContactList();

            var shown = visibleContacts();
            if (shown.length && shown.every(function (item) { return item.id !== activeId; })) {
                selectContact(shown[0].id, { keepUnread: true });
            } else if (!shown.length) {
                activeId = null;
            }
        }

        function getContact(id) {
            for (var i = 0; i < contacts.length; i++) {
                if (contacts[i].id === id) return contacts[i];
            }
            return null;
        }

        function selectContact(id, options) {
            var contact = getContact(id);
            if (!contact) return;
            if (!options || !options.keepUnread) contact.unread = false;

            var applySelection = function () {
                activeId = id;

                mount.querySelectorAll('.inbox-contact-item').forEach(function (item) {
                    item.classList.toggle('is-active', item.getAttribute('data-thread-id') === id);
                    item.classList.toggle('selected-active', item.getAttribute('data-thread-id') === id);
                });

                nameEl.textContent = contact.name;
                statusEl.textContent = contact.online ? 'Active now' : 'Contact Info';
                statusEl.classList.toggle('is-live', Boolean(contact.online));
                avatarEl.className = 'inbox-avatar' + (contact.online ? ' is-online' : '');
                avatarEl.textContent = contact.initials || contact.name.charAt(0);
                if (mount.classList.contains('inbox-messenger')) {
                    avatarEl.style.background = avatarColor(contact.name);
                }

                if (!messages[id]) messages[id] = [];
                renderMessages(messageContainer, messages[id]);
                refreshContactList();

                if (window.KreezbyStaffInbox && typeof window.KreezbyStaffInbox.onThreadSelected === 'function') {
                    window.KreezbyStaffInbox.onThreadSelected(contact);
                }

                requestAnimationFrame(function () {
                    messageContainer.classList.remove('is-switching');
                });
            };

            messageContainer.classList.add('is-switching');
            window.setTimeout(applySelection, activeId ? 160 : 0);
        }

        function showAttachNote(message, sticky) {
            var note = mount.querySelector('#inbox-attach-note');
            if (!note) return;
            window.clearTimeout(attachNoteTimer);
            note.hidden = !message;
            note.textContent = message || '';
            if (message && !sticky) {
                attachNoteTimer = window.setTimeout(function () {
                    note.hidden = true;
                    note.textContent = '';
                }, 3200);
            }
        }

        function releasePending(item) {
            if (item && item.revoke && item.url) {
                try { URL.revokeObjectURL(item.url); } catch (err) { /* ignore */ }
            }
        }

        function renderPending() {
            var box = mount.querySelector('#inbox-attach-preview');
            if (!box) return;
            box.innerHTML = '';
            box.hidden = !pendingFiles.length;
            pendingFiles.forEach(function (item, index) {
                var chip = document.createElement('div');
                chip.className = 'inbox-attach-chip' + (item.kind === 'file' ? ' is-file' : '');
                if (item.kind === 'image') {
                    var img = document.createElement('img');
                    img.alt = '';
                    img.src = item.url;
                    chip.appendChild(img);
                } else if (item.kind === 'video') {
                    var video = document.createElement('video');
                    video.muted = true;
                    video.src = item.url;
                    chip.appendChild(video);
                } else {
                    var label = document.createElement('span');
                    label.className = 'inbox-attach-file';
                    label.innerHTML = SVG.file + '<span></span>';
                    label.querySelector('span').textContent = item.name;
                    chip.appendChild(label);
                }
                var remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'inbox-attach-remove';
                remove.setAttribute('aria-label', 'Remove attachment');
                remove.textContent = '×';
                remove.addEventListener('click', function () {
                    var removed = pendingFiles.splice(index, 1)[0];
                    releasePending(removed);
                    renderPending();
                });
                chip.appendChild(remove);
                box.appendChild(chip);
            });
        }

        function addPendingFiles(fileList) {
            var attachBtn = mount.querySelector('.btn-attachment-trigger');
            if ((attachBtn && attachBtn.disabled) || (input && input.disabled)) return;
            if (!activeId) {
                showAttachNote('Open a chat before attaching a file.');
                return;
            }
            var rejected = 0;
            Array.prototype.forEach.call(fileList || [], function (file) {
                if (!file) return;
                if (file.size > MAX_ATTACH_BYTES) {
                    rejected += 1;
                    return;
                }
                var kind = fileKind(file);
                pendingFiles.push({
                    name: file.name || (kind === 'image' ? 'Photo' : 'Attachment'),
                    kind: kind,
                    type: file.type || '',
                    size: file.size || 0,
                    url: URL.createObjectURL(file),
                    revoke: true
                });
            });
            renderPending();
            if (rejected) showAttachNote('Each file must be 12 MB or smaller.');
        }

        function openAttach(kind) {
            var attachBtn = mount.querySelector('.btn-attachment-trigger');
            if ((attachBtn && attachBtn.disabled) || (input && input.disabled)) return;
            if (kind === 'camera') {
                if (!activeId) {
                    showAttachNote('Open a chat before taking a photo.');
                    return;
                }
                openDeviceCamera(function (file, error) {
                    if (error) showAttachNote(error);
                    else if (file) addPendingFiles([file]);
                });
                return;
            }
            var picker = mount.querySelector('#inbox-file-' + kind);
            if (!picker) return;
            picker.value = '';
            picker.click();
        }

        function attachmentPreview(files, text) {
            if (text) return text;
            if (!files || !files.length) return '';
            if (files[0].kind === 'image') return files.length > 1 ? 'Photos' : 'Photo';
            if (files[0].kind === 'video') return files.length > 1 ? 'Videos' : 'Video';
            if (files[0].kind === 'audio') return 'Voice message';
            return files[0].name || 'Document';
        }

        function insertEmoji(emoji) {
            if (!input || input.disabled || !emoji) return;
            var start = input.selectionStart == null ? input.value.length : input.selectionStart;
            var end = input.selectionEnd == null ? input.value.length : input.selectionEnd;
            input.value = input.value.slice(0, start) + emoji + input.value.slice(end);
            var pos = start + emoji.length;
            input.focus();
            if (input.setSelectionRange) input.setSelectionRange(pos, pos);
        }

        var voice = { recorder: null, stream: null, chunks: [], chatId: null, send: false, started: 0, timer: 0 };

        function voiceClock(ms) {
            var total = Math.max(0, Math.floor(ms / 1000));
            var minutes = Math.floor(total / 60);
            var seconds = total % 60;
            return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        }

        function setVoiceUi(on) {
            var btn = mount.querySelector('#inbox-voice-btn');
            if (!btn) return;
            btn.classList.toggle('is-recording', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.title = on ? 'Stop and send voice message' : 'Voice message';
        }

        function finishVoice() {
            window.clearInterval(voice.timer);
            voice.timer = 0;
            setVoiceUi(false);
            if (voice.stream) {
                voice.stream.getTracks().forEach(function (track) { track.stop(); });
                voice.stream = null;
            }
        }

        function deliverVoice(blob, mime, chatId) {
            if (!chatId || !blob || !blob.size) return;
            if (!messages[chatId]) messages[chatId] = [];
            var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messages[chatId].push({
                type: 'outgoing',
                text: '',
                time: time,
                attachments: [{
                    name: 'Voice message',
                    kind: 'audio',
                    type: mime || blob.type || '',
                    size: blob.size,
                    url: URL.createObjectURL(blob)
                }]
            });
            var contact = getContact(chatId);
            if (contact) contact.preview = 'You: Voice message';
            if (activeId === chatId && messageContainer) renderMessages(messageContainer, messages[chatId]);
            refreshContactList();
        }

        function stopVoice(send) {
            voice.send = !!send;
            if (voice.recorder && voice.recorder.state === 'recording') {
                voice.recorder.stop();
                return;
            }
            finishVoice();
            showAttachNote('');
        }

        function startVoice() {
            var voiceBtn = mount.querySelector('#inbox-voice-btn');
            if ((voiceBtn && voiceBtn.disabled) || (input && input.disabled)) return;
            if (!activeId) {
                showAttachNote('Open a chat before sending a voice message.');
                return;
            }
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
                showAttachNote('Voice messages need a microphone in this browser.');
                return;
            }
            closeInboxDropdown(mount.querySelector('[data-dropdown="emoji"]'));
            closeInboxDropdown(mount.querySelector('[data-dropdown="attach"]'));
            var chatId = activeId;
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
                if (activeId !== chatId) {
                    stream.getTracks().forEach(function (track) { track.stop(); });
                    return;
                }
                var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
                var mime = '';
                for (var i = 0; i < types.length; i++) {
                    if (window.MediaRecorder.isTypeSupported(types[i])) {
                        mime = types[i];
                        break;
                    }
                }
                var recorder;
                try {
                    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
                } catch (err) {
                    stream.getTracks().forEach(function (track) { track.stop(); });
                    showAttachNote('This browser could not start a voice recording.');
                    return;
                }
                voice.stream = stream;
                voice.recorder = recorder;
                voice.chunks = [];
                voice.chatId = chatId;
                voice.send = false;
                voice.started = Date.now();
                recorder.ondataavailable = function (event) {
                    if (event.data && event.data.size) voice.chunks.push(event.data);
                };
                recorder.onstop = function () {
                    var blob = new Blob(voice.chunks, { type: recorder.mimeType || mime || 'audio/webm' });
                    var shouldSend = voice.send && blob.size && (Date.now() - voice.started) > 350;
                    var target = voice.chatId;
                    voice.recorder = null;
                    voice.chunks = [];
                    finishVoice();
                    if (shouldSend) {
                        showAttachNote('');
                        deliverVoice(blob, blob.type, target);
                    } else if (voice.send) {
                        showAttachNote('Record a little longer, then tap the microphone to send.');
                    } else {
                        showAttachNote('');
                    }
                };
                recorder.start();
                setVoiceUi(true);
                showAttachNote('Recording 0:00 — tap the microphone to send', true);
                voice.timer = window.setInterval(function () {
                    showAttachNote('Recording ' + voiceClock(Date.now() - voice.started) + ' — tap the microphone to send', true);
                }, 500);
            }).catch(function () {
                showAttachNote('Allow microphone access to send a voice message.');
            });
        }

        function toggleVoice() {
            if (voice.recorder && voice.recorder.state === 'recording') stopVoice(true);
            else startVoice();
        }

        function sendMessage() {
            if (!input || input.disabled) return;
            var text = input.value.trim();
            if ((!text && !pendingFiles.length) || !activeId) return;

            if (!messages[activeId]) messages[activeId] = [];
            var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var attachments = pendingFiles.map(function (item) {
                return {
                    name: item.name,
                    kind: item.kind,
                    type: item.type,
                    size: item.size,
                    url: item.url
                };
            });
            pendingFiles.forEach(function (item) { item.revoke = false; });
            pendingFiles = [];
            renderPending();
            messages[activeId].push({ type: 'outgoing', text: text, time: time, attachments: attachments });
            input.value = '';
            renderMessages(messageContainer, messages[activeId]);

            var contact = getContact(activeId);
            if (contact) contact.preview = 'You: ' + attachmentPreview(attachments, text);
            refreshContactList();
            if (window.KreezbyStaffInbox && typeof window.KreezbyStaffInbox.onThreadSelected === 'function') {
                window.KreezbyStaffInbox.onThreadSelected(contact);
            }
        }

        function bindContactClicks() {
            mount.querySelectorAll('.inbox-contact-select').forEach(function (item) {
                item.onclick = function () {
                    var row = item.closest('.inbox-contact-item');
                    if (row) selectContact(row.getAttribute('data-thread-id'));
                };
            });
            mount.querySelectorAll('.inbox-thread-archive').forEach(function (btn) {
                btn.onclick = function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleArchive(btn.getAttribute('data-archive-id'));
                };
            });
        }

        refreshContactList();
        var firstVisible = visibleContacts()[0];
        if (firstVisible) selectContact(firstVisible.id, { keepUnread: true });

        var searchInput = mount.querySelector('#inbox-search-input');
        var headerSearchBtn = mount.querySelector('#inbox-header-search-btn');

        function focusChatSearch() {
            if (!searchInput) return;
            searchInput.focus();
            searchInput.select();
            var searchWrap = mount.querySelector('.inbox-chat-search');
            if (searchWrap) {
                searchWrap.classList.add('is-focused');
                window.setTimeout(function () { searchWrap.classList.remove('is-focused'); }, 900);
            }
        }

        if (searchInput) {
            searchInput.addEventListener('input', function (event) {
                searchQuery = String(event.target.value || '').trim().toLowerCase();
                refreshContactList();
            });
            searchInput.addEventListener('keydown', function (event) {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                var shown = visibleContacts();
                if (shown[0]) selectContact(shown[0].id);
            });
        }

        var searchIcon = mount.querySelector('.inbox-chat-search svg');
        if (searchIcon) {
            searchIcon.style.cursor = 'pointer';
            searchIcon.addEventListener('click', focusChatSearch);
        }
        if (headerSearchBtn) {
            headerSearchBtn.addEventListener('click', focusChatSearch);
        }

        mount.querySelectorAll('[data-dropdown="filter"] [data-filter]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var next = btn.getAttribute('data-filter') || 'unread';
                if (listFilter === next) next = 'all';
                setListFilter(next);
                closeFilterMenu();
            });
        });

        var archiveViewBtn = mount.querySelector('#inbox-archive-view-btn');
        if (archiveViewBtn) {
            archiveViewBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                setListFilter(listFilter === 'archive' ? 'all' : 'archive');
            });
        }

        var archiveBackBtn = mount.querySelector('#inbox-archive-back-btn');
        if (archiveBackBtn) {
            archiveBackBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                setListFilter('all');
            });
        }

        if (input) {
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') sendMessage();
            });
        }
        if (sendIcon) sendIcon.addEventListener('click', sendMessage);
        if (hiddenSend) hiddenSend.addEventListener('click', sendMessage);
        var voiceBtn = mount.querySelector('#inbox-voice-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', function (event) {
                event.stopPropagation();
                toggleVoice();
            });
        }

        ['document'].forEach(function (kind) {
            var picker = mount.querySelector('#inbox-file-' + kind);
            if (!picker) return;
            picker.addEventListener('change', function () {
                addPendingFiles(picker.files);
                picker.value = '';
            });
        });

        wireDropdowns(mount, openAttach, insertEmoji);
        wireResize(mount);

        window.transmitLiveMessageRow = sendMessage;

        function clearActive() {
            activeId = null;
            if (nameEl) nameEl.textContent = 'Select a chat';
            if (statusEl) statusEl.textContent = 'No conversation selected';
            if (avatarEl) {
                avatarEl.className = 'inbox-avatar';
                avatarEl.textContent = 'K';
            }
            if (messageContainer) messageContainer.innerHTML = '';
            if (input) input.value = '';
            pendingFiles.forEach(releasePending);
            pendingFiles = [];
            renderPending();
            stopVoice(false);
            if (closeDeviceCamera) closeDeviceCamera();
            mount.querySelectorAll('.inbox-contact-item').forEach(function (item) {
                item.classList.remove('is-active', 'selected-active');
            });
        }

        mount.kreezbyInboxApi = {
            selectContact: selectContact,
            clearActive: clearActive,
            getContacts: function () { return contacts; },
            getActiveId: function () { return activeId; }
        };
    }

    function init() {
        document.querySelectorAll('[data-inbox-role]').forEach(function (el) {
            if (!el.querySelector('#inbox-contact-list')) {
                initRoot(el);
            }
        });
    }

    window.KreezbyInboxChat = { init: init, initRoot: initRoot, PRESETS: PRESETS };

    function bootInbox() {
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootInbox);
    } else {
        bootInbox();
    }

    document.addEventListener('kreezby:page-load', bootInbox);
    document.addEventListener('turbo:load', bootInbox);
})();
