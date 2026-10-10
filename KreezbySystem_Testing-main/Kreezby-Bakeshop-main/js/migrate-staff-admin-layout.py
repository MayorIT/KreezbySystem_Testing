#!/usr/bin/env python3
"""Align staff HTML pages with the admin portal shell layout."""

import re
from pathlib import Path

STAFF_DIR = Path(__file__).resolve().parent.parent / "staff"

SIDEBAR_RE = re.compile(
    r"<aside\s+class=\"(?:sidebar-panel|dark-sidebar-panel)\"[^>]*>.*?</aside>",
    re.DOTALL | re.IGNORECASE,
)

EMPTY_SIDEBAR = '<aside class="dark-sidebar-panel" aria-label="Staff navigation"></aside>'

COLLAPSED_SCRIPT = (
    '<script>try{if(localStorage.getItem(\'kreezbySidebarCollapsed\')===\'1\')'
    "document.body.classList.add('sidebar-collapsed');}catch(e){}</script>"
)

STANDARD_HEADER_INNER = """\
            <a class="top-nav-item home-badge" href="staff-1.html">Home</a>
            <a class="top-nav-item" data-staff-inbox="1" href="inbox-staff-1.html" data-turbo-frame="_top">Inbox</a>
            <button type="button" class="notification-pill" aria-label="Notifications"></button>
            <div class="user-dropdown">
                <button type="button" class="user-dropdown-pill" id="user-dropdown-trigger">
                    Staff ▾
                </button>
                <div class="user-dropdown-menu" id="user-dropdown-menu">
                    <a href="report_issue-staff.html" class="dropdown-item">Report Issue</a>
                    <a href="../auth/log_in.html" class="dropdown-item">↩ Log Out</a>
                </div>
            </div>"""

SHELL_CSS = '<link rel="stylesheet" href="../css/shared/portal-shell-layout.css">'
ICON_SIDEBAR_CSS = '<link rel="stylesheet" href="../css/shared/admin-icon-sidebar.css">'

REQUIRED_SCRIPTS = [
    "../js/staff-permissions.js",
    "../js/user-dropdown-nav.js",
    "../js/staff-sidebar.js",
    "../js/sidebar-toggle.js",
]


def is_inbox_page(name: str) -> bool:
    return name.startswith("inbox-staff")


def is_dashboard_page(name: str) -> bool:
    return re.fullmatch(r"staff-\d+\.html", name) is not None


def is_report_page(name: str) -> bool:
    return name.startswith("report_issue")


def ensure_head_links(html: str) -> str:
    if "portal-shell-layout.css" not in html:
        if "</head>" in html:
            html = html.replace("</head>", f"    {SHELL_CSS}\n</head>", 1)
    if "admin-icon-sidebar.css" not in html and not is_inbox_page_from_html(html):
        if "</head>" in html:
            html = html.replace("</head>", f"    {ICON_SIDEBAR_CSS}\n</head>", 1)
    return html


def is_inbox_page_from_html(html: str) -> bool:
    return "inbox-chat-layout.css" in html or 'data-inbox-role="staff"' in html


def ensure_collapsed_script(html: str) -> str:
    if "kreezbySidebarCollapsed" in html:
        return html
    return html.replace("<body>", f"<body>\n{COLLAPSED_SCRIPT}\n", 1)


def normalize_header(html: str) -> str:
    header_re = re.compile(
        r"(<header\s+class=\"top-navbar-node\">.*?<div\s+class=\"top-nav-links-right\">)\s*.*?(</div>\s*</header>)",
        re.DOTALL,
    )

    def repl(match):
        return match.group(1) + "\n" + STANDARD_HEADER_INNER + "\n        " + match.group(2)

    return header_re.sub(repl, html, count=1)


