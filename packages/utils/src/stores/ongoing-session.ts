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
  micMuted: boolean;
  speakerMuted: boolean;
};

type Actions = {
  get: () => State & Actions;
  cancelEnhance: () => void;
  setEnhanceController: (controller: AbortController | null) => void;
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
  micMuted: false,
  speakerMuted: false,
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
    start: (sessionId: string) => {
      console.log("start", sessionId);
      set((state) =>
        mutate(state, (draft) => {
          draft.sessionId = sessionId;
          draft.loading = true;
        })
      );

      const sessionStore = sessionsStore.getState().sessions[sessionId];
      const currentSession = sessionStore.getState().session;

      sessionStore.getState().persistSession(undefined, true);
      
      if (currentSession.raw_memo_html && currentSession.raw_memo_html != "<p></p>") {
        const preMeetingNote = currentSession.raw_memo_html;
        sessionStore.getState().updatePreMeetingNote(preMeetingNote);
      }

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
        } else if (payload.type === "running_active") {
          set((state) =>
            mutate(state, (draft) => {
              draft.status = "running_active";
              draft.loading = false;
            })
          );
        } else if (payload.type === "running_paused") {
          set((state) =>
            mutate(state, (draft) => {
              draft.status = "running_paused";
              draft.loading = false;
            })
          );
        } else if (payload.type === "inactive") {
          set((state) =>
            mutate(state, (draft) => {
              draft.status = "inactive";
              draft.loading = false;
            })
          );
        } else if (payload.type === "micMuted") {
          set((state) =>
            mutate(state, (draft) => {
              draft.micMuted = payload.value;
            })
          );
        } else if (payload.type === "speakerMuted") {
          set((state) =>
            mutate(state, (draft) => {
              draft.speakerMuted = payload.value;
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

      set((state) =>
        mutate(state, (draft) => {
          draft.loading = true;
        })
      );

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
      }).catch((error) => {
        console.error("Failed to stop session:", error);
        set((state) =>
          mutate(state, (draft) => {
            draft.loading = false;
          })
        );
      });
    },
    pause: () => {
      const { sessionId } = get();

      set((state) =>
        mutate(state, (draft) => {
          draft.loading = true;
        })
      );

      listenerCommands.pauseSession().then(() => {
        set((state) =>
          mutate(state, (draft) => {
            draft.status = "running_paused";
            draft.loading = false;
          })
        );

        // We need refresh since session in store is now stale.
        // setTimeout is needed because of debounce.
        setTimeout(() => {
          if (sessionId) {
            const sessionStore = sessionsStore.getState().sessions[sessionId];
            sessionStore.getState().refresh();
          }
        }, 1500);
      }).catch((error) => {
        console.error("Failed to pause session:", error);
        set((state) =>
          mutate(state, (draft) => {
            draft.loading = false;
          })
        );
      });
    },
    resume: () => {
      set((state) =>
        mutate(state, (draft) => {
          draft.loading = true;
        })
      );

      listenerCommands.resumeSession().then(() => {
        set((state) =>
          mutate(state, (draft) => {
            draft.status = "running_active";
            draft.loading = false;
          })
        );
      }).catch((error) => {
        console.error("Failed to resume session:", error);
        set((state) =>
          mutate(state, (draft) => {
            draft.loading = false;
          })
        );
      });
    },
  }));
};
