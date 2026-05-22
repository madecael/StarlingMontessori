import { randomUUID } from "node:crypto";
import Client from "@replit/database";

export type Program = "toddler" | "primary";
export type Source = "calendly" | "tour_form" | "contact_form";
export type Status = "inquired" | "toured" | "applied" | "enrolled" | "lost";
export type Author = "fabienne" | "carlos" | "mau";

export const STATUSES: Status[] = ["inquired", "toured", "applied", "enrolled", "lost"];
export const AUTHORS: Author[] = ["fabienne", "carlos", "mau"];

export interface Note {
  id: string;
  text: string;
  author: Author;
  createdAt: string;
}

export interface Lead {
  email: string;
  name: string;
  phone?: string;
  childName?: string;
  childAge?: string;
  program?: Program;
  source: Source;
  firstContactAt: string;
  lastActivityAt: string;
  status: Status;
  notes: Note[];
  metadata: Record<string, unknown>;
}

export type EventType =
  | "tour_booked"
  | "tour_canceled"
  | "form_submit"
  | "contact"
  | "status_change"
  | "note_added";

export interface LeadEvent {
  id: string;
  leadEmail: string;
  type: EventType;
  source: Source | "admin";
  timestamp: string;
  metadata: Record<string, unknown>;
  dedupeKey?: string;
}

const LEADS_KEY = "leads";
const EVENTS_KEY = "events";

// Minimal structural interface matching the parts of @replit/database we use.
// Lets tests inject an in-memory mock without pulling in the real Client (which
// throws at construction time when REPLIT_DB_URL is unset).
export interface ReplitDbLike {
  get(
    key: string,
  ): Promise<{ ok: true; value: unknown } | { ok: false; error: { message: string } }>;
  set(
    key: string,
    value: unknown,
  ): Promise<{ ok: true; value: unknown } | { ok: false; error: { message: string } }>;
}

