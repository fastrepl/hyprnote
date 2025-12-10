import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver } from "hono-openapi/zod";
import { z } from "zod";

import type { AppBindings } from "../hono-bindings";
import { API_TAGS } from "./constants";

const HealthResponseSchema = z.object({
  status: z.string(),
});

export const health = new Hono<AppBindings>();

health.get(
  "/",
  describeRoute({
    tags: [API_TAGS.PRIVATE_SKIP_OPENAPI],
    responses: {
      200: {
        description: "result",
        content: {
          "application/json": {
            schema: resolver(HealthResponseSchema),
          },
        },
      },
    },
  }),
  (c) => c.json({ status: "ok" }, 200),
);
