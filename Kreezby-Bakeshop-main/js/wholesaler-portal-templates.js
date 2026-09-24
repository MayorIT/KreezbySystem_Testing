/**
 * HTML templates for wholesaler portal module pages.
 * Used by js/gen-wholesalers.js
 */
'use strict';

function profile(w) {
    var isVisayas = w.id === 'who-2';
    return {
        accountLabel: isVisayas ? 'Visayas Wholesale Hub' : 'Metro Bulk Distributors',
        hubDelivery: isVisayas ? 'Iloilo Distribution Center' : 'Quezon City Bulk Warehouse',
        regionTag: isVisayas ? 'Visayas' : 'NCR',
        stats: isVisayas
            ? { po: 4, receive: 6, bo: 3, return: 2, alert: 3, sales: 12 }
            : { po: 5, receive: 8, bo: 2, return: 1, alert: 2, sales: 15 },
        poCodeSample: isVisayas ? 'WPO-V-0042' : 'WPO-M-0088',
        returnCode: isVisayas ? 'WRET-V-0002' : 'WRET-M-0001',
        salesSubtitle: isVisayas
            ? 'Outbound bulk shipments to Visayas sub-retailers and provincial accounts (2026).'
            : 'Outbound bulk shipments to NCR retailers and franchise partners (2026).'
    };
}

function dashboardGrid(key, w) {
    var p = profile(w);
    return ''
        + '            <a class="stat-card" href="po-' + key + '.html"><div class="stat-title">PO Records</div><div class="stat-value">' + p.stats.po + '</div></a>\n'
        + '            <a class="stat-card blue-bar" href="receive-' + key + '.html"><div class="stat-title">Receiving Records</div><div class="stat-value">' + p.stats.receive + '</div></a>\n'
        + '            <a class="stat-card" href="bo-' + key + '.html"><div class="stat-title">BO Records</div><div class="stat-value">' + p.stats.bo + '</div></a>\n'
        + '            <a class="stat-card blue-bar" href="return-' + key + '.html"><div class="stat-title">Return Records</div><div class="stat-value">' + p.stats.return + '</div></a>\n'
        + '            <a class="stat-card" href="alert-' + key + '.html"><div class="stat-title">Alert</div><div class="stat-value">' + p.stats.alert + '</div></a>\n'
        + '            <a class="stat-card" href="saleslist-' + key + '.html"><div class="stat-title">Sales Records</div><div class="stat-value">' + p.stats.sales + '</div></a>';
}

function dashboardBody(w, key) {
    return ''
        + '        <div class="workspace-container">\n'
        + '            <h2 class="page-title">' + w.name + ' — ' + w.area + '</h2>\n'
        + '            <div class="sync-status-bar">\n'
        + '                <span><strong>Wholesale Portal:</strong> Bulk orders and distribution tracking</span>\n'
        + '                <span>Contact: ' + w.contact + ' · ' + w.email + '</span>\n'
        + '            </div>\n'
        + '            <div class="dashboard-grid">\n' + dashboardGrid(key, w) + '\n            </div>\n'
        + '        </div>';
}

function poBody(w, key) {
    var p = profile(w);
    return ''
        + '        <h2 class="page-title">' + w.name + ' — Purchase Orders</h2>\n'
        + '        <p class="page-subtitle">' + w.area + ' · Kreezby wholesaler portal</p>\n'
        + '        <div class="retailer-module-host">\n'
        + '            <div id="po-retailer-directory-block">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar">\n'
        + '                        <h3>Bulk Purchase Orders</h3>\n'
        + '                        <button class="btn-call-to-action" type="button">+ Create Bulk Request</button>\n'
        + '                    </div>\n'
        + '                    <div class="card-body-padded">\n'
        + '                        <div class="datatable-filters-line">\n'
        + '                            <div>Show <select><option value="10">10</option></select> entries</div>\n'
        + '                            <div>Search: <input type="text" placeholder="Filter PO Code..."></div>\n'
        + '                        </div>\n'
        + '                        <div class="po-table-scroll-wrap">\n'
        + '                        <table class="data-display-table">\n'
        + '                            <thead><tr data-kreezby-portal-head="1">\n'
        + '                                <th>#</th><th>Date Created</th><th>PO Code</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th>\n'
        + '                            </tr></thead>\n'
        + '                            <tbody></tbody>\n'
        + '                        </table></div>\n'
        + '                        <div style="font-size: 13px; margin-top: 15px; color: #555;">Showing bulk orders from Kreezby main facility</div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '            <div id="po-retailer-details-viewer-block" style="display: none;">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar"><h3>Purchase Order Details</h3></div>\n'
        + '                    <div class="card-body-padded"><div class="details-container-view"></div>\n'
        + '                        <div class="details-action-footer-row">\n'
        + '                            <button class="btn-viewer-tool green" onclick="window.print()">Print Inbound Receipt</button>\n'
        + '                            <button class="btn-viewer-tool black" onclick="switchToMasterListsPane()">Back To Orders Summary</button>\n'
        + '                        </div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '        </div>';
}

