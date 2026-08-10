# Starling Montessori — Instagram Templates

Production-ready, dependency-free HTML/CSS artboards for Starling Montessori
School's Instagram posts and stories. Each file renders **one** artboard at the
exact Instagram canvas size (square 1080×1080, story 1080×1920). No React, no
build step, no external JavaScript — just open the file in a browser.

## Contents

```
social-templates/
  tokens.css                  Brand design tokens (colors, type, fonts via @import)
  index.html                  Gallery: all 11 artboards scaled to 25% with labels
  assets/
    bird-blue.png             Line-art bird, Cetacean Blue (use on light backgrounds)
    bird-cream.png            Line-art bird, Seashell (use on dark backgrounds)
    bird-purple.png           Line-art bird, Pearly Purple
    aux-shape-*.svg           Decorative arch / circle / half / quarter / triangle
    photos/                   Six real Starling photos (see mapping below)
  square/                     8 × 1080×1080 posts
  story/                      3 × 1080×1920 stories
```

### Square posts (1080×1080)
| File | Template | Photo |
|---|---|---|
| `square/01-enroll-primary.html` | EnrollSolid (Cetacean bg + aux shapes) | — |
| `square/02-enroll-photo.html` | EnrollPhoto (photo + gradient panel) | reading-group.webp |
| `square/03-quote-seashell.html` | QuoteSeashell (Seashell + dark bird) | — |
| `square/04-quote-purple.html` | QuotePurple (Pearly bg) | — |
| `square/05-tip-montessori.html` | TipMontessori (photo top + card) | spooning.webp |
| `square/06-tour-event.html` | TourEvent (Seashell + date block) | — |
| `square/07-photo-daily.html` | PhotoDaily (full-bleed + bottom bar) | sound-game.webp |
| `square/08-meet-founder.html` | MeetFounder (repurposed WelcomeStaff arch) | founder-portrait.webp |

### Stories (1080×1920)
| File | Template | Photo |
|---|---|---|
| `story/01-enroll-story.html` | EnrollStory (Cetacean) | — |
| `story/02-quote-story.html` | QuoteStory (photo top + quote) | garden-walk.webp |
| `story/03-tour-story.html` | TourStory (photo + dark gradient) | classroom-kitchen-view.webp |

## How to export to PNG

These artboards render at exact pixel sizes, so a 1:1 screenshot of the
`.artboard` element is a print-perfect IG asset.

1. Open the single-artboard file (e.g. `square/01-enroll-primary.html`) in
   Chrome. The `.artboard` div is exactly 1080×1080 (or 1080×1920) on a neutral
   `#ECE6DB` page.
2. Wait a beat for the Google Fonts (Nunito Sans + Cormorant Garamond) to load.
3. Capture the artboard at full resolution. Easiest reliable methods:
   - **Chrome DevTools:** open the Elements panel, right-click the
     `<div class="artboard">` node → **Capture node screenshot**. This exports
     exactly 1080×1080 / 1080×1920.
   - **Full-page screenshot** (DevTools command menu → "Capture full size
     screenshot") then crop to the artboard, if you prefer.
   - Or use a headless tool (Playwright/Puppeteer) screenshotting the
     `.artboard` selector for batch export.
4. Repeat per file. `index.html` is only a contact-sheet preview — export from
   the individual files, not the gallery iframes.

> Tip: set the browser zoom to 100% before capturing so device-pixel scaling
> doesn't change the output dimensions.

## PLACEHOLDER slots — confirm before publishing

Nothing below was invented as fact; these are flagged for you to confirm/replace.

1. ~~**Instagram handle**~~ — **CONFIRMED as `@starlingmontessori`** (2026-08-10).
   This is what every template already uses; no find/replace needed. Use it as-is
   on any new artboard.
2. **Open-house date & time** — placeholders, not a real event:
   - `06-tour-event.html` and `story/03-tour-story.html` use date-block markup
     wrapped in named slots: `data-slot="weekday"` (THU), `data-slot="day"`
     (12), `data-slot="month"` (Jun), and `data-slot="time"` (10:00 a.m.).
   - Replace `THU` / `12` / `Jun` / `10:00 a.m.` with the real open-house date
     once scheduled. The `data-slot` attributes make them easy to grep.
3. **Address line** — templates say `Capitol Hill, Washington, D.C.` (the
   original JSX had a specific street address `2014 4th St SE`). Confirm whether
   you want the neighborhood phrasing or a full street address.

## Font & asset caveats

- **Fonts are Google-Fonts substitutes**, per the brandbook note in `tokens.css`:
  - Greycliff CF (brand sans) → **Nunito Sans**
  - Jaguar (brand display serif) → **Cormorant Garamond**
  These @import lines live in `tokens.css`; linking it is enough. When the
  licensed fonts are available, swap the @imports and update `--font-sans` /
  `--font-display`. Final exported pixels will shift slightly with the real
  fonts, so re-export after swapping.
- **Bird marks are raster PNGs** extracted from the brandbook (bird-blue on
  light, bird-cream on dark, bird-purple spare). They look crisp at the sizes
  used here, but an **official vector (SVG) bird would scale crisper** for any
  larger application — request one if available.
- **Photos are real Starling photos** (`.webp`) — no photo is reused across
  templates, per Fabi's no-repeat rule.

## Brand rules enforced in these files

- English only; no Spanish anywhere.
- **No emoji** anywhere — the original TourEvent template had a 🕙 clock before
  the time; it has been removed (time line is plain `10:00 a.m.`).
- Eyebrows are UPPERCASE with `letter-spacing: 0.2em`.
- Vocabulary: "children" (never "kids"), "Toddler Community" / "Primary
  Classroom" / "guides" (never "Casa de Niños" / "teachers").
- Headlines are sentence case, period-ended where the design has them.

## Editing notes

- Every dimension, color, font-size, padding, radius, opacity, and offset is
  copied 1:1 from the source JSX prototype (`ig-square.jsx` / `ig-story.jsx` /
  `ig-helpers.jsx`). Helper components were inlined as plain HTML.
- The Wordmark sub-line ("Montessori School") is sized relative to the wordmark
  per the original helper: `font-size = wordSize × 0.24`, `margin-top =
  wordSize × 0.14`, `letter-spacing: 0.16em` — these are why you see fractional
  px values like `10.56px`.
- Brand colors: SEASHELL `#FFF7EB`, CETACEAN `#0C163D`, SKY `#66CEE7`,
  PEARLY `#A9729B`, PEARLY_LIGHT `#D2A8C7` (and the derived `#8B5C7E` deep
  pearly used on light-background eyebrows, `#4A557A` secondary text).
```
