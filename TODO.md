# Opal Gems — TODO

## Scope locked
- 3 shops (Selina Clearwater, Opal Grande, Jupiter), all FL
- Roles: owner / manager (Jean) / staff (Donna, Elaine, Robin, Grace)
- Unique-piece-per-row inventory; SKU search (no QR v1)
- Owner sees cost + commissions; staff sees retail only
- 10% standard staff discount; > 10% needs owner approval
- Stock movements need owner approval via WhatsApp/SMS link
- Sale notifications to owner (low volume, high value)
- Online-only; mobile-first PWA-style UI; Supabase magic link auth
- No layaway, no repairs v1, no 2FA v1, no QR v1, no hotel commission UI v1

## Build phases

### Phase 0 — Foundation (in progress)
- [x] Scaffold Next.js 14 app
- [x] Install Supabase + Twilio + Zod
- [x] Write schema migration (tables, RLS, audit triggers, seed)
- [ ] Set up Supabase client helpers (browser + server)
- [ ] Create GitHub repo + initial push
- [ ] Create Supabase project + apply migrations
- [ ] Vercel deploy + env vars

### Phase 1 — Auth & shell
- [ ] /login (magic link)
- [ ] Auth callback + role-based redirect
- [ ] App shell: top nav + bottom nav (mobile)
- [ ] /unauthorized page

### Phase 2 — Pieces
- [ ] /pieces — list, filter by shop / type / status, SKU search
- [ ] /pieces/[id] — detail page, photos, attributes, RLS-checked cost reveal for owner
- [ ] /pieces/new — owner/manager create piece
- [ ] Photo upload to Supabase Storage

### Phase 3 — Sales
- [ ] /pieces/[id]/sell — sell flow
- [ ] Customer picker / quick-add
- [ ] Discount > 10% → discount request
- [ ] Record sale → fire owner notification

### Phase 4 — Movements
- [ ] /movements/new — staff requests transfer / pull / write-off
- [ ] Owner WhatsApp/SMS with approve/deny signed link
- [ ] /movements/approve/[token] — public approval landing
- [ ] On approve: status update, piece.current_shop_id updates if transfer

### Phase 5 — Customers / Wishlist / Reservations
- [ ] /customers — list + search
- [ ] /customers/[id] — purchase history + repeat-customer flag
- [ ] Wishlist add from piece-not-found
- [ ] Owner-visible wishlist dashboard
- [ ] Reservation create / release / convert-to-sale

### Phase 6 — Dashboard
- [ ] /dashboard — owner only
- [ ] Total revenue (filterable by date / shop / staff)
- [ ] Monthly trend table
- [ ] Sales by staff + auto 2% commission
- [ ] Avg ticket, sales count

### Phase 7 — Stock count
- [ ] /stock-counts/new — owner triggers per shop
- [ ] /stock-counts/[id] — staff ticks pieces
- [ ] Variance report

### Phase 8 — Settings
- [ ] /settings — owner only
- [ ] Edit enum_values (dropdowns)
- [ ] Edit settings (commission %, discount threshold)
- [ ] Shops CRUD
- [ ] Staff CRUD (invite + promote)

---

> **Note (2026-10-28):** Phases 0–8 above are stale. They describe the original
> 3-shop build; the app has been live on Vercel for months with 5 shops,
> analytics, stock counts, settings and an activity log all shipped. Treat that
> list as historical, not as open work.

## Marketing automation (2026-10-28)

- [x] 20 brand photos stored in `marketing/photos/` (`ls marketing/photos | wc -l` → 20)
- [x] `marketing/brief.md` — brand rules, photo catalogue, prompt rules
- [x] `marketing/make-endcard.py` — composites crisp end-card type over a
      generated backdrop (generated lettering garbles)
- [x] `marketing/stitch-ad.py` — trims, normalises and cross-fades clips + end
      card into 1080x1920 (verified: 14.1s, 6.40 MB output)
- [x] `marketing/send-assets.py` — emails assets via Resend
      (verified: message id 01a18363-68f8-7e0e-aaed-4e4ab5fbcf8b)
