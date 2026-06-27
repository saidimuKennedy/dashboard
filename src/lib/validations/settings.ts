import { z } from "zod";

export const connectAiProviderSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, "API key is required.")
    .regex(/^sk-/, "DeepSeek API keys start with sk-."),
});
