"""Export Batangas retailer logos — remove outer white only, keep internal whites."""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = Path(r"c:\Users\acer\Downloads\Batangas-20260610T134853Z-3-001\Batangas")
KREEZBY_SRC = Path(
    r"C:\Users\acer\.cursor\projects\c-Users-acer-Desktop-Kreezby-Bakeshop-zero-data\assets"
    r"\c__Users_acer_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_"
    r"296489660_5496405487087262_9008811677183440865_n-46043660-fd57-4e73-a705-58d727e80116.png"
)
OUT_DIR = ROOT / "assets" / "logo" / "batangas"
DEFAULT_LOGO = ROOT / "assets" / "logo" / "kreezby-logo.png"

SOURCE_FILES = {
    "aa-lomi": "AA Lomi.png",
    "butch": "Butch.png",
    "jhorjhanes": "Jhorjhanes .png",
    "shell-select": "Shell Select .png",
    "wanam-sa-bukid": "Wanam sa Bukid .png",
    "sidc": "SIDC.jpg",
}

SLUG_LOGO = {
    "aalomibalagtas": "aa-lomi.png",
    "butchalangilan": "butch.png",
    "jhorjhanesbalagtas": "jhorjhanes.png",
    "shellselectkumintangibaba": "shell-select.png",
    "wanamsabukidbalagtas": "wanam-sa-bukid.png",
    "wanamsabukidgulod": "wanam-sa-bukid.png",
    "wanamsabukidpalengke": "wanam-sa-bukid.png",
    "sidcmain": "sidc.png",
    "sidcsorosoroilaya": "sidc.png",
    "sidctulo": "sidc.png",
    "sidclibjo": "sidc.png",
    "sidcpallocan": "sidc.png",
    "3m": "kreezby-logo.png",
    "graciaspasalubong": "kreezby-logo.png",
}


def is_near_white(r: int, g: int, b: int, tolerance: int = 22) -> bool:
    return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance


def remove_outer_white_background(img: Image.Image, tolerance: int = 22) -> Image.Image:
    """Flood-fill white from image edges only — keeps white inside the logo artwork."""
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
        r, g, b, a = pixels[x, y]
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


def process_file(src: Path, dest: Path) -> None:
    img = Image.open(src)
    img = remove_outer_white_background(img)
    img = trim_transparent(img)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (ROOT / "assets" / "logo").mkdir(parents=True, exist_ok=True)

    for key, filename in SOURCE_FILES.items():
        src = SRC_DIR / filename
        if not src.exists():
            raise FileNotFoundError(src)
        process_file(src, OUT_DIR / f"{key}.png")
        print("wrote", OUT_DIR / f"{key}.png")

    if KREEZBY_SRC.exists():
        process_file(KREEZBY_SRC, DEFAULT_LOGO)
        print("wrote", DEFAULT_LOGO)
    else:
        shutil.copy2(OUT_DIR / "sidc.png", DEFAULT_LOGO)
        print("fallback kreezby logo from sidc")

    for slug, logo_name in SLUG_LOGO.items():
        src_logo = DEFAULT_LOGO if logo_name == "kreezby-logo.png" else OUT_DIR / logo_name
        dest = OUT_DIR / f"{slug}.png"
        if src_logo.resolve() == dest.resolve():
            continue
        shutil.copy2(src_logo, dest)
        print("slug", slug, "->", dest.name)


if __name__ == "__main__":
    main()
