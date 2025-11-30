import { ApplicationFunctionOptions, Probot } from "probot";

export default (app: Probot, { getRouter }: ApplicationFunctionOptions) => {
  const router = getRouter!("/");

  router.get("/health", (_req, res) => {
    res.send("OK");
  });

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    await context.octokit.issues.createComment(issueComment);
  });
};
