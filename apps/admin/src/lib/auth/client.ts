import { apiKeyClient, ssoClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  basePath: "/api/auth",
  plugins: [
    ssoClient(),
    organizationClient(),
    apiKeyClient(),
  ],
});
