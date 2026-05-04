import { defineCollection, z } from "astro:content";

const imagePath = z
  .string()
  .regex(/^\/images\//, "image path must start with /images/");

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
    heroPhoto: imagePath,
    heroAlt: z.string().optional(),
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
          imageSlots: z.array(z.union([z.string().startsWith("["), imagePath])),
          disclosure: z.string(),
        }),
        z.object({
          type: z.literal("founderCard"),
          eyebrow: z.string(),
          quote: z.string(),
          attribution: z.string(),
          photo: imagePath.optional(),
        }),
        z.object({
          type: z.literal("photoStrip"),
          photos: z.array(imagePath).min(2).max(6),
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

const pages = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string().optional(),  // for sitemap + canonicals (Astro reserves `slug` from frontmatter)
    hero: z
      .object({
        eyebrow: z.string().optional(),
        headline: z.string(),
        headlineHighlight: z.string().optional(),
        subhead: z.string().optional(),
        photo: imagePath.optional(),
        photoAlt: z.string().optional(),
        ctas: z.array(cta).max(2).optional(),
      })
      .optional(),
    blocks: z.array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("valuePillars"),
          eyebrow: z.string().optional(),
          pillars: z.array(z.object({ label: z.string(), body: z.string() })).min(2).max(6),
        }),
        z.object({
          type: z.literal("programSplit"),
          eyebrow: z.string(),
          title: z.string(),
          programs: z.array(
            z.object({
              eyebrow: z.string(),
              title: z.string(),
              ages: z.string(),
              body: z.string(),
              photo: imagePath,
              photoAlt: z.string(),
              cta: cta,
              badge: z.string().optional(),
              dark: z.boolean().default(false),
            }),
          ).length(2),
        }),
        z.object({
          type: z.literal("quote"),
          quote: z.string(),
          attribution: z.string(),
        }),
        z.object({
          type: z.literal("founderApproach"),
          eyebrow: z.string(),
          title: z.string(),
          paragraphs: z.array(z.string()).min(1).max(4),
          photo: imagePath.optional(),
          photoAlt: z.string().optional(),
          cta: cta.optional(),
        }),
        z.object({
          type: z.literal("photoStrip"),
          photos: z.array(imagePath).min(2).max(6),
        }),
        z.object({
          type: z.literal("enrollCTA"),
          eyebrow: z.string(),
          title: z.string(),
          body: z.string().optional(),
          primary: cta,
          secondary: cta.optional(),
        }),
        z.object({
          type: z.literal("dailyRhythm"),
          eyebrow: z.string(),
          title: z.string(),
          steps: z.array(z.object({ time: z.string(), label: z.string(), body: z.string() })),
        }),
        z.object({
          type: z.literal("materialsGrid"),
          eyebrow: z.string(),
          title: z.string(),
          categories: z.array(z.object({ name: z.string(), examples: z.array(z.string()) })),
        }),
        z.object({
          type: z.literal("threeYearCycle"),
          eyebrow: z.string(),
          title: z.string(),
          intro: z.string(),
          years: z.array(z.object({ age: z.string(), label: z.string(), body: z.string() })).length(3),
        }),
        z.object({
          type: z.literal("processTimeline"),
          eyebrow: z.string(),
          title: z.string(),
          steps: z.array(z.object({ label: z.string(), body: z.string() })),
        }),
        z.object({
          type: z.literal("contactCard"),
          eyebrow: z.string().optional(),
          title: z.string().optional(),
        }),
        z.object({
          type: z.literal("openHouseList"),
          eyebrow: z.string(),
          title: z.string(),
          intro: z.string().optional(),
          sessions: z.array(z.object({ date: z.string(), time: z.string(), location: z.string(), spotsLeft: z.number().optional() })),
        }),
        z.object({
          type: z.literal("faqAccordion"),
          eyebrow: z.string(),
          title: z.string(),
          categories: z.array(z.object({ category: z.string(), questions: z.array(z.object({ q: z.string(), a: z.string() })) })),
        }),
        z.object({
          type: z.literal("tuitionFraming"),
        }),
        z.object({
          type: z.literal("richBody"),  // for paragraphs of free text
          body: z.string(),
        }),
      ]),
    ),
  }),
});

export const collections = { settings, landing, pages };
