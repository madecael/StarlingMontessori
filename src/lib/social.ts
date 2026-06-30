import Client from "@replit/database";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type PostStatus = "draft" | "approved" | "published";
export type PostFormat = "feed" | "carousel" | "story" | "reel" | "ad";
export type SocialAuthor = "fabienne" | "carlos" | "mau";

export const POST_STATUSES: PostStatus[] = ["draft", "approved", "published"];
export const SOCIAL_AUTHORS: SocialAuthor[] = ["fabienne", "carlos", "mau"];

export interface PostImage {
  full: string;
  thumb: string;
  alt?: string;
}

export interface PostVideo {
  src: string;
  label?: string;
}

export interface SocialPost {
  id: string;
  date: string | null;
  dayLabel?: string;
  title: string;
  format: PostFormat;
  pillar: string;
  channel: string;
  images: PostImage[];
  videos?: PostVideo[];
  caption: string;
  hashtags: string;
  cta: string;
  bioLink: string;
  notes?: string;
  locked: boolean;
  status: PostStatus;
  publishedAt?: string;
  publishedBy?: SocialAuthor;
  createdAt: string;
  updatedAt: string;
}

const POSTS_KEY = "social_posts";

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

// Local-dev fallback: a file-backed ReplitDbLike used when REPLIT_DB_URL is
// absent (i.e. running `npm run dev` off-Replit). Persists to .dev-db.json in
// the project cwd so the calendar — seeding, edits, status changes, reschedules
// — works end-to-end locally. NEVER used in production: Replit always sets
// REPLIT_DB_URL, so getDefaultClient() takes the real-client branch there.
function createFileDbClient(): ReplitDbLike {
  const file = join(process.cwd(), ".dev-db.json");
  const read = (): Record<string, unknown> => {
    try {
      if (!existsSync(file)) return {};
      return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch {
      return {};
    }
  };
  const write = (data: Record<string, unknown>): void => {
    writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  };
  return {
    async get(key: string) {
      const data = read();
      return { ok: true as const, value: key in data ? data[key] : null };
    },
    async set(key: string, value: unknown) {
      const data = read();
      data[key] = value;
      write(data);
      return { ok: true as const, value };
    },
  };
}

// Lazy singleton: `new Client()` throws synchronously when REPLIT_DB_URL is
// missing, which would crash module-load (and therefore `astro build`) in any
// non-Replit environment. Deferring construction keeps build green and only
// requires the env var at first DB call.
let _client: ReplitDbLike | null = null;
function getDefaultClient(): ReplitDbLike {
  if (!_client) {
    if (!process.env.REPLIT_DB_URL) {
      // No Replit DB on this host — fall back to the local file-backed dev DB.
      console.warn(
        "[social] REPLIT_DB_URL not set — using local file-backed dev DB (.dev-db.json). For local testing only; production uses Replit DB.",
      );
      _client = createFileDbClient();
      return _client;
    }
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
export function __setDbClient(client: unknown | null): void {
  _client = client as ReplitDbLike | null;
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

// Image path helpers. For an original file "post1-...-room.png" in
// social-templates/renders/final, the served full image is
// "/social/post1-...-room.png" and the thumbnail is
// "/social/thumbs/post1-...-room.jpg" (thumbs are ALWAYS .jpg, same basename,
// extension swapped). The asset pipeline MUST agree with these rules.
function fullPath(original: string): string {
  return `/social/${original}`;
}

function thumbPath(original: string): string {
  const basename = original.replace(/\.[^.]+$/, "");
  return `/social/thumbs/${basename}.jpg`;
}

function img(original: string, alt?: string): PostImage {
  return { full: fullPath(original), thumb: thumbPath(original), ...(alt ? { alt } : {}) };
}

const SEED_TS = "2026-06-15T12:00:00.000Z";

export const SEED_POSTS: SocialPost[] = [
  // ── DATED ORGANIC POSTS (Instagram) ──────────────────────────────────────
  {
    id: "reel-toddler-room",
    date: "2026-06-15",
    dayLabel: "Mon",
    title: "Reel — The Prepared Environment (Toddler room)",
    format: "reel",
    pillar: "The Prepared Environment",
    channel: "Instagram Reel → YouTube Shorts",
    images: [
      img(
        "post1-reel-cover-toddler-room.png",
        "Vertical video of a calm Montessori classroom: a child working with wooden materials at a low table while a guide observes nearby.",
      ),
    ],
    caption:
      "A morning here moves slowly, on purpose.\n\nThe room is prepared before the children arrive — every shelf within reach, every material in its place, nothing more than what belongs. A child walks in, chooses their work, and settles. The order is something you can feel.\n\nThis is the Toddler Community on Capitol Hill: calm, unhurried, and made for small hands and growing minds.",
    hashtags:
      "#StarlingMontessori #MontessoriToddler #CapitolHillDC #WashingtonDC #PreparedEnvironment",
    cta: "Come see the room for yourself. Book a tour through the link in our bio.",
    bioLink: "/open-house",
    notes:
      "B-roll note: Use Primary Tour.MOV (slow walk-through of the prepared environment). Large file ~1.7 GB — trim a 12–18s steady segment before posting.",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "carousel-montessori",
    date: "2026-06-17",
    dayLabel: "Wed",
    title: "Carousel — Montessori, gently explained",
    format: "carousel",
    pillar: "Montessori Gently Explained",
    channel: "Instagram Carousel",
    images: [
      img(
        "carousel-s1-intro.png",
        "Intro card: Montessori, gently explained — every material on the shelf is an invitation.",
      ),
      img(
        "carousel-s2-solids.png",
        "A child explores the geometric solids by hand — sphere, cube, cone.",
      ),
      img("carousel-s3-beads.png", "Montessori bead chains laid out for skip counting."),
      img(
        "carousel-s4-globes.png",
        "Montessori land-and-water and continents globes a child can touch and name.",
      ),
      img(
        "carousel-s5-practical-life.png",
        "Practical life materials — pouring, lacing, and caring for the room.",
      ),
      img(
        "carousel-s6-language.png",
        "The moveable alphabet — sounds a child can build into words before the pencil arrives.",
      ),
    ],
    caption:
      "Montessori, gently explained: the classroom is not decorated, it is prepared.\n\nEach material does one thing well, and waits on the shelf until a child is ready for it. Nothing is random. The order you see is the same order a child begins to carry inside.\n\nSwipe through a few of the materials our children reach for every day.",
    hashtags:
      "#StarlingMontessori #MontessoriMaterials #CapitolHillDC #WashingtonDC #PreparedEnvironment",
    cta: "Curious how it looks in motion? Visit us — the link in our bio holds a spot for you.",
    bioLink: "/open-house",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "review-hannah",
    date: "2026-06-19",
    dayLabel: "Fri",
    title: "Our People — parent review (Hannah)",
    format: "feed",
    pillar: "Our People",
    channel: "Instagram",
    images: [
      img(
        "post3-parent-quote-hannah.png",
        "A cream quote card sharing a parent review from Hannah about knowing immediately that Starling was a special place.",
      ),
    ],
    caption:
      "Most families tell us the same thing: they felt it the moment they walked in.\n\nWe are small on purpose. When you tour Starling, you meet our founder directly, you see the room as it really is, and you get a feel for the warmth that holds it all together. We are grateful to the parents who trust us with their children's earliest years.\n\nThank you, Hannah.",
    hashtags:
      "#StarlingMontessori #MontessoriCommunity #CapitolHillDC #WashingtonDC #ParentReview",
    cta: "Want to feel it for yourself? A tour is the best place to start — link in bio.",
    bioLink: "/open-house",
    notes: "On-image quote is Hannah's verbatim review — do not edit the quote.",
    locked: true,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "primary-2026-hero",
    date: "2026-06-20",
    dayLabel: "Sat",
    title: "The Invitation — Primary 2026",
    format: "feed",
    pillar: "The Invitation",
    channel: "Instagram",
    images: [
      img(
        "post4-primary-hero.png",
        "A Primary hero card announcing Starling's Primary Classroom opening August 2026 with twelve inaugural seats for children ages 3 to 6 on Capitol Hill.",
      ),
    ],
    caption:
      "Our Primary Classroom opens in August 2026.\n\nAges three to six, at Saint Mark Episcopal — a new prepared environment for children ready to stretch into bigger work, more independence, and the quiet pride you can see on this small face. We are reserving twelve inaugural seats, and we are filling them carefully, one family at a time.\n\nIf your child will be ready for Primary in 2026, we would love to talk.",
    hashtags:
      "#StarlingMontessori #MontessoriPrimary #CapitolHillDC #WashingtonDC #NowEnrolling",
    cta: "Reserve a place for your child — start at the link in our bio!",
    bioLink: "/lp/primary-2026",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "reel-windows",
    date: "2026-06-22",
    dayLabel: "Mon",
    title: "Reel — The Prepared Environment (Windows)",
    format: "reel",
    pillar: "The Prepared Environment",
    channel: "Instagram Reel → YouTube Shorts",
    images: [
      img(
        "post5-reel-cover-windows.jpg",
        "Vertical video cover of the converted church hall on Capitol Hill — high timber ceilings and stained-glass windows with light changing through the day.",
      ),
    ],
    caption:
      "Sometimes the building teaches too.\n\nOur Toddler Community lives inside a converted church hall on Capitol Hill — high timber ceilings, stained-glass windows, light that changes through the day. Children look up and notice. We think a child's first rooms should be worth looking up at.\n\nBeauty is not extra here. It is part of the work.",
    hashtags: "#StarlingMontessori #MontessoriToddler #CapitolHillDC #WashingtonDC #StainedGlass",
    cta: "See the light for yourself — book a visit through the link in our bio.",
    bioLink: "/open-house",
    notes:
      "B-roll note: Use IMG_6759.MOV (pans the room and the light, ~74 MB). Trim a 12–18s steady segment. Backup clip: IMG_6758.MOV.",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "tip-fine-motor",
    date: "2026-06-24",
    dayLabel: "Wed",
    title: "Montessori Gently Explained — fine-motor tip",
    format: "feed",
    pillar: "Montessori Gently Explained",
    channel: "Instagram",
    images: [
      img(
        "post6-tip-card.png",
        "A tip card showing a toddler threading rubber bands onto a jar, with a note that fine-motor work is the quiet foundation for writing.",
      ),
    ],
    caption:
      "This is fine-motor work — the quiet foundation for writing.\n\nA toddler threading rubber bands onto a jar is building hand-eye coordination and a steady pincer grip: the same control the hand and eyes will one day need to hold a pencil and form letters. It looks like play, and it is also real preparation.\n\nThe hardest and kindest thing we do as adults is to wait, and let the work belong to the child.",
    hashtags:
      "#StarlingMontessori #MontessoriToddler #CapitolHillDC #WashingtonDC #FineMotorSkills",
    cta: "Save this one for the next time little hands are hard at work. Tours via the link in bio.",
    bioLink: "/open-house",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "founder",
    date: "2026-06-26",
    dayLabel: "Fri",
    title: "Our People — meet the founder",
    format: "feed",
    pillar: "Our People",
    channel: "Instagram",
    images: [
      img(
        "post7-founder-card.png",
        "A founder card introducing Fabienne Deaton, an AMI-trained Montessori guide, with her portrait and credentials.",
      ),
    ],
    caption:
      "Meet Fabienne, our founder.\n\nFabienne Deaton is an AMI-trained Montessori guide with two AMI diplomas, an M.Ed. in Montessori education, and a Master's in International Education. She has spent more than ten years guiding Washington, D.C. families, and she still spends her days on the floor — like this — reading, observing, and following each child.\n\nStarling is family-run and intentionally small. When you tour, you meet Fabienne directly. That is the whole idea.",
    hashtags: "#StarlingMontessori #AMIMontessori #CapitolHillDC #WashingtonDC #MeetTheFounder",
    cta: "Come meet her in person — book a tour at the link in our bio.",
    bioLink: "/open-house",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "tour-invitation",
    date: "2026-06-27",
    dayLabel: "Sat",
    title: "The Invitation — private tour",
    format: "feed",
    pillar: "The Invitation",
    channel: "Instagram",
    images: [
      img(
        "post8-tour-card.png",
        "A private tour invitation card: the door is open — a small, unhurried visit with our founder on Capitol Hill.",
      ),
    ],
    caption:
      "Our Toddler Community is enrolling now.\n\nFor ages sixteen to thirty-six months, at Capitol Hill Presbyterian Church — a calm, prepared room where very young children find their footing and their confidence. As one of our parents put it: \"Our son started at Starling Montessori when he was just eighteen months old, and now, at two and a half, he absolutely loves going to school each day.\" — Jennifer, current parent.\n\nA tour is the gentlest first step. No pressure, just a look.",
    hashtags: "#StarlingMontessori #MontessoriToddler #CapitolHillDC #WashingtonDC #NowEnrolling",
    cta: "Find a tour time that suits you — book through the link in our bio!",
    bioLink: "/open-house",
    notes: "Caption contains Jennifer's verbatim review — do not edit the quoted sentence.",
    locked: true,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },

  // ── STORIES (Instagram Story) ─────────────────────────────────────────────
  {
    id: "story-red-door",
    date: "2026-06-16",
    dayLabel: "Tue",
    title: "Story — Red door",
    format: "story",
    pillar: "The Prepared Environment",
    channel: "Instagram Story",
    images: [img("story1-red-door.png", "The open red front door of Starling Montessori.")],
    caption: "The red door is open.",
    hashtags: "",
    cta: "",
    bioLink: "/open-house",
    notes: 'Link sticker → /open-house ("Book a tour").',
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "story-painting-pot",
    date: "2026-06-18",
    dayLabel: "Thu",
    title: "Story — Painting a pot",
    format: "story",
    pillar: "The Prepared Environment",
    channel: "Instagram Story",
    images: [img("story2-painting-pot.png", "A child painting a pot, deep in concentration.")],
    caption: "Look how deep a child can go.",
    hashtags: "",
    cta: "",
    bioLink: "",
    notes: "None (let it breathe).",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "story-real-work",
    date: "2026-06-20",
    dayLabel: "Sat",
    title: "Story — Real work",
    format: "story",
    pillar: "The Prepared Environment",
    channel: "Instagram Story",
    images: [
      img("story3-real-work.png", "A child scooping seeds with real tools — real work, real mess."),
    ],
    caption: "Real work, real tools, real mess.",
    hashtags: "",
    cta: "",
    bioLink: "",
    notes: 'Question sticker ("Ask us anything about the Toddler Community").',
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "story-sharing",
    date: "2026-06-23",
    dayLabel: "Tue",
    title: "Story — Sharing a card",
    format: "story",
    pillar: "The Prepared Environment",
    channel: "Instagram Story",
    images: [img("story4-sharing-card.png", "Two toddlers sharing a card — mixed ages, real friendships.")],
    caption: "Mixed ages. Real friendships.",
    hashtags: "",
    cta: "",
    bioLink: "",
    notes: 'Poll ("Did you know Montessori rooms mix ages? Yes / Tell me more").',
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "story-tulips",
    date: "2026-06-25",
    dayLabel: "Thu",
    title: "Story — Smelling tulips",
    format: "story",
    pillar: "The Prepared Environment",
    channel: "Instagram Story",
    images: [img("story5-smelling-tulips.png", "A child pausing to smell tulips — there is time to notice.")],
    caption: "There is time to notice.",
    hashtags: "",
    cta: "",
    bioLink: "/open-house",
    notes: "Link sticker → /open-house.",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "story-primary-room",
    date: "2026-06-27",
    dayLabel: "Sat",
    title: "Story — Primary room",
    format: "story",
    pillar: "The Invitation",
    channel: "Instagram Story",
    images: [
      img(
        "story6-primary-room.png",
        "A wide view of the Primary room ready for its children — Primary opens August 2026, twelve seats.",
      ),
    ],
    caption: "A room ready for its children. (Eyebrow / support on image: Primary opens August 2026 · twelve seats.)",
    hashtags: "",
    cta: "",
    bioLink: "/lp/primary-2026",
    notes: 'Link sticker → /lp/primary-2026 ("Reserve a place").',
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },

  // ── BACKLOG (date null) ───────────────────────────────────────────────────
  {
    id: "toddler-carousel",
    date: null,
    title: "Carousel — Toddler Community (Practical Life)",
    format: "carousel",
    pillar: "The Prepared Environment",
    channel: "Instagram Carousel",
    images: [
      img(
        "tcarousel-s1-intro.png",
        "Intro card: Practical life — the real work of growing up in the Toddler Community.",
      ),
      img("tcarousel-s2-floor.png", "A child washing the floor with a bucket and sponge."),
      img("tcarousel-s3-table.png", "A child scrubbing a table, careful pass by careful pass."),
      img("tcarousel-s4-sweeping.png", "A child sweeping and sorting, tending the room."),
      img(
        "tcarousel-s5-fine-motor.png",
        "A child threading beads — the slow, precise work that prepares the hand and the eye.",
      ),
    ],
    caption:
      "In the Toddler Community, the work is real — and so is the focus it builds.\n\nWashing a floor, scrubbing a table, sweeping, threading bead by bead: small hands at purposeful work, made their size. The guides prepare the room and then step back, so each child can find their own steady concentration.\n\nSwipe through a few quiet moments of practical life, and come see it in person when you're ready.",
    hashtags: "",
    cta: "Schedule a tour — link in bio.",
    bioLink: "/open-house",
    notes:
      "Not yet scheduled — drag onto a date. Caption is a draft, review before approving.\n\nPer-slide bar text (from on-image copy):\n- Slide 1 (intro): Eyebrow: Practical life. / Headline: The real work of growing up. / Subline: In the Toddler Community, the work is real — and so is the focus it builds.\n- Slide 2 (floor washing): Washing the floor. A bucket, a sponge, and a child who means it — care for the room, made real.\n- Slide 3 (table scrubbing): Scrubbing the table. Each careful pass builds order, sequence, and a quiet kind of pride.\n- Slide 4 (sweeping / sorting): Sweeping and sorting. Small hands tend the room, and learn that their work belongs.\n- Slide 5 (fine motor: threading / beads): Threading, bead by bead. The slow, precise work that prepares the hand and the eye.",
    locked: false,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "ad-toddler-first-community",
    date: null,
    title: "Ad — Toddler: First Community",
    format: "ad",
    pillar: "Paid",
    channel: "Meta Ad",
    images: [
      img(
        "ad5-toddler-first-community.png",
        "Toddler ad creative: a child absorbed in a picture book in a round wooden reading nook — a calm, prepared Montessori room, ages 16–36 months.",
      ),
    ],
    caption:
      "For some children, school begins as a first community. Our Toddler Community on Capitol Hill welcomes children sixteen to thirty-six months into a calm, prepared environment where real work — pouring, reading, caring for the room — happens at their own pace. We enroll year-round, and you'll meet our founder on every tour.",
    hashtags: "",
    cta: "Learn More (or Book Now)",
    bioLink: "https://starlingmontessorischool.com/open-house",
    notes:
      "Headline: A first community, ages 16–36 mo.\nLink description: A calm Montessori Toddler Community on Capitol Hill. Reserve a tour.\nPaid — runs via the Meta ad set, not published from here. Reference only.",
    locked: true,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "ad-toddler-real-work",
    date: null,
    title: "Ad — Toddler: Real Work",
    format: "ad",
    pillar: "Paid",
    channel: "Meta Ad",
    images: [
      img(
        "ad6-toddler-real-work.png",
        "Toddler ad creative: a child peeling a clementine over a glass bowl, fully concentrated — real work, made their size, ages 16–36 months.",
      ),
    ],
    caption:
      "Peeling an orange. Pouring water. Wiping a table. In our Toddler Community, the work is real — and so is the concentration it builds. Children sixteen to thirty-six months, Capitol Hill, an AMI-trained guide and a prepared environment made just their size. Enrolling now. We'd love to show you the room.",
    hashtags: "",
    cta: "Learn More",
    bioLink: "https://starlingmontessorischool.com/open-house",
    notes:
      "Headline: Real work, made their size.\nLink description: Practical life for ages 16–36 months. Reserve a Capitol Hill tour.\nPaid — runs via the Meta ad set, not published from here. Reference only.",
    locked: true,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "ad-primary-stand-in-room",
    date: null,
    title: "Ad — Primary 2026: Stand in the Room",
    format: "ad",
    pillar: "Paid",
    channel: "Meta Ad",
    images: [
      img(
        "ad2-primary-stand-in-the-room.png",
        "Primary ad creative inviting families to stand in the room — Primary Classroom opens August 2026 on Capitol Hill, twelve seats, ages 3 to 6.",
      ),
    ],
    caption:
      "There's only one way to know if a school is right for your child: stand in the room. Our Primary Classroom opens August 2026 on Capitol Hill — twelve seats, ages three to six, led by an AMI-trained guide. Tours are small and unhurried, and you'll meet our founder directly. Reserve a time that works for you.",
    hashtags: "",
    cta: "Book Now",
    bioLink: "https://starlingmontessorischool.com/lp/primary-2026",
    notes:
      "Headline: Reserve your Primary tour.\nLink description: An authentic three-year Primary cycle. Visit the space and meet our founder.\nPaid — runs via the Meta ad set, not published from here. Reference only.",
    locked: true,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "ad-primary-prepared-environment",
    date: null,
    title: "Ad — Primary 2026: The Prepared Environment",
    format: "ad",
    pillar: "Paid",
    channel: "Meta Ad",
    images: [
      img(
        "ad4-primary-prepared-environment.png",
        "Primary ad creative showing the prepared environment — every material within reach, ages 3 to 6, twelve inaugural seats opening August 2026 on Capitol Hill.",
      ),
    ],
    caption:
      "A prepared environment is built for the child — every material within reach, every choice their own. Our Primary Classroom opens August 2026 on Capitol Hill, ages three to six, with twelve inaugural seats led by an AMI-trained guide. We're reserving tours now, while the class is still taking shape.",
    hashtags: "",
    cta: "Learn More",
    bioLink: "https://starlingmontessorischool.com/lp/primary-2026",
    notes:
      "Headline: Step inside our Primary room.\nLink description: Twelve seats, ages 3–6, AMI-trained guide. Reserve a Capitol Hill tour.\nPaid — runs via the Meta ad set, not published from here. Reference only.",
    locked: true,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },
  {
    id: "review-monica-alt",
    date: null,
    title: "Our People — parent review (alt, Monica)",
    format: "feed",
    pillar: "Our People",
    channel: "Instagram",
    images: [
      img(
        "post3b-parent-quote-monica.png",
        "An alternate cream quote card holding a verbatim parent review from Monica, held in reserve.",
      ),
    ],
    caption: "",
    hashtags: "",
    cta: "",
    bioLink: "/open-house",
    notes:
      "Alternate review card held in reserve. On-image quote is a verbatim parent review — confirm Monica's exact wording before scheduling. Do not edit the quote.",
    locked: true,
    status: "draft",
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  },

  // ── VISIT · OPEN HOUSE (July 2026) ────────────────────────────────────────
  {
    id: "openhouse-announce",
    date: "2026-06-30",
    dayLabel: "Tue",
    title: "Open House — July announcement (all 3 dates)",
    format: "feed",
    pillar: "Visit · Open House",
    channel: "Instagram + Facebook",
    images: [
      {
        full: "/social/openhouse-announce.png",
        thumb: "/social/thumbs/openhouse-announce.jpg",
        alt: "Starling Montessori open-house invitation card with three July dates: Sunday July 12 1–5pm, Saturday July 18 9am–1pm, Sunday July 19 1–5pm, at 201 4th St SE, Capitol Hill, Washington DC.",
      },
    ],
    caption:
      "Our doors are open this July.\n\nWe're hosting three open houses at our Capitol Hill classroom — a chance to walk the prepared environment, meet Fabienne and other families, and see what an unhurried Montessori morning really looks like.\n\nCome to whichever fits your family:\n• Sunday, July 12 · 1–5 pm\n• Saturday, July 18 · 9 am–1 pm\n• Sunday, July 19 · 1–5 pm\n\n201 4th St SE, Washington, DC. No appointment needed — just come by. Whether your little one is toddler-age or you're looking ahead to our Primary classroom opening this August, we'd love to meet you.\n\nQuestions? Send us a message or tap the link in our bio.",
    hashtags:
      "#StarlingMontessori #CapitolHillDC #WashingtonDC #MontessoriEducation #OpenHouse #DCParents #CapitolHillFamilies",
    cta: "No appointment needed — just come by. Details in bio.",
    bioLink: "/open-house",
    notes: "Publish now (announcement). Anchor post for all three July open houses.",
    locked: false,
    status: "draft",
    createdAt: "2026-06-30T12:00:00.000Z",
    updatedAt: "2026-06-30T12:00:00.000Z",
  },
  {
    id: "openhouse-jul12",
    date: "2026-07-11",
    dayLabel: "Sat",
    title: "Open House reminder — Sun Jul 12 (publish Jul 11)",
    format: "feed",
    pillar: "Visit · Open House",
    channel: "Instagram + Facebook",
    images: [
      {
        full: "/social/openhouse-jul12.png",
        thumb: "/social/thumbs/openhouse-jul12.jpg",
        alt: "Open-house reminder card: Sunday July 12, 1–5pm, Starling Montessori, 201 4th St SE, Capitol Hill, Washington DC.",
      },
    ],
    caption:
      "Tomorrow: our first open house.\n\nSunday, July 12, 1–5 pm at our Capitol Hill classroom. Come by anytime in the window — walk the room, meet Fabienne, and let your little one explore the materials at their own pace.\n\n201 4th St SE, Washington, DC. No appointment needed. We'd love to see you.",
    hashtags:
      "#StarlingMontessori #CapitolHillDC #OpenHouse #WashingtonDC #MontessoriToddler #DCParents",
    cta: "Drop in anytime — no appointment needed.",
    bioLink: "/open-house",
    notes: "Publish Sat Jul 11 (day before the Sun Jul 12 open house).",
    locked: false,
    status: "draft",
    createdAt: "2026-06-30T12:00:00.000Z",
    updatedAt: "2026-06-30T12:00:00.000Z",
  },
  {
    id: "openhouse-jul18",
    date: "2026-07-17",
    dayLabel: "Fri",
    title: "Open House reminder — Sat Jul 18 (publish Jul 17)",
    format: "feed",
    pillar: "Visit · Open House",
    channel: "Instagram + Facebook",
    images: [
      {
        full: "/social/openhouse-jul18.png",
        thumb: "/social/thumbs/openhouse-jul18.jpg",
        alt: "Open-house reminder card: Saturday July 18, 9am–1pm, Starling Montessori, Capitol Hill, Washington DC.",
      },
    ],
    caption:
      "This Saturday morning, the door is open.\n\nOpen house Saturday, July 18, 9 am–1 pm at our Capitol Hill classroom. A relaxed, unhurried visit — see the prepared environment, ask Fabienne anything, and picture your child here.\n\n201 4th St SE, Washington, DC. Drop in anytime, and bring your little one along.",
    hashtags:
      "#StarlingMontessori #CapitolHillDC #OpenHouse #WashingtonDC #MontessoriEducation #DCParents",
    cta: "Drop in anytime — no appointment needed.",
    bioLink: "/open-house",
    notes: "Publish Fri Jul 17 (day before the Sat Jul 18 open house).",
    locked: false,
    status: "draft",
    createdAt: "2026-06-30T12:00:00.000Z",
    updatedAt: "2026-06-30T12:00:00.000Z",
  },
  {
    id: "openhouse-jul19",
    date: "2026-07-18",
    dayLabel: "Sat",
    title: "Open House reminder — Sun Jul 19 (publish Jul 18)",
    format: "feed",
    pillar: "Visit · Open House",
    channel: "Instagram + Facebook",
    images: [
      {
        full: "/social/openhouse-jul19.png",
        thumb: "/social/thumbs/openhouse-jul19.jpg",
        alt: "Open-house reminder card: Sunday July 19, 1–5pm, Starling Montessori, Capitol Hill, Washington DC.",
      },
    ],
    caption:
      "One more chance to visit — tomorrow.\n\nOur last July open house is Sunday, July 19, 1–5 pm at our Capitol Hill classroom. If you've been meaning to come see Starling, this is the one. Walk the room, meet other families, and see what calm, child-led learning looks like.\n\n201 4th St SE, Washington, DC. No appointment needed. We'd love to meet you.",
    hashtags:
      "#StarlingMontessori #CapitolHillDC #OpenHouse #WashingtonDC #MontessoriEducation #CapitolHillFamilies",
    cta: "Drop in anytime — no appointment needed.",
    bioLink: "/open-house",
    notes:
      "Publish Sat Jul 18 (day before the Sun Jul 19 open house). Last July open house.",
    locked: false,
    status: "draft",
    createdAt: "2026-06-30T12:00:00.000Z",
    updatedAt: "2026-06-30T12:00:00.000Z",
  },
];

// Sort: dated posts ascending by date, backlog (date null) last. Ties broken by
// id for a stable order.
function sortPosts(posts: SocialPost[]): SocialPost[] {
  return [...posts].sort((a, b) => {
    if (a.date === null && b.date === null) return a.id.localeCompare(b.id);
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    if (a.date === b.date) return a.id.localeCompare(b.id);
    return a.date.localeCompare(b.date);
  });
}

// Final reel videos, attached at READ time only. Keeping these in code (rather
// than persisting them into the DB rows) means already-seeded posts on the live
// deployment pick them up with no migration — and the DB never stores a `videos`
// field. Served from public/social/videos/<id>.mp4.
const POST_VIDEOS: Record<string, PostVideo[]> = {
  "reel-toddler-room": [{ src: "/social/videos/reel-toddler-room.mp4", label: "Promo Video A — 15s cut (9×16)" }],
  "reel-windows": [{ src: "/social/videos/reel-windows.mp4", label: "Video C — 16s cut (9×16)" }],
};

// Decorate a post with its videos for RETURN only. Never call this on an object
// before writing it to the DB — the persisted row must not contain `videos`.
function withVideos(post: SocialPost): SocialPost {
  return { ...post, videos: POST_VIDEOS[post.id] ?? [] };
}

export async function listPosts(): Promise<SocialPost[]> {
  const posts = await dbGetArray<SocialPost>(POSTS_KEY);
  if (posts.length === 0) {
    // Seed the DB once on first run, then return the seed set.
    await withLock(POSTS_KEY, async () => {
      const current = await dbGetArray<SocialPost>(POSTS_KEY);
      if (current.length === 0) {
        await dbSetArray(POSTS_KEY, SEED_POSTS);
      }
    });
    return sortPosts(SEED_POSTS).map(withVideos);
  }
  // Backfill-on-read: the DB was seeded with an earlier SEED_POSTS set, so any
  // seed entries added to the code since then are missing from the stored array.
  // Append ONLY the missing seeds (diff by id) — never touch existing rows, so
  // user edits/status/reschedules are preserved. Generic: works for any future
  // additions to SEED_POSTS, not just a hardcoded id list.
  const existingIds = new Set(posts.map((p) => p.id));
  const missingSeeds = SEED_POSTS.filter((seed) => !existingIds.has(seed.id));
  if (missingSeeds.length > 0) {
    const merged = await withLock(POSTS_KEY, async () => {
      // Re-read inside the lock and re-diff to avoid races/duplicates with a
      // concurrent writer that may have already appended some of these seeds.
      const current = await dbGetArray<SocialPost>(POSTS_KEY);
      const currentIds = new Set(current.map((p) => p.id));
      const stillMissing = SEED_POSTS.filter((seed) => !currentIds.has(seed.id));
      if (stillMissing.length === 0) return current;
      const next = [...current, ...stillMissing];
      await dbSetArray(POSTS_KEY, next);
      return next;
    });
    return sortPosts(merged).map(withVideos);
  }
  return sortPosts(posts).map(withVideos);
}

export async function getPost(id: string): Promise<SocialPost | undefined> {
  const posts = await listPosts();
  return posts.find((p) => p.id === id);
}

export async function updatePostContent(
  id: string,
  patch: {
    title?: string;
    caption?: string;
    hashtags?: string;
    cta?: string;
    bioLink?: string;
    notes?: string;
  },
): Promise<SocialPost> {
  return withLock(POSTS_KEY, async () => {
    const posts = await dbGetArray<SocialPost>(POSTS_KEY);
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`updatePostContent: post not found: ${id}`);
    const now = new Date().toISOString();
    const existing = posts[idx];
    const updated: SocialPost = {
      ...existing,
      title: patch.title ?? existing.title,
      caption: patch.caption ?? existing.caption,
      hashtags: patch.hashtags ?? existing.hashtags,
      cta: patch.cta ?? existing.cta,
      bioLink: patch.bioLink ?? existing.bioLink,
      notes: patch.notes ?? existing.notes,
      updatedAt: now,
    };
    posts[idx] = updated;
    await dbSetArray(POSTS_KEY, posts);
    return withVideos(updated);
  });
}

export async function setPostStatus(
  id: string,
  status: PostStatus,
  author: SocialAuthor,
): Promise<SocialPost> {
  return withLock(POSTS_KEY, async () => {
    const posts = await dbGetArray<SocialPost>(POSTS_KEY);
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`setPostStatus: post not found: ${id}`);
    const now = new Date().toISOString();
    const existing = posts[idx];
    const updated: SocialPost = {
      ...existing,
      status,
      updatedAt: now,
    };
    if (status === "published") {
      updated.publishedAt = now;
      updated.publishedBy = author;
    } else {
      // Moving off "published" clears the publish stamp.
      delete updated.publishedAt;
      delete updated.publishedBy;
    }
    posts[idx] = updated;
    await dbSetArray(POSTS_KEY, posts);
    return withVideos(updated);
  });
}

export async function reschedulePost(id: string, date: string | null): Promise<SocialPost> {
  return withLock(POSTS_KEY, async () => {
    const posts = await dbGetArray<SocialPost>(POSTS_KEY);
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`reschedulePost: post not found: ${id}`);
    const now = new Date().toISOString();
    posts[idx] = { ...posts[idx], date, updatedAt: now };
    await dbSetArray(POSTS_KEY, posts);
    return withVideos(posts[idx]);
  });
}
