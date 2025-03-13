import { createStore } from "zustand";

import { commands as dbCommands } from "@hypr/plugin-db";
import { createSessionStore, SessionStore } from "./session";

type State = {
  sessions: Record<string, SessionStore | undefined>;
};

type Actions = {
  init: () => Promise<void>;
};

export const createSessionsStore = () => {
  return createStore<State & Actions>((set, get) => ({
    sessions: {},
    init: async () => {
      const sessions = get().sessions;
      const list = await dbCommands.listSessions(null);
      for (const session of list) {
        sessions[session.id] = createSessionStore();
      }
      set({ sessions });
    },
  }));
};
