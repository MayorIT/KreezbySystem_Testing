#!/usr/bin/env python3
"""Align staff navbar HTML with inbox staff pages."""

import re
from pathlib import Path

STAFF_DIR = Path(__file__).resolve().parent.parent / "staff"
EXPANDABLE = '<link rel="stylesheet" href="../css/shared/expandable-nav-tabs.css">'
AVATAR_SPAN = re.compile(
    r'\s*<span style="background:#fff; width:18px; height:18px; border-radius:50%; display:inline-block;"></span>\s*',
    re.IGNORECASE,
)

updated = []
for path in sorted(STAFF_DIR.glob("*.html")):
    text = path.read_text(encoding="utf-8")
    orig = text

    if "expandable-nav-tabs.css" not in text and "top-navbar-node" in text:
        if 'href="../css/shared/portal-shell-layout.css"' in text:
            text = text.replace(
                '<link rel="stylesheet" href="../css/shared/portal-shell-layout.css">',
                EXPANDABLE + '\n    <link rel="stylesheet" href="../css/shared/portal-shell-layout.css">',
                1,
            )
        elif 'href="../css/shared/kreezby-turbo-nav.css"' in text:
            text = text.replace(
                '<link rel="stylesheet" href="../css/shared/kreezby-turbo-nav.css">',
                '<link rel="stylesheet" href="../css/shared/kreezby-turbo-nav.css">\n    ' + EXPANDABLE,
                1,
            )

    text = AVATAR_SPAN.sub("\n                    ", text)

    if text != orig:
        path.write_text(text, encoding="utf-8")
        updated.append(path.name)

print(f"Updated {len(updated)} files")
for name in updated:
    print(f"  - {name}")
