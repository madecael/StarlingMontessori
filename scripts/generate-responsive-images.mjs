#!/usr/bin/env node
// Generates responsive WebP variants (400/800/1200w) for photos referenced by
// the landing-page content collection, so <img> tags can ship a `srcset`
// instead of the full-size original to every viewport.
//
// On-demand, like scripts/render-social.mjs — not wired into `npm run build`.
// Re-run this whenever a landing-page photo is added or replaced:
//   node scripts/generate-responsive-images.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const landingDir = path.join(repoRoot, "src", "content", "landing");
const publicDir = path.join(repoRoot, "public");

const WIDTHS = [400, 800, 1200];
const IMAGE_PATH_RE = /\/images\/[\w./-]+\.webp/g;

function findReferencedPhotos() {
  const files = fs.readdirSync(landingDir).filter((f) => f.endsWith(".md"));
  const found = new Set();
  for (const file of files) {
    const text = fs.readFileSync(path.join(landingDir, file), "utf8");
    for (const match of text.matchAll(IMAGE_PATH_RE)) {
      found.add(match[0]);
    }
  }
  return [...found];
}

async function generateVariants(publicPath) {
  const fsPath = path.join(publicDir, publicPath);
  if (!fs.existsSync(fsPath)) {
    console.error(`  skipped ${publicPath}: source file not found`);
    return;
  }
  const { width: nativeWidth } = await sharp(fsPath).metadata();
  const base = publicPath.replace(/\.webp$/, "");
  const targets = WIDTHS.filter((w) => !nativeWidth || w < nativeWidth);

  for (const w of targets) {
    const outPath = path.join(publicDir, `${base}-${w}w.webp`);
    await sharp(fsPath).resize({ width: w }).webp({ quality: 80 }).toFile(outPath);
  }
  console.log(`  ${publicPath}: generated ${targets.length ? targets.join(", ") + "w" : "(no smaller widths needed)"}`);
}

async function main() {
  const photos = findReferencedPhotos();
  if (photos.length === 0) {
    console.error(`No /images/*.webp references found under ${landingDir}`);
    process.exit(1);
  }
  console.log(`Generating responsive variants for ${photos.length} photo(s):`);
  for (const p of photos) {
    await generateVariants(p);
  }
  console.log("Done.");
}

await main();
