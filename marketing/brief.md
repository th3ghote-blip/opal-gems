# Opal Gems — marketing asset brief

Read by the `opal-gems-weekly-ads` scheduled task. Edit this file to change what the
task produces; the task itself does not need rewriting.

## Brand

Fine-jewellery retailer, five boutiques inside Florida beach resorts:
Clearwater Beach · Opal Grande (Opal Grand Resort, Delray Beach) ·
Jupiter 1 and Jupiter 2 (Jupiter Beach Resort) · Olde Naples Hotel (200 Broad Ave S, Naples).

Sells necklaces, earrings, rings, bracelets, pendants, chokers and loose stones.
Specialises in diamonds and fine gemstones. **Does not do repairs, resizing or appraisals.**

Tone: quiet luxury. Resort-coastal, warm, unhurried. Never shouty, never discount-led.
No prices in any asset — pricing is a boutique conversation.

## Source photos

`marketing/photos/` — 20 photos from the brand's own shoot. Never generate a
different piece of jewellery; these are the real products.

**Prefer the no-face shots for video.** Faces drift between frames in image-to-video
and look wrong; the product-only shots are both safer and more on-brand.

| Shot | Contents | Face? |
|---|---|---|
| 1 | two gold diamond tennis bracelets on wrist, champagne, green bokeh | no |
| 4 | two hands, solitaire + eternity rings, tennis bracelet, wood slats | no |
| 5 | macro, round solitaire ring, warm bokeh | no |
| 6 | macro, emerald-cut solitaire | no |
| 7 | macro, round solitaire, split shank | no |
| 9 | hands on black marble bar, emerald-cut ring, champagne | no |
| 10 | green knit, rings, champagne flutes, warm bar light | no |
| 11 | green knit, stacked gold tennis bracelets | no |
| 12 | green knit, bracelets and ring, warm light | no |
| 13 | two hands toasting champagne flutes at a bar | no |
| 14 | black dress, aperol spritz, diamond bracelets, green hedge | no |
| 16 | teal dress, gold bracelets, rings, pendant | no |
| 17 | teal dress, two gold tennis bracelets, arm raised | no |
| 18 | martini glass, rings, dark hedge | no |
| 2, 8 | model in black dress, diamond Y-necklace | yes |
| 3 | model on balcony, ocean, champagne | yes |
| 15 | model with aperol spritz, hedge | yes |
| 19, 20 | model in teal dress, boutique interior | yes |

Three further client phone photos were added on 29 Oct. They are 768x1024 and
1024x768 — too small to be hero video, but good as `image_references`:

| Shot | Contents |
|---|---|
| 21 | diamond hoop earrings, elongated oval pave hoops, on a white card |
| 22 | two diamond tennis bracelets, one white gold one yellow, on a black pillow |
| 23 | the real showcase with the OPAL GEMS sign — the only asset carrying it |

**21 and 22 are products that appear nowhere in the 20-photo shoot.** 21, 22 and
23 all have price tags visible, so never reproduce them as-shot; use them only as
references for the piece.

## Weekly output

1. **One vertical video** — 9:16, 5s, silent, for Reels/TikTok/Stories.
   Model `kling3_0`, `mode: std`, `sound: off`, the chosen photo as `start_image`.

   **Known limitation:** `kling3_0` at `mode: std` returns **784x1176**, not
   1080x1920 — measured on every clip generated so far. `stitch-ad.py` then
   scales it up about 1.38x, which is where the softness comes from. Options,
   priced by `get_cost` on 29 Oct:

   | Model / mode | Credits per 5s | Native resolution |
   |---|---|---|
   | `kling3_0` std | 7.5 | 784x1176 (confirmed) |
   | `kling3_0` pro | 8.75 | unmeasured |
   | `kling3_0` 4k | unpriced | unmeasured |
   | `kling4_0` 1080p | 16.25 | 1080p per the catalogue, unmeasured |

   `kling4_0` also accepts up to seven `image_references`, so the model and the
   real pieces could be carried into the motion itself rather than only through a
   start frame, and runs to 30s. Untested. Resolve this with one `pro` clip and
   one `kling4_0` clip from the same start frame before committing a campaign to
   either.
2. **Two still adverts** — 4:5 for feed posts. Model `gpt_image_2_5`, the chosen
   photo as `image_references`.

## Prompt rules (these exist because breaking them wastes credits)

- The source photo **is** the plate. It fixes framing, camera height and crop —
  write to what it actually shows rather than fighting it in words.
- **One action per video.** A wrist turning, light moving across a stone. Stacking
  beats collapses the clip.
- **Never name something you don't want.** "No text", "no logo" summons them.
  Describe the positive instead.
- **No on-screen text in the prompt** — generated lettering comes out garbled.
  Leave clear empty space in the composition and add the wordmark in post.
- Keep the camera instruction to one clause. A move and a locked frame are two
  different generations.
- **For any architectural setting, state where the camera is, how much of a
  foreground object is in frame, and where the background sits relative to the
  subject.** Naming a feature without this produces impossible geometry: "stands
  at the velvet rail of a theatre box" with "behind her the gilded tiers" came
  back reading as a woman standing behind a seat back, because the rail was put
  in the foreground and the auditorium at the same height behind her. The fix
  that worked: "the camera is inside the box with her, at her eye level, facing
  her. A red velvet parapet crosses the very bottom edge of the frame at her hip
  height, with only its padded top edge visible. Far past her shoulder and well
  below her, the tiers recede." Or pick a setting with simpler geometry - a
  staircase landing needs none of this.
