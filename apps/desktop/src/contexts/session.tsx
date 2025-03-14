import { createContext, useContext, useEffect, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createSessionStore } from "@/stores/session";
import { type Session } from "@hypr/plugin-db";
import { useSessions } from "./sessions";

const SessionContext = createContext<
  ReturnType<
    typeof createSessionStore
  > | null
>(null);

export const SessionProvider = ({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}) => {
  const [store, setStore] = useState<ReturnType<typeof createSessionStore> | null>(null);

  const enter = useSessions((s) => s.enter);

  useEffect(() => {
    const s = enter(session);
    setStore(s);
  }, [enter, session]);

  if (!store) {
    return null;
  }

  return (
    <SessionContext.Provider value={store}>
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
