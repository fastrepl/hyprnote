import { commands as windowsCommands } from "@hypr/plugin-windows";
import type { HyprWindow } from "@hypr/plugin-windows";

// Prevents crashes in URL scheme handler by ensuring window visibility before navigation
export const safeNavigate = async (
  window: HyprWindow,
  url: string,
  maxAttempts = 50,
): Promise<void> => {
  await windowsCommands.windowShow(window);
  let attempts = 0;

  const checkAndNavigate = async (): Promise<void> => {
    try {
      const isVisible = await windowsCommands.windowIsVisible(window);

      if (isVisible) {
        await windowsCommands.windowEmitNavigate(window, url);
        return;
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkAndNavigate, 100);
      } else {
        console.error("Max attempts reached waiting for window visibility");
      }
    } catch (err) {
      console.error("Error during safe navigation:", err);
    }
  };

  setTimeout(checkAndNavigate, 200);
};
