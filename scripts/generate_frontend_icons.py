"""Generate PWA icons for the NarraLearn frontend from the brand mark.

Run from the repository root with the backend virtualenv:
    backend/.venv/Scripts/python.exe scripts/generate_frontend_icons.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "frontend" / "public"
ICONS = PUBLIC / "icons"

DARK = (12, 17, 16, 255)
LIME = (216, 243, 106)
MINT = (126, 231, 196)
WARM = (255, 184, 107)
SUPERSAMPLE = 4


def _lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int, int]:
    return (
        round(a[0] + (b[0] - a[0]) * t),
        round(a[1] + (b[1] - a[1]) * t),
        round(a[2] + (b[2] - a[2]) * t),
        255,
    )


def _draw_mark(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Draw the N mark inside a square box using a gradient-filled mask."""
    x0, y0, x1, y1 = box
    size = x1 - x0
    scale = SUPERSAMPLE
    dim = size * scale

    # N path geometry in unit coordinates.
    left = 0.24 * size
    right = 0.76 * size
    top = 0.31 * size
    bottom = 0.70 * size
    radius = 0.085 * size

    points = [
        (left, bottom),
        (left, top + radius),
        (left + radius * 0.55, top),
        (left + radius * 1.3, top + radius * 0.35),
        (right - radius * 0.2, bottom - radius),
        (right, bottom - radius * 1.6),
        (right, top),
    ]

    # Build the stroke as a mask so the gradient stays perfectly smooth.
    mask = Image.new("L", (dim, dim), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.line(
        [(x * scale, y * scale) for x, y in points],
        fill=255,
        width=round(0.12 * size * scale),
        joint="curve",
    )

    gradient = Image.new("RGBA", (dim, dim), LIME + (255,))
    gradient_draw = ImageDraw.Draw(gradient)
    for y in range(dim):
        t = y / max(1, dim - 1)
        gradient_draw.line(
            [(0, y), (dim, y)],
            fill=_lerp(LIME, MINT, t),
        )

    canvas = Image.new("RGBA", (dim, dim), (0, 0, 0, 0))
    canvas.paste(gradient, (0, 0), mask)

    draw = ImageDraw.Draw(canvas)
    dot_r = round(0.05 * size * scale)
    cx, cy = round(0.78 * size * scale), round(0.235 * size * scale)
    draw.ellipse((cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r), fill=WARM + (255,))
    dot_r = round(0.032 * size * scale)
    cx, cy = round(0.245 * size * scale), round(0.775 * size * scale)
    draw.ellipse((cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r), fill=MINT + (255,))

    canvas = canvas.resize((size, size), Image.Resampling.LANCZOS)
    image.alpha_composite(canvas, (x0, y0))


def make_icon(size: int, *, maskable: bool = False) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), DARK)
    if not maskable:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255
        )
        canvas.putalpha(mask)

    inset = round(size * (0.13 if not maskable else 0.19))
    _draw_mark(canvas, (inset, inset, size - inset, size - inset))
    return canvas


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    sizes = {
        PUBLIC / "favicon.png": (64, False),
        PUBLIC / "apple-touch-icon.png": (180, False),
        ICONS / "icon-192.png": (192, False),
        ICONS / "icon-512.png": (512, False),
        ICONS / "icon-512-maskable.png": (512, True),
    }
    for path, (size, maskable) in sizes.items():
        make_icon(size, maskable=maskable).save(path, format="PNG", optimize=True)
        print(f"wrote {path.relative_to(ROOT)} ({size}x{size})")


if __name__ == "__main__":
    main()
