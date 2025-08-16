import { Exa } from "exa-js";
import { z } from "zod";

import { env } from "./env.js";

export const exa = new Exa(env.EXA_API_KEY);

// https://docs.exa.ai/sdks/typescript-sdk-specification#searchandcontents-method
export const searchAndContentsInputSchema = z.object({
  query: z.string(),
  category: z
    .enum([
      "company",
      "news",
      "linkedin profile",
      "github",
      "tweet",
      "personal site",
    ])
    .optional(),
});
