import React, { createContext, useContext, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { type AITaskStore, createAITaskStore } from "../store/zustand/ai-task";
import { type ToolScope, useRegisterTools } from "./tool";

const AITaskContext = createContext<AITaskStore | null>(null);

export const AITaskProvider = ({
  children,
  store,
  tools,
}: {
  children: React.ReactNode;
  store: AITaskStore;
  tools?: Record<string, any> | ((scope: ToolScope) => Record<string, any>);
}) => {
  const storeRef = useRef<AITaskStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store;
  }

  const resolvedTools = useMemo(() => {
    if (!tools) {
      return null;
    }

    if (typeof tools === "function") {
      return tools("enhancing");
    }

    return tools;
  }, [tools]);

  useRegisterTools(
    "enhancing",
    () => resolvedTools ?? {},
    [resolvedTools],
  );

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
