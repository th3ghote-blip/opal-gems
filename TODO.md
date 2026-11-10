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
- [x] **Weekly task DELETED 3 Nov** (Andrew: "delete the opal gems bot for now - we are making a schedule and we can send them to them via tiktok"). delete_scheduled_task confirmed; prompt kept at C:\Users\Usuario\.claude\scheduled-tasks\opal-gems-weekly-ads\SKILL.md. Open items below about that task (sender, first live email, photo reuse) are on hold until it comes back
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
- [x] **Cabinet and try-on beats added** (29 Oct, 0.75 credits). The first
      bespoke advert opened with her already at the opera, dropping the setup
      Andrew actually asked for — cabinet, try-on, then cut. Three stills made:
      at the lit case, an assistant fastening the clasp at her nape, and a mirror
      moment. Daywear with hair down, so the cut to evening reads as the story
      rather than a continuity error (the one justified styling change inside an
      advert).
- [x] **Earring scale corrected** (29 Oct, 0.5 credits). Andrew compared the
      generation against his own card photo: the hoop came out roughly three
      times life size, hanging past the jaw with chunky stones. Two causes, both
      mine — the prompt said the piece "fills the centre of the frame and is the
      largest thing in it", which the model read as an instruction to enlarge the
      object rather than move the camera; and no dimensions were given at all, so
      it invented them. Fixed by stating ~30 mm, ~20 stones at no more than
      2.5 mm, an anatomical check (lowest point just below the lobe, well above
      the jawline, narrower than the lobe is wide), and achieving the tight frame
      by camera distance. Three `brief.md` rules added.
      **Re-check every other piece's scale the same way before any of this ships**
      — the necklace and rings were never size-checked against the originals.
- [x] **Product-led frames** (29 Oct, 1 credit). Andrew: the jewellery "is not
      the main focus here, it's more about the woman". Correct — every frame was
      a half-figure portrait, where the eyes take the frame. Fixed by cropping
      the face out: frame from the lower lip down, or the ear, throat or hand
      alone. Four made, including the **hoop earrings** from the client's phone
      photo. Three `brief.md` rules added: crop the face to make the piece the
      subject; a jewellery advert is mostly tight frames with one wide, not the
      reverse; earrings need the hair lifted clear or they are invisible.
- [x] Three client phone photos added to `photos/` as 21 (hoop earrings),
      22 (two tennis bracelets) and 23 (showcase with the OPAL GEMS sign).
      21 and 22 are products absent from the 20-photo shoot. All three carry
      visible price tags — recorded in `brief.md` as reference-only, never to be
      reproduced as-shot.
- [ ] **Rebuild the advert with the full arc.** Beats now exist for
      cabinet -> try-on -> cut -> evening -> product macros, but the cut version
      still on disk (`out/opal-evening.mp4`) is the old four-beat one that starts
      at the opera. Needs ~2 new clips for the opening beats (~15 credits) plus a
      re-stitch, and should lean on the tight product frames rather than the
      portraits.
- [x] **First fully bespoke advert built** (29 Oct, 30.5 credits): hook ->
      reveal -> hand to collarbone -> macro stone -> card, `out/opal-evening.mp4`.
      Verified 17.1s, 1080x1920, video + audio, -14 LUFS, styling continuous
      across all four beats. Campaign line "Some evenings ask for diamonds."
- [x] **Kling resolution question SETTLED — always use `mode: "pro"`.**
      Measured on the clips themselves: std returns **784x1176**, pro returns
      **1076x1924**. For 1.25 extra credits a clip that removes the ~1.38x
      upscale `stitch-ad.py` was doing, a 38% linear gain. `kling4_0` at 16.25 is
      not worth 2.2x for the same resolution; its only remaining draw is
      `image_references` and 30s clips. Recorded in `brief.md`.
      **The weekly task still says `mode: std`** — STEP 4 of
      `opal-gems-weekly-ads` needs changing to `pro`, and the run cost goes
      22.5 -> 26.25 for three clips.
