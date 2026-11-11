#!/usr/bin/env python3
"""Regenerate the PWA icon set (interim mark, pending the B4 lockup).

Draws a Tome & Delve interim mark — parchment field, ink double-rule frame,
oxblood wax seal with "4AD" in Noto Serif Bold — and exports every size the
manifest lists, plus a maskable variant, an Apple touch icon, and favicon.ico.
It also copies the manifest screenshots from docs/screenshots/ into
public/screenshots/, so this one script regenerates every binary PWA asset
from text sources (the icons are drawn; the screenshots are the README captures).

Replaces the Phase 1 procedural placeholders, which were black squares with a
malformed PNG encoding (one extra byte per scanline; undecodable by PIL and
rejected by strict PNG decoders).

Usage:
    python3 tools/make-icons.py            # writes public/icons/*, public/favicon.ico
    NOTO_SERIF_BOLD=/path/to/NotoSerif-Bold.ttf python3 tools/make-icons.py

Requires: Pillow, and Noto Serif Bold (searched in the usual system font dirs).
"""
import os
import shutil
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "icons")
SCREENSHOTS = ["dungeon-mobile.png", "dungeon-desktop.png"]

PARCHMENT = (232, 223, 202)   # stone-950
INK = (43, 36, 31)            # parchment (iron-gall ink)
FOLIO = (250, 246, 238)       # stone-800
OXBLOOD = (140, 38, 38)       # torch
OXBLOOD_DARK = (110, 28, 28)  # btn-wax hover
EMBER = (168, 50, 50)         # ember

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

FONT_CANDIDATES = [
    os.environ.get("NOTO_SERIF_BOLD", ""),
    "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf",
    "/usr/share/fonts/noto/NotoSerif-Bold.ttf",
    os.path.expanduser("~/Library/Fonts/NotoSerif-Bold.ttf"),
    "/System/Library/Fonts/Supplemental/NotoSerif-Bold.ttf",
]


def find_font() -> str:
    for path in FONT_CANDIDATES:
        if path and os.path.exists(path):
            return path
    raise SystemExit(
        "Noto Serif Bold not found; set NOTO_SERIF_BOLD to its path."
    )


def draw_mark(size: int, *, maskable: bool, font_path: str) -> Image.Image:
    """Draw the interim mark at `size` px. Maskable omits the edge frame and
    keeps the seal inside the center 80% (maskable safe zone)."""
    img = Image.new("RGB", (size, size), PARCHMENT)
    d = ImageDraw.Draw(img)
    if not maskable:
        # Ink double-rule frame (mirrors .ink-frame: 2px rule + offset hairline).
        w_outer = max(2, round(size * 0.014))
        inset = max(2, round(size * 0.016))
        d.rectangle([inset, inset, size - 1 - inset, size - 1 - inset],
                    outline=INK, width=w_outer)
        w_inner = max(1, round(size * 0.004))
        inset2 = inset + max(3, round(size * 0.016))
        d.rectangle([inset2, inset2, size - 1 - inset2, size - 1 - inset2],
                    outline=INK, width=w_inner)
    # Wax seal: oxblood disc, darker rim, ember inner ring.
    r = size * (0.31 if maskable else 0.34)
    cx = cy = size / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=OXBLOOD)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=OXBLOOD_DARK,
              width=max(2, round(size * 0.008)))
    r2 = r * 0.88
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=EMBER,
              width=max(1, round(size * 0.004)))
    # "4AD" in Noto Serif Bold, scaled to fit 78% of the seal diameter.
    font_size = int(size * 0.42)
    while font_size > 8:
        font = ImageFont.truetype(font_path, font_size)
        bbox = d.textbbox((0, 0), "4AD", font=font)
        if bbox[2] - bbox[0] <= 2 * r * 0.78:
            break
        font_size -= 4
    d.text((cx, cy), "4AD", font=font, fill=FOLIO, anchor="mm")
    return img


def main() -> None:
    font_path = find_font()
    os.makedirs(OUT, exist_ok=True)
    master = draw_mark(1024, maskable=False, font_path=font_path)
    for size in SIZES:
        master.resize((size, size), Image.LANCZOS).save(
            os.path.join(OUT, f"icon-{size}.png"))
        print(f"icon-{size}.png")
    maskable = draw_mark(512, maskable=True, font_path=font_path)
    maskable.save(os.path.join(OUT, "icon-512-maskable.png"))
    print("icon-512-maskable.png")
    master.resize((180, 180), Image.LANCZOS).save(
        os.path.join(OUT, "apple-touch-icon.png"))
    print("apple-touch-icon.png")
    master.save(os.path.join(ROOT, "public", "favicon.ico"),
                sizes=[(16, 16), (32, 32), (48, 48)])
    print("favicon.ico")
    # Sanity: every emitted PNG must decode.
    for name in sorted(os.listdir(OUT)):
        if name.endswith(".png"):
            with Image.open(os.path.join(OUT, name)) as im:
                im.load()
    print("all icons decode OK")
    # Manifest screenshots: copy the README captures into public/.
    shot_dir = os.path.join(ROOT, "public", "screenshots")
    os.makedirs(shot_dir, exist_ok=True)
    for name in SCREENSHOTS:
        src = os.path.join(ROOT, "docs", "screenshots", name)
        shutil.copyfile(src, os.path.join(shot_dir, name))
        print(f"screenshots/{name}")


if __name__ == "__main__":
    sys.exit(main())
