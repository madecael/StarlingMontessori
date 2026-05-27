import { promises as fs } from "node:fs";
import path from "node:path";

export interface GoogleReview {
  authorName: string;
  authorUri?: string;
  authorPhotoUri?: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime?: string;
}

export interface GoogleReviewsData {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews: GoogleReview[];
  fetchedAt: string;
}

const CACHE_PATH = path.join(process.cwd(), ".data", "google-reviews.json");
const PLACES_BASE = "https://places.googleapis.com/v1/places";
const FIELD_MASK = "id,displayName,rating,userRatingCount,googleMapsUri,reviews";

async function readCache(): Promise<GoogleReviewsData | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    return JSON.parse(raw) as GoogleReviewsData;
  } catch {
    return null;
  }
}

async function writeCache(data: GoogleReviewsData): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await fs.writeFile(CACHE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.warn("[google-reviews] failed to write cache:", (e as Error).message);
  }
}

type PlacesApiResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: Array<{
    rating?: number;
    relativePublishTimeDescription?: string;
    publishTime?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: {
      displayName?: string;
      uri?: string;
      photoUri?: string;
    };
  }>;
};

function normalize(raw: PlacesApiResponse): GoogleReviewsData {
  const reviews: GoogleReview[] = (raw.reviews ?? [])
    .map((r) => ({
      authorName: r.authorAttribution?.displayName ?? "Google user",
      authorUri: r.authorAttribution?.uri,
      authorPhotoUri: r.authorAttribution?.photoUri,
      rating: r.rating ?? 0,
      text: (r.text?.text ?? r.originalText?.text ?? "").trim(),
      relativeTime: r.relativePublishTimeDescription ?? "",
      publishTime: r.publishTime,
    }))
    .filter((r) => r.text.length > 0);
  return {
    rating: raw.rating,
    userRatingCount: raw.userRatingCount,
    googleMapsUri: raw.googleMapsUri,
    reviews,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getGoogleReviews(placeId: string | undefined): Promise<GoogleReviewsData | null> {
  if (!placeId) return readCache();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("[google-reviews] GOOGLE_PLACES_API_KEY not set; falling back to cache");
    return readCache();
  }
  try {
    const res = await fetch(`${PLACES_BASE}/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
        accept: "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[google-reviews] Places API ${res.status}: ${body.slice(0, 200)}`);
      return readCache();
    }
    const raw = (await res.json()) as PlacesApiResponse;
    const data = normalize(raw);
    await writeCache(data);
    return data;
  } catch (e) {
    console.warn("[google-reviews] fetch failed:", (e as Error).message);
    return readCache();
  }
}
