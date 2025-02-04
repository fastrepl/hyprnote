import { createStore } from "zustand";
import { create as mutate } from "mutative";
import { Channel } from "@tauri-apps/api/core";

import { commands } from "@/types/tauri.gen";
import type { TimelineView, Session, SessionStatus } from "@/types/tauri.gen";

type State = {
  channel: Channel<any> | null;
  listening: boolean;
  session: Session;
  timeline: TimelineView;
};

type Actions = {
  start: () => void;
  pause: () => void;
  destroy: () => void;
  updateTitle: (title: string) => void;
  updateRawNote: (note: string) => void;
  updateEnhancedNote: (note: string) => void;
  persistSession: () => Promise<void>;
};

export const createSessionStore = (session: Session) => {
  return createStore<State & Actions>((set, get) => ({
    session,
    listening: false,
    channel: null,
    timeline: { items: [] },
    persistSession: async () => {
      const { session } = get();
      await commands.dbUpsertSession(session);
    },
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
      const channel = new Channel<SessionStatus>();
      channel.onmessage = (event) => {
        set((state) =>
          mutate(state, (draft) => {
            if (event === "Stopped") {
              draft.listening = false;
            } else {
              draft.timeline = event.Timeline;
            }
          }),
        );
      };

      commands.startSession(channel);
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
