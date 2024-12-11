import { createContext, useContext, useState, ReactNode } from "react";

interface UIContextType {
  isPanelOpen: boolean;
  setIsPanelOpen: (value: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <UIContext.Provider value={{ isPanelOpen, setIsPanelOpen }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
