import { ApplicationFunctionOptions, Probot } from "probot";

import {
  registerFixMergeConflictHandler,
  registerPrClosedHandler,
} from "./features";

export default (app: Probot, { getRouter }: ApplicationFunctionOptions) => {
  if (getRouter) {
    const router = getRouter("/");

    router.get("/health", (_req, res) => {
      res.send("OK");
    });
  }

  registerFixMergeConflictHandler(app);
  registerPrClosedHandler(app);
};
