import { create } from "zustand";

import { wrapSliceWithLogging } from "../shared";
import { type BasicActions, type BasicState, createBasicSlice } from "./basic";
import {
  createLifecycleSlice,
  type LifecycleActions,
  lifecycleMiddleware,
  type LifecycleState,
} from "./lifecycle";
import {
  createNavigationSlice,
  type NavigationActions,
  navigationMiddleware,
  type NavigationState,
} from "./navigation";
import { createStateUpdaterSlice, type StateBasicActions } from "./state";

export type { Tab, TabInput } from "./schema";
export { isSameTab, rowIdfromTab, tabSchema, uniqueIdfromTab } from "./schema";

type State = BasicState & NavigationState & LifecycleState;
type Actions = BasicActions &
  StateBasicActions &
  NavigationActions &
  LifecycleActions;
type Store = State & Actions;

export const useTabs = create<Store>()(
  lifecycleMiddleware(
    navigationMiddleware((set, get) => ({
      ...wrapSliceWithLogging("basic", createBasicSlice(set, get)),
      ...wrapSliceWithLogging("state", createStateUpdaterSlice(set, get)),
      ...wrapSliceWithLogging("navigation", createNavigationSlice(set, get)),
      ...wrapSliceWithLogging("lifecycle", createLifecycleSlice(set, get)),
    })),
  ),
);
