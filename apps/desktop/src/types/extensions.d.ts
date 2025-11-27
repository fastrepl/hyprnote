import type { ComponentType } from "react";

export interface ExtensionViewProps {
  extensionId: string;
  state?: Record<string, unknown>;
}

declare module "@extensions/*/ui" {
  const Component: ComponentType<ExtensionViewProps>;
  export default Component;
  export type { ExtensionViewProps };
}
