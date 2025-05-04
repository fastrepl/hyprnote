import { Channel } from "@tauri-apps/api/core";
import { create as mutate } from "mutative";
import { createStore } from "zustand";

import {
  commands as listenerCommands,
  type SessionEvent,
  type StatusEvent as ListenerState,
} from "@hypr/plugin-listener";
import { createSessionsStore } from "./sessions";

type State = {
  sessionId: string | null;
  channel: Channel<SessionEvent> | null;
  loading: boolean;
  status: ListenerState;
  amplitude: { mic: number; speaker: number };
  enhanceController: AbortController | null;
};

type Actions = {
  get: () => State & Actions;
  cancelEnhance: () => void;
  setEnhanceController: (controller: AbortController | null) => void;
  setStatus: (status: ListenerState) => void;
  start: (sessionId: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
};

const initialState: State = {
  sessionId: null,
  status: "inactive",
  loading: false,
  channel: null,
  amplitude: { mic: 0, speaker: 0 },
  enhanceController: null,
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
    setStatus: (status: ListenerState) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.status = status;
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

      const channel = new Channel<SessionEvent>();

      channel.onmessage = (event) => {
        set((state) =>
          mutate(state, (draft) => {
            if (event.type === "audioAmplitude") {
              draft.amplitude = {
                mic: event.mic,
                speaker: event.speaker,
              };
            }
          })
        );
      };

      // Note: Return the promise so errors can be caught by callers
      return listenerCommands.startSession(sessionId).then(() => {
        set({ channel, status: "running_active", loading: false });
        listenerCommands.subscribe(channel);
      }).catch((error) => {
        console.error(error);
        set(initialState);
        throw new Error(error?.message ?? "Failed to start recording session");
      });
    },
    stop: () => {
      const { channel, sessionId } = get();

      if (channel) {
        listenerCommands.unsubscribe(channel);
      }

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
