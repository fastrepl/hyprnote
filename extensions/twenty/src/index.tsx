import type { Extension } from "@hypr/extension-types";

import ApiKeyForm from "./config/api-key-form";
import Default from "./widgets/default";

export default {
  id: "@hypr/extension-twenty",
  widgetGroups: [Default],
  init: async () => {},
  configComponent: <ApiKeyForm />,
} satisfies Extension;
