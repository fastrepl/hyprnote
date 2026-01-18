import { app } from "./app";
import { registerListeners } from "./listeners";

registerListeners(app);

(async () => {
  try {
    await app.start();
    console.log("Slack External app is running!");
  } catch (error) {
    console.error("Failed to start app:", error);
    process.exit(1);
  }
})();
