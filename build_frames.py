#!/usr/bin/env python3
"""GIF → PNG frames → potrace (black silhouettes + optional white embers) → data/frames-data.js

Source: src/ref.gif (98 × 540×280). Black silhouettes on light gray ~#C4C4C4,
with bright white flame/ember flecks.

Primary FILL #000000 on BG #C4C4C4; secondary FILL #FFFFFF for bright embers.
Potrace unit=10 → Path2D translate(0,H) scale(0.1,-0.1).
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src" / "ref.gif"
WORK = ROOT / "work"
PNG = ROOT / "frames"
DATA = ROOT / "data"
PREV = ROOT / "previews"
SVG_DIR = ROOT / "svg-raw"
POTRACE = "/usr/bin/potrace"

BG = "#C4C4C4"
FILL_BLACK = "#000000"
FILL_WHITE = "#FFFFFF"
FRAME_W = 540
FRAME_H = 280
# mid between black and gray(196) — ink below this
CUTOFF_BLACK = 140
# bright flecks / embers
CUTOFF_WHITE = 232
TURD_BLACK = 2
TURD_WHITE = 1
OPTOL = 0.2
EXPECTED = 98
SPOT = {0, 24, 49, 73, 97}


def extract_composited_frames(path: Path) -> list[Image.Image]:
    im = Image.open(path)
    frames: list[Image.Image] = []
    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    prev_disposal = 1
    backup = None
    for frame in ImageSequence.Iterator(im):
        disposal = frame.info.get("disposal", 1) or 1
        rgba = frame.convert("RGBA")
        if prev_disposal == 2:
            canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
        elif prev_disposal == 3 and backup is not None:
            canvas = backup.copy()
        if disposal == 3:
            backup = canvas.copy()
        canvas = canvas.copy()
        canvas.alpha_composite(rgba)
        frames.append(canvas.convert("RGB").copy())
        prev_disposal = disposal
    return frames


def mask_layers(im: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Return (black_mask, white_mask) L images: 0=ink (traced), 255=paper.

    Black: dark silhouette / flames (lum < CUTOFF_BLACK).
    White: bright ember cores (lum >= CUTOFF_WHITE, low chroma).
    Mid gray paper (~196) stays as BG (not traced).
    """
    im = im.convert("RGB")
    w, h = im.size
    raw = im.tobytes()
    n = w * h
    black = bytearray(b"\xff" * n)
    white = bytearray(b"\xff" * n)

    for i in range(n):
        j = i * 3
        r, g, b = raw[j], raw[j + 1], raw[j + 2]
        lum = (r + g + b) // 3
        mx = r if r > g else g
        if b > mx:
            mx = b
        mn = r if r < g else g
        if b < mn:
            mn = b
        chroma = mx - mn

        if lum < CUTOFF_BLACK:
            black[i] = 0
            continue
        # bright white embers / sparks (not gray paper)
        if lum >= CUTOFF_WHITE and chroma <= 18:
            white[i] = 0

    return (
        Image.frombytes("L", (w, h), bytes(black)),
        Image.frombytes("L", (w, h), bytes(white)),
    )


def save_pbm_from_mask(mask: Image.Image, path: Path) -> None:
    mask.convert("1").save(path)


def extract_paths(svg_text: str) -> list[str]:
    return [
        m.group(1)
        for m in re.finditer(r'<path\s+[^>]*?d="([^"]+)"[^>]*?/?>', svg_text)
    ]


