import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createSessionStore } from "@/stores/session";
import { useSessions } from "./sessions";

const SessionContext = createContext<
  ReturnType<
    typeof createSessionStore
  > | null
>(null);

export const SessionProvider = ({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) => {
  const sessionStore = useSessions((s) => s.sessions[id]);

  return (
    <SessionContext.Provider value={sessionStore}>
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
