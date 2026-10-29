# Music beds

Drop the licensed instrumental here and add it to the stitch command:

    python stitch-ad.py --clips ... --card out/endcard.png \
        --music music/<track>.mp3 --music-start 48

`--music-start` matters: a track's first 10-30s is usually a sparse intro that
sounds empty under a 14s cut. Measure before choosing one (see below).

The mixer measures the excerpt and gains it to `--music-lufs` (default -14, what
Instagram and TikTok normalise to) instead of trusting the file's own level, and
it gives up loudness rather than clip. It prints what it did, e.g.

    music: atlasaudio-elegant.mp3 from 48s - measured -8.3 LUFS,
    peak -0.2 dBFS - gain -5.7 dB -> -14.0 LUFS

To find a good start point, sweep the track in 14s windows:

    for ss in 0 10 20 30 40 50 60; do
      ffmpeg -hide_banner -ss $ss -t 14.1 -i track.mp3 \
        -af ebur128=framelog=quiet -f null - 2>&1 | grep -A1 'Integrated'
    done

## Licensing

This is a commercial advert for a client, so the licence has to cover that.

**Pixabay Content License** (verified 29 Oct 2026 against pixabay.com's own
licence summary and terms): free commercial use, **no attribution required**,
modification and adaptation allowed. The limits that matter here:

- no selling or distributing a track standalone, in substantially its original
  form - using it as the soundtrack of an edited advert is not that;
- no implying endorsement by a depicted person, brand or **vocalist** - so use
  instrumentals only, which also sidesteps uncleared vocal samples;
- third-party elements inside a track (samples, branded sounds) remain the
  user's responsibility to clear.

Not legal advice. For a paid campaign rather than organic social, re-read the
current terms.

## Candidates downloaded 29 Oct 2026

All four are instrumental, 256 kbps stereo, under the Pixabay Content License.
Attribution is not required but the author is recorded here so the licence is
traceable.

| | Track | Author | Pixabay page | Len | Window | Native LUFS |
|---|---|---|---|---|---|---|
| | Elegant | AtlasAudio | `/music/modern-classical-elegant-522420/` | 134s | 48s | -8.3 |
| **IN USE** | **Minimal Piano** | **leberch** | `/music/modern-classical-minimal-piano-590996/` | 84s | **10s** | -16.1 |
| | Soft Piano | leberch | `/music/solo-piano-soft-piano-590997/` | 102s | 60s | -19.1 |
| | Elegant Piano Music | Tunetank | `/music/classical-piano-elegant-piano-music-350061/` | 151s | 48s | -11.8 |

**Minimal Piano** is Andrew's pick (29 Oct 2026): "uplifting but posh". It is
baked into STEP 6 of the `opal-gems-weekly-ads` task as

    --music music/leberch-minimal-piano.mp3 --music-start 10

and lands at -14.2 LUFS in the finished advert. The other three were not
committed. A synthesised bed was tried on 29 Oct and rejected as sounding cheap
- do not go back to that.
