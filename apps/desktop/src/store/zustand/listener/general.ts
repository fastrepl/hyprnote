import { getName } from "@tauri-apps/api/app";
import { appDataDir } from "@tauri-apps/api/path";
import { Effect, Exit } from "effect";
import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import { commands as hooksCommands } from "@hypr/plugin-hooks";
import {
  commands as listenerCommands,
  events as listenerEvents,
  type SessionEvent,
  type SessionParams,
  type StreamResponse,
} from "@hypr/plugin-listener";
import {
  type BatchParams,
  commands as listener2Commands,
  events as listener2Events,
} from "@hypr/plugin-listener2";

import { fromResult } from "../../../effect";
import type { BatchActions, BatchState } from "./batch";
import type { HandlePersistCallback, TranscriptActions } from "./transcript";

type LiveSessionStatus = Extract<
  SessionEvent["type"],
  "inactive" | "running_active" | "finalizing"
>;
export type SessionMode = LiveSessionStatus | "running_batch";

const hasSessionId = (
  payload: SessionEvent,
): payload is SessionEvent & { session_id: string } =>
  "session_id" in payload && typeof payload.session_id === "string";

export type GeneralState = {
  live: {
    sessionEventUnlisten?: () => void;
    loading: boolean;
    status: LiveSessionStatus;
    amplitude: { mic: number; speaker: number };
    seconds: number;
    intervalId?: NodeJS.Timeout;
    sessionId: string | null;
    muted: boolean;
  };
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
  getSessionMode: (sessionId: string) => SessionMode;
};

const initialState: GeneralState = {
  live: {
    status: "inactive",
    loading: false,
    amplitude: { mic: 0, speaker: 0 },
    seconds: 0,
    sessionId: null,
    muted: false,
  },
};

const listenToSessionEvents = (
  onEvent: (payload: SessionEvent) => void,
): Effect.Effect<() => void, unknown> =>
  Effect.tryPromise({
    try: () =>
      listenerEvents.sessionEvent.listen(({ payload }) => onEvent(payload)),
    catch: (error) => error,
  });

const startSessionEffect = (params: SessionParams) =>
  fromResult(listenerCommands.startSession(params));
const stopSessionEffect = () => fromResult(listenerCommands.stopSession());

export const createGeneralSlice = <
  T extends GeneralState &
    GeneralActions &
    TranscriptActions &
    BatchActions &
    BatchState,
