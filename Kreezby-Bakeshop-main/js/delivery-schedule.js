/**
 * Delivery Schedule on the AI Forecast page.
 * Head admin, admin, and staff set a stop and review upcoming deliveries by area.
 */
(function () {
    'use strict';

    if (window.KreezbyDeliverySchedule) {
        window.KreezbyDeliverySchedule.boot();
        return;
    }

    var STORE_KEY = 'kreezby_delivery_schedule_v4';
    var PRODUCT = 'Chocolate Crinkles';
    var PAYMENTS = ['GCash', 'Check', 'Cash'];
    var AREAS = [
        {
            name: 'Batangas',
            stores: ['SIDC Main', 'SIDC Soro-Soro Ilaya', '3M', 'Jhorjhanes Balagtas', 'Wanam sa Bukid Balagtas', 'AA Lomi Balagtas', 'Butch Alangilan', 'Gracias Pasalubong', 'Shell Select Kumintang Ibaba', 'SIDC Tulo', 'SIDC Libjo', 'SIDC Pallocan', 'Wanam sa Bukid Gulod', 'Wanam sa Bukid Palengke']
        },
        {
            name: 'Bauan',
            stores: ['Dyan\'s', 'Ofels', 'Jorjhanes Sta. Rita', 'HMM Muzon', 'SIDC Bauan', 'SIDC Sta. Teresita', 'AA Lomi Taal', 'Bulabog']
        },
        {
            name: 'Citimart',
            stores: ['Citimart Caedo', 'Citimart Nuciti', 'Citimart Baystay/Baymall', 'Citimart Shop on/ Rizal Ave', 'Citimart Tanauan', 'Citimart Bauan', 'Citimart Lemery', 'Citimart Rosario']
        },
        {
            name: 'Lipa',
            stores: ['SIDC Mahabang Parang', 'SIDC San Jose', 'Banay-banay Eatery', 'AA Lomi Lipa', 'Butch Lipa', 'Shell Select Tambo', 'Shell Select Balintawak', 'Chicha', 'Lipa Grill Lipa', 'Kubo sa Halamanan Malarayat', 'LBN Marawoy', 'Lucias Cafe Lipa', 'Kubo sa Halamanan Marawoy']
        },
        {
            name: 'Lucena',
            stores: ['SIDC Tiaong', 'Mr.Fields Coffe+', 'Bangihan', 'Girasoles', 'Dagat Cusina Gubat', 'Shell Select Sariaya', 'Kope Right Sariaya', 'Kope Right Lucena', 'Shell Select Domoit', 'SIDC San Juan', 'Matteos Pinagsibaan']
        },
        {
            name: 'Manila',
            stores: ['Mang Muring Total', 'Mang Muring Shell']
        },
        {
            name: 'Rosario',
            stores: ['Ben & Cha', 'SIDC IBAAN', 'Balkonahe', 'Chick\'N J Rosario', 'Chick\'N J Padre Garcia', 'Chick\'N J Ibaan', 'Matteos Liquiwan', 'AA Lomi Padre Garcia', 'Lipa Grill San Felipe', 'Yummies', 'Hang Out']
        },
        {
            name: 'Sto. Tomas',
            stores: ['Lucias Cafe Sto Tomas', 'JMA', 'Rose & Grace', 'D\'Vinias', 'Tita Chu', 'Laong Laan', 'RSM Bacnotan', 'Avilles']
        },
        {
            name: 'Tagaytay',
            stores: ['Sinangag Express Tagaytay', 'Balinsasayaw Silang', 'Jaytees Acienda', 'RSM Silvinas', 'Pamana', 'Jaytees Main', 'Balinsasayaw Tagaytay', 'Green Ats', 'Jaytees 9th']
        }
    ];

    var SEED = [
        { id: 'po-0002', area: 'Batangas', day: 1, po: 'PO-0002', stop: 'SIDC Main', detail: '80 pouches Chocolate Crinkles', payment: 'GCash' },
        { id: 'po-btg-003', area: 'Batangas', day: 1, po: 'PO-BTG-003', stop: '3M', detail: '24 pouches Chocolate Crinkles', payment: 'Cash' },
        { id: 'po-btg-014', area: 'Batangas', day: 1, po: 'PO-BTG-014', stop: 'SIDC Tulo', detail: '36 pouches Chocolate Crinkles', payment: 'Check' },
        { id: 'po-0012', area: 'Lipa', day: 1, po: 'PO-0012', stop: 'SIDC Mahabang Parang', detail: '410 pouches Chocolate Crinkles', payment: 'GCash' },
        { id: 'po-lpa-021', area: 'Lipa', day: 1, po: 'PO-LPA-021', stop: 'Lucias Cafe Lipa', detail: '16 pouches Chocolate Crinkles', payment: 'Cash' },
        { id: 'po-bau-008', area: 'Bauan', day: 2, po: 'PO-BAU-008', stop: 'SIDC Bauan', detail: '48 pouches Chocolate Crinkles', payment: 'Check' },
        { id: 'po-bau-011', area: 'Bauan', day: 2, po: 'PO-BAU-011', stop: 'Dyan\'s', detail: '18 pouches Chocolate Crinkles', payment: 'GCash' },
        { id: 'po-ctm-002', area: 'Citimart', day: 2, po: 'PO-CTM-002', stop: 'Citimart Rosario', detail: '60 pouches Chocolate Crinkles', payment: 'Cash' },
        { id: 'po-ctm-006', area: 'Citimart', day: 2, po: 'PO-CTM-006', stop: 'Citimart Bauan', detail: '40 pouches Chocolate Crinkles', payment: 'Check' },
        { id: 'po-lcn-004', area: 'Lucena', day: 2, po: 'PO-LCN-004', stop: 'SIDC Tiaong', detail: '72 pouches Chocolate Crinkles', payment: 'GCash' },
        { id: 'po-lcn-009', area: 'Lucena', day: 2, po: 'PO-LCN-009', stop: 'Kope Right Lucena', detail: '20 pouches Chocolate Crinkles', payment: 'Cash' },
        { id: 'po-mnl-001', area: 'Manila', day: 3, po: 'PO-MNL-001', stop: 'Mang Muring Total', detail: '90 pouches Chocolate Crinkles', payment: 'Check' },
        { id: 'po-mnl-002', area: 'Manila', day: 3, po: 'PO-MNL-002', stop: 'Mang Muring Shell', detail: '40 pouches Chocolate Crinkles', payment: 'GCash' },
        { id: 'po-rsr-005', area: 'Rosario', day: 3, po: 'PO-RSR-005', stop: 'SIDC IBAAN', detail: '54 pouches Chocolate Crinkles', payment: 'Cash' },
        { id: 'po-rsr-012', area: 'Rosario', day: 3, po: 'PO-RSR-012', stop: 'Chick\'N J Rosario', detail: '22 pouches Chocolate Crinkles', payment: 'Check' },
        { id: 'po-sto-003', area: 'Sto. Tomas', day: 4, po: 'PO-STO-003', stop: 'JMA', detail: '30 pouches Chocolate Crinkles', payment: 'GCash' },
        { id: 'po-sto-007', area: 'Sto. Tomas', day: 4, po: 'PO-STO-007', stop: 'Lucias Cafe Sto Tomas', detail: '18 pouches Chocolate Crinkles', payment: 'Cash' },
        { id: 'po-tgy-002', area: 'Tagaytay', day: 4, po: 'PO-TGY-002', stop: 'Pamana', detail: '28 pouches Chocolate Crinkles', payment: 'Check' },
        { id: 'po-tgy-008', area: 'Tagaytay', day: 4, po: 'PO-TGY-008', stop: 'Jaytees Main', detail: '36 pouches Chocolate Crinkles', payment: 'GCash' }
    ];

    function areaByName(name) {
        for (var i = 0; i < AREAS.length; i++) {
            if (AREAS[i].name === name) return AREAS[i];
        }
        return AREAS[0];
    }

    function plusDays(n) {
        var d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() + n);
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + month + '-' + day;
    }

    function seedRows() {
        return SEED.map(function (row) {
            var copy = {};
            Object.keys(row).forEach(function (key) { copy[key] = row[key]; });
            copy.date = plusDays(row.day || 1);
            return copy;
        });
    }

    function readRows() {
        var seed = seedRows();
        try {
            var raw = localStorage.getItem(STORE_KEY);
            var parsed = raw ? JSON.parse(raw) : null;
            if (Array.isArray(parsed)) {
                var ids = {};
                parsed.forEach(function (row) {
                    if (row && row.id) ids[row.id] = true;
                });
                seed.forEach(function (row) {
                    if (!ids[row.id]) parsed.push(row);
                });
                return parsed;
            }
        } catch (e) { /* use seed */ }
        return seed;
    }

    function writeRows(rows) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(rows)); } catch (e) { /* ignore */ }
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function todayStamp() {
        var now = new Date();
        var month = String(now.getMonth() + 1).padStart(2, '0');
        var day = String(now.getDate()).padStart(2, '0');
        return now.getFullYear() + '-' + month + '-' + day;
    }

    function nextPo(area) {
        var code = area.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
        return 'PO-' + code + '-' + String(Date.now()).slice(-4);
    }

    function ensureStyles() {
        if (document.getElementById('delivery-schedule-style')) return;
        var style = document.createElement('style');
        style.id = 'delivery-schedule-style';
        style.textContent = ''
            + '.panel-data-card:has(#delivery-schedule){overflow:visible;}'
            + '.delivery-schedule{display:grid;gap:16px;}'
            + '.delivery-schedule__form{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:end;padding:14px;border:1px solid #eadfce;border-radius:12px;background:#fffaf3;}'
            + '.delivery-schedule__form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#5d4037;}'
            + '.delivery-schedule__form input,.delivery-schedule__form select{height:36px;border:1px solid #e6e7eb;border-radius:8px;padding:0 10px;font:inherit;background:#fff;color:#1f1f1f;}'
            + '.delivery-schedule__save{grid-column:1 / -1;justify-self:start;height:36px;border:0;border-radius:999px;padding:0 18px;background:#5d4037;color:#fff;font-weight:700;cursor:pointer;white-space:nowrap;}'
            + '.delivery-schedule__bar{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;}'
            + '.delivery-schedule__bar h4{margin:0;font-size:15px;color:#1f1f1f;}'
            + '.delivery-schedule__bar label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#5d4037;}'
            + '.delivery-schedule__bar input,.delivery-schedule__bar select{height:34px;border:1px solid #e6e7eb;border-radius:8px;padding:0 10px;font:inherit;background:#fff;}'
            + '.delivery-schedule__search{width:180px;max-width:100%;}'
            + '.delivery-area{border:1px solid #eadfce;border-radius:12px;overflow-x:auto;background:#fff;}'
            + '.delivery-area__head{display:flex;justify-content:space-between;gap:8px;padding:10px 14px;background:#f8f4ee;font-weight:700;color:#5d4037;}'
            + '.delivery-stop-table{width:100%;border-collapse:collapse;font-size:13px;}'
            + '.delivery-stop-table th{text-align:left;padding:8px 12px;background:#5d4037;color:#fff;font-weight:700;white-space:nowrap;}'
            + '.delivery-stop-table td{padding:8px 12px;border-top:1px solid #f0e6d8;vertical-align:top;}'
            + '@media (max-width:720px){.delivery-stop-table{display:block;overflow-x:auto;}}';
        document.head.appendChild(style);
    }

    function upcoming(rows) {
        var today = todayStamp();
        return rows.filter(function (row) {
            return row && row.date && row.date >= today;
        }).sort(function (a, b) {
            return String(a.date).localeCompare(String(b.date)) || String(a.area).localeCompare(String(b.area));
        });
    }

    function storeOptions(areaName, selected) {
        return areaByName(areaName).stores.map(function (store) {
            var picked = store === selected ? ' selected' : '';
            return '<option value="' + esc(store) + '"' + picked + '>' + esc(store) + '</option>';
        }).join('');
    }

    function paymentOptions() {
        return PAYMENTS.map(function (name) {
            return '<option value="' + esc(name) + '">' + esc(name) + '</option>';
        }).join('');
    }

    function render(host) {
        if (!host || host.getAttribute('data-schedule-ready') === '1') return;
        ensureStyles();
        host.setAttribute('data-schedule-ready', '1');
        var rows = readRows();
        var areaOptions = AREAS.map(function (area) {
            return '<option value="' + esc(area.name) + '">' + esc(area.name) + '</option>';
        }).join('');
        host.innerHTML = ''
            + '<div class="delivery-schedule">'
            + '<form class="delivery-schedule__form">'
            + '<label>Area<select name="area" required>' + areaOptions + '</select></label>'
            + '<label>Store<select name="stop" required>' + storeOptions('Batangas') + '</select></label>'
            + '<label>Date<input name="date" type="date" required value="' + esc(todayStamp()) + '"></label>'
            + '<label>Pouches<input name="qty" type="number" min="1" required value="24"></label>'
            + '<label>Product<input name="product" readonly value="' + esc(PRODUCT) + ' pouches"></label>'
            + '<label>Payment<select name="payment" required>' + paymentOptions() + '</select></label>'
            + '<button class="delivery-schedule__save" type="submit">Set schedule</button>'
            + '</form>'
            + '<div class="delivery-schedule__bar">'
            + '<h4>Upcoming deliveries</h4>'
            + '<label>Area <select class="delivery-schedule__filter"><option value="">Every area</option>' + areaOptions + '</select></label>'
            + '<label>Search <input class="delivery-schedule__search" type="search" placeholder="Store or P.O."></label>'
            + '</div>'
            + '<div class="delivery-schedule__list"></div>'
            + '</div>';

        var list = host.querySelector('.delivery-schedule__list');
        var filter = host.querySelector('.delivery-schedule__filter');
        var search = host.querySelector('.delivery-schedule__search');
        var areaSelect = host.querySelector('[name="area"]');
        var stopSelect = host.querySelector('[name="stop"]');

        areaSelect.addEventListener('change', function () {
            stopSelect.innerHTML = storeOptions(areaSelect.value);
        });

        function paint() {
            var chosen = filter.value;
            var query = search.value.trim().toLowerCase();
            var visible = upcoming(rows).filter(function (row) {
                if (chosen && row.area !== chosen) return false;
                if (!query) return true;
                return (row.stop + ' ' + row.po + ' ' + row.detail + ' ' + row.payment + ' ' + row.area).toLowerCase().indexOf(query) >= 0;
            });
            var groups = {};
            var order = [];
            visible.forEach(function (row) {
                if (!groups[row.area]) {
                    groups[row.area] = [];
                    order.push(row.area);
                }
                groups[row.area].push(row);
            });
            if (!order.length) {
                list.innerHTML = '<p>No upcoming deliveries for this area.</p>';
                return;
            }
            list.innerHTML = order.map(function (area) {
                var stops = groups[area].map(function (row) {
                    return '<tr>'
                        + '<td>' + esc(row.date) + '</td>'
                        + '<td><strong>' + esc(row.po) + '</strong></td>'
                        + '<td>' + esc(row.stop) + '</td>'
                        + '<td>' + esc(row.detail) + '</td>'
                        + '<td>' + esc(row.payment || '') + '</td>'
                        + '</tr>';
                }).join('');
                return '<section class="delivery-area">'
                    + '<div class="delivery-area__head"><span>' + esc(area) + '</span><span>' + groups[area].length + ' stops</span></div>'
                    + '<table class="delivery-stop-table"><thead><tr>'
                    + '<th>Date</th><th>P.O. Code</th><th>Retailer</th><th>Order</th><th>Payment</th>'
                    + '</tr></thead><tbody>' + stops + '</tbody></table></section>';
            }).join('');
        }

        host.querySelector('form').addEventListener('submit', function (event) {
            event.preventDefault();
            var data = new FormData(event.currentTarget);
            var qty = String(data.get('qty') || '').trim();
            rows.push({
                id: 'sched-' + Date.now(),
                area: String(data.get('area') || ''),
                date: String(data.get('date') || ''),
                po: nextPo(String(data.get('area') || '')),
                stop: String(data.get('stop') || '').trim(),
                detail: qty + ' pouches ' + PRODUCT,
                payment: String(data.get('payment') || 'Cash')
            });
            writeRows(rows);
            paint();
        });
        filter.addEventListener('change', paint);
        search.addEventListener('input', paint);
        paint();
    }

    function boot() {
        document.querySelectorAll('#delivery-schedule').forEach(render);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('content:replaced', boot);
    document.addEventListener('kreezby:page-load', boot);
    window.KreezbyDeliverySchedule = { boot: boot };
})();
