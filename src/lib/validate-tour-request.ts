import { z } from "zod";

export const tourRequestSchema = z.object({
  parentName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  childAge: z.string().trim().min(1).max(100),
  preferredWeek: z.string().trim().max(200).default(""),
  relocating: z.string().trim().max(200).default(""),
  currentMontessori: z.string().trim().max(300).default(""),
  page: z.string().trim().min(1).max(100),
  company: z.literal(""), // honeypot — must be empty
});

export type TourRequest = z.infer<typeof tourRequestSchema>;
