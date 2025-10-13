import { createContext, useContext } from "react";

import { useChatMode } from "./chat";
import { useLeftSidebar } from "./leftsidebar";

interface ShellContextType {
  chat: ReturnType<typeof useChatMode>;
  leftsidebar: ReturnType<typeof useLeftSidebar>;
}

const ShellContext = createContext<ShellContextType | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const chat = useChatMode();
  const leftsidebar = useLeftSidebar();

  return (
    <ShellContext.Provider value={{ chat, leftsidebar }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("'useShell' must be used within 'ShellProvider'");
  }
  return context;
}