def wrap_dashboard_grid(grid_html: str) -> str:
    return (
        '            <div id="staff-dashboard-root">\n'
        '                <div class="dashboard-split-layout">\n'
        '                    <div class="panel-data-card">\n'
        '                        <div class="panel-card-title-bar">\n'
        '                            <h3>Dashboard Overview</h3>\n'
        '                        </div>\n'
        '                        <div class="card-body-padded">\n'
        f"{grid_html.strip()}\n"
        '                        </div>\n'
        '                    </div>\n'
        '                </div>\n'
        '            </div>'
    )


def transform_dashboard_main(html: str) -> str:
    grid_match = re.search(r"(<div\s+class=\"dashboard-grid\".*?</div>)", html, re.DOTALL)
    if not grid_match:
        return html

    wrapped = wrap_dashboard_grid(grid_match.group(1))
    block_re = re.compile(
        r"<main\s+class=\"workspace-view-canvas\">.*?</main>",
        re.DOTALL,
    )
    return block_re.sub(
        f'<main class="workspace-view-canvas">\n{wrapped}\n        </main>',
        html,
        count=1,
    )


def transform_inbox_layout(html: str) -> str:
    html = SIDEBAR_RE.sub("", html)
    html = html.replace("system-dashboard-wrapper", "core-viewport-wrapper")
    html = re.sub(
        r"<div\s+class=\"core-viewport-wrapper\">\s*",
        "",
        html,
        count=1,
    )
    html = re.sub(
        r"</div>\s*(?=<script)",
        "",
        html,
        count=1,
    )
    html = html.replace(
        '<main class="workspace-view-canvas">',
        '<main class="workspace-view-canvas inbox-page-main">',
    )
    return html


def ensure_scripts(html: str, filename: str) -> str:
    for src in REQUIRED_SCRIPTS:
        if src not in html:
            html = html.replace("</body>", f'    <script src="{src}"></script>\n</body>', 1)

    staff_match = re.fullmatch(r"staff-(\d+)\.html", filename)
    inbox_match = re.fullmatch(r"inbox-staff-(\d+)\.html", filename)
    if staff_match:
        sid = f"staff-{staff_match.group(1)}"
        line = f"<script>KreezbyStaffPermissions.setCurrentStaffId('{sid}');</script>"
        if line not in html:
            html = html.replace(
                '<script src="../js/staff-permissions.js"></script>',
                f'<script src="../js/staff-permissions.js"></script>\n    {line}',
                1,
            )
    if inbox_match and "setCurrentStaffId" not in html:
        sid = f"staff-{inbox_match.group(1)}"
        html = html.replace(
            '<script src="../js/staff-permissions.js"></script>',
            f'<script src="../js/staff-permissions.js"></script>\n    <script>KreezbyStaffPermissions.setCurrentStaffId(\'{sid}\');</script>',
            1,
        )

    # Remove duplicate notification-popover if user-dropdown loads it
    html = re.sub(r'\s*<script src="\.\./js/notification-popover\.js"></script>', "", html)
    return html


def migrate_file(path: Path) -> bool:
    name = path.name
    if is_report_page(name) and name != "report_issue-staff.html":
        return False

    original = path.read_text(encoding="utf-8")
    html = original

    html = ensure_head_links(html)
    html = ensure_collapsed_script(html)

    if not is_report_page(name):
        html = normalize_header(html)

    if is_inbox_page(name) or is_inbox_page_from_html(html):
        html = transform_inbox_layout(html)
    else:
        html = SIDEBAR_RE.sub(EMPTY_SIDEBAR, html)
        html = html.replace("system-dashboard-wrapper", "core-viewport-wrapper")
        html = html.replace("workspace-canvas", "workspace-view-canvas")

        if is_dashboard_page(name):
            html = transform_dashboard_main(html)

    html = ensure_scripts(html, name)

    if html != original:
        path.write_text(html, encoding="utf-8")
        return True
    return False


def main():
    changed = []
    for path in sorted(STAFF_DIR.glob("*.html")):
        if migrate_file(path):
            changed.append(path.name)
    print(f"Updated {len(changed)} files:")
    for name in changed:
        print(f"  - {name}")


if __name__ == "__main__":
    main()
