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
    tags: [API_TAGS.PRIVATE],
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
    const supabase = c.get("supabaseClient");
    if (!supabase) {
      return c.json({ error: "Supabase client missing" }, 500);
    }

    const { data, error } = await supabase.rpc("can_start_trial");

    if (error) {
      console.error("Supabase RPC error (can_start_trial):", {
        message: error.message,
        details: error.details,
      });
      return c.json({ error: "Internal server error" }, 500);
    }

    if (typeof data !== "boolean") {
      console.error("Unexpected RPC response type (can_start_trial):", {
        expectedType: "boolean",
        actualType: typeof data,
        payload: data,
      });
      return c.json({ error: "Unexpected response from database" }, 502);
    }

    return c.json({ canStartTrial: data });
  },
);
