import { z } from "zod";

export const updateLayoutSchema = z.object({
  widgets: z.array(z.object({
    id: z.string(),
    type: z.string(),
    x: z.number().int(),
    y: z.number().int(),
    w: z.number().int(),
    h: z.number().int(),
  })),
});
