import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { llmProvider } from "@/lib/db/schema";
import { userRequiredMiddlewareForFunction } from "@/services/auth.api";

export const findLlmProvider = createServerFn()
  .validator(z.object({ model: z.string() }))
  .middleware([userRequiredMiddlewareForFunction])
  .handler(async ({ data, context: { userSession } }) => {
    const rows = await db.select().from(llmProvider).where(eq(llmProvider.userId, userSession.user.id));
    return rows.find((row) => row.model === data.model);
  });
