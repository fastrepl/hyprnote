import { createStore } from "zustand";

import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { createSessionStore, SessionStore } from "./session";

type State = {
  sessions: Record<string, SessionStore>;
};

type Actions = {
  init: () => Promise<void>;
  enter: (session: Session) => SessionStore;
};

export const createSessionsStore = () => {
  return createStore<State & Actions>((set, get) => ({
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
        return sessions[session.id];
      }

      const store = createSessionStore(session);
      sessions[session.id] = store;
      set({ sessions });
      return store;
    },
  }));
};
