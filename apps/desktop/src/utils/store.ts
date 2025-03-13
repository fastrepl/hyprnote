import { StoreApi, useStore } from "zustand";
import { useShallow } from "zustand/shallow";

export const useStore2 = <S, T>(
  store: StoreApi<S>,
  selector: Parameters<
    typeof useStore<StoreApi<S>, T>
  >[1],
) => {
  return useStore(store, useShallow(selector));
};
