import { commands as windowsCommands } from "@hypr/plugin-windows";
import type { HyprWindow } from "@hypr/plugin-windows";

/**
 * Safely navigate to a URL in a specific window type
 * This ensures the window is visible before attempting navigation
 * to prevent potential crashes in the URL scheme handler
 */
export const safeNavigate = async (
  window: HyprWindow,
  url: string,
  maxAttempts = 50
): Promise<void> => {
  // First ensure the window is shown
  await windowsCommands.windowShow(window);

  // Then check visibility before navigating
  let attempts = 0;
  
  const checkAndNavigate = async (): Promise<void> => {
    try {
      const isVisible = await windowsCommands.windowIsVisible(window);
      
      if (isVisible) {
        await windowsCommands.windowEmitNavigate(window, url);
        return;
      } else if (attempts < maxAttempts) {
        attempts++;
        // If not visible yet, check again after a short delay
        setTimeout(checkAndNavigate, 100);
      } else {
        console.error("Max attempts reached waiting for window visibility");
      }
    } catch (err) {
      console.error("Error during safe navigation:", err);
    }
  };

  // Start checking after a short initial delay
  setTimeout(checkAndNavigate, 200);
};
