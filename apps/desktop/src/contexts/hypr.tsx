import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import { commands as authCommands } from "@hypr/plugin-auth";
import { useNavigate } from "@tanstack/react-router";

export interface HyprContext {
  userId: string;
}

const HyprContext = createContext<HyprContext | null>(null);

export function HyprProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
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

  if (!userId.data) {
    navigate({ to: "/login" });
    return null;
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
