import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createOngoingSessionStore, type OngoingSessionStore } from "../stores";

const OngoingSessionContext = createContext<
  ReturnType<
    typeof createOngoingSessionStore
  > | null
>(null);

export const OngoingSessionProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: OngoingSessionStore;
}) => {
  const storeRef = useRef<OngoingSessionStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store;
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
