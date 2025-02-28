import { createStore } from "zustand";
import { create as mutate } from "mutative";

import { type Session, commands as dbCommands } from "@hypr/plugin-db";

type State = {
  session: Session;
};

type Actions = {
  persistSession: () => Promise<void>;
  updateTitle: (title: string) => void;
  updateRawNote: (note: string) => void;
  updateEnhancedNote: (note: string) => void;
};

export const createSessionStore = (session: Session) => {
  return createStore<State & Actions>((set, get) => ({
    session,
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
    updateRawNote: (note: string) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.session.raw_memo_html = note;
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
  }));
};
