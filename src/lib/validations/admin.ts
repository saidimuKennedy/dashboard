import { z } from "zod";

export const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
});

export const runJobSchema = z.object({
  job: z.enum(["scrape", "reindex", "embeddings", "report", "backup", "cleanup"]),
  params: z.record(z.string(), z.unknown()).optional(),
});
