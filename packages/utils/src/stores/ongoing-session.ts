import { create as mutate } from "mutative";
import { createStore } from "zustand";

import { commands as listenerCommands, events as listenerEvents } from "@hypr/plugin-listener";
import { createSessionsStore } from "./sessions";

type State = {
  sessionId: string | null;
  sessionEventUnlisten?: () => void;
  loading: boolean;
  status: "inactive" | "running_active" | "running_paused";
  amplitude: { mic: number; speaker: number };
  enhanceController: AbortController | null;
  hasShownConsent: boolean;
};

type Actions = {
  get: () => State & Actions;
  cancelEnhance: () => void;
  setEnhanceController: (controller: AbortController | null) => void;
  setHasShownConsent: (hasShown: boolean) => void;
  start: (sessionId: string) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

const initialState: State = {
  sessionId: null,
  status: "inactive",
  loading: false,
  amplitude: { mic: 0, speaker: 0 },
  enhanceController: null,
  hasShownConsent: false,
};

export type OngoingSessionStore = ReturnType<typeof createOngoingSessionStore>;

export const createOngoingSessionStore = (sessionsStore: ReturnType<typeof createSessionsStore>) => {
  return createStore<State & Actions>((set, get) => ({
    ...initialState,
    get: () => get(),
    cancelEnhance: () => {
      const { enhanceController } = get();
      if (enhanceController) {
        enhanceController.abort();
      }
    },
    setEnhanceController: (controller: AbortController | null) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.enhanceController = controller;
        })
      );
    },
    setHasShownConsent: (hasShown: boolean) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.hasShownConsent = hasShown;
        })
      );
    },
    start: (sessionId: string) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.sessionId = sessionId;
          draft.loading = true;
        })
      );

      const sessionStore = sessionsStore.getState().sessions[sessionId];
      sessionStore.getState().persistSession(undefined, true);

      listenerEvents.sessionEvent.listen(({ payload }) => {
        if (payload.type === "audioAmplitude") {
          set((state) =>
            mutate(state, (draft) => {
              draft.amplitude = {
                mic: payload.mic,
                speaker: payload.speaker,
              };
            })
          );
        }
      }).then((unlisten) => {
        set((state) =>
          mutate(state, (draft) => {
            draft.sessionEventUnlisten = unlisten;
          })
        );
      });

      listenerCommands.startSession(sessionId).then(() => {
        set({ status: "running_active", loading: false });
      }).catch((error) => {
        console.error(error);
        set(initialState);
      });
    },
    stop: () => {
      const { sessionId } = get();

      listenerCommands.stopSession().then(() => {
        set(initialState);

        // We need refresh since session in store is now stale.
        // setTimeout is needed because of debounce.
        setTimeout(() => {
          if (sessionId) {
            const sessionStore = sessionsStore.getState().sessions[sessionId];
            sessionStore.getState().refresh();
          }
        }, 1500);
      });
    },
    pause: () => {
      const { sessionId } = get();

      listenerCommands.pauseSession().then(() => {
        set({ status: "running_paused" });

        // We need refresh since session in store is now stale.
        // setTimeout is needed because of debounce.
        setTimeout(() => {
          if (sessionId) {
            const sessionStore = sessionsStore.getState().sessions[sessionId];
            sessionStore.getState().refresh();
          }
        }, 1500);
      });
    },
    resume: () => {
      listenerCommands.resumeSession().then(() => {
        set({ status: "running_active" });
      });
    },
  }));
};
