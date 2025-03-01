import { createStore } from "zustand";
import { create as mutate } from "mutative";
import { Channel } from "@tauri-apps/api/core";

import {
  commands as listenerCommands,
  type SessionEvent,
} from "@hypr/plugin-listener";

type State = {
  channel: Channel<SessionEvent> | null;
  listening: boolean;
  amplitude: { mic: number; speaker: number };
};

type Actions = {
  start: () => void;
  pause: () => void;
};

export const createOngoingSessionStore = () => {
  return createStore<State & Actions>((set, get) => ({
    session: null,
    listening: false,
    channel: null,
    amplitude: { mic: 0, speaker: 0 },
    start: () => {
      const channel: State["channel"] = new Channel();

      channel.onmessage = (event) => {
        set((state) =>
          mutate(state, (draft) => {
            if (event.type === "stopped") {
              draft.listening = false;
            } else if (event.type === "audioAmplitude") {
              draft.amplitude = {
                mic: event.mic,
                speaker: event.speaker,
              };
            }
          }),
        );
      };

      try {
        listenerCommands.startSession().then((_) => {
          listenerCommands.subscribe(channel);
        });
      } catch (error) {
        console.error("failed to start session", error);
      }
      set({ channel, listening: true });
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
      set({ channel: null, listening: false });
    },
  }));
};