function receiveBody(w, key) {
    return ''
        + '        <h2 class="page-title">' + w.name + ' — Receiving</h2>\n'
        + '        <p class="page-subtitle">' + w.area + ' · Kreezby wholesaler portal</p>\n'
        + '        <div class="retailer-module-host">\n'
        + '            <div id="receiving-retailer-directory-panel-view">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar">\n'
        + '                        <h3>Inbound Bulk Receiving Log</h3>\n'
        + '                        <button class="btn-call-to-action" onclick="toggleCreateReceivedModal(true)">+ Log Pallet Verification</button>\n'
        + '                    </div>\n'
        + '                    <div class="card-body-padded">\n'
        + '                        <div class="datatable-filters-line">\n'
        + '                            <div>Show <select><option value="10">10</option></select> entries</div>\n'
        + '                            <div>Search: <input type="text" placeholder="Filter records..."></div>\n'
        + '                        </div>\n'
        + '                        <div class="po-table-scroll-wrap">\n'
        + '                        <table class="data-display-table">\n'
        + '                            <thead><tr data-kreezby-portal-head="1">\n'
        + '                                <th>#</th><th>Date Received</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th><th>Remarks</th>\n'
        + '                            </tr></thead>\n'
        + '                            <tbody></tbody>\n'
        + '                        </table></div>\n'
        + '                        <div class="legend-container-box">\n'
        + '                            <span><strong>Status Legend:</strong></span>\n'
        + '                            <span class="status-pill-badge pending">Pending</span>\n'
        + '                        </div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '            <div id="receiving-retailer-details-viewer-block" style="display: none;">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar"><h3>Received Bulk Shipment Details</h3></div>\n'
        + '                    <div class="card-body-padded">\n'
        + '                        <div class="details-inspection-sheet"></div>\n'
        + '                        <div class="details-action-footer-row">\n'
        + '                            <button class="btn-viewer-tool green" onclick="window.print()">Print Batch Sheet</button>\n'
        + '                            <button class="btn-viewer-tool black" onclick="switchToReceivedMasterListingView()">Back To Summary Directory</button>\n'
        + '                        </div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '        </div>';
}

function boBody(w, key) {
    return ''
        + '        <h2 class="page-title">' + w.name + ' — Back Orders</h2>\n'
        + '        <p class="page-subtitle">' + w.area + ' · Kreezby wholesaler portal</p>\n'
        + '        <div class="retailer-module-host">\n'
        + '            <div id="bo-retailer-dashboard-view">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar"><h3>List of Back Orders</h3></div>\n'
        + '                    <div class="card-body-padded">\n'
        + '                        <div class="datatable-filters-line">\n'
        + '                            <div>Show <select><option>10</option></select> entries</div>\n'
        + '                            <div>Search: <input type="text" placeholder="Search..."></div>\n'
        + '                        </div>\n'
        + '                        <div class="po-table-scroll-wrap">\n'
        + '                        <table class="data-display-table">\n'
        + '                            <thead><tr data-kreezby-portal-head="1">\n'
        + '                                <th>#</th><th>Date Created</th><th>BO Code</th><th>Action</th><th>Supplier</th><th>Items</th><th>Status</th>\n'
        + '                            </tr></thead>\n'
        + '                            <tbody></tbody>\n'
        + '                        </table></div>\n'
        + '                        <div style="font-size: 13px; margin-top: 15px; color: #555;">Pending bulk lines from main bakery facility</div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '            <div id="bo-details-inspection-panel-view" style="display: none;">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar"><h3>Back Order Details</h3></div>\n'
        + '                    <div class="card-body-padded">\n'
        + '                        <div class="details-inspection-sheet"></div>\n'
        + '                        <div class="details-action-footer-row">\n'
        + '                            <button class="btn-viewer-tool green" onclick="window.print()">Print Report</button>\n'
        + '                            <button class="btn-viewer-tool black" onclick="switchToBackOrderMasterDashboardView()">Back To Lists Summary</button>\n'
        + '                        </div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '        </div>';
}

