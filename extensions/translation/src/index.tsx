import type { Extension } from "@hypr/extension-utils";

import LiveTranslation from "./widgets/live";

const extension: Extension = {
  live: LiveTranslation,
};

export default extension;
