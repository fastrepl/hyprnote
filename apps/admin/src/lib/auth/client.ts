import { createAuthClient } from "better-auth/react";

import { apiKeyClient, ssoClient } from "better-auth/client/plugins";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    ssoClient(),
    organizationClient(),
    apiKeyClient(),
  ],
});
