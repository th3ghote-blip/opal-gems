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
- [ ] **Source an actual music track.** Higgsfield cannot generate one on this
      account: re-checked 29 Oct, the audio catalogue is 8 models, all speech;
      `sonilo_music` / `mirelo_text_to_audio` are flagged "Game pipeline only".
      TikTok's Commercial Music Library (`tiktok_music_trending`) is publish-only
      — tracks cannot be exported into the emailed file. Synthesising a celeste
      bed was tried on 29 Oct and **rejected by Andrew as sounding cheap**; the
      script was deleted and the weekly task now forbids it. Needs a real
      licensed track dropped into `marketing/music/`.
      Blocked on Andrew: paid library (~$15/mo) vs free-for-commercial vs his own file.
- [ ] Decide on native clip audio: Kling `sound:"on"` costs 10 credits vs 7.5
      and yields ambient foley, not music (tested: mean -33.8 dB, max -11.3 dB).
      Currently OFF in the task.
