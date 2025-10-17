import { Effect, Exit } from "effect";
import { create as mutate } from "mutative";
import { createStore } from "zustand";

import { commands as listenerCommands, events as listenerEvents, type SessionParams } from "@hypr/plugin-listener";
import { fromResult } from "../../effect";

type State = {
  sessionEventUnlisten?: () => void;
  loading: boolean;
  status: "inactive" | "running_active";
  amplitude: { mic: number; speaker: number };
  seconds: number;
  intervalId?: NodeJS.Timeout;
};

type Actions = {
  get: () => State & Actions;
  start: () => void;
  stop: () => void;
};

const initialState: State = {
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

export type ListenerStore = ReturnType<typeof createListenerStore>;

export const createListenerStore = () => {
  return createStore<State & Actions>((set, get) => ({
    ...initialState,
    get: () => get(),
    start: () => {
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
          console.log(payload.response);
        }
      };

      const program = Effect.gen(function*() {
        const unlisten = yield* listenToSessionEvents(handleSessionEvent);

        set((state) =>
          mutate(state, (draft) => {
            draft.sessionEventUnlisten = unlisten;
          })
        );

        yield* startSessionEffect({
          languages: ["en"],
          onboarding: false,
          record_enabled: false,
          session_id: crypto.randomUUID(),
        });

        set({ status: "running_active", loading: false });
      });

      Effect.runPromiseExit(program).then((exit) => {
        Exit.match(exit, {
          onFailure: (cause) => {
            console.error("Failed to start session:", cause);
            set(initialState);
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
        set(initialState);
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
  }));
};
