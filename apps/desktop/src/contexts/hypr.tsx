import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { commands as authCommands } from "@hypr/plugin-auth";

export interface HyprContext {
  userId: string;
}

const HyprContext = createContext<HyprContext | null>(null);

export function HyprProvider({ children }: { children: React.ReactNode }) {
  const userId = useQuery({
    queryKey: ["userId"],
    queryFn: () => authCommands.getFromVault("userId"),
  });

  if (userId.status === "pending") {
    return null;
  }

  if (userId.status === "error") {
    return <div>Failed to fetch user id</div>;
  }

  return (
    <HyprContext.Provider value={{ userId: userId.data }}>
      {children}
    </HyprContext.Provider>
  );
}

export function useHypr() {
  const context = useContext(HyprContext);
  if (!context) {
    throw new Error("useHypr must be used within an AuthProvider");
  }
  return context;
}
