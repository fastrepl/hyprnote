import { create as mutate } from "mutative";
import { createStore } from "zustand";

import { commands as dbCommands, type Session } from "@hypr/plugin-db";

type State = {
  session: Session;
};

type Actions = {
  updateTitle: (title: string) => void;
  updateRawNote: (note: string) => void;
  updateEnhancedNote: (note: string) => void;
  getSession: () => Session;
  persistSession: () => Promise<void>;
};

export type SessionStore = ReturnType<typeof createSessionStore>;

export const createSessionStore = (session: Session) => {
  return createStore<State & Actions>((set, get) => ({
    session,
    updateTitle: (title: string) => {
      set((state) =>
        mutate(state, (draft) => {
          if (!draft.session) {
            return;
          }
          draft.session.title = title;
        })
      );
    },
    updateRawNote: (note: string) => {
      set((state) =>
        mutate(state, (draft) => {
          if (!draft.session) {
            return;
          }

          draft.session.raw_memo_html = note;
        })
      );
    },
    updateEnhancedNote: (note: string) => {
      set((state) =>
        mutate(state, (draft) => {
          if (!draft.session) {
            return;
          }

          draft.session.enhanced_memo_html = note;
        })
      );
    },
    getSession: () => {
      return get().session;
    },
    persistSession: async () => {
      const { session } = get();
      if (!session) {
        return;
      }

      await dbCommands.upsertSession(session);
    },
  }));
};
