import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";

import { userRequiredMiddlewareForRequest } from "@/services/auth.api";
import { getEnv } from "@/services/env.api";
import { listLlmProvider } from "@/services/provider.api";

// https://platform.openai.com/docs/api-reference/models
export const ServerRoute = createServerFileRoute("/v1/models")
  .methods((api) => ({
    GET: api.middleware([userRequiredMiddlewareForRequest]).handler(async ({ request, context }) => {
      const ORG_SLUG = await getEnv({ data: { key: "ORG_SLUG" } }) as string;
      const providers = await listLlmProvider();

      return json({
        "object": "list",
        "data": providers.map((provider) => ({
          "id": `${provider.name}/${provider.model}`,
          "object": "model",
          "created": provider.createdAt,
          "owned_by": ORG_SLUG,
        })),
      });
    }),
  }));
