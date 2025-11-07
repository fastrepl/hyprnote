import { Effect, Exit } from "effect";
import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import {
  type BatchParams,
  type BatchResponse,
  commands as listenerCommands,
  events as listenerEvents,
  type SessionEvent,
  type SessionParams,
  type StreamResponse,
} from "@hypr/plugin-listener";
import { fromResult } from "../../../effect";

import type { BatchActions } from "./batch";
import type { HandlePersistCallback, TranscriptActions } from "./transcript";

type LiveSessionStatus = Extract<SessionEvent["type"], "inactive" | "running_active" | "finalizing">;
export type SessionMode = LiveSessionStatus | "running_batch";

export type GeneralState = {
  sessionEventUnlisten?: () => void;
  loading: boolean;
  status: LiveSessionStatus;
  amplitude: { mic: number; speaker: number };
  seconds: number;
  intervalId?: NodeJS.Timeout;
  sessionId: string | null;
  muted: boolean;
  sessionModes: Record<string, SessionMode>;
};

export type GeneralActions = {
  start: (
    params: SessionParams,
    options?: { handlePersist?: HandlePersistCallback },
  ) => void;
  stop: () => void;
  setMuted: (value: boolean) => void;
  runBatch: (
    params: BatchParams,
    options?: { handlePersist?: HandlePersistCallback; sessionId?: string },
  ) => Promise<void>;
  setSessionMode: (sessionId: string, mode: SessionMode) => void;
  getSessionMode: (sessionId: string) => SessionMode;
  isSessionLive: (sessionId: string) => boolean;
  isSessionRunningBatch: (sessionId: string) => boolean;
};

const initialState: GeneralState = {
  status: "inactive",
  loading: false,
  amplitude: { mic: 0, speaker: 0 },
  seconds: 0,
  sessionId: null,
  muted: false,
  sessionModes: {},
};

const listenToSessionEvents = (
  onEvent: (payload: any) => void,
): Effect.Effect<() => void, unknown> =>
  Effect.tryPromise({
    try: () => listenerEvents.sessionEvent.listen(({ payload }) => onEvent(payload)),
    catch: (error) => error,
  });

const startSessionEffect = (params: SessionParams) => fromResult(listenerCommands.startSession(params));
const stopSessionEffect = () => fromResult(listenerCommands.stopSession());

