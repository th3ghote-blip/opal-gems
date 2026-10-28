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

## Weekly output

1. **One vertical video** — 9:16, 5s, silent, for Reels/TikTok/Stories.
   Model `kling3_0`, `mode: std`, `sound: off`, the chosen photo as `start_image`.
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
- No prices, no claims about carat or value, no invented boutique names.

## Cost

7.5 credits for the video, 0.25 per still — **8 credits a run**.
Check the balance with the `balance` tool; top-ups are Andrew's call, never automatic.

## Delivery

Email to **sales@theopalgems.com** via Resend, stills attached, video linked.
Subject: `Opal Gems — weekly content drop (<date>)`. Assets are drafts for the
client to approve, and the email says so.
