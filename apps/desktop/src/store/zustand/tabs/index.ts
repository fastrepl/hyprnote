import { create } from "zustand";

import { type BasicActions, type BasicState, createBasicSlice } from "./basic";
import { createLifecycleSlice, type LifecycleActions, type LifecycleState } from "./lifecycle";
import { createNavigationSlice, type NavigationActions, type NavigationState } from "./navigation";
import { createStateUpdaterSlice, type StateBasicActions } from "./state";

export type { Tab } from "./schema";
export { isSameTab, rowIdfromTab, tabSchema, uniqueIdfromTab } from "./schema";

type State = BasicState & NavigationState & LifecycleState;
type Actions = BasicActions & StateBasicActions & NavigationActions & LifecycleActions;
type Store = State & Actions;

export const useTabs = create<Store>()((set, get) => ({
  ...createBasicSlice(set, get),
  ...createStateUpdaterSlice(set, get),
  ...createNavigationSlice(set, get),
  ...createLifecycleSlice(set, get),
}));
