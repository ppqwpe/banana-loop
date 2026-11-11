"""Banana Loop logo — same ALIENMEOW icon family as Framing and Griding

  logo/banana_loop_icon_{1024,512,256,128,64,32}.png   icon only (transparent)
  logo/banana_loop_logo_dark.png · _light.png         icon + pixel wordmark (for dark / light backgrounds, transparent)
  logo/banana_loop_text_dark.png · _light.png         pixel wordmark only; the oo in Loop is red

Source: logo/source/alien_head.png (ALIENMEOW head on green, the same drawing as Framing and Griding)
  python tools/make_logo.py                    # rebuild logo/ in the chosen style
  python tools/make_logo.py --drafts <folder>  # render all three styles side by side into <folder>
Repo upkeep only; the skill (SKILL.md) never uses it.
"""
from __future__ import annotations

import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
HEAD = ROOT / "logo" / "source" / "alien_head.png"
SLUG = "banana_loop"
TILE, RED = (21, 24, 29, 255), (220, 40, 30, 255)
BANANA, BANANA_SHADE, BANANA_TIP = (246, 211, 63, 255), (201, 160, 32, 255), (84, 58, 30, 255)
S = 1024
GRID = 64                  # the ring is drawn on a 64×64 pixel grid to match the pixel-art head
STYLE = "banana"           # chosen style

# Pixel glyphs: '#' = text colour, 'o' = red, '.' = empty. 9 rows tall (7 + 2 for descenders)
GLYPHS = {
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####.", ".....", "....."],
    "a": [".....", ".....", ".###.", "....#", ".####", "#...#", ".####", ".....", "....."],
    "n": [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#", ".....", "....."],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####", ".....", "....."],
    "o": [".....", ".....", ".ooo.", "o...o", "o...o", "o...o", ".ooo.", ".....", "....."],
    "p": [".....", ".....", "####.", "#...#", "#...#", "#...#", "####.", "#....", "#...."],
    " ": ["..", "..", "..", "..", "..", "..", "..", "..", ".."],
}


class PixelText:
    """Blocky text from GLYPHS; one cell = a cell-px square"""

    def __init__(self, text: str = "Banana Loop", gap: int = 1):
        self.text, self.gap = text, gap

    @property
    def grid(self) -> list[str]:
        rows = [""] * 9
        for i, ch in enumerate(self.text):
            for r in range(9):
                rows[r] += GLYPHS[ch][r] + ("." * self.gap if i < len(self.text) - 1 else "")
        return rows

    def render(self, cell: int, color, accent=RED) -> Image.Image:
        rows = self.grid
        img = Image.new("RGBA", (len(rows[0]) * cell, len(rows) * cell), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for y, row in enumerate(rows):
            for x, c in enumerate(row):
                if c != ".":
                    d.rectangle((x * cell, y * cell, (x + 1) * cell - 1, (y + 1) * cell - 1), fill=accent if c == "o" else color)
        return img


class Ring:
    """Paints the ring around the head on the GRID. Angles: 12 o'clock = 0°, increasing clockwise."""

    def __init__(self, radius: float = 0.37, start: float = 50, end: float = 345):
        self.r, self.start, self.end = radius * GRID, start, end
        self.cells: dict[tuple[int, int], tuple] = {}

    @staticmethod
    def _angle(x: float, y: float) -> float:
        return math.degrees(math.atan2(x, -y)) % 360

    def _paint(self, color_at) -> None:
        c = GRID / 2
        for gy in range(GRID):
            for gx in range(GRID):
                x, y = gx + 0.5 - c, gy + 0.5 - c
                a = self._angle(x, y)
                if not self.start <= a <= self.end:
                    continue
                u = (a - self.start) / (self.end - self.start)     # 0 = start, 1 = end
                color = color_at(math.hypot(x, y) - self.r, u)
                if color:
                    self.cells[(gx, gy)] = color

    def plain(self, width: float = 3.2, color=RED) -> "Ring":
        self._paint(lambda d, u: color if abs(d) <= width / 2 else None)
        return self

    def banana(self, width: float = 4.6) -> "Ring":
        """A banana, thick in the middle and thinner toward the ends; shaded inner edge, brown stem at the start.
        The far end carries the arrowhead, so it does not taper all the way."""
        def color_at(d, u):
            half = width / 2 * (0.35 + 0.65 * math.sin(math.pi * min(u, 0.75)) ** 0.6)
            if abs(d) > half:
                return None
            if u < 0.035:
                return BANANA_TIP
            return BANANA_SHADE if d < -half * 0.35 else BANANA
        self._paint(color_at)
        return self

    def arrow(self, size: float = 4.2, color=RED) -> "Ring":
        """Arrowhead at the ring end (end angle), pointing clockwise"""
        t = math.radians(self.end)
        cx, cy = GRID / 2 + self.r * math.sin(t), GRID / 2 - self.r * math.cos(t)
        fx, fy = math.cos(t), math.sin(t)          # forward (clockwise tangent)
        nx, ny = math.sin(t), -math.cos(t)         # outward
        cx, cy = cx - fx * 0.5, cy - fy * 0.5      # overlap the ring end so there is no gap
        tip = (cx + fx * size * 1.1, cy + fy * size * 1.1)
        left = (cx + nx * size, cy + ny * size)
        right = (cx - nx * size, cy - ny * size)
        for gy in range(GRID):
            for gx in range(GRID):
                if self._inside((gx + 0.5, gy + 0.5), tip, left, right):
                    self.cells[(gx, gy)] = color
        return self

    @staticmethod
    def _inside(p, a, b, c) -> bool:
        def side(p1, p2, p3):
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
        d1, d2, d3 = side(p, a, b), side(p, b, c), side(p, c, a)
        return not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0))

    def render(self, size: int) -> Image.Image:
        small = Image.new("RGBA", (GRID, GRID), (0, 0, 0, 0))
        for (x, y), color in self.cells.items():
            small.putpixel((x, y), color)
        return small.resize((size, size), Image.NEAREST)