// Lazy singleton: `new Client()` throws synchronously when REPLIT_DB_URL is
// missing, which would crash module-load (and therefore `astro build`) in any
// non-Replit environment. Deferring construction keeps build green and only
// requires the env var at first DB call.
let _client: ReplitDbLike | null = null;
function getDefaultClient(): ReplitDbLike {
  if (!_client) {
    try {
      _client = new Client() as unknown as ReplitDbLike;
    } catch (err) {
      throw new Error(
        `Failed to initialize Replit Database client — confirm REPLIT_DB_URL is set in deployment env vars. Underlying error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return _client;
}

// Test seam: swap the default client (e.g. with an in-memory mock).
/**
 * @internal — test-only injection seam. Do not call from production code.
 */
export function __setDbClient(client: ReplitDbLike | null): void {
  _client = client;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function dbGetArray<T>(key: string, client: ReplitDbLike = getDefaultClient()): Promise<T[]> {
  try {
    const res = await client.get(key);
    if (!res.ok) {
      // Missing key surfaces as ok:true value:null on Replit DB; a genuine error
      // here means the request failed. Log and return [] to keep callers safe.
      console.error(`dbGetArray(${key}) failed`, res.error);
      return [];
    }
    const value = res.value;
    if (value == null) return [];
    return Array.isArray(value) ? (value as T[]) : [];
  } catch (e) {
    console.error(`dbGetArray(${key}) threw`, e);
    return [];
  }
}

async function dbSetArray(
  key: string,
  data: unknown,
  client: ReplitDbLike = getDefaultClient(),
): Promise<void> {
  const res = await client.set(key, data);
  if (!res.ok) {
    throw new Error(`dbSetArray(${key}) failed: ${res.error.message}`);
  }
}

// In-process write queue per key. Replit Autoscale is configured to a single
// max instance, so a Promise chain is sufficient to serialize writes and
// prevent read-modify-write races between concurrent requests.
const writeQueues = new Map<string, Promise<unknown>>();

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(key) ?? Promise.resolve();
  const next = prev.then(fn);
  writeQueues.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

export async function readLeads(): Promise<Lead[]> {
  return dbGetArray<Lead>(LEADS_KEY);
}

export async function readEvents(): Promise<LeadEvent[]> {
  return dbGetArray<LeadEvent>(EVENTS_KEY);
}

export async function getLead(email: string): Promise<Lead | undefined> {
  const key = normalizeEmail(email);
  const leads = await readLeads();
  return leads.find((l) => l.email === key);
}

export interface ListFilters {
  status?: Status | "all";
  search?: string;
}

export async function listLeads(filters: ListFilters = {}): Promise<Lead[]> {
  const leads = await readLeads();
  const filtered = leads.filter((l) => {
    if (filters.status && filters.status !== "all" && l.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.email.includes(q)) return false;
    }
    return true;
  });
  return filtered.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export async function listEvents(leadEmail?: string): Promise<LeadEvent[]> {
  const events = await readEvents();
  const key = leadEmail ? normalizeEmail(leadEmail) : undefined;
  const filtered = key ? events.filter((e) => e.leadEmail === key) : events;
  return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export interface UpsertInput {
  email: string;
  name?: string;
  phone?: string;
  childName?: string;
  childAge?: string;
  program?: Program;
  source: Source;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export async function upsertLead(input: UpsertInput): Promise<Lead> {
  return withLock(LEADS_KEY, async () => {
    const key = normalizeEmail(input.email);
    if (!key) throw new Error("upsertLead: email required");
    const now = input.timestamp ?? new Date().toISOString();
    const leads = await readLeads();
    const idx = leads.findIndex((l) => l.email === key);
    if (idx === -1) {
      const lead: Lead = {
        email: key,
        name: (input.name ?? "").trim() || key,
        phone: input.phone,
        childName: input.childName,
        childAge: input.childAge,
        program: input.program,
        source: input.source,
        firstContactAt: now,
        lastActivityAt: now,
        status: "inquired",
        notes: [],
        metadata: input.metadata ?? {},
      };
      leads.push(lead);
      await dbSetArray(LEADS_KEY, leads);
      return lead;
    }
    const existing = leads[idx];
    const merged: Lead = {
      ...existing,
      // Only overwrite name/phone/child if we have a non-empty value, to avoid
      // a sparse follow-up form wiping a richer earlier record.
      name: input.name?.trim() ? input.name.trim() : existing.name,
      phone: input.phone ?? existing.phone,
      childName: input.childName ?? existing.childName,
      childAge: input.childAge ?? existing.childAge,
      program: input.program ?? existing.program,
      lastActivityAt: now > existing.lastActivityAt ? now : existing.lastActivityAt,
      metadata: { ...existing.metadata, ...(input.metadata ?? {}) },
    };
    leads[idx] = merged;
    await dbSetArray(LEADS_KEY, leads);
    return merged;
  });
}

export interface AddEventInput {
  leadEmail: string;
  type: EventType;
  source: Source | "admin";
  timestamp?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}

export async function addEvent(input: AddEventInput): Promise<LeadEvent> {
  return withLock(EVENTS_KEY, async () => {
    const events = await readEvents();
    if (input.dedupeKey) {
      const existing = events.find((e) => e.dedupeKey === input.dedupeKey);
      if (existing) return existing;
    }
    const event: LeadEvent = {
      id: randomUUID(),
      leadEmail: normalizeEmail(input.leadEmail),
      type: input.type,
      source: input.source,
      timestamp: input.timestamp ?? new Date().toISOString(),
      metadata: input.metadata ?? {},
      ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {}),
    };
    events.push(event);
    await dbSetArray(EVENTS_KEY, events);
    return event;
  });
}

export async function updateStatus(
  email: string,
  status: Status,
  author: Author,
  note?: string,
): Promise<Lead> {
  const key = normalizeEmail(email);
  const trimmedNote = note?.trim() || undefined;
  const { lead, prev, timestamp } = await withLock(LEADS_KEY, async () => {
    const leads = await readLeads();
    const idx = leads.findIndex((l) => l.email === key);
    if (idx === -1) throw new Error(`updateStatus: lead not found: ${key}`);
    const now = new Date().toISOString();
    const prevStatus = leads[idx].status;
    leads[idx] = { ...leads[idx], status, lastActivityAt: now };
    if (trimmedNote) {
      leads[idx].notes = [
        ...leads[idx].notes,
        { id: randomUUID(), text: trimmedNote, author, createdAt: now },
      ];
    }
    await dbSetArray(LEADS_KEY, leads);
    return { lead: leads[idx], prev: prevStatus, timestamp: now };
  });
  await addEvent({
    leadEmail: key,
    type: "status_change",
    source: "admin",
    timestamp,
    metadata: { from: prev, to: status, author, note: trimmedNote },
  });
  return lead;
}

export async function addNote(email: string, text: string, author: Author): Promise<Note> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("addNote: text required");
  const key = normalizeEmail(email);
  const { note, timestamp } = await withLock(LEADS_KEY, async () => {
    const leads = await readLeads();
    const idx = leads.findIndex((l) => l.email === key);
    if (idx === -1) throw new Error(`addNote: lead not found: ${key}`);
    const now = new Date().toISOString();
    const newNote: Note = { id: randomUUID(), text: trimmed, author, createdAt: now };
    leads[idx] = {
      ...leads[idx],
      notes: [...leads[idx].notes, newNote],
      lastActivityAt: now,
    };
    await dbSetArray(LEADS_KEY, leads);
    return { note: newNote, timestamp: now };
  });
  await addEvent({
    leadEmail: key,
    type: "note_added",
    source: "admin",
    timestamp,
    metadata: { author, noteId: note.id },
  });
  return note;
}
