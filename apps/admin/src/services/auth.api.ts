import { createMiddleware, createServerFn, json } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { envServerSchema } from "@/envServer";
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

export const getActiveOrganizationFull = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();

    if (!request?.headers) {
      return null;
    }

    const userSession = await auth.api.getSession({ headers: request.headers });
    if (!userSession || !userSession.session.activeOrganizationId) {
      return null;
    }

    const org = await auth.api.getFullOrganization({
      headers: request.headers,
      query: {
        organizationId: userSession.session.activeOrganizationId,
      },
    });

    return org;
  },
);

export const getUserRole = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();

    if (!request?.headers) {
      return null;
    }

    const response = await auth.api.getActiveMember({ headers: request.headers });
    return response?.role;
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
    if (context.userSession?.session?.activeOrganizationId) {
      return next({
        context: {
          ...context,
          activeOrganizationId: context.userSession.session.activeOrganizationId,
        },
      });
    }

    // TODO: Assume only one organization per user
    const request = getWebRequest();
    const orgs = await auth.api.listOrganizations({ headers: request.headers });
    if (orgs.length > 0) {
      return next({
        context: {
          ...context,
          activeOrganizationId: orgs[0].id,
        },
      });
    }

    throw json(
      { message: "You must have an active organization!" },
      { status: 403 },
    );
  });