class Logo:
    STYLES = {
        "loop":   ("red loop arrow", lambda: Ring().plain().arrow(5.5)),
        "banana": ("banana bent into the ring, red arrowhead at the tip", lambda: Ring(end=330).banana().arrow(5.5)),
        "orbit":  ("lower half-ring banana + red arrowhead", lambda: Ring(start=120, end=320).banana(5.0).arrow(5.5)),
    }

    def __init__(self, style: str = STYLE, head_path: Path = HEAD, head_scale: float = 0.44):
        if style not in self.STYLES:
            raise SystemExit(f"style must be one of {', '.join(self.STYLES)}")
        self.style, self.head_scale = style, head_scale
        self.head = self._cut_out(Image.open(head_path).convert("RGB"))

    @staticmethod
    def _cut_out(img: Image.Image) -> Image.Image:
        """Green background to transparent; cut below the neck (where width drops under 35% of the head). Same as Framing."""
        a = np.asarray(img).astype(int)
        bg = np.median(a.reshape(-1, 3), 0)
        alpha = np.clip((np.abs(a - bg).sum(2) - 40) * 6, 0, 255).astype(np.uint8)
        im = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), "RGBA")
        im = im.crop(im.getbbox())
        w = (np.asarray(im.getchannel("A")) > 128).sum(1)
        cut = next((y for y in range(int(w.argmax()), len(w)) if w[y] < w.max() * 0.35), len(w))
        im = im.crop((0, 0, im.size[0], cut))
        return im.crop(im.getbbox())

    def icon(self, size: int = S) -> Image.Image:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(img).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=TILE)
        h = size * self.head_scale / max(self.head.size)
        head = self.head.resize((max(1, int(self.head.size[0] * h)), max(1, int(self.head.size[1] * h))), Image.NEAREST)
        img.alpha_composite(head, ((size - head.size[0]) // 2, (size - head.size[1]) // 2))
        img.alpha_composite(self.STYLES[self.style][1]().render(size))
        return img

    @staticmethod
    def wordmark(icon: Image.Image, text_color) -> Image.Image:
        """Horizontal icon + pixel wordmark (transparent), same proportions as Framing"""
        h = 512
        cell = h // 14
        text = PixelText().render(cell, text_color)
        gap = int(h * 0.14)
        out = Image.new("RGBA", (h + gap + text.size[0] + cell, h), (0, 0, 0, 0))
        out.alpha_composite(icon.resize((h, h), Image.LANCZOS), (0, 0))
        out.alpha_composite(text, (h + gap, (h - 7 * cell) // 2))
        return out

    def save_all(self, folder: Path = ROOT / "logo") -> list[Path]:
        icon, out = self.icon(), []
        for size in (1024, 512, 256, 128, 64, 32):
            p = folder / f"{SLUG}_icon_{size}.png"
            (icon if size == S else icon.resize((size, size), Image.LANCZOS)).save(p)
            out.append(p)
        for name, color in (("dark", (237, 237, 237, 255)), ("light", (29, 29, 31, 255))):
            for kind, img in (("logo", self.wordmark(icon, color)), ("text", PixelText().render(24, color))):
                p = folder / f"{SLUG}_{kind}_{name}.png"
                img.save(p)
                out.append(p)
        return out


def drafts(folder: Path) -> list[Path]:
    """Icon and wordmark per style, plus one comparison board"""
    folder.mkdir(parents=True, exist_ok=True)
    out, tiles = [], []
    for key in Logo.STYLES:
        logo = Logo(key)
        icon = logo.icon()
        for kind, img in (("icon", icon), ("logo", Logo.wordmark(icon, (237, 237, 237, 255)))):
            p = folder / f"{key}_{kind}.png"
            img.save(p)
            out.append(p)
        tiles.append(icon.resize((360, 360), Image.LANCZOS))
    board = Image.new("RGBA", (40 + 400 * len(tiles), 480), (236, 236, 236, 255))
    d = ImageDraw.Draw(board)
    for i, (key, tile) in enumerate(zip(Logo.STYLES, tiles)):
        board.alpha_composite(tile, (40 + 400 * i, 40))
        d.text((40 + 400 * i, 420), key, fill=(29, 29, 31, 255))
    p = folder / "banana_loop_logo_drafts.png"
    board.save(p)
    return out + [p]


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Banana Loop logo")
    ap.add_argument("--style", default=STYLE, choices=list(Logo.STYLES))
    ap.add_argument("--drafts", type=Path, help="render all three styles into this folder (logo/ is left alone)")
    args = ap.parse_args()
    for p in (drafts(args.drafts) if args.drafts else Logo(args.style).save_all()):
        print(p)
