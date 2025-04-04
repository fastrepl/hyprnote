import type { Extension } from "@hypr/extension-types";

import { commands as authCommands } from "@hypr/plugin-auth";
import ApiKeyForm from "./config/api-key-form";
import Default from "./widgets/default";

export default {
  id: "@hypr/extension-twenty",
  widgetGroups: [Default],
  init: async () => {
    const userId = await authCommands.getFromStore("auth-user-id");
    if (userId) {
      authCommands.initVault(userId);
    }
  },
  configComponent: <ApiKeyForm />,
} satisfies Extension;
