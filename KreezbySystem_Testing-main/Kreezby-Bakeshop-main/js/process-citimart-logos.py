"""Export Citimart branch logo for all citimart retailer portals."""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CITIMART_SRC = Path(
    r"C:\Users\acer\.cursor\projects\c-Users-acer-Desktop-Kreezby-Bakeshop-zero-data\assets"
    r"\c__Users_acer_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_"
    r"5234381-4f95f328-705f-4760-86bb-ce5b39fa8b1f.png"
)
OUT_DIR = ROOT / "assets" / "logo" / "citimart"

SLUGS = [
    "citimartcaedo",
    "citimartnuciti",
    "citimartbaystaybaymall",
    "citimartshoponrizalave",
    "citimarttanauan",
    "citimartbauan",
    "citimartlemery",
    "citimartrosario",
]


def is_near_white(r: int, g: int, b: int, tolerance: int = 22) -> bool:
    return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance


def remove_outer_white_background(img: Image.Image, tolerance: int = 22) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    width, height = img.size
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if (x, y) in visited:
            return
        r, g, b, _a = pixels[x, y]
        if is_near_white(r, g, b, tolerance):
            queue.append((x, y))

    for x in range(width):
        try_seed(x, 0)
        try_seed(x, height - 1)
    for y in range(height):
        try_seed(0, y)
        try_seed(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or x < 0 or x >= width or y < 0 or y >= height:
            continue
        r, g, b, _a = pixels[x, y]
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
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(img.width, bbox[2] + padding)
    bottom = min(img.height, bbox[3] + padding)
    return img.crop((left, top, right, bottom))


def main() -> None:
    if not CITIMART_SRC.exists():
        raise FileNotFoundError(CITIMART_SRC)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.open(CITIMART_SRC)
    img = remove_outer_white_background(img)
    img = trim_transparent(img)

    master = OUT_DIR / "citimart.png"
    img.save(master, "PNG")
    print("wrote", master)

    for slug in SLUGS:
        dest = OUT_DIR / f"{slug}.png"
        shutil.copy2(master, dest)
        print("slug", slug, "->", dest.name)


if __name__ == "__main__":
    main()
