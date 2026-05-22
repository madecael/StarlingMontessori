import type { APIRoute } from "astro";
import { listLeads, type Lead } from "../../../lib/leads";

export const prerender = false;

function csvField(v: unknown): string {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[,"\n\r]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}

function notesText(lead: Lead): string {
  return lead.notes.map((n) => `[${n.author}] ${n.text}`).join(" | ");
}

const HEADERS = [
  "email",
  "name",
  "phone",
  "child_name",
  "child_age",
  "program",
  "status",
  "source",
  "first_contact_at",
  "last_activity_at",
  "notes_count",
  "notes_text",
];

export const GET: APIRoute = async () => {
  try {
    const leads = await listLeads();
    const rows: string[] = [HEADERS.join(",")];
    for (const l of leads) {
      rows.push(
        [
          l.email,
          l.name ?? "",
          l.phone ?? "",
          l.childName ?? "",
          l.childAge ?? "",
          l.program ?? "",
          l.status,
          l.source,
          l.firstContactAt,
          l.lastActivityAt,
          l.notes.length,
          notesText(l),
        ]
          .map(csvField)
          .join(","),
      );
    }
    const body = "﻿" + rows.join("\r\n") + "\r\n";
    const today = new Date().toISOString().slice(0, 10);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="starling-leads-${today}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
