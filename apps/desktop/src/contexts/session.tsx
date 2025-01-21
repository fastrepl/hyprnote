import { createContext, useContext, useEffect, useState } from "react";

import { createSessionStore } from "@/stores/session";
import type { Session } from "@/types/tauri";

type Context = {
  store: ReturnType<typeof createSessionStore>;
};

const SessionContext = createContext<Context>({ store: null as any });

export const SessionProvider: React.FC<{
  session: Session;
  children: React.ReactNode;
}> = ({ session, children }) => {
  const [store, setStore] = useState<ReturnType<
    typeof createSessionStore
  > | null>(null);

  useEffect(() => {
    const newStore = createSessionStore(session);
    setStore(newStore);

    return () => {
      newStore.getState().destroy();
    };
  }, [session.id]);

  if (!store) {
    return null;
  }

  return (
    <SessionContext.Provider value={{ store }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("'useSession' must be used within a 'SessionProvider'");
  }

  return context;
};
