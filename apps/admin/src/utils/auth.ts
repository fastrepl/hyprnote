import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sso } from "better-auth/plugins/sso";
import { reactStartCookies } from "better-auth/react-start";

import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  plugins: [
    sso(),
    reactStartCookies(),
  ],
  emailAndPassword: {
    enabled: true,
  },
});
