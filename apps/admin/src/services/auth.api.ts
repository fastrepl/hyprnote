import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";

import { auth } from "@/lib/auth";

export const getUserSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();

    if (!request?.headers) {
      return null;
    }

    const userSession = await auth.api.getSession({ headers: request.headers });
    return userSession;
  },
);
