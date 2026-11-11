"""Banana Loop 로고 만들기 — Framing · Griding 과 같은 ALIENMEOW 아이콘 계열

  logo/banana_loop_icon_{1024,512,256,128,64,32}.png   아이콘만 (투명 바탕)
  logo/banana_loop_logo_dark.png · _light.png         아이콘 + 픽셀 글자 (어두운 · 밝은 바탕용, 투명)
  logo/banana_loop_text_dark.png · _light.png         픽셀 글자만 — Loop 의 oo 는 빨강

재료: logo/source/alien_head.png (ALIENMEOW 캐릭터 머리 · 초록 바탕, Framing · Griding 과 같은 그림)
  python tools/make_logo.py                    # 확정 스타일로 logo/ 를 다시 만든다
  python tools/make_logo.py --drafts <폴더>    # 세 스타일 시안을 <폴더>에 나란히 뽑는다
이 스크립트는 저장소 관리용이다. 스킬 사용(SKILL.md)과는 관계없다.
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
GRID = 64                  # 고리는 64×64 칸 픽셀로 그린다 — 머리 그림과 같은 도트 느낌
STYLE = "banana"           # 확정 스타일

# 픽셀 글자 — '#' = 글자색 · 'o' = 빨강 · '.' = 빈칸. 높이 9칸 (7칸 + 아래로 내려가는 2칸)
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
    """GLYPHS 로 쓴 각진 글자 — 한 칸 = cell px 정사각형"""

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
    """머리를 둘러싼 고리를 GRID 칸 단위로 칠한다. 각도는 12시 = 0°, 시계 방향으로 증가."""

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
                u = (a - self.start) / (self.end - self.start)     # 0 = 시작, 1 = 끝
                color = color_at(math.hypot(x, y) - self.r, u)
                if color:
                    self.cells[(gx, gy)] = color

    def plain(self, width: float = 3.2, color=RED) -> "Ring":
        self._paint(lambda d, u: color if abs(d) <= width / 2 else None)
        return self

    def banana(self, width: float = 4.6) -> "Ring":
        """가운데가 두껍고 끝으로 갈수록 가는 바나나 — 안쪽 가장자리는 그늘, 시작 꼭지는 갈색.
        끝쪽은 화살촉이 붙으므로 너무 가늘어지지 않게 둔다."""
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
        """고리 끝(end 각도)에서 시계 방향으로 향하는 화살촉"""
        t = math.radians(self.end)
        cx, cy = GRID / 2 + self.r * math.sin(t), GRID / 2 - self.r * math.cos(t)
        fx, fy = math.cos(t), math.sin(t)          # 진행 방향 (시계 방향 접선)
        nx, ny = math.sin(t), -math.cos(t)         # 바깥 방향
        cx, cy = cx - fx * 0.5, cy - fy * 0.5      # 고리 끝과 겹쳐 틈이 없게
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
        "loop":   ("빨강 루프 화살표", lambda: Ring().plain().arrow(5.5)),
        "banana": ("바나나가 고리가 되고 끝에 빨강 화살촉", lambda: Ring(end=330).banana().arrow(5.5)),
        "orbit":  ("아래쪽 반원 바나나 + 빨강 화살촉", lambda: Ring(start=120, end=320).banana(5.0).arrow(5.5)),
    }

    def __init__(self, style: str = STYLE, head_path: Path = HEAD, head_scale: float = 0.44):
        if style not in self.STYLES:
            raise SystemExit(f"스타일은 {', '.join(self.STYLES)} 중 하나입니다")
        self.style, self.head_scale = style, head_scale
        self.head = self._cut_out(Image.open(head_path).convert("RGB"))

    @staticmethod
    def _cut_out(img: Image.Image) -> Image.Image:
        """바탕 초록을 투명으로 · 목 아래(폭이 머리의 35% 아래로 좁아지는 곳)를 자른다 — Framing 과 같은 방식"""
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
        """아이콘 + 픽셀 글자 가로형 (투명 바탕) — Framing 과 같은 비율"""
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
    """스타일별 아이콘·워드마크 + 한 장에 모은 비교판"""
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
    ap = argparse.ArgumentParser(description="Banana Loop 로고")
    ap.add_argument("--style", default=STYLE, choices=list(Logo.STYLES))
    ap.add_argument("--drafts", type=Path, help="세 스타일 시안을 이 폴더에 뽑는다 (logo/ 는 건드리지 않음)")
    args = ap.parse_args()
    for p in (drafts(args.drafts) if args.drafts else Logo(args.style).save_all()):
        print(p)