function returnBody(w, key) {
    var p = profile(w);
    return ''
        + '        <h2 class="page-title">' + w.name + ' — Return / P.O List</h2>\n'
        + '        <p class="page-subtitle">' + w.area + ' · Kreezby wholesaler portal</p>\n'
        + '        <div class="retailer-module-host">\n'
        + '            <div id="returns-retailer-directory-view">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar">\n'
        + '                        <h3>Wholesale Return List</h3>\n'
        + '                        <button class="btn-call-to-action" onclick="toggleCreateReturnModal(true)">+ Create New Return</button>\n'
        + '                    </div>\n'
        + '                    <div class="card-body-padded">\n'
        + '                        <div class="datatable-filters-line">\n'
        + '                            <div>Show <select><option value="10">10</option></select> entries</div>\n'
        + '                            <div>Search: <input type="text" placeholder="Search by Return Code..."></div>\n'
        + '                        </div>\n'
        + '                        <table class="data-display-table">\n'
        + '                            <thead><tr style="background-color: var(--brand-brown); color: white;">\n'
        + '                                <th>#</th><th>Date Requested</th><th>Return Code</th><th>P.O. Code Origin</th><th>Items Count</th><th>Status</th><th>Action</th>\n'
        + '                            </tr></thead>\n'
        + '                            <tbody>\n'
        + '                                <tr onclick="switchToReturnDetailsInspectorView()" style="cursor: pointer;">\n'
        + '                                    <td>1</td><td>2026-05-10 10:30</td>\n'
        + '                                    <td><strong style="color: var(--primary-blue);">' + p.returnCode + '</strong></td>\n'
        + '                                    <td><strong>' + p.poCodeSample + '</strong></td>\n'
        + '                                    <td>3</td><td><span class="status-pill-badge pending">Pending</span></td>\n'
        + '                                    <td><button type="button" class="action-trigger-btn">Action ▾</button></td>\n'
        + '                                </tr>\n'
        + '                            </tbody>\n'
        + '                        </table>\n'
        + '                        <div style="font-size: 13px; margin-top: 15px; color: #555;">Showing 1 to 1 of 1 entries</div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '            <div id="returns-retailer-details-viewer-block" style="display: none;">\n'
        + '                <div class="panel-data-card">\n'
        + '                    <div class="panel-card-title-bar"><h3>Return Record - ' + p.returnCode + '</h3></div>\n'
        + '                    <div class="card-body-padded">\n'
        + '                        <div class="details-inspection-sheet">\n'
        + '                            <div class="details-header-meta-block">\n'
        + '                                <div>\n'
        + '                                    <div class="meta-data-line"><strong>Return Code:</strong> ' + p.returnCode + '</div>\n'
        + '                                    <div class="meta-data-line"><strong>P.O. Origin:</strong> ' + p.poCodeSample + '</div>\n'
        + '                                    <div class="meta-data-line"><strong>Date Requested:</strong> May 10, 2026 10:30 AM</div>\n'
        + '                                </div>\n'
        + '                                <div>\n'
        + '                                    <div class="meta-data-line"><strong>Returnee Account:</strong> ' + p.accountLabel + '</div>\n'
        + '                                    <div class="meta-data-line"><strong>Status Profile:</strong> <span class="status-pill-badge pending">PENDING REVIEW</span></div>\n'
        + '                                    <div class="meta-data-line"><strong>Total Refund Claim:</strong> ₱18,400.00</div>\n'
        + '                                </div>\n'
        + '                                <div style="border-left: 1px dashed #ccc; padding-left: 20px;">\n'
        + '                                    <div class="meta-data-line"><strong>Reason for Return:</strong></div>\n'
        + '                                    <div class="meta-data-line" style="color: #c62828; font-style: italic; font-weight: 600;">"Pallet wrap damage during inbound truck offload — 2 cases compromised."</div>\n'
        + '                                </div>\n'
        + '                            </div>\n'
        + '                            <div style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #1a237e; text-transform: uppercase;">■ Returned Bulk Line Items</div>\n'
        + '                            <table class="data-display-table">\n'
        + '                                <thead><tr style="background-color: #1a237e; color: white;">\n'
        + '                                    <th>Qty Returned</th><th>Unit Type</th><th>Product</th><th style="text-align: right;">Unit Rate (₱)</th><th style="text-align: right;">Total (₱)</th><th>Reason</th>\n'
        + '                                </tr></thead>\n'
        + '                                <tbody>\n'
        + '                                    <tr><td>40.00</td><td>Cases</td><td><strong>Chocolate Crinkles (Bulk)</strong></td><td style="text-align: right;">320.00</td><td style="text-align: right;">12,800.00</td><td style="color:#c62828;">Damaged Packaging</td></tr>\n'
        + '                                    <tr><td>20.00</td><td>Cases</td><td><strong>Lemon Crinkles (Bulk)</strong></td><td style="text-align: right;">280.00</td><td style="text-align: right;">5,600.00</td><td style="color:#c62828;">Damaged Packaging</td></tr>\n'
        + '                                </tbody>\n'
        + '                                <tfoot><tr style="font-weight: bold; background-color: #f5f5f5;">\n'
        + '                                    <td colspan="4" style="text-align: right;">Estimated Claims Value:</td><td style="text-align: right; color:#b71c1c;">₱18,400.00</td><td></td>\n'
        + '                                </tr></tfoot>\n'
        + '                            </table>\n'
        + '                        </div>\n'
        + '                        <div class="details-action-footer-row">\n'
        + '                            <button class="btn-viewer-tool green" onclick="window.print()">Print Return Slip</button>\n'
        + '                            <button class="btn-viewer-tool black" onclick="switchToReturnsMasterListView()">Back To Master Index</button>\n'
        + '                        </div>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '        </div>';
}

