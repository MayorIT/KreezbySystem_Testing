/**
 * Generate wholesaler/ portal folders — one per distributor in maintenance settings.
 * Run: node js/gen-wholesalers.js
 */
const fs = require('fs');
const path = require('path');
const templates = require('./wholesaler-portal-templates');

const ROOT = path.join(__dirname, '..');
const WHOLESALERS = [
    { id: 'who-1', name: 'Metro Bulk Distributors', contact: 'James Lim', email: 'james@metrobulk.com', area: 'Quezon City' },
    { id: 'who-2', name: 'Visayas Wholesale Hub', contact: 'Carla Mendez', email: 'carla@visayaswholesale.com', area: 'Iloilo City' }
];

const MODULES = [
    { file: 'wholesaler', label: 'Dashboard', title: 'Wholesale Dashboard', active: true },
    { file: 'po', label: 'Purchase Order', title: 'Purchase Orders' },
    { file: 'receive', label: 'Receiving', title: 'Receiving' },
    { file: 'bo', label: 'Back Order', title: 'Back Orders' },
    { file: 'return', label: 'Return/P.O List', title: 'Return / P.O List' },
    { file: 'saleslist', label: 'Sales List', title: 'Sales List' },
    { file: 'alert', label: 'Alert', title: 'Alerts' }
];

function slugify(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function areaSlug(area) {
    return slugify(area);
}

function shortName(name) {
    return name.length > 28 ? name.slice(0, 28) + '…' : name;
}

function sidebarHtml(key, slug, modules, activeFile) {
    return modules.map(function (mod) {
        var href = mod.file + '-' + key + '.html';
        var active = mod.file === activeFile ? ' active' : '';
        return '            <li class="tree-node' + active + '"><a href="' + href + '">' + mod.label + '</a></li>';
    }).join('\n');
}

function pageHtml(w, key, slug, mod) {
    var home = 'wholesaler-' + key + '.html';
    var bodyMain = templates.moduleBody(w, key, mod);
    var notifyBell = mod.file === 'wholesaler'
        ? '        <button type="button" class="notification-pill" aria-label="Notifications">🔔</button>\n'
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kreezby Bakeshop - ${mod.title} — ${w.name} (${w.area})</title>
    <link rel="stylesheet" href="../../css/pages/wholesaler/wholesaler-portal.css">
    <link rel="stylesheet" href="../../css/pages/wholesaler/wholesaler-modules.css">
${mod.file === 'wholesaler' ? '    <link rel="stylesheet" href="../../css/shared/kreezby-welcome-home.css">\n' : ''}</head>
<body${templates.bodyPortalAttr(mod)}>

<header class="top-navbar-node">
    <div class="brand-logo-panel">
        <img src="../../assets/logo/kreezby-logo.png" alt="Kreezby logo">
        <span>Kreezby</span>
    </div>
    <div class="top-nav-links-right">
        <a class="top-nav-item home-badge" href="${home}">Home</a>
${notifyBell}        <div class="user-dropdown">
            <button class="user-dropdown-pill" type="button" id="user-dropdown-trigger">${shortName(w.name)} ▾</button>
            <div class="user-dropdown-menu" id="user-dropdown-menu">
                <a href="../report_issue-wholesaler.html" class="dropdown-item">Report Issue</a>
                <a href="../../auth/log_in.html" class="dropdown-item">↩ Log Out</a>
            </div>
        </div>
    </div>
</header>

<div class="system-dashboard-wrapper" data-area="${areaSlug(w.area)}" data-slug="${slug}">
    <aside class="sidebar-panel">
        <div class="hamburger-row">☰</div>
        <div class="panel-brand">${shortName(w.name)}</div>
        <ul class="navigation-tree">
${sidebarHtml(key, slug, MODULES, mod.file)}
        </ul>
    </aside>

    <main class="workspace-canvas">
${bodyMain}
    </main>
</div>
${templates.pageExtras(w, key, mod)}
${templates.pageScripts(mod)}
</body>
</html>
`;
}

// Shared CSS from retailer template
const cssSrc = path.join(ROOT, 'css', 'pages', 'retailer', 'sidcmain', 'retailer-batangas_sidcmain.css');
const cssDstDir = path.join(ROOT, 'css', 'pages', 'wholesaler');
const cssDst = path.join(cssDstDir, 'wholesaler-portal.css');
if (!fs.existsSync(cssDstDir)) fs.mkdirSync(cssDstDir, { recursive: true });
if (fs.existsSync(cssSrc)) {
    fs.copyFileSync(cssSrc, cssDst);
    fs.writeFileSync(cssDst, fs.readFileSync(cssDst, 'utf8').replace(
        '/* Styles for retailer-batangas_sidcmain.html */',
        '/* Shared wholesaler portal styles */'
    ), 'utf8');
}

const manifest = {};
const directorySections = {};

WHOLESALERS.forEach(function (w) {
    var slug = slugify(w.name);
    var area = areaSlug(w.area);
    var key = area + '_' + slug;
    var dir = path.join(ROOT, 'wholesaler', slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    MODULES.forEach(function (mod) {
        var filename = mod.file + '-' + key + '.html';
        fs.writeFileSync(path.join(dir, filename), pageHtml(w, key, slug, mod), 'utf8');
        console.log('wrote', path.join('wholesaler', slug, filename));
    });

    manifest[key] = {
        id: w.id,
        area: area,
        slug: slug,
        name: w.name,
        contact: w.contact,
        email: w.email,
        areaLabel: w.area,
        home: 'wholesaler/' + slug + '/wholesaler-' + key + '.html'
    };

    if (!directorySections[w.area]) directorySections[w.area] = [];
    directorySections[w.area].push({
        name: w.name,
        href: slug + '/wholesaler-' + key + '.html',
        area: w.area
    });

    var dataDir = path.join(ROOT, 'data', 'wholesalers');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, key + '.json'), JSON.stringify({
        id: w.id,
        name: w.name,
        contact: w.contact,
        email: w.email,
        area: w.area,
        slug: slug,
        key: key
    }, null, 2), 'utf8');
});

fs.writeFileSync(path.join(ROOT, 'data', 'wholesalers', '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

var dirHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kreezby — Select Your Wholesaler</title>
    <link rel="stylesheet" href="../css/pages/wholesaler/wholesaler-portal.css">
</head>
<body class="wholesaler-directory-body">
    <div class="workspace-container" style="max-width:900px;margin:40px auto;padding:24px;">
        <h1 class="page-title">Wholesaler Portal</h1>
        <p class="page-subtitle">Select your distribution account to open your dashboard.</p>
`;

Object.keys(directorySections).sort().forEach(function (region) {
    dirHtml += '        <section class="region-block" style="margin-top:24px;"><h2>' + region + '</h2><ul>\n';
    directorySections[region].forEach(function (item) {
        dirHtml += '            <li><a href="' + item.href + '">' + item.name + '</a> <span class="area-tag">(' + item.area + ')</span></li>\n';
    });
    dirHtml += '        </ul></section>\n';
});

dirHtml += `        <a class="top-nav-item" href="../auth/log_in.html" style="display:inline-block;margin-top:28px;">← Back to Log In</a>
    </div>
    <script src="../js/wholesaler-nav.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'wholesaler', 'wholesaler-directory.html'), dirHtml, 'utf8');
console.log('wrote wholesaler/wholesaler-directory.html');
