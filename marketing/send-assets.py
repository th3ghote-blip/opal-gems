"""Email the week's Opal Gems marketing assets via Resend.

Usage:
    python send-assets.py --to sales@theopalgems.com --note "photo 1 - bracelets" \
        --attach out/reel.mp4 out/ad1.png out/ad2.png

Reads RESEND_API_KEY and RESEND_FROM from ../.env.local. Prints the Resend
message id on success, or the API error body and exit code 1 on failure.
"""
import argparse
import base64
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / ".env.local"


def load_env() -> dict:
    """Parse .env.local into a dict. Values may contain '=' and angle brackets."""
    if not ENV.exists():
        sys.exit(f"missing {ENV}")
    out = {}
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip().strip('"').strip("'")
    return out


def build_html(note: str, files: list[Path]) -> str:
    stills = [f.name for f in files if f.suffix.lower() in {".png", ".jpg", ".jpeg"}]
    videos = [f.name for f in files if f.suffix.lower() in {".mp4", ".mov"}]
    rows = []
    if videos:
        rows.append(f"<li><strong>{len(videos)} vertical video</strong> (9:16) "
                    "&mdash; Reels, TikTok, Stories</li>")
    if stills:
        rows.append(f"<li><strong>{len(stills)} still adverts</strong> (4:5) "
                    "&mdash; feed posts; clear space is left for a headline</li>")
    return (
        '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;'
        'max-width:560px;color:#171717;line-height:1.55">'
        '<h2 style="margin:0 0 10px;font-size:18px;color:#5C4000">'
        "This week&rsquo;s content drop</h2>"
        "<p style=\"margin:0 0 10px\">Attached are this week&rsquo;s draft assets, "
        f"made from the brand shoot &mdash; {note}.</p>"
        f'<ul style="margin:0 0 14px;padding-left:18px">{"".join(rows)}</ul>'
        '<p style="margin:0 0 14px">They are <strong>drafts for approval</strong>. '
        "Nothing is scheduled or posted anywhere; reply with any changes.</p>"
        '<hr style="border:0;border-top:1px solid #e5e5e5;margin:18px 0">'
        '<div style="color:#737373;font-size:12px">'
        "Generated from Opal Gems&rsquo; own photography. No pricing is shown in any asset."
        "</div></div>"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--to", required=True, help="recipient address")
    ap.add_argument("--attach", nargs="+", required=True, help="files to attach")
    ap.add_argument("--note", default="this week's selection",
                    help="short description of the source photo used")
    ap.add_argument("--subject", default=None)
    ap.add_argument("--dry-run", action="store_true",
                    help="print what would be sent, call nothing")
    args = ap.parse_args()

    env = load_env()
    api_key = env.get("RESEND_API_KEY")
    # MARKETING_FROM is separate from the app's RESEND_FROM so changing the
    # marketing sender never touches the owner alert emails. Resend rejects any
    # from-domain that is not verified in the account.
    sender = env.get("MARKETING_FROM") or env.get("RESEND_FROM")
    if not api_key or not sender:
        sys.exit("RESEND_API_KEY or MARKETING_FROM/RESEND_FROM missing from .env.local")

    files = []
    for raw in args.attach:
        p = Path(raw)
        if not p.is_absolute():
            p = (Path(__file__).resolve().parent / p)
        if not p.exists():
            sys.exit(f"attachment not found: {p}")
        files.append(p)

    total = sum(f.stat().st_size for f in files)
    # Resend caps a message at 40 MB; base64 inflates bytes by about a third.
    if total * 4 / 3 > 38 * 1024 * 1024:
        sys.exit(f"attachments too large for one email: {total/1024/1024:.1f} MB raw")

    subject = args.subject or f"Opal Gems - weekly content drop ({date.today():%d %b %Y})"
    payload = {
        "from": sender,
        "to": [args.to],
        "subject": subject,
        "html": build_html(args.note, files),
        "attachments": [
            {
                "filename": f.name,
                "content": base64.b64encode(f.read_bytes()).decode("ascii"),
                "content_type": mimetypes.guess_type(f.name)[0] or "application/octet-stream",
            }
            for f in files
        ],
    }

    print(f"from:    {sender}")
    print(f"to:      {args.to}")
    print(f"subject: {subject}")
    for f in files:
        print(f"attach:  {f.name} ({f.stat().st_size/1024/1024:.2f} MB)")

    if args.dry_run:
        print("\n[dry run] nothing sent")
        return

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            # Cloudflare in front of api.resend.com rejects urllib's default
            # User-Agent with a 403 (code 1010). Any ordinary UA passes.
            "User-Agent": "opal-gems-marketing/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        print(f"\nsent, message id: {body.get('id')}")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        print(f"\nFAILED {e.code}: {detail}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
