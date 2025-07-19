import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { llmProvider } from "@/lib/db/schema";
import { activeOrgRequiredMiddlewareForFunction, userRequiredMiddlewareForFunction } from "@/services/auth.api";

export const findLlmProvider = createServerFn()
  .validator(z.object({ name: z.string(), model: z.string() }))
  .middleware([userRequiredMiddlewareForFunction, activeOrgRequiredMiddlewareForFunction])
  .handler(async ({ data, context: { activeOrganizationId } }) => {
    const rows = await db.select().from(llmProvider).where(eq(llmProvider.organizationId, activeOrganizationId));
    return rows.find((row) => row.name === data.name && row.model === data.model);
  });

export const listLlmProvider = createServerFn()
  .middleware([userRequiredMiddlewareForFunction, activeOrgRequiredMiddlewareForFunction])
  .handler(async ({ context: { activeOrganizationId } }) => {
    const rows = await db.select().from(llmProvider).where(
      eq(llmProvider.organizationId, activeOrganizationId),
    );
    return rows;
  });

export const deleteLlmProvider = createServerFn()
  .validator(z.object({ id: z.string() }))
  .middleware([userRequiredMiddlewareForFunction, activeOrgRequiredMiddlewareForFunction])
  .handler(async ({ data, context: { activeOrganizationId } }) => {
    const rows = await db.delete(llmProvider).where(
      and(
        eq(llmProvider.organizationId, activeOrganizationId),
        eq(llmProvider.id, data.id),
      ),
    ).returning();
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

export const updateLlmProvider = createServerFn()
  .validator(z.object({ id: z.string(), name: z.string(), model: z.string(), baseUrl: z.string(), apiKey: z.string() }))
  .middleware([userRequiredMiddlewareForFunction, activeOrgRequiredMiddlewareForFunction])
  .handler(async ({ data, context: { activeOrganizationId } }) => {
    const { id, ...updateData } = data;
    const rows = await db.update(llmProvider)
      .set(updateData)
      .where(
        and(
          eq(llmProvider.organizationId, activeOrganizationId),
          eq(llmProvider.id, id),
        ),
      )
      .returning();
    return rows;
  });
