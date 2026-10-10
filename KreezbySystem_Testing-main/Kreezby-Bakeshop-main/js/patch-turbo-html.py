#!/usr/bin/env python3
"""Apply turbo-frame layout to staff and retailer HTML pages."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_PATTERNS = [
    re.compile(r'inbox[-_]', re.I),
    re.compile(r'report_issue', re.I),
    re.compile(r'retailer-directory\.html$', re.I),
]

BODY_COLLAPSED_SCRIPT = (
    '<script>try{if(localStorage.getItem(\'kreezbySidebarCollapsed\')===\'1\')'
    'document.body.classList.add(\'sidebar-collapsed\');}catch(e){}</script>\n\n'
)


def should_exclude(filename):
    return any(p.search(filename) for p in EXCLUDE_PATTERNS)


def css_prefix_for(path):
    rel = os.path.relpath(os.path.dirname(path), ROOT).replace('\\', '/')
    if rel == '.':
        return ''
    depth = rel.count('/') + 1
    return '../' * depth


def js_prefix_for(path):
    return css_prefix_for(path)


def add_head_turbo(content, css_prefix):
    correct_href = f'href="{css_prefix}css/shared/kreezby-turbo-nav.css"'
    content = re.sub(
        r'href="(?:\.\./)*css/shared/kreezby-turbo-nav\.css"',
        correct_href,
        content,
        count=1,
    )

    if 'view-transition' in content and correct_href in content:
        return content

    insert = (
        f'    <meta name="view-transition" content="same-origin">\n'
        f'    <link rel="stylesheet" {correct_href[5:]}>\n'
    )
    if 'name="view-transition"' not in content:
        content = content.replace('<meta name="viewport"', insert + '    <meta name="viewport"', 1)
    elif correct_href not in content:
        content = content.replace('</head>', f'    <link rel="stylesheet" {correct_href[5:]}>\n</head>', 1)
    return content


def add_body_collapsed_script(content):
    if 'kreezbySidebarCollapsed' in content[:800]:
        return content
    m = re.search(r'<body[^>]*>', content)
    if not m:
        return content
    pos = m.end()
    return content[:pos] + '\n' + BODY_COLLAPSED_SCRIPT + content[pos:]


def wrap_main_in_turbo(content):
    if 'id="kreezby-main-content"' in content:
        return content
    m = re.search(r'<main\s+class="workspace-(?:view-)?canvas"[^>]*>', content)
    if not m:
        return content
    start = m.start()
    end = content.find('</main>', m.end())
    if end == -1:
        return content
    end += len('</main>')
    main_block = content[start:end]
    indent = '        '
    wrapped = (
        f'<turbo-frame id="kreezby-main-content" class="kreezby-turbo-main">\n'
        f'{indent}{main_block}\n'
        f'{indent}</turbo-frame>'
    )
    return content[:start] + wrapped + content[end:]


def ensure_script(content, js_prefix, script_name, before_script=None):
    src = f'{js_prefix}js/{script_name}'
    if src in content:
        return content
    tag = f'    <script src="{src}"></script>\n'
    if before_script:
        needle = f'<script src="{js_prefix}js/{before_script}">'
        if needle in content:
            return content.replace(needle, tag + needle, 1)
    return content.replace('</body>', tag + '</body>', 1)


def patch_staff_file(path):
    filename = os.path.basename(path)
    if should_exclude(filename):
        # inbox/report_issue: head meta only, no turbo frame
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content
        css_prefix = js_prefix_for(path)
        content = add_head_turbo(content, css_prefix)
        content = ensure_script(content, css_prefix, 'user-dropdown-nav.js', before_script='sidebar-toggle.js')
        if content != original:
            with open(path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            return 'head-only'
        return None

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    css_prefix = js_prefix_for(path)
    js_prefix = css_prefix

    content = add_head_turbo(content, css_prefix)
    content = add_body_collapsed_script(content)
    content = wrap_main_in_turbo(content)
    content = ensure_script(content, js_prefix, 'user-dropdown-nav.js')

    if 'aside.dark-sidebar-panel' in content:
        content = ensure_script(content, js_prefix, 'staff-sidebar.js', before_script='sidebar-toggle.js')

    if content != original:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        return 'patched'
    return None


def patch_retailer_file(path):
    filename = os.path.basename(path)
    if should_exclude(filename):
        return None

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    css_prefix = js_prefix_for(path)
    js_prefix = css_prefix

    content = add_head_turbo(content, css_prefix)
    content = add_body_collapsed_script(content)
    content = wrap_main_in_turbo(content)
    content = ensure_script(content, js_prefix, 'user-dropdown-nav.js')

    # keep retailer-nav and sidebar-toggle order
    if 'retailer-nav.js' in content:
        content = ensure_script(content, js_prefix, 'user-dropdown-nav.js', before_script='retailer-nav.js')

    if content != original:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        return 'patched'
    return None


def main():
    staff_dir = os.path.join(ROOT, 'staff')
    retailer_dir = os.path.join(ROOT, 'retailer')
    staff_count = 0
    retailer_count = 0

    for name in sorted(os.listdir(staff_dir)):
        if not name.endswith('.html'):
            continue
        result = patch_staff_file(os.path.join(staff_dir, name))
        if result:
            staff_count += 1
            print(f'staff: {name} ({result})')

    for dirpath, _, filenames in os.walk(retailer_dir):
        for name in filenames:
            if not name.endswith('.html'):
                continue
            result = patch_retailer_file(os.path.join(dirpath, name))
            if result:
                retailer_count += 1
                if retailer_count <= 5 or retailer_count % 100 == 0:
                    print(f'retailer: {name} ({result})')

    print(f'Done. Staff: {staff_count}, Retailer: {retailer_count}')


if __name__ == '__main__':
    main()
