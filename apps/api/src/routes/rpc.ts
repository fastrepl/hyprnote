import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { supabaseAuthMiddleware } from "../middleware/supabase";
import { API_TAGS } from "./constants";

const CanStartTrialResponseSchema = z.object({
  canStartTrial: z.boolean(),
});

export const rpc = new Hono<AppBindings>();

rpc.get(
  "/can-start-trial",
  describeRoute({
    tags: [API_TAGS.INTERNAL],
    responses: {
      200: {
        description: "result",
        content: {
          "application/json": { schema: resolver(CanStartTrialResponseSchema) },
        },
      },
    },
  }),
  supabaseAuthMiddleware,
  async (c) => {
    const supabase = c.get("supabaseClient")!;

    const { data, error } = await supabase.rpc("can_start_trial");

    if (error) {
      return c.json({ canStartTrial: false });
    }

    return c.json({ canStartTrial: data as boolean });
  },
);
