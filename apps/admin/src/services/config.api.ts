import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationConfig } from "@/lib/db/schema/config";

export const getOrganizationConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getWebRequest();

    if (!request?.headers) {
      return null;
    }

    const userSession = await auth.api.getSession({ headers: request.headers });
    if (!userSession || !userSession.session.activeOrganizationId) {
      return null;
    }

    const config = await db
      .select()
      .from(organizationConfig)
      .where(eq(organizationConfig.organizationId, userSession.session.activeOrganizationId))
      .limit(1);

    if (!config || config.length === 0) {
      return null;
    }

    return config[0];
  },
);

export const upsertOrganizationConfig = createServerFn({ method: "POST" })
  .validator(z.object({
    baseUrl: z.string().url(),
  }))
  .handler(
    async ({ data }) => {
      const request = getWebRequest();

      if (!request?.headers) {
        return null;
      }

      const userSession = await auth.api.getSession({ headers: request.headers });
      if (!userSession || !userSession.session.activeOrganizationId) {
        return null;
      }

      await db.insert(organizationConfig).values({
        organizationId: userSession.session.activeOrganizationId,
        baseUrl: data.baseUrl,
      }).onConflictDoUpdate({
        target: organizationConfig.organizationId,
        set: {
          baseUrl: data.baseUrl,
        },
      });

      const [updatedConfig] = await db
        .select()
        .from(organizationConfig)
        .where(eq(organizationConfig.organizationId, userSession.session.activeOrganizationId))
        .limit(1);

      return updatedConfig || null;
    },
  );
