"""Composite the Opal Gems end card.

Generated lettering comes out garbled, so the backdrop is generated and the
type is drawn here with a real font — crisp at any size.

    python make-endcard.py --plate out/endplate.png --out out/endcard.png
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
GOLD = (223, 196, 140)
CREAM = (238, 231, 216)
MUTED = (176, 166, 148)

FONT_DIR = Path("C:/Windows/Fonts")
SERIF = FONT_DIR / "cambria.ttc"
SERIF_BOLD = FONT_DIR / "cambriab.ttf"


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def tracked_width(draw, text: str, f, tracking: int) -> int:
    """Width of `text` once per-character tracking is applied."""
    if not text:
        return 0
    w = sum(draw.textlength(ch, font=f) for ch in text)
    return int(w + tracking * (len(text) - 1))


def draw_tracked(draw, cx: int, y: int, text: str, f, fill, tracking: int) -> None:
    """Draw letter-spaced text centred on cx. Pillow has no tracking option."""
    x = cx - tracked_width(draw, text, f, tracking) / 2
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + tracking


def cover(img: Image.Image, w: int, h: int) -> Image.Image:
    """Scale and centre-crop to exactly w x h."""
    scale = max(w / img.width, h / img.height)
    img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))),
                     Image.LANCZOS)
    left = (img.width - w) // 2
    top = (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def build(plate_path: Path | None, out_path: Path) -> None:
    if plate_path and plate_path.exists():
        base = cover(Image.open(plate_path).convert("RGB"), W, H)
    else:
        base = Image.new("RGB", (W, H), (18, 16, 14))

    # Darken behind the type so the wordmark reads on any plate, strongest at
    # the centre band where the text sits.
    scrim = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(scrim)
    cy = H // 2
    for i in range(520):
        alpha = int(150 * (1 - abs(i - 260) / 260))
        sd.rectangle([0, cy - 260 + i, W, cy - 260 + i + 1], fill=max(0, alpha))
    scrim = scrim.filter(ImageFilter.GaussianBlur(40))
    base = Image.composite(Image.new("RGB", (W, H), (10, 9, 8)), base, scrim)

    d = ImageDraw.Draw(base)
    cx = W // 2

    f_mark = font(SERIF_BOLD, 108)
    f_sub = font(SERIF, 34)
    f_small = font(SERIF, 27)

    mark_y = cy - 150
    draw_tracked(d, cx, mark_y, "OPAL GEMS", f_mark, GOLD, 22)

    rule_y = mark_y + 168
    rule_w = 150
    d.line([(cx - rule_w, rule_y), (cx + rule_w, rule_y)], fill=GOLD, width=1)

    draw_tracked(d, cx, rule_y + 42, "FINE JEWELLERY", f_sub, CREAM, 11)

    boutiques = "CLEARWATER BEACH  ·  DELRAY BEACH  ·  JUPITER  ·  NAPLES"
    draw_tracked(d, cx, rule_y + 128, boutiques, f_small, MUTED, 3)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    base.save(out_path, "PNG")
    print(f"wrote {out_path} ({out_path.stat().st_size/1024:.0f} KB, {W}x{H})")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plate", default=None, help="generated backdrop image")
    ap.add_argument("--out", default="out/endcard.png")
    args = ap.parse_args()
    here = Path(__file__).resolve().parent
    plate = Path(args.plate) if args.plate else None
    if plate and not plate.is_absolute():
        plate = here / plate
    out = Path(args.out)
    if not out.is_absolute():
        out = here / out
    build(plate, out)


if __name__ == "__main__":
    main()
