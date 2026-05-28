import { z } from "zod";

export const roadmapRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  startDate: z.enum(["summer_2026", "fall_2026", "fall_2027", "exploring"]),
  childAge: z.enum(["18_24m", "2_3", "3_4", "4_5", "5_plus"]),
  schedule: z.enum(["half_day", "full_day", "flexible", "not_sure"]),
  visitsSoFar: z.enum(["none", "1_2", "three_plus", "online_only"]),
  montessoriInterest: z.enum(["sold", "curious_comparing", "open_multiple", "prefer_other"]),
  topConcern: z.enum(["right_fit", "timing", "cost", "separation", "all"]),
  zip: z.string().trim().min(3).max(10),
  company: z.literal(""), // honeypot
});

export type RoadmapRequest = z.infer<typeof roadmapRequestSchema>;
