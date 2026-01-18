import { setupCheckpointer } from "./agent";
import { app } from "./app";
import { registerListeners } from "./listeners";

registerListeners(app);

const healthServer = Bun.serve({
  port: 8080,
  fetch(req) {
    if (new URL(req.url).pathname === "/health") {
      return new Response("ok");
    }
    return new Response("not found", { status: 404 });
  },
});

(async () => {
  try {
    await setupCheckpointer();
    await app.start();
    console.log("Slack Internal app is running!");
    console.log(`Health server listening on port ${healthServer.port}`);
  } catch (error) {
    console.error("Failed to start app:", error);
    process.exit(1);
  }
})();
