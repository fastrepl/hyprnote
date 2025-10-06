import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createOngoingSessionStore2, type OngoingSessionStore2 } from "../stores";

const OngoingSessionContext = createContext<OngoingSessionStore2 | null>(null);

export const OngoingSessionProvider2 = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: OngoingSessionStore2;
}) => {
  const storeRef = useRef<OngoingSessionStore2 | null>(null);
  if (!storeRef.current) {
    storeRef.current = store;
  }

  return (
    <OngoingSessionContext.Provider value={storeRef.current}>
      {children}
    </OngoingSessionContext.Provider>
  );
};

export const useOngoingSession2 = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createOngoingSessionStore2>, T>
  >[1],
) => {
  const store = useContext(OngoingSessionContext);

  if (!store) {
    throw new Error(
      "'useOngoingSession2' must be used within a 'OngoingSessionProvider2'",
    );
  }

  return useStore(store, useShallow(selector));
};