export const createGeneralSlice = <T extends GeneralState & GeneralActions & TranscriptActions & BatchActions>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): GeneralState & GeneralActions => ({
  ...initialState,
  start: (params: SessionParams, options) => {
    const targetSessionId = params.session_id;

    if (!targetSessionId) {
      console.error("[listener] 'start' requires a session_id");
      return;
    }

    const currentMode = get().getSessionMode(targetSessionId);
    if (currentMode === "running_batch") {
      console.warn(`[listener] cannot start live session while batch processing session ${targetSessionId}`);
      return;
    }

    set((state) =>
      mutate(state, (draft) => {
        draft.loading = true;
        draft.sessionId = targetSessionId;
      })
    );

    if (options?.handlePersist) {
      get().setTranscriptPersist(options.handlePersist);
    }

    const handleSessionEvent = (payload: any) => {
      if (payload.type === "audioAmplitude") {
        set((state) =>
          mutate(state, (draft) => {
            draft.amplitude = {
              mic: payload.mic,
              speaker: payload.speaker,
            };
          })
        );
      } else if (payload.type === "running_active") {
        const currentState = get();
        if (currentState.intervalId) {
          clearInterval(currentState.intervalId);
        }

        const intervalId = setInterval(() => {
          set((s) =>
            mutate(s, (d) => {
              d.seconds += 1;
            })
          );
        }, 1000);

        set((state) =>
          mutate(state, (draft) => {
            draft.status = "running_active";
            draft.loading = false;
            draft.seconds = 0;
            draft.intervalId = intervalId;
            draft.sessionId = targetSessionId;
          })
        );

        get().setSessionMode(targetSessionId, "running_active");
      } else if (payload.type === "finalizing") {
        set((state) =>
          mutate(state, (draft) => {
            if (draft.intervalId) {
              clearInterval(draft.intervalId);
              draft.intervalId = undefined;
            }
            draft.status = "finalizing";
            draft.loading = true;
          })
        );

        get().setSessionMode(targetSessionId, "finalizing");
      } else if (payload.type === "inactive") {
        const currentState = get();
        if (currentState.sessionEventUnlisten) {
          currentState.sessionEventUnlisten();
        }

        set((state) =>
          mutate(state, (draft) => {
            draft.status = "inactive";
            draft.loading = false;
            draft.sessionId = null;
            draft.sessionEventUnlisten = undefined;
          })
        );

        get().setSessionMode(targetSessionId, "inactive");

        get().resetTranscript();
      } else if (payload.type === "streamResponse") {
        const response = payload.response;
        get().handleTranscriptResponse(response as unknown as StreamResponse);
      } else if (payload.type === "batchResponse") {
        const response = payload.response;
        get().handleBatchResponse(
          targetSessionId,
          response as unknown as BatchResponse,
        );
      }
    };

    const program = Effect.gen(function*() {
      const unlisten = yield* listenToSessionEvents(handleSessionEvent);

      set((state) =>
        mutate(state, (draft) => {
          draft.sessionEventUnlisten = unlisten;
        })
      );

      yield* startSessionEffect(params);
      set((state) =>
        mutate(state, (draft) => {
          draft.status = "running_active";
          draft.loading = false;
          draft.sessionId = targetSessionId;
        })
      );

      get().setSessionMode(targetSessionId, "running_active");
    });

    Effect.runPromiseExit(program).then((exit) => {
      Exit.match(exit, {
        onFailure: (cause) => {
          console.error("Failed to start session:", cause);
          set((state) =>
            mutate(state, (draft) => {
              if (draft.intervalId) {
                clearInterval(draft.intervalId);
                draft.intervalId = undefined;
              }

              draft.sessionEventUnlisten = undefined;
              draft.loading = false;
              draft.status = "inactive";
              draft.amplitude = { mic: 0, speaker: 0 };
              draft.seconds = 0;
              draft.sessionId = null;
              draft.muted = initialState.muted;
            })
          );
          get().setSessionMode(targetSessionId, "inactive");
        },
        onSuccess: () => {},
      });
    });
  },
  stop: () => {
    const program = Effect.gen(function*() {
      yield* stopSessionEffect();
    });

    Effect.runPromiseExit(program).then((exit) => {
      Exit.match(exit, {
        onFailure: (cause) => {
          console.error("Failed to stop session:", cause);
          set((state) =>
            mutate(state, (draft) => {
              draft.loading = false;
            })
          );
        },
        onSuccess: () => {},
      });
    });
  },
  setMuted: (value) => {
    set((state) =>
      mutate(state, (draft) => {
        draft.muted = value;
        listenerCommands.setMicMuted(value);
      })
    );
  },
  runBatch: async (params, options) => {
    const sessionId = options?.sessionId;

    if (!sessionId) {
      console.error("[listener] 'runBatch' requires a sessionId option");
      return;
    }

    const mode = get().getSessionMode(sessionId);
    if (mode === "running_active" || mode === "finalizing") {
      console.warn(`[listener] cannot start batch processing while session ${sessionId} is live`);
      return;
    }

    if (mode === "running_batch") {
      console.warn(`[listener] session ${sessionId} is already processing in batch mode`);
      return;
    }

    const shouldResetPersist = Boolean(options?.handlePersist);

    if (options?.handlePersist) {
      get().setTranscriptPersist(options.handlePersist);
    }

    get().clearBatchSession(sessionId);
    get().setSessionMode(sessionId, "running_batch");

    let unlisten: (() => void) | undefined;

    const cleanup = () => {
      if (unlisten) {
        unlisten();
        unlisten = undefined;
      }

      if (shouldResetPersist) {
        get().setTranscriptPersist(undefined);
      }

      get().clearBatchSession(sessionId);
      get().setSessionMode(sessionId, "inactive");
    };

    await new Promise<void>((resolve, reject) => {
      listenerEvents.sessionEvent
        .listen(({ payload }) => {
          if (payload.type === "batchProgress") {
            get().handleBatchProgress(sessionId, {
              audioDuration: payload.audio_duration,
              transcriptDuration: payload.transcript_duration,
            });
            return;
          }

          if (payload.type !== "batchResponse") {
            return;
          }

          console.log("[runBatch] batch response", payload.response);

          try {
            get().handleBatchResponse(sessionId, payload.response);
            cleanup();
            resolve();
          } catch (error) {
            console.error("[runBatch] error handling batch response", error);
            cleanup();
            reject(error);
          }
        })
        .then((fn) => {
          unlisten = fn;

          listenerCommands
            .runBatch(params)
            .then((result) => {
              if (result.status === "error") {
                console.error("[runBatch] command failed", result.error);
                cleanup();
                reject(result.error);
              }
            })
            .catch((error) => {
              console.error("[runBatch] command error", error);
              cleanup();
              reject(error);
            });
        })
        .catch((error) => {
          console.error("[runBatch] listener setup failed", error);
          cleanup();
          reject(error);
        });
    });
  },
  setSessionMode: (sessionId, mode) => {
    if (!sessionId) {
      return;
    }

    set((state) =>
      mutate(state, (draft) => {
        if (mode === "inactive") {
          delete draft.sessionModes[sessionId];
          return;
        }

        draft.sessionModes[sessionId] = mode;
      })
    );
  },
  getSessionMode: (sessionId) => {
    if (!sessionId) {
      return "inactive";
    }

    const state = get();
    if (state.sessionId === sessionId) {
      return state.status;
    }

    return state.sessionModes[sessionId] ?? "inactive";
  },
  isSessionLive: (sessionId) => get().getSessionMode(sessionId) === "running_active",
  isSessionRunningBatch: (sessionId) => get().getSessionMode(sessionId) === "running_batch",
});
