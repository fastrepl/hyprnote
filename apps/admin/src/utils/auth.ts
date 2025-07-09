import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { reactStartCookies } from "better-auth/react-start";

import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  plugins: [
    username(),
    reactStartCookies(),
  ],
  emailAndPassword: {
    enabled: true,
  },
});
