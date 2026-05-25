#!/usr/bin/env python3
"""
Prepare Morbeez logos for Shopify theme.
- logo1.png → footer (white text on dark bar)
- Header logo generated FROM logo1.png (dark text for white header)
  logo.png has black-on-black text and breaks when the background is removed.
"""
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install Pillow: pip install Pillow")

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "theme" / "assets"
BG_THRESHOLD = 35
HEADER_TEXT = (33, 37, 41)  # dark grey for white header
HEADER_TAGLINE = (82, 88, 96)


def is_green(r: int, g: int, b: int) -> bool:
    return g > 100 and g > r + 40 and g > b + 25


def is_light_text(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return False
    if is_green(r, g, b):
        return False
    return r > 150 and g > 150 and b > 150


def is_tagline_grey(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return False
    if is_green(r, g, b):
        return False
    avg = (r + g + b) / 3
    return 90 < avg < 200


def flood_remove_black_bg(img: Image.Image) -> Image.Image:
    """Remove black background connected to image edges (keeps interior dark text)."""
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()
    visited = set()
    q: deque[tuple[int, int]] = deque()

    def is_bg(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        return a > 0 and r <= BG_THRESHOLD and g <= BG_THRESHOLD and b <= BG_THRESHOLD

    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y):
                q.append((x, y))
    for y in range(1, h - 1):
        for x in (0, w - 1):
            if is_bg(x, y):
                q.append((x, y))

    while q:
        x, y = q.popleft()
        if (x, y) in visited or x < 0 or y < 0 or x >= w or y >= h:
            continue
        if not is_bg(x, y):
            continue
        visited.add((x, y))
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                q.append((nx, ny))

    return img


def footer_from_logo1(src: Path, dest: Path) -> None:
    img = flood_remove_black_bg(Image.open(src))
    img.save(dest, "PNG", optimize=True)
    print(f"  {dest.name} (footer, {dest.stat().st_size} bytes)")


def header_from_logo1(src: Path, dest: Path) -> None:
    img = flood_remove_black_bg(Image.open(src))
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 20:
                continue
            if is_green(r, g, b):
                continue
            if is_light_text(r, g, b, a):
                pixels[x, y] = (*HEADER_TEXT, a)
            elif is_tagline_grey(r, g, b, a):
                pixels[x, y] = (*HEADER_TAGLINE, a)
    img.save(dest, "PNG", optimize=True)
    print(f"  {dest.name} (header, {dest.stat().st_size} bytes)")


def main() -> None:
    footer_src = ROOT / "logo1.png"
    if not footer_src.exists():
        raise SystemExit("Missing logo1.png in project root")

    ASSETS.mkdir(parents=True, exist_ok=True)
    print("Preparing theme logos…")
    footer_from_logo1(footer_src, ASSETS / "logo1.png")
    header_from_logo1(footer_src, ASSETS / "logo.png")
    header_from_logo1(footer_src, ASSETS / "morbeez-logo.png")
    footer_from_logo1(footer_src, ASSETS / "morbeez-logo-on-dark.png")
    print("Done.")


if __name__ == "__main__":
    main()