- [x] **Earrings added to advert A** (29 Oct, 27 credits: 3 stills + 3 pro clips).
      Andrew: "in the first one she only has a necklace for some reason". Cause:
      those three beats were generated before the earrings photo had been
      uploaded, so only the necklace reference was ever passed. At the opera in a
      strapless gown with her hair up, bare ears is plainly wrong.
      Rule for the future: **when a new piece reference is added, re-check every
      existing beat for what it is now missing** — the beats do not update
      themselves.
      Known remaining gap: the ring is absent from the staircase beat (the ring
      reference was not passed, and four references risked diluting). At that
      distance a ring reads as nothing anyway; it carries in its own macro.
- [x] **New theme, new model, real inventory pieces** (29 Oct, 1 credit).
      Four genuine in-stock SKUs instead of the shoot photos — necklace 429198,
      earrings 114291, bracelet 114362, ring 114657, all yellow gold so the set
      matches. Model 3 (cropped hair keeps the ears clear). Sunlit Mediterranean
      rooftop at golden hour. Full-figure shot plus three close-ups, per Andrew's
      note that the close-up advert needed a full shot too.
      **Five references held at once** — model + four pieces, all preserved. My
      earlier "four references risked diluting" was wrong, and that guess is what
      dropped the ring from advert A and cost a re-shoot.
- [x] Found the real source of pieces: `piece_photos` holds **89 studio shots**
      (35 earrings, 19 necklaces, 18 rings, 13 bracelets, 2 loose, 2 pendants)
      and the `piece-photos` bucket is publicly readable, so `media_import_url`
      fetches them with no upload step. Recorded in `brief.md` with the query.
      Note: theopalgems.com lists a **Watches** category the shoot never covered.
      Note: that bucket serving unauthenticated reads is intentional-looking for
      product imagery, but worth a glance if anything non-public ever lands there.
- [x] **Two new adverts built** (29 Oct, 70.25 credits: 1 still + 8 pro clips).
      `out/opal-rooftop.mp4` (model 3, golden-hour rooftop) and
      `out/opal-candlelit.mp4` (model 1, candlelit dining room) — no opera in
      either. Four real in-stock SKUs on her in every frame; three-quarter ->
      half -> throat/ear macro -> hand macro -> card. Both verified 17.1s,
      1080x1920, with audio at -14.2 / -14.6 LUFS.
      The rooftop opener is a three-quarter (knee-up) rather than head-to-foot:
      both full-figure attempts had floating earrings, and the tighter frame
      rendered one correctly attached earring per ear.
- [x] **Kling 4.0 A/B SETTLED — stay on `pro`.** Same start frame, same prompt:
      `kling3_0 pro` and `kling4_0 1080p` both returned **1076x1924, 24fps,
      5.04s**. 4.0 costs 16.25 against 8.75 — 86% more for identical pixels, and
      a smaller file (5.22 MB vs 8.76 MB), which points to heavier compression
      rather than more detail. Its only remaining draw is `image_references`
      carried into the motion and 30s clips. Recorded in `brief.md`.
- [x] **Earring artefact cause properly isolated — my first diagnosis was wrong.**
      I said it was a framing limit; a half-figure frame then detached one too.
      The real cause is the **form of the piece**: the ear climber (pear above a
      pave bar, shot on an invisible acrylic stand) detaches at every framing,
      while a **closed hoop (SKU 114169) attached correctly first time** — the
      model can see where the band passes through the lobe.
- [x] **Glowing earrings fixed** (29 Oct, 0.25 credits). Andrew spotted the stones
      reading as flat white emitters brighter than the candle flames. Cause: a
      candlelit scene has no light bright enough for diamonds to blaze, and my
      prompt asked for light to "rake across the stones", so the model made them
      the source. Fixed by stating they are lit only by the room, reflect the
      flames as pinpoint highlights, and are dimmer than the flames. Verified at
      3x: flames now brighter than the stones, metal reads as gold.
