import { createContext, useContext, useRef } from "react";

import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createSessionStore } from "@/stores/session";
import type { Session } from "@/types/tauri";

const SessionContext = createContext<ReturnType<
  typeof createSessionStore
> | null>(null);

export const SessionProvider: React.FC<{
  session: Session;
  children: React.ReactNode;
}> = ({ session, children }) => {
  const storeRef = useRef<ReturnType<typeof createSessionStore> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSessionStore(session);
  }

  return (
    <SessionContext.Provider value={storeRef.current}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createSessionStore>, T>
  >[1],
) => {
  const store = useContext(SessionContext);

  if (!store) {
    throw new Error("'useSession' must be used within a 'SessionProvider'");
  }

  return useStore(store, useShallow(selector));
};
