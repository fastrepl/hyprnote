import { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createSessionsStore } from "@/stores/sessions";

const SessionsContext = createContext<
  ReturnType<
    typeof createSessionsStore
  > | null
>(null);

export const SessionsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const storeRef = useRef<ReturnType<typeof createSessionsStore> | null>(
    null,
  );
  if (!storeRef.current) {
    storeRef.current = createSessionsStore();
  }

  return (
    <SessionsContext.Provider value={storeRef.current}>
      {children}
    </SessionsContext.Provider>
  );
};

export const useSessions = (id: string) => {
  const store = useContext(SessionsContext);

  if (!store) {
    throw new Error(
      "'useSessions' must be used within a 'SessionsProvider'",
    );
  }

  return useStore(store, useShallow((s) => s.sessions[id]));
};
