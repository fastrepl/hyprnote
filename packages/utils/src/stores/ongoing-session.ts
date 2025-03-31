import { Channel } from "@tauri-apps/api/core";
import { create as mutate } from "mutative";
import { createStore } from "zustand";

import { commands as listenerCommands, type SessionEvent, type TimelineView } from "@hypr/plugin-listener";

type State = {
  sessionId: string | null;
  timeline: TimelineView | null;
  channel: Channel<SessionEvent> | null;
  status: "active" | "loading" | "inactive";
  amplitude: { mic: number; speaker: number };
};

type Actions = {
  get: () => State & Actions;
  start: (sessionId: string) => void;
  pause: () => void;
};

const initialState: State = {
  sessionId: null,
  timeline: null,
  status: "inactive",
  channel: null,
  amplitude: { mic: 0, speaker: 0 },
};

export const createOngoingSessionStore = () => {
  return createStore<State & Actions>((set, get) => ({
    ...initialState,
    get: () => get(),
    start: (sessionId: string) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.sessionId = sessionId;
          draft.status = "loading";
        })
      );

      const channel = new Channel<SessionEvent>();

      channel.onmessage = (event) => {
        set((state) =>
          mutate(state, (draft) => {
            if (event.type === "started") {
              draft.status = "active";
            }

            if (event.type === "stopped") {
              draft.status = "inactive";
            }

            if (event.type === "timelineView") {
              draft.timeline = event.timeline;
            }

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
        set({ channel, status: "active" });
        listenerCommands.subscribe(channel);
      }).catch((error) => {
        console.error(error);
        set(initialState);
      });
    },
    pause: () => {
      const { channel } = get();

      try {
        listenerCommands.stopSession();

        if (channel) {
          listenerCommands.unsubscribe(channel);
        }
      } catch (error) {
        console.error(error);
      }

      set(initialState);
    },
  }));
};
