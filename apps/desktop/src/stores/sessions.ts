import { createStore } from "zustand";

import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { createSessionStore, SessionStore } from "./session";

type State = {
  session: SessionStore | null;
  sessions: Record<string, SessionStore>;
};

type Actions = {
  init: () => Promise<void>;
  enter: (session: Session) => void;
  exit: (session: Session) => void;
};

export const createSessionsStore = () => {
  return createStore<State & Actions>((set, get) => ({
    session: null,
    sessions: {},
    init: async () => {
      const sessions = get().sessions;
      const list = await dbCommands.listSessions(null);
      for (const session of list) {
        sessions[session.id] = createSessionStore(session);
      }
      set({ sessions });
    },
    enter: (session: Session) => {
      const sessions = get().sessions;
      if (sessions[session.id]) {
        return;
      }
      const store = createSessionStore(session);
      sessions[session.id] = store;
      set({ session: store, sessions });
    },
    exit: (session: Session) => {
      const sessions = get().sessions;
      if (!sessions[session.id]) {
        return;
      }
      delete sessions[session.id];
      set({ session: null, sessions });
    },
  }));
};
