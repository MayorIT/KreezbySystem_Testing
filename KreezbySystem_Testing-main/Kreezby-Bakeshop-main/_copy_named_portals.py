import os
import re

ROOT = os.path.abspath('.')
PREFIX = re.compile(
    r'(?P<q>["\'\(])\.\./(?P<rest>(?:css|js|assets|auth|head_admin|it_kreezby)/)'
)

ADMINS = [
    'elena-morales',
    'marco-del-rosario',
    'patricia-go',
    'jonas-villanueva',
]
STAFF = [
    'claire-mendoza',
    'ryan-santos',
    'isabel-cruz',
    'derek-lim',
    'nina-garcia',
    'omar-reyes',
    'grace-tan',
]

BUMPS = {
    'admin-sidebar.js?v=20260927perms': 'admin-sidebar.js?v=20260927names',
    'admin-sidebar.js?v=20260927active': 'admin-sidebar.js?v=20260927names',
    'staff-sidebar.js?v=20260927active': 'staff-sidebar.js?v=20260927names',
    'user-dropdown-nav.js?v=20260927tabs': 'user-dropdown-nav.js?v=20260927names',
    'staff-permissions.js?v=20260927nav': 'staff-permissions.js?v=20260927names',
    'admin-permissions.js"': 'admin-permissions.js?v=20260927names"',
}


def list_html(folder):
    names = []
    for name in os.listdir(folder):
        path = os.path.join(folder, name)
        if os.path.isfile(path) and name.lower().endswith('.html'):
            names.append(name)
    return sorted(names)


def copy_tree(source_folder, slugs, dest_parent):
    files = list_html(source_folder)
    written = 0
    for slug in slugs:
        dest = os.path.join(ROOT, dest_parent, slug)
        os.makedirs(dest, exist_ok=True)
        for name in files:
            src = os.path.join(ROOT, source_folder, name)
            with open(src, 'r', encoding='utf-8', errors='ignore') as handle:
                text = handle.read()
            text = PREFIX.sub(lambda m: m.group('q') + '../../' + m.group('rest'), text)
            for old, new in BUMPS.items():
                text = text.replace(old, new)
            out = os.path.join(dest, name)
            with open(out, 'w', encoding='utf-8', newline='\n') as handle:
                handle.write(text)
            written += 1
    return len(files), written


admin_count, admin_written = copy_tree('admin', ADMINS, 'admin_names')
staff_count, staff_written = copy_tree('staff', STAFF, 'staff_names')
print('admin files', admin_count, 'written', admin_written)
print('staff files', staff_count, 'written', staff_written)
