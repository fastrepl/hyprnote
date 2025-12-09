type LLMRequestSuccess = {
  type: "llm.request.success";
  userId: string | undefined;
  model: string;
  durationMs: number;
  tokens?: { input: number; output: number };
};

type LLMRequestError = {
  type: "llm.request.error";
  userId: string | undefined;
  model: string;
  error: Error;
  durationMs: number;
};

type LLMStreamComplete = {
  type: "llm.stream.complete";
  userId: string | undefined;
  model: string;
  durationMs: number;
};

type STTBatchSuccess = {
  type: "stt.batch.success";
  userId: string | undefined;
  provider: string;
  durationMs: number;
};

type STTBatchError = {
  type: "stt.batch.error";
  userId: string | undefined;
  provider: string;
  error: Error;
  durationMs: number;
};

type STTWebsocketConnected = {
  type: "stt.websocket.connected";
  userId: string | undefined;
  provider: string;
};

type STTWebsocketDisconnected = {
  type: "stt.websocket.disconnected";
  userId: string | undefined;
  provider: string;
  durationMs: number;
};

type STTWebsocketError = {
  type: "stt.websocket.error";
  userId: string | undefined;
  provider: string;
  error: Error;
};

export type LLMEvent = LLMRequestSuccess | LLMRequestError | LLMStreamComplete;

export type STTEvent =
  | STTBatchSuccess
  | STTBatchError
  | STTWebsocketConnected
  | STTWebsocketDisconnected
  | STTWebsocketError;

export type ObservabilityEvent = LLMEvent | STTEvent;

export type Emitter = (event: ObservabilityEvent) => void;
