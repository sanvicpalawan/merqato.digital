#!/usr/bin/env python3
"""Regenerate the merQato.digital favicon set.

Outputs (written to public/):
  - favicon.ico          multi-resolution ICO (16/32/48/256, PNG-encoded, transparent)
  - favicon.svg          crisp vector version of the mark on a square canvas
  - apple-touch-icon.png 180x180 iOS home-screen tile (white background)

The glyph is the triple-slash "///" brand mark rendered by LogoMark in
src/components/merqato/MerqatoSite.tsx (viewBox 0 0 124 56), filled with the
site gradient --user-accent (#D31027) -> --user-accent-dark (#B91C1C) along the
same userSpaceOnUse vector (0,0)->(110,56) used by the inline SVG.

Dependency-free on purpose: the three slashes are straight-line polygons, so
they are rasterized here with supersampled even-odd fill and the PNG/ICO
containers are written by hand. Run from the repo root:

    python3 tools/generate-favicon.py
"""

import os
import struct
import zlib

# --- brand mark geometry (mark space, viewBox 0 0 124 56) -------------------
MARK = [
    [(0, 0), (27, 0), (27, 8), (59, 56), (40, 56), (17, 27), (0, 27)],
    [(33, 0), (60, 0), (60, 8), (92, 56), (73, 56), (50, 27), (33, 27)],
    [(66, 0), (93, 0), (93, 8), (117, 43), (124, 43), (124, 56),
     (105, 56), (105, 48), (83, 27), (66, 27)],
]
MARK_BBOX = [(min(p[0] for p in poly), min(p[1] for p in poly),
              max(p[0] for p in poly), max(p[1] for p in poly)) for poly in MARK]

# Square framing: the 124x56 glyph centered in a SIDE x SIDE canvas so the
# wide mark sits optically centered in square tab icons.
PAD_X, PAD_Y, SIDE = 6.0, 40.0, 136.0

# Gradient: userSpaceOnUse (0,0) -> (110,56), #D31027 -> #B91C1C
GRAD_D = (110.0, 56.0)
GRAD_LEN2 = GRAD_D[0] ** 2 + GRAD_D[1] ** 2
C0 = (0xD3, 0x10, 0x27)
C1 = (0xB9, 0x1C, 0x1C)

MARK_PATHS = [
    "M0 0H27V8L59 56H40L17 27H0V0Z",
    "M33 0H60V8L92 56H73L50 27H33V0Z",
    "M66 0H93V8L117 43H124V56H105V48L83 27H66V0Z",
]


def _inside_poly(poly, x, y):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y):
            xint = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < xint:
                inside = not inside
        j = i
    return inside


def _inside_mark(x, y):
    for poly, (x0, y0, x1, y1) in zip(MARK, MARK_BBOX):
        if x0 <= x <= x1 and y0 <= y <= y1 and _inside_poly(poly, x, y):
            return True
    return False


def _grad_color(x, y):
    t = (x * GRAD_D[0] + y * GRAD_D[1]) / GRAD_LEN2
    t = 0.0 if t < 0.0 else (1.0 if t > 1.0 else t)
    return tuple(a + (b - a) * t for a, b in zip(C0, C1))


def render(size, supersample, bg=None):
    """Rasterize the mark into RGBA bytes (size x size)."""
    scale = size / SIDE
    out = bytearray(size * size * 4)
    total = supersample * supersample
    for row in range(size):
        for col in range(size):
            hits = 0
            for sy in range(supersample):
                y_u = (row + (sy + 0.5) / supersample) / scale - PAD_Y
                for sx in range(supersample):
                    x_u = (col + (sx + 0.5) / supersample) / scale - PAD_X
                    if _inside_mark(x_u, y_u):
                        hits += 1
            a = hits / total
            o = (row * size + col) * 4
            if a > 0:
                r, g, b = _grad_color((col + 0.5) / scale - PAD_X,
                                      (row + 0.5) / scale - PAD_Y)
                if bg is not None:
                    out[o] = round(r * a + bg[0] * (1 - a))
                    out[o + 1] = round(g * a + bg[1] * (1 - a))
                    out[o + 2] = round(b * a + bg[2] * (1 - a))
                    out[o + 3] = 255
                else:
                    out[o], out[o + 1], out[o + 2] = round(r), round(g), round(b)
                    out[o + 3] = round(a * 255)
            elif bg is not None:
                out[o], out[o + 1], out[o + 2] = bg
                out[o + 3] = 255
    return bytes(out)


# --- containers --------------------------------------------------------------
def _chunk(tag, data):
    return (struct.pack(">I", len(data)) + tag + data +
            struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def _png(size, rgba):
    stride = size * 4
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        raw += rgba[y * stride:(y + 1) * stride]
    return (b"\x89PNG\r\n\x1a\n" +
            _chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) +
            _chunk(b"IDAT", zlib.compress(raw, 9)) +
            _chunk(b"IEND", b""))


def write_ico(path, entries):
    """entries: list of (pixel_size, png_bytes)."""
    blob = struct.pack("<HHH", 0, 1, len(entries))
    offset = 6 + 16 * len(entries)
    for size, data in entries:
        dim = 0 if size >= 256 else size
        blob += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
    for _, data in entries:
        blob += data
    with open(path, "wb") as fh:
        fh.write(blob)


def write_svg(path):
    paths = "\n  ".join(
        f'<path d="{d}" fill="url(#merqato-red)"/>' for d in MARK_PATHS)
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-{PAD_X:.0f} -{PAD_Y:.0f} '
        f'{SIDE:.0f} {SIDE:.0f}" width="{SIDE:.0f}" height="{SIDE:.0f}" role="img" '
        f'aria-label="merQato.digital">\n'
        '  <defs>\n'
        '    <linearGradient id="merqato-red" x1="0" y1="0" x2="110" y2="56" gradientUnits="userSpaceOnUse">\n'
        '      <stop stop-color="#D31027"/>\n'
        '      <stop offset="1" stop-color="#B91C1C"/>\n'
        '    </linearGradient>\n'
        '  </defs>\n'
        f'  {paths}\n'
        '</svg>\n'
    )
    with open(path, "w") as fh:
        fh.write(svg)


def main():
    public = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
    ico_sizes = {16: 16, 32: 8, 48: 6, 256: 4}
    entries = []
    for size, ss in ico_sizes.items():
        entries.append((size, _png(size, render(size, ss))))
        print(f"  rendered {size}x{size}")
    write_ico(os.path.join(public, "favicon.ico"), entries)
    write_svg(os.path.join(public, "favicon.svg"))
    with open(os.path.join(public, "apple-touch-icon.png"), "wb") as fh:
        fh.write(_png(180, render(180, 4, bg=(255, 255, 255))))
    print("wrote public/favicon.ico, public/favicon.svg, public/apple-touch-icon.png")


if __name__ == "__main__":
    main()
