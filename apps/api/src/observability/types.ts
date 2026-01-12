export type ObservabilityEvent = never;

export type Emitter = (event: ObservabilityEvent) => void;
