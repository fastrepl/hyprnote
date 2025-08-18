import { createServerFn } from "@tanstack/react-start";

import { envServerSchema } from "@/envServer";
import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";

export const orgCreated = createServerFn({ method: "POST" }).handler(
  async () => {
    const organizations = await db.select().from(organization);
    return organizations.some((org) => org.slug === envServerSchema.ORG_SLUG);
  },
);
