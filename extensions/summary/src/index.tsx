import type { Extension } from "@hypr/extension-utils";

import { init } from "./widgets/live/init";
import LiveSummary2x2 from "./widgets/live/2x2";

const extension: Extension = {
  live: [
    {
      id: "summary-live-2x2",
      init,
      component: LiveSummary2x2,
    },
  ],
};

export default extension;
