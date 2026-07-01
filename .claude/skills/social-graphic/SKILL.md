---
name: social-graphic
description: Create a new branded Starling social graphic (Instagram/Shorts) from the HTML artboard templates and wire it into the content calendar. Use when asked to make a social post graphic, open-house card, quote card, reel cover, or add a post to the calendar.
---

# Create a Starling social graphic

Follow these steps in order. Brand rules live in the project `CLAUDE.md` and in
`social-templates/README.md` — read them before editing copy.

## 1. Pick a template and copy it

Browse `social-templates/square/` (1080×1080) and `social-templates/story/`
(1080×1920) and choose the one closest to what's being asked (event card, quote
card, reel cover, etc.). Copy it to a **new, descriptively named** file in the
same folder — do not edit the original.

```
# example
cp social-templates/square/06-tour-event.html social-templates/square/07-august-open-house.html
```

Use a short kebab-case basename that describes the content; the basename becomes
the output filename.

## 2. Edit the copy per brand rules

Open the new file and edit the text only (keep the layout/token classes).
Follow `CLAUDE.md` and `social-templates/README.md`:

- **English only. No emoji.**
- Montessori vocabulary: **children** (not kids), **Toddler Community**,
  **Primary Classroom**, **guides** (not teachers).
- **Lead with the child and the feeling.** A date, age, or seat count belongs in
  the eyebrow or subline — never as a bare-fact headline.
- Eyebrows **UPPERCASE with wide letter-spacing**.
- No hard-sell or anti-objection framing ("no rush, no pressure").
- Tuition / pricing language is used **verbatim** where specified — never
  paraphrase it.

## 3. Render

```
npm run render:social -- <basename>
```

(First time on a machine: `npx playwright install chromium`.)

## 4. Verify the outputs exist

Confirm the render produced both files:

- `public/social/<basename>.png` — 1080×1080 for a square template,
  1080×1920 for a story template.
- `public/social/thumbs/<basename>.jpg` — thumbnail.

If either is missing, re-check the basename you passed and the template folder.

## 5. Wire it into the calendar

Add a `SEED_POSTS` entry in `src/lib/social.ts`. The `images` paths point at
`/social/...` (served from `public/social/`). Shape:

```ts
{
  id: "august-open-house",              // unique, stable
  date: "2026-08-12",                   // "YYYY-MM-DD" or null for the backlog
  title: "August Open House card",
  format: "feed",                       // feed | carousel | story | reel | ad
  pillar: "Enrollment",                 // grouping label
  channel: "Instagram",
  images: [
    {
      full: "/social/august-open-house.png",
      thumb: "/social/thumbs/august-open-house.jpg",
      alt: "…describe the image…",
    },
  ],
  caption: "…",
  hashtags: "#StarlingMontessori …",
  cta: "…",
  bioLink: "/open-house",
  locked: false,
  status: "draft",                      // draft → approved → published
  createdAt: SEED_TS,
  updatedAt: SEED_TS,
},
```

(Existing seeds use the local `img()` helper for `images` — match the style of
neighboring entries.) **Backfill-on-read** means a new seed appears in the
calendar automatically without resetting the DB, and it won't overwrite posts
that were already edited.

## 6. Preview locally

```
ADMIN_PASSWORD=<anything> npm run dev
```

Open `/admin/calendar` (log in at `/admin/login`) and confirm the post and its
graphic show up.

## 7. Remind about going live

Going live is **not** automatic: commit and push to `main`, then someone clicks
**Republish** in Replit. **Posting to Instagram is manual.**