- [ ] **I shipped a frame I had called "clean".** `dine-half` has a detached left
      earring, visible only at magnification; I checked it at display size and
      said it was artefact-free. **Every frame gets a 3x check before it ships**
      — now a rule in `brief.md`. Re-check the delivered adverts
      (`opal-rooftop`, `opal-candlelit`, `opal-theone`, `opal-theset`) the same
      way before any of them goes to the client.
- [x] **TikTok: all 16 adverts scheduled** (30 Oct, one a day, Oct 30 - Nov 14).
      Account th3ghote@gmail.com ("AI App Genius"), driven through Chrome rather
      than the Higgsfield connector, at Andrew's direction. Every post carries
      the **AI-generated content** label plus a caption from
      `marketing/social-captions.md`. Verified in TikTok Studio's Posts list:
      Oct 30, Oct 31 and Nov 1-6, Nov 8-14 confirmed by listing or search; Nov 7
      ("Five adverts from one afternoon") confirmed by its submit and redirect,
      not re-checked in the listing.
      Measured: TikTok schedules ~30 days ahead (Nov 29 selectable), not 10; its
      time picker scrolls ~10 wheel-ticks per hour, so posts kept their default
      03:00-04:00 slots instead of an evening slot.
- [ ] **YouTube: 5 of 16 scheduled** (30 Oct). Channel **AI App Genius
      @HudzenTen** on nifieldandrew@gmail.com, in the SECOND Chrome
      (deviceId c3ee1559-0d72-4486-9da2-84d20f97c1b3) - the first Chrome was
      signed into a personal gaming channel, caught before anything was uploaded
      there. All as Shorts, public, 00:00, with "Yes, AI was used" and
      not-made-for-kids set: Oct 31 walkout, Nov 1 candlelit, Nov 2 rooftop,
      Nov 3 theset, Nov 4 theone.
      Remaining 11 (opal-evening, opal-ad, opal-ad-1..5, concept1-4) would run
      Nov 5-15, ~7 browser steps each. Needs Andrew's word on whether the weaker
      eleven are worth it.
      Gotcha: Escape closes YouTube's upload dialog (the video survives as a
      Draft with title and description intact); dismiss the hashtag suggestion
      list by clicking the title field instead.
- [x] **Read-only MCP stock server for Meta Muse** (1-2 Nov).
      `src/app/api/mcp/route.ts` - JSON-RPC 2.0 over HTTP POST, hand-rolled (no
      SDK dependency added). Tools: `search_stock`, `get_piece`, `list_shops`.
      All three are reads; there is no write tool.
      Withheld on purpose: cost, original_price, sale_price, internal_notes, and
      the Friends & Family virtual shop. Scope is `in_stock` with quantity > 0.
      Auth fails CLOSED - unset `MUSE_API_KEY` refuses every request (the older
      `/api/public/stock` fails open if its key is unset; left alone, not mine to
      change silently).
      Verified against the live DB on the dev server: 401 with no key and with a
      wrong key; initialize returns protocol 2025-06-18; tools/list returns the
      three; list_shops returns 5 boutiques / 102 in-stock pieces; search_stock
      type=Earrings returns 39; get_piece 5055947 found; bogus SKU returns
      found:false; unknown tool returns -32602; 38 of 50 pieces carry working
      public photo URLs; and grepping 50 returned pieces for
      price|cost|internal_note|friends matched nothing.
      `npm run build` passes. `MUSE_API_KEY` documented in `.env.local.example`.
- [x] **MCP server deployed and verified live** (2 Nov).
      `https://opal-gems.vercel.app/api/mcp`. `MUSE_API_KEY` set in Vercel
      **Production** (encrypted). Preview is deliberately unset - the endpoint
      fails closed there, which is the safe default; the installed Vercel CLI
      (v53) advertises a `--value/--yes` syntax it does not implement, so preview
      could not be set from the CLI. Add it in the dashboard if preview testing
      is ever wanted.
      Verified against production after deploy: 401 with no key; type=Ring 21,
      Earrings 39, Necklace 21, Bracelet 18, Pendant 1, each returning its own
      type; plural "rings" resolves to Ring; an unknown type returns the valid
      list with isError; and grepping 50 returned pieces for
      price|cost|internal_note|friends matched nothing.
      Deploy note: `vercel --prod` from the CLI fails with a team-routing error
      (project.json orgId vs the andrew-nifields-projects-0604ec39 scope). The
      GitHub push triggers the deploy correctly - use that, or
      `vercel redeploy <url> --scope andrew-nifields-projects-0604ec39`.
