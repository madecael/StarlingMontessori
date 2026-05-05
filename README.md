# Starling Montessori — Website

This is the source for **starlingmontessorischool.com**. It runs on Astro, deploys on Replit, and is edited by writing markdown files.

## How to edit content

1. Open the GitHub repo in your browser.
2. Press `.` to open the GitHub.dev editor (a free, in-browser VS Code).
3. Find the file you want to change in `src/content/`:
   - `pages/` — the main site pages (about, programs, etc.)
   - `landing/` — the persona landing pages (Sarah, David & Maya)
   - `settings/site.md` — phone, email, address, booking URL, tracking IDs
4. Edit the file. Save.
5. Click "Source Control" in the left sidebar → "Commit & Push".
6. The site rebuilds in ~1 minute.

## How to swap photos

Drop replacement images into `public/images/photos/` keeping the same filenames. Commit & push.

## How to enable tour booking

The site uses Google Calendar Appointment Schedules (a free feature in Google Workspace) for tour bookings. To enable it:

1. Open Google Calendar (signed in as Fabienne).
2. Click "Create" → "Appointment schedule" (or click any time slot → "Appointment schedule" tab).
3. Configure:
   - Title: "Toddler Tour" (or "Starling tour")
   - Duration: 30 minutes
   - Days/hours: pick the recurring availability (e.g. Tue/Thu 9:30–11:00 AM)
   - Buffer between bookings: 15 minutes
   - Booking notice: minimum 2 days in advance
4. Add a few questions if desired (e.g. "Child's age?", "Are you currently in another Montessori program?").
5. Click "Open booking page" → copy the public URL (looks like `https://calendar.app.google/abc123…`).
6. Open `src/content/settings/site.md` and add the line:
   ```yaml
   bookingUrl: https://calendar.app.google/abc123XYZ
   ```
7. Commit and push. Within ~1 minute the site shows the booking embed everywhere.

If `bookingUrl` is left empty, the site falls back to the existing form-based "request a tour" flow (visitor submits, Fabienne emails back to coordinate).

## How to set tracking IDs

Edit `src/content/settings/site.md` and fill in:

```yaml
ga4Id: G-XXXXXXXXXX
googleAdsConversionId: AW-1234567890
googleAdsConversionLabel: AbCdEfGhIjKl
bookingUrl: https://calendar.app.google/abc123XYZ
```

The values appear in the live site after the next deploy.

## Local development (for engineers)

```bash
git clone <repo-url>
cd website
npm install
cp .env.example .env  # add RESEND_API_KEY
npm run dev
```

Visit `http://localhost:4321`. Editor is hot-reload.

## Deploy

Replit is connected to the `main` branch. Pushes to `main` trigger a redeploy. The build runs `npm ci && npm run build`. The runtime serves the built site with the Astro Node adapter.

## Architecture notes

- Astro 5, static output with one SSR endpoint at `/api/tour-request` (the LPs are fully prerendered HTML)
- Tailwind CSS configured against the brandbook tokens (Cetacean Blue, Seashell, Sky Blue, Pearly Purple)
- Markdown content collections (`src/content/`) with zod-validated frontmatter — bad frontmatter fails the build
- Tour-request form posts to `/api/tour-request` which validates server-side and forwards via Resend to `tourEmailRecipient`
- GA4 + Google Ads conversion injected only if IDs are present in `settings/site.md`

## Pending drop-ins

- Licensed `.woff2` fonts (Greycliff CF, Jaguar) → `public/fonts/`. The CSS will swap `@import` for `@font-face` once present.
- Real classroom photography → `public/images/photos/` (replace existing files keeping filenames).
- Saint Mark Episcopal exterior/interior photos for the Primary LP — currently shown as honest placeholders.
- Official bird-mark SVG → `public/images/bird-mark.svg`.
