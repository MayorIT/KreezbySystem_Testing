"""Export Rosario retailer logos — clear outer background, keep internal artwork."""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path(r"c:\Users\acer\Downloads\Rosario-20260612T145357Z-3-001\Rosario")
OUT_DIR = ROOT / "assets" / "logo" / "rosario"
KREEZBY = ROOT / "assets" / "logo" / "kreezby-logo.png"

SOURCE_FILES = {
    "aa-lomi": "AA Lomi.png",
    "balkonahe": "Balkonahe.jpg",
    "ben-cha": "Ben & Cha.jpg",
    "chick-nj": "Chick N_ J.jpg",
    "hangout": "Hangout.jpg",
    "lipa-grill": "Lipa Grill.png",
    "sidc": "SIDC.jpg",
}

SLUG_LOGO = {
    "bencha": "ben-cha.png",
    "sidcibaan": "sidc.png",
    "balkonahe": "balkonahe.png",
    "chicknjrosario": "chick-nj.png",
    "chicknjpadregarcia": "chick-nj.png",
    "chicknjibaan": "chick-nj.png",
    "aalomipadregarcia": "aa-lomi.png",
    "lipagrillsanfelipe": "lipa-grill.png",
    "hangout": "hangout.png",
    "matteosliquiwan": "matteosliquiwan.png",
    "yummies": "yummies.png",
}

FALLBACK_SLUGS = ("matteosliquiwan", "yummies")


def is_near_white(r: int, g: int, b: int, tolerance: int = 22) -> bool:
    return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance


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


def process_file(src: Path, dest: Path) -> None:
    img = trim_transparent(remove_outer_white(Image.open(src)))
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for key, filename in SOURCE_FILES.items():
        process_file(SRC_DIR / filename, OUT_DIR / f"{key}.png")
        print("wrote", key)

    for slug in FALLBACK_SLUGS:
        process_file(KREEZBY, OUT_DIR / f"{slug}.png")
        print("wrote", slug, "(kreezby fallback)")

    for slug, logo_name in SLUG_LOGO.items():
        dest = OUT_DIR / f"{slug}.png"
        src = OUT_DIR / logo_name
        if src.resolve() != dest.resolve():
            shutil.copy2(src, dest)
        print("slug", slug)


if __name__ == "__main__":
    main()