function saleslistBody(w, key) {
    var p = profile(w);
    var rows = p.regionTag === 'Visayas'
        ? [
            ['WSL-V-1201', '2026-05-14', 'Bacolod City Mini-Mart', '48 Cases Mixed Crinkles', '₱86,400', 'Delivered'],
            ['WSL-V-1198', '2026-05-12', 'Iloilo SIDC Branch', '12 Pallets Choco Butternut', '₱144,000', 'Delivered'],
            ['WSL-V-1195', '2026-05-10', 'Cebu Wholesale Partner', '36 Cases Lemon Crinkles', '₱64,800', 'In Transit']
        ]
        : [
            ['WSL-M-2201', '2026-05-15', 'Makati Franchise Hub', '24 Pallets Mixed Crinkles', '₱288,000', 'Delivered'],
            ['WSL-M-2198', '2026-05-13', 'Quezon City Retail Chain', '60 Cases Choco Butternut', '₱108,000', 'Delivered'],
            ['WSL-M-2194', '2026-05-11', 'Marikina Distribution Point', '18 Pallets Lemon Crinkles', '₱216,000', 'In Transit']
        ];

    var tbody = rows.map(function (r, i) {
        return '                                <tr onclick="switchToDetailedSalesTransactionInspector()" style="cursor:pointer;">\n'
            + '                                    <td>' + (i + 1) + '</td><td>' + r[0] + '</td><td>' + r[1] + '</td><td><strong>' + r[2] + '</strong></td>\n'
            + '                                    <td>' + r[3] + '</td><td style="text-align:right;">' + r[4] + '</td>\n'
            + '                                    <td><span class="status-pill-badge ' + (r[5] === 'Delivered' ? 'received' : 'pending') + '">' + r[5] + '</span></td>\n'
            + '                                </tr>';
    }).join('\n');

    var sample = rows[0];
    return ''
        + '        <div id="saleslist-master-directory-panel-view">\n'
        + '            <h2 class="page-title">' + w.name + ' — Sales List</h2>\n'
        + '            <p class="page-subtitle">' + p.salesSubtitle + '</p>\n'
        + '            <div class="panel-data-card" style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">\n'
        + '                <div class="retailer-saleslist-toolbar">\n'
        + '                    <div class="filter-field"><label>Month</label><select><option value="">All months</option><option>May 2026</option></select></div>\n'
        + '                    <p style="margin:0;font-size:13px;color:#5d4037;font-weight:600;flex:1;">' + p.stats.sales + ' outbound shipments logged</p>\n'
        + '                </div>\n'
        + '                <div class="card-body-padded">\n'
        + '                    <table class="data-display-table">\n'
        + '                        <thead><tr style="background-color: var(--brand-brown); color: white;">\n'
        + '                            <th>#</th><th>Shipment Ref</th><th>Date</th><th>Sub-Retailer / Account</th><th>Bulk Items</th><th style="text-align:right;">Invoice (₱)</th><th>Status</th>\n'
        + '                        </tr></thead>\n'
        + '                        <tbody>\n' + tbody + '\n                        </tbody>\n'
        + '                    </table>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '        </div>\n'
        + '        <div id="saleslist-detailed-inspector-panel-view" style="display: none;">\n'
        + '            <div class="panel-data-card">\n'
        + '                <div class="panel-card-title-bar"><h3>Outbound Shipment Detail</h3></div>\n'
        + '                <div class="card-body-padded">\n'
        + '                    <div class="details-inspection-sheet">\n'
        + '                        <div class="details-header-meta-block">\n'
        + '                            <div>\n'
        + '                                <div class="meta-data-line"><strong>Shipment Ref:</strong> ' + sample[0] + '</div>\n'
        + '                                <div class="meta-data-line"><strong>Dispatch Date:</strong> ' + sample[1] + '</div>\n'
        + '                                <div class="meta-data-line"><strong>Destination:</strong> ' + sample[2] + '</div>\n'
        + '                            </div>\n'
        + '                            <div>\n'
        + '                                <div class="meta-data-line"><strong>Wholesaler:</strong> ' + p.accountLabel + '</div>\n'
        + '                                <div class="meta-data-line"><strong>Route:</strong> ' + p.regionTag + ' bulk distribution</div>\n'
        + '                                <div class="meta-data-line"><strong>Invoice Total:</strong> ' + sample[4] + '</div>\n'
        + '                            </div>\n'
        + '                        </div>\n'
        + '                        <table class="data-display-table">\n'
        + '                            <thead><tr style="background-color:#1a237e;color:#fff;"><th>Qty</th><th>Unit</th><th>Product Line</th><th style="text-align:right;">Line Total (₱)</th></tr></thead>\n'
        + '                            <tbody><tr><td>48</td><td>Cases</td><td>Mixed Crinkles Assortment</td><td style="text-align:right;">86,400.00</td></tr></tbody>\n'
        + '                        </table>\n'
        + '                    </div>\n'
        + '                    <div class="details-action-footer-row">\n'
        + '                        <button type="button" class="btn-viewer-tool green" onclick="window.print()">Print</button>\n'
        + '                        <button type="button" class="btn-viewer-tool black" onclick="switchToSalesMasterDirectoryListingView()">Back to sales list</button>\n'
        + '                    </div>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '        </div>';
}

