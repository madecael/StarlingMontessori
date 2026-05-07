import { z } from "zod";

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  subject: z.string().trim().max(300).default(""),
  message: z.string().trim().min(1).max(5000),
  company: z.literal(""), // honeypot
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