def potrace(pbm: Path, svg: Path, turdsize: int) -> list[str]:
    subprocess.check_call(
        [
            POTRACE,
            "-s",
            "-o",
            str(svg),
            "-t",
            str(turdsize),
            "-O",
            str(OPTOL),
            str(pbm),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return extract_paths(svg.read_text())


def group_markup(fh: int, fill: str, paths: list[str]) -> str:
    if not paths:
        return ""
    parts = "".join(f'<path d="{d}"/>' for d in paths)
    return (
        f'<g transform="translate(0,{fh}) scale(0.1,-0.1)" '
        f'fill="{fill}" stroke="none">{parts}</g>'
    )


def side_by_side(src: Image.Image, black: Image.Image, white: Image.Image, out: Path) -> None:
    w, h = src.size
    bg = tuple(int(BG[i : i + 2], 16) for i in (1, 3, 5))
    recon = Image.new("RGB", (w, h), bg)
    px = recon.load()
    mb = black.load()
    mw = white.load()
    for y in range(h):
        for x in range(w):
            if mb[x, y] < 128:
                px[x, y] = (0, 0, 0)
            elif mw[x, y] < 128:
                px[x, y] = (255, 255, 255)
    canvas = Image.new("RGB", (w * 2 + 8, h), (40, 40, 40))
    canvas.paste(src.convert("RGB"), (0, 0))
    canvas.paste(recon, (w + 8, 0))
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out)


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    PNG.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    PREV.mkdir(parents=True, exist_ok=True)
    SVG_DIR.mkdir(parents=True, exist_ok=True)

    frames = extract_composited_frames(SRC)
    assert len(frames) == EXPECTED, f"expected {EXPECTED} frames, got {len(frames)}"
    fw, fh = frames[0].size
    assert (fw, fh) == (FRAME_W, FRAME_H), f"size {fw}x{fh}"

    print(
        f"extracted {len(frames)} frames @ {fw}×{fh} "
        f"FILL={FILL_BLACK} BG={BG} white={FILL_WHITE} "
        f"cut_b={CUTOFF_BLACK} cut_w={CUTOFF_WHITE}",
        flush=True,
    )

    markups: list[str] = []
    counts: list[int] = []
    white_counts: list[int] = []

    for i, im in enumerate(frames):
        png_path = PNG / f"f_{i:03d}.png"
        im.save(png_path)

        black, white = mask_layers(im)

        if i in SPOT:
            im.save(WORK / f"src_{i:03d}.png")
            black.save(WORK / f"mask_black_{i:03d}.png")
            white.save(WORK / f"mask_white_{i:03d}.png")
            side_by_side(im, black, white, PREV / f"spot_{i:03d}.png")
            print(f"  spot {i} preview written", flush=True)

        pbm_b = WORK / f"b_{i:03d}.pbm"
        pbm_w = WORK / f"w_{i:03d}.pbm"
        save_pbm_from_mask(black, pbm_b)
        save_pbm_from_mask(white, pbm_w)

        pb = potrace(pbm_b, SVG_DIR / f"b_{i:03d}.svg", TURD_BLACK)
        pw = potrace(pbm_w, SVG_DIR / f"w_{i:03d}.svg", TURD_WHITE)

        markup = group_markup(fh, FILL_BLACK, pb) + group_markup(fh, FILL_WHITE, pw)
        markups.append(markup)
        counts.append(len(pb) + len(pw))
        white_counts.append(len(pw))
        if i % 10 == 0 or i in SPOT:
            print(
                f"  traced {i:03d}/{len(frames)-1} black={len(pb):4d} white={len(pw):4d} "
                f"bytes={len(markup):6d}",
                flush=True,
            )

    js_path = DATA / "frames-data.js"
    with open(js_path, "w") as f:
        f.write(
            "/* Auto-generated by potrace from src/ref.gif. "
            f"Black {FILL_BLACK} + white embers {FILL_WHITE} on BG {BG}; "
            f"lum < {CUTOFF_BLACK} / lum >= {CUTOFF_WHITE} */\n"
        )
        f.write("/* classic script - assigns window.* for http.server / file:// */\n")
        f.write(f"var FRAME_COUNT = {len(markups)};\n")
        f.write(f"var FRAME_W = {fw};\n")
        f.write(f"var FRAME_H = {fh};\n")
        f.write(f'var FILL = "{FILL_BLACK}";\n')
        f.write(f'var BG = "{BG}";\n')
        f.write(f'var FILL_WHITE = "{FILL_WHITE}";\n')
        f.write('var LABEL = "DEMON";\n')
        f.write(
            f"/** @type {{string[]}} SVG inner markup per frame "
            f"(viewBox 0 0 {fw} {fh}; layered <g fill>) */\n"
        )
        f.write("var FRAMES = [\n")
        for i, m in enumerate(markups):
            f.write("  " + json.dumps(m))
            f.write(",\n" if i < len(markups) - 1 else "\n")
        f.write("];\n")
        f.write("window.FRAMES = FRAMES;\n")
        f.write("window.FRAME_COUNT = FRAME_COUNT;\n")
        f.write("window.FRAME_W = FRAME_W;\n")
        f.write("window.FRAME_H = FRAME_H;\n")
        f.write("window.FILL = FILL;\n")
        f.write("window.BG = BG;\n")
        f.write("window.FILL_WHITE = FILL_WHITE;\n")

    empty = [i for i, c in enumerate(counts) if c == 0]
    print(
        "path counts min/avg/max",
        min(counts),
        round(sum(counts) / len(counts), 1),
        max(counts),
    )
    print(
        "white path counts min/avg/max",
        min(white_counts),
        round(sum(white_counts) / len(white_counts), 1),
        max(white_counts),
    )
    print("empty frames", empty)
    print("wrote", js_path, "size", js_path.stat().st_size)
    print("FRAMES length", len(markups))


if __name__ == "__main__":
    main()