function alertBody(w, key) {
    var p = profile(w);
    return ''
        + '        <h2 class="page-title">' + w.name + ' — Alerts</h2>\n'
        + '        <p class="page-subtitle">' + w.area + ' · Kreezby wholesaler portal</p>\n'
        + '        <div class="retailer-module-host">\n'
        + '            <div class="panel-data-card">\n'
        + '                <div class="panel-card-title-bar"><h3>Distribution Notifications &amp; Logistics Alerts</h3></div>\n'
        + '                <div class="card-body-padded">\n'
        + '                    <div class="datatable-controls-bar">\n'
        + '                        <div>Show <select><option value="10">10</option></select> entries</div>\n'
        + '                        <div>Search Alerts: <input type="text" placeholder="Search logs..."></div>\n'
        + '                    </div>\n'
        + '                    <table class="data-display-table">\n'
        + '                        <thead><tr style="background-color: var(--brand-brown); color: white;">\n'
        + '                            <th style="width:50px;">#</th><th>Timestamp</th><th>Alert Source</th><th>Message Description</th><th style="text-align:center;width:120px;">Category</th><th style="text-align:center;width:100px;">Action</th>\n'
        + '                        </tr></thead>\n'
        + '                        <tbody>\n'
        + '                            <tr>\n'
        + '                                <td>1</td><td>2026-05-16 16:45</td><td><strong>LOGISTICS-MAIN</strong></td>\n'
        + '                                <td>Bulk truck dispatch confirmed: Kreezby main facility shipment en route to ' + p.hubDelivery + '. Prepare receiving dock for pallet offload.</td>\n'
        + '                                <td style="text-align:center;"><span class="severity-badge info">Delivery Today</span></td>\n'
        + '                                <td style="text-align:center;"><div class="action-menu-relative-container">\n'
        + '                                    <button class="action-trigger-btn" onclick="toggleAlertActionMenu(event, \'alert-pop-1\')">Action ▾</button>\n'
        + '                                    <div class="action-popup-menu" id="alert-pop-1">\n'
        + '                                        <div class="action-popup-item" onclick="location.href=\'receive-' + key + '.html\'">Open Receiving Log</div>\n'
        + '                                        <div class="action-popup-item dismiss-action" onclick="handleAlertTrigger(\'dismiss\', \'Logistics\')">Dismiss Notice</div>\n'
        + '                                    </div></div></td>\n'
        + '                            </tr>\n'
        + '                            <tr>\n'
        + '                                <td>2</td><td>2026-05-16 11:05</td><td><strong>BULK-CHO-CASE</strong></td>\n'
        + '                                <td>Warehouse stock warning: Chocolate Crinkles bulk cases below reorder threshold at ' + p.hubDelivery + '.</td>\n'
        + '                                <td style="text-align:center;"><span class="severity-badge critical">Low Stock</span></td>\n'
        + '                                <td style="text-align:center;"><div class="action-menu-relative-container">\n'
        + '                                    <button class="action-trigger-btn" onclick="toggleAlertActionMenu(event, \'alert-pop-2\')">Action ▾</button>\n'
        + '                                    <div class="action-popup-menu" id="alert-pop-2">\n'
        + '                                        <div class="action-popup-item" onclick="location.href=\'po-' + key + '.html\'">Place Bulk Order</div>\n'
        + '                                        <div class="action-popup-item dismiss-action" onclick="handleAlertTrigger(\'dismiss\', \'Low Stock\')">Dismiss Notice</div>\n'
        + '                                    </div></div></td>\n'
        + '                            </tr>\n'
        + '                            <tr>\n'
        + '                                <td>3</td><td>2026-05-15 09:12</td><td><strong>BO-W-0003</strong></td>\n'
        + '                                <td>Back-order pallet batch packaged at main facility — awaiting transit authorization to ' + p.regionTag + ' route.</td>\n'
        + '                                <td style="text-align:center;"><span class="severity-badge warning">Back Order</span></td>\n'
        + '                                <td style="text-align:center;"><div class="action-menu-relative-container">\n'
        + '                                    <button class="action-trigger-btn" onclick="toggleAlertActionMenu(event, \'alert-pop-3\')">Action ▾</button>\n'
        + '                                    <div class="action-popup-menu" id="alert-pop-3">\n'
        + '                                        <div class="action-popup-item" onclick="location.href=\'bo-' + key + '.html\'">Track Back Order</div>\n'
        + '                                        <div class="action-popup-item dismiss-action" onclick="handleAlertTrigger(\'dismiss\', \'BO\')">Dismiss Notice</div>\n'
        + '                                    </div></div></td>\n'
        + '                            </tr>\n'
        + '                        </tbody>\n'
        + '                    </table>\n'
        + '                </div>\n'
        + '            </div>\n'
        + '        </div>';
}

