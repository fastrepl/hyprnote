import type { StateCreator, StoreApi, StoreMutatorIdentifier } from "zustand";

import { isSameTab, type Tab } from "./schema";

export type LifecycleState = {
  onClose: ((tab: Tab) => void) | null;
  onEmpty: (() => void) | null;
};

export type LifecycleActions = {
  registerOnClose: (handler: (tab: Tab) => void) => void;
  registerOnEmpty: (handler: () => void) => void;
};

export const createLifecycleSlice = <T extends LifecycleState>(
  set: StoreApi<T>["setState"],
  _get: StoreApi<T>["getState"],
): LifecycleState & LifecycleActions => ({
  onClose: null,
  onEmpty: null,
  registerOnClose: (handler) => set({ onClose: handler } as Partial<T>),
  registerOnEmpty: (handler) => set({ onEmpty: handler } as Partial<T>),
});

type LifecycleMiddleware = <
  T extends { tabs: Tab[]; onClose: ((tab: Tab) => void) | null; onEmpty: (() => void) | null },
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(f: StateCreator<T, Mps, Mcs>) => StateCreator<T, Mps, Mcs>;

type LifecycleMiddlewareImpl = <
  T extends { tabs: Tab[]; onClose: ((tab: Tab) => void) | null; onEmpty: (() => void) | null },
>(f: StateCreator<T, [], []>) => StateCreator<T, [], []>;

const lifecycleMiddlewareImpl: LifecycleMiddlewareImpl = (config) => (set, get, api) => {
  return config(
    (args) => {
      const prevState = get();
      const prevTabs = prevState.tabs;
      const wasEmpty = prevTabs.length === 0;

      set(args);

      const nextState = get();
      const nextTabs = nextState.tabs;
      const isEmpty = nextTabs.length === 0;

      const closedTabs = prevTabs.filter(
        (prevTab) => !nextTabs.some((nextTab) => isSameTab(prevTab, nextTab)),
      );

      if (closedTabs.length > 0 && nextState.onClose) {
        closedTabs.forEach((tab) => {
          try {
            nextState.onClose?.(tab);
          } catch (error) {
            console.error("onClose", error);
          }
        });
      }

      if (!wasEmpty && isEmpty && nextState.onEmpty) {
        try {
          nextState.onEmpty();
        } catch (error) {
          console.error("onEmpty", error);
        }
      }
    },
    get,
    api,
  );
};

export const lifecycleMiddleware = lifecycleMiddlewareImpl as LifecycleMiddleware;
