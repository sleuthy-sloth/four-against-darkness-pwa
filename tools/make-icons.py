#!/usr/bin/env python3
"""Regenerate the PWA icon set from the Delver at the Threshold mark.

The mark is the generated delver logo (tools/delver-master.png, 1024x1024
black ink line art on parchment). Icons are the ink mask of that mark on a
parchment field — no text, no wax seal — drawn at every size the manifest
lists, plus a maskable variant, an Apple touch icon, and favicon.ico. It
also copies the manifest screenshots from docs/screenshots/ into
public/screenshots/, so this one script regenerates every binary PWA asset
from sources in the repo (the icons are drawn from the delver master; the
screenshots are the README captures).

The mask uses the same threshold as the SVG lockup trace (ink < 110 on the
grayscale master; the parchment vignette stays above 120, so the background
drops out cleanly). The mask is resized with LANCZOS, so its grey edge
pixels anti-alias the mark when pasted.

Usage:
    python3 tools/make-icons.py            # writes public/icons/*, public/favicon.ico

Requires: Pillow.
"""
import os
import shutil
import sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "icons")
MASTER = os.path.join(ROOT, "tools", "delver-master.png")
SCREENSHOTS = ["dungeon-mobile.png", "dungeon-desktop.png"]

PARCHMENT = (232, 223, 202)   # stone-950
INK = (43, 36, 31)            # parchment (iron-gall ink)

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

THRESHOLD = 110


def load_mark() -> Image.Image:
    """Delver mark as a binary ink mask (white = ink), cropped tight."""
    im = Image.open(MASTER).convert("L")
    mask = im.point(lambda v: 255 if v < THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise SystemExit("delver master has no ink pixels")
    return mask.crop(bbox)


def draw_mark(size: int, *, maskable: bool, mark: Image.Image) -> Image.Image:
    """Delver mark centred on a parchment field at `size` px.

    Maskable omits the edge frame and keeps the mark inside the center 80%
    (maskable safe zone)."""
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
    # The mark is portrait: fit by height, centre horizontally.
    frac = 0.74 if maskable else 0.84
    target_h = int(size * frac)
    target_w = round(mark.width * target_h / mark.height)
    m = mark.resize((target_w, target_h), Image.LANCZOS)
    ink = Image.new("RGB", (target_w, target_h), INK)
    img.paste(ink, ((size - target_w) // 2, (size - target_h) // 2), m)
    return img


def main() -> None:
    mark = load_mark()
    os.makedirs(OUT, exist_ok=True)
    master = draw_mark(1024, maskable=False, mark=mark)
    for size in SIZES:
        master.resize((size, size), Image.LANCZOS).save(
            os.path.join(OUT, f"icon-{size}.png"))
        print(f"icon-{size}.png")
    maskable = draw_mark(512, maskable=True, mark=mark)
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
