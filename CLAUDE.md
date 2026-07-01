# Starling Montessori — project guide

## What this repo is

An Astro SSR site (Node adapter, hosted on Replit) for **Starling Montessori
School**, plus two internal tools that live in the same app:

- an **admin content calendar** for planning and approving social posts, and
- a **content studio** for producing branded Instagram / YouTube Shorts graphics
  from HTML artboard templates.

The repo root IS the Astro project (`package.json`, `astro.config.mjs`, `src/`
are all at the top level).

## Brand voice (client-facing copy is ALWAYS English)

All copy that a family or the public might read is written in **English**.

- Gentle, warm, unhurried. **Invite, don't hard-sell.**
- **No emoji on graphics.**
- Lead with the **child and the feeling**. Let facts (dates, ages, seats) support
  from the eyebrow or subline — never make a bare fact the headline.
- Never use combative or anti-objection framings (e.g. "no rush, no pressure").
- Tuition / pricing language is used **VERBATIM** wherever it's specified — never
  paraphrase it.
- Montessori vocabulary: say **"children"** (not "kids"), **"Toddler Community"**,
  **"Primary Classroom"**, **"guides"** (not "teachers").
- Eyebrows are **UPPERCASE with wide letter-spacing**.

## Brand facts

- **Starling Montessori School**, 201 4th St SE, Washington, DC 20003
  (Capitol Hill).
- Founder: **Fabienne** ("Fabi").
- **Toddler Community** — enrolling now, in a converted church hall on Capitol
  Hill.
- **Primary Classroom** — opens **August 2026**, ages ~3–6, **12 inaugural
  seats**, at Saint Mark Episcopal. Virtual tours run until build-out completes.
- Instagram: **@starlingmontessori**.

## Making a graphic

Templates are pure HTML/CSS artboards in `social-templates/` — square is
1080×1080, story is 1080×1920, styled by `social-templates/tokens.css`. No build
step.

1. Copy the closest existing template to a new, descriptively named file — e.g.
   copy `social-templates/square/06-tour-event.html` to
   `social-templates/square/07-my-new-card.html`.
2. Edit the copy following the brand rules above and in
   `social-templates/README.md`.
3. Render it:

   ```
   npm run render:social -- <basename>
   ```

   This runs Playwright + sharp and writes `public/social/<basename>.png` plus a
   thumbnail `public/social/thumbs/<basename>.jpg`. Cross-platform.

First time only, install the browser:

```
npx playwright install chromium
```

Content copy docs live in `docs/social/`.

## Content calendar

- Admin lives at **`/admin/calendar`** (log in at `/admin/login`).
- Run it locally with any password:

  ```
  ADMIN_PASSWORD=<anything> npm run dev
  ```

  No other secrets are needed locally — when `REPLIT_DB_URL` is unset the app
  automatically uses a file-backed dev DB.
- Posts are seeded in **`src/lib/social.ts`** (`SEED_POSTS`). `listPosts()`
  **backfills new seeds by id without overwriting** posts you've already edited,
  so adding a seed shows up without resetting the DB.
- Statuses flow **Draft → Approved → Published**.
- To add a post, add a `SEED_POSTS` entry: `id`, `date` (`YYYY-MM-DD` or `null`
  for the backlog), `title`, `format`, `images` (`{ full, thumb, alt }` pointing
  at `/social/...`), `caption`, `hashtags`, `cta`, `bioLink`, `status: "draft"`.
- Reel videos attach via the static `POST_VIDEOS` map (decorated on read).

## Deploy

- Pushing to `main` is **not** a deploy — someone clicks **Republish** in Replit.
- Posting to Instagram is **manual**.

## Commands

```
npm run dev                        # local dev server (set ADMIN_PASSWORD for /admin)
npm run build                      # production build
npm test                           # vitest
npm run render:social -- <name>    # render a social template to PNG + thumb
```