- No prices, no claims about carat or value, no invented boutique names.
- **Style the woman for the setting, not just the setting.** Wardrobe, hair and
  makeup all have to move with the location or every scene reads as the same
  photo with a new backdrop. An opera box wants an evening gown, an upswept or
  swept-aside style and a defined evening eye; a yacht deck wants linen, loose
  salt-dried hair and bare skin; a boutique wants daywear and a clean face.
  Leaving these unstated inherits the reference portrait's styling, which is a
  bare face and loose waves — fine for a daytime shot, wrong at the opera.
  Name the hair explicitly in every prompt; it is the fastest read of "different
  occasion" and it is the first thing to default.
- **Bare necklines earn their place.** Strapless or a low straight neckline shows
  a necklace against skin; a scoop tank crowds it and hair falling forward hides
  it. If the hero piece is a necklace, keep one shoulder line clear and the hair
  off that side.
- **Vary styling ACROSS adverts, lock it WITHIN one.** Three scenes cut together
  are one occasion: repeat the wardrobe, hair and makeup wording word for word in
  every beat of the same advert, or it jump-cuts. The only justified change
  inside one advert is a deliberate time jump - daytime boutique to evening out -
  and then it should look intentional in both beats, not drift.
- **Hands: state the count.** "the five fingers relaxed and slightly apart" and
  naming which finger carries the ring produced clean anatomy four times out of
  four. Left unstated, hands are where this model fails worst.
- **A ring needs its own macro beat.** In a half-figure shot a ring is a few
  pixels and reads only as "she is wearing a ring"; the detail has to come from a
  close-up of the hand. Necklaces carry at half-figure, rings do not.
- **Crop the face to make the jewellery the subject.** A half-figure portrait is
  a picture of a woman who happens to be wearing jewellery; the eyes take the
  frame. For a product-led shot, run the frame from the lower lip down, or go in
  on the ear, throat or hand alone. A jewellery advert should be mostly tight
  frames with one wide for aspiration, not the reverse.
- **Fill the frame with the CAMERA, never by enlarging the piece.** Saying a
  piece "fills the centre of the frame and is the largest thing in it" is read as
  an instruction to inflate the object: it produced a hoop earring roughly three
  times life size, hanging past the jaw with chunky stones. Say instead that the
  camera is very close, or shoot at macro distance, and add that the frame is
  filled "because the camera is close, not because the piece is large".
- **State the real dimensions of every piece, in millimetres, plus an anatomical
  check.** A reference photo of a piece on a card carries no scale the model can
  use. Give the length and the stone size, then anchor it to the body: the hoops
  are "about 30 mm long, roughly twenty stones each no more than 2.5 mm across,
  hanging from the earlobe with the lowest point only a little below the lobe and
  well above the jawline, the hoop narrower than the earlobe is wide". Measure
  off the client's own photo before writing the prompt - the hoops read as about
  two finger-widths on the card.
- **Earrings need the hair up.** An earring behind loose hair is invisible. Say
  the hair is lifted clear of the ear and neck, and turn the head a little to one
  side so one ear is square to the camera.
- **Name a garment that cannot be mistaken for nightwear.** "A soft cream silk
  camisole" came back reading as pyjamas - satin, thin straps, loose hair. For
  daywear say what it structurally is: "a crisp white cotton shirt with the collar
  open at the throat and the sleeves turned back at the cuffs", a tailored blazer,
  a fine knit. Collars, cuffs and tailoring are what read as dressed; drape and
  spaghetti straps read as bed.
- **The moderation filter false-positives on close chest framing.** A clasp shot
  framed "chin to mid-chest" with a second person's hands at the neck came back
  `nsfw` on an otherwise clean prompt. Raise the crop to the collarbone and have
  her hold her own hair clear, and it passes. Never re-run the identical prompt
  after a flag - change one variable so the result means something.
- Up to three reference images hold at once - the model, a necklace and a ring
  were all preserved in one generation.

## Cost

**23.25 credits a run**, confirmed against the credit ledger:

| Item | Model | Each | Qty | Credits |
|---|---|---|---|---|
| scene clips, 5s 9:16 std | `kling3_0` | 7.5 | 3 | 22.50 |
| end-card backdrop | `gpt_image_2_5` | 0.25 | 1 | 0.25 |
| still adverts | `gpt_image_2_5` | 0.25 | 2 | 0.50 |

Music costs nothing — the track is a licensed file in `music/` and ffmpeg mixes
it locally.

`sound: "on"` on a Kling clip costs 10 instead of 7.5 and yields ambient foley,
not music. It is OFF, and turning it on for all three clips would add 7.5 to the
run for no benefit.

Check the balance with the `balance` tool; top-ups are Andrew's call, never
automatic. The task aborts and emails Andrew if the balance is under 100.

## Delivery

Email to **sales@theopalgems.com** via Resend, stills attached, video linked.
Subject: `Opal Gems — weekly content drop (<date>)`. Assets are drafts for the
client to approve, and the email says so.
