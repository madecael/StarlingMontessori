#!/usr/bin/env node
/**
 * Idempotently register a Calendly webhook subscription pointed at our
 * production endpoint.
 *
 * Usage:
 *   CALENDLY_TOKEN=... CALENDLY_WEBHOOK_SECRET=... \
 *     node scripts/calendly-register-webhook.mjs \
 *     [--url https://starlingmontessorischool.com/api/calendly-webhook] \
 *     [--scope organization] [--dry-run]
 *
 * Run once from a machine that has the two secrets in env. The subscription
 * URI is recorded in `.data/calendly-subscriptions.json` so future runs can
 * detect the existing subscription and exit cleanly.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://api.calendly.com";
const DEFAULT_URL = "https://starlingmontessorischool.com/api/calendly-webhook";
const DEFAULT_EVENTS = ["invitee.created", "invitee.canceled"];

function parseArgs(argv) {
  const args = { url: DEFAULT_URL, scope: "organization", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") args.url = argv[++i];
    else if (a === "--scope") args.scope = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage: node scripts/calendly-register-webhook.mjs [--url URL] [--scope organization|user] [--dry-run]`);
      process.exit(0);
    }
  }
  return args;
}

async function api(token, path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const detail = JSON.stringify(json).slice(0, 600);
    throw new Error(`Calendly API ${res.status} ${res.statusText} on ${path}: ${detail}`);
  }
  return json;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const token = process.env.CALENDLY_TOKEN;
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (!token) throw new Error("CALENDLY_TOKEN env var not set");
  if (!secret) throw new Error("CALENDLY_WEBHOOK_SECRET env var not set");
  if (secret.length < 32) {
    console.warn(`Warning: CALENDLY_WEBHOOK_SECRET is only ${secret.length} chars — Calendly recommends 32+ random chars.`);
  }

  console.log(`Webhook URL : ${args.url}`);
  console.log(`Scope       : ${args.scope}`);
  console.log(`Events      : ${DEFAULT_EVENTS.join(", ")}`);
  console.log("");

  const me = await api(token, "/users/me");
  const userUri = me.resource.uri;
  const orgUri = me.resource.current_organization;
  console.log(`Calendly user: ${me.resource.name} <${me.resource.email}>`);
  console.log(`User URI    : ${userUri}`);
  console.log(`Org URI     : ${orgUri}`);
  console.log("");

  const listParams = new URLSearchParams({ organization: orgUri, scope: args.scope });
  if (args.scope === "user") listParams.set("user", userUri);
  const existingResp = await api(token, `/webhook_subscriptions?${listParams.toString()}`);
  const existing = (existingResp.collection ?? []).filter(
    (s) => s.callback_url === args.url && s.scope === args.scope,
  );

  if (existing.length > 0) {
    console.log(`Subscription already exists for this URL:`);
    for (const s of existing) {
      console.log(`  - ${s.uri}`);
      console.log(`    state=${s.state} events=${(s.events ?? []).join(",")} scope=${s.scope}`);
    }
    await recordSubscriptions(existing, args.url);
    console.log("\nNo changes needed. Done.");
    return;
  }

  if (args.dryRun) {
    console.log("Dry run: would create new subscription. Skipping.");
    return;
  }

  const body = {
    url: args.url,
    events: DEFAULT_EVENTS,
    organization: orgUri,
    scope: args.scope,
    signing_key: secret,
  };
  if (args.scope === "user") body.user = userUri;

  const created = await api(token, "/webhook_subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  console.log(`Created subscription: ${created.resource.uri}`);
  console.log(`State: ${created.resource.state}`);
  await recordSubscriptions([created.resource], args.url);
  console.log("\nDone.");
}

async function recordSubscriptions(subs, url) {
  const here = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(here, "..", ".data");
  const filePath = join(dataDir, "calendly-subscriptions.json");
  if (!existsSync(dataDir)) await mkdir(dataDir, { recursive: true });
  let current = [];
  if (existsSync(filePath)) {
    try {
      const raw = await readFile(filePath, "utf-8");
      current = JSON.parse(raw);
      if (!Array.isArray(current)) current = [];
    } catch {
      current = [];
    }
  }
  const incoming = subs.map((s) => ({
    uri: s.uri,
    callbackUrl: s.callback_url ?? url,
    events: s.events ?? DEFAULT_EVENTS,
    scope: s.scope,
    state: s.state,
    createdAt: s.created_at ?? new Date().toISOString(),
    recordedAt: new Date().toISOString(),
  }));
  // Replace any prior entries pointing at the same URL with the freshest data.
  const filtered = current.filter((r) => r.callbackUrl !== url);
  const merged = [...filtered, ...incoming];
  await writeFile(filePath, JSON.stringify(merged, null, 2), "utf-8");
  console.log(`Recorded subscription metadata in ${filePath}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
