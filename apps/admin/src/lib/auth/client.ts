import { apiKeyClient, ssoClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [
    ssoClient(),
    organizationClient(),
    apiKeyClient(),
  ],
});