- [x] **Fixed: type search matched substrings** (2 Nov). `search_stock`
      type=Ring returned 60 rows led by an Earrings piece, because
      `ilike("type","%Ring%")` matches "Ea-RING-s". Now an exact
      case-insensitive match against the six real types, tolerant of
      singular/plural, with the six as an enum in the tool schema. Found by
      testing the live endpoint, not by reading the code.
- [x] **Audit log for the MCP endpoint — code built** (4 Nov).
      Vercel retains no runtime logs for this project: a probe POST at 18:34:24Z
      returned 200 and the logs for that window were empty, so there was no
      record of who read the client's stock. `/api/mcp` now writes one row per
      call to `mcp_access_log`: tool, arguments, result count, ok/error, IP and
      user agent. `_initialize` rows are the ones that answer "has anyone
      actually connected"; `_unauthorized` rows are the leak signal.
      Logging can never break a response - the insert is wrapped and swallowed.
      Verified locally with the table still absent: tools/list 200,
      search_stock returns 21 rings, initialize returns the protocol. Build passes.
- [x] **`mcp_access_log` migration run and logging verified on production**
      (4 Nov, Andrew ran the SQL). All four paths confirmed writing real rows:
      `search_stock` ok n=1 args {"type":"Pendant","limit":1};
      `list_shops` ok n=5; `_initialize` ok capturing clientInfo
      {"name":"verification-probe"}; `_unauthorized` ok=false "bad or missing
      key". Neither Supabase management token here reaches this project
      (`foypszldhyslqknpjilc`), so future migrations also need pasting by hand.
      To read it:
      `select at, tool, arguments, result_count, ip from mcp_access_log order by at desc limit 50;`
- [x] **Retail prices and price filters exposed** (4 Nov, on Andrew's
      instruction). `search_stock` and `get_piece` now return `price`
      (sale_price), `original_price` and `currency: USD`, plus `min_price` /
      `max_price` filters. Verified live: SKU 495223 returns
      price 2750 / original_price 2750 / USD; `max_price:1500` narrows 104
      pieces to 14, cheapest returned 600 and 1400.
      **`cost` deliberately still withheld** - it is the shop's buy price and
      the RLS migration revokes it from authenticated and anon at column level.
      Grep of 50 returned pieces for "cost"|internal_note|friends: no matches.
      Andrew asked for "prices"; retail was the defensible reading, and cost is
      a separate decision if he wants it.
- [x] **API key verified working on production** (4 Nov). No key 401, wrong key
      401, `x-api-key` header 200, `Authorization: Bearer` 200 with full
      payload. Every call lands in `mcp_access_log` - confirmed rows for
      search_stock with both the type filter (n=21) and the price filter
      (n=14, args logged).
- [x] **Client's 401 solved: wrong URL, not a wrong key** (10 Nov).
      Andrew gave the prefix of the key they were using - `Z7cL`, 43 chars -
      which MATCHES the key in `.env.local`, and production accepts that exact
      value (200 today on both header forms). So the credential was never the
      problem, and Claude's "wrong key value" diagnosis was wrong; it should
      have compared prefixes before saying so.
      Real cause, confirmed by testing the same correct key against four hosts:
        opal-gems-ev5bjt6x3-….vercel.app   401
        opal-gems-krj9wvb0w-….vercel.app   401
        opal-gems-oxgfk96fh-….vercel.app   401
        opal-gems.vercel.app               200
      `MUSE_API_KEY` is bound to **Production only** - set that way deliberately
      on 4 Nov, with the note that preview "fails closed, which is safe". It is
      safe, and it is also precisely what caused this: any deployment-specific
      or preview URL rejects a perfectly good key.
      **Only `https://opal-gems.vercel.app/api/mcp` works.** If a connector was
      created against any other host it must be deleted and re-added.
