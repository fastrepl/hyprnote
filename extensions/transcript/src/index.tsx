import type { Extension } from "@hypr/extension-utils";

import Default from "./widgets/default";
import Checkpoint from "./widgets/checkpoint";

const extension: Extension = {
  default: Default,
  checkpoint: Checkpoint,
};

export default extension;
