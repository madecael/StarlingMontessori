// Wraps the built Astro standalone server to add Cache-Control headers for
// public/-sourced static assets (images, favicons) that @astrojs/node's own
// static handler doesn't cache-header by default — it only does so for
// hashed /_astro/* build assets (verified in node_modules/@astrojs/node/dist/serve-static.js).
//
// IMPORTANT: must disable @astrojs/node's own auto-start BEFORE importing the
// entry module, since importing it otherwise starts a second HTTP server as
// a side effect (the same technique @astrojs/node's own preview.js uses).
process.env.ASTRO_NODE_AUTOSTART = "disabled";

import http from "node:http";

const { handler, options } = await import("./dist/server/entry.mjs");

const CACHE_7_DAYS = "public, max-age=604800";
const CACHEABLE_PATTERNS = [/^\/images\//, /^\/favicon/, /^\/apple-touch-icon/];

function resolveHost(host) {
  if (typeof host === "boolean") return host ? "0.0.0.0" : "localhost";
  return host;
}

const server = http.createServer((req, res) => {
  const pathname = (req.url ?? "").split("?")[0];
  const isAstroAsset = pathname.startsWith(`/${options.assets}/`);
  if (!isAstroAsset && CACHEABLE_PATTERNS.some((re) => re.test(pathname))) {
    res.setHeader("Cache-Control", CACHE_7_DAYS);
  }
  handler(req, res);
});

const port = process.env.PORT ? Number(process.env.PORT) : options.port ?? 8080;
const host = process.env.HOST ?? resolveHost(options.host);

server.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
