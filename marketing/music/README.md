# Music beds

Drop licensed instrumental tracks here as .mp3 and the weekly task will mix the
chosen one under the ad.

    python stitch-ad.py --clips ... --card out/endcard.png \
        --music music/<track>.mp3 --music-db -6

Verified: the mixer trims to the video length, applies a 0.8s fade in and a
1.5s fade out, and applies --music-db exactly (measured source peak -18.5 dB ->
output -24.5 dB at --music-db -6).

**Licensing matters** — this is a commercial advert for a client. Use a track
cleared for commercial and social use (Epidemic Sound, Artlist, Musicbed), not
something lifted from YouTube. Keep the licence reference in this file.

| Track | Source | Licence ref |
|---|---|---|
| _(none yet)_ | | |
