import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor } from "@tauri-apps/api/window";
import { useCallback, useState } from "react";

const appWindow = getCurrentWebviewWindow();

const COLLAPSED_SIZE = { width: 80, height: 80 };
const EXPANDED_SIZE = { width: 400, height: 500 };

export function useWidgetState() {
  const [isExpanded, setIsExpanded] = useState(false);

  const expand = useCallback(async () => {
    const monitor = await currentMonitor();
    if (!monitor) return;

    const { width: screenWidth, height: screenHeight } = monitor.size;
    const { x: screenX, y: screenY } = monitor.position;

    const x = screenX + screenWidth - EXPANDED_SIZE.width - 20;
    const y = screenY + screenHeight - EXPANDED_SIZE.height - 20;

    await appWindow.setSize(
      new PhysicalSize(EXPANDED_SIZE.width, EXPANDED_SIZE.height),
    );
    await appWindow.setPosition(new PhysicalPosition(x, y));
    setIsExpanded(true);
  }, []);

  const collapse = useCallback(async () => {
    const monitor = await currentMonitor();
    if (!monitor) return;

    const { width: screenWidth, height: screenHeight } = monitor.size;
    const { x: screenX, y: screenY } = monitor.position;

    const x = screenX + screenWidth - COLLAPSED_SIZE.width - 20;
    const y = screenY + screenHeight - COLLAPSED_SIZE.height - 20;

    await appWindow.setSize(
      new PhysicalSize(COLLAPSED_SIZE.width, COLLAPSED_SIZE.height),
    );
    await appWindow.setPosition(new PhysicalPosition(x, y));
    setIsExpanded(false);
  }, []);

  return { isExpanded, expand, collapse };
}
