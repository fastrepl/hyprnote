import { createMiddleware, createServerFn, json } from "@tanstack/react-start";
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

export const userMiddlewareForRequest = createMiddleware({ type: "request" }).server(
  async ({ next }) => {
    const userSession = await getUserSession();
    return next({ context: { userSession } });
  },
);

export const userMiddlewareForFunction = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const userSession = await getUserSession();
    return next({ context: { userSession } });
  },
);

export const userRequiredMiddlewareForRequest = createMiddleware({ type: "request" })
  .middleware([userMiddlewareForRequest])
  .server(async ({ next, context }) => {
    if (!context.userSession) {
      throw json(
        { message: "You must be logged in to do that!" },
        { status: 401 },
      );
    }

    return next({ context: { userSession: context.userSession } });
  });

export const userRequiredMiddlewareForFunction = createMiddleware({ type: "function" })
  .middleware([userMiddlewareForFunction])
  .server(async ({ next, context }) => {
    if (!context.userSession) {
      throw json(
        { message: "You must be logged in to do that!" },
        { status: 401 },
      );
    }

    return next({ context: { userSession: context.userSession } });
  });
