import { defineCollection, z } from "astro:content";

const cta = z.object({
  label: z.string(),
  href: z.string(),
  variant: z.enum(["primary", "pearly", "outline", "ghost"]).default("primary"),
});

const settings = defineCollection({
  type: "content",
  schema: z.object({
    schoolName: z.string(),
    phone: z.string(),
    email: z.string().email(),
    address: z.object({
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    }),
    calendlyUrl: z.string().url().optional(),
    ga4Id: z.string().optional(),
    googleAdsConversionId: z.string().optional(),
    googleAdsConversionLabel: z.string().optional(),
    resendFromAddress: z.string().email(),
    tourEmailRecipient: z.string().email(),
  }),
});

const landing = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    persona: z.enum(["sarah", "davidmaya"]),
    eyebrow: z.string(),
    heroHeadline: z.string(),
    heroHeadlineHighlight: z.string().optional(),
    heroSubhead: z.string(),
    heroPhoto: z.string(),
    heroLocation: z.string(),
    heroCTAs: z.array(cta).min(1).max(2),
    blocks: z.array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("trustStrip"), items: z.array(z.string()) }),
        z.object({
          type: z.literal("comparisonCards"),
          eyebrow: z.string(),
          title: z.string(),
          cards: z.array(z.object({ label: z.string(), title: z.string(), body: z.string(), highlight: z.boolean().default(false) })),
        }),
        z.object({
          type: z.literal("comparisonTable"),
          eyebrow: z.string(),
          title: z.string(),
          columns: z.array(z.string()),
          rows: z.array(z.object({ label: z.string(), values: z.array(z.string()) })),
          footnote: z.string().optional(),
        }),
        z.object({
          type: z.literal("amiContinuity"),
          eyebrow: z.string(),
          title: z.string(),
          steps: z.array(z.object({ title: z.string(), body: z.string() })),
        }),
        z.object({
          type: z.literal("relocatorsPanel"),
          eyebrow: z.string(),
          title: z.string(),
          body: z.string(),
          benefits: z.array(z.string()),
          cta: cta,
        }),
        z.object({
          type: z.literal("timeline"),
          eyebrow: z.string(),
          title: z.string(),
          steps: z.array(z.object({ label: z.string(), period: z.string(), final: z.boolean().default(false) })),
        }),
        z.object({
          type: z.literal("spaceShowcase"),
          eyebrow: z.string(),
          title: z.string(),
          body: z.string(),
          imageSlots: z.array(z.string()),
          disclosure: z.string(),
        }),
        z.object({
          type: z.literal("founderCard"),
          eyebrow: z.string(),
          quote: z.string(),
          attribution: z.string(),
          photo: z.string().optional(),
        }),
        z.object({
          type: z.literal("photoStrip"),
          photos: z.array(z.string()).min(2).max(6),
        }),
        z.object({
          type: z.literal("tuitionFraming"),
        }),
        z.object({
          type: z.literal("tourForm"),
          eyebrow: z.string(),
          title: z.string(),
          subtitle: z.string(),
          extraFields: z.array(z.enum(["relocating", "currentMontessori"])).default([]),
          submitLabel: z.string().default("Send request"),
        }),
        z.object({
          type: z.literal("faqAccordion"),
          eyebrow: z.string(),
          title: z.string(),
          questions: z.array(z.object({ q: z.string(), a: z.string() })),
        }),
      ]),
    ),
  }),
});

export const collections = { settings, landing };