function moduleBody(w, key, mod) {
    switch (mod.file) {
        case 'wholesaler': return dashboardBody(w, key);
        case 'po': return poBody(w, key);
        case 'receive': return receiveBody(w, key);
        case 'bo': return boBody(w, key);
        case 'return': return returnBody(w, key);
        case 'saleslist': return saleslistBody(w, key);
        case 'alert': return alertBody(w, key);
        default: return '';
    }
}

function bodyPortalAttr(mod) {
    if (mod.file === 'po') return ' data-kreezby-portal="retailer-po"';
    if (mod.file === 'receive') return ' data-kreezby-portal="retailer-receive"';
    if (mod.file === 'bo') return ' data-kreezby-portal="retailer-bo"';
    return '';
}

function pageExtras(w, key, mod) {
    var p = profile(w);
    var extras = '';

    if (mod.file === 'wholesaler') {
        extras += notificationModalAndScript(w);
    }

    if (mod.file === 'po') {
        extras += poModal(p);
        extras += '\n    <script>\n'
            + 'function switchToDetailsViewPane(poCode){if(window.PoAdmin&&PoAdmin.openDetails)PoAdmin.openDetails(poCode);}\n'
            + 'function switchToMasterListsPane(){if(window.PoAdmin&&PoAdmin.backToList)PoAdmin.backToList();}\n'
            + 'function togglePurchaseOrderFormModal(shouldDisplay,poCode){if(window.PoAdmin){shouldDisplay?PoAdmin.openEditModal(poCode||null):PoAdmin.closeModal();}}\n'
            + '</script>\n<div id="po-print-receipt-root" class="po-print-receipt-root" aria-hidden="true"></div>\n';
    }

    if (mod.file === 'receive') {
        extras += receiveModal();
        extras += '\n    <script>\n'
            + 'function toggleCreateReceivedModal(shouldDisplay,receiptId){if(window.ReceiveAdmin){shouldDisplay?ReceiveAdmin.openEditModal(receiptId||null):ReceiveAdmin.closeModal();}}\n'
            + 'function switchToReceivedDetailsInspectorSheet(id){if(window.ReceiveAdmin)ReceiveAdmin.openDetails(id);}\n'
            + 'function switchToReceivedMasterListingView(){if(window.ReceiveAdmin)ReceiveAdmin.backToList();}\n'
            + '</script>\n<div id="recv-print-root" class="recv-print-root" aria-hidden="true"></div>\n';
    }

    if (mod.file === 'bo') {
        extras += '\n    <script>\n'
            + 'function switchToBackOrderDetailsInspector(code){if(window.BoAdmin)BoAdmin.openDetails(code);}\n'
            + 'function switchToBackOrderMasterDashboardView(){if(window.BoAdmin)BoAdmin.backToList();}\n'
            + '</script>\n<div id="bo-print-root" class="bo-print-root" aria-hidden="true"></div>\n';
    }

    if (mod.file === 'return') {
        extras += returnModal(p);
        extras += returnScripts();
    }

    if (mod.file === 'saleslist') {
        extras += saleslistScripts();
    }

    if (mod.file === 'alert') {
        extras += alertModalAndScripts();
    }

    return extras;
}

function poModal(p) {
    return ''
        + '\n    <div class="system-modal-backdrop" id="purchase-order-modal-node">\n'
        + '        <div class="form-modal-box">\n'
        + '            <div class="modal-form-header"><h2>Create Bulk Purchase Order</h2>\n'
        + '                <button style="background:none;border:none;font-size:16px;cursor:pointer;" onclick="togglePurchaseOrderFormModal(false)">✕</button></div>\n'
        + '            <div class="modal-form-body"><p style="margin:0 0 12px;color:#555;">Request pallet/case quantities from Kreezby main facility to <strong>' + p.hubDelivery + '</strong>.</p></div>\n'
        + '            <div class="modal-action-footer-panel">\n'
        + '                <button class="btn-modal-cancel" onclick="togglePurchaseOrderFormModal(false)">Cancel</button>\n'
        + '                <button class="btn-modal-save" type="button" onclick="alert(\'Bulk purchase request submitted to Kreezby processing.\');togglePurchaseOrderFormModal(false);">Submit Request</button>\n'
        + '            </div>\n'
        + '        </div>\n'
        + '    </div>\n';
}

function receiveModal() {
    return ''
        + '\n    <div class="system-modal-backdrop" id="create-received-modal-overlay">\n'
        + '        <div class="form-modal-box">\n'
        + '            <div class="modal-form-header"><h2>Log Pallet Receiving Manifest</h2>\n'
        + '                <button style="background:none;border:none;font-size:16px;cursor:pointer;" onclick="toggleCreateReceivedModal(false)">✕</button></div>\n'
        + '            <div class="modal-form-body"><p style="margin:0;color:#555;">Record inbound bulk shipment verification from Kreezby Bakeshop.</p></div>\n'
        + '            <div class="modal-action-footer-panel">\n'
        + '                <button class="btn-modal-cancel" onclick="toggleCreateReceivedModal(false)">Cancel</button>\n'
        + '                <button class="btn-modal-save" onclick="alert(\'Inbound bulk log saved.\');toggleCreateReceivedModal(false);">Verify Entry Save</button>\n'
        + '            </div>\n'
        + '        </div>\n'
        + '    </div>\n';
}

