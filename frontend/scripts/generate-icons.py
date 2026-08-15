"""Generate the PWA icon set.

Stdlib only (zlib + struct) so it runs anywhere Python does — no Pillow, no npm
image toolchain. Shapes are drawn analytically and supersampled 3x for
antialiasing, then box-filtered down to the target size.

Run from the frontend directory:

    python scripts/generate-icons.py

Outputs into public/icons/. Re-run after changing BRAND or the geometry below.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"

BRAND = (0x25, 0x63, 0xEB)  # --color-primary
WHITE = (0xFF, 0xFF, 0xFF)

SS = 3  # supersampling factor


# ---------------------------------------------------------------- geometry --
# All coordinates are in unit space (0..1) relative to the icon canvas, so the
# same definitions render at any pixel size.

def rounded_rect(px, py, x0, y0, x1, y1, r):
    if px < x0 or px > x1 or py < y0 or py > y1:
        return False
    cx = min(max(px, x0 + r), x1 - r)
    cy = min(max(py, y0 + r), y1 - r)
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def circle(px, py, cx, cy, r):
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def triangle(px, py, a, b, c):
    def sign(p, q, r):
        return (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1])

    d1, d2, d3 = sign((px, py), a, b), sign((px, py), b, c), sign((px, py), c, a)
    has_neg = d1 < 0 or d2 < 0 or d3 < 0
    has_pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (has_neg and has_pos)


# Speech-bubble mark, matching the lucide MessagesSquare used in the sidebar.
BUBBLE = (0.20, 0.24, 0.80, 0.66, 0.11)  # x0, y0, x1, y1, radius
TAIL = ((0.32, 0.64), (0.32, 0.84), (0.50, 0.64))
DOTS = [(0.34, 0.45), (0.50, 0.45), (0.66, 0.45)]
DOT_R = 0.048


def sample(px, py, *, rounded_bg, logo_scale):
    """Return the RGBA colour at unit-space point (px, py)."""
    # Background: rounded square for the standard icon, full bleed for maskable
    # (the platform applies its own mask and would clip our corners anyway).
    if rounded_bg:
        if not rounded_rect(px, py, 0.0, 0.0, 1.0, 1.0, 0.22):
            return (0, 0, 0, 0)

    # Scale the mark about the centre so maskable icons keep it in the safe zone.
    lx = (px - 0.5) / logo_scale + 0.5
    ly = (py - 0.5) / logo_scale + 0.5

    x0, y0, x1, y1, r = BUBBLE
    in_mark = rounded_rect(lx, ly, x0, y0, x1, y1, r) or triangle(lx, ly, *TAIL)
    if in_mark:
        for cx, cy in DOTS:
            if circle(lx, ly, cx, cy, DOT_R):
                return (*BRAND, 255)
        return (*WHITE, 255)

    return (*BRAND, 255)


# ------------------------------------------------------------------ render --

def render(size, *, rounded_bg=True, logo_scale=1.0):
    hi = size * SS
    inv = 1.0 / hi
    # Render the supersampled grid one row at a time, then box-filter.
    hi_rows = []
    for j in range(hi):
        py = (j + 0.5) * inv
        row = [sample((i + 0.5) * inv, py, rounded_bg=rounded_bg, logo_scale=logo_scale)
               for i in range(hi)]
        hi_rows.append(row)

    n = SS * SS
    out = bytearray()
    for y in range(size):
        block = hi_rows[y * SS:(y + 1) * SS]
        for x in range(size):
            r = g = b = a = 0
            for row in block:
                for px in row[x * SS:(x + 1) * SS]:
                    # Premultiply so transparent corners don't bleed dark edges.
                    r += px[0] * px[3]
                    g += px[1] * px[3]
                    b += px[2] * px[3]
                    a += px[3]
            if a == 0:
                out += b"\x00\x00\x00\x00"
            else:
                out += bytes((r // a, g // a, b // a, a // n))
    return bytes(out)


# --------------------------------------------------------------------- png --

def write_png(path: Path, size: int, rgba: bytes):
    raw = b"".join(b"\x00" + rgba[y * size * 4:(y + 1) * size * 4] for y in range(size))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    path.write_bytes(png)
    print(f"  {path.name:<28} {size}x{size}  {len(png) / 1024:.1f} KB")


ICONS = [
    # name,                    size, rounded_bg, logo_scale
    ("icon-192.png", 192, True, 1.0),
    ("icon-512.png", 512, True, 1.0),
    # Maskable: full bleed, mark shrunk into the inner 60% safe zone.
    ("icon-maskable-512.png", 512, False, 0.62),
    # iOS never applies a mask and does not honour transparency, so this one is
    # full bleed with a slightly inset mark.
    ("apple-touch-icon.png", 180, False, 0.80),
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Writing icons to {OUT_DIR}")
    for name, size, rounded_bg, scale in ICONS:
        write_png(OUT_DIR / name, size,
                  render(size, rounded_bg=rounded_bg, logo_scale=scale))
    print("Done.")


if __name__ == "__main__":
    main()
