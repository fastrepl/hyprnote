import { ApplicationFunctionOptions, Probot } from "probot";

import { startDevinStatusPoller } from "./devin/index.js";
import {
  registerBotCiHandler,
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

  // Start the poller before registering handlers to avoid race conditions
  // where handlers might call getDevinStatusPoller() before it's initialized
  if (process.env.NODE_ENV !== "test") {
    startDevinStatusPoller(app);
  }

  registerBotCiHandler(app);
  registerDevinStatusHandler(app);
  registerFixMergeConflictHandler(app);
  registerPrClosedHandler(app);
};
