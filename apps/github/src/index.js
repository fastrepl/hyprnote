export default (app, { getRouter }) => {
  const router = getRouter("/");

  router.get("/health", (req, res) => {
    res.send("OK");
  });

  app.on("issues.opened", async (context) => {
    const comment = context.issue({ body: "Thanks for opening this issue!" });
    return context.octokit.issues.createComment(comment);
  });
};
