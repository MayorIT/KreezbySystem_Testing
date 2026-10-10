"""Export Lipa retailer logos — remove outer white only, keep internal whites."""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path(r"c:\Users\acer\Downloads\Lipa-20260610T150626Z-3-001\Lipa")
OUT_DIR = ROOT / "assets" / "logo" / "lipa"

SOURCE_FILES = {
    "aa-lomi": "AA Lomi.png",
    "banay-banay": "Banay-banay Eatery.jpeg",
    "butch": "Butch.png",
    "chicha": "Chicha.jpg",
    "kubo-sa-halamanan": "Kubo_sa_Halamanan-removebg-preview.png",
    "lbn": "LBN.jpeg",
    "lipa-grill": "Lipa Grill.png",
    "lucias-cafe": "Lucias Cafe.jpeg",
    "shell-select": "Shell Select .png",
    "sidc": "SIDC.jpg",
}

SLUG_LOGO = {
    "sidcmahabangparang": "sidc.png",
    "sidcsanjose": "sidc.png",
    "banaybanayeatery": "banay-banay.png",
    "aalomilipa": "aa-lomi.png",
    "butchlipa": "butch.png",
    "shellselecttambo": "shell-select.png",
    "shellselectbalintawak": "shell-select.png",
    "chicha": "chicha.png",
    "lipagrilllipa": "lipa-grill.png",
    "kubosahalamananmalarayat": "kubo-sa-halamanan.png",
    "lbnmarawoy": "lbn.png",
    "luciascafelipa": "lucias-cafe.png",
    "kubosahalamananmarawoy": "kubo-sa-halamanan.png",
}


def is_near_white(r: int, g: int, b: int, tolerance: int = 22) -> bool:
    return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance


def is_near_yellow_bg(r: int, g: int, b: int) -> bool:
    """Bright yellow canvas (e.g. Kubo sa Halamanan source art)."""
    avg_rg = (r + g) / 2
    return (
        r >= 155
        and g >= 155
        and b <= 195
        and abs(r - g) <= 55
        and avg_rg > b + 15
    )


def is_removable_edge_bg(r: int, g: int, b: int, tolerance: int = 22) -> bool:
    return is_near_white(r, g, b, tolerance) or is_near_yellow_bg(r, g, b)


def remove_outer_background(img: Image.Image, tolerance: int = 22, include_yellow: bool = False) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    width, height = img.size
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def matches_bg(r: int, g: int, b: int) -> bool:
        if include_yellow:
            return is_removable_edge_bg(r, g, b, tolerance)
        return is_near_white(r, g, b, tolerance)

    def try_seed(x: int, y: int) -> None:
        if (x, y) in visited:
            return
        r, g, b, _a = pixels[x, y]
        if matches_bg(r, g, b):
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
        if not matches_bg(r, g, b):
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


def process_file(
    src: Path,
    dest: Path,
    include_yellow: bool = False,
    skip_bg_removal: bool = False,
) -> None:
    img = Image.open(src).convert("RGBA")
    if not skip_bg_removal:
        img = remove_outer_background(img, include_yellow=include_yellow)
    img = trim_transparent(img)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for key, filename in SOURCE_FILES.items():
        src = SRC_DIR / filename
        if not src.exists():
            raise FileNotFoundError(src)
        process_file(
            src,
            OUT_DIR / f"{key}.png",
            include_yellow=(key == "kubo-sa-halamanan"),
            skip_bg_removal=(key == "kubo-sa-halamanan"),
        )
        print("wrote", OUT_DIR / f"{key}.png")

    for slug, logo_name in SLUG_LOGO.items():
        src_logo = OUT_DIR / logo_name
        dest = OUT_DIR / f"{slug}.png"
        if src_logo.resolve() == dest.resolve():
            continue
        shutil.copy2(src_logo, dest)
        print("slug", slug, "->", dest.name)


if __name__ == "__main__":
    main()