- [x] Scheduled task `opal-gems-weekly-ads`, Mondays 09:10 Spain time
- [ ] **Decide the email sender.** Sending from `opal@nifield.com` because
      `vicidialintelligence.com` (the app's `RESEND_FROM`) is NOT verified in
      Resend, and `nifield.com` is the only verified domain on the account.
      Verifying `theopalgems.com` needs DNS access the client would have to give.
- [ ] First live run goes to `sales@theopalgems.com` — confirm that is wanted
      before Monday, or change `--to` in the task's STEP 8.
- [x] Music mixing built into `stitch-ad.py` (`--music`, `--music-db`) and
      verified end to end: a music-only stitch produced a 14.1s file with an
      AAC stereo stream at -11.1 LUFS / -1.5 dBFS peak, audio present in all
      four sections. `--music-db` default changed -6 -> 0 (there is no dialogue
      for the bed to duck under). The mixer is DONE; it only needs a file.
- [x] Loudness matching in `stitch-ad.py` (`--music-start`, `--music-lufs`).
      Library tracks measured 15 dB apart (-8.3 to -19.1 LUFS over the same 14s
      window), so the excerpt is now measured and gained to a target rather than
      trusted, and gives up loudness before clipping. Verified on four tracks:
      three landed at -14.2/-14.2/-14.3 LUFS, the fourth at -16.0 because its
      -4.5 dBFS peaks would not take the full gain (correct, and reported).
- [x] Four instrumental candidates sourced under the Pixabay Content License
      (commercial use, no attribution; licence terms and limits recorded in
      `marketing/music/README.md` with each track's author and page)
- [x] **Track chosen and live: "Minimal Piano" by leberch** (Andrew, 29 Oct —
      "uplifting but posh"). Committed to `marketing/music/`, baked into STEP 6
      of the `opal-gems-weekly-ads` task as
      `--music music/leberch-minimal-piano.mp3 --music-start 10`.
      Verified by running the task's own STEP 6 command: `out/opal-ad.mp4` is
      14.1s, `ffprobe` lists codec_type=video AND codec_type=audio, measured
      -14.2 LUFS / -2.2 dBFS peak. The task now also fails the run rather than
      emailing a silent advert.
      A synthesised celeste bed was tried on 29 Oct and **rejected by Andrew as
      sounding cheap**; the generator was deleted and the task forbids it.
- [x] Corrected the run cost in `brief.md`: said "8 credits a run" (written for
      the old single-clip advert), actually **23.25** — 3 x 7.5 Kling clips +
      3 x 0.25 GPT Image. Confirmed against the credit ledger. Music is free.
- [x] **Five more adverts built (29 Oct)** from the 15 previously unused photos —
      15 fresh `kling3_0` clips, 112.5 credits (7.5 each, preflighted with
      `get_cost`). Verified: all five are 14.1s, carry video AND audio, and
      measure -14.1 to -14.9 LUFS. Each uses a different 14s phrase of the same
      track so they read as a series. Logged in `marketing/log.md`.
      2 of 15 were hijacked by a preset called "IN THE DARK" on first submission
      (both dark marble-bar shots) and succeeded on resubmission with
      `declined_preset_id` — the task's STEP 4 rule is doing real work.
- [ ] **All 20 photos are now used.** The next weekly run must reuse rather than
      pick an unused photo. STEP 2 of the `opal-gems-weekly-ads` task still says
      "not used in the last three runs" — still satisfiable, but worth a reread
      once the log has a few more rows.
- [ ] **Five staff phone videos reviewed (29 Oct), not usable as hero footage.**
      464x832 / 576x1024 (19-28% of 1080x1920's pixels), flat overhead LED, and
      **price tags visible in three of them** — which breaks the brief's no-prices
      rule outright. The showcase pan with the real OPAL GEMS sign is worth
      salvaging as an establishing or closing shot (stabilise, crop out the tags,
      regrade warm). Awaiting Andrew's call on whether to do that.
- [x] **All four client concepts built** (29 Oct) in the boutique -> try-on ->
      destination shape, each with its campaign line drawn on the end card:
      `concept1-looking`, `concept2-vacation` (5 beats, 19.5s),
      `concept3-highlight`, `concept4-plans`. Verified 14.3s / 19.5s, all with
      audio, -14.2 to -14.9 LUFS. Cost 0 credits — assembled from clips already
      generated, to test the shape first.
- [x] `make-endcard.py --line` draws a campaign line above the wordmark
      ("|" breaks a row). Rendered and visually checked: no collision with the
      wordmark, rule or boutique list.
- [x] **The real constraint found: the photo library is the ceiling.** 20 photos,
      one shoot, one model = **13 wardrobe x location looks, 3 of which are a ring
      on a finger** — so ~10 usable scenes. Every advert redraws the same ten.
      More credits cannot fix this. A 21-clip / 157.5-credit batch was submitted
      no further than the upload stage and **cancelled before any spend** once
      this was clear.
- [x] Three client phone photos found in Downloads (showcase with the real OPAL
      GEMS sign 1024x768, diamond hoop earrings and two tennis bracelets both
      768x1024). New products, absent from the 20. Too small for hero video,
      fine as `image_references`.
- [x] **Four candidate synthetic models generated** (29 Oct, 1 credit, 4 x 0.25
      `gpt_image_2_5`). Deliberately four different women, none a lookalike of
      the real shoot model, all framed bare-necked and bare-eared so real pieces
      composite cleanly. In `marketing/out/models/`.
- [x] **Model chosen: candidate 2, the honey-blonde** (Andrew, 29 Oct).
      Uploaded as media `cdf797d0-15bc-49ea-a943-ccf29f80c620` and reused as an
      `image_references` input on every scene since.
- [x] **Restage test PASSED** (29 Oct, 1 credit, 4 x 0.25). Passing her portrait
      and photo 2 together as two `image_references` to `gpt_image_2_5`
      reproduced the same woman AND kept the real diamond Y-necklace — correct
      line of round stones, tapering Y drop, correct length — in four locations
      that do not exist in the shoot: restaurant at dusk, opera box, yacht deck,
      boutique. Checked by eye, all four. Files in `marketing/out/scenes/`.
      Note: `gpt_image_2_5` is NOT on the reference-Element supported list, so no
      Element was needed — the portrait as an image reference was enough.
      Elements-capable models are pricier (`gpt_image_2` 0.5, `nano_banana_pro` 2).
- [x] **Opera-box geometry fixed** (29 Oct, 0.75 credits). The first attempt read
      as a woman standing behind a seat back. Cause: the prompt named a
      foreground rail without stating camera position, how much of the rail was
      in frame, or the background's height relative to her. Three re-takes with
      those stated all read correctly. Rule added to `brief.md`.
- [x] **Opera scene restyled** (29 Oct, 0.75 credits). Three further faults, all
      Andrew's catches: her back was to the auditorium so neither she nor the
      house read; no evening makeup; a plain scoop tank instead of eveningwear.
      Cause: the prompts named only the location, so wardrobe, hair and makeup
      inherited the reference portrait's bare face and loose waves. Fixed by
      turning her three-quarters to the house with her face back over her
      shoulder, and naming gown, hair and makeup per shot. Two `brief.md` rules
      added: style for the setting (hair named in every prompt, it defaults
      fastest), and keep a neckline and shoulder clear for a necklace.
- [ ] **Restyle the other three scenes.** `restaurant`, `yacht` and `boutique`
      still carry the default bare face and loose waves from the portrait, the
      same fault just fixed on the opera. ~0.75 credits to redo all three with
      per-setting wardrobe, hair and makeup.
- [x] **First fully bespoke advert built** (29 Oct, 30.5 credits): hook ->
      reveal -> hand to collarbone -> macro stone -> card, `out/opal-evening.mp4`.
      Verified 17.1s, 1080x1920, video + audio, -14 LUFS, styling continuous
      across all four beats. Campaign line "Some evenings ask for diamonds."
- [ ] **Resolve the Kling model/resolution question — affects every advert.**
      Measured: `kling3_0` `mode: std` returns **784x1176**, and `stitch-ad.py`
      upscales ~1.38x to reach 1080x1920. That is the source of any softness.
      Priced 29 Oct: std 7.5, **pro 8.75**, **kling4_0 1080p 16.25** per 5s.
      `kling4_0` additionally takes up to seven `image_references` (pieces carried
      into the motion, not just the start frame) and runs to 30s.
      Next step: one `pro` clip and one `kling4_0` clip from the same start frame,
      ~25 credits, then compare resolution and quality before committing.
      If `pro` returns native 1080p, that is +1.25/clip (+5/advert) for a 38%
      resolution gain — the cheapest possible win. Needs Andrew's go.
- [x] **Rings verified** (29 Oct, 1 credit). Both the emerald-cut and the round
      brilliant came back accurate — correct step cut, four claws, pavé band —
      and hand anatomy was clean in all four images, which was the real risk.
      What made it work, now in `brief.md`: state "the five fingers relaxed and
      slightly apart" and name which finger carries the ring.
      Also proved: **three reference images hold at once** (model + necklace +
      ring all preserved in one generation).
      Caveat: at half-figure a ring is only a few pixels and reads as "wearing a
      ring" — the product detail has to come from a macro beat. Necklaces carry
      at half-figure, rings do not.
- [x] **Within-advert consistency proved.** Three beats generated with the
      wardrobe, hair and makeup wording repeated verbatim came back continuous.
      `brief.md` rule corrected: vary styling ACROSS adverts, lock it WITHIN one.
      The earlier "style per setting" rule was half-wrong on its own and would
      have jump-cut a multi-scene advert.
- [ ] **UNEXPLAINED SPEND — needs Andrew.** Balance went 4,483.03 -> 3,786.53
      today (696.50). Only 114.5 of that is this session's
      (15 x 7.5 Kling + 8 x 0.25 GPT Image 2.5, all preflighted). The rest is
      ~580 in models this session never called: **Seedance 2.5 x10 = 560** and
      **Nano Banana Pro x10 = 20**, timestamped 14:01:53-14:10:03 UTC — the
      Seedance burst starting BEFORE this session's first Kling call at 14:05:41.
      Something else is using the Higgsfield account (another session, a task, or
      the web UI). One caveat: a lone Nano charge at 14:27:33 sits near a
      `get_cost` preflight of `nano_banana_pro`; `get_cost` is documented not to
      submit, and the timing is not a clean match, but 2 credits cannot be fully
      ruled out. Not the 580.
- [ ] Synthetic models in a client's advertising: worth one line to the client,
      since some platforms require synthetic-media disclosure on ads. Not a
      blocker, their call.
- [ ] Decide on native clip audio: Kling `sound:"on"` costs 10 credits vs 7.5
      and yields ambient foley, not music (tested: mean -33.8 dB, max -11.3 dB).
      Currently OFF in the task.
