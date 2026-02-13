import { commands as miscCommands } from "@hypr/plugin-misc";

import type { ContextEntity } from "../context-item";

export async function collectDeviceEntity(): Promise<
  Extract<ContextEntity, { kind: "device" }>
> {
  let deviceContext: Extract<ContextEntity, { kind: "device" }> = {
    kind: "device",
    key: "support:device",
  };

  try {
    const deviceContextResult = await miscCommands.getDeviceInfo(
      navigator.language || "en",
    );
    if (deviceContextResult.status === "ok") {
      deviceContext = {
        ...deviceContext,
        ...deviceContextResult.data,
      };
    }
  } catch (error) {
    console.error("Failed to collect device context:", error);
  }

  return deviceContext;
}
