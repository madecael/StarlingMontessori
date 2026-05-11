import { z } from "zod";

export const careerApplicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7).max(40),
  note: z.string().trim().max(5000).default(""),
  company: z.literal(""), // honeypot — must be empty
});

export type CareerApplication = z.infer<typeof careerApplicationSchema>;

export const ALLOWED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_CV_BYTES = 5 * 1024 * 1024; // 5MB

export const ALLOWED_CV_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;
