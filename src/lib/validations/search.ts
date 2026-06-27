import { z } from "zod";

export const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(["all", "knowledge", "research", "customers", "meetings"]).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});
