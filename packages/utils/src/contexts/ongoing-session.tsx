import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createOngoingSessionStore, createSessionsStore } from "../stores";

const OngoingSessionContext = createContext<
  ReturnType<
    typeof createOngoingSessionStore
  > | null
>(null);

export const OngoingSessionProvider = ({
  children,
  sessionsStore,
}: {
  children: React.ReactNode;
  sessionsStore: ReturnType<typeof createSessionsStore>;
}) => {
  const storeRef = useRef<ReturnType<typeof createOngoingSessionStore> | null>(
    null,
  );
  if (!storeRef.current) {
    storeRef.current = createOngoingSessionStore(sessionsStore);
  }

  return (
    <OngoingSessionContext.Provider value={storeRef.current}>
      {children}
    </OngoingSessionContext.Provider>
  );
};

export const useOngoingSession = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createOngoingSessionStore>, T>
  >[1],
) => {
  const store = useContext(OngoingSessionContext);

  if (!store) {
    throw new Error(
      "'useOngoingSession' must be used within a 'OngoingSessionProvider'",
    );
  }

  return useStore(store, useShallow(selector));
};
