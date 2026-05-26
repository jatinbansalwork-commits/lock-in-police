#!/usr/bin/env python3
"""Generate Lock-In Police OG image and favicon."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

NAVY = (22, 28, 36)
NAVY_DEEP = (14, 18, 26)
RED = (255, 86, 48)
RED_DIM = (180, 40, 32)
WHITE = (255, 255, 255)
MUTED = (145, 158, 171)
BLUE = (91, 143, 212)


def _font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_camera_frame(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    draw.rounded_rectangle(box, radius=28, outline=RED, width=4)
    corner = 22
    for cx, cy, dx, dy in (
        (x0, y0, 1, 1),
        (x1, y0, -1, 1),
        (x0, y1, 1, -1),
        (x1, y1, -1, -1),
    ):
        draw.line([(cx, cy), (cx + dx * corner, cy)], fill=RED, width=5)
        draw.line([(cx, cy), (cx, cy + dy * corner)], fill=RED, width=5)


def draw_mascot(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float = 1.0) -> None:
    s = scale
    # Simple cartoon officer silhouette
    head_r = int(38 * s)
    draw.ellipse(
        (cx - head_r, cy - int(95 * s), cx + head_r, cy - int(95 * s) + head_r * 2),
        fill=(45, 58, 74),
        outline=RED,
        width=3,
    )
    # Cap
    draw.polygon(
        [
            (cx - int(50 * s), cy - int(118 * s)),
            (cx + int(50 * s), cy - int(118 * s)),
            (cx + int(42 * s), cy - int(88 * s)),
            (cx - int(42 * s), cy - int(88 * s)),
        ],
        fill=(28, 94, 164),
    )
    draw.rectangle(
        (cx - int(58 * s), cy - int(92 * s), cx + int(58 * s), cy - int(82 * s)),
        fill=RED,
    )
    # Body
    draw.rounded_rectangle(
        (
            cx - int(55 * s),
            cy - int(52 * s),
            cx + int(55 * s),
            cy + int(70 * s),
        ),
        radius=18,
        fill=(36, 48, 62),
        outline=(60, 76, 96),
        width=2,
    )
    # Badge
    draw.ellipse(
        (cx - int(14 * s), cy - int(10 * s), cx + int(14 * s), cy + int(18 * s)),
        fill=BLUE,
    )
    # Eyes
    for ex in (-16, 16):
        draw.ellipse(
            (
                cx + int(ex * s) - int(7 * s),
                cy - int(78 * s),
                cx + int(ex * s) + int(7 * s),
                cy - int(64 * s),
            ),
            fill=WHITE,
        )


def draw_siren_glow(img: Image.Image) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    w, h = img.size
    for i in range(3):
        alpha = 28 - i * 8
        od.ellipse((w * 0.55 - 120 - i * 40, 40 - i * 20, w * 0.55 + 200 + i * 60, 320 + i * 40), fill=(*RED, alpha))
    img.paste(overlay, (0, 0), overlay)


def create_og() -> None:
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), NAVY)
    draw = ImageDraw.Draw(img)

    # Subtle gradient bands
    for y in range(h):
        t = y / h
        r = int(NAVY[0] * (1 - t * 0.25) + NAVY_DEEP[0] * t * 0.25)
        g = int(NAVY[1] * (1 - t * 0.25) + NAVY_DEEP[1] * t * 0.25)
        b = int(NAVY[2] * (1 - t * 0.25) + NAVY_DEEP[2] * t * 0.25)
        draw.line([(0, y), (w, y)], fill=(r, g, b))

    draw_siren_glow(img)
    draw = ImageDraw.Draw(img)

    # Diagonal accent
    draw.polygon([(0, h), (0, h - 180), (w, 80), (w, h)], fill=(18, 22, 30))

    # Camera frame + mascot (right side)
    frame = (680, 95, 1120, 520)
    draw_camera_frame(draw, frame)
    inner = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    idraw = ImageDraw.Draw(inner)
    idraw.rectangle((frame[0] + 12, frame[1] + 12, frame[2] - 12, frame[3] - 12), fill=(30, 38, 50, 220))
    img.paste(inner, (0, 0), inner)
    draw = ImageDraw.Draw(img)
    draw_mascot(draw, 900, 310, 1.15)

    # REC dot
    draw.ellipse((710, 125, 726, 141), fill=RED)
    draw.text((734, 118), "LIVE", fill=RED, font=_font(14, True))

    title_font = _font(72, True)
    sub_font = _font(36, True)
    tag_font = _font(22, True)
    small_font = _font(20, True)

    draw.text((64, 120), "LOCK-IN POLICE", fill=WHITE, font=title_font)
    draw.text((64, 210), "Focus Is Not Negotiable", fill=MUTED, font=sub_font)

    draw.line([(64, 280), (420, 280)], fill=(*RED, 180), width=3)
    draw.text((64, 300), "AI Focus Enforcement", fill=RED, font=small_font)

    # Shield accent left
    shield = [(64, 380), (120, 360), (176, 380), (176, 450), (120, 490), (64, 450)]
    draw.polygon(shield, fill=(28, 94, 164), outline=RED)
    draw.ellipse((100, 405, 140, 445), fill=RED)

    out = PUBLIC / "og-lock-in-police.png"
    img.save(out, "PNG", optimize=True)
    print(f"Wrote {out}")


def create_favicon() -> None:
    sizes = [16, 32, 48]
    images: list[Image.Image] = []
    for size in sizes:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        m = size
        # Shield shape
        draw.polygon(
            [
                (m * 0.5, m * 0.08),
                (m * 0.88, m * 0.22),
                (m * 0.88, m * 0.55),
                (m * 0.5, m * 0.94),
                (m * 0.12, m * 0.55),
                (m * 0.12, m * 0.22),
            ],
            fill=(28, 94, 164),
            outline=RED,
        )
        # Siren light
        r = max(2, m // 8)
        draw.ellipse(
            (m * 0.5 - r, m * 0.38 - r, m * 0.5 + r, m * 0.38 + r),
            fill=RED,
        )
        if m >= 32:
            draw.ellipse(
                (m * 0.35 - 1, m * 0.55 - 1, m * 0.35 + 2, m * 0.55 + 2),
                fill=WHITE,
            )
            draw.ellipse(
                (m * 0.65 - 1, m * 0.55 - 1, m * 0.65 + 2, m * 0.55 + 2),
                fill=WHITE,
            )
        images.append(img)

    out = PUBLIC / "favicon.ico"
    images[0].save(
        out,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=images[1:],
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    PUBLIC.mkdir(parents=True, exist_ok=True)
    create_og()
    create_favicon()
