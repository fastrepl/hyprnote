import { Channel } from "@tauri-apps/api/core";
import { create as mutate } from "mutative";
import { createStore } from "zustand";

import { commands as listenerCommands, type SessionEvent, type State as ListenerState } from "@hypr/plugin-listener";
import { createSessionsStore } from "./sessions";

type State = {
  sessionId: string | null;
  channel: Channel<SessionEvent> | null;
  loading: boolean;
  status: ListenerState;
  amplitude: { mic: number; speaker: number };
};

type Actions = {
  get: () => State & Actions;
  start: (sessionId: string) => void;
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
};

export const createOngoingSessionStore = (sessionsStore: ReturnType<typeof createSessionsStore>) => {
  return createStore<State & Actions>((set, get) => ({
    ...initialState,
    get: () => get(),
    start: (sessionId: string) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.sessionId = sessionId;
          draft.loading = true;
        })
      );

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

      listenerCommands.startSession(sessionId).then(() => {
        set({ channel, status: "running_active", loading: false });
        listenerCommands.subscribe(channel);
      }).catch((error) => {
        console.error(error);
        set(initialState);
      });
    },
    stop: () => {
      const { sessionId, channel } = get();

      if (channel) {
        listenerCommands.unsubscribe(channel);
      }

      listenerCommands.stopSession().then(() => {
        set(initialState);

        // session stored in sessionStore become stale during ongoing-session. Refresh it here.
        if (sessionId) {
          const sessionStore = sessionsStore.getState().sessions[sessionId];
          sessionStore.getState().refresh();
        }
      });
    },
    pause: () => {
      const { sessionId } = get();

      listenerCommands.pauseSession().then(() => {
        set({ status: "running_paused" });

        // session stored in sessionStore become stale during ongoing-session. Refresh it here.
        if (sessionId) {
          const sessionStore = sessionsStore.getState().sessions[sessionId];
          sessionStore.getState().refresh();
        }
      });
    },
    resume: () => {
      listenerCommands.resumeSession().then(() => {
        set({ status: "running_active" });
      });
    },
  }));
};
