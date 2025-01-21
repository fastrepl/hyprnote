import { createStore } from "zustand";
import { create as mutate } from "mutative";
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
  updateTitle: (title: string) => void;
  updateRawNote: (note: string) => void;
  updateEnhancedNote: (note: string) => void;
};

export const createSessionStore = (session: Session) => {
  return createStore<State & Actions>((set) => ({
    session,
    listening: false,
    channel: null,
    updateTitle: (title: string) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.session.title = title;
        }),
      );
    },
    updateEnhancedNote: (note: string) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.session.enhanced_memo_html = note;
        }),
      );
    },
    updateRawNote: (note: string) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.session.raw_memo_html = note;
        }),
      );
    },
    start: () => {
      const channel = new Channel<TranscribeOutputChunk>();
      channel.onmessage = (event) => {
        set((state) =>
          mutate(state, (draft) => {
            if (!draft.session.transcript) {
              draft.session.transcript = { blocks: [] };
            }

            draft.session.transcript.blocks.push({
              start: 0,
              end: 0,
              text: event.text,
            });
          }),
        );
      };

      commands.startMicSession(channel);
      set({ channel, listening: true });
    },
    pause: () => {
      commands.stopSession();
      set({ channel: null, listening: false });
    },
    destroy: () => {
      set((state) => {
        if (state.channel) {
          state.channel.onmessage = () => {};
        }

        commands.dbUpsertSession(state.session);
        return state;
      });
    },
  }));
};
