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
        arrowLeft: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>'
    };

    var PRESETS = {
        admin: {
            contacts: [
                { id: 'sidc', name: 'SIDC Batangas Hub', preview: 'Weekly replenishment PO-SIDC-001 received.', time: '15:31', initials: 'S', online: true, unread: true },
                { id: 'maria', name: 'Maria Santos', preview: 'Order ORD-2026-1042 is still packing.', time: 'Today', initials: 'M', unread: true },
                { id: 'metro', name: 'Metro Bulk Distributors', preview: 'WPO-M-0091 awaiting truck assignment.', time: 'Yesterday', initials: 'W', unread: false },
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
                ],
                metro: [
                    { type: 'incoming', text: 'QC warehouse is ready for the next bulk wave.', time: 'Yesterday' },
                    { type: 'outgoing', text: 'WPO-M-0091 is queued — truck assignment later today.', time: 'Yesterday' }
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

    function buildShell(role) {
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
                            iconBtn(SVG.video, 'Video call') +
                            iconBtn(SVG.phone, 'Phone call') +
                            '<button type="button" class="inbox-icon-btn" id="inbox-header-search-btn" title="Search chats">' + SVG.search + '</button>' +
                        '</div>' +
                    '</div>' +
                    '<div id="inbox-retailer-access-banner" class="inbox-retailer-access-banner" style="display:none;"></div>' +
                    '<div class="inbox-messages-viewport messages-scroll-viewport" id="chat-messages-container"></div>' +
                    '<div class="inbox-composer-bar chat-composition-footer-bar">' +
                        iconBtn(SVG.smile, 'Emoji') +
                        '<div class="inbox-dropdown" data-dropdown="attach">' +
                            '<button type="button" class="inbox-icon-btn btn-attachment-trigger" title="Attach file">' + SVG.paperclip + '</button>' +
                            '<div class="inbox-dropdown-menu">' +
                                '<button type="button" class="inbox-dropdown-item" data-attach="photos"><span class="inbox-dropdown-icon">' + SVG.image + '</span><span>Photos &amp; Videos</span></button>' +
                                '<button type="button" class="inbox-dropdown-item" data-attach="camera"><span class="inbox-dropdown-icon">' + SVG.camera + '</span><span>Camera</span></button>' +
                                '<button type="button" class="inbox-dropdown-item" data-attach="document"><span class="inbox-dropdown-icon">' + SVG.file + '</span><span>Document</span></button>' +
                            '</div>' +
                        '</div>' +
                        '<input type="text" class="composition-input-element" id="chat-type-input" placeholder="Type a message">' +
                        iconBtn(SVG.send, 'Send') +
                        iconBtn(SVG.mic, 'Voice message') +
                        '<button type="button" class="btn-send-message-action" id="inbox-send-btn" hidden>Send</button>' +
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
                    '<div class="' + avatarClass + '">' + avatarHtml + '</div>' +
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

    function renderMessages(container, items) {
        container.innerHTML = '';
        (items || []).forEach(function (msg) {
            var row = document.createElement('div');
            row.className = 'inbox-message-row message-row ' + (msg.type === 'outgoing' ? 'is-outgoing outgoing-node' : 'is-incoming incoming-node');
            row.innerHTML =
                '<div class="inbox-message-bubble speech-bubble">' +
                    escapeHtml(msg.text) +
                    (msg.time ? '<span class="inbox-message-time bubble-time-footnote">' + escapeHtml(msg.time) + '</span>' : '') +
                '</div>';
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

    function wireDropdowns(root) {
        root.querySelectorAll('.inbox-dropdown').forEach(function (wrap) {
            var trigger = wrap.querySelector('.inbox-icon-btn, .btn-attachment-trigger');
            var menu = wrap.querySelector('.inbox-dropdown-menu');
            if (!trigger || !menu) return;

            trigger.addEventListener('click', function (event) {
                event.stopPropagation();
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
                var item = event.target.closest('.inbox-dropdown-item');
                if (!item) return;
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

        mount.classList.add('inbox-chat-root');
        mount.innerHTML = buildShell(role);

        var contactList = mount.querySelector('#inbox-contact-list');
        var messageContainer = mount.querySelector('#chat-messages-container');
        var nameEl = mount.querySelector('#inbox-active-name');
        var statusEl = mount.querySelector('#inbox-active-status');
        var avatarEl = mount.querySelector('#inbox-header-avatar');
        var input = mount.querySelector('#chat-type-input');
        var sendIcons = mount.querySelectorAll('.inbox-composer-bar .inbox-icon-btn');
        var sendIcon = sendIcons[sendIcons.length - 2];
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
                statusEl.textContent = contact.online ? 'Active Now' : 'Contact Info';
                avatarEl.className = 'inbox-avatar' + (contact.online ? ' is-online' : '');
                avatarEl.textContent = contact.initials || contact.name.charAt(0);

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

        function sendMessage() {
            if (!input || input.disabled) return;
            var text = input.value.trim();
            if (!text || !activeId) return;

            if (!messages[activeId]) messages[activeId] = [];
            var time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messages[activeId].push({ type: 'outgoing', text: text, time: time });
            input.value = '';
            renderMessages(messageContainer, messages[activeId]);

            var contact = getContact(activeId);
            if (contact) contact.preview = 'You: ' + text;
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

        wireDropdowns(mount);
        wireResize(mount);

        window.transmitLiveMessageRow = sendMessage;

        mount.kreezbyInboxApi = {
            selectContact: selectContact,
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
