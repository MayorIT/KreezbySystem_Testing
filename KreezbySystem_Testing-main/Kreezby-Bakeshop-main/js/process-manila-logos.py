"""Export Manila retailer logos — clear outer background, keep internal artwork."""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path(r"c:\Users\acer\Downloads\Manila-20260612T145010Z-3-001\Manila")
OUT_DIR = ROOT / "assets" / "logo" / "manila"

SOURCE_FILES = {
    "mang-muring": "Mang Muring.jpg",
}

SLUG_LOGO = {
    "mangmuringtotal": "mang-muring.png",
    "mangmuringshell": "mang-muring.png",
}


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


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    img = trim_transparent(remove_outer_white(Image.open(SRC_DIR / SOURCE_FILES["mang-muring"])))
    master = OUT_DIR / "mang-muring.png"
    img.save(master, "PNG")
    print("wrote mang-muring (white)")

    for slug, logo_name in SLUG_LOGO.items():
        dest = OUT_DIR / f"{slug}.png"
        src = OUT_DIR / logo_name
        if src.resolve() != dest.resolve():
            shutil.copy2(src, dest)
        print("slug", slug)


if __name__ == "__main__":
    main()
