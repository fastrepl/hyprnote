import { createMiddleware, createServerFn, json } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { envServerSchema } from "@/env";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";

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

export const adminCreated = createServerFn({ method: "POST" }).handler(
  async () => {
    const organizations = await db.select().from(organization).where(eq(organization.slug, envServerSchema.ORG_SLUG));
    return organizations.length > 0;
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

export const activeOrgRequiredMiddlewareForFunction = createMiddleware({ type: "function" })
  .middleware([userRequiredMiddlewareForFunction])
  .server(async ({ next, context }) => {
    if (!context.userSession?.session?.activeOrganizationId) {
      throw json(
        { message: "You must have an active organization!" },
        { status: 403 },
      );
    }

    return next({
      context: {
        userSession: context.userSession,
        activeOrganizationId: context.userSession.session.activeOrganizationId,
      },
    });
  });
