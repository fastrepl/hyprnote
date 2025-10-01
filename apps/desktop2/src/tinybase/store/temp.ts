import { createMergeableStoreWithSync } from "../shared";

export const initTemp = () => {
  const store = createMergeableStoreWithSync();

  return {
    store,
  };
};
