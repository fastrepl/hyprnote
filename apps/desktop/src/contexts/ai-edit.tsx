import { createContext, useContext, useState } from "react";

export interface AIEditInfo {
  editId: string;
  startOffset: number;
  endOffset: number;
  originalContent: string;
  sessionId: string;
}

interface AIEditContextValue {
  currentAIEdit: AIEditInfo | null;
  setCurrentAIEdit: (edit: AIEditInfo | null) => void;
}

const AIEditContext = createContext<AIEditContextValue | undefined>(undefined);

export function AIEditProvider({ children }: { children: React.ReactNode }) {
  const [currentAIEdit, setCurrentAIEdit] = useState<AIEditInfo | null>(null);

  return (
    <AIEditContext.Provider value={{ currentAIEdit, setCurrentAIEdit }}>
      {children}
    </AIEditContext.Provider>
  );
}

export function useAIEdit() {
  const context = useContext(AIEditContext);
  if (!context) {
    throw new Error("useAIEdit must be used within AIEditProvider");
  }
  return context;
}
