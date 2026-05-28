import { z } from "zod";

export const guideRequestSchema = z.object({
  parentName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  zip: z.string().trim().max(10).optional().default(""),
  relocating: z.string().trim().max(200).default(""),
  childAge: z.string().trim().max(100).default(""),
  company: z.literal(""), // honeypot — must be empty
});

export type GuideRequest = z.infer<typeof guideRequestSchema>;
