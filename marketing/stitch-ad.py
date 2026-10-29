"""Stitch scene clips + end card into one vertical social ad.

Each clip is trimmed, normalised to 1080x1920 / 30fps, and cross-faded into the
next. The end card is a still, held for --card-seconds.

    python stitch-ad.py --clips out/s1.mp4 out/s2.mp4 out/s3.mp4 \
        --card out/endcard.png --out out/opal-ad.mp4
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

W, H, FPS = 1080, 1920, 30


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        tail = "\n".join(proc.stderr.strip().splitlines()[-15:])
        sys.exit(f"ffmpeg failed ({proc.returncode}):\n{tail}")


def measure(path: Path, start: float, dur: float) -> tuple[float, float]:
    """Integrated loudness (LUFS) and true peak (dBFS) of one excerpt."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{start:.3f}",
         "-t", f"{dur:.3f}", "-i", str(path),
         "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
        capture_output=True, text=True,
    )

    def grab(label: str) -> float:
        m = re.search(rf"\n\s*{label}:\s*(-?[\d.]+)", proc.stderr)
        if not m:
            sys.exit(f"could not measure {label} of {path.name}:\n"
                     f"{proc.stderr[-800:]}")
        return float(m.group(1))

    return grab("I"), grab("Peak")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clips", nargs="+", required=True)
    ap.add_argument("--card", required=True, help="end card still")
    ap.add_argument("--out", default="out/opal-ad.mp4")
    ap.add_argument("--clip-seconds", type=float, default=4.0)
    ap.add_argument("--card-seconds", type=float, default=3.0)
    ap.add_argument("--xfade", type=float, default=0.3)
    ap.add_argument("--music", default=None,
                    help="audio bed (mp3/wav). Trimmed to length, faded in and out.")
    ap.add_argument("--music-start", type=float, default=0.0,
                    help="seconds into the track to start. A track's intro is "
                         "usually too sparse for a 14s cut")
    ap.add_argument("--music-lufs", type=float, default=-14.0,
                    help="integrated loudness to gain the excerpt to. -14 LUFS "
                         "is what Instagram and TikTok normalise to, so the "
                         "advert arrives at the level the platform wants")
    # An offset on top of the measured gain, not an absolute level. 0 because
    # the music is the only audio in the advert - there is no dialogue to duck
    # under.
    ap.add_argument("--music-db", type=float, default=0.0,
                    help="extra trim applied after loudness matching, in dB")
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

    # Total runtime: every segment end to end, minus one overlap per cross-fade.
    total = (args.clip_seconds * len(clips) + args.card_seconds
             - args.xfade * (n - 1))

    music = rel(args.music) if args.music else None
    if music and not music.exists():
        sys.exit(f"missing music: {music}")

    if music:
        # Library tracks arrive mastered anywhere from -8 to -24 LUFS, so the
        # excerpt is measured and gained to a fixed target rather than trusted.
        # Static gain, not loudnorm: one-pass loudnorm pumps audibly over a
        # window this short.
        lufs, peak = measure(music, args.music_start, total)
        gain = args.music_lufs - lufs + args.music_db
        headroom = -1.0 - (peak + gain)
        if headroom < 0:
            gain += headroom          # give up loudness before ever clipping
        print(f"music: {music.name} from {args.music_start:g}s - "
              f"measured {lufs:.1f} LUFS, peak {peak:.1f} dBFS - "
              f"gain {gain:+.1f} dB -> {lufs + gain:.1f} LUFS")

        cmd += ["-ss", f"{args.music_start:.3f}", "-i", str(music)]
        fade_out_at = max(0.0, total - 1.5)
        parts.append(
            f"[{n}:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS,"
            f"volume={gain:.2f}dB,"
            f"afade=t=in:st=0:d=0.8,"
            f"afade=t=out:st={fade_out_at:.3f}:d=1.5[aout]"
        )

    cmd += ["-filter_complex", ";".join(parts), "-map", "[vout]"]
    cmd += ["-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-shortest"] if music else ["-an"]
    cmd += [
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
