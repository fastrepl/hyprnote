import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { supabaseAuthMiddleware } from "../middleware/supabase";
import { API_TAGS } from "./constants";

const CanStartTrialResponseSchema = z.object({
  canStartTrial: z.boolean(),
  reason: z
    .enum(["eligible", "has_active_subscription", "had_recent_trial", "error"])
    .optional(),
});

export const rpc = new Hono<AppBindings>();

rpc.get(
  "/can-start-trial",
  describeRoute({
    tags: [API_TAGS.PRIVATE],
    responses: {
      200: {
        description: "result",
        content: {
          "application/json": {
            schema: resolver(CanStartTrialResponseSchema),
          },
        },
      },
    },
  }),
  supabaseAuthMiddleware,
  async (c) => {
    const supabase = c.get("supabaseClient");

    if (!supabase) {
      console.error("supabaseClient not attached by middleware");
      return c.json({ error: "Internal server error" }, 500);
    }

    const { data, error } = await supabase.rpc("can_start_trial");

    if (error) {
      console.error("can_start_trial RPC failed:", error);
      return c.json({ canStartTrial: false, reason: "error" });
    }

    const reason = data ? "eligible" : "has_active_subscription";
    return c.json({ canStartTrial: data as boolean, reason });
  },
);
