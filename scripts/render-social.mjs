#!/usr/bin/env node
// Cross-platform social-graphic renderer for the Starling website.
//
// Renders the HTML artboard templates in `social-templates/{square,story}/`
// to PNGs in `public/social/`, plus JPEG thumbnails in `public/social/thumbs/`.
//
// Usage:
//   node scripts/render-social.mjs            # render all square + story templates
//   node scripts/render-social.mjs <name>     # render one template (with or without .html)
//
// Works on Windows, macOS, and Linux:
//   - paths derived from the script location (import.meta.url) + path.join
//   - a built-in node:http static server (no python) on an ephemeral port
//   - Playwright chromium for rendering, sharp for thumbnails (no macOS `sips`)
//   - URL paths always use forward slashes regardless of OS

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

// --- Derive paths from the script location, never from cwd. ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, ".."); // website/
const templatesDir = path.join(repoRoot, "social-templates");
const outDir = path.join(repoRoot, "public", "social");
const thumbsDir = path.join(outDir, "thumbs");

// Which subdir a template lives in decides its target artboard size.
// (The exact pixel size comes from the .artboard element's own box; the
// viewport just has to be big enough to lay the whole artboard out.)
const SUBDIRS = {
  square: { viewport: { width: 1120, height: 1120 } },
  story: { viewport: { width: 1120, height: 1960 } },
};

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// List the `.html` templates in a subdir, sorted for stable order.
function listTemplates(subdir) {
  const dir = path.join(templatesDir, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".html"))
    .sort();
}

// Build the list of render tasks based on the optional CLI arg.
function buildTasks() {
  const arg = process.argv[2];
  const square = listTemplates("square");
  const story = listTemplates("story");

  if (arg) {
    // Normalize: strip a trailing ".html" if the user passed the full name.
    const base = arg.replace(/\.html$/i, "");
    const file = `${base}.html`;

    if (square.includes(file)) return [{ subdir: "square", file, base }];
    if (story.includes(file)) return [{ subdir: "story", file, base }];

    const available = [
      ...square.map((f) => `square/${f.replace(/\.html$/i, "")}`),
      ...story.map((f) => `story/${f.replace(/\.html$/i, "")}`),
    ];
    console.error(`Template "${arg}" not found.`);
    console.error("Available templates:");
    for (const name of available) console.error(`  ${name}`);
    process.exit(1);
  }

  return [
    ...square.map((file) => ({ subdir: "square", file, base: file.replace(/\.html$/i, "") })),
    ...story.map((file) => ({ subdir: "story", file, base: file.replace(/\.html$/i, "") })),
  ];
}

// Static file server rooted at templatesDir. Guards against path traversal.
function createStaticServer() {
  return http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
      // Strip the leading slash and resolve within templatesDir.
      const relative = urlPath.replace(/^\/+/, "");
      const filePath = path.join(templatesDir, relative);

      // Ensure the resolved path stays inside templatesDir (no traversal).
      const rootWithSep = templatesDir.endsWith(path.sep) ? templatesDir : templatesDir + path.sep;
      if (filePath !== templatesDir && !filePath.startsWith(rootWithSep)) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`Not found: ${relative}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Server error: ${err.message}`);
    }
  });
}

// Start the server on an ephemeral localhost port and return { server, port }.
function startServer() {
  return new Promise((resolve, reject) => {
    const server = createStaticServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function main() {
  const tasks = buildTasks();

  if (tasks.length === 0) {
    console.error(`No templates found under ${templatesDir}`);
    process.exit(1);
  }

  // Ensure output directories exist.
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(thumbsDir, { recursive: true });

  console.log(`Rendering ${tasks.length} template(s) from ${templatesDir}`);
  console.log(`  PNGs   -> ${outDir}`);
  console.log(`  thumbs -> ${thumbsDir}`);

  const { server, port } = await startServer();
  let browser;
  let rendered = 0;

  try {
    browser = await chromium.launch();

    for (const { subdir, file, base } of tasks) {
      const { viewport } = SUBDIRS[subdir];
      // URL path always uses forward slashes regardless of OS.
      const url = `http://127.0.0.1:${port}/${subdir}/${file}`;

      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      try {
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await sleep(400);

        const el = await page.$(".artboard");
        if (!el) {
          console.error(`  skipped ${file}: no .artboard element found`);
          continue;
        }
        await el.boundingBox(); // ensure it is laid out / visible

        const pngPath = path.join(outDir, `${base}.png`);
        await el.screenshot({ path: pngPath });

        // Thumbnail: width 560, height auto (preserves aspect ratio).
        const thumbPath = path.join(thumbsDir, `${base}.jpg`);
        await sharp(pngPath).resize({ width: 560 }).jpeg({ quality: 82 }).toFile(thumbPath);

        // Report the real, on-disk PNG dimensions via sharp metadata.
        const meta = await sharp(pngPath).metadata();
        console.log(
          `rendered ${base}.png (${meta.width}x${meta.height}) + thumb ${base}.jpg`
        );
        rendered += 1;
      } finally {
        await page.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  console.log(`Done. Rendered ${rendered} of ${tasks.length} template(s).`);
}

await main();
