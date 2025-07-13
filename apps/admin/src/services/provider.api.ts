import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { llmProvider } from "@/lib/db/schema";
import { activeOrgRequiredMiddlewareForFunction, userRequiredMiddlewareForFunction } from "@/services/auth.api";

export const findLlmProvider = createServerFn()
  .validator(z.object({ model: z.string() }))
  .middleware([userRequiredMiddlewareForFunction])
  .handler(async ({ data, context: { userSession } }) => {
    const rows = await db.select().from(llmProvider).where(eq(llmProvider.organizationId, userSession.user.id));
    return rows.find((row) => row.model === data.model);
  });

export const listLlmProvider = createServerFn()
  .middleware([userRequiredMiddlewareForFunction, activeOrgRequiredMiddlewareForFunction])
  .handler(async ({ context: { activeOrganizationId } }) => {
    const rows = await db.select().from(llmProvider).where(
      eq(llmProvider.organizationId, activeOrganizationId),
    );
    return rows;
  });

export const insertLlmProvider = createServerFn()
  .validator(z.object({ name: z.string(), model: z.string(), baseUrl: z.string(), apiKey: z.string() }))
  .middleware([userRequiredMiddlewareForFunction, activeOrgRequiredMiddlewareForFunction])
  .handler(async ({ data, context: { activeOrganizationId } }) => {
    const rows = await db.insert(llmProvider).values({
      ...data,
      organizationId: activeOrganizationId,
    }).returning();
    return rows;
  });
