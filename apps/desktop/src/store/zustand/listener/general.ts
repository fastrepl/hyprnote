import { Effect, Exit } from "effect";
import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import {
  commands as listenerCommands,
  events as listenerEvents,
  type SessionParams,
  type StreamResponse,
} from "@hypr/plugin-listener";
import { fromResult } from "../../../effect";

export type GeneralState = {
  sessionEventUnlisten?: () => void;
  loading: boolean;
  status: "inactive" | "running_active";
  amplitude: { mic: number; speaker: number };
  seconds: number;
  intervalId?: NodeJS.Timeout;
};

export type GeneralActions = {
  start: (params: SessionParams, onStreamResponse: (response: StreamResponse) => void) => void;
  stop: () => void;
};

const initialState: GeneralState = {
  status: "inactive",
  loading: false,
  amplitude: { mic: 0, speaker: 0 },
  seconds: 0,
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

export const createGeneralSlice = <T extends GeneralState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): GeneralState & GeneralActions => ({
  ...initialState,
  start: (params: SessionParams, onStreamResponse: (response: StreamResponse) => void) => {
    set((state) =>
      mutate(state, (draft) => {
        draft.loading = true;
      })
    );

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
          })
        );
      } else if (payload.type === "inactive") {
        set((state) =>
          mutate(state, (draft) => {
            if (draft.intervalId) {
              clearInterval(draft.intervalId);
              draft.intervalId = undefined;
            }
            draft.status = "inactive";
            draft.loading = false;
          })
        );
      } else if (payload.type === "streamResponse") {
        const response = payload.response;
        onStreamResponse(response);
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
    set((state) =>
      mutate(state, (draft) => {
        draft.loading = true;
      })
    );

    const program = Effect.gen(function*() {
      const currentState = get();
      if (currentState.sessionEventUnlisten) {
        currentState.sessionEventUnlisten();
      }

      if (currentState.intervalId) {
        clearInterval(currentState.intervalId);
      }

      yield* stopSessionEffect();
      set(initialState as Partial<T>);
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
});
