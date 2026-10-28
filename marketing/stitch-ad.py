"""Stitch scene clips + end card into one vertical social ad.

Each clip is trimmed, normalised to 1080x1920 / 30fps, and cross-faded into the
next. The end card is a still, held for --card-seconds.

    python stitch-ad.py --clips out/s1.mp4 out/s2.mp4 out/s3.mp4 \
        --card out/endcard.png --out out/opal-ad.mp4
"""
import argparse
import subprocess
import sys
from pathlib import Path

W, H, FPS = 1080, 1920, 30


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        sys.exit(f"ffmpeg failed ({proc.returncode}):\n{tail}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", nargs="+", required=True)
    ap.add_argument("--card", required=True, help="end card still")
    ap.add_argument("--out", default="out/opal-ad.mp4")
    ap.add_argument("--clip-seconds", type=float, default=4.0)
    ap.add_argument("--card-seconds", type=float, default=3.0)
    ap.add_argument("--xfade", type=float, default=0.3)
    args = ap.parse_args()

    here = Path(__file__).resolve().parent

    def rel(p: str) -> Path:
        q = Path(p)
        return q if q.is_absolute() else here / q

    clips = [rel(c) for c in args.clips]
    card = rel(args.card)
    out = rel(args.out)
    for p in [*clips, card]:
        if not p.exists():
            sys.exit(f"missing input: {p}")

    # Inputs: every clip trimmed to clip-seconds, then the card as a looped still.
    cmd = ["ffmpeg", "-y"]
    for c in clips:
        cmd += ["-t", str(args.clip_seconds), "-i", str(c)]
    cmd += ["-loop", "1", "-t", str(args.card_seconds), "-i", str(card)]

    n = len(clips) + 1
    scale = (f"scale={W}:{H}:force_original_aspect_ratio=increase,"
             f"crop={W}:{H},fps={FPS},format=yuv420p,setsar=1")
    parts = [f"[{i}:v]{scale}[v{i}]" for i in range(n)]

    # Chain cross-fades; each xfade offset sits clip-seconds minus one overlap
    # further along than the previous one.
    prev = "v0"
    offset = args.clip_seconds - args.xfade
    for i in range(1, n):
        label = f"x{i}" if i < n - 1 else "vout"
        parts.append(
            f"[{prev}][v{i}]xfade=transition=fade:"
            f"duration={args.xfade}:offset={offset:.3f}[{label}]"
        )
        prev = label
        dur = args.card_seconds if i == n - 1 else args.clip_seconds
        offset += dur - args.xfade

    cmd += [
        "-filter_complex", ";".join(parts),
        "-map", "[vout]",
        "-an",
        "-c:v", "libx264", "-preset", "slow", "-crf", "19",
        "-movflags", "+faststart",
        str(out),
    ]

    out.parent.mkdir(parents=True, exist_ok=True)
    run(cmd)

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(out)],
        capture_output=True, text=True,
    )
    secs = probe.stdout.strip() or "?"
    print(f"wrote {out} ({out.stat().st_size/1024/1024:.2f} MB, {secs}s, {W}x{H})")


if __name__ == "__main__":
    main()
