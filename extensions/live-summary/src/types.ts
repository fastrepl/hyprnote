import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const liveSummaryResponseSchema = z.object({
  blocks: z.array(
    z.object({
      points: z.array(z.string()),
    }),
  ),
});

export const liveSummaryResponseJsonSchema = zodToJsonSchema(
  liveSummaryResponseSchema,
  "live_summary",
);

export type LiveSummaryResponse = z.infer<typeof liveSummaryResponseSchema>;
