import { ApplicationFunctionOptions, Probot } from "probot";

import { registerMergeableHandlers } from "./mergeable.js";

export default (app: Probot, { getRouter }: ApplicationFunctionOptions) => {
  if (getRouter) {
    const router = getRouter("/");

    router.get("/health", (_req, res) => {
      res.send("OK");
    });
  }

  registerMergeableHandlers(app);

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    await context.octokit.issues.createComment(issueComment);
  });
};
