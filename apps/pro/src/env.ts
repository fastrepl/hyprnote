import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

export const env = createEnv({
  runtimeEnv: process.env,
  server: {
    PORT: z.coerce.number().default(3000),
    EXA_API_KEY: z.string().min(1),
    OPENAI_DEFAULT_MODEL: z.string().min(1),
    OPENAI_BASE_URL: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    KEYGEN_ACCOUNT_ID: z.string().min(1),
    JINA_API_KEY: z.string().min(1),
  },
});