>(
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
      console.warn(
        `[listener] cannot start live session while batch processing session ${targetSessionId}`,
      );
      return;
    }

    set((state) =>
      mutate(state, (draft) => {
        draft.live.loading = true;
        draft.live.sessionId = targetSessionId;
      }),
    );

    if (options?.handlePersist) {
      get().setTranscriptPersist(options.handlePersist);
    }

    const handleSessionEvent = (payload: SessionEvent) => {
      if (!hasSessionId(payload) || payload.session_id !== targetSessionId) {
        return;
      }

      if (payload.type === "audioAmplitude") {
        set((state) =>
          mutate(state, (draft) => {
            draft.live.amplitude = {
              mic: payload.mic,
              speaker: payload.speaker,
            };
          }),
        );
      } else if (payload.type === "running_active") {
        const currentState = get();
        if (currentState.live.intervalId) {
          clearInterval(currentState.live.intervalId);
        }

        const intervalId = setInterval(() => {
          set((s) =>
            mutate(s, (d) => {
              d.live.seconds += 1;
            }),
          );
        }, 1000);

        set((state) =>
          mutate(state, (draft) => {
            draft.live.status = "running_active";
            draft.live.loading = false;
            draft.live.seconds = 0;
            draft.live.intervalId = intervalId;
            draft.live.sessionId = targetSessionId;
          }),
        );
      } else if (payload.type === "finalizing") {
        set((state) =>
          mutate(state, (draft) => {
            if (draft.live.intervalId) {
              clearInterval(draft.live.intervalId);
              draft.live.intervalId = undefined;
            }
            draft.live.status = "finalizing";
            draft.live.loading = true;
          }),
        );
      } else if (payload.type === "inactive") {
        const currentState = get();
        if (currentState.live.sessionEventUnlisten) {
          currentState.live.sessionEventUnlisten();
        }

        set((state) =>
          mutate(state, (draft) => {
            draft.live.status = "inactive";
            draft.live.loading = false;
            draft.live.sessionId = null;
            draft.live.sessionEventUnlisten = undefined;
          }),
        );

        get().resetTranscript();
      } else if (payload.type === "streamResponse") {
        const response = payload.response;
        get().handleTranscriptResponse(response as unknown as StreamResponse);
      }
    };

    const program = Effect.gen(function* () {
      const unlisten = yield* listenToSessionEvents(handleSessionEvent);

      set((state) =>
        mutate(state, (draft) => {
          draft.live.sessionEventUnlisten = unlisten;
        }),
      );

      Promise.all([appDataDir(), getName().catch(() => "com.hyprnote.app")])
        .then(([dataDirPath, appName]) => {
          const sessionPath = `${dataDirPath}/hyprnote/sessions/${targetSessionId}`;
          return hooksCommands.runEventHooks({
            beforeListeningStarted: {
              args: {
                resource_dir: sessionPath,
                app_hyprnote: appName,
                app_meeting: null,
              },
            },
          });
        })
        .catch((error) => {
          console.error("[hooks] BeforeListeningStarted failed:", error);
        });

      yield* startSessionEffect(params);
      set((state) =>
        mutate(state, (draft) => {
          draft.live.status = "running_active";
          draft.live.loading = false;
          draft.live.sessionId = targetSessionId;
        }),
      );
    });

    Effect.runPromiseExit(program).then((exit) => {
      Exit.match(exit, {
        onFailure: (cause) => {
          console.error(JSON.stringify(cause));
          set((state) =>
            mutate(state, (draft) => {
              if (draft.live.intervalId) {
                clearInterval(draft.live.intervalId);
                draft.live.intervalId = undefined;
              }

              draft.live.sessionEventUnlisten = undefined;
              draft.live.loading = false;
              draft.live.status = "inactive";
              draft.live.amplitude = { mic: 0, speaker: 0 };
              draft.live.seconds = 0;
              draft.live.sessionId = null;
              draft.live.muted = initialState.live.muted;
            }),
          );
        },
        onSuccess: () => {},
      });
    });
  },
  stop: () => {
    const sessionId = get().live.sessionId;

    const program = Effect.gen(function* () {
      yield* stopSessionEffect();
    });

    Effect.runPromiseExit(program).then((exit) => {
      Exit.match(exit, {
        onFailure: (cause) => {
          console.error("Failed to stop session:", cause);
          set((state) =>
            mutate(state, (draft) => {
              draft.live.loading = false;
            }),
          );
        },
        onSuccess: () => {
          if (sessionId) {
            Promise.all([
              appDataDir(),
              getName().catch(() => "com.hyprnote.app"),
            ])
              .then(([dataDirPath, appName]) => {
                const sessionPath = `${dataDirPath}/hyprnote/sessions/${sessionId}`;
                return hooksCommands.runEventHooks({
                  afterListeningStopped: {
                    args: {
                      resource_dir: sessionPath,
                      app_hyprnote: appName,
                      app_meeting: null,
                    },
                  },
                });
              })
              .catch((error) => {
                console.error("[hooks] AfterListeningStopped failed:", error);
              });
          }
        },
      });
    });
  },
  setMuted: (value) => {
    set((state) =>
      mutate(state, (draft) => {
        draft.live.muted = value;
        listenerCommands.setMicMuted(value);
      }),
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
      console.warn(
        `[listener] cannot start batch processing while session ${sessionId} is live`,
      );
      return;
    }

    if (mode === "running_batch") {
      console.warn(
        `[listener] session ${sessionId} is already processing in batch mode`,
      );
      return;
    }

    const shouldResetPersist = Boolean(options?.handlePersist);

    if (options?.handlePersist) {
      get().setTranscriptPersist(options.handlePersist);
    }

    get().handleBatchStarted(sessionId);

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
    };

    await new Promise<void>((resolve, reject) => {
      listener2Events.batchEvent
        .listen(({ payload }) => {
          if (payload.session_id !== sessionId) {
            return;
          }

          if (payload.type === "batchStarted") {
            get().handleBatchStarted(payload.session_id);
            return;
          }

          if (payload.type === "batchProgress") {
            get().handleBatchResponseStreamed(
              sessionId,
              payload.response,
              payload.percentage,
            );

            const batchState = get().batch[sessionId];
            if (batchState?.isComplete) {
              cleanup();
              resolve();
            }
            return;
          }

          if (payload.type === "batchFailed") {
            cleanup();
            reject(payload.error);
            return;
          }

          if (payload.type !== "batchResponse") {
            return;
          }

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

          listener2Commands
            .runBatch(params)
            .then((result) => {
              if (result.status === "error") {
                console.error(result.error);
                cleanup();
                reject(result.error);
              }
            })
            .catch((error) => {
              console.error(error);
              cleanup();
              reject(error);
            });
        })
        .catch((error) => {
          console.error(error);
          cleanup();
          reject(error);
        });
    });
  },
  getSessionMode: (sessionId) => {
    if (!sessionId) {
      return "inactive";
    }

    const state = get();

    if (state.live.sessionId === sessionId) {
      return state.live.status;
    }

    if (state.batch[sessionId]) {
      return "running_batch";
    }

    return "inactive";
  },
});
