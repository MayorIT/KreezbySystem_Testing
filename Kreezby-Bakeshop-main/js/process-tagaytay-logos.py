"""Export Tagaytay retailer logos — clear outer background, keep internal artwork."""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path(r"c:\Users\acer\Downloads\Tagaytay-20260612T142542Z-3-001\Tagaytay")
OUT_DIR = ROOT / "assets" / "logo" / "tagaytay"

SOURCE_FILES = {
    "balinsasayaw": "Balinsasayaw.jpg",
    "green-ats": "Green ATS.jpg",
    "jaytees": "Jaytees.jpg",
    "pamana": "Pamana.jpg",
    "rsm-silvinas": "RSM Silvinas.jpg",
    "sinangag-express": "Sinangag Express.jpg",
}

SOURCE_MODE = {
    "balinsasayaw": "white",
    "green-ats": "edge",
    "jaytees": "white",
    "pamana": "white",
    "rsm-silvinas": "white",
    "sinangag-express": "white",
}

SLUG_LOGO = {
    "sinangagexpresstagaytay": "sinangag-express.png",
    "balinsasayawsilang": "balinsasayaw.png",
    "balinsasayawtagaytay": "balinsasayaw.png",
    "jayteesacienda": "jaytees.png",
    "jayteesmain": "jaytees.png",
    "jaytees9th": "jaytees.png",
    "rsmsilvinas": "rsm-silvinas.png",
    "pamana": "pamana.png",
    "greenats": "green-ats.png",
}


def is_near_white(r: int, g: int, b: int, tolerance: int = 22) -> bool:
    return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance


def colors_similar(
    r1: int, g1: int, b1: int, r2: int, g2: int, b2: int, tolerance: int
) -> bool:
    return (
        abs(r1 - r2) <= tolerance
        and abs(g1 - g2) <= tolerance
        and abs(b1 - b2) <= tolerance
    )


def remove_outer_white(img: Image.Image, tolerance: int = 22) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if (x, y) in visited:
            return
        r, g, b, _ = pixels[x, y]
        if is_near_white(r, g, b, tolerance):
            queue.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or x < 0 or x >= w or y < 0 or y >= h:
            continue
        r, g, b, _ = pixels[x, y]
        if not is_near_white(r, g, b, tolerance):
            continue
        visited.add((x, y))
        pixels[x, y] = (r, g, b, 0)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return img


def remove_edge_connected(img: Image.Image, tolerance: int = 42) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int, int, int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if (x, y) in visited:
            return
        r, g, b, _ = pixels[x, y]
        queue.append((x, y, r, g, b))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while queue:
        x, y, sr, sg, sb = queue.popleft()
        if (x, y) in visited or x < 0 or x >= w or y < 0 or y >= h:
            continue
        r, g, b, _ = pixels[x, y]
        if not colors_similar(r, g, b, sr, sg, sb, tolerance):
            continue
        visited.add((x, y))
        pixels[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in visited:
                queue.append((nx, ny, sr, sg, sb))
    return img


def trim_transparent(img: Image.Image, padding: int = 6) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    return img.crop((
        max(0, bbox[0] - padding),
        max(0, bbox[1] - padding),
        min(img.width, bbox[2] + padding),
        min(img.height, bbox[3] + padding),
    ))


def process_file(src: Path, dest: Path, mode: str) -> None:
    img = Image.open(src).convert("RGBA")
    if mode == "white":
        img = remove_outer_white(img)
    elif mode == "edge":
        img = remove_edge_connected(img)
    else:
        raise ValueError(mode)
    img = trim_transparent(img)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for key, filename in SOURCE_FILES.items():
        process_file(SRC_DIR / filename, OUT_DIR / f"{key}.png", SOURCE_MODE[key])
        print("wrote", key, f"({SOURCE_MODE[key]})")

    for slug, logo_name in SLUG_LOGO.items():
        dest = OUT_DIR / f"{slug}.png"
        src = OUT_DIR / logo_name
        if src.resolve() != dest.resolve():
            shutil.copy2(src, dest)
        print("slug", slug)


if __name__ == "__main__":
    main()