function returnModal(p) {
    return ''
        + '\n    <div class="system-modal-backdrop" id="create-return-modal-overlay">\n'
        + '        <div class="form-modal-box">\n'
        + '            <div class="modal-form-header"><h2>Create Wholesale Return Request</h2>\n'
        + '                <button style="background:none;border:none;font-size:16px;cursor:pointer;" onclick="toggleCreateReturnModal(false)">✕</button></div>\n'
        + '            <div class="modal-form-body">\n'
        + '                <div class="form-field-unit"><label>Originating P.O.</label><input type="text" value="' + p.poCodeSample + '" readonly></div>\n'
        + '                <div class="form-field-unit"><label>Account</label><input type="text" value="' + p.accountLabel + '" readonly></div>\n'
        + '            </div>\n'
        + '            <div class="modal-action-footer-panel">\n'
        + '                <button class="btn-modal-cancel" onclick="toggleCreateReturnModal(false)">Cancel</button>\n'
        + '                <button class="btn-modal-save" type="button" onclick="alert(\'Return claim submitted for review.\');toggleCreateReturnModal(false);">Submit Return Claim</button>\n'
        + '            </div>\n'
        + '        </div>\n'
        + '    </div>\n';
}

function returnScripts() {
    return ''
        + '\n    <script>\n'
        + 'function toggleCreateReturnModal(shouldDisplay){var b=document.getElementById("create-return-modal-overlay");if(shouldDisplay)b.classList.add("modal-triggered");else b.classList.remove("modal-triggered");}\n'
        + 'function switchToReturnDetailsInspectorView(){document.getElementById("returns-retailer-directory-view").style.display="none";document.getElementById("returns-retailer-details-viewer-block").style.display="block";}\n'
        + 'function switchToReturnsMasterListView(){document.getElementById("returns-retailer-details-viewer-block").style.display="none";document.getElementById("returns-retailer-directory-view").style.display="block";}\n'
        + '</script>\n';
}

function saleslistScripts() {
    return ''
        + '\n    <script>\n'
        + 'function switchToDetailedSalesTransactionInspector(){document.getElementById("saleslist-master-directory-panel-view").style.display="none";document.getElementById("saleslist-detailed-inspector-panel-view").style.display="block";}\n'
        + 'function switchToSalesMasterDirectoryListingView(){document.getElementById("saleslist-detailed-inspector-panel-view").style.display="none";document.getElementById("saleslist-master-directory-panel-view").style.display="block";}\n'
        + '</script>\n';
}

function alertModalAndScripts() {
    return ''
        + '\n    <div class="alert-modal-overlay" id="alert-modal-overlay">\n'
        + '        <div class="alert-modal-box">\n'
        + '            <div class="alert-modal-header"><h2>Alert Details</h2><button class="alert-modal-close-btn" onclick="closeAlertModal()">✕</button></div>\n'
        + '            <div class="alert-modal-body">\n'
        + '                <div class="alert-detail-row"><div class="alert-detail-label">Alert Source</div><div class="alert-detail-value" id="modal-alert-id">—</div></div>\n'
        + '                <div class="alert-detail-row"><div class="alert-detail-label">Timestamp</div><div class="alert-detail-value" id="modal-alert-timestamp">—</div></div>\n'
        + '                <div class="alert-modal-divider"></div>\n'
        + '                <div class="alert-detail-row"><div class="alert-detail-label">Message</div><div class="alert-detail-value" id="modal-alert-message">—</div></div>\n'
        + '                <div class="alert-detail-row"><div class="alert-detail-label">Category</div><div class="alert-detail-value"><span id="modal-alert-severity" class="alert-detail-badge">—</span></div></div>\n'
        + '            </div>\n'
        + '        </div>\n'
        + '    </div>\n'
        + '    <script>\n'
        + 'function toggleAlertActionMenu(event,popupElementId){event.stopPropagation();document.querySelectorAll(".action-popup-menu").forEach(function(m){if(m.id!==popupElementId)m.classList.remove("active");});document.getElementById(popupElementId).classList.toggle("active");}\n'
        + 'window.addEventListener("click",function(){document.querySelectorAll(".action-popup-menu").forEach(function(m){m.classList.remove("active");});});\n'
        + 'function handleAlertTrigger(action,label){alert(action==="dismiss"?"Dismissed: "+label:"Action: "+label);}\n'
        + 'function closeAlertModal(){document.getElementById("alert-modal-overlay").classList.remove("active");}\n'
        + 'document.addEventListener("DOMContentLoaded",function(){\n'
        + '  var ov=document.getElementById("alert-modal-overlay");if(ov)ov.addEventListener("click",function(e){if(e.target===this)closeAlertModal();});\n'
        + '  document.querySelectorAll(".data-display-table tbody tr").forEach(function(row){row.addEventListener("click",function(e){if(e.target.closest(".action-menu-relative-container"))return;var id=parseInt(this.cells[0].textContent,10);if(id===1){document.getElementById("modal-alert-id").textContent="LOGISTICS-MAIN";document.getElementById("modal-alert-timestamp").textContent="2026-05-16 16:45";document.getElementById("modal-alert-message").textContent=this.cells[3].textContent;document.getElementById("modal-alert-severity").textContent="DELIVERY TODAY";document.getElementById("alert-modal-overlay").classList.add("active");}});});\n'
        + '});\n'
        + '</script>\n';
}

