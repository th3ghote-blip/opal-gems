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
