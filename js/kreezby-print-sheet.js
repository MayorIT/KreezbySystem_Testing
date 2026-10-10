/**
 * Shared layout for Action → Print documents (back order, receipt, receiving, return, sales).
 */
(function () {
    'use strict';

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    function logoSrc() {
        var img = document.querySelector('.brand-logo-panel img, .top-navbar-node img');
        if (img) {
            var raw = img.getAttribute('src') || img.src;
            if (raw) {
                try { return new URL(raw, window.location.href).href; } catch (e) { return raw; }
            }
        }
        try { return new URL('../assets/logo/kreezby-logo.png', window.location.href).href; } catch (e2) { return ''; }
    }

    function cellHtml(value) {
        if (value && typeof value === 'object') {
            var text = esc(value.text || '—');
            var sub = value.sub ? '<span class="ksheet-sub">' + esc(value.sub) + '</span>' : '';
            return text + sub;
        }
        if (value == null || value === '') return '—';
        return esc(value);
    }

    function css() {
        return '@page{size:A4 portrait;margin:12mm 14mm 16mm}' +
            '*{box-sizing:border-box}' +
            'html,body{margin:0;padding:0;background:#fff;color:#1a2340}' +
            'body{font-family:"Segoe UI",Tahoma,Geneva,sans-serif}' +
            '.ksheet{width:100%}' +
            '.ksheet-top{display:flex;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px solid #ffc107}' +
            '.ksheet-logo{height:62px;width:auto;max-width:150px;object-fit:contain}' +
            '.ksheet-brand{margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#8a6a12}' +
            '.ksheet-top h1{margin:3px 0 0;font-size:26px;line-height:1.05;letter-spacing:-.03em;font-weight:800}' +
            '.ksheet-doc{margin-left:auto;text-align:right}' +
            '.ksheet-doc .ksheet-kicker{display:block;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7a8494}' +
            '.ksheet-doc strong{display:block;margin-top:2px;font-size:18px;letter-spacing:-.02em}' +
            '.ksheet-status{display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;background:#fff6d4;border:1px solid #f3e0a2;font-size:11px;font-weight:800;letter-spacing:.04em}' +
            '.ksheet-amount{margin-top:8px}' +
            '.ksheet-amount span{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7a8494}' +
            '.ksheet-amount b{display:block;margin-top:1px;font-size:20px;letter-spacing:-.03em}' +
            '.ksheet-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 18px;margin:16px 0 14px}' +
            '.ksheet-fact span{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7a8494}' +
            '.ksheet-fact strong{display:block;margin-top:3px;font-size:13px;font-weight:700}' +
            '.ksheet-note{margin:0 0 16px;padding:10px 12px;background:#faf8f4;border:1px solid #ece7df;border-radius:10px}' +
            '.ksheet-note span{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7a8494}' +
            '.ksheet-note p{margin:4px 0 0;font-size:13px;line-height:1.45}' +
            '.ksheet-table{width:100%;border-collapse:collapse}' +
            '.ksheet-table th{background:#1a2340;color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;text-align:left;padding:8px 10px}' +
            '.ksheet-table td{padding:8px 10px;border-bottom:1px solid #e7ebf0;font-size:12.5px;vertical-align:top}' +
            '.ksheet-table tbody tr:nth-child(even) td{background:#f7f8fa}' +
            '.ksheet-table .num,.ksheet-table th.num{text-align:right}' +
            '.ksheet-table tfoot td{border-bottom:0;border-top:2px solid #1a2340;font-weight:800;background:#fff}' +
            '.ksheet-table.is-dense th,.ksheet-table.is-dense td{font-size:10px;padding:5px 6px}' +
            '.ksheet-sub{display:block;margin-top:2px;color:#6b7280;font-size:11px;font-weight:500}' +
            '.ksheet-extra{margin-top:14px;font-size:13px}' +
            '.ksheet-pay p{margin:4px 0}' +
            '.ksheet-pay-title{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7a8494}' +
            '.ksheet-box{display:inline-block;width:14px;height:14px;margin-right:6px;border:1.5px solid #1a2340;text-align:center;line-height:12px;font-size:11px;font-weight:800;vertical-align:-1px}' +
            '.ksheet-signs{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:42px}' +
            '.ksheet-sign{padding-top:8px;border-top:1px solid #1a2340;font-size:11px;color:#5c6b80}' +
            '.ksheet-printed{margin:18px 0 0;font-size:11px;color:#8b93a3}' +
            '.ksheet-actions{margin:20px 0 8px}' +
            '.ksheet-actions button{min-height:38px;padding:0 18px;border:0;border-radius:999px;background:#ffc107;color:#1a1a1a;font:inherit;font-size:13px;font-weight:800;cursor:pointer}' +
            '@media print{.ksheet-actions{display:none}}';
    }

    function bodyHtml(doc) {
        var facts = (doc.facts || []).map(function (fact) {
            return '<div class="ksheet-fact"><span>' + esc(fact.label) + '</span><strong>' + esc(fact.value || '—') + '</strong></div>';
        }).join('');
        var columns = doc.columns || [];
        var rows = doc.rows || [];
        var dense = columns.length > 6 ? ' is-dense' : '';
        var table = '';
        if (columns.length) {
            var head = columns.map(function (col) {
                return '<th class="' + (col.align === 'right' ? 'num' : '') + '">' + esc(col.label) + '</th>';
            }).join('');
            var body = rows.length ? rows.map(function (row) {
                return '<tr>' + row.map(function (value, index) {
                    var align = columns[index] && columns[index].align === 'right' ? ' class="num"' : '';
                    return '<td' + align + '>' + cellHtml(value) + '</td>';
                }).join('') + '</tr>';
            }).join('') : '<tr><td colspan="' + columns.length + '">No line items.</td></tr>';
            var foot = '';
            if (doc.totalLabel && columns.length > 1) {
                foot = '<tfoot><tr><td colspan="' + (columns.length - 1) + '">' + esc(doc.totalLabel) + '</td><td class="num">' + esc(doc.totalValue || '—') + '</td></tr></tfoot>';
            }
            table = '<table class="ksheet-table' + dense + '"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody>' + foot + '</table>';
        }
        var note = '';
        if (doc.note && doc.note.text) {
            note = '<section class="ksheet-note"><span>' + esc(doc.note.label || 'Notes') + '</span><p>' + esc(doc.note.text) + '</p></section>';
        }
        var signs = (doc.signs || ['Prepared by', 'Received by']).map(function (label) {
            return '<div class="ksheet-sign">' + esc(label) + '</div>';
        }).join('');
        var amount = '';
        if (doc.totalValue) {
            amount = '<div class="ksheet-amount"><span>' + esc(doc.totalLabel || 'Total') + '</span><b>' + esc(doc.totalValue) + '</b></div>';
        }
        var status = doc.status ? '<div class="ksheet-status">' + esc(doc.status) + '</div>' : '';
        return '<article class="ksheet">' +
            '<header class="ksheet-top">' +
            '<img class="ksheet-logo" src="' + esc(logoSrc()) + '" alt="Kreezby Bakeshop">' +
            '<div><p class="ksheet-brand">Kreezby Bakeshop</p><h1>' + esc(doc.title || 'Report') + '</h1></div>' +
            '<div class="ksheet-doc"><span class="ksheet-kicker">Document</span><strong>' + esc(doc.docNo || '—') + '</strong>' + status + amount + '</div>' +
            '</header>' +
            (facts ? '<section class="ksheet-facts">' + facts + '</section>' : '') +
            note + table +
            (doc.extraHtml || '') +
            '<div class="ksheet-signs">' + signs + '</div>' +
            '<p class="ksheet-printed">Printed ' + esc(new Date().toLocaleString()) + '</p>' +
            '</article>';
    }

    function documentHtml(doc) {
        return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc((doc && doc.title) || 'Kreezby') +
            '</title><style>' + css() + '</style></head><body>' + bodyHtml(doc || {}) + '</body></html>';
    }

    function print(doc) {
        var frame = document.getElementById('kreezby-print-frame');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = 'kreezby-print-frame';
            frame.setAttribute('aria-hidden', 'true');
            frame.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;border:0;';
            document.body.appendChild(frame);
        }
        var win = frame.contentWindow;
        var idoc = win.document;
        idoc.open();
        idoc.write(documentHtml(doc));
        idoc.close();
        var go = function () {
            win.focus();
            win.print();
        };
        var logo = idoc.querySelector('.ksheet-logo');
        if (logo && !logo.complete) {
            logo.addEventListener('load', function () { setTimeout(go, 40); }, { once: true });
            logo.addEventListener('error', function () { setTimeout(go, 40); }, { once: true });
        } else {
            setTimeout(go, 60);
        }
    }

    function openPreview(doc) {
        var html = documentHtml(doc).replace('</body>',
            '<div class="ksheet-actions"><button type="button" onclick="window.print()">Print</button></div></body>');
        var preview = window.open('', '_blank', 'width=920,height=760');
        if (!preview) return false;
        preview.document.open();
        preview.document.write(html);
        preview.document.close();
        return true;
    }

    window.KreezbyPrintSheet = {
        print: print,
        openPreview: openPreview,
        documentHtml: documentHtml,
        esc: esc
    };
})();
