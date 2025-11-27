import type { ComponentType } from "react";

import type { ExtensionViewProps } from "../../../../types/extensions";

const extensionModules = import.meta.glob<{
  default: ComponentType<ExtensionViewProps>;
}>("@extensions/*/ui.tsx", { eager: true });

export const extensionComponents: Record<
  string,
  ComponentType<ExtensionViewProps>
> = {};

for (const path in extensionModules) {
  const mod = extensionModules[path];
  const parts = path.split("/");
  const extensionId = parts[parts.length - 2];
  extensionComponents[extensionId] = mod.default;
}

export function getExtensionComponent(
  extensionId: string,
): ComponentType<ExtensionViewProps> | undefined {
  return extensionComponents[extensionId];
}

export function getAvailableExtensions(): string[] {
  return Object.keys(extensionComponents);
}
