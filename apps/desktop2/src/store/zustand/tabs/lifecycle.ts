import type { StoreApi } from "zustand";

import type { Tab } from "./schema";

export type LifecycleState = {
  onCloseHandlers: Set<(tab: Tab) => void>;
};

export type LifecycleActions = {
  registerOnClose: (handler: (tab: Tab) => void) => () => void;
};

export const createLifecycleSlice = <T extends LifecycleState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): LifecycleState & LifecycleActions => ({
  onCloseHandlers: new Set(),
  registerOnClose: (handler) => {
    const { onCloseHandlers } = get();
    const nextHandlers = new Set(onCloseHandlers);
    nextHandlers.add(handler);
    set({ onCloseHandlers: nextHandlers } as Partial<T>);
    return () => {
      const { onCloseHandlers: currentHandlers } = get();
      const nextHandlers = new Set(currentHandlers);
      nextHandlers.delete(handler);
      set({ onCloseHandlers: nextHandlers } as Partial<T>);
    };
  },
});
