import { z } from "zod";

export const DraftEmailSchema = z.object({
  jobTitle: z.string(),
  companyName: z.string(),
  jobDescription: z.string(),
  applyUrl: z.string().optional(),
  location: z.string().optional(),
  userProfile: z.string(),
  source: z.string().optional(),
  userPrompt: z.string().optional(),
});