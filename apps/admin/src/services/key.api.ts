import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";

import { auth } from "@/lib/auth";

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
