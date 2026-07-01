# Teammate setup (Windows)

Welcome! This guide gets you from a fresh Windows PC to producing Starling social
content from your own Claude Code. Work through it top to bottom — it's a
checklist.

## a. Before you start (prerequisites)

- [ ] **A GitHub account.** Ask the repo owner, **madecael**, to add you as a
      collaborator on **`madecael/StarlingMontessori`**.
- [ ] **Git for Windows** — https://git-scm.com/download/win
- [ ] **Node.js 20+ LTS** — https://nodejs.org (pick the LTS installer). Verify in
      a new terminal:
      ```
      node -v
      ```
      It should print v20 or higher.
- [ ] **Claude Code**, signed in with your **own** Claude Pro/Max account or API
      key — https://docs.anthropic.com/claude-code

Tip: use **Windows PowerShell** (or Windows Terminal) for the commands below.

## b. Clone the repo

```powershell
git clone https://github.com/madecael/StarlingMontessori.git
cd StarlingMontessori
```

The **repo root IS the Astro project** — there's no extra subfolder to `cd` into.

## c. Install dependencies

```powershell
npm install
npx playwright install chromium
```

`npx playwright install chromium` is only needed **once per machine** — it
downloads the headless browser used to render social graphics.

## d. Run it locally

The admin calendar needs an `ADMIN_PASSWORD`. Set it and start the dev server.

**PowerShell:**

```powershell
$env:ADMIN_PASSWORD="test"; npm run dev
```

**cmd.exe:**

```cmd
set ADMIN_PASSWORD=test && npm run dev
```

Then:

- [ ] Open the **localhost URL** the terminal prints (something like
      `http://localhost:4321`).
- [ ] Go to **`/admin/calendar`** and log in with the password you just set
      (`test`).

No other secrets are needed locally — with no `REPLIT_DB_URL` set, the app
automatically uses a local file-backed dev database.

## e. Make a graphic

Graphics are HTML artboards in `social-templates/` (square = 1080×1080,
story = 1080×1920). The quickest path:

1. Copy the closest template to a new file, e.g. copy
   `social-templates/square/06-tour-event.html` to a new `.html` in the same
   folder.
2. Edit the copy following the brand rules (English only, no emoji, Montessori
   vocabulary, lead with the child) — see `social-templates/README.md` and the
   project `CLAUDE.md`.
3. Render it:
   ```powershell
   npm run render:social -- <basename>
   ```
   This writes `public/social/<basename>.png` and
   `public/social/thumbs/<basename>.jpg`.
4. Add it to the calendar by adding a `SEED_POSTS` entry in `src/lib/social.ts`.

Easiest of all: open Claude Code in the repo and ask it to make a social graphic
— the **`social-graphic`** skill walks through every step for you.

## f. Publish

1. [ ] Commit and push to **`main`**:
   ```powershell
   git add -A
   git commit -m "Add August open house graphic"
   git push origin main
   ```
2. [ ] **Tell the owner to click Republish in Replit.** A push to `main` does
   **not** deploy on its own — the live site only updates after Republish.
3. [ ] **Posting to Instagram is manual** — the calendar plans posts, it doesn't
   auto-publish to Instagram.

## g. Getting help

Open **Claude Code inside the repo**. The project **`CLAUDE.md`** (brand voice,
facts, pipeline) and the **`social-graphic`** skill load automatically and will
guide you through making and shipping content.