- [ ] **Consider setting `MUSE_API_KEY` on Preview too**, so a non-production
      URL gives a useful error rather than a 401 that looks like a bad
      credential. The installed Vercel CLI (v53) advertises a `--value/--yes`
      syntax it does not implement, so this needs doing in the dashboard.
      Note preview URLs may also sit behind Vercel deployment protection, so
      the env var alone may not make them work - the production alias is the
      supported endpoint either way.
- [x] **x-api-key header now trimmed** (10 Nov, `10f1527`). The bearer path
      already trimmed; x-api-key did not, so a key pasted with a trailing
      newline 401'd exactly like a wrong key. Robustness fix, not a confirmed
      diagnosis of the client's failure.
- [ ] **Client still has to connect it.** They add
      `https://opal-gems.vercel.app/api/mcp` as a custom connector in **their
      own** Muse account (Andrew's Meta ban is irrelevant - it is not his
      account) with the bearer key from `.env.local` / the Vercel dashboard.
      **Unresolved risk, untested:** the third-party guides say Muse custom
      connectors authenticate by OAuth over streamable HTTP. This ships a static
      bearer token - simpler and provably working against curl, but Muse may
      refuse it. If it does, an OAuth layer is a separate build. Meta's Help
      Center is the authority; the write-ups disagree with each other.
      Nobody has yet tried this inside a real Muse account.
      **This is now observable**: when Muse connects, an `_initialize` row
      appears in `mcp_access_log` carrying Muse's own clientInfo and a
      timestamp. An empty table means nobody has connected - which, before the
      log existed, could not be distinguished from "we cannot see".
- [x] **`opal-candlelit.mp4` rebuilt** (29 Oct, 9 credits: 1 still + 1 pro clip).
      Andrew asked repeatedly for THIS video fixed; I built a different one
      (`opal-walkout`) and called it a supersession instead of doing what was
      asked. Now actually rebuilt: the full-figure beat re-stilled with hoops and
      reflect-not-emit lighting, and the half and throat beats swapped for the
      verified hoop versions. Verified 17.1s, 1080x1920, -14.6 LUFS, ears checked
      at 3x. Copied to Downloads.
      Lesson: a replacement is not a fix. Fix the artefact in the thing that was
      asked about.
- [x] Markdown file links open the app's file pane, they are NOT downloads. For
      anything Andrew wants to keep, deliver it as a file card and copy it to
      Downloads.
- [x] **Transition advert built with every correction** (29 Oct, 35.75 credits:
      3 stills + 4 pro clips). `out/opal-walkout.mp4` — cabinet, clasps it on,
      cut to the candlelit dinner, throat macro, hand macro, card. Verified
      18.5s, 1080x1920, audio at -14.2 LUFS.
      Applied: hoop earrings (SKU 114169) instead of the climber, reflect-not-emit
      wording, stated bent-elbow poses, stated piece dimensions, daywear named
      structurally, hair named per beat, all four pieces present, and a 3x
      magnification check on the stills before any clip was paid for. Same start frame as
      the `pro` earring macro plus the earrings photo as an `image_reference`, to
      test the one thing `pro` cannot do — carrying a real piece through the
      motion rather than only in the start frame. Compare resolution and piece
      stability against `out/pb2.mp4` before deciding anything.
- [x] **Two adverts built with everything applied** (29 Oct, 61.25 credits,
      7 clips at pro). `out/opal-theone.mp4` — cabinet, clasp, cut to the opera
      staircase, necklace macro, 17.1s. `out/opal-theset.mp4` — throat and
      earring, earring macro, the lit case, 14.3s. Both verified 1080x1920 with
      audio at -14.2 / -14.4 LUFS, daywear locked across the opening beats and
      the cut to evening as the deliberate jump, correct earring scale, and the
      product frames cropped so the pieces dominate.
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
