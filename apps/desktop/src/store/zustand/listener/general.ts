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

export type GeneralState = {
  sessionEventUnlisten?: () => void;
  loading: boolean;
  status: Extract<SessionEvent["type"], "inactive" | "running_active" | "finalizing">;
  amplitude: { mic: number; speaker: number };
  seconds: number;
  intervalId?: NodeJS.Timeout;
  sessionId: string | null;
  muted: boolean;
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
    options?: { handlePersist?: HandlePersistCallback },
  ) => Promise<void>;
};

const initialState: GeneralState = {
  status: "inactive",
  loading: false,
  amplitude: { mic: 0, speaker: 0 },
  seconds: 0,
  sessionId: null,
  muted: false,
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

export const createGeneralSlice = <T extends GeneralState & TranscriptActions & BatchActions>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): GeneralState & GeneralActions => ({
  ...initialState,
  start: (params: SessionParams, options) => {
    set((state) =>
      mutate(state, (draft) => {
        draft.loading = true;
        draft.sessionId = params.session_id ?? null;
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
            draft.sessionId = currentState.sessionId ?? null;
          })
        );
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

        get().resetTranscript();
      } else if (payload.type === "streamResponse") {
        const response = payload.response;
        get().handleTranscriptResponse(response as unknown as StreamResponse);
      } else if (payload.type === "batchResponse") {
        const response = payload.response;
        get().handleBatchResponse(
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
          draft.sessionId = params.session_id ?? null;
        })
      );
    });

    Effect.runPromiseExit(program).then((exit) => {
      Exit.match(exit, {
        onFailure: (cause) => {
          console.error("Failed to start session:", cause);
          set(initialState as Partial<T>);
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
    const shouldResetPersist = Boolean(options?.handlePersist);

    if (options?.handlePersist) {
      get().setTranscriptPersist(options.handlePersist);
    }

    let unlisten: (() => void) | undefined;

    const cleanup = () => {
      if (unlisten) {
        unlisten();
        unlisten = undefined;
      }

      if (shouldResetPersist) {
        get().setTranscriptPersist(undefined);
      }
    };

    await new Promise<void>((resolve, reject) => {
      listenerEvents.sessionEvent
        .listen(({ payload }) => {
          if (payload.type !== "batchResponse") {
            return;
          }

          try {
            get().handleBatchResponse(payload.response);
            cleanup();
            resolve();
          } catch (error) {
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
                cleanup();
                reject(result.error);
              }
            })
            .catch((error) => {
              cleanup();
              reject(error);
            });
        })
        .catch((error) => {
          cleanup();
          reject(error);
        });
    });
  },
});
