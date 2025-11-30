import { z } from "zod";

export const envSchema = z.object({
  RESTATE_IDENTITY_KEY: z.string().optional(),
  RESTATE_INGRESS_URL: z.url(),
  DEEPGRAM_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;
