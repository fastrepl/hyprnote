import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { apiKey, organization } from "better-auth/plugins";
import { sso } from "better-auth/plugins/sso";
import { reactStartCookies } from "better-auth/react-start";

import { envServerSchema } from "@/envServer";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export * from "./client";

export const auth = betterAuth({
  basePath: "/api/auth",
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  plugins: [
    // 'customAPIKeyGetter' not work
    apiKey({
      customAPIKeyGetter: (req) => {
        if (!req.headers) {
          return null;
        }
        const bearerToken = req.headers.get("Authorization");
        if (!bearerToken) {
          return null;
        }

        return bearerToken.replace("Bearer ", "");
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
