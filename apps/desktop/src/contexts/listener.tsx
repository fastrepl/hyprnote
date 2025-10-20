import React, { createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { createListenerStore, type ListenerStore } from "../store/zustand/listener";

const ListenerContext = createContext<ListenerStore | null>(null);

export const ListenerProvider = ({
  children,
  store,
}: {
  children: React.ReactNode;
  store: ListenerStore;
}) => {
  const storeRef = useRef<ListenerStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store;
  }

  return (
    <ListenerContext.Provider value={storeRef.current}>
      {children}
    </ListenerContext.Provider>
  );
};

export const useListener = <T,>(
  selector: Parameters<
    typeof useStore<ReturnType<typeof createListenerStore>, T>
  >[1],
) => {
  const store = useContext(ListenerContext);

  if (!store) {
    throw new Error(
      "'useListener' must be used within a 'ListenerProvider'",
    );
  }

  return useStore(store, useShallow(selector));
};
