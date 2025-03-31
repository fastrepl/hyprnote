import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { type Session } from "@hypr/plugin-db";
import { createSessionsStore, createSessionStore, SessionsStore } from "../stores";

const SessionsContext = createContext<
  ReturnType<
    typeof createSessionsStore
  > | null
>(null);

export const SessionsProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store?: SessionsStore;
}) => {
  const storeRef = useRef<ReturnType<typeof createSessionsStore> | null>(
    null,
  );
  if (!storeRef.current) {
    storeRef.current = store || createSessionsStore();
  }

  return (
    <SessionsContext.Provider value={storeRef.current}>
      {children}
    </SessionsContext.Provider>
  );
};

export const useSessions = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createSessionsStore>, T>
  >[1],
) => {
  const store = useContext(SessionsContext);

  if (!store) {
    throw new Error(
      "'useSessions' must be used within a 'SessionsProvider'",
    );
  }

  return useStore(store, useShallow(selector));
};

export const useSession = <T,>(
  sessionLocator: string | Session,
  selector: Parameters<
    typeof useStore<ReturnType<typeof createSessionStore>, T>
  >[1],
) => {
  const sessionsStore = useContext(SessionsContext);

  if (!sessionsStore) {
    throw new Error("'useSession' must be used within a 'SessionsProvider'");
  }

  const sessionId = typeof sessionLocator === "string" ? sessionLocator : sessionLocator.id;

  const { sessions, insert } = sessionsStore.getState();

  if (sessions[sessionId]) {
    return useStore(sessions[sessionId], useShallow(selector));
  }

  if (typeof sessionLocator === "string") {
    throw new Error(`session(id=${sessionId}) not exists in sessions store. Consider passing Session object instead.`);
  }

  return useStore(insert(sessionLocator), useShallow(selector));
};
