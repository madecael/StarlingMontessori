import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";

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

const DATA_DIR = join(process.cwd(), ".data");
const LEADS_PATH = join(DATA_DIR, "leads.json");
const EVENTS_PATH = join(DATA_DIR, "events.json");

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function ensureDir(path: string): Promise<void> {
  if (!existsSync(path)) await mkdir(path, { recursive: true });
}

async function readJsonArray<T>(path: string): Promise<T[]> {
  await ensureDir(dirname(path));
  if (!existsSync(path)) return [];
  try {
    const raw = await readFile(path, "utf-8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (e) {
    console.error(`Failed to read ${path}, returning empty array`, e);
    return [];
  }
}

async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  await ensureDir(dirname(path));
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await rename(tmp, path);
}

// In-process write queue per file. Astro SSR runs in a single Node process,
// so a Promise chain is sufficient to serialize writes and prevent
// read-modify-write races between concurrent requests.
const writeQueues = new Map<string, Promise<unknown>>();

function withLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(path) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  writeQueues.set(
    path,
    next.catch(() => undefined),
  );
  return next;
}

export async function readLeads(): Promise<Lead[]> {
  return readJsonArray<Lead>(LEADS_PATH);
}

export async function readEvents(): Promise<LeadEvent[]> {
  return readJsonArray<LeadEvent>(EVENTS_PATH);
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
  return withLock(LEADS_PATH, async () => {
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
      await writeJsonAtomic(LEADS_PATH, leads);
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
    await writeJsonAtomic(LEADS_PATH, leads);
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
  return withLock(EVENTS_PATH, async () => {
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
    await writeJsonAtomic(EVENTS_PATH, events);
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
  const { lead, prev, timestamp } = await withLock(LEADS_PATH, async () => {
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
    await writeJsonAtomic(LEADS_PATH, leads);
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
  const { note, timestamp } = await withLock(LEADS_PATH, async () => {
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
    await writeJsonAtomic(LEADS_PATH, leads);
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
