import type { ComponentType } from "react";

import { commands, type ExtensionInfo } from "@hypr/plugin-extensions";

import type { ExtensionViewProps } from "../../../../types/extensions";

const bundledExtensionModules = import.meta.glob<{
  default: ComponentType<ExtensionViewProps>;
}>("@extensions/*/ui.tsx", { eager: true });

export const bundledExtensionComponents: Record<
  string,
  ComponentType<ExtensionViewProps>
> = {};

for (const path in bundledExtensionModules) {
  const mod = bundledExtensionModules[path];
  const parts = path.split("/");
  const extensionId = parts[parts.length - 2];
  bundledExtensionComponents[extensionId] = mod.default;
}

const dynamicExtensionComponents: Record<
  string,
  ComponentType<ExtensionViewProps>
> = {};

export function getExtensionComponent(
  extensionId: string,
): ComponentType<ExtensionViewProps> | undefined {
  return (
    bundledExtensionComponents[extensionId] ||
    dynamicExtensionComponents[extensionId]
  );
}

export function getBundledExtensions(): string[] {
  return Object.keys(bundledExtensionComponents);
}

export async function listInstalledExtensions(): Promise<ExtensionInfo[]> {
  const result = await commands.listExtensions();
  if (result.status === "ok") {
    return result.data;
  }
  console.error("Failed to list extensions:", result.error);
  return [];
}

export async function getExtension(
  extensionId: string,
): Promise<ExtensionInfo | null> {
  const result = await commands.getExtension(extensionId);
  if (result.status === "ok") {
    return result.data;
  }
  return null;
}

export async function getExtensionsDir(): Promise<string | null> {
  const result = await commands.getExtensionsDir();
  if (result.status === "ok") {
    return result.data;
  }
  return null;
}
