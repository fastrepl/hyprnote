import { ApplicationFunctionOptions, Probot } from "probot";

import { startDevinStatusPoller } from "./devin/index.js";
import {
  registerDevinStatusHandler,
  registerFixMergeConflictHandler,
  registerPrClosedHandler,
} from "./features/index.js";

export default (app: Probot, { getRouter }: ApplicationFunctionOptions) => {
  if (getRouter) {
    const router = getRouter("/");

    router.get("/health", (_req, res) => {
      res.send("OK");
    });
  }

  registerDevinStatusHandler(app);
  registerFixMergeConflictHandler(app);
  registerPrClosedHandler(app);

  startDevinStatusPoller(app);
};