function notificationModalAndScript(w) {
    var p = profile(w);
    return ''
        + '\n    <div class="notification-modal-overlay" id="notification-modal-overlay">\n'
        + '        <div class="notification-modal-box">\n'
        + '            <div class="notification-modal-header"><h2>📢 Notifications</h2><button class="notification-modal-close-btn" onclick="closeNotificationModal()">✕</button></div>\n'
        + '            <div class="notification-modal-body" id="notification-modal-body"></div>\n'
        + '        </div>\n'
        + '    </div>\n'
        + '    <script>\n'
        + 'var notificationsData=[{id:1,type:"delivery",title:"🚚 Bulk Shipment En Route",message:"Pallet truck dispatched to ' + p.hubDelivery + '. ETA today 3:00–5:00 PM.",time:"30 min ago",status:"unread"},{id:2,type:"payment",title:"💰 Invoice Due",message:"Bulk invoice #WINV-2026-089 for ₱288,000 due May 28, 2026.",time:"2 hours ago",status:"unread"},{id:3,type:"stock",title:"⚠️ Warehouse Low Stock",message:"Chocolate Crinkles cases below reorder point at ' + p.hubDelivery + '.",time:"5 hours ago",status:"read"}];\n'
        + 'function openNotificationModal(){var body=document.getElementById("notification-modal-body");body.innerHTML=notificationsData.map(function(n){return \'<div class="notification-item \'+(n.status==="unread"?"unread":"")+\'"><div class="notification-content"><div class="notification-title">\'+n.title+\'</div><div class="notification-message">\'+n.message+\'</div><div class="notification-time">\'+n.time+\'</div></div></div>\';}).join("");document.getElementById("notification-modal-overlay").classList.add("active");}\n'
        + 'function closeNotificationModal(){document.getElementById("notification-modal-overlay").classList.remove("active");}\n'
        + 'document.addEventListener("DOMContentLoaded",function(){var bell=document.querySelector(".notification-pill");if(bell)bell.addEventListener("click",openNotificationModal);var ov=document.getElementById("notification-modal-overlay");if(ov)ov.addEventListener("click",function(e){if(e.target===this)closeNotificationModal();});});\n'
        + '</script>\n';
}

function pageScripts(mod) {
    var scripts = '    <script src="../../js/kreezby-seed-portal-data.js?v=20260924c"></script>\n'
        + '    <script src="../../js/sidebar-toggle.js"></script>\n'
        + '    <script src="../../js/wholesaler-nav.js"></script>\n'
        + '    <script src="../../js/user-dropdown-nav.js"></script>\n';

    if (mod.file === 'po') {
        scripts = '    <script src="../../js/kreezby-seed-portal-data.js?v=20260924c"></script>\n'
            + '    <script src="../../js/po-admin.js?v=3"></script>\n'
            + '    <script src="../../js/sidebar-toggle.js"></script>\n'
            + '    <script src="../../js/wholesaler-nav.js"></script>\n'
            + '    <script src="../../js/user-dropdown-nav.js"></script>\n';
    } else if (mod.file === 'receive') {
        scripts = '    <script src="../../js/kreezby-seed-portal-data.js?v=20260924c"></script>\n'
            + '    <script src="../../js/receive-admin.js?v=3"></script>\n'
            + '    <script src="../../js/sidebar-toggle.js"></script>\n'
            + '    <script src="../../js/wholesaler-nav.js"></script>\n'
            + '    <script src="../../js/user-dropdown-nav.js"></script>\n';
    } else if (mod.file === 'bo') {
        scripts = '    <script src="../../js/kreezby-seed-portal-data.js?v=20260924c"></script>\n'
            + '    <script src="../../js/bo-admin.js?v=1"></script>\n'
            + '    <script src="../../js/sidebar-toggle.js"></script>\n'
            + '    <script src="../../js/wholesaler-nav.js"></script>\n'
            + '    <script src="../../js/user-dropdown-nav.js"></script>\n';
    }

    return scripts;
}

module.exports = {
    profile: profile,
    dashboardGrid: dashboardGrid,
    moduleBody: moduleBody,
    bodyPortalAttr: bodyPortalAttr,
    pageExtras: pageExtras,
    pageScripts: pageScripts
};
