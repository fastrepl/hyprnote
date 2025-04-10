export * from "./bindings.gen";

export type State =
  | "__LISTENER_TODO__inactive"
  | "__LISTENER_TODO__running_active"
  | "__LISTENER_TODO__running_paused";
