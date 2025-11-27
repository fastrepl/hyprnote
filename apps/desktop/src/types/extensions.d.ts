import type { ComponentType } from "react";

export interface ExtensionViewProps {
  extensionId: string;
  state?: Record<string, unknown>;
}
