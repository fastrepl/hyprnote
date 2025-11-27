export * from "./bindings.gen";

export interface ExtensionViewProps {
  extensionId: string;
  state?: Record<string, unknown>;
}
