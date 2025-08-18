import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { userRequiredMiddlewareForFunction } from "@/services/auth.api";

export const listApiKey = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();

    if (!request?.headers) {
      return null;
    }

    const apiKeys = await auth.api.listApiKeys({ headers: request.headers });
    return apiKeys;
  },
);

export const deleteApiKeys = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(z.string()) }))
  .handler(
    async ({ data }) => {
      const request = getWebRequest();

      if (!request?.headers) {
        return null;
      }

      await Promise.all(
        data.ids.map((id) => {
          auth.api.deleteApiKey({ headers: request.headers, body: { keyId: id } });
        }),
      );
    },
  );

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([userRequiredMiddlewareForFunction])
  .handler(
    async ({ context: { userSession } }) => {
      const request = getWebRequest();

      if (!request?.headers) {
        return null;
      }

      const apiKey = await auth.api.createApiKey({
        body: {
          prefix: "hypr_",
          name: "hyprnote_desktop_api_key",
          expiresIn: null,
          remaining: null,
          rateLimitTimeWindow: 1000 * 60 * 60 * 24 * 7,
          rateLimitMax: 700,
          rateLimitEnabled: true,
          userId: userSession.user.id,
        },
      });
      return apiKey;
    },
  );
