import { createStore } from "zustand";
import { create as mutate } from "mutative";
import { Channel } from "@tauri-apps/api/core";

import { type TimelineView } from "@/types";
import {
  commands as listenerCommands,
  type SessionEvent,
} from "@hypr/plugin-listener";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
type State = {
  channel: Channel<any> | null;
  listening: boolean;
  session: Session;
  timeline: TimelineView;
  amplitude: { mic: number; speaker: number };
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
    amplitude: { mic: 0, speaker: 0 },
    persistSession: async () => {
      const { session } = get();
      await dbCommands.upsertSession(session);
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
      console.log("start: create channel");
      const channel = new Channel<SessionEvent>();
      channel.onmessage = (event) => {
        set((state) =>
          mutate(state, (draft) => {
            if (event === "Stopped") {
              draft.listening = false;
            } else if ("TimelineView" in event) {
              draft.timeline = event.TimelineView;
            } else if ("Audio" in event) {
              draft.amplitude = {
                mic: event.Audio[0],
                speaker: event.Audio[1],
              };
            }
          }),
        );
      };

      console.log("start: listenerCommands");
      try {
        listenerCommands.startSession(channel).then((r) => {
          console.log("start: listenerCommands", r);
        });
      } catch (error) {
        console.error("failed to start session", error);
      }
      set({ channel, listening: true });
    },
    pause: () => {
      try {
        listenerCommands.stopSession();
      } catch (error) {
        console.error(error);
      }
      set({ channel: null, listening: false });
    },
    destroy: () => {
      set((state) => {
        if (state.channel) {
          state.channel.onmessage = () => {};
        }

        dbCommands.upsertSession(state.session);
        return state;
      });
    },
  }));
};
