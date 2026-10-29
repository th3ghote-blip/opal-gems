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
- [ ] **Andrew picks a model (1-4).** Then: create a reference Element from that
      portrait (`manage_reference_elements` action=create), after which
      `<<<element_id>>>` in any prompt reproduces the same woman. Scene stills
      cost 0.25 and clips 7.5, so wardrobe and location stop being limited by
      the shoot. This is what makes "restaurant with a view" and "opera box"
      deliverable.
- [ ] **Unverified: whether a real piece survives a restage.** The whole approach
      rests on `gpt_image_2_5` holding the actual jewellery when the photo is
      passed as `image_references`. Planned 1-credit / 4-image test, not yet run.
      Do not scale up before it passes.
- [ ] Synthetic models in a client's advertising: worth one line to the client,
      since some platforms require synthetic-media disclosure on ads. Not a
      blocker, their call.
- [ ] Decide on native clip audio: Kling `sound:"on"` costs 10 credits vs 7.5
      and yields ambient foley, not music (tested: mean -33.8 dB, max -11.3 dB).
      Currently OFF in the task.
