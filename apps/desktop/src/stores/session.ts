import { createStore } from "zustand";
import { Channel } from "@tauri-apps/api/core";

import {
  commands,
  type Session,
  type TranscribeOutputChunk,
} from "@/types/tauri";

type State = {
  channel: Channel<TranscribeOutputChunk> | null;
  listening: boolean;
  session: Session;
};

type Actions = {
  start: () => void;
  pause: () => void;
  destroy: () => void;
};

export const createSessionStore = (session: Session) => {
  return createStore<State & Actions>((set) => ({
    session,
    listening: false,
    channel: null,
    start: () => {
      const channel = new Channel<TranscribeOutputChunk>();
      channel.onmessage = (event) => {
        set((state) => ({
          ...state,
          session: {
            ...state.session,
            transcript: {
              blocks: [
                ...(state.session.transcript?.blocks ?? []),
                {
                  start: 0,
                  end: 0,
                  text: event.text,
                },
              ],
            },
          },
        }));
      };

      commands.startMicSession(channel);
      set({ channel, listening: true });
    },
    pause: () => {
      commands.stopSession();
      set({ channel: null, listening: false });
    },
    destroy: () => {
      set({ listening: false });
    },
  }));
};
