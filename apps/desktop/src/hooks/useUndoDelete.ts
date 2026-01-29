import { useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import * as main from "../store/tinybase/store/main";
import { useUndoDeleteStore } from "../store/zustand/undo-delete";

export function useUndoDelete() {
  const checkpoints = main.UI.useCheckpoints(main.STORE_ID);
  const setCheckpoints = useUndoDeleteStore((state) => state.setCheckpoints);
  const pendingDelete = useUndoDeleteStore((state) => state.pendingDelete);
  const undo = useUndoDeleteStore((state) => state.undo);

  useEffect(() => {
    setCheckpoints(checkpoints ?? null);
  }, [checkpoints, setCheckpoints]);

  useHotkeys(
    "mod+z",
    () => {
      if (pendingDelete) {
        undo();
      }
    },
    {
      preventDefault: false,
      enableOnFormTags: false,
      enableOnContentEditable: false,
    },
    [pendingDelete, undo],
  );

  return {
    hasPendingDelete: !!pendingDelete,
    pendingDelete,
    undo,
  };
}
