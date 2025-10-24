import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { type AITaskStore, createAITaskStore } from "../../store/zustand/ai-task";

const AITaskContext = createContext<AITaskStore | null>(null);

export const AITaskProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: AITaskStore;
}) => {
  const storeRef = useRef<AITaskStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store;
  }

  return (
    <AITaskContext.Provider value={storeRef.current}>
      {children}
    </AITaskContext.Provider>
  );
};

export const useAITask = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createAITaskStore>, T>
  >[1],
) => {
  const store = useContext(AITaskContext);

  if (!store) {
    throw new Error(
      "'useAITask' must be used within a 'AITaskProvider'",
    );
  }

  return useStore(store, useShallow(selector));
};
