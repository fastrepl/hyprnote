import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { apiKey, organization } from "better-auth/plugins";
import { sso } from "better-auth/plugins/sso";
import { reactStartCookies } from "better-auth/react-start";

import { envServerSchema } from "@/env";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export * from "./client";

export const auth = betterAuth({
  baseURL: "http://localhost:3000",
  basePath: "/api/auth",
  secret: "TODO",
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  plugins: [
    apiKey({
      customAPIKeyGetter(ctx) {
        const has = ctx.request?.headers?.has("authorization");
        if (!has) {
          return null;
        }

        const authorization = ctx.request?.headers?.get("authorization");
        if (!authorization?.startsWith("Bearer ")) {
          return null;
        }

        return authorization?.slice(7) ?? null;
      },
    }),
    sso(),
    organization({
      allowUserToCreateOrganization: async (user) => {
        return user.email === envServerSchema.ADMIN_EMAIL;
      },
    }),
    reactStartCookies(),
  ],
  emailAndPassword: {
    enabled: true,
  },
});
